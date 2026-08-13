import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";
import { soundManager } from "../../utils/soundManager";

// Physics constants (realistic heavy bus with improved controls)
const MAX_SPEED = 27.78; // 100 km/h in m/s
const ACCEL = 1.8; // m/s² - improved acceleration (0-100 in ~15s)
const BRAKE_FORCE = 4.5; // m/s² - strong braking
const ROLLING_RESISTANCE = 0.2; // m/s² - reduced rolling resistance
const DRAG_COEFF = 0.0003; // m/s² per (m/s)² - aerodynamic drag
const MAX_REVERSE = -5.0; // m/s - faster reverse
const WHEELBASE = 8;
const MAX_STEER_ANGLE = 0.7; // radians (~40°) - wider steering lock
const STEER_RATE = 2.0; // rad/s - faster steering response
const STEER_RETURN_RATE = 2.5; // rad/s - faster return to center
const PARKING_Z = -1980;
const PARKING_X_LIMIT = 5.5;
const PARKING_Z_MIN = -2005;
const PARKING_Z_MAX = -1960;

interface KeysRef {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  horn: boolean;
}

export default function Bus() {
  const { camera } = useThree();
  const updateBus = useGameStore((s) => s.updateBus);
  const setHorn = useGameStore((s) => s.setHorn);
  const setBrakeLights = useGameStore((s) => s.setBrakeLights);
  const setPhase = useGameStore((s) => s.setPhase);
  const phase = useGameStore((s) => s.phase);
  const brakeLightsOn = useGameStore((s) => s.brakeLightsOn);
  const hornActive = useGameStore((s) => s.hornActive);
  const tickElapsedTime = useGameStore((s) => s.tickElapsedTime);
  const startTime = useGameStore((s) => s.startTime);
  const reset = useGameStore((s) => s.reset);

  const busRef = useRef<THREE.Group>(null);
  const velRef = useRef(0);
  const steerRef = useRef(0);
  const distRef = useRef(0);
  const prevPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const hornTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelRotRef = useRef(0);
  const brakeSoundPlayedRef = useRef(false);
  const engineStartedRef = useRef(false);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const setSteerInput = useGameStore((s) => s.setSteerInput);
  const cameraModeRef = useRef<"third" | "cockpit">("third");
  // Keep ref in sync with state for useFrame access
  cameraModeRef.current = cameraMode;

  const keysRef = useRef<KeysRef>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    horn: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keysRef.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          keysRef.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          keysRef.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keysRef.current.right = true;
          break;
        case "Space":
          e.preventDefault();
          keysRef.current.horn = true;
          setHorn(true);
          soundManager.playHorn();
          if (hornTimerRef.current) clearTimeout(hornTimerRef.current);
          hornTimerRef.current = setTimeout(() => {
            setHorn(false);
            keysRef.current.horn = false;
          }, 600);
          break;
        case "KeyC":
          // Toggle between third-person and cockpit camera
          setCameraMode(cameraModeRef.current === "third" ? "cockpit" : "third");
          break;
        case "KeyR":
          reset();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keysRef.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keysRef.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keysRef.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keysRef.current.right = false;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setHorn, reset]);

  useFrame((_state, delta) => {
    if (!busRef.current || phase !== "playing") return;

    // Start engine sound when gameplay begins
    if (!engineStartedRef.current) {
      engineStartedRef.current = true;
      soundManager.startEngine();
      soundManager.playEngineStart();
    }

    const dt = Math.min(delta, 0.05);
    const keys = keysRef.current;

    // --- Longitudinal dynamics (realistic) ---
    let accel = 0;

    if (keys.forward) {
      accel = ACCEL;
    } else if (keys.backward) {
      // Braking if moving forward, reverse if stopped
      if (velRef.current > 0.5) {
        accel = -BRAKE_FORCE;
      } else {
        accel = -ACCEL * 0.5; // reverse acceleration
      }
    } else {
      // Coasting: rolling resistance + aerodynamic drag (proportional to v²)
      accel =
        -(ROLLING_RESISTANCE + DRAG_COEFF * velRef.current * Math.abs(velRef.current));
    }

    velRef.current += accel * dt;

    // Clamp to max speed / max reverse
    velRef.current = Math.max(MAX_REVERSE, Math.min(MAX_SPEED, velRef.current));

    // Clamp very small velocity to zero to avoid drift
    if (Math.abs(velRef.current) < 0.01) velRef.current = 0;

    // --- Steering (speed-sensitive, bicycle model) ---
    const speedKmh = Math.abs(velRef.current) * 3.6;

    // Steering effectiveness decreases with speed (more stable at high speed)
    const steerEffectiveness = 1 / (1 + speedKmh * 0.015);

    if (keys.left) {
      steerRef.current = Math.max(
        steerRef.current - STEER_RATE * dt,
        -MAX_STEER_ANGLE,
      );
    } else if (keys.right) {
      steerRef.current = Math.min(
        steerRef.current + STEER_RATE * dt,
        MAX_STEER_ANGLE,
      );
    } else {
      // Return to center smoothly
      if (steerRef.current > 0) {
        steerRef.current = Math.max(0, steerRef.current - STEER_RETURN_RATE * dt);
      } else if (steerRef.current < 0) {
        steerRef.current = Math.min(0, steerRef.current + STEER_RETURN_RATE * dt);
      }
    }

    // Update steering input for HUD (normalized -1 to 1)
    setSteerInput(steerRef.current / MAX_STEER_ANGLE);

    // Apply steering only when moving (kinematic bicycle model)
    // In reverse, steering direction is naturally inverted by the sign of velocity
    if (Math.abs(velRef.current) > 0.1) {
      const rotationDelta =
        (velRef.current / WHEELBASE) *
        Math.tan(steerRef.current * steerEffectiveness) *
        dt;
      busRef.current.rotation.y -= rotationDelta;
    }

    // Update position
    const rot = busRef.current.rotation.y;
    busRef.current.position.x += Math.sin(rot) * velRef.current * dt;
    busRef.current.position.z += Math.cos(rot) * velRef.current * dt;
    busRef.current.position.y = 0.5; // keep on ground

    // Clamp X position to road + shoulder
    busRef.current.position.x = Math.max(
      -20,
      Math.min(20, busRef.current.position.x),
    );
    // Clamp Z to road length
    busRef.current.position.z = Math.max(
      -2200,
      Math.min(5, busRef.current.position.z),
    );

    // Distance tracking
    const currentPos = busRef.current.position.clone();
    const frameDist = currentPos.distanceTo(prevPos.current);
    if (frameDist < 5) {
      // filter out teleports
      distRef.current += frameDist;
    }
    prevPos.current.copy(currentPos);

    // Wheel rotation
    wheelRotRef.current += velRef.current * dt * 0.5;

    // Distance to parking
    const dx = busRef.current.position.x;
    const dz = busRef.current.position.z - PARKING_Z;
    const distToParking = Math.sqrt(dx * dx + dz * dz);

    // Gear calculation (1-6 based on speed, up to 100 km/h)
    const gear = Math.max(1, Math.min(6, Math.floor(speedKmh / 17) + 1));

    // Brake lights when braking or in reverse
    const newBrakeLights = keys.backward || velRef.current < -0.1;
    if (newBrakeLights !== brakeLightsOn) {
      setBrakeLights(newBrakeLights);
      // Play brake hiss when braking starts (and we're moving)
      if (newBrakeLights && Math.abs(velRef.current) > 0.5) {
        if (!brakeSoundPlayedRef.current) {
          brakeSoundPlayedRef.current = true;
          soundManager.playBrake();
        }
      } else if (!newBrakeLights) {
        brakeSoundPlayedRef.current = false;
      }
    }

    // Update engine sound pitch based on speed
    soundManager.setEngineSpeed(speedKmh);

    // Elapsed time
    tickElapsedTime(Date.now() - startTime);

    // Update store
    updateBus(
      [
        busRef.current.position.x,
        busRef.current.position.y,
        busRef.current.position.z,
      ],
      busRef.current.rotation.y,
      velRef.current,
      Math.round(speedKmh),
      gear,
      Math.round(distRef.current),
      Math.round(distToParking),
    );

    // Check parking success
    const posX = busRef.current.position.x;
    const posZ = busRef.current.position.z;
    if (
      Math.abs(posX) < PARKING_X_LIMIT &&
      posZ < PARKING_Z_MAX &&
      posZ > PARKING_Z_MIN &&
      speedKmh < 5
    ) {
      setPhase("success");
      soundManager.stopEngine();
    }

    // Camera follow - third-person or cockpit view
    if (cameraModeRef.current === "third") {
      // Third-person: behind and above bus
      const camDistance = 18;
      const camHeight = 7;
      const targetCamX = busRef.current.position.x - Math.sin(rot) * camDistance;
      const targetCamZ = busRef.current.position.z - Math.cos(rot) * camDistance;
      const targetCamY = busRef.current.position.y + camHeight;

      // Smooth camera follow
      camera.position.x += (targetCamX - camera.position.x) * 0.08;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.lookAt(
        busRef.current.position.x,
        busRef.current.position.y + 1.5,
        busRef.current.position.z,
      );
    } else {
      // Cockpit: driver's seat view (front windshield)
      const cockpitHeight = 2.2; // driver eye height
      const cockpitForward = 4.0; // at windshield position for clear view
      const targetCamX = busRef.current.position.x + Math.sin(rot) * cockpitForward;
      const targetCamZ = busRef.current.position.z + Math.cos(rot) * cockpitForward;
      const targetCamY = busRef.current.position.y + cockpitHeight;

      // Rigid camera mount - no smoothing so the bus body stays fixed in view.
      // (Smoothing causes the body to slide forward on accel and backward on brake.)
      camera.position.set(targetCamX, targetCamY, targetCamZ);

      // Widen FOV for a clearer cockpit view
      const perspCam = camera as THREE.PerspectiveCamera;
      if (perspCam.fov < 75) {
        perspCam.fov = Math.min(85, perspCam.fov + 2);
        perspCam.updateProjectionMatrix();
      }

      // Look forward along the bus heading (extend look-ahead for better visibility)
      const lookX = busRef.current.position.x + Math.sin(rot) * 100;
      const lookZ = busRef.current.position.z + Math.cos(rot) * 100;
      camera.lookAt(lookX, busRef.current.position.y + 1.2, lookZ);
    }
  });

  // Reset bus state when entering "playing" phase (e.g., after Play Again)
  useEffect(() => {
    if (phase === "playing" && busRef.current) {
      // Reset 3D position and rotation
      busRef.current.position.set(0, 0.5, 0);
      busRef.current.rotation.set(0, Math.PI, 0);
      // Reset physics refs
      velRef.current = 0;
      steerRef.current = 0;
      distRef.current = 0;
      wheelRotRef.current = 0;
      prevPos.current.set(0, 0.5, 0);
      engineStartedRef.current = false;
      brakeSoundPlayedRef.current = false;
    }
  }, [phase]);

  // Stop engine when leaving playing phase
  useEffect(() => {
    if (phase !== "playing" && engineStartedRef.current) {
      engineStartedRef.current = false;
      soundManager.stopEngine();
    }
  }, [phase]);

  return (
    <group ref={busRef} position={[0, 0.5, 0]} rotation={[0, Math.PI, 0]}>
      <BusMesh
        brakeLightsOn={brakeLightsOn}
        hornActive={hornActive}
        cockpitMode={cameraModeRef.current === "cockpit"}
      />
    </group>
  );
}

