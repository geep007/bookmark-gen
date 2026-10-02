import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG } from './config';

// Model frame: nose -Z, wings along X, top +Y (three.js "forward").
// The attitude (yaw / pitch / roll) is applied to `root`.
export interface Drone {
  root: THREE.Group;
  props: THREE.Object3D[];
  tailOffset: number; // distance from centre to the tail it stands on
  strobe: THREE.Mesh;
  loadModel(): Promise<boolean>;
}

export function createDrone(): Drone {
  const root = new THREE.Group();
  const standin = new THREE.Group();
  root.add(standin);

  const carbon = new THREE.MeshPhysicalMaterial({
    color: 0x1a1c20, roughness: 0.38, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.18,
  });
  const accent = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.4 });
  const wingMat = carbon.clone();
  wingMat.side = THREE.DoubleSide;

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = standin) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // blended body pod
  const body = add(new THREE.SphereGeometry(1, 40, 24), carbon);
  body.scale.set(0.17, 0.12, 0.42);

  // swept wings with anhedral
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    // planform in (x, -z): leading edge at negative z
    shape.moveTo(side * 0.1, 0.16);
    shape.lineTo(side * 0.8, -0.1);
    shape.lineTo(side * 0.8, -0.27);
    shape.lineTo(side * 0.1, -0.24);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.024, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.008, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    const wing = add(geo, wingMat);
    wing.rotation.z = side * THREE.MathUtils.degToRad(-7);
    wing.position.y = -0.01;
    // orange tip stripe + downturned tip fin
    const tip = add(new THREE.BoxGeometry(0.02, 0.1, 0.17), accent, wing);
    tip.position.set(side * 0.8, -0.04, 0.18);
    // nav light
    const nav = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2a2a : 0x2aff6a }),
    );
    nav.position.set(side * 0.81, 0.0, 0.1);
    wing.add(nav);
    // ventral fin
    const fin = add(new THREE.BoxGeometry(0.014, 0.17, 0.3), carbon);
    fin.position.set(side * 0.08, -0.13, 0.2);
    fin.rotation.z = side * 0.25;
    // pylon + motor pod
    const pylon = add(new THREE.BoxGeometry(0.022, 0.11, 0.07), carbon);
    pylon.position.set(side * 0.42, 0.07, -0.1);
    const pod = add(new THREE.CylinderGeometry(0.034, 0.03, 0.15, 16), carbon);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.42, 0.13, -0.17);
  }

  // propellers (kept for the GLB too, so they still spin)
  const props: THREE.Object3D[] = [];
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const discMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const hub = new THREE.Group();
    hub.position.set(side * 0.42, 0.13, -0.26);
    root.add(hub);
    const blades = new THREE.Group();
    hub.add(blades);
    for (const a of [0, Math.PI]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.022, 0.008), bladeMat);
      b.position.x = Math.cos(a) * 0.095;
      b.rotation.x = 0.25 * (a ? -1 : 1);
      b.castShadow = true;
      blades.add(b);
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), discMat);
    hub.add(disc);
    props.push(blades);
  }

  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  strobe.position.set(0, 0.05, 0.42);
  root.add(strobe);

  const drone: Drone = {
    root,
    props,
    tailOffset: 0.44,
    strobe,
    async loadModel() {
      try {
        const head = await fetch(CONFIG.modelUrl, { method: 'HEAD' });
        const type = head.headers.get('content-type') ?? '';
        if (!head.ok || type.includes('text/html')) return false;
        const gltf = await new GLTFLoader().loadAsync(CONFIG.modelUrl);
        const model = gltf.scene;
        const [rx, ry, rz] = CONFIG.modelRotationDeg.map(THREE.MathUtils.degToRad);
        model.rotation.set(rx, ry, rz);
        const fix = new THREE.Group();
        fix.add(model);
        fix.updateMatrixWorld(true);
        let box = new THREE.Box3().setFromObject(fix);
        let size = box.getSize(new THREE.Vector3());
        if (size.z > size.x * 1.15) {
          model.rotation.y += Math.PI / 2;
          fix.updateMatrixWorld(true);
          box = new THREE.Box3().setFromObject(fix);
          size = box.getSize(new THREE.Vector3());
        }
        const s = CONFIG.wingspan / size.x;
        const c = box.getCenter(new THREE.Vector3());
        fix.scale.setScalar(s);
        fix.position.copy(c).multiplyScalar(-s);
        model.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        });
        root.remove(standin);
        root.add(fix);
        drone.tailOffset = (box.max.z - c.z) * s;
        return true;
      } catch (err) {
        console.info('[airbound] using stand-in drone:', err);
        return false;
      }
    },
  };
  return drone;
}
