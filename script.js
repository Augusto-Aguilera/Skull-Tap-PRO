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
let gameTimer, spawnTimer;

// GRUPOS DE LOGROS
const ACHIEVEMENTS_LIST = {
    // --- FÁCIL ---
    "FIRST": { name: "Primera Sangre", tier: "facil", desc: "Aplasta 1 calavera", req: () => score >= 10 },
    "LEVEL_2": { name: "Novato", tier: "facil", desc: "Llega al Nivel 2", req: () => level >= 2 },
    "TEN_CLICK": { name: "Entusiasta", tier: "facil", desc: "Consigue 100 puntos en una partida", req: () => score >= 100 },
    "SAVER": { name: "Ahorrador", tier: "facil", desc: "Ten 100 puntos en tu wallet", req: () => wallet >= 100 },
    "FIRST_SKIN": { name: "Fashionista", tier: "facil", desc: "Compra tu primera skin", req: () => ownedSkins.length >= 2 },

    // --- MEDIANO ---
    "SCORE_500": { name: "Asesino Serial", tier: "medio", desc: "Consigue 500 puntos en una partida", req: () => score >= 500 },
    "LEVEL_5": { name: "Veterano", tier: "medio", desc: "Llega al Nivel 5", req: () => level >= 5 },
    "SKIN_3": { name: "Coleccionista", tier: "medio", desc: "Posee 3 skins diferentes", req: () => ownedSkins.length >= 3 },
    "WALLET_1000": { name: "Burgués", tier: "medio", desc: "Acumula 1000 en la wallet", req: () => wallet >= 1000 },
    "CHAMPION": { name: "Campeón Local", tier: "medio", desc: "Supera los 800 puntos", req: () => score >= 800 },

    // --- DIFÍCIL ---
    "GOD_SCORE": { name: "DIOS DEL TAP", tier: "dificil", desc: "Haz 2000 puntos en una partida", req: () => score >= 2000 },
    "LEVEL_10": { name: "Leyenda Viviente", tier: "dificil", desc: "Alcanza el Nivel 10", req: () => level >= 10 },
    "ALL_SKINS": { name: "Dueño del Infierno", tier: "dificil", desc: "Compra todas las skins", req: () => ownedSkins.length >= 8 },
    "WALLET_10K": { name: "Magnate de Almas", tier: "dificil", desc: "Ten 10,000 puntos en la wallet", req: () => wallet >= 10000 },
    "ORULA_OWNER": { name: "Elegido de Orula", tier: "dificil", desc: "Equipa la skin Rainbow", req: () => currentSkin === "rainbow" }
};

async function loadUserData() {
    if (!currentUser) return;
    const { data } = await client.from('scores').select('*').eq('name', currentUser.email.split('@')[0]).single();
    if (data) {
        wallet = data.wallet || 0;
        xp = data.xp || 0;
        level = data.level || 1;
        if (data.skins) ownedSkins = data.skins.split(',');
        if (data.achievements) unlockedAchievements = data.achievements.split(',');
        updateUI(); updateShopUI();
    }
}

async function saveProgress() {
    if (!currentUser) return;
    const name = currentUser.email.split('@')[0];
    const { data: rec } = await client.from('scores').select('score').eq('name', name).single();
    const top = rec ? Math.max(rec.score, score) : score;
    await client.from('scores').upsert([{ 
        name, score: top, wallet, xp, level, 
        skins: ownedSkins.join(','), achievements: unlockedAchievements.join(',')
    }], { onConflict: 'name' });
}

function startGame() {
    score = 0; time = 15; switchScreen('game'); updateUI();
    gameTimer = setInterval(() => { time--; updateUI(); if(time<=0) endGame(); }, 1000);
    spawnTimer = setInterval(spawnSkull, 800);
}

