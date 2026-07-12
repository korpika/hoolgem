import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.warn = () => {}; console.error = () => {}; 

// ==========================================
// 1. حقن واجهة المستخدم (الواجهة الأصلية + أزرار الأدوات الجديدة)
// ==========================================
document.body.innerHTML = `
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; user-select: none; font-family: sans-serif; }
        
        #game-wrapper { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; overflow: hidden; }
        @media screen and (orientation: portrait) {
            #game-wrapper { width: 100vh; height: 100vw; transform: rotate(90deg); transform-origin: center; top: 50%; left: 50%; margin-top: -50vw; margin-left: -50vh; }
        }

        #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; touch-action: none; }
        
        #ui-layer { position: absolute; top: 15px; left: 15px; z-index: 10; display: flex; flex-direction: column; gap: 8px; }
        
        .hud-btn { background: rgba(0,0,0,0.85); color: #00f2fe; border: 1px solid #00f2fe; border-radius: 5px; padding: 8px 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 11px; text-align: center; }
        .hud-btn.active-mode { background: #00f2fe; color: #000; box-shadow: 0 0 10px #00f2fe; }

        .tool-btn { background: rgba(20,20,20,0.9); border: 1px solid #aaa; color: #aaa; }
        .tool-btn.active-path { border-color: #2ed573; color: #2ed573; background: rgba(46, 213, 115, 0.2); }
        .tool-btn.active-cut { border-color: #ff4757; color: #ff4757; background: rgba(255, 71, 87, 0.2); }

        #path-panel { position: absolute; top: 15px; right: -250px; width: 180px; background: rgba(10, 10, 10, 0.95); border: 1px solid #00f2fe; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 6px; z-index: 10; transition: right 0.3s ease; box-shadow: -5px 5px 15px rgba(0,0,0,0.8); max-height: 90vh; }
        #path-panel.open { right: 15px; }
        .panel-title { color: #00f2fe; font-size: 13px; text-align: center; margin: 0 0 5px 0; font-weight: bold; }
        
        #code-editor { width: 100%; height: 90px; background: #050505; color: #00f2fe; border: 1px solid #333; padding: 6px; font-family: monospace; font-size: 11px; direction: ltr; resize: none; border-radius: 4px; outline: none; white-space: pre; box-sizing: border-box; }
        
        .actions-scroller { max-height: 85px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding-right: 4px; }
        .actions-scroller::-webkit-scrollbar { width: 4px; }
        .actions-scroller::-webkit-scrollbar-thumb { background: #00f2fe; border-radius: 4px; }
        .action-btn { background: #1a1a1a; color: #fff; border: 1px solid #444; border-radius: 3px; padding: 6px 0; font-size: 10px; cursor: pointer; text-align: center; }
        .flex-row { display: flex; gap: 4px; }
        .flex-row button { flex: 1; padding: 6px 0; font-size: 10px; }
    </style>

    <div id="game-wrapper">
        <div id="ui-layer">
            <button id="btn-play-path" class="hud-btn" style="border-color: #2ed573; color: #2ed573;">▶ تشغيل المسار</button>
            <button id="btn-path" class="hud-btn">صفحة المطور</button>
            <button id="btn-tool-mode" class="hud-btn tool-btn active-path" style="display: none;">🟢 وضع الرسم: مسار</button>
            <button id="btn-walls" class="hud-btn active-mode">🌐 الجدران والأرضية</button>
            <button id="btn-camera" class="hud-btn">الكاميرا</button>
            <button id="btn-freecam" class="hud-btn">كاميرا حرة</button>
            <button id="btn-sleep" class="hud-btn">نوم</button>
            <button id="btn-anim" class="hud-btn">تبديل الحركة</button>
            <button id="btn-char" class="hud-btn">تبديل الشخصية</button>
            <button id="btn-music" class="hud-btn">موسيقى: إيقاف</button>
        </div>

        <div id="path-panel">
            <h3 class="panel-title">المسار (JSON)</h3>
            <textarea id="code-editor" placeholder="[JSON Code...]"></textarea>
            <div style="font-size: 10px; color: #aaa; text-align: center;">إضافة حركة:</div>
            <div class="actions-scroller">
                <button class="action-btn" data-act="idle_1">حركة 1</button>
                <button class="action-btn" data-act="idle_2">حركة 2</button>
                <button class="action-btn" data-act="idle_3">حركة 3</button>
                <button class="action-btn" data-act="idle_4">حركة 4</button>
                <button class="action-btn" data-act="idle_5">حركة 5</button>
                <button class="action-btn" data-act="idle_6">حركة 6</button>
                <button class="action-btn" data-act="idle_7">حركة 7</button>
                <button class="action-btn" data-act="idle_8">حركة 8</button>
                <button class="action-btn" data-act="idle_9">نوم</button>
                <button class="action-btn" data-act="idle_10">استيقاظ</button>
            </div>
            <div class="flex-row" style="margin-top: 4px;">
                <button id="btn-copy-path" class="hud-btn">نسخ</button>
                <button id="btn-clear-path" class="hud-btn" style="border-color:#ff4757; color:#ff4757;">مسح</button>
            </div>
        </div>
        <div id="canvas-container"></div>
    </div>
`;

