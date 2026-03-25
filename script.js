/* =========================
   💀 EXPANSIÓN FINAL
========================= */

if(typeof ownedSkins === "undefined"){
    var ownedSkins = ["var(--neon-magenta)"];
}

/* 💰 precios */
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

/* 🎨 UI */
function updateShopUI(){
    const buttons = document.querySelectorAll(".shop-grid button");

    buttons.forEach(btn => {

        const onclick = btn.getAttribute("onclick");
        if(!onclick) return;

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

/* 🔊 */
function playBuySound(){
    const s = get("buySound");
    if(s){
        s.currentTime = 0;
        s.play();
    }
}

/* 💥 */
function playUnlockEffect(){
    const e = document.createElement("div");
    e.className = "explosion";
    e.style.left = "50%";
    e.style.top = "50%";
    e.style.background = currentSkin;
    document.body.appendChild(e);
    setTimeout(()=>e.remove(),400);
}

/* 🛒 */
const oldBuySkin = buySkin;

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

/* 🌈 spawn extendido */
const oldSpawn = spawnSkull;

spawnSkull = function(){

    const skull = document.createElement("div");
    skull.className = "target"; 
    skull.innerHTML = "💀";

    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";

    if(currentSkin === "rainbow"){
        skull.style.animation = "rainbowGlow 1s infinite";
    } else {
        skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
    }

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
};

window.addEventListener("load", () => {
    applyPricesToShop();
    updateShopUI();
});
