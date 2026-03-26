/* ========================================
   SKULL TAP PRO - NÚCLEO DE LÓGICA 2026
   ======================================== */

// 1. CONFIGURACIÓN SUPABASE
const supabaseUrl = "https://thkuxitmdfwthyadcytx.supabase.co";
const supabaseKey = "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd";
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

const get = (id) => document.getElementById(id);

// 2. ESTADO GLOBAL DEL JUGADOR
let currentUser = null;
let score = 0;
let time = 15;
let wallet = 0;
let xp = 0;
let level = 1;

// 3. SISTEMA DE COMBOS Y SKIN
let combo = 1;
let comboTimer = null;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];
let unlockedAchievements = [];

// 4. MOTOR DE TIEMPO
let gameInterval = null;
let spawnInterval = null;
let spawnRate = 850;

// 5. MISIONES DIARIAS (Objeto detallado)
let dailyTasks = [
    { id: "T1", title: "Cazador de Sombras", desc: "Aplasta 40 calaveras", goal: 40, current: 0, done: false, reward: 150 },
    { id: "T2", title: "Frenesí Neón", desc: "Llega a Combo x7", goal: 7, current: 0, done: false, reward: 300 },
    { id: "T3", title: "Avaricia", desc: "Gana 1200 puntos", goal: 1200, current: 0, done: false, reward: 500 }
];

// 6. DICCIONARIO COMPLETO DE LOGROS
const ACHIEVEMENTS = {
    "F1": { name: "Primer Impacto", tier: "facil", desc: "Suma 100 puntos en una partida.", req: () => score >= 100 },
    "F2": { name: "Ritmo Suave", tier: "facil", desc: "Consigue un Combo x3.", req: () => combo >= 3 },
    "F3": { name: "Iniciado", tier: "facil", desc: "Llega al Nivel 2.", req: () => level >= 2 },
    
    "M1": { name: "Aniquilador", tier: "medio", desc: "Suma 1000 puntos en una partida.", req: () => score >= 1000 },
    "M2": { name: "Velocidad de Luz", tier: "medio", desc: "Consigue un Combo x8.", req: () => combo >= 8 },
    "M3": { name: "Veterano de Guerra", tier: "medio", desc: "Llega al Nivel 5.", req: () => level >= 5 },
    
    "D1": { name: "MAESTRO SUPREMO", tier: "dificil", desc: "Haz 5000 puntos en un juego.", req: () => score >= 5000 },
    "D2": { name: "Estado de Trance", tier: "dificil", desc: "Consigue un Combo x15.", req: () => combo >= 15 },
    "D3": { name: "Leyenda del Inframundo", tier: "dificil", desc: "Alcanza el Nivel 10.", req: () => level >= 10 }
};

/* --- FUNCIONES DE PERSISTENCIA (LOGIN ARREGLADO) --- */

async function syncData() {
    if (!currentUser) return;
    const name = currentUser.email.split('@')[0];

    const { data } = await client.from('scores').select('*').eq('name', name).single();
    
    if (data) {
        wallet = data.wallet || 0;
        xp = data.xp || 0;
        level = data.level || 1;
        if (data.skins) ownedSkins = data.skins.split(',');
        if (data.achievements) unlockedAchievements = data.achievements.split(',');
        updateUI();
        renderDailyTasks();
    }
}

async function saveSession() {
    if (!currentUser) return;
    const name = currentUser.email.split('@')[0];

    // Buscar record anterior
    const { data: old } = await client.from('scores').select('score').eq('name', name).single();
    const topScore = old ? Math.max(old.score, score) : score;

    await client.from('scores').upsert({
        name: name,
        score: topScore,
        wallet: wallet,
        xp: xp,
        level: level,
        skins: ownedSkins.join(','),
        achievements: unlockedAchievements.join(',')
    }, { onConflict: 'name' });
}

/* --- MOTOR DE JUEGO --- */

