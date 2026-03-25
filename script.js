const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);

let currentUser = null;
let score = 0, time = 15, wallet = 0, multiplier = 1;
let currentSkin = "var(--neon-magenta)";
let gameTimer, spawnTimer;

window.onload = () => {

    if(get("loginBtn")) {
        get("loginBtn").onclick = async () => {
            const email = get("email").value;
            const password = get("password").value;

            let { data, error } = await client.auth.signInWithPassword({ email, password });

            if (error) {
                const { data: signUpData } = await client.auth.signUp({ email, password });
                alert("Cuenta creada automáticamente 👍");
                data = signUpData;
            }

            if (data.user) {
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

function goHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("startScreen").classList.add("active");
}

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
    const { data } = await client
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    const list = get("rankingList");

    list.innerHTML = data.length === 0
        ? "<li>No hay puntajes aún</li>"
        : data.map((item, i) => `<li>${i+1}. ${item.name}: ${item.score}</li>`).join("");

    switchScreen("ranking");
}

function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
}

function startGame() {
    score = 0;
    time = 15;

    switchScreen("game");

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

    skull.onclick = () => {
        score += 10;
        wallet += 1;

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

function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);

    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";

    switchScreen("gameOver");

    saveScore();
}
