// Shared tuning for the flight sim. Values match blender/airbound_drone_sim.py
// so the web demo and the rendered film describe the same aircraft.
export const CONFIG = {
  wingspan: 1.6, // m
  maxSpeed: 25, // m/s forward (~90 km/h)
  maxReverse: 4, // m/s
  accel: 5.5, // m/s^2 when holding ↑
  brake: 9, // m/s^2 when holding ↓ / Space
  climbRate: 6, // m/s with W / S
  yawRateHover: 1.3, // rad/s
  yawRateCruise: 0.55, // rad/s
  transitionStart: 7, // m/s: below this the drone hovers nose-up
  transitionEnd: 16, // m/s: above this it is fully wing-borne
  takeoffClimb: 30, // m climbed automatically after "Take off"
  maxImpact: 3.2, // m/s vertical speed that still counts as a landing
  maxGroundSpeed: 3.5, // m/s horizontal speed that still counts as a landing
  siteRadius: 4.5, // m: how close to a pad centre counts as on target
  worldLimit: 900, // m from the hub
  // Optional FLORA model. Drop the GLB at public/models/drone.glb.
  modelUrl: 'models/drone.glb',
  // Extra XYZ rotation (degrees) if the GLB imports facing the wrong way.
  // After correction the nose must point -Z, wings along X, top +Y.
  modelRotationDeg: [0, 0, 0] as [number, number, number],
};

export const G = 9.81;
