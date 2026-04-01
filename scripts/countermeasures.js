//2ND PART MISSILE SYSTEM FOR FLARES
import * as THREE from 'three';

// ── Tuning ────────────────────────────────────────────────────────
const FLARE_COUNT        = 20;    // particles per burst
const FLARE_LIFE         = 120;  // frames each flare lives
const FLARE_SPEED        = 6;    // initial ejection speed
const FLARE_GRAVITY      = 0.18; // drag/gravity per frame
const DEPLOY_COOLDOWN    = 30;   // frames between bursts (~1.5 s at 60 fps)
const LOCK_BREAK_CHANCE  = 0.65; // 45 % chance to break missile lock per burst

// ── State ─────────────────────────────────────────────────────────
const flares      = [];   // active flare particles
let   cooldown    = 0;    // frames until next burst is allowed
let   justDeployed = false; // true for one frame so mSystem can react

// ── Pre-allocated ─────────────────────────────────────────────────
const _spread = new THREE.Vector3();

// ─────────────────────────────────────────────────────────────────
//  deployFlares(plane, scene, THREE)
//
//  Call every frame while the deploy key is held.
//  Internally rate-limited by DEPLOY_COOLDOWN.
//  Returns true the frame a burst actually fires (so mSystem can
//  attempt a lock break on all active incoming missiles).
// ─────────────────────────────────────────────────────────────────
// Add socket as a parameter
export function deployFlares(plane, scene, socket) {
    justDeployed = false;
    if (!plane || !plane.visible || cooldown > 0) return false;

    cooldown     = DEPLOY_COOLDOWN;
    justDeployed = true;

    if (socket) socket.emit('flare', {
        px: plane.position.x,
        py: plane.position.y,
        pz: plane.position.z,
        qx: plane.quaternion.x,
        qy: plane.quaternion.y,
        qz: plane.quaternion.z,
        qw: plane.quaternion.w,
    });

    for (let i = 0; i < FLARE_COUNT; i++) {
        const geo  = new THREE.SphereGeometry(1.2, 4, 4);
        const mat  = new THREE.MeshBasicMaterial({
            color:       0xffaa00,
            transparent: true,
            opacity:     1.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(plane.position);

        _spread.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            -1,   // negative Z = behind in Three.js
        ).normalize().applyQuaternion(plane.quaternion);

        flares.push({
            mesh,
            vel:  _spread.clone().multiplyScalar(FLARE_SPEED),
            life: FLARE_LIFE,
        });

        scene.add(mesh);
    }

    return true;
}

// ─────────────────────────────────────────────────────────────────
//  updateFlares(scene)
//
//  Call once per frame in your update loop.
//  Ticks cooldown, moves particles, fades them out, removes dead ones.
// ─────────────────────────────────────────────────────────────────
export function updateFlares(scene) {
    if (cooldown > 0) cooldown--;

    for (let i = flares.length - 1; i >= 0; i--) {
        const f = flares[i];
        f.life--;

        // Gravity + drag
        f.vel.y          -= FLARE_GRAVITY;
        f.vel.multiplyScalar(0.97);
        f.mesh.position.add(f.vel);

        // Fade out over lifetime
        f.mesh.material.opacity = f.life / FLARE_LIFE;

        if (f.life <= 0) {
            scene.remove(f.mesh);
            f.mesh.geometry.dispose();
            f.mesh.material.dispose();
            flares.splice(i, 1);
        }
    }
}

// ─────────────────────────────────────────────────────────────────
//  getCooldownFraction()
//  Returns 0.0 (reloading) → 1.0 (ready) for the HUD display.
// ─────────────────────────────────────────────────────────────────
export function getCooldownFraction() {
    return 1 - Math.min(cooldown / DEPLOY_COOLDOWN, 1);
}

// ─────────────────────────────────────────────────────────────────
//  getLockBreakChance()
//  Exported so mSystem.js can use the same constant.
// ─────────────────────────────────────────────────────────────────
export { LOCK_BREAK_CHANCE };


// ─────────────────────────────────────────────────────────────────
//  spawnRemoteFlares(data, scene)
//
//  Call this when you receive a 'flare' event from the server.
//  data: { px, py, pz, qx, qy, qz, qw }
// ─────────────────────────────────────────────────────────────────
export function spawnRemoteFlares(data, scene) {
    const position   = new THREE.Vector3(data.px, data.py, data.pz);
    const quaternion = new THREE.Quaternion(data.qx, data.qy, data.qz, data.qw);

    for (let i = 0; i < FLARE_COUNT; i++) {
        const geo  = new THREE.SphereGeometry(1.2, 4, 4);
        const mat  = new THREE.MeshBasicMaterial({
            color:       0xffaa00,
            transparent: true,
            opacity:     1.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);

        _spread.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            1,
        ).normalize().applyQuaternion(quaternion);

        flares.push({
            mesh,
            vel:  _spread.clone().multiplyScalar(FLARE_SPEED),
            life: FLARE_LIFE,
        });

        scene.add(mesh);
    }
}