function spawnSkull() {
    const skull = document.createElement("div");
    skull.className = "target"; skull.innerHTML = "💀";
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    skull.style.filter = (currentSkin === "rainbow") ? "none" : `drop-shadow(0 0 10px ${currentSkin})`;
    if(currentSkin === "rainbow") skull.style.animation = "rainbowGlow 1s infinite";

    skull.onclick = (e) => {
        score += 10; wallet += 1; xp += 20;
        if(xp >= level * 500) { level++; alert(`¡NIVEL ${level}!`); saveProgress(); }
        checkAchievements(); updateUI(); createHitEffects(e.clientX, e.clientY);
        if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
        skull.remove();
    };
    get("gameArea").appendChild(skull);
    setTimeout(() => { if(skull.parentElement) skull.remove(); }, 1200);
}

function checkAchievements() {
    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        if (!unlockedAchievements.includes(key) && ACHIEVEMENTS_LIST[key].req()) {
            unlockedAchievements.push(key);
            showToast(ACHIEVEMENTS_LIST[key].name);
            saveProgress();
        }
    });
}

function showToast(name) {
    const t = document.createElement("div");
    t.className = "achievement-toast";
    t.innerHTML = `🏆 <b>LOGRO:</b> ${name}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function createHitEffects(x, y) {
    const ex = document.createElement("div"); ex.className = "explosion-fx";
    ex.style.left = x + "px"; ex.style.top = y + "px";
    ex.style.background = currentSkin === "rainbow" ? "white" : currentSkin;
    get("gameArea").appendChild(ex);
    setTimeout(() => ex.remove(), 400);
}

function endGame() {
    clearInterval(gameTimer); clearInterval(spawnTimer);
    get("gameArea").innerHTML = ""; get("finalScore").innerText = score + " pts";
    switchScreen('gameOver'); saveProgress();
}

function buySkin(c, p) {
    if(ownedSkins.includes(c)) { currentSkin = c; updateShopUI(); checkAchievements(); return; }
    if(wallet >= p) { wallet -= p; ownedSkins.push(c); currentSkin = c; updateUI(); updateShopUI(); saveProgress(); checkAchievements(); }
}

function updateShopUI() {
    document.querySelectorAll(".shop-grid button").forEach(b => {
        const c = b.getAttribute("onclick").match(/'(.*?)'/)[1];
        b.style.borderColor = (currentSkin === c) ? "var(--neon-cyan)" : (ownedSkins.includes(c) ? "white" : "var(--neon-green)");
    });
}

async function showRanking() {
    const { data } = await client.from('scores').select('*').order('score', { ascending: false }).limit(10);
    get("rankingList").innerHTML = data ? data.map(i => `<li><span>${i.name}</span> <b>${i.score}</b></li>`).join("") : "";
    switchScreen('ranking');
}

function showAchievementsScreen() {
    const container = get("achievementsList"); container.innerHTML = "";
    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        const a = ACHIEVEMENTS_LIST[key];
        const unlocked = unlockedAchievements.includes(key);
        container.innerHTML += `
            <div class="achievement-card ${unlocked?'unlocked':''}">
                <span class="ach-tier tier-${a.tier}">${a.tier}</span>
                <h4>${unlocked?'🏆':'🔒'} ${a.name}</h4>
                <p>${a.desc}</p>
            </div>`;
    });
    switchScreen('achievements');
}

function updateUI() {
    get("score").innerText = score; get("time").innerText = time;
    get("walletAmount").innerText = wallet; get("displayLevel").innerText = level;
    if(currentUser) get("userStatus").innerText = `LVL ${level} - ${currentUser.email.split('@')[0].toUpperCase()}`;
}

function goHome() { switchScreen('start'); }

window.onload = () => {
    get("playBtn").onclick = startGame;
    get("restartBtn").onclick = startGame;
    get("rankingBtn").onclick = showRanking;
    get("loginBtn").onclick = async () => {
        const { data, error } = await client.auth.signInWithPassword({ email: get("email").value, password: get("password").value });
        if (data.user) { currentUser = data.user; loadUserData(); }
        else alert(error.message);
    };
    get("registerBtn").onclick = async () => {
        const { error } = await client.auth.signUp({ email: get("email").value, password: get("password").value });
        if (error) alert(error.message); else alert("¡Verifica tu email!");
    };
};
