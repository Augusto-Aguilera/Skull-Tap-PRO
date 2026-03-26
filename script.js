const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);
let currentUser = null;

let score = 0, time = 15, wallet = 0, xp = 0, level = 1;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];
let unlockedAchievements = [];
let gameTimer, spawnTimer, puTimer;
let highVisualScore = 0; // Para comparar récords localmente en la sesión

let upgrades = { magnet: 0, time: 0, luck: 0 };
const UPGRADE_DATA = {
    magnet: { baseCost: 500, max: 5 },
    time: { baseCost: 800, max: 10 },
    luck: { baseCost: 1200, max: 5 }
};

let streakCount = 0, lastLoginDate = null;
let bossActive = false, bossHP = 100, doublePoints = false;
let combo = 1, comboHits = 0, lastHitTime = 0;
let xpAtStartOfRound = 0;

const PLAYLIST = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
];

let missions = [
    { id: 1, text: "Exterminio Total", goal: 500, current: 0, completed: false, reward: 1000 },
    { id: 2, text: "Maestro del Combo", goal: 15, current: 0, completed: false, reward: 1500 },
    { id: 3, text: "Avaricia Pura", goal: 5000, current: 0, completed: false, reward: 2000 }
];

const getWeekNumber = () => {
    const d = new Date(); d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - (d.getDay()||7));
    return Math.ceil((((d - new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};

let weeklyChallenges = [
    { id: 101, text: "Semana del Terror", goal: 20000, current: 0, completed: false, reward: 5000, week: getWeekNumber() },
    { id: 102, text: "Asesino de Bosses", goal: 10, current: 0, completed: false, reward: 8000, week: getWeekNumber() }
];

const ACHIEVEMENTS_LIST = {
    "F1": { name: "Primer Paso", tier: "facil", desc: "Suma 100 puntos", req: () => score >= 100 },
    "F2": { name: "Iniciado", tier: "facil", desc: "Llega al Nivel 2", req: () => level >= 2 },
    "M1": { name: "Cazador Neón", tier: "medio", desc: "Suma 1500 puntos", req: () => score >= 1500 },
    "M2": { name: "Veterano", tier: "medio", desc: "Llega al Nivel 10", req: () => level >= 10 },
    "D1": { name: "DIOS DEL CRÁNEO", tier: "dificil", desc: "10,000 puntos en una partida", req: () => score >= 10000 },
    "D2": { name: "Leyenda Viviente", tier: "dificil", desc: "Llega al Nivel 30", req: () => level >= 30 }
};

function buyUpgrade(type) {
    let currentLvl = upgrades[type];
    if(currentLvl >= UPGRADE_DATA[type].max) return alert("Nivel máximo");
    let cost = UPGRADE_DATA[type].baseCost * (currentLvl + 1);
    if(wallet < cost) return alert("Puntos insuficientes");
    wallet -= cost; upgrades[type]++; updateUI(); updateShopUI(); saveProgress();
    if(get("buySound")) get("buySound").play();
}

async function checkSession() {
    const { data: { session } } = await client.auth.getSession();
    if (session) { currentUser = session.user; toggleAuthUI(true); await loadUserData(); checkDailyStreak(); }
}

function toggleAuthUI(isLoggedIn) {
    get("authInputs").style.display = isLoggedIn ? "none" : "block";
    get("logoutBtn").style.display = isLoggedIn ? "inline-block" : "none";
    get("streakDisplay").style.display = isLoggedIn ? "inline-block" : "none";
    if (isLoggedIn && currentUser) get("userStatus").innerText = `HOLA, ${currentUser.email.split('@')[0].toUpperCase()}`;
    else get("userStatus").innerText = "Sincroniza tu progreso global";
}

async function loadUserData() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];
    const { data } = await client.from('scores').select('*').eq('name', userName).single();
    if (data) {
        wallet = data.wallet || 0; xp = data.xp || 0; level = data.level || 1;
        streakCount = data.streak || 0; lastLoginDate = data.last_login;
        highVisualScore = data.score || 0; // Cargamos el récord desde la DB
        if (data.skins) ownedSkins = data.skins.split(',');
        if (data.achievements) unlockedAchievements = data.achievements.split(',');
        if (data.upgrades) upgrades = JSON.parse(data.upgrades);
        updateUI(); updateShopUI();
    }
    renderMissions(); renderWeeklyChallenges();
}

function checkDailyStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (lastLoginDate === today) { get("streakDisplay").innerText = `🔥 Racha: ${streakCount} días`; return; }
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (lastLoginDate === yesterdayStr) streakCount++;
    else streakCount = 1;
    const reward = 300 + (streakCount * 50);
    wallet += reward; lastLoginDate = today;
    showAchievementToast(`¡BONO DIARIO! +${reward} PTS (Día ${streakCount})`);
    get("streakDisplay").innerText = `🔥 Racha: ${streakCount} días`;
    saveProgress();
}

