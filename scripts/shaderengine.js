export function lEngine(renderer, THREE, scene, Sky) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.53; // Your specific exposure
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Makes the edges look smooth/blurry
// --- 2. Sky Setup ---
const sky = new Sky();
sky.scale.setScalar(450000);
//hack to fix the sky being white
//sky.position.y = -190000;
scene.add(sky);

const sun = new THREE.Vector3();
const skyUniforms = sky.material.uniforms;

skyUniforms['turbidity'].value = 2.5; 

// Increase rayleigh to deepen the blue color (try between 1.5 and 3.0)
skyUniforms['rayleigh'].value = 1.246; 

// Set mieCoefficient to 0.0 to COMPLETELY remove the white horizon haze
skyUniforms['mieCoefficient'].value = 0

skyUniforms['mieDirectionalG'].value = 0.7; // Doesn't matter much if mie is 0

// --- 3. Sun Positioning Logic ---
const elevation = 14.8;
const azimuth = 180; // Your azimuth value
//190

const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);

sun.setFromSphericalCoords(1, phi, theta);

// Copy sun position to the Sky shader
skyUniforms['sunPosition'].value.copy(sun);

// --- 4. Physical Light Sources ---
// We use a high intensity DirectionalLight to act as the actual sun for the plane/terrain
const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.copy(sun); 
sunLight.castShadow = true;

// Shadow Camera Setup (The 'box' where shadows will exist)
// Increase these numbers if shadows disappear when you fly too far away
sunLight.shadow.camera.top = 2000;
sunLight.shadow.camera.bottom = -2000;
sunLight.shadow.camera.left = -2000;
sunLight.shadow.camera.right = 2000;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 5000;

// Shadow Resolution (Higher = crisper, but heavier on GPU)
sunLight.shadow.mapSize.width = 2048; 
sunLight.shadow.mapSize.height = 2048;

scene.add(sunLight);
// Hemisphere light provides the "Sky blue" ambient bounce
// Top color: Sky Blue, Bottom color: Ground Brown
const hemiLight = new THREE.HemisphereLight(0x88aacc, 0x443322, 1.0);
scene.add(hemiLight);

// Optional: Ambient fill for deep shadows
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
window.sun = sun
}