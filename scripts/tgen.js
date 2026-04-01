// --- COLLISION & PHYSICS LOGIC (Shared) ---
const COL_RESOLUTION = 50; // Quality of physics. Lower = more accurate but slower load.
let COL_SIZE = 80000;    
let GRID_BINS = 0;
let collisionMap = null;

let mapOriginX = 0;
let mapOriginZ = 0;

export function getTerrainHeight(x, z) {
    if (!collisionMap) return 0;

    // Convert world coordinates to array indices
    const localX = Math.floor((x - mapOriginX) / COL_RESOLUTION);
    const localZ = Math.floor((z - mapOriginZ) / COL_RESOLUTION);
    
    // Boundary check
    if (localX < 0 || localX >= GRID_BINS || localZ < 0 || localZ >= GRID_BINS) {
        return 0; 
    }
    return collisionMap[localZ * GRID_BINS + localX];
}

window.getTerrainHeight = getTerrainHeight;

export function gen(terrainSize, segments, scene, THREE, warpedFbm, biomeColor, TERRAIN_SCALE, TERRAIN_HEIGHT) {
    // 1. Initialize Collision Map to match the actual terrain size
         
         setTimeout(() => {
document.getElementById('loading-msg').innerText = 'Computing collision map...';}, 100);

         console.log('starting collision map generation');
    COL_SIZE = terrainSize;
    GRID_BINS = Math.floor(COL_SIZE / COL_RESOLUTION);
    collisionMap = new Float32Array(GRID_BINS * GRID_BINS);
    mapOriginX = -terrainSize / 2;
    mapOriginZ = -terrainSize / 2;

    const CHUNK_GRID = 16; 
    const chunkSize = terrainSize / CHUNK_GRID;
    const islandRadius = terrainSize * 0.4;
    const fadeWidth = terrainSize * 0.1;

    // 2. FILL COLLISION MAP FIRST
    // This ensures physics match the visual "Island" exactly
    for (let lz = 0; lz < GRID_BINS; lz++) {
        for (let lx = 0; lx < GRID_BINS; lx++) {
            const worldX = mapOriginX + (lx * COL_RESOLUTION);
            const worldZ = mapOriginZ + (lz * COL_RESOLUTION);
            
            const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
            let mask = 1.0;
            if (dist > islandRadius) {
                mask = Math.max(0, 1.0 - (dist - islandRadius) / fadeWidth);
            }

            const raw = warpedFbm(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE);
            collisionMap[lz * GRID_BINS + lx] = Math.pow(raw, 1.8) * TERRAIN_HEIGHT * mask;
        }
    }

    // 3. GENERATE VISUAL MESHES
    const detailLevels = [
        { res: Math.floor(segments / CHUNK_GRID), dist: 0 },
        { res: Math.floor(segments / (CHUNK_GRID * 4)), dist: 8000 },
        { res: 2, dist: 20000 }
    ];
         document.getElementById('loading-msg').innerText = 'Generating visual meshes...';
    const terrainMaterial = new THREE.MeshStandardMaterial({ 
        vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0.0 
    });
console.log('computed collision map and starting visual mesh generation');
    for (let cx = 0; cx < CHUNK_GRID; cx++) {
        for (let cz = 0; cz < CHUNK_GRID; cz++) {
            const lod = new THREE.LOD();
            const offsetX = (cx - CHUNK_GRID / 2 + 0.5) * chunkSize;
            const offsetZ = (cz - CHUNK_GRID / 2 + 0.5) * chunkSize;

            detailLevels.forEach(level => {
                const tGeo = new THREE.PlaneGeometry(chunkSize, chunkSize, level.res, level.res);
                tGeo.rotateX(-Math.PI / 2);
                const posAttr = tGeo.attributes.position;
                const colors = [];

                for (let i = 0; i < posAttr.count; i++) {
                    const vx = posAttr.getX(i) + offsetX;
                    const vz = posAttr.getZ(i) + offsetZ;
                    
                    const distFromCenter = Math.sqrt(vx * vx + vz * vz);
                    let mask = 1.0;
                    if (distFromCenter > islandRadius) {
                        mask = Math.max(0, 1.0 - (distFromCenter - islandRadius) / fadeWidth);
                    }

                    const raw = warpedFbm(vx * TERRAIN_SCALE, vz * TERRAIN_SCALE);
                    const h = Math.pow(raw, 1.8) * TERRAIN_HEIGHT * mask;
                    
                    posAttr.setY(i, h);
                    const col = biomeColor(h / TERRAIN_HEIGHT, raw);
                    colors.push(col.r, col.g, col.b);
                }

                tGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                tGeo.computeVertexNormals();

                const mesh = new THREE.Mesh(tGeo, terrainMaterial);
                mesh.updateMatrix();
                mesh.matrixAutoUpdate = false; 
                lod.addLevel(mesh, level.dist);
            });

            lod.position.set(offsetX, 0, offsetZ);
            scene.add(lod);
        }
    }
}