// ==========================================
// 2. إعداد المشهد الأساسي والموسيقى
// ==========================================
const wrapper = document.getElementById('game-wrapper');
const container = document.getElementById('canvas-container');

const btnPlayPath = document.getElementById('btn-play-path');
const btnPath = document.getElementById('btn-path');
const btnToolMode = document.getElementById('btn-tool-mode');
const btnWalls = document.getElementById('btn-walls');
const btnCamera = document.getElementById('btn-camera');
const btnFreeCam = document.getElementById('btn-freecam');
const btnSleep = document.getElementById('btn-sleep');
const btnAnim = document.getElementById('btn-anim');
const btnChar = document.getElementById('btn-char');
const btnMusic = document.getElementById('btn-music');
const pathPanel = document.getElementById('path-panel');
const codeEditor = document.getElementById('code-editor');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, wrapper.clientWidth / wrapper.clientHeight, 0.001, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(2, 5, 4);
scene.add(mainLight);

let mode = 'NORMAL'; 
let camAngle = 0, camPitch = 0.2, camRadius = 6.5;
let focusX = 0, focusY = 1.2, focusZ = 0;
let tCamAngle = 0, tCamPitch = 0.2, tCamRadius = 6.5;
let tFocusX = 0, tFocusY = 1.2, tFocusZ = 0;

const bgMusic = new Audio('https://raw.githubusercontent.com/korpika/hoolgem/main/bg_music.mp3');
bgMusic.loop = true; bgMusic.volume = 0.4;
let isMusicPlaying = false;

window.addEventListener('touchstart', autoStartMusic, { once: true });
function autoStartMusic() { if(!isMusicPlaying) { bgMusic.play().then(() => { isMusicPlaying = true; btnMusic.innerText = "موسيقى: تشغيل"; btnMusic.classList.add('active-mode'); }).catch(() => {}); } }

btnMusic.addEventListener('click', () => {
    if(isMusicPlaying) { bgMusic.pause(); isMusicPlaying = false; btnMusic.innerText = "موسيقى: إيقاف"; btnMusic.classList.remove('active-mode'); } 
    else { bgMusic.play().then(() => { isMusicPlaying = true; btnMusic.innerText = "موسيقى: تشغيل"; btnMusic.classList.add('active-mode'); }); }
});

// ==========================================
// 3. بناء الست أضلاع بنظام القص
// ==========================================
const SQUARE_SIZE = 0.5;
const COLS_X = 20; const ROWS_Z = 15; const ROWS_Y = 10;
const DIM_X = COLS_X * SQUARE_SIZE; const DIM_Z = ROWS_Z * SQUARE_SIZE; const DIM_Y = ROWS_Y * SQUARE_SIZE;

let roomCutData = { floor: [], ceiling: [], back: [], front: [], left: [], right: [] };
const roomGroup = new THREE.Group();
scene.add(roomGroup);
const wallsArray = [];

