# 💀 SKULL TAP PRO - Neon Deathmatch

![Version](https://img.shields.io/badge/version-1.0.0-cyan)
![License](https://img.shields.io/badge/license-MIT-magenta)
![Platform](https://img.shields.io/badge/platform-Mobile%20|%20Web-green)
![Backend](https://img.shields.io/badge/backend-Supabase-blue)

**Skull Tap PRO** es un videojuego de reacción rápida con estética Cyberpunk y Neón desarrollado íntegramente con tecnologías web modernas. Desafía tus reflejos eliminando objetivos antes de que el tiempo se agote en una experiencia de alta intensidad técnica y visual.

---

## 🚀 Experiencia de Juego (Gameplay)
- **🕹️ Mecánica de Precisión:** Sistema de "tap" optimizado para latencia mínima en dispositivos móviles y desktop.
- **💀 Modo Hardcore (Permadeath):** Algoritmo de supervivencia donde un solo click al vacío termina la partida, exigiendo precisión absoluta.
- **🔥 Motor de Combos:** Lógica matemática implementada en JS para multiplicar el score basado en rachas de aciertos consecutivos.
- **🛒 Sistema de Economía:** Tienda funcional (Store) para canjear puntos acumulados por skins exclusivas (Oro, Cyan, Magenta).
- **✨ Feedback Visual:** Sistema de partículas dinámicas de explosión y efectos de *Screen Shake* (sacudida) para potenciar el "game feel".

---

## 🛠️ Stack Tecnológico & Arquitectura
- **Frontend:** HTML5 semántico y CSS3 avanzado (Animaciones `@keyframes`, Flexbox y CSS Grid).
- **Lógica de Juego:** **JavaScript Vanilla** (Manejo de intervalos de tiempo, detección de colisiones y gestión de estados asíncronos).
- **Backend as a Service (BaaS):** **[Supabase](https://supabase.com/)** para la persistencia de datos y autenticación de usuarios.
- **Base de Datos:** **PostgreSQL** (Gestión de Ranking Global y perfiles de usuario en tiempo real).
- **Despliegue:** GitHub Pages.

---

## 🏆 Ranking Global & Persistencia
A diferencia de un juego estático convencional, **Skull Tap PRO** utiliza una arquitectura conectada a la nube. Esto permite:
1. **Leaderboard Real-time:** Almacenamiento y recuperación de las mejores puntuaciones globales desde una base de datos externa.
2. **Seguridad de Datos:** Las puntuaciones se envían y validan para mantener la integridad del ranking.
3. **Gestión de Inventario:** Persistencia de las skins adquiridas, vinculadas directamente al perfil del usuario mediante sesiones.

---

## 📦 Instalación Local
Si quieres explorar el código o contribuir al desarrollo:

1. Clona este repositorio:
   ```bash
   git clone [https://github.com/Augusto-Aguilera/Skull-Tap-PRO.git](https://github.com/Augusto-Aguilera/Skull-Tap-PRO.git)
