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
   // --- BOTONES DE NAVEGACIÓN ---
    if(get("playBtn")) get("playBtn").onclick = startGame;
    if(get("restartBtn")) get("restartBtn").onclick = startGame;
    if(get("rankingBtn")) get("rankingBtn").onclick = showRanking;
    
}; // <--- ESTA LLAVE CIERRA EL WINDOW.ONLOAD

// --- FUNCIONES DE SUPABASE (FUERA DEL ONLOAD) ---

async function loadWallet() {
    if (!currentUser) return;
    const { data } = await client
        .from('scores')
        .select('wallet')
        .eq('name', currentUser.email.split('@')[0])
        .maybeSingle();
        
    if (data) { 
        wallet = data.wallet; 
        if (typeof updateUI === "function") updateUI(); 
    }
}

async function saveScore() {
    if (!currentUser || score === 0) return;
    const { error } = await client
        .from('scores')
        .upsert([
            { 
                name: currentUser.email.split('@')[0], 
                score: score, 
                wallet: wallet 
            }
        ], { onConflict: 'name' });

    if (error) console.error("Error al guardar:", error);
}

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
        list.innerHTML = "";
        if (data.length === 0) {
            list.innerHTML = "<li>No hay puntajes aún</li>";
        } else {
            data.forEach((item, index) => {
                list.innerHTML += `<li>${index + 1}. ${item.name}: ${item.score} pts</li>`;
            });
        }
    }
    
    // Mostramos la pantalla (asegurate de tener este ID en tu HTML/CSS)
    if(get("rankingScreen")) get("rankingScreen").classList.add("active");
}
