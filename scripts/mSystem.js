//MISILE SYSTEM
import * as THREE from 'three';
import { mi } from './assets.js'; // missile asset 
import { GLTFLoader }      from 'three/addons/loaders/GLTFLoader.js';
let missileModel = null;
const _loader = new GLTFLoader();
const TRAIL_LENGTH = 20; // number of trail segments
const base64Data = mi.includes(',') ? mi.split(',')[1] : mi;
const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
_loader.parse(binary, '', (gltf) => { missileModel = gltf.scene; });
//  Shared missile array — imported by radar.js too.
//  Both files must resolve to the same module instance, so keep
//  the import path in radar.js identical to the one in index.html.
function playSound(url) {
  new Audio(url).play();
}
// ─────────────────────────────────────────────────────────────────
export const missiles = [];

// ─────────────────────────────────────────────────────────────────
//  breakLock(targetPlane, chance)
// ─────────────────────────────────────────────────────────────────
export function breakLock(targetPlane, chance) {
    for (const m of missiles) {
        if (m.userData.target === targetPlane && Math.random() < chance) {
            m.userData.target = null;
            // Make it fly straight for a bit before it can "re-acquire" 
            // (or just let it go dumb and explode)
            m.userData.life = Math.min(m.userData.life, 60); // It dies soon
        }
    }
}

// ── Tuning ────────────────────────────────────────────────────────
const MISSILE_SPEED      = 90;
const MISSILE_LIFE       = 680;
const PN_GAIN            = 3;
const TURN_RATE          = 0.04;  // lower = easier to dodge
const BOOST_DELAY        = 240;    // frames to reach full speed
const ARM_DISTANCE       = 80;    // units before homing activates
const PURE_PURSUIT_DIST  = 200;   // switch to pure pursuit inside this range

// ── Pre-allocated math objects ────────────────────────────────────
const _fwd      = new THREE.Vector3(0, 0, -1);
const _dir      = new THREE.Vector3();
const _los      = new THREE.Vector3();
const _losDelta = new THREE.Vector3();
const _qTarget  = new THREE.Quaternion();

// ─────────────────────────────────────────────────────────────────
//  fireMissile
// ─────────────────────────────────────────────────────────────────
export function fireMissile(sourcePlane, targetPlane, scene, isIncoming = false) {
    if (!sourcePlane || !sourcePlane.visible) return;

    let mesh;
    if (missileModel) {
        mesh = missileModel.clone();
        mesh.traverse(c => {
            if (c.isMesh) {
                c.material = c.material.clone();
                if (isIncoming) c.material.color?.setHex(0xff8800);
            }
        });
    } else {
        // Fallback to cylinder if model hasn't loaded yet
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: isIncoming ? 0xff8800 : 0xff3300 });
        mesh = new THREE.Mesh(geo, mat);
    }

    mesh.position.copy(sourcePlane.position);
    mesh.rotateX(Math.PI / 2); // adjust axis if still off
    mesh.quaternion.copy(sourcePlane.quaternion);

    const offset = new THREE.Vector3(0, -2, 0).applyQuaternion(sourcePlane.quaternion);
    mesh.position.add(offset);

    mesh.userData = {
        target:     targetPlane,
        life:       MISSILE_LIFE,
        speed:      MISSILE_SPEED,
        isIncoming,
        prevLos:    null,
        armed:      false,
        birthPos:   mesh.position.clone(),
    };

    scene.add(mesh);
    playSound('./assets/audio/aim9lock.mp3');
    // Create trail
const trailGeo = new THREE.BufferGeometry();
const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
const trailMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
});
const trail = new THREE.Line(trailGeo, trailMat);
scene.add(trail);

mesh.userData.trail = trail;
mesh.userData.trailPositions = Array(TRAIL_LENGTH).fill(null).map(() => mesh.position.clone());
    missiles.push(mesh);
}

