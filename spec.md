# Desi Bus Simulator

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full 3D desi bus driving game using React Three Fiber + Three.js
- Colorful Indian-style bus mesh (decorated, colorful livery, horn decals)
- 3D road environment: 2km straight road with roundabouts/bends
- Roadside scene elements: chai stalls, shops, trees, buildings, pedestrians
- Traffic vehicles (trucks, autos, bikes) moving on road
- Speed breakers (bumps) placed along road
- Player controls: WASD / Arrow keys for steer, accelerate, brake; Space for horn
- Heavy bus physics: slow acceleration, wide turning radius, inertia
- HUD overlay: speedometer, gear indicator, distance-to-parking, elapsed distance, mini-map
- Parking spot 2km from start: marked with blinking arrows, painted box on road
- Distance tracker: live readout of meters traveled + meters remaining
- Brake light visual feedback (red glow on rear)
- Horn visual feedback (flash/pulse effect)
- Directional indicators/arrows pointing toward parking spot
- Ambient + directional lighting (simulated daytime, warm Indian sun)
- Start screen (title, instructions, Play button)
- Success screen (parked! celebration overlay, time taken)
- Parking success detection: bus must be within parking zone and slow enough
- Mini-map showing bus position and parking target

### Modify
N/A (new project)

### Remove
N/A (new project)

## Implementation Plan

1. Set up React Three Fiber canvas with perspective camera and orbit-free driving camera
2. Build bus mesh using Three.js geometry (box primitives composed into bus body, windows, wheels)
3. Apply colorful materials: bright yellow/red/green body, decorative stripe textures via canvas-generated textures
4. Build road system: long flat plane segmented into chunks, road markings, shoulders
5. Place speed breakers, painted road elements (zebra crossings, stop lines)
6. Build roadside props: trees (cylinder+sphere), buildings (box stacks), chai stall signs, shops
7. Add traffic vehicles using simple box geometry, animate them moving along road
8. Implement bus physics controller: velocity, acceleration, friction, steering angle, inertia
9. Implement camera follow: third-person camera behind/above bus
10. Build HUD React overlay: speed gauge, gear, distance meters, compass arrow to parking
11. Build mini-map: top-down 2D canvas showing road, bus dot, parking dot
12. Place parking spot at ~2000 units (2km) from start, paint box + blinking indicator poles
13. Detect parking success: bus position within zone, speed < threshold
14. Build start screen component with game title and start button
15. Build success screen component with time and restart button
16. Horn visual feedback: flash a horn icon on screen, briefly scale bus slightly
17. Brake lights: toggle emissive material on rear lights mesh when braking
18. Wire all state using Zustand (game phase, bus state, distance)
19. Validate and fix TypeScript/lint errors
