//RADAR SYSTEM
import * as THREE from 'three';

// Import path MUST match the one used in index.html so both share
// the exact same module instance (and the same missiles array).
import { missiles } from './mSystem.js';

const _rel  = new THREE.Vector3();
const _qInv = new THREE.Quaternion();

// Dots drawn this frame — used for click-to-lock
let radarTargets = [];

const RADAR_RANGE = 10000;
const CENTER      = 90;

// ─────────────────────────────────────────────────────────────────
//  radar(onTargetClicked)
//  Call once at startup to wire up click-to-lock on the radar.
// ─────────────────────────────────────────────────────────────────
export function radar(onTargetClicked) {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
        const rect   = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        for (const t of radarTargets) {
            if (Math.hypot(t.ex - clickX, t.ey - clickY) < 15) {
                if (onTargetClicked) onTargetClicked(t.plane);
                break;
            }
        }
    });
}

// ─────────────────────────────────────────────────────────────────
//  updateRadar(localPlane, remotePlane, lockedTarget)
//  Call once per frame.
//
//  missiles is imported directly — no need to pass it as an argument.
//
//  Dot colours:
//    cyan   = enemy plane (locked)
//    red    = enemy plane (unlocked)
//    yellow = your missile
//    orange = incoming missile
// ─────────────────────────────────────────────────────────────────
export function updateRadar(localPlane, remotePlane, lockedTarget) {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    radarTargets = [];

    ctx.clearRect(0, 0, 180, 180);

    // Static range rings
    ctx.strokeStyle = 'rgba(0,255,0,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 40, 0, Math.PI * 2);
    ctx.arc(CENTER, CENTER, 80, 0, Math.PI * 2);
    ctx.stroke();

    if (!localPlane) return;

    // Inverse of local plane's rotation — projects world coords into
    // the plane's local frame so "up" on radar = plane's nose.
    _qInv.copy(localPlane.quaternion).invert();

    // ── Helper ─────────────────────────────────────────────────────
    function toRadar(worldPos) {
        _rel.subVectors(worldPos, localPlane.position).applyQuaternion(_qInv);
        const dist2D = Math.hypot(_rel.x, _rel.z);
        if (dist2D >= RADAR_RANGE) return null;
        const r     = (dist2D / RADAR_RANGE) * 80; // max 80 px (inner edge of border)
        const angle = Math.atan2(_rel.x, -_rel.z);
        return {
            ex: CENTER + Math.sin(angle) * r,
            ey: CENTER - Math.cos(angle) * r,
        };
    }

    // ── Enemy plane ────────────────────────────────────────────────
    if (remotePlane && remotePlane.visible) {
        const pt = toRadar(remotePlane.position);
        if (pt) {
            const { ex, ey } = pt;
            const dist = Math.round(localPlane.position.distanceTo(remotePlane.position));

            radarTargets.push({ ex, ey, plane: remotePlane });

            ctx.fillStyle = lockedTarget === remotePlane ? '#00ffff' : '#ff0000';
            ctx.beginPath();
            ctx.arc(ex, ey, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#00ff00';
            ctx.font      = '10px Courier New';
            ctx.fillText(`${dist}ft`, ex + 7, ey + 4);

            if (lockedTarget === remotePlane) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth   = 1;
                ctx.strokeRect(ex - 6, ey - 6, 12, 12);
            }
        }
    }

    // ── Missiles ───────────────────────────────────────────────────
    for (const m of missiles) {
        const pt = toRadar(m.position);
        if (!pt) continue;
        ctx.fillStyle = m.userData.isIncoming ? '#ff8800' : '#ffff00';
        ctx.beginPath();
        ctx.arc(pt.ex, pt.ey, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}