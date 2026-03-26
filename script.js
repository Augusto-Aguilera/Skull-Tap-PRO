/* =========================
   💀 SKULL TAP PRO - CORE JS
   ========================= */

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
let gameTimer, spawnTimer;

// Dificultad Dinámica
let spawnRate = 800;
let skullLifetime = 1200;
const difficultyThreshold = 500;

// Configuración de Logros
const ACHIEVEMENTS_LIST = {
    "FIRST_BLOOD": { name: "Primera Sangre", desc: "Aplasta 1 calavera", req: () => score >= 10 },
    "SHARP_SHOOTER": { name: "Francotirador", desc: "Llega a 500 pts en una partida", req: () => score >= 500 },
    "COLLECTOR": { name: "Coleccionista", desc: "Ten 3 skins en tu armario", req: () => ownedSkins.length >= 3 },
    "VETERAN": { name: "Veterano", desc: "Llega al Nivel 5", req: () => level >= 5 },
    "MILLIONAIRE": { name: "Capitalista", desc: "Llega a 1000 pts en la billetera", req: () => wallet >= 1000 }
};

// --- 🔄 SINCRONIZACIÓN CON SUPABASE ---

async function loadUserData() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];
    
    const { data, error } = await client
        .from('scores')
        .select('*')
        .eq('name', userName)
        .single();

    if (data) {
        wallet = data.wallet || 0;
        xp = data.xp || 0;
        level = data.level || 1;
        if (data.skins) ownedSkins = data.skins.split(',');
        if (data.achievements) unlockedAchievements = data.achievements.split(',');
        
        updateUI();
        updateShopUI();
        console.log("Datos cargados para:", userName);
    }
}

async function saveProgress() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];

    // No sobreescribir el record histórico si el puntaje actual es menor
    const { data: currentRecord } = await client.from('scores').select('score').eq('name', userName).single();
    const topScore = currentRecord ? Math.max(currentRecord.score, score) : score;

    await client.from('scores').upsert([{ 
        name: userName, 
        score: topScore, 
        wallet: wallet,
        xp: xp,
        level: level,
        skins: ownedSkins.join(','),
        achievements: unlockedAchievements.join(',')
    }], { onConflict: 'name' });
}

// --- 🎮 MOTOR DEL JUEGO ---

function startGame() {
    score = 0; time = 15;
    spawnRate = 800; skullLifetime = 1200;
    switchScreen('game');
    updateUI();
    
    gameTimer = setInterval(() => {
        time--;
        updateUI();
        if (time <= 0) endGame();
    }, 1000);
    
    spawnTimer = setInterval(spawnSkull, spawnRate);
}

function spawnSkull() {
    const gameArea = get("gameArea");
    if(!gameArea) return;

    const skull = document.createElement("div");
    skull.className = "target";
    skull.innerHTML = "💀";
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    
    // Aplicar Skin
    if(currentSkin === "rainbow") {
        skull.style.animation = "rainbowGlow 1s infinite";
    } else {
        skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }

    skull.onclick = (e) => {
        score += 10;
        wallet += 1;
        addXP(20); // 20 de XP por cada calavera
        checkAchievements();
        updateUI();
        createHitEffects(e.clientX, e.clientY);
        
        // Dificultad Progresiva
        if (score % difficultyThreshold === 0) {
            spawnRate = Math.max(300, spawnRate * 0.9);
            clearInterval(spawnTimer);
            spawnTimer = setInterval(spawnSkull, spawnRate);
        }

        if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
        skull.remove();
    };
    
    gameArea.appendChild(skull);
    setTimeout(() => { if(skull.parentElement) skull.remove(); }, skullLifetime);
}

function addXP(amount) {
    xp += amount;
    let nextLevelXP = level * 500;
    if (xp >= nextLevelXP) {
        level++;
        alert(`¡HAS SUBIDO AL NIVEL ${level}! 💀🔥`);
        saveProgress();
    }
}

