const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);
let currentUser = null;

// Variables de Estado
let score = 0, time = 15, wallet = 0, xp = 0, level = 1;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];
let unlockedAchievements = [];
let gameTimer, spawnTimer, puTimer;

// Boss, Powerups y Distracción
let bossActive = false, bossHP = 100;
let doublePoints = false;

// Combo
let combo = 1, comboHits = 0, lastHitTime = 0;

// Misiones Diarias Hardcore
let missions = [
    { id: 1, text: "Exterminio Total", goal: 500, current: 0, completed: false, reward: 1000 },
    { id: 2, text: "Maestro del Combo", goal: 15, current: 0, completed: false, reward: 1500 },
    { id: 3, text: "Avaricia Pura", goal: 5000, current: 0, completed: false, reward: 2000 }
];

const ACHIEVEMENTS_LIST = {
    "F1": { name: "Primer Paso", tier: "facil", desc: "Suma 100 puntos", req: () => score >= 100 },
    "F2": { name: "Iniciado", tier: "facil", desc: "Llega al Nivel 2", req: () => level >= 2 },
    "M1": { name: "Cazador Neón", tier: "medio", desc: "Suma 1500 puntos", req: () => score >= 1500 },
    "M2": { name: "Veterano", tier: "medio", desc: "Llega al Nivel 10", req: () => level >= 10 },
    "D1": { name: "DIOS DEL CRÁNEO", tier: "dificil", desc: "10,000 puntos en una partida", req: () => score >= 10000 },
    "D2": { name: "Leyenda Viviente", tier: "dificil", desc: "Llega al Nivel 30", req: () => level >= 30 }
};

// --- AUTH & DATA ---
async function checkSession() {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        currentUser = session.user;
        toggleAuthUI(true);
        await loadUserData();
    }
}

function toggleAuthUI(isLoggedIn) {
    get("authInputs").style.display = isLoggedIn ? "none" : "block";
    get("logoutBtn").style.display = isLoggedIn ? "inline-block" : "none";
    if (isLoggedIn && currentUser) {
        get("userStatus").innerText = `HOLA, ${currentUser.email.split('@')[0].toUpperCase()}`;
    } else {
        get("userStatus").innerText = "Sincroniza tu progreso global";
    }
}

async function loadUserData() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];
    const { data } = await client.from('scores').select('*').eq('name', userName).single();
    if (data) {
        wallet = data.wallet || 0; xp = data.xp || 0; level = data.level || 1;
        if (data.skins) ownedSkins = data.skins.split(',');
        if (data.achievements) unlockedAchievements = data.achievements.split(',');
        updateUI(); updateShopUI();
    }
    renderMissions();
}

async function saveProgress() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];
    const { data: record } = await client.from('scores').select('score').eq('name', userName).single();
    const topScore = record ? Math.max(record.score, score) : score;

    await client.from('scores').upsert([{ 
        name: userName, score: topScore, wallet: wallet, xp: xp, level: level,
        skins: ownedSkins.join(','), achievements: unlockedAchievements.join(',')
    }], { onConflict: 'name' });
}

// --- MOTOR DE JUEGO ---
function startGame() {
    const music = get("bgMusic");
    if(music) {
        music.volume = 0.3;
        music.play().catch(e => console.log("Interacción requerida para audio"));
    }

    score = 0; time = 15; combo = 1; comboHits = 0; bossActive = false; doublePoints = false;
    get("bossHealthBar").style.display = "none";
    switchScreen('game');
    updateUI();
    gameTimer = setInterval(() => { 
        time--; 
        updateUI(); 
        if (time <= 0) endGame(); 
    }, 1000);
    spawnTimer = setInterval(spawnSkull, 800);
    puTimer = setInterval(spawnPowerUp, 7000); 
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
            doublePoints = true; 
            showNotice("¡DOBLE PUNTAJE!");
            updateMultipliersDisplay(); // Mejora: Multiplicador en pantalla
            setTimeout(() => {
                doublePoints = false;
                updateMultipliersDisplay();
            }, 5000);
        } else { time += 5; showNotice("+5 SEGUNDOS"); }
        pu.remove();
    };
    get("gameArea").appendChild(pu);
    setTimeout(() => { if(pu.parentElement) pu.remove(); }, 3000);
}

// MEJORA: FUNCIÓN PARA ACTUALIZAR MULTIPLICADORES EN PANTALLA
function updateMultipliersDisplay() {
    const container = get("activeMultipliers");
    container.innerHTML = "";
    
    if (combo > 1) {
        const comboBadge = document.createElement("div");
        comboBadge.className = "badge-multiplier";
        comboBadge.innerText = `COMBO X${combo}`;
        container.appendChild(comboBadge);
    }
    
    if (doublePoints) {
        const doubleBadge = document.createElement("div");
        doubleBadge.className = "badge-multiplier";
        doubleBadge.style.borderColor = "var(--neon-cyan)";
        doubleBadge.style.color = "var(--neon-cyan)";
        doubleBadge.innerText = "PUNTOS X2";
        container.appendChild(doubleBadge);
    }
}