async function saveProgress() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];
    const { data: record } = await client.from('scores').select('score').eq('name', userName).single();
    const topScore = record ? Math.max(record.score, score) : score;
    await client.from('scores').upsert([{ 
        name: userName, score: topScore, wallet: wallet, xp: xp, level: level,
        skins: ownedSkins.join(','), achievements: unlockedAchievements.join(','),
        streak: streakCount, last_login: lastLoginDate,
        upgrades: JSON.stringify(upgrades)
    }], { onConflict: 'name' });
}

function startGame() {
    updateMusic();
    xpAtStartOfRound = xp;
    score = 0; time = 15; combo = 1; comboHits = 0; bossActive = false; doublePoints = false;
    get("bossHealthBar").style.display = "none";
    switchScreen('game'); updateUI();
    gameTimer = setInterval(() => { time--; updateUI(); if (time <= 0) endGame(); }, 1000);
    spawnTimer = setInterval(spawnSkull, 800);
    puTimer = setInterval(spawnPowerUp, 7000); 
}

function updateMusic() {
    const music = get("bgMusic"); if(!music) return;
    let trackIndex = Math.min(Math.floor((level - 1) / 5), PLAYLIST.length - 1);
    let targetSrc = PLAYLIST[trackIndex];
    if (music.src !== targetSrc) { music.src = targetSrc; music.load(); }
    music.volume = 0.3; music.play().catch(e => {});
}

function spawnPowerUp() {
    if (bossActive) return;
    const types = [{icon: "⚡", type: "double"}, {icon: "⏳", type: "time"}];
    const puData = types[Math.floor(Math.random() * types.length)];
    const pu = document.createElement("div");
    pu.className = "power-up"; pu.innerHTML = puData.icon;
    pu.style.left = Math.random() * 80 + 5 + "%"; pu.style.top = Math.random() * 80 + 5 + "%";
    pu.onclick = () => {
        if (puData.type === "double") {
            doublePoints = true; showNotice("¡DOBLE PUNTAJE!");
            updateMultipliersDisplay();
            setTimeout(() => { doublePoints = false; updateMultipliersDisplay(); }, 5000);
        } else { time += 5; showNotice("+5 SEGUNDOS"); }
        pu.remove();
    };
    get("gameArea").appendChild(pu);
    setTimeout(() => { if(pu.parentElement) pu.remove(); }, 3000);
}

function updateMultipliersDisplay() {
    const container = get("activeMultipliers"); container.innerHTML = "";
    if (combo > 1) {
        const cb = document.createElement("div"); cb.className = "badge-multiplier";
        cb.innerText = `COMBO X${combo}`; container.appendChild(cb);
    }
    if (doublePoints) {
        const db = document.createElement("div"); db.className = "badge-multiplier";
        db.style.borderColor = "var(--neon-cyan)"; db.style.color = "var(--neon-cyan)";
        db.innerText = "PUNTOS X2"; container.appendChild(db);
    }
}

function spawnBoss() {
    bossActive = true; bossHP = 100; clearInterval(spawnTimer);
    get("bossHealthBar").style.display = "block"; get("hpFill").style.width = "100%";
    const boss = document.createElement("div"); boss.className = "target boss"; boss.innerHTML = "👺";
    boss.style.left = "50%"; boss.style.top = "50%"; boss.style.transform = "translate(-50%, -50%)";
    boss.onclick = (e) => {
        bossHP -= 5; get("hpFill").style.width = bossHP + "%";
        createHitEffects(e.clientX, e.clientY); screenVibrate();
        if (bossHP <= 0) {
            score += 500; wallet += 50; addXP(200); bossActive = false;
            boss.remove(); get("bossHealthBar").style.display = "none";
            showNotice("BOSS DERROTADO: +500 PTS");
            updateWeeklyChallenges(0, 1); spawnTimer = setInterval(spawnSkull, 800);
            updateUI();
        }
    };
    get("gameArea").appendChild(boss);
}

