const get=id=>document.getElementById(id);

let score=0,time=15;
let combo=1;
let comboTimer;

let gameTimer,spawnTimer;

window.onload=()=>{
get("playBtn").onclick=startGame;
get("restartBtn").onclick=startGame;
};

function switchScreen(id){
document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
get(id+"Screen").classList.add("active");
}

function startGame(){
score=0;
time=15;
combo=1;

switchScreen("game");
updateUI();

gameTimer=setInterval(()=>{
time--;
updateUI();
if(time<=0)endGame();
},1000);

spawnTimer=setInterval(spawnSkull,700);
}

function spawnSkull(){
const skull=document.createElement("div");
skull.className="target";
skull.innerHTML="💀";

/* 🌈 COLOR NEON RANDOM */
const colors=["#00fff7","#ff00ff","#00ff00","#ffcc00"];
const color=colors[Math.floor(Math.random()*colors.length)];
skull.style.textShadow=`0 0 10px ${color},0 0 20px ${color}`;

skull.style.left=Math.random()*90+"%";
skull.style.top=Math.random()*90+"%";

skull.onclick=(e)=>{
hitEffect(e.clientX,e.clientY,color);

score+=10*combo;

/* 🔥 COMBO REAL */
combo++;
clearTimeout(comboTimer);
comboTimer=setTimeout(()=>combo=1,1500);

updateUI();
skull.remove();
};

get("gameArea").appendChild(skull);

setTimeout(()=>skull.remove(),1200);
}

/* 💥 EFECTO EXPLOSION + PARTICULAS */
function hitEffect(x,y,color){

const explosion=document.createElement("div");
explosion.className="explosion";
explosion.style.left=x+"px";
explosion.style.top=y+"px";
explosion.style.background=color;

document.body.appendChild(explosion);

setTimeout(()=>explosion.remove(),400);

/* partículas */
for(let i=0;i<8;i++){
const p=document.createElement("div");
p.className="particle";
p.style.left=x+"px";
p.style.top=y+"px";
p.style.background=color;

p.style.setProperty("--x",(Math.random()*100-50)+"px");
p.style.setProperty("--y",(Math.random()*100-50)+"px");

document.body.appendChild(p);
setTimeout(()=>p.remove(),600);
}
}

function updateUI(){
get("score").innerText=score;
get("time").innerText=time;
get("combo").innerText="x"+combo;
}

function endGame(){
clearInterval(gameTimer);
clearInterval(spawnTimer);

get("finalScore").innerText=score+" pts";
switchScreen("gameOver");
}