interface BusMeshProps {
  brakeLightsOn: boolean;
  hornActive: boolean;
  cockpitMode: boolean;
}

function BusMesh({ brakeLightsOn, hornActive, cockpitMode }: BusMeshProps) {
  // Realistic detailed Indian bus model
  return (
    <group>
      {/* ===== MAIN BODY - Lower section (darker orange) ===== */}
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[3.2, 1.8, 9]} />
        <meshStandardMaterial color="#E85D04" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ===== MAIN BODY - Upper section (lighter orange) ===== */}
      <mesh castShadow receiveShadow position={[0, 2.1, 0]}>
        <boxGeometry args={[3.15, 1.4, 8.8]} />
        <meshStandardMaterial color="#FF9500" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ===== ROOF SECTION ===== */}
      {/* Main roof */}
      <mesh castShadow position={[0, 2.85, 0]}>
        <boxGeometry args={[3.0, 0.3, 8.5]} />
        <meshStandardMaterial color="#FF7A00" roughness={0.6} />
      </mesh>

      {/* Roof curve/front slope */}
      <mesh position={[0, 2.75, 4.3]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[2.8, 0.2, 0.8]} />
        <meshStandardMaterial color="#FF7A00" roughness={0.6} />
      </mesh>

      {/* Roof curve/rear slope */}
      <mesh position={[0, 2.75, -4.3]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[2.8, 0.2, 0.8]} />
        <meshStandardMaterial color="#FF7A00" roughness={0.6} />
      </mesh>

      {/* ===== ROOF LUGGAGE RACK ===== */}
      {/* Main rack rails */}
      <mesh position={[-1.35, 3.05, 0]}>
        <boxGeometry args={[0.08, 0.12, 8.2]} />
        <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[1.35, 3.05, 0]}>
        <boxGeometry args={[0.08, 0.12, 8.2]} />
        <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Rack cross bars */}
      {[-3, -1.5, 0, 1.5, 3].map((z) => (
        <mesh key={z} position={[0, 3.05, z]}>
          <boxGeometry args={[2.7, 0.06, 0.08]} />
          <meshStandardMaterial color="#777" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* ===== DECORATIVE STRIPES ===== */}
      {/* Red stripe - main decorative band */}
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[3.22, 0.35, 9.01]} />
        <meshStandardMaterial color="#CC0000" roughness={0.4} />
      </mesh>

      {/* Yellow/gold stripe above red */}
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[3.22, 0.08, 9.01]} />
        <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Green stripe below red */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[3.22, 0.2, 9.01]} />
        <meshStandardMaterial color="#006B2B" roughness={0.4} />
      </mesh>

      {/* Thin white stripe below green */}
      <mesh position={[0, 1.32, 0]}>
        <boxGeometry args={[3.22, 0.05, 9.01]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>

      {/* ===== SIDE WINDOWS ===== */}
      {/* Window frames - left side */}
      {[-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].map((z) => (
        <group key={`left-${z}`}>
          {/* Window glass */}
          <mesh position={[-1.61, 2.05, z]}>
            <boxGeometry args={[0.05, 0.7, 0.75]} />
            <meshStandardMaterial
              color="#1A3A5A"
              roughness={0.1}
              metalness={0.3}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Window frame */}
          <mesh position={[-1.61, 2.05, z]}>
            <boxGeometry args={[0.08, 0.75, 0.82]} />
            <meshStandardMaterial color="#222" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Window frames - right side */}
      {[-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].map((z) => (
        <group key={`right-${z}`}>
          {/* Window glass */}
          <mesh position={[1.61, 2.05, z]}>
            <boxGeometry args={[0.05, 0.7, 0.75]} />
            <meshStandardMaterial
              color="#1A3A5A"
              roughness={0.1}
              metalness={0.3}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Window frame */}
          <mesh position={[1.61, 2.05, z]}>
            <boxGeometry args={[0.08, 0.75, 0.82]} />
            <meshStandardMaterial color="#222" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* ===== FRONT FACE ===== */}
      {/* Front windshield - hidden in cockpit mode */}
      {!cockpitMode && (
        <mesh position={[0, 2.15, 4.52]}>
          <boxGeometry args={[2.3, 1.0, 0.08]} />
          <meshStandardMaterial
            color="#1A3A5A"
            roughness={0.1}
            metalness={0.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {/* Windshield frame - top */}
      <mesh position={[0, 2.72, 4.52]}>
        <boxGeometry args={[2.4, 0.08, 0.1]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Windshield wipers */}
      <mesh position={[-0.6, 2.1, 4.56]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.8, 0.04, 0.06]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh position={[0.6, 2.1, 4.56]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.8, 0.04, 0.06]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>

      {/* Front destination board - "MUMBAI EXPRESS" */}
      <mesh position={[0, 3.0, 4.52]}>
        <boxGeometry args={[2.6, 0.4, 0.08]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.3} />
      </mesh>

      {/* Destination board frame */}
      <mesh position={[0, 3.0, 4.5]}>
        <boxGeometry args={[2.7, 0.45, 0.05]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Front grille - main */}
      <mesh position={[0, 0.9, 4.56]}>
        <boxGeometry args={[2.2, 0.6, 0.1]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Grille horizontal slats */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 0.7 + i * 0.12, 4.58]}>
          <boxGeometry args={[2.0, 0.03, 0.08]} />
          <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Front bumper - main */}
      <mesh position={[0, 0.35, 4.6]}>
        <boxGeometry args={[3.2, 0.35, 0.2]} />
        <meshStandardMaterial color="#2A2A2A" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Bumper guard - left */}
      <mesh position={[-1.4, 0.35, 4.62]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Bumper guard - right */}
      <mesh position={[1.4, 0.35, 4.62]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Headlights - main */}
      <mesh position={[-1.1, 0.9, 4.56]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshStandardMaterial
          color="#FFFFE0"
          emissive="#FFFFAA"
          emissiveIntensity={0.9}
        />
      </mesh>
      <mesh position={[1.1, 0.9, 4.56]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshStandardMaterial
          color="#FFFFE0"
          emissive="#FFFFAA"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* Headlight housings */}
      <mesh position={[-1.1, 0.9, 4.53]}>
        <boxGeometry args={[0.45, 0.35, 0.05]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[1.1, 0.9, 4.53]}>
        <boxGeometry args={[0.45, 0.35, 0.05]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Turn signals - front */}
      <mesh position={[-1.5, 0.6, 4.56]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFA500"
          emissive="#FF8C00"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[1.5, 0.6, 4.56]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFA500"
          emissive="#FF8C00"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Fog lights */}
      <mesh position={[-1.3, 0.4, 4.58]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFFFE0"
          emissive="#FFFFAA"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[1.3, 0.4, 4.58]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFFFE0"
          emissive="#FFFFAA"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Horn indicator on front */}
      <mesh position={[0, 1.5, 4.56]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial
          color={hornActive ? "#FFD700" : "#FF4444"}
          emissive={hornActive ? "#FFD700" : "#880000"}
          emissiveIntensity={hornActive ? 1.5 : 0.3}
        />
      </mesh>

      {/* ===== REAR FACE ===== */}
      {/* Rear windshield */}
      <mesh position={[0, 2.15, -4.52]}>
        <boxGeometry args={[2.3, 1.0, 0.08]} />
        <meshStandardMaterial
          color="#1A3A5A"
          roughness={0.1}
          metalness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Rear bumper - main */}
      <mesh position={[0, 0.35, -4.6]}>
        <boxGeometry args={[3.2, 0.35, 0.2]} />
        <meshStandardMaterial color="#2A2A2A" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Tail lights - main */}
      <mesh position={[-1.1, 0.9, -4.56]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshStandardMaterial
          color="#FF0000"
          emissive="#FF0000"
          emissiveIntensity={brakeLightsOn ? 2.5 : 0.5}
        />
      </mesh>
      <mesh position={[1.1, 0.9, -4.56]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshStandardMaterial
          color="#FF0000"
          emissive="#FF0000"
          emissiveIntensity={brakeLightsOn ? 2.5 : 0.5}
        />
      </mesh>

      {/* Tail light housings */}
      <mesh position={[-1.1, 0.9, -4.53]}>
        <boxGeometry args={[0.45, 0.35, 0.05]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[1.1, 0.9, -4.53]}>
        <boxGeometry args={[0.45, 0.35, 0.05]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Rear turn signals */}
      <mesh position={[-1.5, 0.6, -4.56]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFA500"
          emissive="#FF8C00"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[1.5, 0.6, -4.56]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFA500"
          emissive="#FF8C00"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Rear fog lights */}
      <mesh position={[-1.3, 0.4, -4.58]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFFFE0"
          emissive="#FFFFAA"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[1.3, 0.4, -4.58]}>
        <boxGeometry args={[0.2, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#FFFFE0"
          emissive="#FFFFAA"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* ===== WHEELS - Detailed ===== */}
      {/* Front left wheel */}
      <group position={[-1.7, -0.5, 3.0]}>
        {/* Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.55, 0.5, 24]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
        </mesh>
        {/* Rim */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.52, 16]} />
          <meshStandardMaterial color="#AAA" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Hub cap */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.54, 12]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Front right wheel */}
      <group position={[1.7, -0.5, 3.0]}>
        {/* Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.55, 0.5, 24]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
        </mesh>
        {/* Rim */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.52, 16]} />
          <meshStandardMaterial color="#AAA" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Hub cap */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.54, 12]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear left wheel */}
      <group position={[-1.7, -0.5, -3.0]}>
        {/* Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.55, 0.5, 24]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
        </mesh>
        {/* Rim */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.52, 16]} />
          <meshStandardMaterial color="#AAA" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Hub cap */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.54, 12]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear right wheel */}
      <group position={[1.7, -0.5, -3.0]}>
        {/* Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.55, 0.5, 24]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
        </mesh>
        {/* Rim */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.52, 16]} />
          <meshStandardMaterial color="#AAA" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Hub cap */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.54, 12]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* ===== WHEEL ARCHES ===== */}
      {/* Front left wheel arch */}
      <mesh position={[-1.7, 0.1, 3.0]}>
        <boxGeometry args={[0.6, 0.15, 1.0]} />
        <meshStandardMaterial color="#CC4400" roughness={0.5} />
      </mesh>

      {/* Front right wheel arch */}
      <mesh position={[1.7, 0.1, 3.0]}>
        <boxGeometry args={[0.6, 0.15, 1.0]} />
        <meshStandardMaterial color="#CC4400" roughness={0.5} />
      </mesh>

      {/* Rear left wheel arch */}
      <mesh position={[-1.7, 0.1, -3.0]}>
        <boxGeometry args={[0.6, 0.15, 1.0]} />
        <meshStandardMaterial color="#CC4400" roughness={0.5} />
      </mesh>

      {/* Rear right wheel arch */}
      <mesh position={[1.7, 0.1, -3.0]}>
        <boxGeometry args={[0.6, 0.15, 1.0]} />
        <meshStandardMaterial color="#CC4400" roughness={0.5} />
      </mesh>

      {/* ===== UNDERCARRIAGE ===== */}
      {/* Main chassis */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[3.0, 0.15, 8.5]} />
        <meshStandardMaterial color="#2A2A2A" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Front axle */}
      <mesh position={[0, -0.4, 3.0]}>
        <boxGeometry args={[2.8, 0.15, 0.2]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Rear axle */}
      <mesh position={[0, -0.4, -3.0]}>
        <boxGeometry args={[2.8, 0.15, 0.2]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ===== SIDE DETAILS ===== */}
      {/* Side mirrors - left */}
      <mesh position={[-1.78, 2.0, 3.6]}>
        <boxGeometry args={[0.08, 0.25, 0.2]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Mirror glass - left */}
      <mesh position={[-1.82, 2.0, 3.6]}>
        <boxGeometry args={[0.03, 0.2, 0.15]} />
        <meshStandardMaterial
          color="#4A6B8A"
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Side mirrors - right */}
      <mesh position={[1.78, 2.0, 3.6]}>
        <boxGeometry args={[0.08, 0.25, 0.2]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Mirror glass - right */}
      <mesh position={[1.82, 2.0, 3.6]}>
        <boxGeometry args={[0.03, 0.2, 0.15]} />
        <meshStandardMaterial
          color="#4A6B8A"
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Door - right side front */}
      <mesh position={[1.61, 1.2, 2.8]}>
        <boxGeometry args={[0.1, 1.6, 1.4]} />
        <meshStandardMaterial color="#E85D04" roughness={0.5} />
      </mesh>

      {/* Door handle - right side */}
      <mesh position={[1.65, 1.3, 2.5]}>
        <boxGeometry args={[0.05, 0.08, 0.3]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Door - left side front */}
      <mesh position={[-1.61, 1.2, 2.8]}>
        <boxGeometry args={[0.1, 1.6, 1.4]} />
        <meshStandardMaterial color="#E85D04" roughness={0.5} />
      </mesh>

      {/* Door handle - left side */}
      <mesh position={[-1.65, 1.3, 2.5]}>
        <boxGeometry args={[0.05, 0.08, 0.3]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Steps - left side */}
      <mesh position={[-1.75, 0.3, 3.8]}>
        <boxGeometry args={[0.3, 0.08, 0.4]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-1.75, 0.5, 3.5]}>
        <boxGeometry args={[0.3, 0.08, 0.4]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Steps - right side */}
      <mesh position={[1.75, 0.3, 3.8]}>
        <boxGeometry args={[0.3, 0.08, 0.4]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[1.75, 0.5, 3.5]}>
        <boxGeometry args={[0.3, 0.08, 0.4]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* ===== ROOF DECORATIONS ===== */}
      {/* Roof ornament boxes (decorative desi touch) */}
      {[-2.5, 0, 2.5].map((z) => (
        <mesh key={z} position={[0, 3.15, z]}>
          <boxGeometry args={[0.5, 0.25, 0.4]} />
          <meshStandardMaterial
            color={z === 0 ? "#FF4400" : "#FFD700"}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
      ))}

      {/* Roof AC unit */}
      <mesh position={[0, 3.2, -1.5]}>
        <boxGeometry args={[1.2, 0.3, 0.8]} />
        <meshStandardMaterial color="#666" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Roof vent */}
      <mesh position={[0, 3.15, 1.5]}>
        <boxGeometry args={[0.6, 0.15, 0.4]} />
        <meshStandardMaterial color="#555" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ===== EXHAUST SYSTEM ===== */}
      {/* Exhaust pipe */}
      <mesh position={[-1.65, -0.2, -4.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Exhaust tip */}
      <mesh position={[-1.65, -0.2, -4.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 8]} />
        <meshStandardMaterial color="#444" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* ===== MUD FLAPS ===== */}
      <mesh position={[-1.7, -0.7, 3.0]}>
        <boxGeometry args={[0.05, 0.4, 0.5]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[1.7, -0.7, 3.0]}>
        <boxGeometry args={[0.05, 0.4, 0.5]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[-1.7, -0.7, -3.0]}>
        <boxGeometry args={[0.05, 0.4, 0.5]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[1.7, -0.7, -3.0]}>
        <boxGeometry args={[0.05, 0.4, 0.5]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>

      {/* ===== ADDITIONAL DETAILS ===== */}
      {/* Fuel tank */}
      <mesh position={[-1.8, -0.3, -1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 1.2, 12]} />
        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Battery box */}
      <mesh position={[1.8, -0.2, 1.5]}>
        <boxGeometry args={[0.3, 0.25, 0.4]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Front number plate */}
      <mesh position={[0, 0.5, 4.62]}>
        <boxGeometry args={[1.2, 0.25, 0.05]} />
        <meshStandardMaterial color="#FFF" roughness={0.3} />
      </mesh>

      {/* Rear number plate */}
      <mesh position={[0, 0.5, -4.62]}>
        <boxGeometry args={[1.2, 0.25, 0.05]} />
        <meshStandardMaterial color="#FFF" roughness={0.3} />
      </mesh>

      {/* Company logo/badge on front */}
      <mesh position={[0, 1.2, 4.57]}>
        <circleGeometry args={[0.2, 16]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}
