/* =========================
   💀 SKULL TAP PRO - REPARADO Y MEJORADO POR PATRIC
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
let spawnRate = 800; // Tiempo entre calaveras (ms)
let skullLifetime = 1200; // Tiempo que dura la calavera (ms)
const difficultyThreshold = 500; // Puntos para subir de nivel

// --- 1. REPARACIÓN DE NOMBRES EN TIENDA (Punto 3 - Reparado) ---
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

// --- 2. REPARACIÓN DE RANKING (Punto 3 - Reparado) ---
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
}

// --- 🛒 TIENDA (Punto 3 - Reparado) ---
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

// --- 📈 LÓGICA DE DIFICULTAD PROGRESIVA (Mejora 2) ---
function checkDifficulty() {
    // Calculamos el nivel en base al puntaje
    const level = Math.floor(score / difficultyThreshold) + 1;
    
    // Si subimos de nivel, aumentamos la dificultad
    if (level > currentLevel) {
        currentLevel = level;
        
        // Aumentamos el Spawn Rate (sale más rápido) un 15%
        spawnRate = Math.max(300, spawnRate * 0.85); // Mínimo 300ms
        
        // Reducimos el tiempo de vida un 10%
        skullLifetime = Math.max(500, skullLifetime * 0.90); // Mínimo 500ms
        
        // Reiniciamos el spawn timer con la nueva velocidad
        clearInterval(spawnTimer);
        spawnTimer = setInterval(spawnSkull, spawnRate);
        
        // Un pequeño mensaje visual sutil (opcional si lo quieres, sino bórralo)
        // console.log(`Dificultad Nivel ${currentLevel}: Spawn=${spawnRate}ms, Lifetime=${skullLifetime}ms`);
    }
}

// --- 🎉 LÓGICA DE EFECTOS VISUALES (Mejora 1) ---
function createHitEffects(x, y) {
    // 1. Explosión de color (como un destello)
    const explosion = document.createElement("div");
    explosion.className = "explosion-fx";
    explosion.style.left = x + "px";
    explosion.style.top = y + "px";
    
    // El color depende de la skin actual
    if(currentSkin === "rainbow") {
        // Para rainbow, elegimos un color aleatorio rápido
        const colors = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#ff00ff"];
        explosion.style.background = colors[Math.floor(Math.random() * colors.length)];
    } else {
        explosion.style.background = currentSkin;
    }
    
    get("gameArea").appendChild(explosion);
    setTimeout(() => explosion.remove(), 400); // Mismo tiempo que la animación CSS
    
    // 2. Emoji 💀 flotante y desvaneciéndose
    const splatter = document.createElement("div");
    splatter.className = "skull-splatter";
    splatter.innerHTML = "💀";
    splatter.style.left = x + "px";
    splatter.style.top = y + "px";
    
    get("gameArea").appendChild(splatter);
    setTimeout(() => splatter.remove(), 700); // Mismo tiempo que la animación CSS
}

// --- 🎮 LÓGICA DEL JUEGO (RESTAURADA Y MEJORADA) ---
function startGame() {
    score = 0; time = 15; multiplier = 1;
    
    // Reiniciamos dificultad (Mejora 2)
    currentLevel = 1;
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
    const skull = document.createElement("div");
    skull.className = "target";
    skull.innerHTML = "💀";
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    
    // Mantenemos tu efecto de skin (Punto 1 - Mantenido)
    if(currentSkin === "rainbow") {
        skull.style.animation = "rainbowGlow 1s infinite";
    } else {
        skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }

    skull.onclick = (e) => { // Agregamos 'e' para obtener las coordenadas del clic
        score += 10 * multiplier;
        wallet += 1;
        updateUI();
        
        // Lanzamos efectos visuales (Mejora 1)
        createHitEffects(e.clientX, e.clientY);
        
        // Verificamos si subimos dificultad (Mejora 2)
        checkDifficulty();
        
        if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
        skull.remove();
    };
    get("gameArea").appendChild(skull);
    
    // El tiempo de vida ahora es dinámico (Mejora 2)
    setTimeout(() => { if(skull) skull.remove(); }, skullLifetime);
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
    
    // Auth Logic
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
