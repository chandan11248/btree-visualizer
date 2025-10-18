// Three.js setup
const container = document.getElementById('container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f7fa);
scene.fog = new THREE.Fog(0xc3cfe2, 20, 70);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLight1 = new THREE.PointLight(0x3498db, 0.8, 50);
pointLight1.position.set(-10, 5, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x9b59b6, 0.8, 50);
pointLight2.position.set(10, 5, -5);
scene.add(pointLight2);

const rimLight = new THREE.PointLight(0x1abc9c, 0.6, 50);
rimLight.position.set(0, -5, 10);
scene.add(rimLight);

// Camera controls
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngle = { x: 0, y: 0 };
let cameraDistance = 15;

// Node dragging
let selectedNode = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let isDraggingNode = false;

container.addEventListener('mousedown', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        // Find the parent group of the intersected object
        let obj = intersects[0].object;
        while (obj.parent && obj.type !== 'Group') {
            obj = obj.parent;
        }
        
        if (obj.type === 'Group' && obj.userData.draggable) {
            selectedNode = obj;
            isDraggingNode = true;
            return;
        }
    }
    
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

container.addEventListener('mousemove', (e) => {
    if (isDraggingNode && selectedNode) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Project mouse position to a plane
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        
        if (intersection) {
            selectedNode.position.x = intersection.x;
            selectedNode.position.y = intersection.y;
            
            // Update connection lines
            updateConnectionLines();
        }
    } else if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        cameraAngle.y += deltaX * 0.005;
        cameraAngle.x += deltaY * 0.005;
        cameraAngle.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngle.x));
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

container.addEventListener('mouseup', () => { 
    isDragging = false;
    isDraggingNode = false;
    selectedNode = null;
});

container.addEventListener('mouseleave', () => { 
    isDragging = false;
    isDraggingNode = false;
    selectedNode = null;
});

container.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance += e.deltaY * 0.01;
    cameraDistance = Math.max(5, Math.min(40, cameraDistance));
});

// Tree visualization
let nodeObjects = [];
let connectionLines = [];
let nodeMap = new Map(); // Map to store node data and positions
const sessionId = 'default';

function createNodeMesh(keys, x, y, z, isHighlighted = false) {
    const group = new THREE.Group();
    group.userData.draggable = true;
    
    // Calculate width based on number of keys (minimum 2, scale with keys)
    const width = Math.max(2, keys.length * 1);
    const height = 0.8;
    const depth = 0.8;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({
        color: isHighlighted ? 0x22c55e : 0x667eea,
        emissive: isHighlighted ? 0x166534 : 0x442288,
        shininess: 100,
        specular: 0x888888
    });
    const box = new THREE.Mesh(geometry, material);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(width * 1.15, height * 1.2, depth * 1.2);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: isHighlighted ? 0x22ff55 : 0x8899ff,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // Text for keys with better spacing
    keys.forEach((key, i) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;
        
        // Clear canvas
        context.clearRect(0, 0, 512, 512);
        
        // Draw text with shadow for better visibility
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 4;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        context.fillStyle = 'white';
        context.font = 'bold 200px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(key.toString(), 256, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const planeMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        
        const planeGeometry = new THREE.PlaneGeometry(0.7, 0.7);
        const textPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        textPlane.renderOrder = 999; // Render on top
        
        // Better spacing for multiple keys
        const spacing = width / (keys.length + 1);
        textPlane.position.set(-width/2 + spacing * (i + 1), 0, depth/2 + 0.1);
        
        group.add(textPlane);
    });

    group.position.set(x, y, z);
    return group;
}

function createConnectionLine(parent, child) {
    const material = new THREE.LineBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.7,
        linewidth: 2
    });
    
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(
            parent.position.x,
            parent.position.y - 0.4,
            parent.position.z
        ),
        new THREE.Vector3(
            child.position.x,
            child.position.y + 0.4,
            child.position.z
        )
    ]);
    
    const line = new THREE.Line(geometry, material);
    line.userData.parent = parent;
    line.userData.child = child;
    return line;
}

