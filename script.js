/* ========================================
   SKULL TAP PRO - LÓGICA DE JUEGO CENTRAL
   ========================================
*/

// Inicialización de Supabase
const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);

// Variables de Sesión y Jugador
let currentUser = null;
let score = 0;
let time = 15;
let wallet = 0;
let xp = 0;
let level = 1;

// Personalización
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];
let unlockedAchievements = [];

// Temporizadores
let gameTimer = null;
let spawnTimer = null;

// Configuración de Dificultad
let spawnRate = 800; // ms entre calaveras
let skullLifetime = 1200; // cuanto dura la calavera en pantalla

/* --- DICCIONARIO DE LOGROS POR GRUPOS --- */
const ACHIEVEMENTS_LIST = {
    // GRUPO FÁCIL (Iniciación)
    "EASY_1": { icon: "🩸", tier: "facil", name: "Primera Sangre", desc: "Aplasta tu primera calavera.", req: () => score >= 10 },
    "EASY_2": { icon: "🌱", tier: "facil", name: "Aprendiz", desc: "Llega al nivel 2.", req: () => level >= 2 },
    "EASY_3": { icon: "💰", tier: "facil", name: "Billetera Abierta", desc: "Ten 100 puntos ahorrados.", req: () => wallet >= 100 },
    "EASY_4": { icon: "🎭", tier: "facil", name: "Nuevo Look", desc: "Compra tu primera skin.", req: () => ownedSkins.length >= 2 },
    "EASY_5": { icon: "⏱️", tier: "facil", name: "Sobreviviente", desc: "Termina una partida completa.", req: () => score > 0 },

    // GRUPO MEDIO (Competencia)
    "MED_1": { icon: "💀", tier: "medio", name: "Asesino de Calaveras", desc: "Consigue 500 puntos en una partida.", req: () => score >= 500 },
    "MED_2": { icon: "⚔️", tier: "medio", name: "Guerrero", desc: "Alcanza el nivel 5.", req: () => level >= 5 },
    "MED_3": { icon: "🏛️", tier: "medio", name: "Coleccionista", desc: "Ten 4 skins desbloqueadas.", req: () => ownedSkins.length >= 4 },
    "MED_4": { icon: "💎", tier: "medio", name: "Ahorrador Pro", desc: "Llega a 1000 en la wallet.", req: () => wallet >= 1000 },
    "MED_5": { icon: "🔥", tier: "medio", name: "Racha Caliente", desc: "Supera los 800 puntos.", req: () => score >= 800 },

    // GRUPO DIFÍCIL (Maestría / Hardcore)
    "HARD_1": { icon: "👑", tier: "dificil", name: "DIOS DEL TAP", desc: "Consigue 2000 puntos en una sola partida.", req: () => score >= 2000 },
    "HARD_2": { icon: "🌑", tier: "dificil", name: "Inmortal", desc: "Llega al nivel 10.", req: () => level >= 10 },
    "HARD_3": { icon: "🌈", tier: "dificil", name: "Elegido de Orula", tier: "dificil", desc: "Desbloquea la Skin Arcoíris.", req: () => ownedSkins.includes("rainbow") },
    "HARD_4": { icon: "🏛️", tier: "dificil", name: "Dueño del Inframundo", desc: "Desbloquea TODAS las skins.", req: () => ownedSkins.length >= 8 },
    "HARD_5": { icon: "🎖️", tier: "dificil", name: "Leyenda Global", desc: "Llega a 10,000 acumulado en la wallet.", req: () => wallet >= 10000 }
};

/* --- FUNCIONES DE BASE DE DATOS --- */

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
    }
}

async function saveProgress() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];

    // Obtener puntaje máximo actual
    const { data: currentRecord } = await client
        .from('scores')
        .select('score')
        .eq('name', userName)
        .single();

    const topScore = currentRecord ? Math.max(currentRecord.score, score) : score;

    const { error } = await client.from('scores').upsert([{ 
        name: userName, 
        score: topScore, 
        wallet: wallet,
        xp: xp,
        level: level,
        skins: ownedSkins.join(','),
        achievements: unlockedAchievements.join(',')
    }], { onConflict: 'name' });

    if(error) console.error("Error al sincronizar:", error);
}

/* --- MOTOR DEL JUEGO --- */

