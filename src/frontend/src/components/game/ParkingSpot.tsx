import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

const PARKING_Z = -1980;

function BlinkingBollard({ x, z }: { x: number; z: number }) {
  const lightRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.getElapsedTime();
    lightRef.current.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.5;
  });
  return (
    <group position={[x, 0, z]}>
      {/* Post */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 1.2, 8]} />
        <meshStandardMaterial color="#F5F5F5" roughness={0.5} />
      </mesh>
      {/* Orange top */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.18, 0.15, 0.4, 8]} />
        <meshStandardMaterial
          ref={lightRef}
          color="#FF6B00"
          emissive="#FF4400"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
      {/* Stripes on post */}
      {([0.3, 0.6, 0.9] as const).map((y, i) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#FF6B00" : "#FFFFFF"} />
        </mesh>
      ))}
    </group>
  );
}

function ArrowSign({
  x,
  z,
  rotation = 0,
}: { x: number; z: number; rotation?: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.emissiveIntensity = 0.3 + Math.abs(Math.sin(t * 2)) * 1.2;
  });
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* Post */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4, 8]} />
        <meshStandardMaterial color="#888" metalness={0.7} />
      </mesh>
      {/* Arrow board */}
      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[2.5, 0.8, 0.12]} />
        <meshStandardMaterial
          ref={matRef}
          color="#00FF00"
          emissive="#00CC00"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
      {/* Arrow triangles on board */}
      <mesh position={[0.5, 4.2, 0.07]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.28, 0.6, 3]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

function ParkingOverheadSign() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.emissiveIntensity = 0.6 + Math.sin(t * 1.5) * 0.4;
  });
  return (
    <group position={[0, 0, PARKING_Z]}>
      {/* Left post */}
      <mesh castShadow position={[-9, 4, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 8, 8]} />
        <meshStandardMaterial color="#666" metalness={0.7} />
      </mesh>
      {/* Right post */}
      <mesh castShadow position={[9, 4, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 8, 8]} />
        <meshStandardMaterial color="#666" metalness={0.7} />
      </mesh>
      {/* Cross beam */}
      <mesh position={[0, 8.2, 0]}>
        <boxGeometry args={[18.5, 0.3, 0.3]} />
        <meshStandardMaterial color="#555" metalness={0.7} />
      </mesh>
      {/* Main sign board */}
      <mesh position={[0, 7.3, 0]}>
        <boxGeometry args={[8.0, 1.5, 0.2]} />
        <meshStandardMaterial
          ref={matRef}
          color="#003399"
          emissive="#0033CC"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
      {/* P letter blocks on sign */}
      {/* Vertical bar of P */}
      <mesh position={[-2.5, 7.3, 0.15]}>
        <boxGeometry args={[0.5, 1.1, 0.1]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Top horizontal of P */}
      <mesh position={[-1.8, 7.75, 0.15]}>
        <boxGeometry args={[1.0, 0.4, 0.1]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Bottom curve of P */}
      <mesh position={[-1.8, 7.3, 0.15]}>
        <boxGeometry args={[1.0, 0.4, 0.1]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* A letter */}
      <mesh position={[-0.5, 7.3, 0.15]}>
        <boxGeometry args={[0.8, 1.0, 0.1]} />
        <meshStandardMaterial
          color="#FFDD00"
          emissive="#FFAA00"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* R letter */}
      <mesh position={[0.5, 7.3, 0.15]}>
        <boxGeometry args={[0.8, 1.0, 0.1]} />
        <meshStandardMaterial
          color="#FFDD00"
          emissive="#FFAA00"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* K letter */}
      <mesh position={[1.5, 7.3, 0.15]}>
        <boxGeometry args={[0.8, 1.0, 0.1]} />
        <meshStandardMaterial
          color="#FFDD00"
          emissive="#FFAA00"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* ING letters block */}
      <mesh position={[2.8, 7.3, 0.15]}>
        <boxGeometry args={[1.8, 1.0, 0.1]} />
        <meshStandardMaterial
          color="#FFDD00"
          emissive="#FFAA00"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