function spawnSkull() {
    if (bossActive) return;
    if (level % 5 === 0 && !bossActive && score > 0) { spawnBoss(); return; }
    const area = get("gameArea");
    const skull = document.createElement("div");
    const luckChance = 0.05 + (upgrades.luck * 0.05);
    const isGold = Math.random() < luckChance;
    const isDistraction = !isGold && Math.random() < 0.15;
    skull.className = "target" + (isDistraction ? " distraction" : (isGold ? " gold" : ""));
    skull.innerHTML = isGold ? "💰" : (isDistraction ? "😡" : "💀");
    const baseSize = isDistraction ? 50 : 70;
    const newSize = baseSize + (upgrades.magnet * 8);
    skull.style.width = newSize + "px"; skull.style.height = newSize + "px";
    skull.style.fontSize = (newSize * 0.8) + "px";
    if (!isDistraction && !isGold) {
        if(currentSkin === "rainbow") skull.style.animation = "rainbowGlow 1s infinite";
        else skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }
    skull.onclick = (e) => {
        if (isDistraction) {
            score = Math.max(0, score - 200); xp = Math.max(0, xp - 50);
            combo = 1; comboHits = 0; showNotice("¡CASTIGO: -200 PTS!"); screenVibrate();
            if(get("badHitSound")) { get("badHitSound").currentTime = 0; get("badHitSound").play(); }
        } else {
            const now = Date.now();
            if (now - lastHitTime < 1000) { comboHits++; if (comboHits % 5 === 0) combo++; }
            else { combo = 1; comboHits = 0; }
            lastHitTime = now;
            let pts = (isGold ? 100 : 10) * combo;
            if (doublePoints) pts *= 2; 
            score += pts; wallet += (isGold ? 5 : 1); addXP(isGold ? 100 : 25);
            if(upgrades.time > 0) time += (upgrades.time * 0.1);
            if(isGold) {
                if(get("goldHitSound")) { get("goldHitSound").currentTime = 0; get("goldHitSound").play(); }
                createFloatingText(e.clientX, e.clientY, `+${pts}`);
                createGoldExplosion(e.clientX, e.clientY);
            } else { if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); } }
            updateMissions(1, combo, pts); updateWeeklyChallenges(pts, 0);
            checkAchievements(); createHitEffects(e.clientX, e.clientY); screenVibrate();
        }
        updateUI(); updateMultipliersDisplay(); skull.remove();
    };
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    area.appendChild(skull);
    setTimeout(() => { if(skull.parentElement) { skull.remove(); if (!isDistraction) { combo = 1; comboHits = 0; updateUI(); updateMultipliersDisplay(); } } }, 1200);
}

function createFloatingText(x, y, txt) {
    const area = get("gameArea"); const rect = area.getBoundingClientRect();
    const ft = document.createElement("div"); ft.className = "floating-text";
    ft.innerText = txt; ft.style.left = (x - rect.left) + "px"; ft.style.top = (y - rect.top) + "px";
    area.appendChild(ft); setTimeout(() => ft.remove(), 800);
}

function createGoldExplosion(x, y) {
    const area = get("gameArea"); const rect = area.getBoundingClientRect();
    for (let i = 0; i < 15; i++) {
        const p = document.createElement("div"); p.className = "particle";
        p.style.width = p.style.height = "8px"; p.style.background = "gold";
        p.style.left = (x - rect.left) + "px"; p.style.top = (y - rect.top) + "px";
        const angle = Math.random() * Math.PI * 2, dist = Math.random() * 150 + 50;
        area.appendChild(p);
        p.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) rotate(360deg)`, opacity: 0 }], { duration: 800 }).onfinish = () => p.remove();
    }
}

function showNotice(msg) { const n = get("powerUpNotice"); n.innerText = msg; n.style.opacity = "1"; setTimeout(() => n.style.opacity = "0", 2000); }
function screenVibrate() { get("gameArea").classList.add("shake"); setTimeout(() => get("gameArea").classList.remove("shake"), 200); }

function createHitEffects(x, y) {
    const colors = ["#00fbff", "#ff00ff", "#00ffcc", "#fff000"];
    const area = get("gameArea"); const rect = area.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
        const p = document.createElement("div"); p.className = "particle";
        p.style.left = (x - rect.left) + "px"; p.style.top = (y - rect.top) + "px";
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2, velocity = Math.random() * 100 + 50;
        area.appendChild(p);
        p.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(angle)*velocity}px, ${Math.sin(angle)*velocity}px) scale(0)`, opacity: 0 }], { duration: 600 }).onfinish = () => p.remove();
    }
}

