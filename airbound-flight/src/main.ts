import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import './style.css';
import { createDrone } from './drone';
import { Flight, type FlightEvent, type Input } from './flight';
import { buildWorld, type Site } from './world';

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9c7b0, 180, 1500);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);

// golden-hour light
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 24), THREE.MathUtils.degToRad(215));
const sky = new Sky();
sky.scale.setScalar(10000);
const su = sky.material.uniforms;
su.turbidity.value = 7;
su.rayleigh.value = 2.2;
su.mieCoefficient.value = 0.006;
su.mieDirectionalG.value = 0.85;
su.sunPosition.value.copy(sunDir);
scene.add(sky);
scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x8a7560, 2.2));
const sun = new THREE.DirectionalLight(0xffd7b0, 5.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = sc.bottom = -45;
sc.right = sc.top = 45;
sc.near = 1;
sc.far = 400;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// ---------------------------------------------------------------- world
const world = buildWorld();
scene.add(world.group);
const drone = createDrone();
scene.add(drone.root);
const flight = new Flight(world.hub, THREE.MathUtils.degToRad(200), () => drone.tailOffset);
drone.loadModel().then((ok) => {
  if (ok) flight.reset();
});

// ---------------------------------------------------------------- input
const keys = new Set<string>();
const input = (): Input => ({
  forward: keys.has('ArrowUp'),
  back: keys.has('ArrowDown'),
  left: keys.has('ArrowLeft') || keys.has('KeyA'),
  right: keys.has('ArrowRight') || keys.has('KeyD'),
  up: keys.has('KeyW'),
  down: keys.has('KeyS'),
  brake: keys.has('Space'),
});
const flightKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD'];
window.addEventListener('keydown', (e) => {
  if (mode === 'intro') return;
  if (flightKeys.includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyC') camMode = (camMode + 1) % 3;
  if (e.code === 'Escape') exitFlight();
  if (e.code === 'KeyW' && flight.phase === 'landed') takeOffAgain();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
document.querySelectorAll<HTMLButtonElement>('#touch button').forEach((b) => {
  const k = b.dataset.key!;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(k); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => keys.delete(k));
});

// ---------------------------------------------------------------- UI
type Mode = 'intro' | 'launch' | 'flying' | 'result';
let mode: Mode = 'intro';
let camMode = 0;
const $ = (id: string) => document.getElementById(id)!;
const hud = $('hud');
const result = $('result');
const toastEl = $('toast');
let toastTimer = 0;

function toast(text: string, sub = '', ms = 2600) {
  toastEl.innerHTML = sub ? `${text}<small>${sub}</small>` : text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms);
}

function startFlight() {
  if (mode !== 'intro') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  mode = 'launch';
  document.body.classList.add('flying', 'cinematic');
  hud.hidden = false;
  result.hidden = true;
  flight.reset();
  flight.takeoff();
  launchT = 0;
  toast('Spooling up', 'Vertical take-off from the hub');
}

function takeOffAgain() {
  result.hidden = true;
  mode = 'launch';
  flight.takeoff();
  launchT = 1; // skip the intro camera move
  toast('Lifting off');
}

function exitFlight() {
  mode = 'intro';
  hud.hidden = true;
  result.hidden = true;
  document.body.classList.remove('flying', 'cinematic');
  flight.reset();
  keys.clear();
}

document.addEventListener('click', (e) => {
  const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'takeoff') startFlight();
  if (action === 'again') takeOffAgain();
  if (action === 'reset') {
    exitFlight();
    startFlight();
  }
});

function showResult(ev: Extract<FlightEvent, { type: 'landed' } | { type: 'crashed' }>) {
  mode = 'result';
  keys.clear();
  const stats = $('r-stats');
  const againBtn = result.querySelector<HTMLElement>('[data-action="again"]')!;
  if (ev.type === 'landed') {
    const score = Math.round(THREE.MathUtils.clamp(100 - ev.offset * 9 - ev.impact * 9 - ev.groundSpeed * 6, 0, 100));
    $('r-eyebrow').textContent = `Delivered · ${ev.site.name}`;
    $('r-title').textContent = score >= 90 ? 'Perfect drop' : score >= 70 ? 'Smooth delivery' : score >= 45 ? 'Delivered' : 'Delivered, just';
    $('r-score').textContent = String(score);
    stats.innerHTML = `
      <dt>Off centre</dt><dd>${ev.offset.toFixed(2)} m</dd>
      <dt>Touchdown</dt><dd>${ev.impact.toFixed(2)} m/s</dd>
      <dt>Ground speed</dt><dd>${(ev.groundSpeed * 3.6).toFixed(1)} km/h</dd>
      <dt>Flight time</dt><dd>${formatTime(ev.time)}</dd>`;
    againBtn.hidden = false;
  } else {
    $('r-eyebrow').textContent = 'Flight ended';
    $('r-title').textContent = ev.reason;
    $('r-score').textContent = '0';
    stats.innerHTML = `<dt>Tip</dt><dd style="text-align:left;grid-column:span 1">Press Space to brake to a hover before descending with S. Touch down under 3 m/s.</dd>`;
    againBtn.hidden = true;
  }
  window.setTimeout(() => (result.hidden = false), ev.type === 'landed' ? 1400 : 900);
}

const formatTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// labels
const labelEls = new Map<Site, HTMLDivElement>();
for (const s of world.sites) {
  const el = document.createElement('div');
  el.className = 'site-label';
  $('labels').appendChild(el);
  labelEls.set(s, el);
}

const minimap = $('minimap') as HTMLCanvasElement;
const mm = minimap.getContext('2d')!;

function updateHud() {
  const tail = drone.tailOffset;
  const agl = flight.pos.y - tail - world.surfaceAt(flight.pos.x, flight.pos.z, flight.pos.y - tail);
  $('h-alt').textContent = Math.max(0, agl).toFixed(0);
  $('h-spd').textContent = Math.abs(flight.v * 3.6).toFixed(0);
  $('h-vs').textContent = flight.vz.toFixed(1);
  const k = flight.transition;
  $('h-mode').textContent =
    flight.phase === 'spool' ? 'SPOOL UP' : flight.phase === 'takeoff' ? 'VERTICAL TAKE-OFF'
      : flight.phase === 'landed' ? 'LANDED' : flight.grounded ? 'ON GROUND'
        : k < 0.05 ? 'HOVER' : k > 0.95 ? 'WING-BORNE' : 'TRANSITION';
  ($('h-trans') as HTMLElement).style.width = `${k * 100}%`;

  let nearest = world.sites[0];
  let best = Infinity;
  for (const s of world.sites) {
    const d = Math.hypot(s.pos.x - flight.pos.x, s.pos.z - flight.pos.z);
    if (d < best) { best = d; nearest = s; }
  }
  $('h-target').textContent = nearest.name;
  $('h-dist').textContent = best < 1000 ? `${best.toFixed(0)} m · ${nearest.kind}` : '';

  // floating labels
  const w = window.innerWidth;
  const h = window.innerHeight;
  const v = new THREE.Vector3();
  for (const [s, el] of labelEls) {
    v.set(s.pos.x, s.pos.y + 7, s.pos.z).project(camera);
    const d = Math.hypot(s.pos.x - flight.pos.x, s.pos.z - flight.pos.z);
    const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    el.style.display = visible ? 'block' : 'none';
    if (visible) {
      el.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
      el.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      el.innerHTML = `${s.name}<small>${d.toFixed(0)} m</small>`;
    }
  }

  // minimap (north-up, 700 m radius)
  const R = 90;
  const scale = R / 700;
  mm.clearRect(0, 0, 180, 180);
  mm.save();
  mm.beginPath();
  mm.arc(R, R, R - 1, 0, Math.PI * 2);
  mm.clip();
  mm.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let r = 1; r <= 3; r++) { mm.beginPath(); mm.arc(R, R, (r * R) / 3, 0, Math.PI * 2); mm.stroke(); }
  const toMap = (x: number, z: number) => [R + (x - flight.pos.x) * scale, R + (z - flight.pos.z) * scale];
  const [hx, hz] = toMap(world.hub.x, world.hub.z);
  mm.fillStyle = '#f3efe8';
  mm.fillRect(hx - 3, hz - 3, 6, 6);
  for (const s of world.sites) {
    const [x, z] = toMap(s.pos.x, s.pos.z);
    mm.fillStyle = s === nearest ? '#ff6a1a' : 'rgba(255,106,26,0.55)';
    mm.beginPath(); mm.arc(x, z, s === nearest ? 5 : 4, 0, Math.PI * 2); mm.fill();
  }
  mm.translate(R, R);
  mm.rotate(-flight.yaw);
  mm.fillStyle = '#ffffff';
  mm.beginPath(); mm.moveTo(0, -8); mm.lineTo(5, 6); mm.lineTo(0, 3); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
  mm.restore();
}

