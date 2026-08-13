import Game from "./components/game/Game";
import StartScreen from "./components/game/StartScreen";
import SuccessScreen from "./components/game/SuccessScreen";
import { useGameStore } from "./store/gameStore";

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0808",
      }}
    >
      {/* Game is always mounted when not on start screen */}
      {phase !== "start" && <Game />}

      {/* Start screen overlay */}
      {phase === "start" && <StartScreen />}

      {/* Success screen overlay */}
      {phase === "success" && <SuccessScreen />}

      {/* Footer - shown on start screen only */}
      {phase === "start" && (
        <div
          style={{
            position: "fixed",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            color: "rgba(200,180,150,0.35)",
            zIndex: 60,
            whiteSpace: "nowrap",
          }}
        >
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined" ? window.location.hostname : "",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(255,149,0,0.5)", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </div>
      )}
    </div>
  );
}