function addXP(amount) {
    xp += amount; const nextLevelXP = level * 1000;
    if (xp >= nextLevelXP) { level++; xp = xp - nextLevelXP; showAchievementToast(`¡NIVEL ${level}!`); updateMusic(); saveProgress(); }
    updateUI();
}

function updateMissions(skulls, curCombo, pts) {
    missions.forEach(m => {
        if (m.completed) return;
        if (m.id === 1) m.current += skulls;
        if (m.id === 2) m.current = Math.max(m.current, curCombo);
        if (m.id === 3) m.current += pts;
        if (m.current >= m.goal) { m.completed = true; wallet += m.reward; showAchievementToast(`Misión Completa: +${m.reward} PTS`); }
    });
    renderMissions();
}

function updateWeeklyChallenges(pts, bosses) {
    weeklyChallenges.forEach(w => {
        if (w.completed) return;
        if (w.id === 101) w.current += pts;
        if (w.id === 102) w.current += bosses;
        if (w.current >= w.goal) { w.completed = true; wallet += w.reward; showAchievementToast(`¡Desafío Semanal! +${w.reward} PTS`); }
    });
    renderWeeklyChallenges();
}

function renderMissions() { get("missionsList").innerHTML = missions.map(m => `<div class="mission-item ${m.completed ? 'completed' : ''}"><b>${m.text}:</b> ${m.completed ? 'OK' : m.current + '/' + m.goal}</div>`).join(""); }
function renderWeeklyChallenges() { get("weeklyList").innerHTML = weeklyChallenges.map(w => `<div class="mission-item ${w.completed ? 'completed' : ''}"><b>${w.text}:</b> ${w.completed ? 'OK' : w.current + '/' + w.goal}</div>`).join(""); }

function checkAchievements() {
    Object.keys(ACHIEVEMENTS_LIST).forEach(key => { if (!unlockedAchievements.includes(key) && ACHIEVEMENTS_LIST[key].req()) { unlockedAchievements.push(key); showAchievementToast(`Logro: ${ACHIEVEMENTS_LIST[key].name}`); saveProgress(); } });
}

function showAchievementToast(msg) { const t = document.createElement("div"); t.className = "achievement-toast"; t.innerHTML = `🏆 ${msg}`; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }

// --- FUNCIÓN ENDGAME REPARADA Y MEJORADA ---
function endGame() { 
    clearInterval(gameTimer); 
    clearInterval(spawnTimer); 
    clearInterval(puTimer); 
    
    // Captura inmediata de puntos
    const finalScoreValue = score;
    const finalScoreDisplay = get("finalScore");
    const xpDisplay = get("xpGainedDisplay");
    
    // Mostramos puntos finales
    if(finalScoreDisplay) {
        finalScoreDisplay.innerText = finalScoreValue.toLocaleString() + " pts";
    }
    
    // Lógica de Nuevo Récord
    if(finalScoreValue > highVisualScore && finalScoreValue > 0) {
        highVisualScore = finalScoreValue;
        const recordMsg = document.createElement("div");
        recordMsg.id = "newRecordMsg";
        recordMsg.style.color = "var(--neon-cyan)";
        recordMsg.style.textShadow = "0 0 10px var(--neon-cyan)";
        recordMsg.style.fontWeight = "bold";
        recordMsg.style.fontSize = "1.5rem";
        recordMsg.style.margin = "10px 0";
        recordMsg.innerText = "¡NUEVO RÉCORD PERSONAL!";
        
        // Insertar el mensaje arriba de los puntos
        if(finalScoreDisplay.parentElement) {
            const existing = get("newRecordMsg");
            if(existing) existing.remove();
            finalScoreDisplay.parentElement.insertBefore(recordMsg, finalScoreDisplay);
        }
    } else {
        const existing = get("newRecordMsg");
        if(existing) existing.remove();
    }

    // Calculamos XP ganada
    let xpGained = Math.floor(xp - xpAtStartOfRound);
    if(xpGained < 0) xpGained = 0;
    if(xpDisplay) xpDisplay.innerText = `+${xpGained} XP ganada en esta ronda`;

    get("gameArea").innerHTML = ""; 
    switchScreen('gameOver'); 
    saveProgress(); 
}