function updateConnectionLines() {
    connectionLines.forEach(line => {
        const parent = line.userData.parent;
        const child = line.userData.child;
        
        const positions = line.geometry.attributes.position.array;
        positions[0] = parent.position.x;
        positions[1] = parent.position.y - 0.4;
        positions[2] = parent.position.z;
        positions[3] = child.position.x;
        positions[4] = child.position.y + 0.4;
        positions[5] = child.position.z;
        
        line.geometry.attributes.position.needsUpdate = true;
    });
}

function calculateTreeDimensions(node) {
    if (!node || !node.keys || node.keys.length === 0) {
        return { width: 1, height: 1 };
    }
    
    if (node.leaf || !node.children || node.children.length === 0) {
        return { width: Math.max(2, node.keys.length * 1), height: 1 };
    }
    
    let totalWidth = 0;
    let maxHeight = 0;
    
    node.children.forEach(child => {
        const dims = calculateTreeDimensions(child);
        totalWidth += dims.width + 2; // Add spacing between subtrees
        maxHeight = Math.max(maxHeight, dims.height);
    });
    
    return { 
        width: Math.max(totalWidth, node.keys.length * 1), 
        height: maxHeight + 1 
    };
}

function visualizeTree(treeData, highlightKey = null) {
    // Clear existing objects
    nodeObjects.forEach(obj => scene.remove(obj));
    connectionLines.forEach(line => scene.remove(line));
    nodeObjects = [];
    connectionLines = [];
    nodeMap.clear();

    if (!treeData || !treeData.keys || treeData.keys.length === 0) {
        return;
    }

    const positions = new Map();
    
    function calculatePositions(node, x, y, availableWidth, depth = 0) {
        if (!node || !node.keys) return;
        
        positions.set(node, { x, y, z: 0, depth });
        
        if (!node.leaf && node.children && node.children.length > 0) {
            // Calculate required width for each subtree
            const subtreeWidths = node.children.map(child => {
                const dims = calculateTreeDimensions(child);
                return dims.width;
            });
            
            const totalSubtreeWidth = subtreeWidths.reduce((a, b) => a + b, 0);
            const spacing = Math.max(3, totalSubtreeWidth / node.children.length);
            const totalWidth = spacing * node.children.length;
            
            let currentX = x - totalWidth / 2 + spacing / 2;
            
            node.children.forEach((child, i) => {
                const childY = y - 3.5; // Increased vertical spacing
                calculatePositions(child, currentX, childY, spacing, depth + 1);
                currentX += spacing;
            });
        }
    }

    // Start positioning from root
    const rootDims = calculateTreeDimensions(treeData);
    calculatePositions(treeData, 0, 0, rootDims.width * 2);

    // Create nodes and connections
    function createNodes(node, parentMesh = null) {
        if (!node || !node.keys) return;
        
        const pos = positions.get(node);
        const isHighlighted = highlightKey !== null && node.keys.includes(highlightKey);
        const nodeMesh = createNodeMesh(node.keys, pos.x, pos.y, pos.z, isHighlighted);
        
        // Store node data
        nodeMesh.userData.nodeData = node;
        nodeMesh.userData.originalPosition = { x: pos.x, y: pos.y, z: pos.z };
        nodeMap.set(node, nodeMesh);
        
        scene.add(nodeMesh);
        nodeObjects.push(nodeMesh);

        // Animate entrance with delay based on depth
        nodeMesh.scale.set(0, 0, 0);
        setTimeout(() => {
            animateScale(nodeMesh, { x: 1, y: 1, z: 1 }, 500);
        }, pos.depth * 100);

        // Create connection to parent
        if (parentMesh) {
            const line = createConnectionLine(parentMesh, nodeMesh);
            scene.add(line);
            connectionLines.push(line);
        }

        // Process children
        if (!node.leaf && node.children) {
            node.children.forEach((child) => {
                createNodes(child, nodeMesh);
            });
        }
    }

    createNodes(treeData);
}

