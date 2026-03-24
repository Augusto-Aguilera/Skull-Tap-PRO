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

            // 1. Intentamos entrar (Login)
            let { data, error } = await client.auth.signInWithPassword({ email, password });

            // 2. Si el usuario no existe, lo creamos (SignUp) automáticamente
            if (error && (error.message.includes("Invalid login credentials") || error.status === 400)) {
                const { data: signUpData, error: signUpError } = await client.auth.signUp({ email, password });
                
                if (signUpError) {
                    alert("Error al registrar: " + signUpError.message);
                    return;

                    if(get("rankingBtn")) get("rankingBtn").onclick = showRanking;
                }
                alert("¡Cuenta creada! Ya puedes jugar.");
                data = signUpData;
                error = null;
            }

            // 3. Si todo salió bien, conectamos al usuario
            if (error) {
                alert("Error: " + error.message);
            } else if (data.user) {
                currentUser = data.user;
                get("userStatus").innerText = "Conectado como: " + email.split('@')[0];
                loadWallet();
            }
        };
   

    // BOTONES DE NAVEGACIÓN
    if(get("playBtn")) get("playBtn").onclick = startGame;
    if(get("restartBtn")) get("restartBtn").onclick = startGame;
    if(get("rankingBtn")) get("rankingBtn").onclick = showRanking;
  };

async function loadWallet() {
    const { data } = await client.from('scores').select('wallet').eq('name', currentUser.email).maybeSingle();
    if (data) { wallet = data.wallet; updateUI(); }


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

async function showRanking() {
    // 1. Buscamos los datos en la tabla 'scores'
    const { data, error } = await client
        .from('scores') 
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error al obtener ranking:", error);
        return;
    }

    // 2. Dibujamos la lista en el HTML
    const list = get("rankingList");
    list.innerHTML = ""; // Limpiamos lo que haya

    if (data.length === 0) {
        list.innerHTML = "<li>No hay puntajes aún</li>";
    } else {
        data.forEach((item, index) => {
            list.innerHTML += `<li>${index + 1}. ${item.name}: ${item.score} pts</li>`;
        });
    }

    async function saveScore() {
    if (!currentUser) return; // Si no estás logueado, no guarda nada

    const { error } = await client
        .from('scores')
        .insert([
            { 
                name: currentUser.email.split('@')[0], 
                score: score, 
                wallet: wallet 
            }
        ]);

    if (error) {
        console.error("Error guardando score:", error);
    } else {
        console.log("Puntaje guardado con éxito!");
    }
}

    // 3. Mostramos la pantalla de ranking
    get("rankingScreen").classList.add("active");
}
