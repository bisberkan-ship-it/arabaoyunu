// Game Configuration
const CONFIG = {
    laneWidth: 3,
    pathLength: 200,
    speed: 30, // Units per second
    maxSpeed: 80,
    cameraHeight: 5,
    cameraDistance: 10,
    fogDensity: 0.02,
    colors: {
        background: 0x1a0b2e,
        road: 0x2d1b4e,
        grass: 0x110524,
        player: 0x00d2ff,
        obstacle: 0xff0055,
        lines: 0xffffff
    }
};

// State
let state = {
    score: 0,
    isPlaying: false,
    speed: CONFIG.speed,
    lane: 0,
    targetX: 0,
    x: 0,
    scoreTimer: 0
};

// ... (Rest of Three.js Variables and UI unchanged)

let scene, camera, renderer;
let player, roadGroup, obstacles = [], particles = [];
let clock = new THREE.Clock();

const ui = {
    score: document.getElementById('score'),
    finalScore: document.getElementById('final-score'),
    gameOverScreen: document.getElementById('game-over-screen'),
    restartBtn: document.getElementById('restart-btn')
};

function init() {
    // ... (Scene setup identical)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.background);
    scene.fog = new THREE.FogExp2(CONFIG.colors.background, CONFIG.fogDensity);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, CONFIG.cameraHeight, CONFIG.cameraDistance);
    camera.lookAt(0, 0, -10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    createRoad();
    createPlayer();

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', handleInput);
    document.addEventListener('touchstart', handleTouch, { passive: false });
    ui.restartBtn.addEventListener('click', startGame);

    startGame();
    animate();
}

// ... (createRoad, createPlayer, createObstacle unchanged mostly, but ensure clean structure)

function createRoad() {
    const roadInfo = { width: CONFIG.laneWidth * 3, length: CONFIG.pathLength };
    const geometry = new THREE.PlaneGeometry(roadInfo.width, roadInfo.length, 20, 20);
    const material = new THREE.MeshStandardMaterial({ color: CONFIG.colors.road, roughness: 0.8 });

    roadGroup = new THREE.Group();

    const road1 = new THREE.Mesh(geometry, material);
    road1.rotation.x = -Math.PI / 2;
    road1.receiveShadow = true;

    const road2 = road1.clone();
    road2.position.z = -roadInfo.length;

    roadGroup.add(road1);
    roadGroup.add(road2);
    scene.add(roadGroup);

    // Lane Lines
    const lineGeo = new THREE.PlaneGeometry(0.2, roadInfo.length);
    const lineMat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.lines });

    [-1.5, 1.5].forEach(x => {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.02, 0);
        road1.add(line);
        road2.add(line.clone());
    });
}

function createPlayer() {
    const geometry = new THREE.BoxGeometry(1.5, 1, 3);
    const material = new THREE.MeshStandardMaterial({ color: CONFIG.colors.player, emissive: 0x0044aa, emissiveIntensity: 0.5 });
    player = new THREE.Mesh(geometry, material);
    player.position.set(0, 0.5, 0);
    player.castShadow = true;
    scene.add(player);

    const engine = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    engine.position.set(0, 0, 1.3);
    player.add(engine);
}

function createObstacle() {
    const lane = Math.floor(Math.random() * 3) - 1;
    const xPos = lane * CONFIG.laneWidth;

    const type = Math.random();
    let geometry, material;

    if (type > 0.5) {
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        material = new THREE.MeshStandardMaterial({ color: CONFIG.colors.obstacle, emissive: 0x550000 });
    } else {
        geometry = new THREE.ConeGeometry(0.8, 2, 8);
        material = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xaa5500 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(xPos, 0.75, -150); // Spawn further out
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);
}

function handleInput(event) {
    if (!state.isPlaying) return;
    if (['ArrowLeft', 'a', 'A'].includes(event.key)) movePlayer(-1);
    if (['ArrowRight', 'd', 'D'].includes(event.key)) movePlayer(1);
}

function handleTouch(event) {
    if (!state.isPlaying) return;
    event.preventDefault();
    const touchX = event.touches[0].clientX;
    movePlayer(touchX < window.innerWidth / 2 ? -1 : 1);
}

function movePlayer(dir) {
    if (dir === -1 && state.lane > -1) state.lane--;
    if (dir === 1 && state.lane < 1) state.lane++;
    state.targetX = state.lane * CONFIG.laneWidth;
}

function startGame() {
    state.isPlaying = true;
    state.score = 0;
    state.speed = CONFIG.speed;
    state.lane = 0;
    state.targetX = 0;
    state.x = 0;

    player.position.set(0, 0.5, 0);
    player.rotation.z = 0;

    obstacles.forEach(o => scene.remove(o));
    obstacles = [];

    ui.gameOverScreen.style.display = 'none';
    ui.score.innerText = '0';
}

function gameOver() {
    state.isPlaying = false;
    ui.finalScore.innerText = Math.floor(state.score);
    ui.gameOverScreen.style.display = 'flex';
}

function update(dt) {
    if (!state.isPlaying) return;

    // 1. Move Road
    roadGroup.position.z += state.speed * dt;
    if (roadGroup.position.z > CONFIG.pathLength) {
        roadGroup.position.z = 0;
    }

    // 2. Move Player
    state.x += (state.targetX - state.x) * 10 * dt;
    player.position.x = state.x;
    player.rotation.z = (state.x - state.targetX) * 0.15; // Enhanced tilt

    // 3. Spawner
    // Spawn chance linked to speed and dt
    // Approx 1 obstacle per second at start, increasing
    // Simple timer based would be better but random works for arcade feel
    if (Math.random() < (state.speed / 20) * dt) {
        if (obstacles.length === 0 || obstacles[obstacles.length - 1].position.z > -120) {
            createObstacle();
        }
    }

    // 4. Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.position.z += state.speed * dt;

        // Collision (Simple AABB)
        const dx = Math.abs(player.position.x - obs.position.x);
        const dz = Math.abs(player.position.z - obs.position.z);

        if (dx < 1.2 && dz < 1.5) {
            gameOver();
        }

        // Cleanup & Score
        if (obs.position.z > 10) {
            scene.remove(obs);
            obstacles.splice(i, 1);
            state.score += 10;
            ui.score.innerText = state.score;
            state.speed = Math.min(state.speed + (1 * dt), CONFIG.maxSpeed);
        }
    }

    // 5. Particles (Speed Lines)
    if (Math.random() < 0.2) {
        createParticle();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.z += (state.speed * 1.5) * dt; // Move faster than road
        if (p.position.z > 10) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }
}

function createParticle() {
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);

    // Spawn randomly around
    const x = (Math.random() - 0.5) * 40;
    const y = Math.random() * 10;
    const z = -100;

    mesh.position.set(x, y, z);
    scene.add(mesh);
    particles.push(mesh);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1); // Cap dt to prevent huge jumps
    update(dt);
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