function generateWallTexture(cols, rows, wallName) {
    const canvas = document.createElement('canvas');
    canvas.width = cols * 100; canvas.height = rows * 100; 
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00f2fe'; ctx.lineWidth = 4;
    ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    
    let c = 1, w = 100, h = 100;
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            if (roomCutData[wallName].includes(c)) { ctx.clearRect(x*w, y*h, w, h); } 
            else { ctx.strokeRect(x*w, y*h, w, h); ctx.fillText(c, x*w + w/2, y*h + h/2); }
            c++;
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

function buildWall(name, cols, rows, width, height, posX, posY, posZ, rotX, rotY, rotZ) {
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({ map: generateWallTexture(cols, rows, name), side: THREE.DoubleSide, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX, posY, posZ); mesh.rotation.set(rotX, rotY, rotZ);
    mesh.name = name; mesh.userData = { cols: cols, rows: rows };
    roomGroup.add(mesh); wallsArray.push(mesh);
    return mesh;
}

buildWall('floor', COLS_X, ROWS_Z, DIM_X, DIM_Z, 0, 0, 0, -Math.PI/2, 0, 0);
buildWall('ceiling', COLS_X, ROWS_Z, DIM_X, DIM_Z, 0, DIM_Y, 0, Math.PI/2, 0, 0);
buildWall('back', COLS_X, ROWS_Y, DIM_X, DIM_Y, 0, DIM_Y/2, -DIM_Z/2, 0, 0, 0);
buildWall('front', COLS_X, ROWS_Y, DIM_X, DIM_Y, 0, DIM_Y/2, DIM_Z/2, 0, Math.PI, 0);
buildWall('left', ROWS_Z, ROWS_Y, DIM_Z, DIM_Y, -DIM_X/2, DIM_Y/2, 0, 0, Math.PI/2, 0);
buildWall('right', ROWS_Z, ROWS_Y, DIM_Z, DIM_Y, DIM_X/2, DIM_Y/2, 0, 0, -Math.PI/2, 0);
scene.updateMatrixWorld(true);

const indicatorGeo = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x2ed573, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
const cursorIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
cursorIndicator.visible = false;
scene.add(cursorIndicator);

// ==========================================
// 4. أزرار الواجهة الجديدة والأصلية
// ==========================================
let currentToolMode = 'PATH'; 
let isPathModeActive = false;
let areWallsVisible = true;

btnToolMode.addEventListener('click', () => {
    if(currentToolMode === 'PATH') {
        currentToolMode = 'CUT'; btnToolMode.innerText = "🔴 وضع الرسم: قص مربعات"; btnToolMode.className = "hud-btn tool-btn active-cut"; indicatorMat.color.setHex(0xff4757);
    } else {
        currentToolMode = 'PATH'; btnToolMode.innerText = "🟢 وضع الرسم: مسار"; btnToolMode.className = "hud-btn tool-btn active-path"; indicatorMat.color.setHex(0x2ed573);
    }
});

btnWalls.addEventListener('click', () => {
    areWallsVisible = !areWallsVisible;
    wallsArray.forEach(wall => { wall.visible = areWallsVisible; });
    areWallsVisible ? btnWalls.classList.add('active-mode') : btnWalls.classList.remove('active-mode');
});

btnPath.addEventListener('click', () => {
    isPathModeActive = !isPathModeActive;
    if(isPathModeActive) {
        pathPanel.classList.add('open'); btnPath.classList.add('active-mode'); btnToolMode.style.display = 'block';
        tCamRadius = 15.0; tCamPitch = Math.PI/2 - 0.05; tFocusX = 0; tFocusY = 0; tFocusZ = 0; 
    } else {
        pathPanel.classList.remove('open'); btnPath.classList.remove('active-mode'); btnToolMode.style.display = 'none';
        tCamRadius = 6.5; tCamPitch = 0.2; tFocusY = 1.2; cursorIndicator.visible = false;
    }
});

function getCodeArray() { let val = codeEditor.value.trim(); if(!val) return []; try { return JSON.parse(val); } catch(e) { return null; } }
function setCodeArray(arr) {
    if(arr.length === 0) { codeEditor.value = ''; return; }
    codeEditor.value = "[\n" + arr.map(p => "  " + JSON.stringify(p)).join(",\n") + "\n]"; codeEditor.scrollTop = codeEditor.scrollHeight;
}

document.getElementById('btn-clear-path').addEventListener('click', () => { codeEditor.value = ''; if(pathVisualLine) { scene.remove(pathVisualLine); pathVisualLine = null; } });
document.getElementById('btn-copy-path').addEventListener('click', (e) => { if(!codeEditor.value.trim()) return; navigator.clipboard.writeText(codeEditor.value); });
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        let act = e.currentTarget.getAttribute('data-act'); let arr = getCodeArray(); if(!arr || arr.length === 0) return;
        let lastPoint = arr[arr.length - 1]; if(lastPoint.length === 2) lastPoint.push(act); else lastPoint[2] = act; 
        setCodeArray(arr);
    });
});

