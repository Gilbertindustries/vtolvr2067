import {waterBase64} from "./assets.js"; 


export function renderFakeWater(posY, terrainSize, scene, THREE) {
    const loader = new THREE.TextureLoader();
    const waterNormal = loader.load(waterBase64);
    
    // Tiling the normal map to make ripples look small and realistic
    waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;
    waterNormal.repeat.set(128, 128); // Increased tiling for large maps

    // 1. THE SURFACE (Transparent with ripples)
    const waterGeo = new THREE.PlaneGeometry(terrainSize, terrainSize);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x005588,
        normalMap: waterNormal,
        normalScale: new THREE.Vector2(1.5, 1.5),
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.7 // Lowered slightly so you can see the deep "Abyss" color below
    });

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = posY;
    waterMesh.name = "waterSurface";
    
    // Optimization: Since the ocean doesn't move relative to itself
    //dont change it to false the ocean dissapears 
  waterMesh.matrixAutoUpdate = true; 
    scene.add(waterMesh);

    // 2. THE ABYSS (Solid Seafloor to hide the map cutoff)
    // We use MeshBasicMaterial because it's the fastest to render
    const abyssMat = new THREE.MeshBasicMaterial({ 
        color: 0x063bab // A very dark, deep ocean blue
    });
    const abyssMesh = new THREE.Mesh(waterGeo, abyssMat);
    abyssMesh.rotation.x = -Math.PI / 2;
    
    // Place this deep enough that it doesn't flicker with the terrain
    // but high enough to hide the "bottom" of the world.
    abyssMesh.position.y = posY - 500; 
    abyssMesh.name = "oceanAbyss";
    
abyssMesh.matrixAutoUpdate = true; 
    scene.add(abyssMesh);
    // Return them as an object so you can move them with the player in index.html
    return { waterMesh, abyssMesh, waterNormal };
}


export function realWater(Water, terrainSize, sun, scene, THREE,rwater) {
           const waterGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize);
        const water = new Water(waterGeometry, {
            textureWidth:  512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load(
                'https://threejs.org/examples/textures/waternormals.jpg',
                tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
            ),
            sunDirection: sun.clone().normalize(),
            sunColor:     0xffffff,
            waterColor:   0x001e3c,
            distortionScale: 3.7,
        });
        water.rotation.x = -Math.PI / 2;
        water.position.y = 151
        
        if (rwater === true){
            scene.add(water)
        } 
     scene.add(water);
    }
    