import * as THREE from 'three';
import { CONFIG, G } from './config';
import type { Site, World } from './world';

export type Phase = 'parked' | 'spool' | 'takeoff' | 'flying' | 'landed' | 'crashed';

export interface Input {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  brake: boolean;
}

export type FlightEvent =
  | { type: 'control' }
  | { type: 'touchdown' }
  | { type: 'landed'; site: Site; offset: number; impact: number; groundSpeed: number; time: number }
  | { type: 'crashed'; reason: string }
  | { type: 'boundary' };

const smooth = (e0: number, e1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const approach = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

/**
 * Simplified tailsitter: hovers nose-up at low speed, pitches over into
 * wing-borne flight as airspeed builds, banks in coordinated turns.
 */
export class Flight {
  pos = new THREE.Vector3();
  yaw = 0;
  v = 0; // forward speed
  vz = 0; // vertical speed
  yawRate = 0;
  pitch = Math.PI / 2;
  roll = 0;
  spin = 0; // 0..1 prop speed
  phase: Phase = 'parked';
  time = 0;
  grounded = true;
  private t = 0;
  private takeoffAlt = 0;
  private start: THREE.Vector3;
  private startYaw: number;

  constructor(start: THREE.Vector3, startYaw: number, private tailOffset: () => number) {
    this.start = start.clone();
    this.startYaw = startYaw;
    this.reset();
  }

  reset(at?: THREE.Vector3) {
    this.pos.copy(at ?? this.start);
    this.pos.y += this.tailOffset();
    this.yaw = at ? this.yaw : this.startYaw;
    this.v = this.vz = this.yawRate = this.roll = 0;
    this.pitch = Math.PI / 2;
    this.spin = 0;
    this.phase = 'parked';
    this.grounded = true;
    this.time = 0;
  }

  takeoff() {
    if (this.phase !== 'parked' && this.phase !== 'landed') return;
    if (this.phase === 'landed') this.time = 0;
    this.phase = 'spool';
    this.t = 0;
    this.takeoffAlt = this.pos.y + CONFIG.takeoffClimb;
  }

  get transition() {
    return smooth(CONFIG.transitionStart, CONFIG.transitionEnd, this.v);
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt: number, input: Input, world: World): FlightEvent | null {
    this.t += dt;
    let event: FlightEvent | null = null;

    switch (this.phase) {
      case 'parked':
      case 'landed':
      case 'crashed':
        this.spin = approach(this.spin, 0, 1.5, dt);
        this.v = approach(this.v, 0, 3, dt);
        this.vz = 0;
        this.roll = approach(this.roll, 0, 4, dt);
        this.pitch = approach(this.pitch, Math.PI / 2, 4, dt);
        return null;
      case 'spool':
        this.spin = Math.min(1, this.t / 1.4);
        if (this.t > 1.6) {
          this.phase = 'takeoff';
          this.grounded = false;
        }
        return null;
      case 'takeoff': {
        const remaining = this.takeoffAlt - this.pos.y;
        this.vz = approach(this.vz, THREE.MathUtils.clamp(remaining * 0.6, 0, 6), 3, dt);
        this.pos.y += this.vz * dt;
        this.applyGust(dt, 0.6);
        this.time += dt;
        if (remaining < 0.6) {
          this.phase = 'flying';
          event = { type: 'control' };
        }
        return event;
      }
    }

    // ---- flying ----
    this.time += dt;
    this.spin = 1;
    const c = CONFIG;
    if (input.forward) this.v += c.accel * dt * (this.grounded ? 0 : 1);
    if (input.back || input.brake) this.v -= c.brake * dt * Math.sign(this.v || 1) * (input.brake ? 1.4 : 1);
    if (input.back && this.v <= 0.2) this.v = Math.max(this.v - 2 * dt, -c.maxReverse);
    if (!input.forward && !input.back) this.v *= Math.exp(-(this.transition > 0.5 ? 0.04 : 0.6) * dt);
    if (input.brake && Math.abs(this.v) < 0.3) this.v = 0;
    this.v = THREE.MathUtils.clamp(this.v, -c.maxReverse, c.maxSpeed);

    const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const maxYaw = THREE.MathUtils.lerp(c.yawRateHover, c.yawRateCruise, this.transition);
    this.yawRate = approach(this.yawRate, turn * maxYaw, 4, dt);
    this.yaw += this.yawRate * dt;

    const climb = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    // landing protection: descent rate is limited close to the surface below
    const tailNow = this.tailOffset();
    const agl = this.pos.y - tailNow - world.surfaceAt(this.pos.x, this.pos.z, this.pos.y - tailNow);
    const maxDescent = THREE.MathUtils.clamp(0.9 + agl * 0.35, 0.9, c.climbRate);
    this.vz = approach(this.vz, Math.max(climb * c.climbRate, -maxDescent), 3, dt);
    // wing-borne flight with no climb input slowly trims to level
    const prevY = this.pos.y;
    const prev = this.pos.clone();
    this.pos.addScaledVector(this.forward, this.v * dt);
    this.pos.y += this.vz * dt;
    this.applyGust(dt, 1 - this.transition);

    // attitude: hover nose-up, pitch over with speed; climb raises the nose
    const k = this.transition;
    const hoverPitch = Math.PI / 2 - THREE.MathUtils.degToRad(this.v * 1.6);
    const cruisePitch = THREE.MathUtils.degToRad(5) + this.vz * 0.03;
    this.pitch = approach(this.pitch, THREE.MathUtils.lerp(hoverPitch, cruisePitch, k), 2.5, dt);
    const bank = Math.atan((this.v * this.yawRate) / G);
    this.roll = approach(this.roll, THREE.MathUtils.clamp(bank, -0.8, 0.8) * (0.3 + 0.7 * k), 3, dt);

    // collisions
    const tail = this.tailOffset();
    const wall = world.insideBuilding(this.pos.x, this.pos.z, this.pos.y - tail, 0.6);
    if (wall && prevY - tail >= wall.h - 0.35) {
      // came from above: it's a roof, handled as a surface below
    } else if (wall) {
      if (Math.abs(this.v) > 4) return this.crash('Hit a building');
      this.pos.x = prev.x;
      this.pos.z = prev.z;
      this.v = 0;
    }

    const surface = world.surfaceAt(this.pos.x, this.pos.z, prevY - tail);
    if (this.pos.y - tail <= surface) {
      const impact = Math.max(0, -this.vz);
      const groundSpeed = Math.abs(this.v);
      if (impact > c.maxImpact + 2.5 || groundSpeed > c.maxGroundSpeed + 4) return this.crash('Hit the ground too fast');
      this.pos.y = surface + tail;
      const site = this.siteAt(world);
      if (site && !this.grounded) {
        const offset = Math.hypot(this.pos.x - site.pos.x, this.pos.z - site.pos.z);
        if (impact <= c.maxImpact && groundSpeed <= c.maxGroundSpeed && Math.abs(surface - site.pos.y) < 0.5) {
          this.phase = 'landed';
          this.grounded = true;
          this.v = 0;
          this.vz = 0;
          return { type: 'landed', site, offset, impact, groundSpeed, time: this.time };
        }
      }
      if (impact > c.maxImpact || groundSpeed > c.maxGroundSpeed) return this.crash('Hard landing');
      if (!this.grounded) event = { type: 'touchdown' };
      this.grounded = true;
      this.vz = Math.max(this.vz, 0);
      this.v *= Math.exp(-6 * dt);
    } else if (this.pos.y - tail > surface + 0.3) {
      this.grounded = false;
    }

    if (Math.hypot(this.pos.x, this.pos.z) > c.worldLimit) {
      const back = new THREE.Vector3(this.pos.x, 0, this.pos.z).normalize().multiplyScalar(c.worldLimit);
      this.pos.x = back.x;
      this.pos.z = back.z;
      this.v *= 0.5;
      event = { type: 'boundary' };
    }
    if (this.pos.y > 220) this.pos.y = 220;
    return event;
  }

  private siteAt(world: World): Site | null {
    for (const s of world.sites) {
      if (Math.hypot(this.pos.x - s.pos.x, this.pos.z - s.pos.z) <= CONFIG.siteRadius) return s;
    }
    return null;
  }

  private crash(reason: string): FlightEvent {
    this.phase = 'crashed';
    this.v = 0;
    this.vz = 0;
    this.roll = 1.2;
    return { type: 'crashed', reason };
  }

  private applyGust(dt: number, strength: number) {
    const t = performance.now() / 1000;
    const gx = (Math.sin(t * 0.7) + Math.sin(t * 1.9 + 1.3) * 0.5) * 0.25 * strength;
    const gz = (Math.sin(t * 0.5 + 2.1) + Math.sin(t * 1.7) * 0.5) * 0.25 * strength;
    this.pos.x += gx * dt;
    this.pos.z += gz * dt;
  }
}
