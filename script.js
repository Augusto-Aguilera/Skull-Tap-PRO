/* =========================
   💀 SKULL TAP PRO - SYNC COMPLETO
   Base de datos: scores (id, score, name, wallet, skins)
========================= */

const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);
let currentUser = null;
let score = 0, time = 15, wallet = 0;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];
let gameTimer, spawnTimer;

// Dificultad
let currentLevel = 1;
let spawnRate = 800; 
let skullLifetime = 1200; 
const difficultyThreshold = 500; 

// --- 🔄 CARGA DE DATOS (WALLET + SKINS) ---
async function loadUserData() {
    if (!currentUser) return;
    
    const { data, error } = await client
        .from('scores')
        .select('wallet, skins, score')
        .eq('name', currentUser.email.split('@')[0])
        .single();

    if (data) {
        wallet = data.wallet || 0;
        // Si hay skins guardadas (ej: "color1,color2"), las convertimos en array
        if (data.skins) {
            ownedSkins = data.skins.split(',');
        }
        updateUI();
        updateShopUI();
        console.log("Datos cargados: ", data);
    }
}

// --- 💾 GUARDADO DE DATOS ---
async function saveScore() {
    if (!currentUser) return;
    
    const userName = currentUser.email.split('@')[0];

    // Obtenemos el record actual para no borrar el puntaje máximo si el nuevo es menor
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
        skins: ownedSkins.join(',') // Guardamos el array como texto separado por comas
    }], { onConflict: 'name' });

    if(error) console.error("Error al guardar en Supabase:", error);
}

// --- 🛒 LÓGICA DE TIENDA ---
async function buySkin(color, price) {
    if(ownedSkins.includes(color)) {
        currentSkin = color;
        updateShopUI();
        return;
    }
    
    if(wallet < price) {
        alert("¡Necesitas más almas! 💀 (Puntos insuficientes)");
        return;
    }
    
    wallet -= price;
    ownedSkins.push(color);
    currentSkin = color;
    
    updateUI();
    updateShopUI();
    
    if(get("buySound")) get("buySound").play();
    
    // Guardamos la compra inmediatamente
    saveScore();
}

function updateShopUI() {
    const buttons = document.querySelectorAll(".shop-grid button");
    buttons.forEach(btn => {
        const onclick = btn.getAttribute("onclick");
        if(!onclick) return;

        const colorMatch = onclick.match(/'(.*?)'/);
        if(!colorMatch) return;
        const color = colorMatch[1];

        if(!btn.dataset.originalName) {
            btn.dataset.originalName = btn.innerText.split('(')[0].trim();
        }

        if(currentSkin === color) {
            btn.innerText = `${btn.dataset.originalName} (EQUIPADO)`;
            btn.style.borderColor = "var(--neon-cyan)";
            btn.style.boxShadow = "0 0 10px var(--neon-cyan)";
        } else if(ownedSkins.includes(color)) {
            btn.innerText = `${btn.dataset.originalName} (USAR)`;
            btn.style.borderColor = "white";
            btn.style.boxShadow = "none";
        } else {
            const priceMatch = onclick.match(/,\s*(\d+)/);
            const price = priceMatch ? priceMatch[1] : "0";
            btn.innerText = `${btn.dataset.originalName} (${price})`;
            btn.style.borderColor = "var(--neon-green)";
            btn.style.boxShadow = "none";
        }
    });
}

// --- 🏆 RANKING ---
async function showRanking() {
    const { data, error } = await client
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    const list = get("rankingList");
    if (list) {
        list.innerHTML = (data && data.length > 0) 
            ? data.map((item, i) => `<li>${i + 1}. ${item.name}: ${item.score} pts</li>`).join("")
            : "<li>No hay leyendas aún...</li>";
    }
    switchScreen('ranking');
}

// --- 🎮 MOTOR DEL JUEGO ---
function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
}

function spawnSkull() {
    const gameArea = get("gameArea");
    if(!gameArea) return;

    const skull = document.createElement("div");
    skull.className = "target";
    skull.innerHTML = "💀";
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    
    if(currentSkin === "rainbow") {
        skull.style.animation = "rainbowGlow 1s infinite";
    } else {
        skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }

    skull.onclick = (e) => {
        score += 10;
        wallet += 1;
        updateUI();
        createHitEffects(e.clientX, e.clientY);
        
        // Dificultad progresiva
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

function createHitEffects(x, y) {
    const explosion = document.createElement("div");
    explosion.className = "explosion-fx";
    explosion.style.left = x + "px";
    explosion.style.top = y + "px";
    explosion.style.background = (currentSkin === "rainbow") ? "white" : currentSkin;
    get("gameArea").appendChild(explosion);
    setTimeout(() => explosion.remove(), 400);
}

function startGame() {
    score = 0; time = 15;
    spawnRate = 800;
    switchScreen('game');
    updateUI();
    gameTimer = setInterval(() => {
        time--;
        updateUI();
        if (time <= 0) endGame();
    }, 1000);
    spawnTimer = setInterval(spawnSkull, spawnRate);
}

function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";
    switchScreen('gameOver');
    saveScore(); // Guardar al final de la partida
}

function goHome() { switchScreen('start'); }

// --- 🔐 AUTENTICACIÓN ---
window.onload = () => {
    updateShopUI();
    get("playBtn").onclick = startGame;
    get("restartBtn").onclick = startGame;
    get("rankingBtn").onclick = showRanking;
    
    get("loginBtn").onclick = async () => {
        const email = get("email").value;
        const password = get("password").value;
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (data.user) {
            currentUser = data.user;
            get("userStatus").innerText = "💀 HOLA, " + email.split('@')[0].toUpperCase();
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
        else alert("¡Casi listo! Revisa tu email para confirmar.");
    };
};