export default function ParkingSpot() {
  const outlineRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!outlineRef.current) return;
    const t = clock.getElapsedTime();
    outlineRef.current.emissiveIntensity =
      0.2 + Math.abs(Math.sin(t * 1.2)) * 0.8;
  });

  return (
    <group>
      {/* ===== PARKING BOX OUTLINE ===== */}
      {/* Main area - painted on road */}
      <mesh position={[0, 0.02, PARKING_Z]}>
        <boxGeometry args={[12, 0.01, 20]} />
        <meshStandardMaterial
          color="#FFFFFF"
          roughness={0.7}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Outline frame - front */}
      <mesh position={[0, 0.025, PARKING_Z + 10]}>
        <boxGeometry args={[12, 0.015, 0.4]} />
        <meshStandardMaterial
          ref={outlineRef}
          color="#FFFF00"
          emissive="#FFCC00"
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Outline frame - back */}
      <mesh position={[0, 0.025, PARKING_Z - 10]}>
        <boxGeometry args={[12, 0.015, 0.4]} />
        <meshStandardMaterial
          color="#FFFF00"
          emissive="#FFCC00"
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Outline frame - left */}
      <mesh position={[-6, 0.025, PARKING_Z]}>
        <boxGeometry args={[0.4, 0.015, 20]} />
        <meshStandardMaterial
          color="#FFFF00"
          emissive="#FFCC00"
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Outline frame - right */}
      <mesh position={[6, 0.025, PARKING_Z]}>
        <boxGeometry args={[0.4, 0.015, 20]} />
        <meshStandardMaterial
          color="#FFFF00"
          emissive="#FFCC00"
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* P marking in center - vertical bar */}
      <mesh position={[-0.8, 0.03, PARKING_Z]}>
        <boxGeometry args={[0.6, 0.015, 6]} />
        <meshStandardMaterial
          color="#FFFF00"
          emissive="#FFCC00"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* P marking - top horizontal */}
      <mesh position={[0.4, 0.03, PARKING_Z + 2]}>
        <boxGeometry args={[2.0, 0.015, 0.6]} />
        <meshStandardMaterial
          color="#FFFF00"
          emissive="#FFCC00"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* P marking - middle horizontal */}
      <mesh position={[0.4, 0.03, PARKING_Z]}>
        <boxGeometry args={[2.0, 0.015, 0.6]} />
        <meshStandardMaterial
          color="#FFFF00"
          emissive="#FFCC00"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* ===== BOLLARDS at 4 corners ===== */}
      <BlinkingBollard x={-5.5} z={PARKING_Z + 9} />
      <BlinkingBollard x={5.5} z={PARKING_Z + 9} />
      <BlinkingBollard x={-5.5} z={PARKING_Z - 9} />
      <BlinkingBollard x={5.5} z={PARKING_Z - 9} />

      {/* ===== DIRECTIONAL ARROW SIGNS ===== */}
      <ArrowSign x={-16} z={PARKING_Z + 30} rotation={-0.1} />
      <ArrowSign x={16} z={PARKING_Z + 30} rotation={0.1} />
      <ArrowSign x={-16} z={PARKING_Z + 80} rotation={-0.05} />
      <ArrowSign x={16} z={PARKING_Z + 80} rotation={0.05} />

      {/* ===== OVERHEAD "PARKING" SIGN ===== */}
      <ParkingOverheadSign />

      {/* Ground lights around parking spot */}
      {[-4, -2, 0, 2, 4].map((x) => (
        <group key={x}>
          <mesh position={[x * 1.1, 0.03, PARKING_Z + 10.2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 8]} />
            <meshStandardMaterial
              color="#00FF00"
              emissive="#00CC00"
              emissiveIntensity={1.5}
            />
          </mesh>
          <mesh position={[x * 1.1, 0.03, PARKING_Z - 10.2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 8]} />
            <meshStandardMaterial
              color="#00FF00"
              emissive="#00CC00"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
