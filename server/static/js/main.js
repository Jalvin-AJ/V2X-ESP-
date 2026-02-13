// --- CORE VARIABLES ---
let scene, camera, renderer, clock;
let environmentGroup, playerCar, npcCar, pedestrian, trafficLight, stopLine;
let radarCanvas, radarCtx;
let speed = 45;
let targetSpeed = 45;
let npcSpeed = 45;
let targetNpcSpeed = 45;
let weatherState = 0;
let activeScenario = null;
let signalData = { state: 'green', timer: 15 };
let scenarioResetTimer = null;
let oncomingCars = [];
let signalStopLocked = false;

// Shared detailed materials
const carGlassMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.0, metalness: 1.0 });
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 4.5, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    radarCanvas = document.getElementById('radar-canvas');
    radarCtx = radarCanvas.getContext('2d');

    clock = new THREE.Clock();
    environmentGroup = new THREE.Group();
    scene.add(environmentGroup);

    const amb = new THREE.AmbientLight(0x4040ff, 0.2);
    scene.add(amb);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(20, 50, 20);
    scene.add(sun);

    createRoad();
    createTrees();
    createBuildings();
    createParkedCars();
    createOncomingTraffic();
    createSignal();
    createPedestrian();
    createNPC();

    playerCar = buildDetailedCar('sedan', 0x00f3ff);
    playerCar.position.set(5, 0, 0);
    scene.add(playerCar);

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function createWheel() {
    const group = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 24), wheelMat);
    tire.rotation.z = Math.PI / 2;
    group.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    group.add(rim);
    return group;
}

function buildDetailedCar(type, color) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.7, roughness: 0.3 });
    let chassis, cockpit, windshield;

    if (type === 'muscle') {
        chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 4.4), bodyMat);
        chassis.position.y = 0.45;
        cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.0), bodyMat);
        cockpit.position.set(0, 0.9, -0.2);
        windshield = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 1.5), carGlassMat);
        windshield.position.set(0, 0.92, -0.2);
        group.add(chassis, cockpit, windshield);
    } else if (type === 'hypercar') {
        chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 4.8), bodyMat);
        chassis.position.y = 0.35;
        cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), carGlassMat);
        cockpit.scale.set(1.4, 0.6, 1.8);
        cockpit.position.set(0, 0.6, 0.2);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        wing.position.set(0, 0.85, 2.1);
        group.add(chassis, cockpit, wing);
    } else {
        chassis = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 4.2), bodyMat);
        chassis.position.y = 0.5;
        cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.4), bodyMat);
        cockpit.position.set(0, 1.0, 0);
        windshield = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 2.2), carGlassMat);
        windshield.position.set(0, 1.0, 0);
        group.add(chassis, cockpit, windshield);
    }

    const headL = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    headL.position.set(-0.65, 0.5, -2.21);
    headL.rotation.y = Math.PI;
    const headR = headL.clone(); headR.position.x = 0.65;

    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x330000 }));
    tailL.position.set(-0.6, 0.55, 2.21);
    const tailR = tailL.clone(); tailR.position.x = 0.6;

    group.add(headL, headR, tailL, tailR);
    group.userData.tailLights = [tailL.material, tailR.material];

    [[1, 0.8], [-1, 0.8], [1, -0.8], [-1, -0.8]].forEach(p => {
        const w = createWheel();
        w.position.set(p[0] * 0.9, 0.35, p[1] * 1.4);
        group.add(w);
    });

    return group;
}

function createRoad() {
    const roadGeo = new THREE.PlaneGeometry(45, 4000);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    environmentGroup.add(road);
    const createYellowLine = (xOffset) => {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 4000), new THREE.MeshStandardMaterial({ color: 0xcc8800 }));
        line.rotation.x = -Math.PI / 2; line.position.set(xOffset, 0.03, 0);
        environmentGroup.add(line);
    };
    createYellowLine(-0.15); createYellowLine(0.15);
}