function startNewGame() {
    score = 0;
    time = 15;
    combo = 1;
    spawnRate = 850;
    
    switchScreen('game');
    updateUI();
    resetComboUI();

    gameInterval = setInterval(() => {
        time--;
        get("time").innerText = time;
        if (time <= 0) stopGame();
    }, 1000);

    spawnInterval = setInterval(createTarget, spawnRate);
}

function createTarget() {
    const area = get("gameArea");
    const target = document.createElement("div");
    target.className = "target";
    target.innerHTML = "💀";
    
    const x = Math.random() * (area.clientWidth - 80) + 10;
    const y = Math.random() * (area.clientHeight - 80) + 10;
    target.style.left = x + "px";
    target.style.top = y + "px";

    if(currentSkin === "rainbow") target.style.animation = "rainbowGlow 1s infinite";
    else target.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;

    target.onclick = (e) => {
        handleHit(e.clientX, e.clientY);
        target.remove();
    };

    area.appendChild(target);
    
    // Si no la tocas, pierdes el combo
    setTimeout(() => {
        if(target.parentElement) {
            target.remove();
            breakCombo();
        }
    }, 1100);
}

function handleHit(clickX, clickY) {
    // Multiplicador por combo
    const pts = 10 * combo;
    score += pts;
    wallet += 1;
    xp += (5 * combo);

    // Actualizar Misiones
    trackMissions(1, pts);

    // Incrementar Combo
    combo++;
    updateComboUI();

    // Efectos
    spawnNeonParticles(clickX, clickY);
    vibrateScreen();
    
    // Sonido
    const hitSnd = get("hitSound");
    hitSnd.currentTime = 0;
    hitSnd.play();

    // Niveles
    if (xp >= level * 600) {
        level++;
        showToast(`🆙 ¡NIVEL ${level}!`);
    }

    checkAchievements();
    updateUI();
}

/* --- SISTEMA DE COMBOS --- */

function updateComboUI() {
    clearTimeout(comboTimer);
    const box = get("comboContainer");
    box.classList.remove("combo-hide");
    box.classList.add("combo-active");
    get("comboVal").innerText = "x" + combo;
    
    // Tienes 1.3 segundos para mantener el combo
    comboTimer = setTimeout(breakCombo, 1300);
}

function breakCombo() {
    combo = 1;
    resetComboUI();
}

function resetComboUI() {
    const box = get("comboContainer");
    box.classList.add("combo-hide");
    box.classList.remove("combo-active");
}

/* --- EFECTOS VISUALES (SIN SIMPLIFICAR) --- */

function vibrateScreen() {
    const area = get("gameArea");
    area.classList.add("shake");
    setTimeout(() => area.classList.remove("shake"), 200);
}

function spawnNeonParticles(x, y) {
    const area = get("gameArea");
    const rect = area.getBoundingClientRect();
    const colors = ["#00fbff", "#ff00ff", "#00ffcc", "#fff000", "#ff5500"];
    
    for(let i=0; i < 10; i++) {
        const p = document.createElement("div");
        p.className = "neon-particle";
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = (x - rect.left) + "px";
        p.style.top = (y - rect.top) + "px";
        
        // Dirección aleatoria
        const tx = (Math.random() - 0.5) * 250;
        const ty = (Math.random() - 0.5) * 250;
        p.style.setProperty('--x', tx + "px");
        p.style.setProperty('--y', ty + "px");
        
        area.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }
}

/* --- SISTEMA DE MISIONES --- */

function trackMissions(skulls, points) {
    dailyTasks.forEach(task => {
        if (task.done) return;

        if (task.id === "T1") task.current += skulls;
        if (task.id === "T2" && combo > task.current) task.current = combo;
        if (task.id === "T3") task.current += points;

        if (task.current >= task.goal) {
            task.done = true;
            wallet += task.reward;
            showToast(`✅ MISIÓN: ${task.title} (+${task.reward} PTS)`);
        }
    });
    renderDailyTasks();
}

function renderDailyTasks() {
    const container = get("dailyTasksList");
    container.innerHTML = dailyTasks.map(t => `
        <div class="task-item ${t.done ? 'completed' : ''}">
            <span>${t.desc}</span>
            <b>${t.done ? 'COMPLETO' : t.current + '/' + t.goal}</b>
        </div>
    `).join("");
}

