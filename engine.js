/**
 * ============================================================================
 * HOOL GEM - MASTER ENGINE (300 SQUARES) - CLOUD VERSION
 * ============================================================================
 * شرح هندسي ومنطقي للمحرك:
 * 1. هذا الملف عبارة عن Module مستقل يعمل بمجرد استدعائه.
 * 2. يقوم بمسح محتوى الـ HTML الحالي واستبداله بواجهة المحرك الرسومية بالكامل (HTML/CSS Injection).
 * 3. يبني مشهد Three.js بشبكة أبعادها 10 متر في 7.5 متر، مقسمة لـ 20x15 (300 مربع).
 * 4. يطبق نظام Raycaster معكوس لمعالجة إجبارية تدوير الشاشة (Landscape) على متصفحات الهواتف.
 * 5. يدير نظام استيراد النماذج (GLTF) والحركات (Animations) وتزامنها مع الإحداثيات الرياضية.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// منع ظهور رسائل التحذير للحفاظ على نظافة كونسول المتصفح
console.warn = () => {}; console.error = () => {}; 

// ==========================================
// 1. حقن واجهة المستخدم (UI Injection)
// ==========================================
document.body.innerHTML = `
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; user-select: none; font-family: sans-serif; }
        
        /* إجبار الشاشة على الالتفاف العرضي (Landscape) هندسياً */
        #game-wrapper { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; overflow: hidden; }
        @media screen and (orientation: portrait) {
            #game-wrapper { width: 100vh; height: 100vw; transform: rotate(90deg); transform-origin: center; top: 50%; left: 50%; margin-top: -50vw; margin-left: -50vh; }
        }

        #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; touch-action: none; }
        
        /* القائمة الجانبية للأزرار الأساسية */
        #ui-layer { position: absolute; top: 15px; left: 15px; z-index: 10; display: flex; flex-direction: column; gap: 8px; }
        .hud-btn { background: rgba(0,0,0,0.85); color: #00f2fe; border: 1px solid #00f2fe; border-radius: 5px; padding: 8px 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 11px; text-align: center; }
        .hud-btn.active-mode { background: #00f2fe; color: #000; box-shadow: 0 0 10px #00f2fe; }

        /* لوحة إعدادات المسار اليمنى */
        #path-panel { position: absolute; top: 15px; right: -250px; width: 180px; background: rgba(10, 10, 10, 0.95); border: 1px solid #00f2fe; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 6px; z-index: 10; transition: right 0.3s ease; box-shadow: -5px 5px 15px rgba(0,0,0,0.8); max-height: 90vh; }
        #path-panel.open { right: 15px; }
        .panel-title { color: #00f2fe; font-size: 13px; text-align: center; margin: 0 0 5px 0; font-weight: bold; }
        
        /* محرر كود JSON */
        #code-editor { width: 100%; height: 90px; background: #050505; color: #00f2fe; border: 1px solid #333; padding: 6px; font-family: monospace; font-size: 11px; direction: ltr; resize: none; border-radius: 4px; outline: none; white-space: pre; box-sizing: border-box; }
        #code-editor:focus { border-color: #00f2fe; }

        /* منطقة أزرار الحركات */
        .actions-scroller { max-height: 85px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding-right: 4px; }
        .actions-scroller::-webkit-scrollbar { width: 4px; }
        .actions-scroller::-webkit-scrollbar-thumb { background: #00f2fe; border-radius: 4px; }
        .action-btn { background: #1a1a1a; color: #fff; border: 1px solid #444; border-radius: 3px; padding: 6px 0; font-size: 10px; cursor: pointer; text-align: center; }
        .action-btn:hover { border-color: #2ed573; color: #2ed573; }
        
        .flex-row { display: flex; gap: 4px; }
        .flex-row button { flex: 1; padding: 6px 0; font-size: 10px; }
    </style>

    <div id="game-wrapper">
        <div id="ui-layer">
            <button id="btn-play-path" class="hud-btn" style="border-color: #2ed573; color: #2ed573;">▶ تشغيل المسار</button>
            <button id="btn-path" class="hud-btn">صفحة المطور</button>
            <button id="btn-grid" class="hud-btn active-mode">الشبكة</button>
            <button id="btn-camera" class="hud-btn">الكاميرا</button>
            <button id="btn-freecam" class="hud-btn">كاميرا حرة</button>
            <button id="btn-sleep" class="hud-btn">نوم</button>
            <button id="btn-anim" class="hud-btn">تبديل الحركة</button>
            <button id="btn-char" class="hud-btn">تبديل الشخصية</button>
            <button id="btn-music" class="hud-btn">موسيقى: إيقاف</button>
        </div>

        <div id="path-panel">
            <h3 class="panel-title">إعدادات المسار (JSON)</h3>
            <textarea id="code-editor" placeholder="[JSON Code...]"></textarea>
            <div style="font-size: 10px; color: #aaa; text-align: center;">إضافة حركة للآخر:</div>
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
// 2. إعدادات المحرك والمشهد الأساسي (Three.js)
// ==========================================
const wrapper = document.getElementById('game-wrapper');
const container = document.getElementById('canvas-container');

// ربط متغيرات الواجهة بالعناصر
const btnPlayPath = document.getElementById('btn-play-path');
const btnPath = document.getElementById('btn-path');
const btnGrid = document.getElementById('btn-grid');
const btnCamera = document.getElementById('btn-camera');
const btnFreeCam = document.getElementById('btn-freecam');
const btnSleep = document.getElementById('btn-sleep');
const btnAnim = document.getElementById('btn-anim');
const btnChar = document.getElementById('btn-char');
const btnMusic = document.getElementById('btn-music');
const pathPanel = document.getElementById('path-panel');
const codeEditor = document.getElementById('code-editor');
const btnClearPath = document.getElementById('btn-clear-path');
const btnCopyPath = document.getElementById('btn-copy-path');

// إنشاء المشهد والكاميرا والريندرر
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, wrapper.clientWidth / wrapper.clientHeight, 0.001, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// الإضاءة (إضاءة محيطية + إضاءة موجهة)
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(2, 5, 4);
scene.add(mainLight);

// متغيرات الكاميرا والمحاكاة
let mode = 'NORMAL'; 
let camAngle = 0, camPitch = 0.2, camRadius = 6.5;
let focusX = 0, focusY = 1.2, focusZ = 0;
let tCamAngle = 0, tCamPitch = 0.2, tCamRadius = 6.5;
let tFocusX = 0, tFocusY = 1.2, tFocusZ = 0;

// نظام الموسيقى
const bgMusic = new Audio('https://raw.githubusercontent.com/korpika/hoolgem/main/bg_music.mp3');
bgMusic.loop = true; bgMusic.volume = 0.4;
let isMusicPlaying = false;

function autoStartMusic() {
    if(!isMusicPlaying) {
        bgMusic.play().then(() => { isMusicPlaying = true; btnMusic.innerText = "موسيقى: تشغيل"; btnMusic.classList.add('active-mode'); }).catch(() => {});
    }
}
window.addEventListener('touchstart', autoStartMusic, { once: true });
window.addEventListener('click', autoStartMusic, { once: true });

btnMusic.addEventListener('click', () => {
    if(isMusicPlaying) {
        bgMusic.pause(); isMusicPlaying = false;
        btnMusic.innerText = "موسيقى: إيقاف"; btnMusic.classList.remove('active-mode');
    } else {
        bgMusic.play().then(() => { isMusicPlaying = true; btnMusic.innerText = "موسيقى: تشغيل"; btnMusic.classList.add('active-mode'); });
    }
});

// ==========================================
// 3. بناء الشبكة والأرضية الرياضية المعتمدة
// ==========================================
// الشبكة تتكون من 20 عمود و 15 صف = 300 مربع
const COLS = 20;
const ROWS = 15;
const WIDTH = 10.0; 
const DEPTH = 7.5;  

// معادلة رسم الأرقام والمربعات على النسيج بدقة
function createGridTex(cols, rows) {
    const canvas = document.createElement('canvas');
    canvas.width = cols * 100; 
    canvas.height = rows * 100; 
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00f2fe'; ctx.lineWidth = 4;
    
    let c = 1, w = 100, h = 100;
    ctx.font = 'bold 35px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            ctx.strokeRect(x*w, y*h, w, h);
            ctx.fillText(c++, x*w + w/2, y*h + h/2);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

const floorGeo = new THREE.PlaneGeometry(WIDTH, DEPTH);
const floorMat = new THREE.MeshBasicMaterial({ map: createGridTex(COLS, ROWS) });
const floorMesh = new THREE.Mesh(floorGeo, floorMat); 
floorMesh.rotation.x = -Math.PI/2; 
scene.add(floorMesh);
scene.updateMatrixWorld(true);

let isGridVisible = true;
let isPathModeActive = false;
let pathCurve = null;
let pathVisualLine = null;
let movementState = 'IDLE'; 
let pathProgress = 0, pathTotalLength = 0, currentTargetNodeIndex = 1, actionWaitTimer = 0;
let actualPathPoints3D = [], parsedPathData = [];

// ==========================================
// 4. أزرار التحكم والـ JSON
// ==========================================
btnGrid.addEventListener('click', (e) => {
    isGridVisible = !isGridVisible;
    floorMesh.visible = isGridVisible;
    if (pathVisualLine) pathVisualLine.visible = isGridVisible;
    isGridVisible ? e.target.classList.add('active-mode') : e.target.classList.remove('active-mode');
});

btnPath.addEventListener('click', () => {
    isPathModeActive = !isPathModeActive;
    if(isPathModeActive) {
        pathPanel.classList.add('open');
        btnPath.classList.add('active-mode');
        tCamRadius = 12.0; tCamPitch = Math.PI/2 - 0.05; tCamAngle = 0; 
        tFocusX = -1.5; tFocusY = 0; tFocusZ = 0; 
    } else {
        pathPanel.classList.remove('open');
        btnPath.classList.remove('active-mode');
        tCamRadius = 6.5; tCamPitch = 0.2; tCamAngle = 0; 
        tFocusX = 0; tFocusY = 1.2; tFocusZ = 0;
    }
});

function getCodeArray() {
    let val = codeEditor.value.trim();
    if(!val) return [];
    try { return JSON.parse(val); } catch(e) { return null; }
}

function setCodeArray(arr) {
    if(arr.length === 0) { codeEditor.value = ''; return; }
    codeEditor.value = "[\n" + arr.map(p => "  " + JSON.stringify(p)).join(",\n") + "\n]";
    codeEditor.scrollTop = codeEditor.scrollHeight;
}

btnClearPath.addEventListener('click', () => { 
    codeEditor.value = '';
    if(pathVisualLine) { scene.remove(pathVisualLine); pathVisualLine = null; }
});

btnCopyPath.addEventListener('click', (e) => {
    if(!codeEditor.value.trim()) return;
    navigator.clipboard.writeText(codeEditor.value).then(() => {
        let old = e.target.innerText; e.target.innerText = "تم النسخ";
        setTimeout(() => e.target.innerText = old, 1500);
    });
});

document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        let act = e.currentTarget.getAttribute('data-act');
        let arr = getCodeArray();
        if(!arr || arr.length === 0) return;
        let lastPoint = arr[arr.length - 1];
        if(lastPoint.length === 2) lastPoint.push(act);
        else lastPoint[2] = act; 
        setCodeArray(arr);
    });
});

// ==========================================
// 5. محرك تحميل الشخصيات والحركات
// ==========================================
let charactersData = [];
let globalWalkClip = null;
let idleActions = {}; 
let currentIdleIndex = 0, currentCharNum = 5, targetObjRotation = 0; 
let isSleeping = false, isTransitioningSleep = false, idleSwitchTimer = 0.0, isCharLoading = false;

const clock = new THREE.Clock();
const loader = new GLTFLoader();

// تحميل الشخصية الأساسية وحركة المشي
loader.load('https://raw.githubusercontent.com/korpika/hoolgem/main/char_5.glb', (charGltf) => {
    loader.load('https://raw.githubusercontent.com/korpika/hoolgem/main/Standard%20Walk.glb', (walkGltf) => {
        if(walkGltf.animations[0]) globalWalkClip = walkGltf.animations[0];
        setupCharacter(charGltf.scene);
        loadRestOfIdlesInBackground();
    });
});

function setupCharacter(charScene) {
    if(charactersData[0] && charactersData[0].scene) {
        charScene.position.copy(charactersData[0].scene.position);
        charScene.rotation.copy(charactersData[0].scene.rotation);
        scene.remove(charactersData[0].scene);
    } else { charScene.position.set(0, 0, 0); }
    charScene.traverse((child) => { if (child.isMesh || child.isSkinnedMesh) child.frustumCulled = false; });
    scene.add(charScene);
    
    let mixer = new THREE.AnimationMixer(charScene);
    let wAction = globalWalkClip ? mixer.clipAction(globalWalkClip) : null;
    if(wAction) wAction.setLoop(THREE.LoopRepeat);
    
    let currentActionToPlay = wAction;
    Object.keys(idleActions).forEach(key => {
        let clip = idleActions[key].getClip();
        idleActions[key] = mixer.clipAction(clip);
        if(key === 'idle_9' || key === 'idle_10') { idleActions[key].setLoop(THREE.LoopOnce); idleActions[key].clampWhenFinished = true; }
        if(key === 'idle_1') currentActionToPlay = idleActions[key];
    });

    charactersData[0] = { scene: charScene, mixer: mixer, walkAction: wAction, currentAction: currentActionToPlay };
    if(charactersData[0].currentAction) charactersData[0].currentAction.play();
}

// تحميل الحركات الثابتة في الخلفية لضمان سرعة الأداء
async function loadRestOfIdlesInBackground() {
    for(let i = 1; i <= 10; i++) {
        try {
            let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/idle_${i}.glb`);
            if(gltf.animations[0]) {
                let clip = gltf.animations[0];
                if(i === 9) clip.duration = Math.max(0, clip.duration - 0.35); 
                if(charactersData[0]) {
                    let newAction = charactersData[0].mixer.clipAction(clip);
                    if(i === 9 || i === 10) { newAction.setLoop(THREE.LoopOnce); newAction.clampWhenFinished = true; }
                    idleActions[`idle_${i}`] = newAction;
                    if(i === 1 && movementState === 'IDLE') playAction(newAction); 
                }
            }
        } catch(e) { }
    }
}

function playAction(nextAction) {
    let char = charactersData[0];
    if (!char || !nextAction || char.currentAction === nextAction) return;
    if (char.currentAction) char.currentAction.fadeOut(0.2);
    nextAction.reset().fadeIn(0.2).play();
    char.currentAction = nextAction;
}

function triggerNextSequentialIdle() {
    let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10');
    if(keys.length === 0) return;
    currentIdleIndex = (currentIdleIndex + 1) % keys.length;
    playAction(idleActions[keys[currentIdleIndex]]);
}

// ==========================================
// 6. التحكمات (الأزرار واللمس والكاميرا)
// ==========================================
btnChar.addEventListener('click', async (e) => {
    if(mode !== 'NORMAL' || isCharLoading || isSleeping || isTransitioningSleep || movementState === 'PATHING') return;
    isCharLoading = true;
    const originalText = e.target.innerText; e.target.innerText = "⏳...";

    let attempt = currentCharNum + 1, success = false;
    while(!success && attempt <= 20) {
        try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/char_${attempt}.glb`);
            setupCharacter(gltf.scene); currentCharNum = attempt; success = true;
        } catch(err) { attempt++; }
    }
    if(!success) { attempt = 1;
        while(!success && attempt <= currentCharNum) {
            try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/char_${attempt}.glb`);
                setupCharacter(gltf.scene); currentCharNum = attempt; success = true;
            } catch(err) { attempt++; }
        }
    }
    e.target.innerText = originalText; isCharLoading = false;
});

btnAnim.addEventListener('click', () => {
    if(movementState !== 'IDLE' || isSleeping || isTransitioningSleep || movementState === 'PATHING') return;
    idleSwitchTimer = 0.0; triggerNextSequentialIdle();
});

btnSleep.addEventListener('click', (e) => {
    if(!charactersData[0] || isTransitioningSleep || movementState === 'PATHING') return;
    if(!isSleeping) {
        if(idleActions['idle_9']) { isSleeping = true; playAction(idleActions['idle_9']); e.target.classList.add('active-mode'); }
    } else {
        if(idleActions['idle_10']) {
            isSleeping = false; isTransitioningSleep = true; e.target.classList.remove('active-mode');
            let wakeAction = idleActions['idle_10']; wakeAction.timeScale = 1.0; playAction(wakeAction);
            const onWakeFinished = (ev) => {
                if(ev.action === wakeAction) {
                    charactersData[0].mixer.removeEventListener('finished', onWakeFinished);
                    isTransitioningSleep = false;
                    if(!isSleeping && idleActions['idle_1']) { currentIdleIndex = 0; playAction(idleActions['idle_1']); }
                }
            };
            charactersData[0].mixer.addEventListener('finished', onWakeFinished);
        }
    }
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
// 7. المعالجة الرياضية لالتقاط المربعات (Raycasting)
// ==========================================
// هنا تكمن معادلة حل مشكلة الشاشة الملفوفة (Landscape)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

container.addEventListener('pointerdown', (e) => {
    if(!isPathModeActive) return;
    
    let touchX = e.clientX; 
    let touchY = e.clientY;
    let isPortrait = window.innerHeight > window.innerWidth;
    
    // إذا كانت الشاشة طولية، نعكس الإحداثيات لتتطابق مع الـ Landscape الوهمي
    if(isPortrait) {
        let logicalX = touchY;
        let logicalY = window.innerWidth - touchX;
        mouse.x = (logicalX / window.innerHeight) * 2 - 1;
        mouse.y = -(logicalY / window.innerWidth) * 2 + 1;
    } else {
        mouse.x = (touchX / window.innerWidth) * 2 - 1;
        mouse.y = -(touchY / window.innerHeight) * 2 + 1;
    }
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floorMesh);
    
    if(intersects.length > 0) {
        let uv = intersects[0].uv;
        let c = Math.floor(uv.x * COLS);
        let r = Math.floor((1.0 - uv.y) * ROWS); 
        c = Math.max(0, Math.min(COLS - 1, c));
        r = Math.max(0, Math.min(ROWS - 1, r));
        let squareNum = (r * COLS) + c + 1;
        
        let arr = getCodeArray();
        if(arr === null) { alert("يوجد خطأ في كود JSON!"); return; }
        
        if(arr.length === 0 || arr[arr.length-1][1] !== squareNum) {
            arr.push(["floor", squareNum]);
            setCodeArray(arr);
        }
    }
});

// تحويل رقم المربع إلى إحداثيات 3D حقيقية
function getExact3DPosition(num) {
    let index = num - 1;
    let c = index % COLS;
    let r = Math.floor(index / COLS);
    let localX = (c * 0.5) + 0.25 - (WIDTH / 2);
    let localY = (r * 0.5) + 0.25 - (DEPTH / 2);
    return new THREE.Vector3(localX, 0, localY);
}

// رسم منحنيات ناعمة بين النقاط
function createRoundedPath(points, cornerRadius = 0.2) {
    let path = new THREE.CurvePath();
    if(points.length < 2) return path;
    if(points.length === 2) { path.add(new THREE.LineCurve3(points[0], points[1])); return path; }

    let currentPos = points[0].clone();
    for (let i = 1; i < points.length - 1; i++) {
        let pPrev = points[i - 1], pCurr = points[i], pNext = points[i + 1];
        let v1 = new THREE.Vector3().subVectors(pCurr, pPrev).normalize();
        let v2 = new THREE.Vector3().subVectors(pNext, pCurr).normalize();
        
        let r = Math.min(cornerRadius, pCurr.distanceTo(pPrev)*0.4, pNext.distanceTo(pCurr)*0.4);
        let cornerStart = new THREE.Vector3().copy(pCurr).sub(v1.clone().multiplyScalar(r));
        let cornerEnd = new THREE.Vector3().copy(pCurr).add(v2.clone().multiplyScalar(r));

        if (currentPos.distanceTo(cornerStart) > 0.01) path.add(new THREE.LineCurve3(currentPos.clone(), cornerStart.clone()));
        path.add(new THREE.QuadraticBezierCurve3(cornerStart.clone(), pCurr.clone(), cornerEnd.clone()));
        currentPos = cornerEnd.clone();
    }
    if (currentPos.distanceTo(points[points.length - 1]) > 0.01) path.add(new THREE.LineCurve3(currentPos.clone(), points[points.length - 1].clone()));
    return path;
}

// ==========================================
// 8. محرك تشغيل المسارات والأنيميشن
// ==========================================
btnPlayPath.addEventListener('click', () => {
    if(!charactersData[0] || isSleeping || isTransitioningSleep) return;
    
    let arr = getCodeArray();
    if(arr === null || arr.length === 0) { alert("لا يوجد مسار محفوظ!"); return; }

    parsedPathData = arr;
    let tempPoints = [];
    parsedPathData.forEach(item => { tempPoints.push(getExact3DPosition(item[1])); });

    actualPathPoints3D = [tempPoints[0]];
    for(let i=1; i<tempPoints.length; i++) {
        if(tempPoints[i].distanceTo(tempPoints[i-1]) > 0.05) actualPathPoints3D.push(tempPoints[i]);
    }

    if(pathVisualLine) scene.remove(pathVisualLine);
    pathProgress = 0; currentTargetNodeIndex = 1; actionWaitTimer = 0;
    
    if (actualPathPoints3D.length > 0) charactersData[0].scene.position.copy(actualPathPoints3D[0]);
    if (actualPathPoints3D.length < 2) return;

    pathCurve = createRoundedPath(actualPathPoints3D, 0.2);
    pathTotalLength = pathCurve.getLength();
    movementState = 'PATHING'; 
    
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pathCurve.getPoints(200));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2ed573, linewidth: 3 });
    pathVisualLine = new THREE.Line(lineGeo, lineMat);
    pathVisualLine.position.y += 0.02; 
    scene.add(pathVisualLine);
    if(!isGridVisible) pathVisualLine.visible = false;
    
    if(charactersData[0].walkAction) playAction(charactersData[0].walkAction);
});

// اللمس والتحكم في الكاميرا وحركة الشخصية العشوائية
let startX = 0, startY = 0; let initialPinchDist = null;

window.addEventListener('touchstart', (e) => {
    if(isPathModeActive) return;
    if (e.touches.length === 2 && mode === 'CAMERA') {
        initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        startX = (e.touches[0].clientX + e.touches[1].clientX)/2; startY = (e.touches[0].clientY + e.touches[1].clientY)/2; return;
    }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
});

window.addEventListener('touchmove', (e) => {
    if(isPathModeActive) return; e.preventDefault();
    let touchX = e.touches[0].clientX; let touchY = e.touches[0].clientY;
    let isPortrait = window.innerHeight > window.innerWidth;
    let moveX = isPortrait ? (touchY - startY) : (touchX - startX);
    let moveY = isPortrait ? -(touchX - startX) : (touchY - startY);

    if(mode === 'CAMERA') {
        if(e.touches.length === 1) {
            tCamAngle -= moveX * 0.005; tCamPitch += moveY * 0.005; 
            if(tCamPitch < 0.05) tCamPitch = 0.05; if(tCamPitch > Math.PI/2 - 0.05) tCamPitch = Math.PI/2 - 0.05;
            startX = touchX; startY = touchY;
        } else if (e.touches.length === 2) {
            let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let cx = (e.touches[0].clientX + e.touches[1].clientX)/2; let cy = (e.touches[0].clientY + e.touches[1].clientY)/2;
            let mX = isPortrait ? (cy - startY) : (cx - startX); let mY = isPortrait ? -(cx - startX) : (cy - startY);
            if (initialPinchDist) {
                tCamRadius -= (dist - initialPinchDist) * 0.05; tCamRadius = Math.max(0.01, Math.min(tCamRadius, 25.0)); 
                tFocusX -= Math.cos(tCamAngle) * mX * 0.01; tFocusZ += Math.sin(tCamAngle) * mX * 0.01; tFocusY += mY * 0.01;
            }
            initialPinchDist = dist; startX = cx; startY = cy;
        }
    }
}, {passive: false});

window.addEventListener('touchend', (e) => {
    initialPinchDist = null;
    if(isPathModeActive || charactersData.length === 0 || isSleeping || isTransitioningSleep) return;
    if(movementState === 'PATHING' || movementState === 'PLAYING_ACTION') return; 
    
    let diffX = e.changedTouches[0].clientX - startX; let diffY = e.changedTouches[0].clientY - startY;
    let isPortrait = window.innerHeight > window.innerWidth;

    if (mode !== 'NORMAL') return; 
    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) {
        movementState = 'IDLE';
        let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10');
        if(keys.length > 0 && charactersData[0]) {
            let currentKey = Object.keys(idleActions).find(k => idleActions[k] === charactersData[0].currentAction);
            if(!currentKey || currentKey === 'walk') playAction(idleActions[keys[currentIdleIndex]]);
        }
        return;
    }

    let swipeX = isPortrait ? diffY : diffX; let swipeY = isPortrait ? -diffX : diffY;

    if (Math.abs(swipeX) > Math.abs(swipeY)) {
        if (swipeX > 0) { movementState = 'RIGHT'; targetObjRotation = Math.PI / 2; } else { movementState = 'LEFT'; targetObjRotation = -Math.PI / 2; }
    } else {
        if (swipeY > 0) { movementState = 'DOWN'; targetObjRotation = 0; } else { movementState = 'UP'; targetObjRotation = Math.PI; }
    }
    if(charactersData[0] && charactersData[0].walkAction) playAction(charactersData[0].walkAction);
});

window.addEventListener('resize', () => {
    camera.aspect = wrapper.clientWidth / wrapper.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
});

// حلقة الرسم المستمرة (Render Loop) وتنعيم حركة الكاميرا
function animate() {
    requestAnimationFrame(animate);
    let delta = clock.getDelta();
    let char = charactersData[0];
    
    if (char) {
        if (char.mixer) char.mixer.update(delta);
        
        if (movementState === 'IDLE' && !isSleeping && !isTransitioningSleep) {
            idleSwitchTimer += delta;
            if (idleSwitchTimer >= 6.0) { idleSwitchTimer = 0.0; triggerNextSequentialIdle(); }
        } else { idleSwitchTimer = 0.0; }
        
        if (['RIGHT', 'LEFT', 'UP', 'DOWN'].includes(movementState) && mode === 'NORMAL' && !isSleeping && !isTransitioningSleep) {
            let diff = targetObjRotation - char.scene.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            char.scene.rotation.y += diff * 12.0 * delta; 
            
            let moveSpeed = 1.75 * delta; 
            let oldX = char.scene.position.x; let oldZ = char.scene.position.z;

            if (movementState === 'RIGHT') char.scene.position.x += moveSpeed;
            if (movementState === 'LEFT') char.scene.position.x -= moveSpeed;
            if (movementState === 'UP') char.scene.position.z -= moveSpeed;
            if (movementState === 'DOWN') char.scene.position.z += moveSpeed;
            
            char.scene.position.x = Math.max(-5.0, Math.min(5.0, char.scene.position.x));
            char.scene.position.z = Math.max(-3.75, Math.min(3.75, char.scene.position.z));
            
            if (char.scene.position.x === oldX && char.scene.position.z === oldZ) {
                movementState = 'IDLE';
                let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10');
                if(keys.length > 0) playAction(idleActions[keys[currentIdleIndex]]);
            }
        }
        
        if (movementState === 'PLAYING_ACTION') {
            actionWaitTimer -= delta;
            if (actionWaitTimer <= 0) {
                movementState = 'PATHING'; currentTargetNodeIndex++;
                if(char.walkAction) playAction(char.walkAction);
            }
        }
        else if (movementState === 'PATHING' && pathCurve) {
            let pathSpeed = 1.75; 
            let progressDelta = (pathSpeed * delta) / pathTotalLength;
            pathProgress += progressDelta;
            
            if (pathProgress >= 1.0) {
                pathProgress = 1.0; movementState = 'IDLE'; currentTargetNodeIndex = 1;
                let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10');
                if(keys.length > 0) playAction(idleActions[keys[currentIdleIndex]]);
                if(pathVisualLine) { scene.remove(pathVisualLine); pathVisualLine = null; }
            }
            
            let currentPos = pathCurve.getPoint(pathProgress);
            char.scene.position.set(currentPos.x, currentPos.y, currentPos.z);
            
            if (pathProgress < 1.0) {
                let tangent = pathCurve.getTangent(pathProgress);
                let targetRot = Math.atan2(tangent.x, tangent.z);
                let diff = targetRot - char.scene.rotation.y;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                char.scene.rotation.y += diff * 12.0 * delta;
            }

            if (currentTargetNodeIndex < actualPathPoints3D.length) {
                let targetNode3D = actualPathPoints3D[currentTargetNodeIndex];
                let dist = char.scene.position.distanceTo(targetNode3D);
                
                if (dist < 0.1) {
                    let dataIndex = parsedPathData.findIndex(p => getExact3DPosition(p[1]).distanceTo(targetNode3D) < 0.05);
                    if(dataIndex !== -1 && parsedPathData[dataIndex].length > 2) {
                        movementState = 'PLAYING_ACTION'; 
                        let reqAction = parsedPathData[dataIndex][2];
                        if(reqAction === 'idle_9' || reqAction === 'idle_10') actionWaitTimer = 4.0; 
                        else actionWaitTimer = 2.5; 
                        if(idleActions[reqAction]) playAction(idleActions[reqAction]);
                        else if(idleActions['idle_1']) playAction(idleActions['idle_1']);
                    } else {
                        currentTargetNodeIndex++;
                    }
                }
            }
        }
    }

    camAngle = THREE.MathUtils.lerp(camAngle, tCamAngle, 5.0 * delta);
    camPitch = THREE.MathUtils.lerp(camPitch, tCamPitch, 5.0 * delta);
    camRadius = THREE.MathUtils.lerp(camRadius, tCamRadius, 5.0 * delta);
    focusX = THREE.MathUtils.lerp(focusX, tFocusX, 8.0 * delta);
    focusY = THREE.MathUtils.lerp(focusY, tFocusY, 8.0 * delta);
    focusZ = THREE.MathUtils.lerp(focusZ, tFocusZ, 8.0 * delta);

    let xz_radius = Math.cos(camPitch) * camRadius;
    camera.position.x = focusX + Math.sin(camAngle) * xz_radius;
    camera.position.y = focusY + Math.sin(camPitch) * camRadius;
    camera.position.z = focusZ + Math.cos(camAngle) * xz_radius;
    camera.lookAt(focusX, focusY, focusZ);

    renderer.render(scene, camera);
}

animate();