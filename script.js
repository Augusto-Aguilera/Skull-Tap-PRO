/* =========================
   💀 SKULL TAP PRO - BASE PATRIC + SYNC SUPABASE
========================= */

const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);
let currentUser = null;
let score = 0, time = 15, wallet = 0, multiplier = 1;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];
let gameTimer, spawnTimer;

// --- 📈 VARIABLES DE DIFICULTAD PROGRESIVA ---
let currentLevel = 1;
let spawnRate = 800; 
let skullLifetime = 1200; 
const difficultyThreshold = 500; 

// --- 🔄 SINCRONIZACIÓN CON SUPABASE (NUEVO) ---
async function loadUserData() {
    if (!currentUser) return;
    
    const { data, error } = await client
        .from('scores')
        .select('wallet, skins')
        .eq('name', currentUser.email.split('@')[0])
        .single();

    if (data) {
        wallet = data.wallet || 0;
        // Si hay skins guardadas, las convertimos de texto a array
        if (data.skins) {
            ownedSkins = data.skins.split(',');
        }
        updateUI();
        updateShopUI();
    }
}

async function saveScore() {
    if (!currentUser) return;
    
    // Guardamos: nombre, record de puntos, billetera actual y skins como texto
    const { error } = await client.from('scores').upsert([{ 
        name: currentUser.email.split('@')[0], 
        score: score, 
        wallet: wallet,
        skins: ownedSkins.join(',')
    }], { onConflict: 'name' });

    if(error) console.error("Error al guardar:", error);
}

// --- 🛒 TIENDA REPARADA CON GUARDADO ---
async function buySkin(color, price) {
    if(ownedSkins.includes(color)) {
        currentSkin = color;
        updateShopUI();
        return;
    }
    if(wallet < price) {
        alert("No tienes suficientes puntos 💀");
        return;
    }
    
    wallet -= price;
    ownedSkins.push(color);
    currentSkin = color;
    
    updateUI();
    updateShopUI();
    
    if(get("buySound")) get("buySound").play();
    
    // Guardamos inmediatamente la compra en Supabase
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
        } else if(ownedSkins.includes(color)) {
            btn.innerText = `${btn.dataset.originalName} (USAR)`;
            btn.style.borderColor = "white";
        } else {
            const priceMatch = onclick.match(/,\s*(\d+)/);
            const price = priceMatch ? priceMatch[1] : "0";
            btn.innerText = `${btn.dataset.originalName} (${price})`;
            btn.style.borderColor = "var(--neon-green)";
        }
    });
}

async function showRanking() {
    const { data, error } = await client
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    if (error) return;

    const list = get("rankingList");
    if (list) {
        list.innerHTML = data.length === 0 ? "<li>No hay puntajes aún</li>" : 
            data.map((item, i) => `<li>${i + 1}. ${item.name}: ${item.score} pts</li>`).join("");
    }
    switchScreen('ranking');
}

function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
}

function checkDifficulty() {
    const level = Math.floor(score / difficultyThreshold) + 1;
    if (level > currentLevel) {
        currentLevel = level;
        spawnRate = Math.max(300, spawnRate * 0.85);
        skullLifetime = Math.max(500, skullLifetime * 0.90);
        clearInterval(spawnTimer);
        spawnTimer = setInterval(spawnSkull, spawnRate);
    }
}

function createHitEffects(x, y) {
    const explosion = document.createElement("div");
    explosion.className = "explosion-fx";
    explosion.style.left = x + "px";
    explosion.style.top = y + "px";
    
    if(currentSkin === "rainbow") {
        const colors = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#ff00ff"];
        explosion.style.background = colors[Math.floor(Math.random() * colors.length)];
    } else {
        explosion.style.background = currentSkin;
    }
    
    get("gameArea").appendChild(explosion);
    setTimeout(() => explosion.remove(), 400);
    
    const splatter = document.createElement("div");
    splatter.className = "skull-splatter";
    splatter.innerHTML = "💀";
    splatter.style.left = x + "px";
    splatter.style.top = y + "px";
    
    get("gameArea").appendChild(splatter);
    setTimeout(() => splatter.remove(), 700);
}

function startGame() {
    score = 0; time = 15;
    currentLevel = 1; spawnRate = 800; skullLifetime = 1200;
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
        checkDifficulty();
        if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
        skull.remove();
    };
    get("gameArea").appendChild(skull);
    setTimeout(() => { if(skull.parentElement) skull.remove(); }, skullLifetime);
}

function endGame() {
    clearInterval(gameTimer); clearInterval(spawnTimer);
    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";
    switchScreen('gameOver');
    saveScore(); // Guardamos puntos y wallet al terminar
}

function goHome() { switchScreen('start'); }

window.onload = () => {
    updateShopUI();
    if(get("playBtn")) get("playBtn").onclick = startGame;
    if(get("restartBtn")) get("restartBtn").onclick = startGame;
    if(get("rankingBtn")) get("rankingBtn").onclick = showRanking;
    
    if(get("loginBtn")) {
        get("loginBtn").onclick = async () => {
            const email = get("email").value;
            const password = get("password").value;
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (data.user) {
                currentUser = data.user;
                get("userStatus").innerText = "Conectado: " + email.split('@')[0];
                loadUserData(); // Cargamos skins y wallet al entrar
            } else {
                alert("Error: " + error.message);
            }
        };
    }

    if(get("registerBtn")) {
        get("registerBtn").onclick = async () => {
            const email = get("email").value;
            const password = get("password").value;
            const { data, error } = await client.auth.signUp({ email, password });
            if (error) alert(error.message);
            else alert("¡Revisa tu email para confirmar!");
        };
    }
};
