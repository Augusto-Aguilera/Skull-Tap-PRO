const get=id=>document.getElementById(id);

let score=0,time=15,combo=1;
let spawnRate=700;
let gameTimer,spawnTimer,comboTimer;

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
spawnRate=700;

switchScreen("game");
updateUI();

gameTimer=setInterval(()=>{
time--;
updateUI();
if(time<=0)endGame();
},1000);

spawnTimer=setInterval(spawnEnemy,spawnRate);
}

function spawnEnemy(){
const isBoss=Math.random()<0.1;

const skull=document.createElement("div");
skull.className="target";
if(isBoss) skull.classList.add("boss");

skull.innerHTML="💀";

const colors=["#0ff","#f0f","#0f0","#ff0"];
const color=colors[Math.floor(Math.random()*colors.length)];

skull.style.textShadow=`0 0 15px ${color}`;

skull.style.left=Math.random()*85+"%";
skull.style.top=Math.random()*85+"%";

skull.onclick=(e)=>{

hitEffect(e.clientX,e.clientY,color);

/* puntos */
score+=isBoss ? 50*combo : 10*combo;

/* combo */
combo++;
clearTimeout(comboTimer);
comboTimer=setTimeout(()=>combo=1,1500);

/* sonido */
let sound = combo > 5 ? get("hit2") : get("hit1");
sound.currentTime=0;
sound.play();

/* vibracion */
get("gameArea").classList.add("shake");
setTimeout(()=>get("gameArea").classList.remove("shake"),200);

/* dificultad progresiva */
if(get("survivalMode").checked){
spawnRate*=0.98;
clearInterval(spawnTimer);
spawnTimer=setInterval(spawnEnemy,spawnRate);
}

updateUI();
skull.remove();
};

get("gameArea").appendChild(skull);
setTimeout(()=>skull.remove(),1200);
}

function hitEffect(x,y,color){

const explosion=document.createElement("div");
explosion.className="explosion";
explosion.style.left=x+"px";
explosion.style.top=y+"px";
explosion.style.background=color;

document.body.appendChild(explosion);
setTimeout(()=>explosion.remove(),400);

/* partículas optimizadas */
for(let i=0;i<5;i++){
const p=document.createElement("div");
p.className="particle";

p.style.left=x+"px";
p.style.top=y+"px";
p.style.background=color;

p.style.setProperty("--x",(Math.random()*80-40)+"px");
p.style.setProperty("--y",(Math.random()*80-40)+"px");

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
