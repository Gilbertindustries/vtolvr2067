import { treescalefactor } from "./clientconfig.js";
//OLD CODE
export function addForestV1(count, terrainSize, getTerrainHeight, scene, THREE, mergeGeometries, wkh) {
    // 1. Setup Geometries
    // CHANGED: Reduced segment count from 5 to 3 for both Cylinder and Cone
    const trunkGeo = new THREE.CylinderGeometry(1 * treescalefactor, 1.5 * treescalefactor, 6 * treescalefactor, 3);
    const leafGeo  = new THREE.ConeGeometry(5 * treescalefactor, 12 * treescalefactor, 3);
    
    // Move the leaves up so they sit on top of the trunk
    leafGeo.translate(0, 7 * treescalefactor, 0);

    const merged = mergeGeometries([trunkGeo, leafGeo]);
    const mat    = new THREE.MeshStandardMaterial({ 
        color: 0x1a3300, 
        flatShading: true,
        roughness: 1.0 
    });

    const forest = new THREE.InstancedMesh(merged, mat, count);
    
    // IMPORTANT: Increase the bounding sphere so the trees don't disappear 
    // when you look away from the center of the map
    forest.geometry.computeBoundingSphere(); 
    
    const dummy = new THREE.Object3D();
    let placed = 0;

    // Adjust these based on your new TERRAIN_HEIGHT
    const WATER_LEVEL = wkh + 2; // Plant slightly above water to avoid "drowned" trees
    const TREE_LINE   = 2500;    // Increased this because your new mountains are likely higher

    for (let i = 0; i < count; i++) {
        // Spread trees across the NEW terrain size
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;
        
        // This MUST match the physics map in tgen.js
        const y = getTerrainHeight(x, z);

        if (y > WATER_LEVEL && y < TREE_LINE) {
            dummy.position.set(x, y, z);
            
            // Randomize variety
            const s = (0.6 + Math.random() * 0.8) * treescalefactor;
            dummy.scale.set(s, s, s);
            dummy.rotation.y = Math.random() * Math.PI;
            
            dummy.updateMatrix();
            forest.setMatrixAt(placed, dummy.matrix);
            placed++;
        }
    }

    forest.count = placed;
    forest.instanceMatrix.needsUpdate = true;
    scene.add(forest);
    return forest;
}