function spawnBoss() {
    bossActive = true; bossHP = 100;
    clearInterval(spawnTimer);
    get("bossHealthBar").style.display = "block";
    get("hpFill").style.width = "100%";
    const boss = document.createElement("div");
    boss.className = "target boss"; boss.innerHTML = "👺";
    boss.style.left = "50%"; boss.style.top = "50%";
    boss.style.transform = "translate(-50%, -50%)";

    boss.onclick = (e) => {
        bossHP -= 5;
        get("hpFill").style.width = bossHP + "%";
        createHitEffects(e.clientX, e.clientY); screenVibrate();
        boss.style.transform = "translate(-50%, -50%) scale(1.1)";
        setTimeout(() => boss.style.transform = "translate(-50%, -50%) scale(1)", 50);

        if (bossHP <= 0) {
            score += 500; wallet += 50; addXP(200); bossActive = false;
            boss.remove(); get("bossHealthBar").style.display = "none";
            showNotice("BOSS DERROTADO: +500 PTS");
            spawnTimer = setInterval(spawnSkull, 800);
        }
    };
    get("gameArea").appendChild(boss);
}

function spawnSkull() {
    if (bossActive) return;
    if (level % 5 === 0 && !bossActive && score > 0) { spawnBoss(); return; }

    const area = get("gameArea");
    const skull = document.createElement("div");
    const isDistraction = Math.random() < 0.15;

    if (isDistraction) {
        skull.className = "target distraction";
        skull.innerHTML = "😡";
        skull.onclick = () => {
            score = Math.max(0, score - 200);
            xp = Math.max(0, xp - 50);
            combo = 1; comboHits = 0;
            updateUI();
            updateMultipliersDisplay(); // Actualizar multiplicadores
            showNotice("¡CASTIGO: -200 PTS!");
            screenVibrate();
            if(get("badHitSound")) { get("badHitSound").currentTime = 0; get("badHitSound").play(); }
            skull.remove();
        };
    } else {
        skull.className = "target";
        skull.innerHTML = "💀";
        if(currentSkin === "rainbow") skull.style.animation = "rainbowGlow 1s infinite";
        else skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;

        skull.onclick = (e) => {
            const now = Date.now();
            if (now - lastHitTime < 1000) {
                comboHits++;
                if (comboHits % 5 === 0) {
                    combo++;
                    updateMultipliersDisplay(); // Actualizar vista de multiplicadores
                }
            } else { 
                combo = 1; comboHits = 0; 
                updateMultipliersDisplay();
            }
            lastHitTime = now;

            let pts = 10 * combo;
            if (doublePoints) pts *= 2; 

            score += pts; wallet += 1; addXP(25);
            updateMissions(1, combo, pts); checkAchievements(); updateUI();
            createHitEffects(e.clientX, e.clientY); screenVibrate();
            if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
            skull.remove();
        };
    }

    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    area.appendChild(skull);
    
    const lifetime = isDistraction ? 1500 : 1200;
    setTimeout(() => { 
        if(skull.parentElement) {
            skull.remove();
            if (!isDistraction) { 
                combo = 1; comboHits = 0; 
                updateUI(); 
                updateMultipliersDisplay();
            }
        } 
    }, lifetime);
}

function showNotice(msg) {
    const n = get("powerUpNotice");
    n.innerText = msg; n.style.opacity = "1";
    setTimeout(() => n.style.opacity = "0", 2000);
}

function screenVibrate() {
    get("gameArea").classList.add("shake");
    setTimeout(() => get("gameArea").classList.remove("shake"), 200);
}

