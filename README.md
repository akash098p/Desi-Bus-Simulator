# 🚌 Desi Bus Simulator

A fun 3D Indian-style bus driving simulator built with **React Three Fiber** and **Three.js**. Drive your colorful Mumbai Express bus 2 kilometers down a scenic Indian highway, navigate through traffic, and park safely in the marked zone!

![Game](https://img.shields.io/badge/Game-3D%20Simulator-orange)
![React](https://img.shields.io/badge/React-19-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.176-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🎮 Features

### Gameplay
- **2 km highway drive** with realistic heavy bus physics (slow acceleration, inertia, speed-sensitive steering)
- **Parking challenge** — park the bus in the marked zone (under 5 km/h) to win
- **Traffic system** — trucks, cars, and auto-rickshaws moving in both directions
- **Speed breakers, zebra crossings, potholes** along the road
- **Distance tracker** — live readout of meters traveled + meters remaining
- **Automatic gear shifting** (1-6 based on speed)

### Visuals
- **Colorful Indian-style bus** — decorated livery, horn decals, roof luggage rack, detailed wheels
- **Modern National Highway** — asphalt texture, white edge lines, road arrows, guardrails, reflectors, rumble strips
- **Realistic trees** — tapered trunks, root flares, multi-clump foliage
- **Realistic buildings** — windows on all sides, balconies, AC units, rooftop water tanks, doors
- **Roadside props** — chai stalls, billboards, power poles, parked autos, pedestrians
- **Daytime lighting** — warm Indian sun with ambient + directional lighting

### Cockpit & HUD
- **Third-person camera** — behind and above the bus
- **Cockpit camera** — driver's POV with wide FOV, clear windshield view
- **Realistic dashboard** — speedometer, RPM gauge, temperature gauge, gear indicator, warning lights, steering wheel with horn
- **Mini-map** — top-left, shows bus position and parking target
- **Compass arrow** — points toward the parking spot
- **Media player** — embedded music player with playlist support
- **Speed warnings** — visual alerts when exceeding 80 km/h

### Audio
- Engine sounds (idle, revving, pitch changes with speed)
- Horn 📯
- Brake hiss
- Success jingle

---

## 🕹️ Controls

| Key(s) | Action |
|--------|--------|
| **W / ↑** | Accelerate |
| **S / ↓** | Brake / Reverse |
| **A / ←** | Steer Left |
| **D / →** | Steer Right |
| **SPACE** | Horn 📯 |
| **C** | Toggle Camera (Third-Person ↔ Cockpit) |
| **R** | Reset Game |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 16.0.0
- **pnpm** >= 7.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/desi-bus-simulator.git
cd desi-bus-simulator

# Install dependencies
pnpm install
```

### Running the Game

**Option 1: Quick Start (Windows)**
Double-click `start-game.bat` — it launches the dev server and opens the game in your browser.

**Option 2: Manual**
```bash
cd src/frontend
pnpm install
npx vite --host
```
Then open `http://localhost:5173/` in your browser.

### Building for Production

```bash
# From project root
pnpm build

# Or from frontend directory
cd src/frontend
pnpm build
```

The production build will be in `src/frontend/dist/`.

---

## 📁 Project Structure

```
desi-bus-simulator/
├── src/
│   ├── backend/          # Motoko backend (Internet Computer)
│   │   ├── main.mo       # Backend canister code
│   │   └── system-idl/   # System interface definitions
│   └── frontend/         # React + Three.js frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── game/     # Game components
│       │   │   │   ├── Bus.tsx           # Bus model + physics
│       │   │   │   ├── Road.tsx          # Road + highway elements
│       │   │   │   ├── Environment.tsx   # Trees, buildings, traffic
│       │   │   │   ├── ParkingSpot.tsx   # Parking zone
│       │   │   │   ├── HUD.tsx           # Heads-up display
│       │   │   │   ├── CockpitOverlay.tsx # Cockpit dashboard
│       │   │   │   ├── StartScreen.tsx   # Start menu
│       │   │   │   ├── SuccessScreen.tsx # Win screen + leaderboard
│       │   │   │   └── MusicPlayer.tsx   # Music player UI
│       │   │   └── ui/       # UI components
│       │   ├── store/        # Zustand state management
│       │   └── utils/        # Utilities (sound, music)
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── scripts/               # Build utilities
├── start-game.bat         # Windows quick-start
├── package.json
└── pnpm-workspace.yaml
```

---

## 🧰 Tech Stack

- **React 19** — UI framework
- **React Three Fiber 9** — Three.js renderer for React
- **Three.js 0.176** — 3D graphics engine
- **Zustand 5** — State management
- **TypeScript 5.8** — Type safety
- **Vite 5** — Build tool
- **Tailwind CSS 3** — Styling
- **Motoko** — Backend canister (Internet Computer)

---

## 🏆 How to Win

1. Press **START GAME!** on the start screen
2. Drive forward (W/↑) toward the parking spot (follow the compass arrow)
3. Watch your speed — don't exceed 80 km/h (warning appears)
4. When you see the blinking parking zone (🅿️), slow down
5. Park the bus inside the marked box at **under 5 km/h**
6. 🎉 **EXCELLENT!** — Submit your score to the leaderboard!

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 