function checkAchievements() {
    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        if (!unlockedAchievements.includes(key) && ACHIEVEMENTS_LIST[key].req()) {
            unlockedAchievements.push(key);
            showAchievementToast(ACHIEVEMENTS_LIST[key].name);
            saveProgress();
        }
    });
}

function showAchievementToast(name) {
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerHTML = `🏆 <b>Logro Desbloqueado:</b> <br> ${name}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function createHitEffects(x, y) {
    const explosion = document.createElement("div");
    explosion.className = "explosion-fx";
    explosion.style.left = x + "px"; explosion.style.top = y + "px";
    explosion.style.background = (currentSkin === "rainbow") ? "white" : currentSkin;
    get("gameArea").appendChild(explosion);
    setTimeout(() => explosion.remove(), 400);

    const splatter = document.createElement("div");
    splatter.className = "skull-splatter";
    splatter.innerHTML = "💀";
    splatter.style.left = x + "px"; splatter.style.top = y + "px";
    get("gameArea").appendChild(splatter);
    setTimeout(() => splatter.remove(), 700);
}

function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";
    switchScreen('gameOver');
    saveProgress();
}

// --- 🛒 TIENDA Y RANKING ---

function buySkin(color, price) {
    if(ownedSkins.includes(color)) {
        currentSkin = color;
        updateShopUI();
        return;
    }
    if(wallet < price) {
        alert("¡Necesitas más puntos! 💀");
        return;
    }
    wallet -= price;
    ownedSkins.push(color);
    currentSkin = color;
    updateUI();
    updateShopUI();
    if(get("buySound")) get("buySound").play();
    saveProgress();
}

function updateShopUI() {
    const buttons = document.querySelectorAll(".shop-grid button");
    buttons.forEach(btn => {
        const onclickAttr = btn.getAttribute("onclick");
        const colorMatch = onclickAttr.match(/'(.*?)'/);
        if(!colorMatch) return;
        const color = colorMatch[1];

        if(currentSkin === color) {
            btn.style.borderColor = "var(--neon-cyan)";
            btn.style.boxShadow = "0 0 10px var(--neon-cyan)";
        } else if(ownedSkins.includes(color)) {
            btn.style.borderColor = "white";
            btn.style.boxShadow = "none";
        } else {
            btn.style.borderColor = "var(--neon-green)";
        }
    });
}

async function showRanking() {
    const { data } = await client.from('scores').select('*').order('score', { ascending: false }).limit(10);
    const list = get("rankingList");
    if (list && data) {
        list.innerHTML = data.map((item, i) => 
            `<li><span>${i + 1}. ${item.name}</span> <b>${item.score} pts</b></li>`
        ).join("");
    }
    switchScreen('ranking');
}

function showAchievementsScreen() {
    const container = get("achievementsList");
    container.innerHTML = "";
    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        const ach = ACHIEVEMENTS_LIST[key];
        const unlocked = unlockedAchievements.includes(key);
        container.innerHTML += `
            <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
                <h4>${unlocked ? '🏆' : '🔒'} ${ach.name}</h4>
                <p>${ach.desc}</p>
            </div>`;
    });
    switchScreen('achievements');
}

function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
    if(get("displayLevel")) get("displayLevel").innerText = level;
    if(currentUser) get("userStatus").innerText = `LVL ${level} - ${currentUser.email.split('@')[0].toUpperCase()}`;
}

function goHome() { switchScreen('start'); }

// --- 🔐 INICIO DE SESIÓN ---

window.onload = () => {
    get("playBtn").onclick = startGame;
    get("restartBtn").onclick = startGame;
    get("rankingBtn").onclick = showRanking;

    get("loginBtn").onclick = async () => {
        const email = get("email").value;
        const password = get("password").value;
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (data.user) {
            currentUser = data.user;
            loadUserData();
        } else {
            alert("Error: " + error.message);
        }
    };

    get("registerBtn").onclick = async () => {
        const email = get("email").value;
        const password = get("password").value;
        const { error } = await client.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("¡Confirma tu correo electrónico!");
    };
};
