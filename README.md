# 🔬 TTT Futures Lab — Trading Zone

**Engineers of Time Levels Theorem**

App de trading que reúne:
- 📊 **Dashboard** de cuentas activas en TopOne, Tradeify, MyFundedFutures
- 📸 **Captura → Claude Vision** lee tu dashboard y extrae balance, PnL, DD automáticamente
- 📚 **Normas vigentes** de cada prop firm, refrescadas diariamente por Claude
- 💬 **Chat** con asistente experto en ICT y prop firms
- 📈 **Histórico** completo de snapshots

## 🛠 Stack

- **Frontend:** React + Vite (PWA instalable en iPhone)
- **Backend:** Node.js + Express
- **BD:** PostgreSQL (Railway)
- **IA:** Anthropic Claude (Sonnet 4.6 con Vision + Web Search)
- **Hosting:** Railway con CI/CD desde GitHub

## 🚀 Despliegue en Railway

### 1. Crear el repo en GitHub
```bash
cd ttt-futures-lab
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ttt-futures-lab.git
git push -u origin main
```

### 2. En Railway:
1. Crear proyecto nuevo desde GitHub repo
2. Añadir servicio PostgreSQL al proyecto (Railway lo conectará automáticamente con la variable `DATABASE_URL`)
3. En el servicio web, configurar variables de entorno:
   - `ANTHROPIC_API_KEY` = tu API key de Anthropic
   - `NODE_ENV` = `production`
4. Desplegar — Railway detectará `nixpacks.toml` y ejecutará migración + start automáticamente

### 3. Configurar dominio
- En Railway → Settings → Generate Domain
- Quedará: `ttt-futures-lab.up.railway.app`

## 🧪 Desarrollo local

```bash
# 1. Crear PostgreSQL local o usar la URL de Railway
cp .env.example .env
# Editar .env con tus valores

# 2. Backend
cd backend
npm install
npm run migrate
npm run dev

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

Frontend en `http://localhost:5173`, backend en `http://localhost:3000`.

## 📱 Instalar como PWA en iPhone

1. Abrir `ttt-futures-lab.up.railway.app` en Safari
2. Botón compartir → "Añadir a pantalla de inicio"
3. La app aparecerá como icono nativo

## 🔄 Refresh diario de normas

Cron programado a las **08:00 hora de Madrid**:
- Claude busca en webs oficiales de Tradeify, TopOne, MFFU
- Compara contra normas almacenadas
- Detecta cambios y los guarda en `rule_changes`
- En el panel de Normas verás avisos amarillos de cambios recientes

## 🗃 Estructura

```
ttt-futures-lab/
├── frontend/          React + Vite
│   ├── src/
│   │   ├── components/    SplashScreen, AppHeader
│   │   ├── pages/         Dashboard, Upload, Rules, Chat, History
│   │   ├── lib/api.js     Cliente HTTP
│   │   └── styles/        CSS global retro plateado
├── backend/           Express + Postgres
│   ├── src/
│   │   ├── routes/        accounts, vision, rules, chat, snapshots
│   │   ├── services/      claude, vision, rulesRefresh (cron)
│   │   └── db/            pool + migrate
│   └── migrations/        Schema PostgreSQL
└── railway.json + nixpacks.toml
```

## 🎨 Estética

Diseño retro-futurista plateado/negro inspirado en instrumentos de precisión:
- Splash con reloj mecánico + microscopio + grid blueprint
- Header permanente con mini-reloj en tiempo real
- Paleta: negro profundo + plateado + acentos verde/rojo para PnL
- Animaciones suaves de parallax y partículas flotantes
