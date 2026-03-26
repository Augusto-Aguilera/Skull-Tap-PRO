
/* =========================
   💀 BASE + EXPANSIÓN FINAL
========================= */

/* helper */
function get(id){ return document.getElementById(id); }

/* =========================
   🔐 SUPABASE
========================= */

const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

let currentUser = null;

/* =========================
   🎮 GAME STATE
========================= */

let score = 0, time = 15, wallet = 0, multiplier = 1;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];

/* =========================
   💾 LOAD / SAVE
========================= */

async function loadProfile(){
    if(!currentUser) return;

    const name = currentUser.email.split("@")[0];

    const { data } = await client
        .from("profiles")
        .select("*")
        .eq("name", name)
        .maybeSingle();

    if(data){
        wallet = data.wallet || 0;
        ownedSkins = data.skins ? JSON.parse(data.skins) : ownedSkins;
    }

    updateUI();
    updateShopUI();
}

async function saveProfile(){
    if(!currentUser) return;

    const name = currentUser.email.split("@")[0];

    await client.from("profiles").upsert([{
        name: name,
        wallet: wallet,
        skins: JSON.stringify(ownedSkins)
    }]);
}

/* =========================
   🔐 LOGIN
========================= */

window.addEventListener("load", () => {

    get("loginBtn").onclick = async () => {

        const email = get("email").value;
        const password = get("password").value;

        const { data, error } = await client.auth.signInWithPassword({
            email, password
        });

        if(error){
            alert(error.message);
            return;
        }

        currentUser = data.user;
        get("userStatus").innerText = "Conectado como: " + email.split("@")[0];

        loadProfile();
    };

    get("registerBtn").onclick = async () => {

        const email = get("email").value;
        const password = get("password").value;

        const { error } = await client.auth.signUp({
            email, password
        });

        if(error){
            alert(error.message);
        } else {
            alert("Cuenta creada 💀");
        }
    };

});

/* =========================
   💰 SHOP
========================= */

function updateShopUI(){
    document.querySelectorAll(".shop-grid button").forEach(btn => {

        const onclick = btn.getAttribute("onclick");
        const color = onclick.match(/'(.*?)'/)[1];
        const price = onclick.match(/,\s*(\d+)/)[1];

        if(currentSkin === color){
            btn.innerText = "EQUIPADO";
        }
        else if(ownedSkins.includes(color)){
            btn.innerText = "USAR";
        }
        else{
            btn.innerText = `COMPRAR (${price})`;
        }
    });
}

function buySkin(color, price){

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
    updateShopUI();

    get("buySound").play();

    saveProfile(); // 💾 GUARDA
}

/* =========================
   🎮 GAME
========================= */

function updateUI(){
    get("score").innerText = score;
    get("time").innerText = time;
    get("walletAmount").innerText = wallet;
}

function startGame(){
    score = 0;
    time = 15;
    multiplier = 1;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("gameScreen").classList.add("active");

    updateUI();

    gameTimer = setInterval(()=>{
        time--;
        updateUI();
        if(time <= 0) endGame();
    },1000);

    spawnTimer = setInterval(spawnSkull,800);
}

function spawnSkull(){

    const skull = document.createElement("div");
    skull.className = "target";
    skull.innerHTML = "💀";

    skull.style.left = Math.random()*80+5+"%";
    skull.style.top = Math.random()*80+5+"%";

    if(currentSkin === "rainbow"){
        skull.style.animation = "rainbowGlow 1s infinite";
    } else {
        skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }

    skull.onclick = ()=>{
        score += 10 * multiplier;
        wallet += 1;
        multiplier++;

        updateUI();

        get("hitSound").currentTime = 0;
        get("hitSound").play();

        skull.remove();
    };

    get("gameArea").appendChild(skull);

    setTimeout(()=>skull.remove(),1200);
}

function endGame(){
    clearInterval(gameTimer);
    clearInterval(spawnTimer);

    get("gameArea").innerHTML = "";
    get("finalScore").innerText = score + " pts";

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get("gameOverScreen").classList.add("active");

    saveProfile(); // 💾 GUARDA
}

/* =========================
   🧭 NAV
========================= */

function goTo(id){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    get(id).classList.add("active");
}

function goHome(){
    goTo("startScreen");
}

/* INIT */
window.addEventListener("load", ()=>{
    updateShopUI();
});
