/* =========================
   💀 EXPANSIÓN FINAL FIX
========================= */

/* fallback por si no existe */
if(typeof get === "undefined"){
    function get(id){ return document.getElementById(id); }
}

/* evitar romper si no existe */
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

        const colorMatch = onclick.match(/'(.*?)'/);
        const priceMatch = onclick.match(/,\s*(\d+)/);

        if(!colorMatch || !priceMatch) return;

        const color = colorMatch[1];
        const price = priceMatch[1];

        if(typeof currentSkin !== "undefined" && currentSkin === color){
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
        s.play().catch(()=>{});
    }
}

/* 💥 */
function playUnlockEffect(){
    const e = document.createElement("div");
    e.className = "explosion";
    e.style.left = "50%";
    e.style.top = "50%";
    e.style.background = (typeof currentSkin !== "undefined") ? currentSkin : "#fff";
    document.body.appendChild(e);
    setTimeout(()=>e.remove(),400);
}

/* 🛒 EXTENSIÓN SEGURA */
if(typeof buySkin !== "undefined"){

    const oldBuySkin = buySkin;

    buySkin = function(color, price){

        if(ownedSkins.includes(color)){
            currentSkin = color;
            updateShopUI();
            return;
        }

        if(typeof wallet !== "undefined" && wallet < price){
            alert("No tienes suficientes puntos 💀");
            return;
        }

        wallet -= price;
        ownedSkins.push(color);
        currentSkin = color;

        if(typeof updateUI === "function") updateUI();

        playBuySound();
        playUnlockEffect();

        updateShopUI();
    };
}

/* 🌈 SPAWN SEGURO */
if(typeof spawnSkull !== "undefined"){

    const oldSpawn = spawnSkull;

    spawnSkull = function(){

        const skull = document.createElement("div");
        skull.className = "target"; 
        skull.innerHTML = "💀";

        skull.style.left = Math.random() * 80 + 5 + "%";
        skull.style.top = Math.random() * 80 + 5 + "%";

        if(typeof currentSkin !== "undefined" && currentSkin === "rainbow"){
            skull.style.animation = "rainbowGlow 1s infinite";
        } else if(typeof currentSkin !== "undefined"){
            skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;
        }

        skull.onclick = () => {

            if(typeof score !== "undefined" && typeof multiplier !== "undefined"){
                score += 10 * multiplier;
                multiplier++;
            }

            if(typeof wallet !== "undefined") wallet += 1;

            if(typeof updateUI === "function") updateUI();

            const hit = get("hitSound");
            if(hit){
                hit.currentTime = 0;
                hit.play().catch(()=>{});
            }

            skull.remove();
        };

        const area = get("gameArea");
        if(area) area.appendChild(skull);

        setTimeout(() => { skull.remove(); }, 1200);
    };
}

/* INIT */
window.addEventListener("load", () => {
    applyPricesToShop();
    updateShopUI();
});