// ==========================================
// 5. محرك الشخصيات الأصلي (تم استرجاعه بالكامل)
// ==========================================
let charactersData = [];
let globalWalkClip = null;
let idleActions = {}; 
let currentIdleIndex = 0, currentCharNum = 5, targetObjRotation = 0; 
let isSleeping = false, isTransitioningSleep = false, idleSwitchTimer = 0.0, isCharLoading = false;
let movementState = 'IDLE', pathProgress = 0, pathTotalLength = 0, currentTargetNodeIndex = 1, actionWaitTimer = 0;
let actualPathPoints3D = [], parsedPathData = [], pathCurve = null, pathVisualLine = null;

const clock = new THREE.Clock();
const loader = new GLTFLoader();

loader.load('https://raw.githubusercontent.com/korpika/hoolgem/main/char_5.glb', (charGltf) => {
    loader.load('https://raw.githubusercontent.com/korpika/hoolgem/main/Standard%20Walk.glb', (walkGltf) => {
        if(walkGltf.animations[0]) globalWalkClip = walkGltf.animations[0];
        setupCharacter(charGltf.scene); loadRestOfIdlesInBackground();
    });
});

function setupCharacter(charScene) {
    if(charactersData[0] && charactersData[0].scene) { charScene.position.copy(charactersData[0].scene.position); charScene.rotation.copy(charactersData[0].scene.rotation); scene.remove(charactersData[0].scene); } 
    else { charScene.position.set(0, 0, 0); }
    charScene.traverse((child) => { if (child.isMesh || child.isSkinnedMesh) child.frustumCulled = false; }); scene.add(charScene);
    
    let mixer = new THREE.AnimationMixer(charScene);
    let wAction = globalWalkClip ? mixer.clipAction(globalWalkClip) : null; if(wAction) wAction.setLoop(THREE.LoopRepeat);
    let currentActionToPlay = wAction;
    Object.keys(idleActions).forEach(key => {
        let clip = idleActions[key].getClip(); idleActions[key] = mixer.clipAction(clip);
        if(key === 'idle_9' || key === 'idle_10') { idleActions[key].setLoop(THREE.LoopOnce); idleActions[key].clampWhenFinished = true; }
        if(key === 'idle_1') currentActionToPlay = idleActions[key];
    });

    charactersData[0] = { scene: charScene, mixer: mixer, walkAction: wAction, currentAction: currentActionToPlay };
    if(charactersData[0].currentAction) charactersData[0].currentAction.play();
}

