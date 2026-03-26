/* =========================
   💀 SKULL TAP PRO
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

// --- 📈 VARIABLES DE DIFICULTAD Y COMBO ---
let currentLevel = 1;
let spawnRate = 800;
let combo = 1;
const difficultyThreshold = 500;

// --- NOMBRES EN TIENDA ---
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

// --- RANKING ---
async function showRanking() {
    const { data, error } = await client
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error ranking:", error);
        return;
    }

    const list = get("rankingList");
    if (list) {
        list.innerHTML = data.length === 0 ? "<li>No hay puntajes aún</li>" : 
            data.map((item, i) => `<li>${i + 1}. ${item.name}: ${item.score} pts</li>`).join("");
    }
    switchScreen('ranking');
}

// --- FUNCIONES DE UI ---
function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
    if(get("combo")) get("combo").innerText = "x" + combo;
}

// --- 🛒 TIENDA ---
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
}

// --- 📈 LÓGICA DE DIFICULTAD Y COMBO ---
function checkDifficulty() {
    const level = Math.floor(score / difficultyThreshold) + 1;
    if (level > currentLevel) {
        currentLevel = level;
        spawnRate = Math.max(300, spawnRate * 0.85);
        clearInterval(spawnTimer);
        spawnTimer = setInterval(spawnSkull, spawnRate);
    }
}

// --- ✨ LÓGICA DE DESINTEGRACIÓN EN PARTÍCULAS ---
function createDissintegration(x, y, skinColor) {
    const numParticles = 12;
    // Resolvemos el color de la piel si es una variable CSS
    const resolvedColor = skinColor.startsWith('var(') ? 
        getComputedStyle(document.documentElement).getPropertyValue(skinColor.match(/\((.*?)\)/)[1]).trim() : 
        skinColor;
    
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement("div");
        particle.className = "particle-fx";
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        
        let pColor;
        if(skinColor === "rainbow") {
            const colors = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#ff00ff"];
            pColor = colors[Math.floor(Math.random() * colors.length)];
        } else {
            pColor = resolvedColor;
        }
        
        particle.style.background = pColor;
        particle.style.boxShadow = `0 0 8px ${pColor}`;
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 60 + Math.random() * 40;
        const xDist = Math.cos(angle) * radius;
        const yDist = Math.sin(angle) * radius;
        
        particle.style.setProperty('--x', xDist + "px");
        particle.style.setProperty('--y', yDist + "px");
        
        get("gameArea").appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

// --- 🎮 LÓGICA DEL JUEGO ---
function startGame() {
    score = 0; time = 15; combo = 1; spawnRate = 800;
    currentLevel = 1;
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
    
    // MEJORA: Color Neón Aleatorio (Punto 1 - Reparado)
    if(currentSkin === "rainbow") {
        skull.style.animation = "rainbowGlow 1s infinite";
    } else {
        // Resolvemos el color de la piel si es una variable CSS
        const skinColor = currentSkin.startsWith('var(') ? 
            getComputedStyle(document.documentElement).getPropertyValue(currentSkin.match(/\((.*?)\)/)[1]).trim() : 
            currentSkin;
        
        // --- EL TRUCO MÁGICO DE CSS (Ahora sí pinta por dentro) ---
        skull.style.background = skinColor;
        skull.style.webkitBackgroundClip = "text";
        skull.style.webkitTextFillColor = "transparent";
        skull.style.filter = `drop-shadow(0 0 10px ${skinColor})`;
    }

    skull.onclick = (e) => {
        score += (10 * combo);
        wallet += 1;
        combo++;
        updateUI();
        
        // Lanzamos desintegración (Mejora 2 - Reparado)
        createDissintegration(e.clientX, e.clientY, currentSkin);
        
        checkDifficulty();
        if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
        skull.remove();
    };
    get("gameArea").appendChild(skull);
    
    // El tiempo de vida ahora es dinámico
    setTimeout(() => { if(skull.parentElement) {
            skull.remove(); 
            combo = 1; // Pierdes el combo si no la tocas
            updateUI();
        }
    }, 1200);
}

function endGame() {
    clearInterval(gameTimer); clearInterval(spawnTimer);
    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";
    switchScreen('gameOver');
    saveScore();
}

async function saveScore() {
    if (!currentUser || score === 0) return;
    await client.from('scores').upsert([{ 
        name: currentUser.email.split('@')[0], 
        score: score, 
        wallet: wallet 
    }], { onConflict: 'name' });
}

function goHome() { switchScreen('start'); }

// --- EVENTOS INICIALES ---
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
                get("userStatus").innerText = "Conectado como: " + email.split('@')[0];
            }
        };
    }
};