function createTrees() {
    for (let i = 0; i < 80; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.5), new THREE.MeshStandardMaterial({ color: 0x1a110a }));
        trunk.position.y = 1.25; tree.add(trunk);
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.4, 6, 6), new THREE.MeshStandardMaterial({ color: 0x0a1a0a, flatShading: true }));
        foliage.position.y = 3; tree.add(foliage);
        tree.position.set((Math.random() > 0.5 ? 1 : -1) * (24 + Math.random() * 5), 0, -i * 30);
        environmentGroup.add(tree);
    }
}

function createBuildings() {
    for (let i = 0; i < 20; i++) {
        const h = 20 + Math.random() * 40;
        const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 12), new THREE.MeshStandardMaterial({ color: 0x08080a }));
        b.position.set((Math.random() > 0.5 ? 1 : -1) * 38, h / 2, -i * 120);
        environmentGroup.add(b);
    }
}

function createParkedCars() {
    const types = ['muscle', 'hypercar', 'sedan'];
    for (let i = 0; i < 40; i++) {
        const car = buildDetailedCar(types[i % types.length], 0x333333);
        const side = Math.random() > 0.5 ? 1 : -1;
        car.position.set(side * 14.5, 0, -i * 45 - 20);
        if (side < 0) car.rotation.y = Math.PI;
        environmentGroup.add(car);
    }
}

function createOncomingTraffic() {
    for (let i = 0; i < 6; i++) {
        const car = buildDetailedCar('sedan', 0x333333);
        car.position.set(-5, 0, -150 - (i * 200));
        car.rotation.y = Math.PI;
        oncomingCars.push(car);
        environmentGroup.add(car);
    }
}

function createNPC() {
    npcCar = buildDetailedCar('muscle', 0x660000);
    npcCar.position.set(5, 0, -40);
    scene.add(npcCar);
}

function createPedestrian() {
    pedestrian = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
    head.position.y = 1.75;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), mat);
    torso.position.y = 1.35;
    const limbGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8);
    const leftArm = new THREE.Mesh(limbGeo, mat);
    leftArm.position.set(0.2, 1.45, 0); leftArm.rotation.z = Math.PI / 4;
    const rightArm = new THREE.Mesh(limbGeo, mat);
    rightArm.position.set(-0.2, 1.45, 0); rightArm.rotation.z = -Math.PI / 4;
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.set(0.12, 0.5, 0); leftLeg.rotation.z = 0.15;
    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.set(-0.12, 0.5, 0); rightLeg.rotation.z = -0.15;
    pedestrian.add(head, torso, leftArm, rightArm, leftLeg, rightLeg);
    pedestrian.position.set(16, 0, -30);
    environmentGroup.add(pedestrian);
}

function createSignal() {
    trafficLight = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    box.position.y = 4;
    trafficLight.add(pole, box);
    const red = new THREE.Mesh(new THREE.CircleGeometry(0.25), new THREE.MeshBasicMaterial({ color: 0x220000 })); red.position.set(0, 4.7, 0.31);
    const grn = new THREE.Mesh(new THREE.CircleGeometry(0.25), new THREE.MeshBasicMaterial({ color: 0x002200 })); grn.position.set(0, 3.3, 0.31);
    trafficLight.add(red, grn);
    trafficLight.userData = { red, grn };
    trafficLight.position.set(12, 0, -180);
    environmentGroup.add(trafficLight);

    stopLine = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(5, 0.05, -170);
    environmentGroup.add(stopLine);
}

