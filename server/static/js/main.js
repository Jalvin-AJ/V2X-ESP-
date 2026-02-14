// ---------------- SOCKET ----------------
const socket = io();

let scene, camera, renderer, clock;
let environmentGroup, playerCar, npcCar, pedestrian, trafficLight, stopLine;
let radarCanvas, radarCtx;

let speed = 0;
let targetSpeed = 0;

let currentRisk = "SAFE";
let currentEvent = "DISTANCE";

// ---------------- SOCKET LISTENER ----------------
socket.on('connect', () => {
    document.getElementById("connection-status").innerText = "Connected";
    document.getElementById("connection-status").className = "connected";
});

socket.on('disconnect', () => {
    document.getElementById("connection-status").innerText = "Disconnected";
    document.getElementById("connection-status").className = "disconnected";
});

socket.on('v2x_update', function (data) {

    currentRisk = data.risk;
    currentEvent = data.event;

    document.getElementById("risk-display").innerText = currentRisk;
    document.getElementById("event-display").innerText = currentEvent;
    document.getElementById("packet-time").innerText = new Date().toLocaleTimeString();

    applyHardwareState(currentRisk, currentEvent);
});

// ---------------- STATE MACHINE ----------------
function applyHardwareState(risk, event) {

    document.body.classList.remove("safe-mode", "medium-mode", "high-mode", "critical-mode");

    const alertBox = document.getElementById("v2x-alert");
    const alertTitle = document.getElementById("alert-title");
    const alertDesc = document.getElementById("alert-desc");

    alertBox.classList.remove("active");

    if (risk === "SAFE") {
        targetSpeed = 45;
        document.body.classList.add("safe-mode");
        setDriveState("Cruise Mode", "text-cyan-500");
        document.getElementById("system-mode").innerText = "NORMAL";
    }

    if (risk === "MEDIUM") {
        targetSpeed = 30;
        document.body.classList.add("medium-mode");
        setDriveState("Adaptive Distance Control", "text-yellow-400");
        document.getElementById("system-mode").innerText = "CAUTION";
    }

    if (risk === "HIGH") {
        targetSpeed = 12;
        document.body.classList.add("high-mode");
        setDriveState("Strong Braking", "text-orange-500");

        alertTitle.innerText = "HIGH RISK DETECTED";
        alertDesc.innerText = event + " hazard detected";
        alertBox.classList.add("active");

        document.getElementById("system-mode").innerText = "BRAKING";
    }

    if (risk === "CRITICAL") {
        targetSpeed = 0;
        document.body.classList.add("critical-mode");
        setDriveState("AEB ACTIVE", "text-red-500");

        alertTitle.innerText = "EMERGENCY STOP";
        alertDesc.innerText = event + " – Immediate Stop";
        alertBox.classList.add("active");

        document.getElementById("system-mode").innerText = "EMERGENCY";
    }
}

// ---------------- THREE JS INIT ----------------
function init() {

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 4.5, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    environmentGroup = new THREE.Group();
    scene.add(environmentGroup);

    radarCanvas = document.getElementById("radar-canvas");
    radarCtx = radarCanvas.getContext("2d");

    const amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(amb);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(20, 50, 20);
    scene.add(sun);

    createRoad();
    createNPC();

    playerCar = buildCar(0x00f3ff);
    playerCar.position.set(5, 0, 0);
    scene.add(playerCar);

    window.addEventListener("resize", onWindowResize);
    animate();
}

// ---------------- CAR ----------------
function buildCar(color) {

    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: color });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4), bodyMat);
    body.position.y = 0.5;

    group.add(body);
    return group;
}

// ---------------- ROAD ----------------
function createRoad() {
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 2000),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    road.rotation.x = -Math.PI / 2;
    environmentGroup.add(road);
}

// ---------------- NPC CAR ----------------
function createNPC() {
    npcCar = buildCar(0x660000);
    npcCar.position.set(5, 0, -40);
    scene.add(npcCar);
}

// ---------------- DRIVE STATE ----------------
function setDriveState(txt, cls) {
    const ds = document.getElementById("drive-state");
    ds.innerText = txt;
    ds.className = `text-[12px] font-bold uppercase ${cls}`;
}

// ---------------- ANIMATION LOOP ----------------
function animate() {

    renderer.setAnimationLoop(() => {

        const delta = clock.getDelta();

        // Smooth speed transition
        if (speed < targetSpeed) speed += 20 * delta;
        if (speed > targetSpeed) speed -= 40 * delta;
        if (speed < 0) speed = 0;

        // Move world
        environmentGroup.children.forEach(child => {
            child.position.z += speed * delta * 1.5;
            if (child.position.z > 50) child.position.z -= 1000;
        });

        npcCar.position.z += (speed - 30) * delta * 1.5;

        document.getElementById("speed-val").innerText = Math.floor(speed);

        drawRadar();

        renderer.render(scene, camera);
    });
}

// ---------------- RADAR ----------------
function drawRadar() {

    radarCtx.clearRect(0, 0, 200, 200);

    radarCtx.fillStyle = "#00f3ff";
    radarCtx.fillRect(96, 130, 8, 12);

    radarCtx.fillStyle = "#f87171";
    radarCtx.fillRect(96, 130 - (npcCar.position.z * 0.2), 6, 10);
}

// ---------------- RESIZE ----------------
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
