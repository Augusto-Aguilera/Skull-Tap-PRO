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

// --- 1. NOMBRES EN TIENDA ---
function updateShopUI() {
    const buttons = document.querySelectorAll(".shop-grid button");
    buttons.forEach(btn => {
        const onclick = btn.getAttribute("onclick");
        if(!onclick) return;

        const colorMatch = onclick.match(/'(.*?)'/);
        if(!colorMatch) return;
        const color = colorMatch[1];

        // Extraemos el nombre original (ej: INFERNO) si no lo tenemos guardado
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
            // Mantiene el nombre y solo muestra el precio
            const priceMatch = onclick.match(/,\s*(\d+)/);
            const price = priceMatch ? priceMatch[1] : "0";
            btn.innerText = `${btn.dataset.originalName} (${price})`;
            btn.style.borderColor = "var(--neon-green)";
        }
    });
}

// --- 2. RANKING ---
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

// --- FUNCIONES BASE ---
function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
}

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

function startGame() {
    score = 0; time = 15; multiplier = 1;
    switchScreen('game');
    updateUI();
    gameTimer = setInterval(() => {
        time--;
        updateUI();
        if (time <= 0) endGame();
    }, 1000);
    spawnTimer = setInterval(spawnSkull, 800);
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

    skull.onclick = () => {
        score += 10 * multiplier;
        wallet += 1;
        updateUI();
        if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
        skull.remove();
    };
    get("gameArea").appendChild(skull);
    setTimeout(() => { if(skull) skull.remove(); }, 1200);
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