// ─────────────────────────────────────────────────────────────────
//  updateMissiles — call once per frame
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
//  updateMissiles — call once per frame
// ─────────────────────────────────────────────────────────────────
export function updateMissiles(scene, remotePlane, getTerrainHeight, createExplosion, socket) {
    for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i];
        if (!m) continue;

        m.userData.life--;
        const tgt = m.userData.target;

        // 1. Arming check
        if (!m.userData.armed) {
            if (m.position.distanceTo(m.userData.birthPos) > ARM_DISTANCE) {
                m.userData.armed = true;
            }
        }

        // Calculate speed early so we can use it for G-Limits
        const age = MISSILE_LIFE - m.userData.life;
        const speed = m.userData.speed * Math.min(1, age / BOOST_DELAY);

        // 2. Pre-movement distance (for proximity fuse)
        const distBefore = tgt ? m.position.distanceTo(tgt.position) : 99999;

        let lostLock = false;

        // 3. Seeker Cone & Homing Logic
        if (m.userData.armed && tgt && tgt.visible) {
            // MOVED UP: Calculate LOS *first* so the seeker check works!
            _los.subVectors(tgt.position, m.position).normalize();

            const missileForward = new THREE.Vector3(0, 0, -1).applyQuaternion(m.quaternion);
            const dot = missileForward.dot(_los);

            // SEEKER CHECK: If target is > 60 degrees off the nose, it flew past or was out-turned
            if (dot < 0.5) { 
                m.userData.target = null;
                lostLock = true; // Flag it to explode!
                console.log("Missile flew past and lost track! Detonating.");
            } else {
                // HOMING LOGIC (Only runs if we still have lock)
                const dist = distBefore;
                let currentTurnRate = TURN_RATE; 
                if (dist < 1000) {
                    currentTurnRate = THREE.MathUtils.mapLinear(dist, 1000, 50, TURN_RATE, 0.12);
                }

                if (dist < PURE_PURSUIT_DIST) {
                    _qTarget.setFromUnitVectors(_fwd, _los);
                } else {
                    if (m.userData.prevLos) {
                        _losDelta.subVectors(_los, m.userData.prevLos);
                        _dir.copy(_los).addScaledVector(_losDelta, PN_GAIN).normalize();
                        _qTarget.setFromUnitVectors(_fwd, _dir);
                    } else {
                        _qTarget.setFromUnitVectors(_fwd, _los);
                    }
                }

                // Apply G-limits based on speed
                const speedFactor = speed / MISSILE_SPEED; 
                let dynamicTurnRate = currentTurnRate / (1 + speedFactor); 

                m.quaternion.slerp(_qTarget, dynamicTurnRate);
                m.userData.prevLos = _los.clone();
            }
        }

        // 4. Movement
        _dir.copy(_fwd).applyQuaternion(m.quaternion);
        m.position.addScaledVector(_dir, speed);

        // 5. Trail Update
        if (m.userData.trail) {
            m.userData.trailPositions.pop();
            m.userData.trailPositions.unshift(m.position.clone());
            const positions = m.userData.trail.geometry.attributes.position;
            for (let j = 0; j < TRAIL_LENGTH; j++) {
                const p = m.userData.trailPositions[j];
                positions.setXYZ(j, p.x, p.y, p.z);
            }
            positions.needsUpdate = true;
        }

        // 6. Collision & Proximity Logic
        const distAfter = tgt ? m.position.distanceTo(tgt.position) : 99999;
        const HIT_RADIUS = 30; 
        const PROX_RADIUS = 30; 

        const gh = getTerrainHeight(m.position.x, m.position.z);
        const hitGnd = m.position.y <= gh;

        // PROXIMITY FUSE
        const proximityDetonation = tgt && tgt.visible && (
            distAfter < HIT_RADIUS || 
            (distBefore < PROX_RADIUS && distAfter > distBefore)
        );

        // 7. Cleanup & Explosion
        // ADDED `lostLock`: If it loses track (flies past), it blows up immediately
        if (hitGnd || proximityDetonation || lostLock || m.userData.life <= 0) {
            createExplosion(m.position.clone(), scene, THREE);

            if (proximityDetonation && socket) {
                if (!m.userData.isIncoming) socket.emit('playerHit');
                else socket.emit('missileDodged'); 
            } else if (lostLock && m.userData.isIncoming && socket) {
                // Optional: Let the server know the player successfully dodged it
                socket.emit('missileDodged');
            }

            // Remove Missile
            scene.remove(m);
            m.traverse(c => {
                if (c.isMesh) {
                    c.geometry.dispose();
                    c.material.dispose();
                }
            });

            // Remove Trail
            if (m.userData.trail) {
                scene.remove(m.userData.trail);
                m.userData.trail.geometry.dispose();
                m.userData.trail.material.dispose();
            }

            missiles.splice(i, 1);
        }
    }
}