function triggerEvent(type) {
    if (scenarioResetTimer) clearTimeout(scenarioResetTimer);
    activeScenario = type;
    document.getElementById('v2x-alert').style.display = 'none';
    targetSpeed = 45;
    targetNpcSpeed = 45;
    signalStopLocked = false;

    if (type === 'braking') {
        targetNpcSpeed = 0;
        targetSpeed = 20;
        updateTicker("V2V BROADCAST: LEAD VEHICLE EMERGENCY BRAKE (BSM)");
        if (npcCar.userData.tailLights) {
            npcCar.userData.tailLights.forEach(m => {
                m.color.set(0xff0000); m.emissive.set(0xff0000); m.emissiveIntensity = 2.5;
            });
        }
        showAlert("V2V EMERGENCY BRAKE", "Lead vehicle broadcasted hard stop. Initiating response.");
    }
    if (type === 'pedestrian') {
        if (pedestrian) pedestrian.position.set(10, 0, -50);
        updateTicker("V2P: VRU DETECTED ON TRAJECTORY. DEPLOYING BRAKE PROTOCOL.");
        showAlert("V2P HUMAN DETECTION", "Pedestrian detected on intersection path. Automatic stop engaged.");
    }
    if (type === 'signal') {
        if (trafficLight) trafficLight.position.z = -120;
        if (stopLine) stopLine.position.z = -112;
        if (npcCar) npcCar.position.z = -112;
        signalData.state = 'red';
        signalData.timer = 15;
        updateTicker("V2I: SPAT BROADCAST - INTERSECTION RED");
        setDriveState("Approach Intersection", "text-amber-400");
    }
    scenarioResetTimer = setTimeout(() => resetDemo(), 5000);
}

function resetDemo() {
    activeScenario = null; targetSpeed = 45; targetNpcSpeed = 45; npcSpeed = 45; signalStopLocked = false;
    document.getElementById('v2x-alert').style.display = 'none';
    setDriveState("Active Cruise Control", "text-cyan-500");
    updateTicker("SYSTEM NOMINAL. SCANNING V2X DATA STREAMS.");
    if (pedestrian) pedestrian.position.set(16, 0, -30);
    signalData.state = 'green';
    if (npcCar && npcCar.userData.tailLights) {
        npcCar.userData.tailLights.forEach(m => { m.color.set(0x330000); m.emissive.set(0x330000); m.emissiveIntensity = 1; });
        npcCar.position.z = -40;
    }
}

function cycleWeather() {
    weatherState = (weatherState + 1) % 3;
    const btn = document.getElementById('weather-btn');
    switch (weatherState) {
        case 0: scene.background = new THREE.Color(0x0a0a0a); scene.fog = null; btn.innerText = "Weather: Clear"; break;
        case 1: scene.background = new THREE.Color(0x0a0a0c); scene.fog = new THREE.FogExp2(0x0a0a0c, 0.06); btn.innerText = "Weather: Foggy"; break;
        case 2: scene.background = new THREE.Color(0x010103); scene.fog = new THREE.FogExp2(0x010103, 0.08); btn.innerText = "Weather: Night"; break;
    }
}

function showAlert(title, desc) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-desc').innerText = desc;
    document.getElementById('v2x-alert').style.display = 'block';
}

function setDriveState(txt, cls) {
    const ds = document.getElementById('drive-state');
    if (ds) { ds.innerText = txt; ds.className = `text-[12px] font-bold uppercase ${cls || 'text-cyan-500'}`; }
}