function animateScale(object, targetScale, duration) {
    const startScale = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        object.scale.x = startScale.x + (targetScale.x - startScale.x) * eased;
        object.scale.y = startScale.y + (targetScale.y - startScale.y) * eased;
        object.scale.z = startScale.z + (targetScale.z - startScale.z) * eased;
        
        if (progress < 1) requestAnimationFrame(animate);
    }
    animate();
}

// API Communication
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function setButtonsDisabled(disabled) {
    const buttons = ['insertBtn', 'deleteBtn', 'searchBtn', 'resetBtn'];
    buttons.forEach(id => {
        document.getElementById(id).disabled = disabled;
    });
}

async function insertKey() {
    const input = document.getElementById('keyInput');
    const key = parseInt(input.value);
    
    if (isNaN(key)) {
        showNotification('Please enter a valid number', 'error');
        return;
    }
    
    setButtonsDisabled(true);
    
    try {
        const response = await fetch('/api/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, session_id: sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            visualizeTree(data.tree);
            showNotification(data.message, 'success');
            input.value = '';
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error inserting key: ' + error.message, 'error');
    } finally {
        setButtonsDisabled(false);
    }
}

async function deleteKey() {
    const input = document.getElementById('keyInput');
    const key = parseInt(input.value);
    
    if (isNaN(key)) {
        showNotification('Please enter a valid number', 'error');
        return;
    }
    
    setButtonsDisabled(true);
    
    try {
        const response = await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, session_id: sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            visualizeTree(data.tree);
            showNotification(data.message, 'success');
            input.value = '';
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error deleting key: ' + error.message, 'error');
    } finally {
        setButtonsDisabled(false);
    }
}

async function searchKey() {
    const input = document.getElementById('keyInput');
    const key = parseInt(input.value);
    
    if (isNaN(key)) {
        showNotification('Please enter a valid number', 'error');
        return;
    }
    
    setButtonsDisabled(true);
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, session_id: sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const treeResponse = await fetch(`/api/tree?session_id=${sessionId}`);
            const treeData = await treeResponse.json();
            
            if (treeData.success) {
                visualizeTree(treeData.tree, data.found ? key : null);
            }
            
            showNotification(data.message, data.found ? 'success' : 'info');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error searching key: ' + error.message, 'error');
    } finally {
        setButtonsDisabled(false);
    }
}

async function resetTree() {
    if (!confirm('Are you sure you want to reset the tree?')) {
        return;
    }
    
    setButtonsDisabled(true);
    
    try {
        const response = await fetch('/api/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            visualizeTree(data.tree);
            showNotification(data.message, 'success');
            document.getElementById('keyInput').value = '';
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error resetting tree: ' + error.message, 'error');
    } finally {
        setButtonsDisabled(false);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update camera position
    camera.position.x = cameraDistance * Math.sin(cameraAngle.y) * Math.cos(cameraAngle.x);
    camera.position.y = cameraDistance * Math.sin(cameraAngle.x) + 5;
    camera.position.z = cameraDistance * Math.cos(cameraAngle.y) * Math.cos(cameraAngle.x);
    camera.lookAt(0, 0, 0);
    
    // Animate lights
    const time = Date.now() * 0.001;
    pointLight1.position.x = Math.sin(time * 0.5) * 10;
    pointLight1.position.z = Math.cos(time * 0.5) * 10;
    pointLight2.position.x = Math.sin(time * 0.5 + Math.PI) * 10;
    pointLight2.position.z = Math.cos(time * 0.5 + Math.PI) * 10;
    
    // Subtle floating animation for non-dragged nodes
    nodeObjects.forEach((obj, i) => {
        if (obj.type === 'Group' && obj !== selectedNode) {
            obj.rotation.y = Math.sin(time + i * 0.1) * 0.03;
        }
    });
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handle Enter key
document.getElementById('keyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        insertKey();
    }
});

// Load initial tree
async function loadInitialTree() {
    try {
        const response = await fetch(`/api/tree?session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.success && data.tree.keys.length > 0) {
            visualizeTree(data.tree);
        }
    } catch (error) {
        console.error('Error loading initial tree:', error);
    }
}

// Start
loadInitialTree();
animate();