export function addForest(count, terrainSize, getTerrainHeight, scene, THREE, mergeGeometries, wkh) {
    // 1. Setup Geometries (Using 3 segments to save frames)
    // Note: ensure treescalefactor is defined in your actual scope!
    const treescalefactor = 1; // Assuming 1 for this snippet
    
    const trunkGeo = new THREE.CylinderGeometry(1 * treescalefactor, 1.5 * treescalefactor, 6 * treescalefactor, 3);
    const leafGeo  = new THREE.ConeGeometry(5 * treescalefactor, 12 * treescalefactor, 3);
    leafGeo.translate(0, 7 * treescalefactor, 0); 

    const merged = mergeGeometries([trunkGeo, leafGeo]);
    const mat    = new THREE.MeshStandardMaterial({ 
        color: 0x1a3300, 
        flatShading: true,
        roughness: 1.0 
    });

    // --- NEW: Grid & Distance Settings ---
    const CHUNK_SIZE = 2000; // Size of each grid square
    const RENDER_DISTANCE = 15000; // The distance where trees instantly stop rendering
    const chunks = {};

    const WATER_LEVEL = wkh + 2; 
    const TREE_LINE   = 2500;    

    // 2. Group trees into their respective grid chunks
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;
        const y = getTerrainHeight(x, z);

        if (y > WATER_LEVEL && y < TREE_LINE) {
            const cx = Math.floor(x / CHUNK_SIZE);
            const cz = Math.floor(z / CHUNK_SIZE);
            const key = `${cx},${cz}`;

            if (!chunks[key]) chunks[key] = { cx, cz, trees: [] };
            
            const s = (0.6 + Math.random() * 0.8) * treescalefactor;
            const rotY = Math.random() * Math.PI;
            chunks[key].trees.push({ x, y, z, s, rotY });
        }
    }

    const forestGroup = new THREE.Group();
    const dummy = new THREE.Object3D();

    // Calculate the radius needed to cover a square chunk
    // Math.sqrt((half_width)^2 + (half_height)^2)
    const chunkRadius = Math.sqrt(Math.pow(CHUNK_SIZE / 2, 2) + Math.pow(CHUNK_SIZE / 2, 2));

    // 3. Build the meshes and apply the distance cutoff
    for (const key in chunks) {
        const chunk = chunks[key];
        if (chunk.trees.length === 0) continue;

        const chunkMesh = new THREE.InstancedMesh(merged, mat, chunk.trees.length);
        
        // Ensure frustum culling is enabled (true by default, but good to be explicit)
        chunkMesh.frustumCulled = true;
        
        // Find the absolute center of this specific chunk
        const centerX = (chunk.cx * CHUNK_SIZE) + (CHUNK_SIZE / 2);
        const centerZ = (chunk.cz * CHUNK_SIZE) + (CHUNK_SIZE / 2);

        chunk.trees.forEach((t, index) => {
            // Position the tree relative to the chunk's center
            dummy.position.set(t.x - centerX, t.y, t.z - centerZ);
            dummy.scale.set(t.s, t.s, t.s);
            dummy.rotation.y = t.rotY;
            dummy.updateMatrix();
            chunkMesh.setMatrixAt(index, dummy.matrix);
        });

        chunkMesh.instanceMatrix.needsUpdate = true;
        
        // --- THE FRUSTUM FIX ---
        // Instead of computing the bounding sphere on the geometry (which only measures one tree),
        // we assign a custom bounding sphere to the InstancedMesh that covers the entire chunk.
        // We add a little padding (+100) to account for tall trees near the chunk edges.
        chunkMesh.boundingSphere = new THREE.Sphere(
            new THREE.Vector3(0, 0, 0), 
            chunkRadius + 100 
        );

        // 4. Use LOD to handle the distance checking automatically
        const lod = new THREE.LOD();
        lod.position.set(centerX, 0, centerZ); 
        
        lod.addLevel(chunkMesh, 0); // Show the trees when closer than the render distance
        
        // Swap to an empty (invisible) object when further away
        const emptyMesh = new THREE.Object3D();
        lod.addLevel(emptyMesh, RENDER_DISTANCE); 

        forestGroup.add(lod);
    }

    scene.add(forestGroup);
    return forestGroup;
}
//LOD VERSION
export function addForestLOD(count, terrainSize, getTerrainHeight, scene, THREE, mergeGeometries, wkh) {
    // --- 1. SETUP LOD GEOMETRIES ---
    
    // LOD 0 (High Detail): Trunk + Leaves (3 segments each to save vertices)
    const trunkGeo = new THREE.CylinderGeometry(1 * treescalefactor, 1.5 * treescalefactor, 6 * treescalefactor, 3);
    const leafGeo = new THREE.ConeGeometry(5 * treescalefactor, 12 * treescalefactor, 3);
    leafGeo.translate(0, 7 * treescalefactor, 0); 
    const highDetailGeo = mergeGeometries([trunkGeo, leafGeo]);

    // LOD 1 (Low Detail): Just a simple 3-sided cone to represent a tree from afar (No trunk)
    const lowDetailGeo = new THREE.ConeGeometry(5 * treescalefactor, 16 * treescalefactor, 3);
    lowDetailGeo.translate(0, 5 * treescalefactor, 0);

    const mat = new THREE.MeshStandardMaterial({ 
        color: 0x1a3300, 
        flatShading: true,
        roughness: 1.0 
    });

    // --- 2. SETUP CHUNKING SYSTEM (FRUSTUM CULLING) ---
    const CHUNK_SIZE = 2000; // Divide the map into 2000x2000 sectors
    const chunks = new Map();
    const getChunkKey = (cx, cz) => `${cx},${cz}`;

    const dummy = new THREE.Object3D();
    const WATER_LEVEL = wkh + 2; 
    const TREE_LINE   = 2500;

    // --- 3. PRE-CALCULATE POSITIONS & ASSIGN TO CHUNKS ---
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;
        const y = getTerrainHeight(x, z);

        if (y > WATER_LEVEL && y < TREE_LINE) {
            // Figure out which grid chunk this tree belongs to
            const cx = Math.floor(x / CHUNK_SIZE);
            const cz = Math.floor(z / CHUNK_SIZE);
            const key = getChunkKey(cx, cz);

            if (!chunks.has(key)) {
                chunks.set(key, { cx, cz, transforms: [] });
            }

            // Save the transformation data to build the mesh later
            const s = (0.6 + Math.random() * 0.8) * treescalefactor;
            const rotY = Math.random() * Math.PI;
            chunks.get(key).transforms.push({ x, y, z, s, rotY });
        }
    }

    // --- 4. BUILD INSTANCES & LODS PER CHUNK ---
    const forestGroup = new THREE.Group();
    forestGroup.name = "ForestGrid";

    chunks.forEach(chunk => {
        const numTrees = chunk.transforms.length;
        if (numTrees === 0) return;

        // Create an InstancedMesh for both detail levels for this specific chunk
        const highMesh = new THREE.InstancedMesh(highDetailGeo, mat, numTrees);
        const lowMesh  = new THREE.InstancedMesh(lowDetailGeo, mat, numTrees);

        // Find the mathematical center of this chunk
        const centerX = (chunk.cx * CHUNK_SIZE) + (CHUNK_SIZE / 2);
        const centerZ = (chunk.cz * CHUNK_SIZE) + (CHUNK_SIZE / 2);

        chunk.transforms.forEach((t, index) => {
            // Calculate local position relative to the chunk's center
            dummy.position.set(t.x - centerX, t.y, t.z - centerZ);
            dummy.scale.set(t.s, t.s, t.s);
            dummy.rotation.y = t.rotY;
            dummy.updateMatrix();

            highMesh.setMatrixAt(index, dummy.matrix);
            lowMesh.setMatrixAt(index, dummy.matrix);
        });

        highMesh.instanceMatrix.needsUpdate = true;
        lowMesh.instanceMatrix.needsUpdate = true;
        
        // This calculates a bounding sphere specifically for this chunk, allowing proper frustum culling
        highMesh.geometry.computeBoundingSphere();
        lowMesh.geometry.computeBoundingSphere();

        // Create the LOD wrapper
        const lod = new THREE.LOD();
        lod.position.set(centerX, 0, centerZ); // Move LOD center to the middle of the chunk

        // Setup the distances (Tweak these numbers based on your camera's far clipping plane)
        lod.addLevel(highMesh, 0);       // Look close: High detail
        lod.addLevel(lowMesh, 3000);     // 3000 units away: Swap to Low detail
        
        // Optional: Uncomment the line below to completely hide trees beyond 8000 units to save even more frames
        // lod.addLevel(new THREE.Object3D(), 8000); 

        forestGroup.add(lod);
    });

    scene.add(forestGroup);
    return forestGroup;
}