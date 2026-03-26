/* =========================
   💀 SKULL TAP PRO - MEGA UPDATE
   Niveles + Logros + Ranking Global
========================= */

const client = window.supabase.createClient(
    "https://thkuxitmdfwthyadcytx.supabase.co",
    "sb_publishable_ifOy7_StfYvwy287J88FSA_l-LseoVd"
);

const get = (id) => document.getElementById(id);
let currentUser = null;

// Variables de Progreso
let score = 0, time = 15, wallet = 0;
let xp = 0, level = 1;
let currentSkin = "var(--neon-magenta)";
let ownedSkins = ["var(--neon-magenta)"];
let unlockedAchievements = [];

// Configuración de Niveles (Cada nivel pide 500 XP más que el anterior)
const getXPForNextLevel = (lvl) => lvl * 500;

// --- 🔄 CARGA DE DATOS EXTENDIDA ---
async function loadUserData() {
    if (!currentUser) return;
    
    const { data } = await client
        .from('scores')
        .select('*')
        .eq('name', currentUser.email.split('@')[0])
        .single();

    if (data) {
        wallet = data.wallet || 0;
        xp = data.xp || 0;
        level = data.level || 1;
        if (data.skins) ownedSkins = data.skins.split(',');
        if (data.achievements) unlockedAchievements = data.achievements.split(',');
        
        updateUI();
        updateShopUI();
        console.log("Perfil cargado: Nivel", level);
    }
}

// --- 🏆 SISTEMA DE LOGROS (Tipo Steam) ---
const ACHIEVEMENTS_LIST = {
    "FIRST_BLOOD": { name: "Primera Sangre", desc: "Aplasta tu primera calavera", req: () => score >= 10 },
    "FAST_FINGERS": { name: "Dedos de Fuego", desc: "Llega a 500 puntos en una partida", req: () => score >= 500 },
    "COLLECTOR": { name: "Coleccionista", desc: "Ten más de 3 skins", req: () => ownedSkins.length >= 3 },
    "RICHLI": { name: "Millonario", desc: "Llega a 1000 en la wallet", req: () => wallet >= 1000 }
};

function checkAchievements() {
    Object.keys(ACHIEVEMENTS_LIST).forEach(key => {
        if (!unlockedAchievements.includes(key) && ACHIEVEMENTS_LIST[key].req()) {
            unlockedAchievements.push(key);
            showAchievementToast(ACHIEVEMENTS_LIST[key].name);
        }
    });
}

function showAchievementToast(name) {
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerHTML = `🏆 <b>Logro Desbloqueado:</b> <br> ${name}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- 📈 SISTEMA DE XP Y NIVELES ---
function addXP(amount) {
    xp += amount;
    let nextXP = getXPForNextLevel(level);
    
    if (xp >= nextXP) {
        level++;
        showLevelUpEffect();
    }
}

function showLevelUpEffect() {
    alert(`✨ ¡SUBISTE AL NIVEL ${level}! ✨`);
}

// --- 💾 GUARDADO GLOBAL ---
async function saveProgress() {
    if (!currentUser) return;
    const userName = currentUser.email.split('@')[0];

    const { data: record } = await client.from('scores').select('score').eq('name', userName).single();
    const topScore = record ? Math.max(record.score, score) : score;

    await client.from('scores').upsert([{ 
        name: userName, 
        score: topScore, 
        wallet: wallet,
        xp: xp,
        level: level,
        skins: ownedSkins.join(','),
        achievements: unlockedAchievements.join(',')
    }], { onConflict: 'name' });
}

// --- 🎮 MOTOR DEL JUEGO MODIFICADO ---
function spawnSkull() {
    const skull = document.createElement("div");
    skull.className = "target";
    skull.innerHTML = "💀";
    skull.style.left = Math.random() * 80 + 5 + "%";
    skull.style.top = Math.random() * 80 + 5 + "%";
    skull.style.filter = `drop-shadow(0 0 10px ${currentSkin})`;

    skull.onclick = (e) => {
        score += 10;
        wallet += 1;
        addXP(20); // 20 XP por calavera
        checkAchievements(); // Validar si ganó un logro
        updateUI();
        createHitEffects(e.clientX, e.clientY);
        skull.remove();
    };
    get("gameArea").appendChild(skull);
    setTimeout(() => { if(skull.parentElement) skull.remove(); }, 1200);
}

function updateUI() {
    if(get("score")) get("score").innerText = score;
    if(get("walletAmount")) get("walletAmount").innerText = wallet;
    // Mostrar nivel en la pantalla principal si quieres
    if(get("userStatus")) {
        const name = currentUser ? currentUser.email.split('@')[0] : "Invitado";
        get("userStatus").innerHTML = `NIVEL ${level} - ${name} <br> XP: ${xp}/${getXPForNextLevel(level)}`;
    }
}

// El resto de funciones (startGame, endGame, buySkin) se mantienen igual, 
// solo asegúrate de llamar a saveProgress() en endGame().