function updateTicker(msg) {
    const tickerEl = document.getElementById('ticker');
    if (tickerEl) tickerEl.innerText = `>> ${msg}`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function drawRadar() {
    const ctx = radarCtx;
    ctx.clearRect(0, 0, 200, 200);

    // Grid Lines
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 200; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(200, i); ctx.stroke();
    }

    // Radar Scan Pulse
    const time = clock.getElapsedTime();
    const pulse = (time * 100) % 200;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
    ctx.beginPath(); ctx.arc(100, 150, pulse, 0, Math.PI * 2); ctx.stroke();

    const mapX = (x) => 100 + (x * 4);
    const mapY = (z) => 150 + (z * 1.5);

    // Draw Road
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(mapX(-10), 0, mapX(10) - mapX(-10), 200);

    // 1. Player Car (Cyan)
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(mapX(5) - 4, mapY(0) - 6, 8, 12);

    // 2. Lead NPC (Red)
    const npcY = mapY(npcCar.position.z);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(mapX(npcCar.position.x) - 3, npcY - 5, 6, 10);

    if (activeScenario === 'braking') {
        ctx.strokeStyle = '#00f3ff';
        ctx.setLineDash([4, 2]);
        ctx.beginPath(); ctx.moveTo(mapX(5), mapY(0)); ctx.lineTo(mapX(npcCar.position.x), npcY); ctx.stroke();
        ctx.setLineDash([]);
    }

    // 3. Traffic Light
    const sigY = mapY(trafficLight.position.z);
    ctx.fillStyle = signalData.state === 'red' ? '#ef4444' : '#22c55e';
    ctx.beginPath(); ctx.arc(mapX(12), sigY, 4, 0, Math.PI * 2); ctx.fill();

    if (activeScenario === 'signal') {
        ctx.strokeStyle = '#00f3ff';
        ctx.beginPath(); ctx.moveTo(mapX(5), mapY(0)); ctx.lineTo(mapX(12), sigY); ctx.stroke();
    }

    // 4. Pedestrian
    const pedY = mapY(pedestrian.position.z);
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath(); ctx.arc(mapX(pedestrian.position.x), pedY, 3, 0, Math.PI * 2); ctx.fill();

    if (activeScenario === 'pedestrian') {
        ctx.strokeStyle = '#00f3ff';
        ctx.beginPath(); ctx.moveTo(mapX(5), mapY(0)); ctx.lineTo(mapX(pedestrian.position.x), pedY); ctx.stroke();
    }

    // 5. Oncoming Traffic
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    oncomingCars.forEach((car, index) => {
        const carY = mapY(car.position.z);
        if (carY > 0 && carY < 200) {
            ctx.fillRect(mapX(car.position.x) - 2, carY - 4, 4, 8);
            if (index % 2 === 0) {
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                ctx.setLineDash([2, 2]);
                ctx.beginPath(); ctx.moveTo(mapX(5), mapY(0)); ctx.lineTo(mapX(car.position.x), carY); ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    });
}

function animate() {
    renderer.setAnimationLoop(() => {
        if (!clock || !scene || !camera) return;
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        if (!stopLine || !npcCar || !trafficLight) return;

        let signalApproachDist = (stopLine.position.z <= 0) ? Math.abs(stopLine.position.z) : (1000 - stopLine.position.z);
        document.getElementById('dist-val').innerText = `${Math.floor(signalApproachDist)}m`;

        const distToLine = Math.abs(stopLine.position.z);
        const distToNpc = Math.abs(npcCar.position.z);
        const distToPed = pedestrian ? Math.abs(pedestrian.position.z) : 999;

        let computedTargetSpeed = 45;
        let activeStatus = "Active Cruise Control";
        let statusColor = "text-cyan-500";

        // --- ZERO-COLLISION SAFETY OVERRIDE ---
        if (distToNpc < 35) {
            // Stage 1: Adaptive deceleration
            computedTargetSpeed = Math.min(computedTargetSpeed, Math.max(0, speed * (distToNpc / 35)));
            activeStatus = "Adaptive Distance Control";

            // Stage 2: AEB trigger
            if (distToNpc < 15) {
                computedTargetSpeed = 0;
                activeStatus = "AEB: Leading Vehicle";
                statusColor = "text-red-500";
            }

            // Stage 3: Hard Safety Buffer (Prevent any intersection of meshes)
            if (distToNpc < 7) {
                speed = 0; // Immediate physical stop override
                computedTargetSpeed = 0;
            }
        }

        if (activeScenario === 'pedestrian' && distToPed < 50) {
            computedTargetSpeed = Math.min(computedTargetSpeed, Math.max(0, speed * (distToPed / 40)));
            activeStatus = "VRU Safety Braking";
            if (distToPed < 20) { computedTargetSpeed = 0; activeStatus = "AEB: Human Detection"; statusColor = "text-red-500"; }
            if (distToPed < 5) { speed = 0; computedTargetSpeed = 0; }
        }

        if (signalData.state === 'red' && distToLine < 50) {
            computedTargetSpeed = Math.min(computedTargetSpeed, 0);
            activeStatus = "V2I Signal Stop";
            statusColor = "text-amber-500";
        }

        targetSpeed = computedTargetSpeed;
        setDriveState(activeStatus, statusColor);

        if (npcSpeed > targetNpcSpeed) npcSpeed -= 45 * delta;
        else if (npcSpeed < targetNpcSpeed) npcSpeed += 20 * delta;

        if (speed < targetSpeed) speed += 15 * delta;
        if (speed > targetSpeed) {
            // Increased deceleration multiplier for emergency targetSpeed 0
            const decel = (targetSpeed === 0) ? 75 : 32;
            speed -= decel * delta;
        }
        if (speed < 0.1) speed = 0;

        environmentGroup.children.forEach(child => {
            child.position.z += speed * delta * 1.5;
            if (oncomingCars.includes(child)) child.position.z += 40 * delta * 1.5;
            if (child.position.z > 50) child.position.z -= 1000;
        });

        npcCar.position.z += (speed - npcSpeed) * delta * 1.5;

        if (signalData.state === 'red' && distToLine < 120) {
            if (npcCar.userData.tailLights) { npcCar.userData.tailLights.forEach(m => { m.color.set(0xff0000); m.emissive.set(0xff0000); }); }
        }

        if (activeScenario === 'pedestrian' && pedestrian && speed < 15) {
            pedestrian.position.x -= 4 * delta;
            pedestrian.position.z += speed * delta * 1.5;
        }

        signalData.timer -= delta;
        if (signalData.timer < 0) {
            signalData.state = signalData.state === 'red' ? 'green' : 'red';
            signalData.timer = 15;
            if (signalData.state === 'green') signalStopLocked = false;
        }

        const lights = trafficLight.userData;
        if (lights && lights.red && lights.grn) {
            lights.red.material.color.set(signalData.state === 'red' ? 0xff0000 : 0x220000);
            lights.grn.material.color.set(signalData.state === 'green' ? 0x00ff00 : 0x002200);
        }

        const sigColorEl = document.getElementById('sig-color');
        const sigTtlEl = document.getElementById('sig-ttl');
        const speedValEl = document.getElementById('speed-val');
        if (sigColorEl) {
            sigColorEl.innerText = signalData.state.toUpperCase() === 'RED' ? 'RED' : 'GRN';
            sigColorEl.className = signalData.state === 'red' ? 'text-red-500' : 'text-green-500';
        }
        if (sigTtlEl) sigTtlEl.innerText = `${Math.ceil(signalData.timer)}s`;
        if (speedValEl) {
            speedValEl.innerText = Math.floor(speed);
            speedValEl.style.color = (speed > targetSpeed + 5 && targetSpeed === 0) ? '#f87171' : '#fff';
        }

        drawRadar();
        renderer.render(scene, camera);
    });
}

window.onload = init;

function sendDistance() {
    const dist = document.getElementById('dist-input').value;
    if (dist) {
        // Send the input value to the 'set_distance' route in Python
        socket.emit('manual_move_request', { distance: parseFloat(dist) });
        document.getElementById('dist-input').value = ''; // Clear input
    }
}
socket.on('apply_distance_shift', function(data) {
    // In Three.js, to move forward, we shift the environment backward
    environmentGroup.children.forEach(child => {
        child.position.z += data.amount * 1.5; // Multiplier for visual scale
    });
    
    console.log(`Car moved forward by ${data.amount}m`);
});