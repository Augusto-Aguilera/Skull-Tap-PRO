const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);

let currentUser = null;
let score = 0, time = 15, wallet = 0, multiplier = 1;
let currentSkin = "var(--neon-magenta)";

let gameTimer, spawnTimer;

/* 🔥 NUEVO: COMBO REAL */
let combo = 1;
let comboTimer;

// --- ESPERAR A QUE CARGUE LA WEB ---
window.onload = () => {
    
    if(get("loginBtn")) {
        get("loginBtn").onclick = async () => {
            const email = get("email").value;
            const password = get("password").value;

            let { data, error } = await client.auth.signInWithPassword({ email, password });

            if (error && (error.message.includes("Invalid login credentials") || error.status === 400)) {
                const { data: signUpData, error: signUpError } = await client.auth.signUp({ email, password });
                if (signUpError) {
                    alert("Error: " + signUpError.message);
                    return;
                }
                alert("¡Cuenta creada! Ya puedes jugar.");
                data = signUpData;
                error = null;
            }

            if (error) {
                alert("Error: " + error.message);
            } else if (data.user) {
                currentUser = data.user;
                get("userStatus").innerText = "Conectado como: " + email.split('@')[0];
                loadWallet();
            }
        };
    }

    if(get("playBtn")) get("playBtn").onclick = startGame;
    if(get("restartBtn")) get("restartBtn").onclick = startGame;
    if(get("rankingBtn")) get("rankingBtn").onclick = showRanking;
}; 

// --- NAVEGACIÓN ---
function goHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("startScreen").classList.add("active");
}

// --- SUPABASE ---
async function loadWallet() {
    if (!currentUser) return;

    const { data } = await client
        .from('scores')
        .select('wallet')
        .eq('name', currentUser.email.split('@')[0])
        .maybeSingle();

    if (data) { 
        wallet = data.wallet; 
        updateUI(); 
    }
}

async function saveScore() {
    if (!currentUser || score === 0) return;

    await client.from('scores').upsert([{ 
        name: currentUser.email.split('@')[0], 
        score: score, 
        wallet: wallet 
    }], { onConflict: 'name' });
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
        list.innerHTML = data.length === 0
            ? "<li>No hay puntajes aún</li>"
            : data.map((item, i) => `<li>${i + 1}. ${item.name}: ${item.score} pts</li>`).join("");
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("rankingScreen").classList.add("active");
}

// --- UI ---
function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
    if(get("combo")) get("combo").innerText = "x" + combo;
}

// --- JUEGO ---
function startGame() {
    score = 0;
    time = 15;
    combo = 1;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("gameScreen").classList.add("active");

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

    /* 🌈 COLORES NEON */
    const colors = ["#00fbff", "#ff00ff", "#00ffcc", "#ffcc00"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    skull.style.textShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
    skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;

    skull.onclick = (e) => {

        /* 💥 EFECTO */
        createEffect(e.clientX, e.clientY, color);

        score += 10 * combo;
        wallet += 1;

        /* 🔥 COMBO */
        combo++;
        clearTimeout(comboTimer);
        comboTimer = setTimeout(() => combo = 1, 1500);

        updateUI();

        const sound = get("hitSound");
        if(sound){
            sound.currentTime = 0;
            sound.play();
        }

        skull.remove();
    };

    get("gameArea").appendChild(skull);
    setTimeout(() => skull.remove(), 1200);
}

/* 💥 EFECTOS VISUALES */
function createEffect(x, y, color){

    const explosion = document.createElement("div");
    explosion.className = "explosion";
    explosion.style.left = x + "px";
    explosion.style.top = y + "px";
    explosion.style.background = color;

    document.body.appendChild(explosion);
    setTimeout(()=> explosion.remove(), 400);

    for(let i=0;i<6;i++){
        const p = document.createElement("div");
        p.className = "particle";

        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.background = color;

        p.style.setProperty("--x",(Math.random()*80-40)+"px");
        p.style.setProperty("--y",(Math.random()*80-40)+"px");

        document.body.appendChild(p);
        setTimeout(()=> p.remove(),600);
    }
}

function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);

    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("gameOverScreen").classList.add("active");

    saveScore();
}