/* --- PANTALLAS Y NAVEGACIÓN --- */

function checkAchievements() {
    Object.keys(ACHIEVEMENTS).forEach(key => {
        if (!unlockedAchievements.includes(key) && ACHIEVEMENTS[key].req()) {
            unlockedAchievements.push(key);
            showToast(`🏆 LOGRO: ${ACHIEVEMENTS[key].name}`);
            saveSession();
        }
    });
}

function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

function updateUI() {
    get("score").innerText = score;
    get("walletAmount").innerText = wallet;
    get("displayLevel").innerText = level;
    if (currentUser) {
        const nick = currentUser.email.split('@')[0].toUpperCase();
        get("userStatus").innerText = `BIENVENIDO, ${nick} | LVL ${level}`;
    }
}

function stopGame() {
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";
    get("xpGained").innerText = `+${xp} XP TOTAL`;
    switchScreen('gameOver');
    saveSession();
}

function buySkin(skinId, price) {
    if (ownedSkins.includes(skinId)) {
        currentSkin = skinId;
        showToast("Estilo equipado correctamente.");
        updateShopUI();
        return;
    }

    if (wallet >= price) {
        wallet -= price;
        ownedSkins.push(skinId);
        currentSkin = skinId;
        get("buySound").play();
        showToast("¡Nueva skin adquirida!");
        updateShopUI();
        updateUI();
        saveSession();
    } else {
        alert("No tienes suficientes almas para esta compra.");
    }
}

function updateShopUI() {
    document.querySelectorAll(".shop-item").forEach(btn => {
        const id = btn.getAttribute("onclick").match(/'(.*?)'/)[1];
        if (currentSkin === id) {
            btn.style.borderColor = "var(--neon-cyan)";
            btn.style.background = "rgba(0, 251, 255, 0.1)";
        } else if (ownedSkins.includes(id)) {
            btn.style.borderColor = "#fff";
            btn.style.background = "transparent";
        }
    });
}

async function fetchRanking() {
    const { data } = await client.from('scores').select('name, score').order('score', { ascending: false }).limit(10);
    const list = get("rankingList");
    list.innerHTML = data ? data.map((u, i) => `<li>#${i+1} ${u.name.toUpperCase()} - ${u.score} PTS</li>`).join("") : "Cargando...";
    switchScreen('ranking');
}

function showAchievementsScreen() {
    const list = get("achievementsList");
    list.innerHTML = "";
    Object.keys(ACHIEVEMENTS).forEach(key => {
        const a = ACHIEVEMENTS[key];
        const unlocked = unlockedAchievements.includes(key);
        list.innerHTML += `
            <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
                <div style="flex:1">
                    <span class="ach-tier tier-${a.tier}">${a.tier.toUpperCase()}</span>
                    <h4>${unlocked ? '🏆' : '🔒'} ${a.name}</h4>
                    <p>${a.desc}</p>
                </div>
            </div>`;
    });
    switchScreen('achievements');
}

function goHome() { switchScreen('start'); }

/* --- EVENTOS DE INICIO --- */

window.onload = () => {
    renderDailyTasks();
    get("playBtn").onclick = startNewGame;
    get("restartBtn").onclick = startNewGame;
    get("rankingBtn").onclick = fetchRanking;

    get("loginBtn").onclick = async () => {
        const { data, error } = await client.auth.signInWithPassword({
            email: get("email").value,
            password: get("password").value
        });
        if (data.user) {
            currentUser = data.user;
            await syncData();
            showToast("Sincronización completa.");
        } else {
            alert("Error al entrar: " + error.message);
        }
    };

    get("registerBtn").onclick = async () => {
        const { error } = await client.auth.signUp({
            email: get("email").value,
            password: get("password").value
        });
        if (error) alert(error.message);
        else alert("¡Casi listo! Revisa tu email para activar la cuenta.");
    };
};
