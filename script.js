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

// MEJORAS: Dificultad y Combo
let spawnRate = 800;
let combo = 1;

// --- TIENDA Y RANKING ---
function updateShopUI() {
    const buttons = document.querySelectorAll(".shop-grid button");
    buttons.forEach(btn => {
        const onclick = btn.getAttribute("onclick");
        if(!onclick) return;
        const colorMatch = onclick.match(/'(.*?)'/);
        if(!colorMatch) return;
        const color = colorMatch[1];
        if(!btn.dataset.originalName) btn.dataset.originalName = btn.innerText.split('(')[0].trim();

        if(currentSkin === color) {
            btn.innerText = `${btn.dataset.originalName} (EQUIPADO)`;
        } else if(ownedSkins.includes(color)) {
            btn.innerText = `${btn.dataset.originalName} (USAR)`;
        } else {
            const priceMatch = onclick.match(/,\s*(\d+)/);
            btn.innerText = `${btn.dataset.originalName} (${priceMatch ? priceMatch[1] : 0})`;
        }
    });
}

async function showRanking() {
    const { data, error } = await client.from('scores').select('*').order('score', { ascending: false }).limit(10);
    if (!error) {
        const list = get("rankingList");
        list.innerHTML = data.map((item, i) => `<li>${i + 1}. ${item.name}: ${item.score} pts</li>`).join("");
    }
    switchScreen('ranking');
}

// --- LÓGICA DE JUEGO ---
function updateUI() {
    get("score").innerText = score;
    get("time").innerText = time;
    get("walletAmount").innerText = wallet;
    if(get("combo")) get("combo").innerText = "x" + combo;
}

function startGame() {
    score = 0; time = 15; combo = 1; spawnRate = 800;
    switchScreen('game');
    updateUI();
    gameTimer = setInterval(() => {
        time--;
        updateUI();
        if (time <= 0) endGame();
    }, 1000);
    spawnTimer = setInterval(spawnSkull, spawnRate);
}

function createExplosion(x, y, color) {
    const ex = document.createElement("div");
    ex.className = "explosion-fx";
    ex.style.left = x + "px"; ex.style.top = y + "px";
    ex.style.background = color;
    ex.style.boxShadow = `0 0 15px ${color}`;
    document.body.appendChild(ex);
    setTimeout(() => ex.remove(), 400);
}

function spawnSkull() {
    const skull = document.createElement("div");
    skull.className = "target";
    skull.innerHTML = "💀";
    
    // MEJORA: Colores Neón Aleatorios
    const colors = ["#00fbff", "#ff00ff", "#00ffcc", "#ffcc00", "#ff3300"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    skull.style.color = randomColor;
    skull.style.filter = `drop-shadow(0 0 10px ${randomColor})`;

    skull.onclick = (e) => {
        // MEJORA: Multiplicador Progresivo
        score += (10 * combo);
        wallet += 1;
        combo++;
        
        // MEJORA: Dificultad Progresiva (acelera cada 10 calaveras)
        if(combo % 10 === 0 && spawnRate > 300) {
            spawnRate -= 50;
            clearInterval(spawnTimer);
            spawnTimer = setInterval(spawnSkull, spawnRate);
        }

        updateUI();
        createExplosion(e.clientX, e.clientY, randomColor);
        if(get("hitSound")) { get("hitSound").currentTime = 0; get("hitSound").play(); }
        skull.remove();
    };

    get("gameArea").appendChild(skull);
    setTimeout(() => { 
        if(skull.parentElement) {
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
        score: score, wallet: wallet 
    }], { onConflict: 'name' });
}

async function buySkin(color, price) {
    if(ownedSkins.includes(color)) { currentSkin = color; updateShopUI(); return; }
    if(wallet < price) { alert("Puntos insuficientes 💀"); return; }
    wallet -= price; ownedSkins.push(color); currentSkin = color;
    updateUI(); updateShopUI();
    if(get("buySound")) get("buySound").play();
}

function goHome() { switchScreen('start'); }

window.onload = () => {
    updateShopUI();
    get("playBtn").onclick = startGame;
    get("restartBtn").onclick = startGame;
    get("rankingBtn").onclick = showRanking;
    get("loginBtn").onclick = async () => {
        const email = get("email").value;
        const pass = get("password").value;
        const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
        if (data.user) {
            currentUser = data.user;
            get("userStatus").innerText = "Conectado: " + email.split("@")[0];
        }
    };
};