function createHitEffects(x, y) {
    const colors = ["#00fbff", "#ff00ff", "#00ffcc", "#fff000"];
    const area = get("gameArea");
    const rect = area.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
        const p = document.createElement("div");
        p.className = "particle"; p.style.width = "5px"; p.style.height = "5px";
        p.style.left = (x - rect.left) + "px"; p.style.top = (y - rect.top) + "px";
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 100 + 50;
        area.appendChild(p);
        p.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${Math.cos(angle)*velocity}px, ${Math.sin(angle)*velocity}px) scale(0)`, opacity: 0 }
        ], { duration: 600 }).onfinish = () => p.remove();
    }
}

function addXP(amount) {
    xp += amount;
    const nextLevelXP = level * 1000;
    if (xp >= nextLevelXP) { 
        level++; 
        xp = 0; // Opcional: reiniciar XP tras subir nivel
        showAchievementToast(`¡NIVEL ${level}!`); 
        saveProgress(); 
    }
    updateUI(); // Esto asegura que la barra se actualice en tiempo real
}

function updateMissions(skulls, curCombo, pts) {
    missions.forEach(m => {
        if (m.completed) return;
        if (m.id === 1) m.current += skulls;
        if (m.id === 2) m.current = Math.max(m.current, curCombo);
        if (m.id === 3) m.current += pts;
        if (m.current >= m.goal) { 
            m.completed = true; 
            wallet += m.reward; 
            showAchievementToast(`Misión Completa: +${m.reward} PTS`); 
        }
    });
    renderMissions();
}

function renderMissions() {
    get("missionsList").innerHTML = missions.map(m => `
        <div class="mission-item ${m.completed ? 'completed' : ''}">
            <b>${m.text}:</b> ${m.completed ? 'OK' : m.current + '/' + m.goal}
        </div>
    `).join("");
}

function checkAchievements() {
    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        if (!unlockedAchievements.includes(key) && ACHIEVEMENTS_LIST[key].req()) { 
            unlockedAchievements.push(key); 
            showAchievementToast(`Logro: ${ACHIEVEMENTS_LIST[key].name}`); 
            saveProgress(); 
        }
    });
}

function showAchievementToast(msg) {
    const t = document.createElement("div");
    t.className = "achievement-toast"; t.innerHTML = `🏆 ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function endGame() {
    clearInterval(gameTimer); clearInterval(spawnTimer); clearInterval(puTimer);
    get("gameArea").innerHTML = "";
    get("activeMultipliers").innerHTML = ""; // Limpiar multiplicadores al terminar
    get("finalScore").innerText = score + " pts";
    switchScreen('gameOver');
    saveProgress();
}

function buySkin(color, price) {
    if(ownedSkins.includes(color)) { currentSkin = color; updateShopUI(); return; }
    if(wallet < price) { alert("Puntos insuficientes"); return; }
    wallet -= price;
    ownedSkins.push(color); currentSkin = color;
    updateUI(); updateShopUI();
    if(get("buySound")) get("buySound").play();
    saveProgress();
}

function updateShopUI() {
    document.querySelectorAll(".shop-grid button").forEach(btn => {
        const onClickAttr = btn.getAttribute("onclick");
        if(onClickAttr) {
            const color = onClickAttr.match(/'(.*?)'/)[1];
            if(currentSkin === color) { btn.style.borderColor = "var(--neon-cyan)"; btn.style.background = "rgba(0,251,255,0.1)"; }
            else if(ownedSkins.includes(color)) { btn.style.borderColor = "white"; btn.style.background = "none"; }
        }
    });
}

async function showRanking() {
    const { data } = await client.from('scores').select('name, score').order('score', { ascending: false }).limit(10);
    get("rankingList").innerHTML = data ? data.map((it, i) => `<li><span>#${i+1} ${it.name.toUpperCase()}</span> <b>${it.score.toLocaleString()} PTS</b></li>`).join("") : "Cargando...";
    switchScreen('ranking');
}

function showAchievementsScreen() {
    get("achievementsList").innerHTML = Object.keys(ACHIEVEMENTS_LIST).map(key => {
        const ach = ACHIEVEMENTS_LIST[key];
        const isU = unlockedAchievements.includes(key);
        return `<div class="achievement-card ${isU ? 'unlocked' : ''} tier-${ach.tier}">
            <h4>${ach.name}</h4><p>${ach.desc}</p>
        </div>`;
    }).join("");
    switchScreen('achievements');
}

function updateUI() {
    get("score").innerText = score; 
    get("time").innerText = time;
    get("walletAmount").innerText = wallet; 
    get("displayLevel").innerText = level;
    
    // MEJORA: ACTUALIZACIÓN DE BARRA DE XP
    const nextLevelXP = level * 1000;
    const xpPercent = (xp / nextLevelXP) * 100;
    get("xpFill").style.width = xpPercent + "%";
    get("xpText").innerText = `${xp} / ${nextLevelXP} XP`;

    if(combo > 1) { 
        get("comboWrapper").classList.remove("combo-hidden"); 
        get("comboText").innerText = "x" + combo; 
    }
    else get("comboWrapper").classList.add("combo-hidden");
}

function goHome() { switchScreen('start'); }

window.onload = () => {
    checkSession();
    get("playBtn").onclick = startGame; 
    get("restartBtn").onclick = startGame;
    get("rankingBtn").onclick = showRanking;

    get("loginBtn").onclick = async () => {
        const email = get("email").value, password = get("password").value;
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) alert("Error: " + error.message);
        else { currentUser = data.user; toggleAuthUI(true); await loadUserData(); }
    };

    get("registerBtn").onclick = async () => {
        const email = get("email").value, password = get("password").value;
        const { error } = await client.auth.signUp({ email, password });
        if (error) alert("Error: " + error.message);
        else alert("Revisa tu correo para confirmar.");
    };

    get("logoutBtn").onclick = async () => {
        await client.auth.signOut();
        location.reload();
    };
};
