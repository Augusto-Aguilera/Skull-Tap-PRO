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
                    alert("Error al registrar: " + signUpError.message);
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
    if(get("closeRanking")) get("closeRanking").onclick = () => get("rankingScreen").classList.remove("active");
}; 

// --- FUNCIONES DE SUPABASE ---

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
    const { error } = await client
        .from('scores')
        .upsert([{ 
            name: currentUser.email.split('@')[0], 
            score: score, 
            wallet: wallet 
        }], { onConflict: 'name' });

    if (error) console.error("Error al guardar:", error);
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
    get("rankingScreen").classList.add("active");
}

// --- LÓGICA DEL JUEGO (RESTAURADA) ---

function updateUI() {
    get("scoreDisplay").innerText = score;
    get("timeDisplay").innerText = time;
    get("walletDisplay").innerText = wallet;
}

function startGame() {
    score = 0;
    time = 15;
    get("menuScreen").style.display = "none";
    get("gameScreen").style.display = "block";
    get("gameOverScreen").classList.remove("active");
    updateUI();

    gameTimer = setInterval(() => {
        time--;
        get("timeDisplay").innerText = time;
        if (time <= 0) endGame();
    }, 1000);

    spawnTimer = setInterval(spawnSkull, 800);
}

function spawnSkull() {
    const skull = document.createElement("div");
    skull.className = "skull";
    skull.style.left = Math.random() * 80 + 10 + "%";
    skull.style.top = Math.random() * 80 + 10 + "%";
    skull.style.backgroundColor = currentSkin;

    skull.onclick = () => {
        score += 10 * multiplier;
        wallet += 1;
        updateUI();
        skull.remove();
    };

    get("gameScreen").appendChild(skull);
    setTimeout(() => skull.remove(), 1500);
}

function endGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    document.querySelectorAll(".skull").forEach(s => s.remove());
    get("finalScore").innerText = score;
    get("gameOverScreen").classList.add("active");
    saveScore(); // Guardamos en Supabase al terminar
}
