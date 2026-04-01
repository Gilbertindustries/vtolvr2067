export const sleep = ms => new Promise(r => setTimeout(r, ms));
export   async function toggleElement() {
            await sleep(200);
            const el = document.getElementById('setup-box');
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

let planescale = 1
console.log('planescale set to', planescale);
import Stats from 'https://unpkg.com/three@0.160.0/examples/jsm/libs/stats.module.js';

export function fpsCounter(renderer) {
    document.body.appendChild(renderer.domElement);
        var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
console.log('stats.js initialized');
window.stats = stats; // Expose stats to the global scope for access in the animation loop
}

import { PLANE_GLB } from "./assets.js";
export function loadPlaneModel(color, visible, startY, onLoad, scene, THREE, GLTFLoader) {
    const binary = atob(PLANE_GLB);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
console.log('Loading plane model from GLB data...');
  // Inside misc.js -> loadPlaneModel function
new GLTFLoader().load(url, (gltf) => {
    const pivot = new THREE.Group(); 
    const model = gltf.scene;
    
    model.rotation.set(0, -Math.PI / 2, 0); // This turns the model
    model.scale.set(2.5*planescale, 2.5*planescale, 2.5*planescale);

    // --- THE FIX ---
    // Since you rotated it -90 degrees on Y, 
    // the "Length" of the plane is now on the X axis.
    // Try a value between -5 and 5 to slide the body 
    // until the cockpit/wings are centered on the pivot.
    model.position.z = -5.0*planescale; 
    // ----------------

    pivot.add(model);
    pivot.position.y = startY;
    pivot.visible = visible;
    scene.add(pivot);
    console.log('Plane model loaded and added to scene');
    URL.revokeObjectURL(url);
    onLoad(pivot); 
});
    
}
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
export function tGENmath(){
          const hash = (x, y) => {
            let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
            return n - Math.floor(n);
        };
        const smoothstep = t => t * t * (3 - 2 * t);
        const lerp = (a, b, t) => a + (b - a) * t;

        // Value noise — one octave
        const valueNoise = (x, y) => {
            const ix = Math.floor(x), iy = Math.floor(y);
            const fx = x - ix,        fy = y - iy;
            const ux = smoothstep(fx), uy = smoothstep(fy);
            return lerp(
                lerp(hash(ix, iy),     hash(ix+1, iy),   ux),
                lerp(hash(ix, iy+1),   hash(ix+1, iy+1), ux),
                uy
            );
        };

        // Fractal Brownian Motion — stacks octaves for natural terrain
        const fbm = (x, y, octaves = 7) => {
            let val = 0, amp = 0.5, freq = 1, max = 0;
            for (let i = 0; i < octaves; i++) {
                val += valueNoise(x * freq, y * freq) * amp;
                max += amp;
                amp  *= 0.5;
                freq *= 2.1; // slightly off 2.0 breaks up grid repetition
            }
      
            return val / max;
        };

        // Domain warping — distorts input coords for organic, non-repeating shapes
        const warpedFbm = (x, y) => {
            const wx = fbm(x + 0.0, y + 0.0) * 0.8;
            const wy = fbm(x + 5.2, y + 1.3) * 0.8;
            return fbm(x + wx, y + wy);
        };
        window.hash = hash;
        window.smoothstep = smoothstep;
        window.lerp = lerp;
        window.valueNoise = valueNoise;
        window.fbm = fbm;
        window.warpedFbm = warpedFbm;
}

export function colorTerrian(THREE ){
    
        const colorA = new THREE.Color();
        const colorB = new THREE.Color();
        const biomeColor = (t, raw) => {
            const jitter = (raw - 0.5) * 0.04;
            const h = Math.max(0, Math.min(1, t + jitter));
            if (h > 0.82) {
                return colorA.setHex(0x888888).lerp(colorB.setHex(0xeeeeee), smoothstep((h-0.82)/0.18));
            } else if (h > 0.60) {
                return colorA.setHex(0x4a3f35).lerp(colorB.setHex(0x888888), smoothstep((h-0.60)/0.22));
            } else if (h > 0.42) {
                return colorA.setHex(0x3a5c2a).lerp(colorB.setHex(0x4a3f35), smoothstep((h-0.42)/0.18));
            } else if (h > 0.28) {
                return colorA.setHex(0x4a7c35).lerp(colorB.setHex(0x3a5c2a), smoothstep((h-0.28)/0.14));
            } else if (h > 0.18) {
                return colorA.setHex(0xc2a96e).lerp(colorB.setHex(0x4a7c35), smoothstep((h-0.18)/0.10));
            } else {
                return colorA.setHex(0x063bab);
            }
        };
        window.biomeColor = biomeColor;
}
export   function createTargetHighlight(color, THREE, scene) {
            const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 5, 5));
            const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
            const line = new THREE.LineSegments(geo, mat);
            line.renderOrder = 999; 
            line.onBeforeRender = (renderer) => renderer.clearDepth(); 
            scene.add(line);
            return line;
        }



 export   function createExplosion(position, scene, THREE) {
            const N   = 200;
            const geo = new THREE.BufferGeometry();
            const pos = [], vel = [];
            for (let i = 0; i < N; i++) {
                pos.push(position.x, position.y, position.z);
                vel.push((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2);
            }
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            const mat  = new THREE.PointsMaterial({ color: 0xffaa00, size: 8, transparent: true, opacity: 1, depthWrite: false });
            const pts  = new THREE.Points(geo, mat);
            scene.add(pts);
            
            let life = 1.0;
            (function tick() {
                life -= 0.02;
                const p = geo.attributes.position;
                for (let i = 0; i < N; i++) {
                    p.array[i*3]   += vel[i*3];
                    p.array[i*3+1] += vel[i*3+1];
                    p.array[i*3+2] += vel[i*3+2];
                    vel[i*3+1] -= 0.05;
                }
                p.needsUpdate = true;
                mat.opacity   = life;
                if (life > 0) requestAnimationFrame(tick);
                else { scene.remove(pts); geo.dispose(); mat.dispose(); }
            })();
        }

const _frustum = new THREE.Frustum();
const _mMatrix = new THREE.Matrix4();

export function isInView(target, camera) {
    if (!target || !target.visible) return false;
    _mMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_mMatrix);
    return _frustum.containsPoint(target.position);
}
 // --- COMPASS BAR SETUP ---
  export      function initCompass() {
            const strip = document.getElementById('compass-strip');
            const labels = ['N', '03', '06', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'];
            let html = '';
            
            // Create 3 full loops (1080 degrees total) for seamless wrapping
            for (let i = 0; i < 3; i++) {
                for (let label of labels) {
                    // Each block is 60px wide (representing 30 degrees).
                    // This means 1 degree = 2 pixels of movement.
                    html += `<div style="display:inline-block; width:60px; text-align:center;">
                                <div style="font-size:0.5rem; line-height:0.5;">|</div>
                                ${label}
                             </div>`;
                }
            }
            strip.innerHTML = html;
        }
        // -------------------------


        export function createSplash(pos, scene, THREE,wkh) {
const group = new THREE.Group();
    scene.add(group);

    const dropletCount = 100; 
    const dropGeo = new THREE.IcosahedronGeometry(0.8, 0); 
    const dropMat = new THREE.MeshBasicMaterial({ 
        color: 0x00aaff, 
        transparent: true 
    });

    for (let i = 0; i < dropletCount; i++) {
        const mesh = new THREE.Mesh(dropGeo, dropMat.clone());
        mesh.position.copy(pos);
        
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 8 + 4;
        mesh.userData.vel = new THREE.Vector3(
            Math.cos(angle) * force,
            Math.random() * 20 + 10,
            Math.sin(angle) * force
        );
        group.add(mesh);
    }

    const ringGeo = new THREE.RingGeometry(2, 4, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        side: THREE.DoubleSide 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, wkh+13, pos.z); 
    group.add(ring);

    const duration = 2500; 
    const startTime = performance.now();
    let lastTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const t = elapsed / duration;

        // Calculate delta (time since last frame) in seconds
        // This scales the physics to roughly 60fps equivalent
        const deltaTime = (currentTime - lastTime) / 16.67; 
        lastTime = currentTime;

        if (t < 1) {
            group.children.forEach(child => {
                if (child.userData.vel) {
                    // Multiply movement by deltaTime
                    child.position.x += child.userData.vel.x * deltaTime;
                    child.position.y += child.userData.vel.y * deltaTime;
                    child.position.z += child.userData.vel.z * deltaTime;

                    // Gravity scaled by delta
                    child.userData.vel.y -= 0.5 * deltaTime; 
                    
                    child.material.opacity = 1 - t;
                    child.scale.setScalar(1 - t);
                }
            });

            ring.scale.setScalar(1 + t * 120); 
            ring.material.opacity = (1 - t) * 0.6;

            requestAnimationFrame(animate);
        } else {
            scene.remove(group);
            dropGeo.dispose();
            ringGeo.dispose();
        }
    }
    requestAnimationFrame(animate);
}

export function createAfterburnerEffect(THREE) {
   const group = new THREE.Group();

    // 1. NORMAL ENGINE FLAME (Faint Blue/Purple)
    const normGeo = new THREE.ConeGeometry(0.5, 4, 8);
    normGeo.rotateX(-Math.PI / 2);
    const normMat = new THREE.MeshBasicMaterial({ 
        color: 0x4488ff, 
        transparent: true, 
        opacity: 0.5, 
        blending: THREE.AdditiveBlending 
    });
    const normalFlame = new THREE.Mesh(normGeo, normMat);
    normalFlame.position.set(0, 0, 4);
    group.add(normalFlame);

    // 2. AFTERBURNER CORE (White)
    const coreGeo = new THREE.ConeGeometry(0.8, 12, 8);
    coreGeo.rotateX(-Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0, 8);
    group.add(core);

    // 3. AFTERBURNER OUTER (Orange)
    const flameGeo = new THREE.ConeGeometry(1.5, 20, 12);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0, 12);
    group.add(flame);

    const light = new THREE.PointLight(0xff6600, 0, 50);
    group.add(light);

    return { group, normalFlame, core, flame, light };
}
