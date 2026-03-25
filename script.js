const client = window.supabase.createClient("https://thkuxitmdfwthyadcytx.supabase.co", "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd");

const get = (id) => document.getElementById(id);

let currentUser = null;
let score = 0, time = 15, wallet = 0, multiplier = 1;
let currentSkin = "var(--neon-magenta)"; 
let gameTimer, spawnTimer;

/* =========================
   💀 SISTEMA PRO DE SKINS
========================= */

let ownedSkins = ["var(--neon-magenta)"];

function applyPricesToShop(){
    const buttons = document.querySelectorAll(".shop-grid button");

    buttons.forEach(btn => {
        const onclick = btn.getAttribute("onclick");
        if(!onclick) return;

        const match = onclick.match(/,\s*(\d+)/);
        if(!match) return;

        const price = match[1];

        if(!btn.innerText.includes("(")){
            btn.innerText += price == 0 ? " (FREE)" : ` (${price})`;
        }
    });
}

function updateShopUI(){

    const buttons = document.querySelectorAll(".shop-grid button");

    buttons.forEach(btn => {

        const onclick = btn.getAttribute("onclick");
        if(!onclick) return;

        const colorMatch = onclick.match(/'(.*?)'/);
        const priceMatch = onclick.match(/,\s*(\d+)/);

        if(!colorMatch || !priceMatch) return;

        const color = colorMatch[1];
        const price = parseInt(priceMatch[1]);

        if(currentSkin === color){
            btn.innerText = "EQUIPADO";
            btn.style.background = color;
            btn.style.color = "black";
        }
        else if(ownedSkins.includes(color)){
            btn.innerText = "USAR";
            btn.style.background = "none";
            btn.style.color = "white";
        }
        else{
            btn.innerText = price === 0 ? "COMPRAR (FREE)" : `COMPRAR (${price})`;
        }
    });
}

function playUnlockEffect(x = window.innerWidth/2, y = window.innerHeight/2){

    const effect = document.createElement("div");
    effect.className = "explosion";
    effect.style.left = x + "px";
    effect.style.top = y + "px";
    effect.style.background = currentSkin;

    document.body.appendChild(effect);

    setTimeout(() => effect.remove(), 400);
}

function playBuySound(){
    const s = get("buySound");
    if(s){
        s.currentTime = 0;
        s.play();
    }
}

/* --- ESPERAR CARGA --- */
window.onload = () => {

    applyPricesToShop();
    updateShopUI();

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
                alert("¡Cuenta creada!");
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

/* --- NAV --- */
function goHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("startScreen").classList.add("active");
}

/* --- SUPABASE --- */
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

/* --- UI --- */
function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("time")) get("time").innerText = time;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
    if(get("combo")) get("combo").innerText = "x" + multiplier;
}

/* --- JUEGO --- */
function startGame() {
    score = 0;
    time = 15;
    multiplier = 1;

    updateShopUI();

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
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;

    skull.onclick = () => {

        score += 10 * multiplier;
        wallet += 1;
        multiplier++;

        updateUI();

        if(get("hitSound")){
            get("hitSound").currentTime = 0;
            get("hitSound").play();
        }

        skull.remove();
    };

    get("gameArea").appendChild(skull);
    setTimeout(() => { if(skull) skull.remove(); }, 1200);
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

/* --- REEMPLAZO SEGURO --- */
const originalBuySkin = buySkin;

buySkin = function(color, price){

    if(ownedSkins.includes(color)){
        currentSkin = color;
        updateShopUI();
        return;
    }

    if(wallet < price){
        alert("No tienes suficientes puntos 💀");
        return;
    }

    wallet -= price;
    ownedSkins.push(color);
    currentSkin = color;

    updateUI();

    playBuySound();
    playUnlockEffect();

    updateShopUI();
};