function startGame() {
    score = 0;
    time = 15;
    spawnRate = 800;
    skullLifetime = 1200;

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
    
    // Posición Aleatoria
    const x = Math.random() * (gameArea.clientWidth - 80) + 10;
    const y = Math.random() * (gameArea.clientHeight - 80) + 10;
    skull.style.left = x + "px";
    skull.style.top = y + "px";
    
    // Aplicar Skin Seleccionada
    if(currentSkin === "rainbow") {
        skull.style.animation = "rainbowGlow 1.5s infinite linear";
    } else {
        skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }

    // Acción al tocar
    skull.onclick = (event) => {
        score += 10;
        wallet += 1;
        addXP(20);
        
        // Efectos Visuales
        createHitEffects(event.clientX, event.clientY);
        
        // Dificultad Dinámica
        if (score % 400 === 0) {
            increaseDifficulty();
        }

        // Sonido
        const snd = get("hitSound");
        if(snd) { snd.currentTime = 0; snd.play(); }

        checkAchievements();
        updateUI();
        skull.remove();
    };

    gameArea.appendChild(skull);

    // Desaparecer después de un tiempo
    setTimeout(() => {
        if(skull.parentElement) skull.remove();
    }, skullLifetime);
}

function increaseDifficulty() {
    spawnRate = Math.max(250, spawnRate - 50);
    skullLifetime = Math.max(500, skullLifetime - 50);
    
    clearInterval(spawnTimer);
    spawnTimer = setInterval(spawnSkull, spawnRate);
}

function addXP(amount) {
    xp += amount;
    let nextLevelGoal = level * 600;
    
    if (xp >= nextLevelGoal) {
        level++;
        alert(`¡FELICIDADES! Alcanzaste el NIVEL ${level}`);
        saveProgress();
    }
}

function createHitEffects(x, y) {
    const gameArea = get("gameArea");
    
    // Explosión de color
    const exp = document.createElement("div");
    exp.className = "explosion-fx";
    exp.style.left = (x - gameArea.getBoundingClientRect().left) + "px";
    exp.style.top = (y - gameArea.getBoundingClientRect().top) + "px";
    exp.style.background = currentSkin === "rainbow" ? "white" : currentSkin;
    gameArea.appendChild(exp);
    setTimeout(() => exp.remove(), 500);

    // Rastro de Calavera (Splatter)
    const spat = document.createElement("div");
    spat.className = "skull-splatter";
    spat.innerHTML = "💀";
    spat.style.left = (x - gameArea.getBoundingClientRect().left) + "px";
    spat.style.top = (y - gameArea.getBoundingClientRect().top) + "px";
    gameArea.appendChild(spat);
    setTimeout(() => spat.remove(), 800);
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
    toast.innerHTML = `🏅 <b>Logro Desbloqueado:</b> <br> ${name}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";
    switchScreen('gameOver');
    saveProgress();
}

/* --- TIENDA Y RANKING --- */

function buySkin(color, price) {
    if(ownedSkins.includes(color)) {
        currentSkin = color;
        updateShopUI();
        return;
    }
    
    if(wallet < price) {
        alert("Puntos insuficientes en la billetera.");
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
    const items = document.querySelectorAll(".shop-item");
    items.forEach(btn => {
        const onclick = btn.getAttribute("onclick");
        const colorMatch = onclick.match(/'(.*?)'/);
        if(!colorMatch) return;
        const color = colorMatch[1];

        if(currentSkin === color) {
            btn.style.borderColor = "var(--neon-cyan)";
            btn.style.boxShadow = "0 0 15px var(--neon-cyan)";
        } else if(ownedSkins.includes(color)) {
            btn.style.borderColor = "white";
            btn.style.boxShadow = "none";
        } else {
            btn.style.borderColor = "var(--neon-green)";
            btn.style.boxShadow = "none";
        }
    });
}

async function showRanking() {
    const { data, error } = await client
        .from('scores')
        .select('name, score')
        .order('score', { ascending: false })
        .limit(10);

    const list = get("rankingList");
    list.innerHTML = "";

    if (data) {
        data.forEach((item, index) => {
            list.innerHTML += `<li>
                <span>#${index+1} ${item.name}</span>
                <b>${item.score} pts</b>
            </li>`;
        });
    }
    switchScreen('ranking');
}

function showAchievementsScreen() {
    const container = get("achievementsList");
    container.innerHTML = "";

    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        const ach = ACHIEVEMENTS_LIST[key];
        const isUnlocked = unlockedAchievements.includes(key);
        
        container.innerHTML += `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="ach-icon">${ach.icon}</div>
                <div class="ach-info">
                    <span class="ach-badge badge-${ach.tier}">${ach.tier.toUpperCase()}</span>
                    <h4>${ach.name}</h4>
                    <p>${ach.desc}</p>
                </div>
            </div>
        `;
    });
    switchScreen('achievements');
}

function updateUI() {
    get("score").innerText = score;
    get("time").innerText = time;
    get("walletAmount").innerText = wallet;
    get("displayLevel").innerText = level;

    if(currentUser) {
        const name = currentUser.email.split('@')[0].toUpperCase();
        get("userStatus").innerText = `BIENVENIDO: ${name} (LVL ${level})`;
    }
}

function goHome() { switchScreen('start'); }

/* --- AUTENTICACIÓN --- */

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
        else alert("¡Registro exitoso! Revisa tu email para confirmar.");
    };
};
