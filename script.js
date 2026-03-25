const get = id => document.getElementById(id);

let score = 0;
let wallet = 0;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];

function switchScreen(id){
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    get(id).classList.add("active");
}

function goHome(){
    switchScreen("startScreen");
}

function startGame(){
    switchScreen("gameScreen");
    spawnLoop();
}

get("playBtn").onclick = startGame;

/* 🎮 SPAWN */
function spawnLoop(){
    setInterval(spawnSkull, 800);
}

function spawnSkull(){
    const skull = document.createElement("div");
    skull.className = "target";
    skull.innerHTML = "💀";

    skull.style.left = Math.random()*250 + "px";
    skull.style.top = Math.random()*250 + "px";

    if(currentSkin === "rainbow"){
        skull.style.animation = "rainbowGlow 1s infinite";
    } else {
        skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }

    skull.onclick = () => {
        score += 10;
        wallet += 1;

        get("score").innerText = score;
        get("walletAmount").innerText = wallet;

        playHit();
        skull.remove();
    };

    get("gameArea").appendChild(skull);
    setTimeout(()=>skull.remove(),1000);
}

/* 🔊 */
function playHit(){
    const s = get("hitSound");
    s.currentTime = 0;
    s.play();
}

function playBuy(){
    const s = get("buySound");
    s.currentTime = 0;
    s.play();
}

/* 💥 */
function explode(x,y){
    const e = document.createElement("div");
    e.className="explosion";
    e.style.left=x+"px";
    e.style.top=y+"px";
    e.style.background=currentSkin;
    document.body.appendChild(e);
    setTimeout(()=>e.remove(),400);
}

/* 🛒 */
function buySkin(color, price){

    if(ownedSkins.includes(color)){
        currentSkin = color;
        updateShop();
        return;
    }

    if(wallet < price){
        alert("No tienes dinero 💀");
        return;
    }

    wallet -= price;
    ownedSkins.push(color);
    currentSkin = color;

    get("walletAmount").innerText = wallet;

    playBuy();
    explode(window.innerWidth/2, window.innerHeight/2);

    updateShop();
}

/* 🧠 */
function updateShop(){
    const btns = document.querySelectorAll(".shop-grid button");

    btns.forEach(btn=>{
        const txt = btn.getAttribute("onclick");
        const color = txt.match(/'(.*?)'/)[1];
        const price = txt.match(/,\s*(\d+)/)[1];

        if(currentSkin === color){
            btn.innerText = "EQUIPADO";
        } else if(ownedSkins.includes(color)){
            btn.innerText = "USAR";
        } else {
            btn.innerText = `COMPRAR (${price})`;
        }
    });
}

updateShop();