// ---------------------------------------------------------------- camera
let launchT = 0;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let introAngle = 0.6;
let camInit = false;

function cameraTargets(dt: number) {
  const p = flight.pos;
  const fwd = flight.forward;
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();

  // hero orbit around the parked drone; drone framed right of centre
  introAngle += dt * 0.07;
  const orbit = new THREE.Vector3(Math.cos(introAngle) * 6.5, 1.6, Math.sin(introAngle) * 6.5).add(p);
  const toDrone = p.clone().sub(orbit).setY(0).normalize();
  const right = new THREE.Vector3().crossVectors(toDrone, up);
  const introPos = orbit;
  const introLook = p.clone().addScaledVector(right, window.innerWidth > 800 ? -2.6 : 0).add(new THREE.Vector3(0, window.innerWidth > 800 ? 0.6 : 2.2, 0));

  // chase / wide / top-down
  const speedPull = 1 + Math.max(0, flight.v) / 25;
  const modes = [
    { pos: p.clone().addScaledVector(fwd, -7 * speedPull).addScaledVector(up, 2.4), look: p.clone().addScaledVector(fwd, 5).addScaledVector(up, 0.4) },
    { pos: p.clone().addScaledVector(fwd, -26).addScaledVector(up, 11).addScaledVector(right, 8), look: p.clone() },
    { pos: p.clone().addScaledVector(up, 55).addScaledVector(fwd, -6), look: p.clone() },
  ];
  const chase = modes[camMode];

  if (mode === 'intro') {
    pos.copy(introPos);
    look.copy(introLook);
  } else if (mode === 'launch' && launchT < 1) {
    // low hero angle on the pad while it spools, then swing up behind it
    const low = p.clone().addScaledVector(fwd, 7).addScaledVector(right, 3).setY(p.y - 0.4);
    const k = THREE.MathUtils.smoothstep(launchT, 0, 1);
    pos.lerpVectors(low, chase.pos, k);
    look.lerpVectors(p.clone().add(new THREE.Vector3(0, 0.5, 0)), chase.look, k);
  } else if (mode === 'result') {
    const a = performance.now() / 6000;
    pos.copy(p).add(new THREE.Vector3(Math.cos(a) * 9, 4, Math.sin(a) * 9));
    look.copy(p);
  } else {
    pos.copy(chase.pos);
    look.copy(chase.look);
  }
  return { pos, look };
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let elapsed = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  elapsed += dt;

  if (mode === 'launch') {
    launchT = Math.min(1, launchT + dt / 5.5);
  }
  const ev = flight.update(dt, input(), world);
  if (ev) {
    if (ev.type === 'control') {
      mode = 'flying';
      document.body.classList.remove('cinematic');
      toast('You have control', 'Fly to any orange beacon and land on the pad');
    } else if (ev.type === 'touchdown') toast('Touchdown', 'Not a delivery site. Press W to lift off');
    else if (ev.type === 'boundary') toast('Edge of the operating area');
    else if (ev.type === 'landed' || ev.type === 'crashed') {
      document.body.classList.add('cinematic');
      if (ev.type === 'landed') toast('Parcel delivered', ev.site.name, 1800);
      showResult(ev);
    }
  }

  // drone pose
  drone.root.position.copy(flight.pos);
  drone.root.rotation.set(flight.pitch, flight.yaw, flight.roll, 'YXZ');
  drone.props.forEach((p, i) => (p.rotation.z += (i ? -1 : 1) * flight.spin * dt * 60));
  drone.strobe.visible = flight.spin > 0.2 && elapsed % 1.2 < 0.08;
  world.update(elapsed);

  // camera with damping + a little handheld drift
  const { pos, look } = cameraTargets(dt);
  const lag = mode === 'intro' ? 2 : mode === 'launch' ? 5 : 3.5;
  if (!camInit) { camPos.copy(pos); camLook.copy(look); camInit = true; }
  camPos.lerp(pos, 1 - Math.exp(-lag * dt));
  camLook.lerp(look, 1 - Math.exp(-(lag + 2) * dt));
  const shake = 0.04 + Math.max(0, flight.v) * 0.002;
  camera.position.copy(camPos).add(new THREE.Vector3(Math.sin(elapsed * 1.3) * shake, Math.sin(elapsed * 1.7 + 1) * shake, 0));
  camera.lookAt(camLook);
  const targetFov = mode === 'flying' ? 50 + Math.max(0, flight.v) * 0.5 : 42;
  camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-2 * dt));
  camera.updateProjectionMatrix();

  // shadows follow the drone
  sun.position.copy(flight.pos).addScaledVector(sunDir, 150);
  sun.target.position.copy(flight.pos);

  if (mode !== 'intro') updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// expose for automated tests
(window as unknown as { __airbound: unknown }).__airbound = { flight, world, get mode() { return mode; } };
