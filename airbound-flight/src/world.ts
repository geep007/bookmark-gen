import * as THREE from 'three';

export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  h: number;
}

export interface Site {
  id: string;
  name: string;
  kind: string;
  pos: THREE.Vector3; // pad centre, y = surface height
  beacon: THREE.Mesh;
  ring: THREE.Mesh;
}

export interface World {
  group: THREE.Group;
  buildings: Footprint[];
  sites: Site[];
  hub: THREE.Vector3; // pad centre on the hub roof
  /** Highest surface under (x, z) that the drone is above (or at). */
  surfaceAt(x: number, z: number, y: number): number;
  /** Building the point is inside of (wall hit), if any. */
  insideBuilding(x: number, z: number, y: number, margin: number): Footprint | null;
  update(t: number): void;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SITE_DEFS = [
  { id: 'clinic', name: 'Lakeside Clinic', kind: 'Rooftop pad', x: 270, z: -330, roof: 18 },
  { id: 'home', name: 'Green Lane Home', kind: 'Garden drop', x: -300, z: -190, roof: 0 },
  { id: 'market', name: 'Market Square', kind: 'Plaza drop', x: 160, z: 280, roof: 0 },
  { id: 'tower', name: 'Tech Park Tower', kind: 'Rooftop pad', x: -210, z: 340, roof: 34 },
];

const HUB_HEIGHT = 12;

export function buildWorld(): World {
  const rng = mulberry32(7);
  const group = new THREE.Group();
  const buildings: Footprint[] = [];

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshStandardMaterial({ color: 0x5d6656, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const block = 46;
  const street = 14;
  const pitch = block + street;
  const N = 11;

  // roads
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.95 });
  const roadLen = pitch * (2 * N + 1);
  const roads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 1), roadMat, (2 * N + 2) * 2);
  const m = new THREE.Matrix4();
  let ri = 0;
  for (let i = -N; i <= N + 1; i++) {
    const c = i * pitch - pitch / 2;
    m.compose(new THREE.Vector3(c, 0.02, 0), new THREE.Quaternion(), new THREE.Vector3(street, 1, roadLen));
    roads.setMatrixAt(ri++, m);
    m.compose(new THREE.Vector3(0, 0.025, c), new THREE.Quaternion(), new THREE.Vector3(roadLen, 1, street));
    roads.setMatrixAt(ri++, m);
  }
  roads.receiveShadow = true;
  group.add(roads);

  const clear = [{ x: 0, z: 0, r: 34 }, ...SITE_DEFS.map((s) => ({ x: s.x, z: s.z, r: s.roof ? 22 : 36 }))];
  const palette = [0xd9d3c7, 0xbfc3c8, 0xe6dccb, 0x9aa1a8, 0xc9b9a3, 0x7f8890].map((c) => new THREE.Color(c));

  type Lot = { x: number; z: number; w: number; d: number; h: number; color: THREE.Color };
  const lots: Lot[] = [];
  for (let gx = -N; gx <= N; gx++) {
    for (let gz = -N; gz <= N; gz++) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const x = gx * pitch + (sx * block) / 4;
          const z = gz * pitch + (sz * block) / 4;
          if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
          if (rng() < 0.14) continue;
          const dist = Math.hypot(x - 60, z + 80);
          const downtown = Math.max(0, 1 - dist / 420);
          const h = 6 + rng() * 14 + downtown * downtown * rng() * 70;
          lots.push({ x, z, w: 12 + rng() * 9, d: 12 + rng() * 9, h, color: palette[Math.floor(rng() * palette.length)] });
        }
      }
    }
  }

  // site buildings (rooftop pads) and the hub
  const hub = new THREE.Vector3(0, HUB_HEIGHT, 0);
  lots.push({ x: 0, z: 0, w: 26, d: 26, h: HUB_HEIGHT, color: new THREE.Color(0x8d949c) });
  for (const s of SITE_DEFS) {
    if (s.roof) lots.push({ x: s.x, z: s.z, w: 24, d: 24, h: s.roof, color: new THREE.Color(0xb7bcc2) });
  }

  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.05 });
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  bGeo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(bGeo, bMat, lots.length);
  lots.forEach((l, i) => {
    m.compose(new THREE.Vector3(l.x, 0, l.z), new THREE.Quaternion(), new THREE.Vector3(l.w, l.h, l.d));
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, l.color);
    buildings.push({ minX: l.x - l.w / 2, maxX: l.x + l.w / 2, minZ: l.z - l.d / 2, maxZ: l.z + l.d / 2, h: l.h });
  });
  inst.castShadow = true;
  inst.receiveShadow = true;
  group.add(inst);

  // trees around the ground-level sites
  const treeGeo = new THREE.ConeGeometry(1.6, 5, 7);
  treeGeo.translate(0, 3.2, 0);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x3f6b35, roughness: 1 }), 60);
  let ti = 0;
  for (const s of SITE_DEFS.filter((d) => !d.roof)) {
    for (let k = 0; k < 30 && ti < 60; k++) {
      const a = rng() * Math.PI * 2;
      const r = 12 + rng() * 18;
      m.compose(new THREE.Vector3(s.x + Math.cos(a) * r, 0, s.z + Math.sin(a) * r), new THREE.Quaternion(),
        new THREE.Vector3(1, 0.8 + rng() * 0.6, 1));
      trees.setMatrixAt(ti++, m);
    }
  }
  trees.count = ti;
  trees.castShadow = true;
  group.add(trees);

  // pads
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.6 });
  const markMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff6a1a, emissiveIntensity: 0.4 });
  const makePad = (p: THREE.Vector3, radius: number, lawn: boolean) => {
    if (lawn) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(22, 48), new THREE.MeshStandardMaterial({ color: 0x4e7a3a, roughness: 1 }));
      l.rotation.x = -Math.PI / 2;
      l.position.set(p.x, p.y + 0.03, p.z);
      l.receiveShadow = true;
      group.add(l);
    }
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.08, 48), padMat);
    pad.position.set(p.x, p.y + 0.04, p.z);
    pad.receiveShadow = true;
    group.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.45, radius - 0.15, 64), markMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, p.y + 0.09, p.z);
    group.add(ring);
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.9, 0.02, 0.28), markMat);
      bar.position.set(p.x, p.y + 0.09, p.z);
      bar.rotation.y = a;
      group.add(bar);
    }
    return ring;
  };
  makePad(hub, 4, false);

  const sites: Site[] = SITE_DEFS.map((d) => {
    const pos = new THREE.Vector3(d.x, d.roof, d.z);
    const ring = makePad(pos, 4.5, !d.roof);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.9, 120, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff7a2e, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    beacon.position.set(d.x, d.roof + 60, d.z);
    group.add(beacon);
    return { id: d.id, name: d.name, kind: d.kind, pos, beacon, ring };
  });

  const inFp = (b: Footprint, x: number, z: number, margin: number) =>
    x > b.minX - margin && x < b.maxX + margin && z > b.minZ - margin && z < b.maxZ + margin;

  return {
    group,
    buildings,
    sites,
    hub,
    surfaceAt(x, z, y) {
      let s = 0;
      for (const b of buildings) if (b.h > s && b.h <= y + 0.6 && inFp(b, x, z, 0)) s = b.h;
      return s;
    },
    insideBuilding(x, z, y, margin) {
      for (const b of buildings) if (y < b.h - 0.3 && inFp(b, x, z, margin)) return b;
      return null;
    },
    update(t) {
      for (const s of sites) {
        const k = 0.14 + 0.07 * Math.sin(t * 2 + s.pos.x);
        (s.beacon.material as THREE.MeshBasicMaterial).opacity = k;
      }
    },
  };
}
