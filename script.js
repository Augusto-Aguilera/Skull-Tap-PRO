const client = window.supabase.createClient("https://thkuxitmdfwthyadcytx.supabase.co", "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd");

const get = (id) => document.getElementById(id);
let currentUser = null;
let score = 0, time = 15, wallet = 0, multiplier = 1;
let currentSkin = "var(--neon-magenta)"; 
let gameTimer, spawnTimer;

// ESPERAR A QUE CARGUE LA WEB
window.onload = () => {
    
    // AUTH - LOGIN
    if(get("loginBtn")) {
        get("loginBtn").onclick = async () => {
            const email = get("email").value;
            const password = get("password").value;
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            
            if (error) alert("Error: " + error.message);
            else {
                currentUser = data.user;
                get("userStatus").innerText = "Conectado como: " + email.split('@')[0];
                loadWallet();
            }
        };
    }

    // BOTONES DE NAVEGACIÓN
    if(get("playBtn")) get("playBtn").onclick = startGame;
    if(get("restartBtn")) get("restartBtn").onclick = startGame;
};

async function loadWallet() {
    const { data } = await client.from('scores').select('wallet').eq('name', currentUser.email).maybeSingle();
    if (data) { wallet = data.wallet; updateUI(); }
}

// JUEGO
get("playBtn").onclick = startGame;
get("restartBtn").onclick = startGame;

function startGame() {
    score = 0; time = 15; multiplier = 1;
    get("gameArea").innerHTML = "";
    updateUI();
    switchScreen("game");
    
    clearInterval(gameTimer);
    clearInterval(spawnTimer);

    spawnTimer = setInterval(createTarget, 800);
    gameTimer = setInterval(() => {
        time--;
        get("time").innerText = time;
        if (time <= 0) endGame();
    }, 1000);
}

function createTarget() {
    const area = get("gameArea");
    const t = document.createElement("div");
    t.className = "target";
    t.innerHTML = "💀";
    t.style.background = currentSkin;
    t.style.boxShadow = `0 0 20px ${currentSkin}`;
    
    const x = Math.random() * (area.clientWidth - 80);
    const y = Math.random() * (area.clientHeight - 80);
    t.style.left = x + "px";
    t.style.top = y + "px";

    t.onclick = (e) => { e.stopPropagation(); hit(t); };
    area.appendChild(t);
    setTimeout(() => { if(t.parentNode) { t.remove(); multiplier = 1; updateUI(); } }, 1000);
}

function hit(el) {
    get("hitSound").play().catch(()=>{});
    get("gameArea").classList.add("shake");
    setTimeout(() => get("gameArea").classList.remove("shake"), 200);
    
    score += (10 * multiplier);
    multiplier++;
    el.remove();
    updateUI();
}

get("gameArea").onclick = () => { if(get("survivalMode").checked) endGame(); };

function updateUI() {
    get("score").innerText = score;
    get("combo").innerText = "x" + multiplier;
    get("walletAmount").innerText = wallet;
}

function endGame() {
    clearInterval(gameTimer); clearInterval(spawnTimer);
    wallet += score;
    get("finalScore").innerText = score + " pts";
    switchScreen("gameOver");
    if (currentUser) syncSupabase();
}

async function syncSupabase() {
    await client.from("scores").insert([{ name: currentUser.email, score: score }]);
    await client.from("scores").update({ wallet: wallet }).eq('name', currentUser.email);
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = get(id + "Screen");
    if (target) target.classList.add('active');
}

function goHome() { switchScreen("start"); }
