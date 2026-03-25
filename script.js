const client = window.supabase.createClient("https://thkuxitmdfwthyadcytx.supabase.co", "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd");

const get = (id) => document.getElementById(id);
let currentUser = null;
let score = 0, time = 15, wallet = 0, multiplier = 1;
let currentSkin = "var(--neon-magenta)"; 
let gameTimer, spawnTimer;

// --- ESPERAR A QUE CARGUE LA WEB ---
window.onload = () => {
    
    // AUTH - LOGIN
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

    // --- BOTONES DE NAVEGACIÓN ---
    if(get("playBtn")) get("playBtn").onclick = startGame;
    if(get("restartBtn")) get("restartBtn").onclick = startGame;
    if(get("rankingBtn")) get("rankingBtn").onclick = showRanking;
}; 

// --- FUNCIONES DE NAVEGACIÓN ---
function goHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("startScreen").classList.add("active");
}

// --- FUNCIONES DE SUPABASE ---
async function loadWallet() {
    if (!currentUser) return;
    const { data } = await client.from('scores').select('wallet').eq('name', currentUser.email.split('@')[0]).maybeSingle();
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
    const { data, error } = await client.from('scores').select('*').order('score', { ascending: false }).limit(10);
    if (error) return;

    const list = get("rankingList");
    if (list) {
        list.innerHTML = data.length === 0 ? "<li>No hay puntajes aún</li>" : 
            data.map((item, i) => `<li>${i + 1}. ${item.name}: ${item.score} pts</li>`).join("");
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("rankingScreen").classList.add("active");
}

// --- LÓGICA DEL JUEGO ---
function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
}

function startGame() {
    score = 0;
    time = 15;
    
    // Cambiar pantallas usando clases (como dicta tu CSS)
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
    // Usamos la clase 'target' que ya tienes en tu CSS para que se vea bien
    skull.className = "target"; 
    skull.innerHTML = "💀";
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    
    // Si tienes un color de skin guardado, lo aplicamos
    skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;

    skull.onclick = () => {
        score += 10 * multiplier;
        wallet += 1;
        updateUI();
        if(get("hitSound")) get("hitSound").currentTime = 0;
        if(get("hitSound")) get("hitSound").play();
        skull.remove();
    };

    get("gameArea").appendChild(skull);
    setTimeout(() => { if(skull) skull.remove(); }, 1200);
}

function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    get("gameArea").innerHTML = ""; // Limpiar calaveras sobrantes
    get("finalScore").innerText = score + " pts";
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("gameOverScreen").classList.add("active");
    
    saveScore();
}
