import { create } from "zustand";

export type GamePhase = "start" | "playing" | "success";

export interface GameState {
  phase: GamePhase;
  busPosition: [number, number, number];
  busRotation: number; // Y-axis angle in radians
  busVelocity: number; // forward velocity m/s
  speed: number; // km/h displayed
  gear: number; // 1-6
  distanceTraveled: number; // meters
  distanceToParking: number; // meters
  hornActive: boolean;
  brakeLightsOn: boolean;
  steerInput: number; // -1 (left) to 1 (right)
  cameraMode: "third" | "cockpit";
  radioOn: boolean;
  radioStation: number; // 0-4
  startTime: number;
  elapsedTime: number;
  setPhase: (p: GamePhase) => void;
  updateBus: (
    pos: [number, number, number],
    rot: number,
    vel: number,
    speed: number,
    gear: number,
    dist: number,
    distToParking: number,
  ) => void;
  setHorn: (v: boolean) => void;
  setBrakeLights: (v: boolean) => void;
  setSteerInput: (v: number) => void;
  setCameraMode: (m: "third" | "cockpit") => void;
  toggleRadio: () => void;
  setRadioStation: (s: number) => void;
  setStartTime: (t: number) => void;
  tickElapsedTime: (t: number) => void;
  reset: () => void;
}

const PARKING_Z = -1980;

const initialState = {
  phase: "start" as GamePhase,
  busPosition: [0, 0.5, 0] as [number, number, number],
  busRotation: 0,
  busVelocity: 0,
  speed: 0,
  gear: 1,
  distanceTraveled: 0,
  distanceToParking: Math.abs(PARKING_Z),
  hornActive: false,
  brakeLightsOn: false,
  steerInput: 0,
  cameraMode: "third" as "third" | "cockpit",
  radioOn: false,
  radioStation: 0,
  startTime: 0,
  elapsedTime: 0,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (p) => set({ phase: p }),

  updateBus: (pos, rot, vel, speed, gear, dist, distToParking) =>
    set({
      busPosition: pos,
      busRotation: rot,
      busVelocity: vel,
      speed,
      gear,
      distanceTraveled: dist,
      distanceToParking: distToParking,
    }),

  setHorn: (v) => set({ hornActive: v }),

  setBrakeLights: (v) => set({ brakeLightsOn: v }),

  setSteerInput: (v) => set({ steerInput: v }),

  setCameraMode: (m) => set({ cameraMode: m }),

  toggleRadio: () => set((s) => ({ radioOn: !s.radioOn })),

  setRadioStation: (s) => set({ radioStation: s }),

  setStartTime: (t) => set({ startTime: t }),

  tickElapsedTime: (t) => set({ elapsedTime: t }),

  reset: () =>
    set({
      ...initialState,
      phase: "playing",
      startTime: Date.now(),
    }),
}));
