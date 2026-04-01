let lcw = 8000
let hcw = 16000
//low cloud hight
//high cloud height

export function cloudgen(amount, hm, THREE, scene) {
    function makeCloudTexture() {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        const puff = (x, y, r) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0,   'rgba(255,255,255,0.9)');
            g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
            g.addColorStop(1,   'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        };
        puff(128,128,80); puff(80,140,60); puff(176,140,60); puff(104,110,45); puff(152,110,45);
        return new THREE.CanvasTexture(c);
    }

    const tex = makeCloudTexture();
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        alphaTest: 0.01,
    });

    const total = amount + hm;
    const cloudMesh = new THREE.InstancedMesh(geo, mat, total);
    cloudMesh.frustumCulled = false; 
    
    const dummy = new THREE.Object3D();

    // 1. DRAW HIGH CLOUDS FIRST (Indices 0 to hm - 1)
    for (let i = 0; i < hm; i++) {
       dummy.position.set(
        (Math.random() - 0.5) * 400000, // Increased from 160,000 to 400,000
        hcw + (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 400000  // Increased from 160,000 to 400,000
    );
        const s = hcw + Math.random() * 1200;
        dummy.scale.set(s, s * 0.15, 1);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.updateMatrix();
        
        // Put high clouds at the start of the array
        cloudMesh.setMatrixAt(i, dummy.matrix); 
    }

    // 2. DRAW LOW CLOUDS SECOND (Indices hm to total - 1)
    for (let i = 0; i < amount; i++) {
       dummy.position.set(
        (Math.random() - 0.5) * 300000, // Increased from 120,000 to 300,000
        lcw + (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 300000  // Increased from 120,000 to 300,000
    );
        const s = lcw + Math.random() * 600;
        dummy.scale.set(s, s * 0.4, 1);
        dummy.rotation.y = Math.random() * Math.PI * 2; 
        dummy.updateMatrix();
        
        // Put low clouds AFTER the high clouds
        cloudMesh.setMatrixAt(hm + i, dummy.matrix); 
    }

    cloudMesh.instanceMatrix.needsUpdate = true;
    scene.add(cloudMesh);
    return cloudMesh; 
}

import * as THREE from 'three';

export function cloudgenV2(scene, params = {}) {
    const {
        lowCount = 6000,
        highCount = 2000,
        lowAlt = 1600,
        highAlt = 4000,
        lowSpread = 60000,
        highSpread = 80000
    } = params;

    const makeCloudTexture = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        const puff = (x, y, r) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0,   'rgba(255,255,255,0.9)');
            g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
            g.addColorStop(1,   'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        };
        puff(128, 128, 80); puff(80, 140, 60); puff(176, 140, 60); puff(104, 110, 45); puff(152, 110, 45);
        return new THREE.CanvasTexture(c);
    };

    // 1. Create a Material that behaves like a Sprite
    const cloudTexture = makeCloudTexture();
    const cloudMat = new THREE.MeshLambertMaterial({
        map: cloudTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    // This "onBeforeCompile" magic makes each instance face the camera
    cloudMat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            // Extract the scale from the instance matrix
            float scaleX = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
            float scaleY = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
            
            // Lock the position and zero out rotation to face camera
            vec4 instancePostion = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec3 transformed = vec3(position.x * scaleX, position.y * scaleY, 0.0);
            
            // Billboard logic: align with view matrix
            vec4 mvPosition = modelViewMatrix * instancePostion;
            mvPosition.xyz += transformed;
            gl_Position = projectionMatrix * mvPosition;
            `
        ).replace(
            '#include <project_vertex>', 
            `// Logic replaced above`
        );
    };

    const totalCount = lowCount + highCount;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const instancedMesh = new THREE.InstancedMesh(geometry, cloudMat, totalCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < totalCount; i++) {
        const isHigh = i >= lowCount;
        const spread = isHigh ? highSpread : lowSpread;
        const alt = isHigh ? highAlt : lowAlt;
        const varY = isHigh ? 300 : 200;
        
        // Match your original scaling math exactly
        const s = isHigh ? 800 + Math.random() * 1200 : 400 + Math.random() * 600;
        const ratio = isHigh ? 0.15 : 0.4;

        dummy.position.set(
            (Math.random() - 0.5) * spread * 2,
            alt + (Math.random() - 0.5) * varY,
            (Math.random() - 0.5) * spread * 2
        );

        // Scale is stored in the matrix; the shader will extract it
        dummy.scale.set(s, s * ratio, 1);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    scene.add(instancedMesh);
    return instancedMesh;
}