function shareProgress() { const text = `💀 ¡Acabo de conseguir ${score} puntos en Skull Tap PRO! Soy nivel ${level}. ¿Puedes superarme?`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); }

function buySkin(color, price) {
    if(ownedSkins.includes(color)) { currentSkin = color; updateShopUI(); return; }
    if(wallet < price) return alert("Puntos insuficientes");
    wallet -= price; ownedSkins.push(color); currentSkin = color;
    updateUI(); updateShopUI(); saveProgress();
}

function updateShopUI() {
    document.querySelectorAll("#skinsTab button").forEach(btn => {
        const onClickAttr = btn.getAttribute("onclick");
        if(onClickAttr) {
            const color = onClickAttr.match(/'(.*?)'/)[1];
            if(currentSkin === color) { btn.style.borderColor = "var(--neon-cyan)"; btn.style.background = "rgba(0,251,255,0.1)"; }
            else if(ownedSkins.includes(color)) { btn.style.borderColor = "white"; btn.style.background = "none"; }
        }
    });
    Object.keys(upgrades).forEach(type => {
        get(`lvl_${type}`).innerText = upgrades[type];
        let nextCost = UPGRADE_DATA[type].baseCost * (upgrades[type] + 1);
        get(`cost_${type}`).innerText = upgrades[type] >= UPGRADE_DATA[type].max ? "MAX" : nextCost;
    });
}

async function showRanking() {
    const { data } = await client.from('scores').select('name, score').order('score', { ascending: false }).limit(10);
    get("rankingList").innerHTML = data ? data.map((it, i) => `<li><span>#${i+1} ${it.name.toUpperCase()}</span> <b>${it.score.toLocaleString()} PTS</b></li>`).join("") : "Cargando...";
    switchScreen('ranking');
}

function showAchievementsScreen() {
    get("achievementsList").innerHTML = Object.keys(ACHIEVEMENTS_LIST).map(key => {
        const ach = ACHIEVEMENTS_LIST[key]; const isU = unlockedAchievements.includes(key);
        return `<div class="achievement-card ${isU ? 'unlocked' : ''} tier-${ach.tier}"><h4>${ach.name}</h4><p>${ach.desc}</p></div>`;
    }).join("");
    switchScreen('achievements');
}

function updateUI() {
    get("score").innerText = score.toLocaleString(); 
    get("time").innerText = Math.floor(time);
    get("walletAmount").innerText = wallet.toLocaleString(); 
    get("displayLevel").innerText = level;
    const nextLevelXP = level * 1000; const xpPercent = (xp / nextLevelXP) * 100;
    get("xpFill").style.width = xpPercent + "%"; get("xpText").innerText = `${Math.floor(xp)} / ${nextLevelXP} XP`;
    if(combo > 1) { get("comboWrapper").classList.remove("combo-hidden"); get("comboText").innerText = "x" + combo; }
    else get("comboWrapper").classList.add("combo-hidden");
}

function goHome() { switchScreen('start'); }

window.onload = () => {
    checkSession();
    get("playBtn").onclick = startGame; get("restartBtn").onclick = startGame;
    get("rankingBtn").onclick = showRanking; get("shareWaBtn").onclick = shareProgress;
    get("loginBtn").onclick = async () => {
        const email = get("email").value, password = get("password").value;
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) alert("Error: " + error.message);
        else { currentUser = data.user; toggleAuthUI(true); await loadUserData(); checkDailyStreak(); }
    };
    get("registerBtn").onclick = async () => {
        const email = get("email").value, password = get("password").value;
        const { error } = await client.auth.signUp({ email, password });
        if (error) alert(error.message); else alert("Confirma tu correo.");
    };
    get("logoutBtn").onclick = async () => { await client.auth.signOut(); location.reload(); };
};