async function loadRestOfIdlesInBackground() {
    for(let i = 1; i <= 10; i++) {
        try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/idle_${i}.glb`);
            if(gltf.animations[0]) { let clip = gltf.animations[0]; if(i === 9) clip.duration = Math.max(0, clip.duration - 0.35); 
                if(charactersData[0]) { let newAction = charactersData[0].mixer.clipAction(clip);
                    if(i === 9 || i === 10) { newAction.setLoop(THREE.LoopOnce); newAction.clampWhenFinished = true; }
                    idleActions[`idle_${i}`] = newAction; if(i === 1 && movementState === 'IDLE') playAction(newAction); 
                }
            }
        } catch(e) { }
    }
}

function playAction(nextAction) {
    let char = charactersData[0]; if (!char || !nextAction || char.currentAction === nextAction) return;
    if (char.currentAction) char.currentAction.fadeOut(0.2); nextAction.reset().fadeIn(0.2).play(); char.currentAction = nextAction;
}

btnChar.addEventListener('click', async (e) => {
    if(mode !== 'NORMAL' || isCharLoading || isSleeping || isTransitioningSleep || movementState === 'PATHING') return;
    isCharLoading = true; const originalText = e.target.innerText; e.target.innerText = "⏳...";
    let attempt = currentCharNum + 1, success = false;
    while(!success && attempt <= 20) { try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/char_${attempt}.glb`); setupCharacter(gltf.scene); currentCharNum = attempt; success = true; } catch(err) { attempt++; } }
    if(!success) { attempt = 1; while(!success && attempt <= currentCharNum) { try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/char_${attempt}.glb`); setupCharacter(gltf.scene); currentCharNum = attempt; success = true; } catch(err) { attempt++; } } }
    e.target.innerText = originalText; isCharLoading = false;
});

btnAnim.addEventListener('click', () => {
    if(movementState !== 'IDLE' || isSleeping || isTransitioningSleep || movementState === 'PATHING') return;
    let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length === 0) return;
    currentIdleIndex = (currentIdleIndex + 1) % keys.length; playAction(idleActions[keys[currentIdleIndex]]);
});

btnSleep.addEventListener('click', (e) => {
    if(!charactersData[0] || isTransitioningSleep || movementState === 'PATHING') return;
    if(!isSleeping) { if(idleActions['idle_9']) { isSleeping = true; playAction(idleActions['idle_9']); e.target.classList.add('active-mode'); } } 
    else { if(idleActions['idle_10']) { isSleeping = false; isTransitioningSleep = true; e.target.classList.remove('active-mode'); let wakeAction = idleActions['idle_10']; wakeAction.timeScale = 1.0; playAction(wakeAction); const onWakeFinished = (ev) => { if(ev.action === wakeAction) { charactersData[0].mixer.removeEventListener('finished', onWakeFinished); isTransitioningSleep = false; if(!isSleeping && idleActions['idle_1']) { currentIdleIndex = 0; playAction(idleActions['idle_1']); } } }; charactersData[0].mixer.addEventListener('finished', onWakeFinished); } }
});

btnCamera.addEventListener('click', (e) => {
    if(mode === 'FREECAM') btnFreeCam.classList.remove('active-mode');
    if(mode === 'CAMERA') { mode = 'NORMAL'; e.target.classList.remove('active-mode'); tCamAngle = 0; tCamPitch = 0.2; tCamRadius = 6.5; tFocusX = 0; tFocusY = 1.2; tFocusZ = 0; } 
    else { mode = 'CAMERA'; e.target.classList.add('active-mode'); }
});

btnFreeCam.addEventListener('click', (e) => {
    if(mode === 'CAMERA') btnCamera.classList.remove('active-mode');
    if(mode === 'FREECAM') { mode = 'NORMAL'; e.target.classList.remove('active-mode'); tCamAngle = 0; tCamPitch = 0.2; tCamRadius = 6.5; tFocusX = 0; tFocusY = 1.2; tFocusZ = 0; } 
    else { mode = 'FREECAM'; e.target.classList.add('active-mode'); tCamRadius = 20; tCamPitch = Math.PI/3; tCamAngle = 0; tFocusX = 0; tFocusY = 0; tFocusZ = 0; }
});

// ==========================================
// 6. التحكم باللمس والـ Raycaster
// ==========================================
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();

function updateMousePosition(clientX, clientY) {
    let isPortrait = window.innerHeight > window.innerWidth;
    if(isPortrait) { mouse.x = (clientY / window.innerHeight) * 2 - 1; mouse.y = -((window.innerWidth - clientX) / window.innerWidth) * 2 + 1; } 
    else { mouse.x = (clientX / window.innerWidth) * 2 - 1; mouse.y = -(clientY / window.innerHeight) * 2 + 1; }
}

container.addEventListener('pointermove', (e) => {
    if(!isPathModeActive) return;
    updateMousePosition(e.clientX, e.clientY); raycaster.setFromCamera(mouse, camera);
    const visibleWalls = wallsArray.filter(w => w.visible); const intersects = raycaster.intersectObjects(visibleWalls);
    if(intersects.length > 0) {
        const hit = intersects[0]; const wall = hit.object; const cols = wall.userData.cols; const rows = wall.userData.rows;
        let c = Math.floor(hit.uv.x * cols); let r = Math.floor((1.0 - hit.uv.y) * rows); c = Math.max(0, Math.min(cols - 1, c)); r = Math.max(0, Math.min(rows - 1, r));
        const localX = (c * SQUARE_SIZE) + (SQUARE_SIZE / 2) - (cols * SQUARE_SIZE / 2); const localY = (r * SQUARE_SIZE) + (SQUARE_SIZE / 2) - (rows * SQUARE_SIZE / 2);
        cursorIndicator.position.set(localX, localY, 0.01); cursorIndicator.rotation.set(0, 0, 0);
        wall.localToWorld(cursorIndicator.position); cursorIndicator.setRotationFromQuaternion(wall.quaternion); cursorIndicator.visible = true;
    } else { cursorIndicator.visible = false; }
});

container.addEventListener('pointerdown', (e) => {
    if(!isPathModeActive) return;
    updateMousePosition(e.clientX, e.clientY); raycaster.setFromCamera(mouse, camera);
    const visibleWalls = wallsArray.filter(w => w.visible); const intersects = raycaster.intersectObjects(visibleWalls);
    if(intersects.length > 0) {
        const hit = intersects[0]; const wall = hit.object; const cols = wall.userData.cols; const rows = wall.userData.rows;
        let c = Math.floor(hit.uv.x * cols); let r = Math.floor((1.0 - hit.uv.y) * rows); c = Math.max(0, Math.min(cols - 1, c)); r = Math.max(0, Math.min(rows - 1, r));
        let squareNum = (r * cols) + c + 1; const wallName = wall.name;
        
        if (currentToolMode === 'CUT') {
            const index = roomCutData[wallName].indexOf(squareNum);
            if(index === -1) roomCutData[wallName].push(squareNum); else roomCutData[wallName].splice(index, 1);
            wall.material.map = generateWallTexture(cols, rows, wallName);
        } else if (currentToolMode === 'PATH') {
            let arr = getCodeArray(); if(arr === null) return;
            if(arr.length === 0 || arr[arr.length-1][1] !== squareNum || arr[arr.length-1][0] !== wallName) { arr.push([wallName, squareNum]); setCodeArray(arr); }
        }
    }
});

let startX = 0, startY = 0; let initialPinchDist = null;
window.addEventListener('touchstart', (e) => {
    if(isPathModeActive) return;
    if (e.touches.length === 2 && mode === 'CAMERA') { initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); startX = (e.touches[0].clientX + e.touches[1].clientX)/2; startY = (e.touches[0].clientY + e.touches[1].clientY)/2; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
});

window.addEventListener('touchmove', (e) => {
    if(isPathModeActive) return; e.preventDefault();
    let touchX = e.touches[0].clientX; let touchY = e.touches[0].clientY; let isPortrait = window.innerHeight > window.innerWidth;
    let moveX = isPortrait ? (touchY - startY) : (touchX - startX); let moveY = isPortrait ? -(touchX - startX) : (touchY - startY);
    if(mode === 'CAMERA') {
        if(e.touches.length === 1) { tCamAngle -= moveX * 0.005; tCamPitch += moveY * 0.005; if(tCamPitch < 0.05) tCamPitch = 0.05; if(tCamPitch > Math.PI/2 - 0.05) tCamPitch = Math.PI/2 - 0.05; startX = touchX; startY = touchY; } 
        else if (e.touches.length === 2) { let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); let cx = (e.touches[0].clientX + e.touches[1].clientX)/2; let cy = (e.touches[0].clientY + e.touches[1].clientY)/2; let mX = isPortrait ? (cy - startY) : (cx - startX); let mY = isPortrait ? -(cx - startX) : (cy - startY); if (initialPinchDist) { tCamRadius -= (dist - initialPinchDist) * 0.05; tCamRadius = Math.max(0.01, Math.min(tCamRadius, 25.0)); tFocusX -= Math.cos(tCamAngle) * mX * 0.01; tFocusZ += Math.sin(tCamAngle) * mX * 0.01; tFocusY += mY * 0.01; } initialPinchDist = dist; startX = cx; startY = cy; }
    }
}, {passive: false});

window.addEventListener('touchend', (e) => {
    initialPinchDist = null; if(isPathModeActive || charactersData.length === 0 || isSleeping || isTransitioningSleep) return;
    if(movementState === 'PATHING' || movementState === 'PLAYING_ACTION') return; 
    let diffX = e.changedTouches[0].clientX - startX; let diffY = e.changedTouches[0].clientY - startY; let isPortrait = window.innerHeight > window.innerWidth;
    if (mode !== 'NORMAL') return; 
    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) { movementState = 'IDLE'; let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length > 0 && charactersData[0]) { let currentKey = Object.keys(idleActions).find(k => idleActions[k] === charactersData[0].currentAction); if(!currentKey || currentKey === 'walk') playAction(idleActions[keys[currentIdleIndex]]); } return; }
    let swipeX = isPortrait ? diffY : diffX; let swipeY = isPortrait ? -diffX : diffY;
    if (Math.abs(swipeX) > Math.abs(swipeY)) { if (swipeX > 0) { movementState = 'RIGHT'; targetObjRotation = Math.PI / 2; } else { movementState = 'LEFT'; targetObjRotation = -Math.PI / 2; } } 
    else { if (swipeY > 0) { movementState = 'DOWN'; targetObjRotation = 0; } else { movementState = 'UP'; targetObjRotation = Math.PI; } }
    if(charactersData[0] && charactersData[0].walkAction) playAction(charactersData[0].walkAction);
});

// ==========================================
// 7. تشغيل المسار والأنيميشن
// ==========================================
function getExact3DPositionFloor(num) {
    let index = num - 1; let c = index % COLS_X; let r = Math.floor(index / COLS_X);
    let localX = (c * SQUARE_SIZE) + (SQUARE_SIZE/2) - (DIM_X / 2); let localY = (r * SQUARE_SIZE) + (SQUARE_SIZE/2) - (DIM_Z / 2);
    return new THREE.Vector3(localX, 0, localY);
}

function createRoundedPath(points, cornerRadius = 0.2) {
    let path = new THREE.CurvePath(); if(points.length < 2) return path; if(points.length === 2) { path.add(new THREE.LineCurve3(points[0], points[1])); return path; }
    let currentPos = points[0].clone();
    for (let i = 1; i < points.length - 1; i++) {
        let pPrev = points[i - 1], pCurr = points[i], pNext = points[i + 1]; let v1 = new THREE.Vector3().subVectors(pCurr, pPrev).normalize(); let v2 = new THREE.Vector3().subVectors(pNext, pCurr).normalize();
        let r = Math.min(cornerRadius, pCurr.distanceTo(pPrev)*0.4, pNext.distanceTo(pCurr)*0.4);
        let cornerStart = new THREE.Vector3().copy(pCurr).sub(v1.clone().multiplyScalar(r)); let cornerEnd = new THREE.Vector3().copy(pCurr).add(v2.clone().multiplyScalar(r));
        if (currentPos.distanceTo(cornerStart) > 0.01) path.add(new THREE.LineCurve3(currentPos.clone(), cornerStart.clone()));
        path.add(new THREE.QuadraticBezierCurve3(cornerStart.clone(), pCurr.clone(), cornerEnd.clone())); currentPos = cornerEnd.clone();
    }
    if (currentPos.distanceTo(points[points.length - 1]) > 0.01) path.add(new THREE.LineCurve3(currentPos.clone(), points[points.length - 1].clone())); return path;
}

btnPlayPath.addEventListener('click', () => {
    if(!charactersData[0] || isSleeping || isTransitioningSleep) return;
    let arr = getCodeArray(); if(arr === null || arr.length === 0) { alert("لا يوجد مسار محفوظ!"); return; }
    parsedPathData = arr; let tempPoints = [];
    parsedPathData.forEach(item => { if(item[0] === 'floor') tempPoints.push(getExact3DPositionFloor(item[1])); }); // مؤقتاً المشي على الأرضية فقط
    if(tempPoints.length === 0) return;
    actualPathPoints3D = [tempPoints[0]]; for(let i=1; i<tempPoints.length; i++) { if(tempPoints[i].distanceTo(tempPoints[i-1]) > 0.05) actualPathPoints3D.push(tempPoints[i]); }
    if(pathVisualLine) scene.remove(pathVisualLine); pathProgress = 0; currentTargetNodeIndex = 1; actionWaitTimer = 0;
    if (actualPathPoints3D.length > 0) charactersData[0].scene.position.copy(actualPathPoints3D[0]); if (actualPathPoints3D.length < 2) return;
    pathCurve = createRoundedPath(actualPathPoints3D, 0.2); pathTotalLength = pathCurve.getLength(); movementState = 'PATHING'; 
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pathCurve.getPoints(200)); const lineMat = new THREE.LineBasicMaterial({ color: 0x2ed573, linewidth: 3 });
    pathVisualLine = new THREE.Line(lineGeo, lineMat); pathVisualLine.position.y += 0.02; scene.add(pathVisualLine); if(!areWallsVisible) pathVisualLine.visible = false;
    if(charactersData[0].walkAction) playAction(charactersData[0].walkAction);
});

window.addEventListener('resize', () => { camera.aspect = wrapper.clientWidth / wrapper.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(wrapper.clientWidth, wrapper.clientHeight); });

function animate() {
    requestAnimationFrame(animate); let delta = clock.getDelta(); let char = charactersData[0];
    if (char) {
        if (char.mixer) char.mixer.update(delta);
        if (movementState === 'IDLE' && !isSleeping && !isTransitioningSleep) { idleSwitchTimer += delta; if (idleSwitchTimer >= 6.0) { idleSwitchTimer = 0.0; let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length > 0) { currentIdleIndex = (currentIdleIndex + 1) % keys.length; playAction(idleActions[keys[currentIdleIndex]]); } } } else { idleSwitchTimer = 0.0; }
        if (['RIGHT', 'LEFT', 'UP', 'DOWN'].includes(movementState) && mode === 'NORMAL' && !isSleeping && !isTransitioningSleep) {
            let diff = targetObjRotation - char.scene.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); char.scene.rotation.y += diff * 12.0 * delta; 
            let moveSpeed = 1.75 * delta; let oldX = char.scene.position.x; let oldZ = char.scene.position.z;
            if (movementState === 'RIGHT') char.scene.position.x += moveSpeed; if (movementState === 'LEFT') char.scene.position.x -= moveSpeed; if (movementState === 'UP') char.scene.position.z -= moveSpeed; if (movementState === 'DOWN') char.scene.position.z += moveSpeed;
            char.scene.position.x = Math.max(-DIM_X/2, Math.min(DIM_X/2, char.scene.position.x)); char.scene.position.z = Math.max(-DIM_Z/2, Math.min(DIM_Z/2, char.scene.position.z));
            if (char.scene.position.x === oldX && char.scene.position.z === oldZ) { movementState = 'IDLE'; let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length > 0) playAction(idleActions[keys[currentIdleIndex]]); }
        }
        if (movementState === 'PLAYING_ACTION') { actionWaitTimer -= delta; if (actionWaitTimer <= 0) { movementState = 'PATHING'; currentTargetNodeIndex++; if(char.walkAction) playAction(char.walkAction); } }
        else if (movementState === 'PATHING' && pathCurve) {
            let pathSpeed = 1.75; let progressDelta = (pathSpeed * delta) / pathTotalLength; pathProgress += progressDelta;
            if (pathProgress >= 1.0) { pathProgress = 1.0; movementState = 'IDLE'; currentTargetNodeIndex = 1; let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length > 0) playAction(idleActions[keys[currentIdleIndex]]); if(pathVisualLine) { scene.remove(pathVisualLine); pathVisualLine = null; } }
            let currentPos = pathCurve.getPoint(pathProgress); char.scene.position.set(currentPos.x, currentPos.y, currentPos.z);
            if (pathProgress < 1.0) { let tangent = pathCurve.getTangent(pathProgress); let targetRot = Math.atan2(tangent.x, tangent.z); let diff = targetRot - char.scene.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); char.scene.rotation.y += diff * 12.0 * delta; }
            if (currentTargetNodeIndex < actualPathPoints3D.length) {
                let targetNode3D = actualPathPoints3D[currentTargetNodeIndex]; let dist = char.scene.position.distanceTo(targetNode3D);
                if (dist < 0.1) { let dataIndex = parsedPathData.findIndex(p => getExact3DPositionFloor(p[1]).distanceTo(targetNode3D) < 0.05); if(dataIndex !== -1 && parsedPathData[dataIndex].length > 2) { movementState = 'PLAYING_ACTION'; let reqAction = parsedPathData[dataIndex][2]; if(reqAction === 'idle_9' || reqAction === 'idle_10') actionWaitTimer = 4.0; else actionWaitTimer = 2.5; if(idleActions[reqAction]) playAction(idleActions[reqAction]); else if(idleActions['idle_1']) playAction(idleActions['idle_1']); } else { currentTargetNodeIndex++; } }
            }
        }
    }
    camAngle = THREE.MathUtils.lerp(camAngle, tCamAngle, 5.0 * delta); camPitch = THREE.MathUtils.lerp(camPitch, tCamPitch, 5.0 * delta); camRadius = THREE.MathUtils.lerp(camRadius, tCamRadius, 5.0 * delta); focusX = THREE.MathUtils.lerp(focusX, tFocusX, 8.0 * delta); focusY = THREE.MathUtils.lerp(focusY, tFocusY, 8.0 * delta); focusZ = THREE.MathUtils.lerp(focusZ, tFocusZ, 8.0 * delta);
    let xz_radius = Math.cos(camPitch) * camRadius; camera.position.x = focusX + Math.sin(camAngle) * xz_radius; camera.position.y = focusY + Math.sin(camPitch) * camRadius; camera.position.z = focusZ + Math.cos(camAngle) * xz_radius; camera.lookAt(focusX, focusY, focusZ);
    renderer.render(scene, camera);
}
animate();
