/**
 * ============================================================================
 * HOOL GEM - CORE ENGINE V3 (ORIGINAL LOGIC + 6 DYNAMIC WALLS + COMPACT UI)
 * ============================================================================
 * الشرح الهندسي للمحرك (1000% تفصيل لتطوير الذكاء الاصطناعي مستقبلاً):
 * * 1. [نظام الواجهة المنسدلة]: تم تحويل الواجهة من أزرار عشوائية إلى (Dropdown Menus) 
 * علوية لحفظ مساحة الشاشة. تحتوي على أكثر من 20 إعداد للتحكم الشامل.
 * 2. [الأساس الرياضي للأرضية]: تم استرجاع دالة `createGridTex` الأصلية وتطبيقها 
 * مع `1.0 - uv.y` لضمان أن المربع رقم 1 يظل في أعلى اليسار كما كان معتمداً.
 * 3. [معالجة اللمس المعكوس]: تم استرجاع دالة `updateMousePosition` الأصلية الخاصة بوضع 
 * الـ Portrait/Landscape الإجباري لضمان دقة استجابة التاتش بنسبة 100%.
 * 4. [نظام الغرفة الاختياري]: تم تحويل الـ 6 أضلاع إلى شبكات منفصلة يتم التحكم في 
 * ظهورها وإخفائها عبر الواجهة (Checkbox). الأرضية فقط هي المرئية افتراضياً.
 * 5. [نظام القص والمسار]: دمج أداة القص مع أداة المسار بمؤشرات بصرية (أخضر/أحمر) 
 * دون الإخلال بالأساس البرمجي لمحرك حركة الشخصيات (Animation Mixer).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.warn = () => {}; console.error = () => {}; 

// ==========================================
// [1] حقن الواجهة الجديدة (قوائم منسدلة مصغرة و 20 إعداد)
// ==========================================
document.body.innerHTML = `
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; user-select: none; font-family: sans-serif; }
        
        #game-wrapper { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; overflow: hidden; }
        @media screen and (orientation: portrait) {
            #game-wrapper { width: 100vh; height: 100vw; transform: rotate(90deg); transform-origin: center; top: 50%; left: 50%; margin-top: -50vw; margin-left: -50vh; }
        }

        #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; touch-action: none; }
        
        /* شريط القوائم العلوي الذكي */
        #top-navbar { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 20; display: flex; gap: 5px; background: rgba(15,15,20,0.85); padding: 5px 10px; border-radius: 8px; border: 1px solid #333; backdrop-filter: blur(10px); }
        
        /* تصميم القوائم المنسدلة */
        .dropdown { position: relative; display: inline-block; }
        .drop-btn { background: #1a1a24; color: #00f2fe; border: 1px solid #00f2fe; border-radius: 4px; padding: 6px 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .drop-btn:hover { background: #00f2fe; color: #000; }
        
        .dropdown-content { display: none; position: absolute; top: 110%; right: 0; background-color: rgba(15,15,20,0.95); min-width: 160px; border: 1px solid #00f2fe; border-radius: 6px; z-index: 30; padding: 8px; box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.8); max-height: 75vh; overflow-y: auto; }
        .dropdown.active .dropdown-content { display: flex; flex-direction: column; gap: 8px; }
        
        .menu-title { font-size: 10px; color: #aaa; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 4px; font-weight: bold; }
        
        /* عناصر الإعدادات الداخلية */
        .setting-row { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #fff; }
        .setting-row input[type="checkbox"] { accent-color: #00f2fe; cursor: pointer; }
        .setting-row input[type="range"] { width: 70px; }
        
        .action-btn { background: rgba(0,242,254,0.1); color: #00f2fe; border: 1px solid #00f2fe; border-radius: 3px; padding: 5px; font-size: 10px; cursor: pointer; width: 100%; text-align: center; }
        .action-btn:hover { background: #00f2fe; color: #000; }
        .action-btn.danger { color: #ff4757; border-color: #ff4757; background: rgba(255,71,87,0.1); }
        .action-btn.danger:hover { background: #ff4757; color: #000; }

        /* نافذة بيانات المسار */
        #code-editor-container { position: absolute; bottom: 10px; left: 10px; z-index: 10; width: 200px; }
        #code-editor { width: 100%; height: 60px; background: rgba(5,5,5,0.8); color: #00f2fe; border: 1px solid #333; padding: 5px; font-family: monospace; font-size: 10px; direction: ltr; resize: none; border-radius: 4px; }
    </style>

    <div id="game-wrapper">
        <div id="top-navbar">
            <div class="dropdown" id="menu-env">
                <button class="drop-btn">الغرفة 🧱</button>
                <div class="dropdown-content">
                    <div class="menu-title">تفعيل الأضلاع 6 (اختياري)</div>
                    <label class="setting-row">الأرضية (Floor) <input type="checkbox" id="chk-floor" checked></label>
                    <label class="setting-row">السقف (Ceiling) <input type="checkbox" id="chk-ceiling"></label>
                    <label class="setting-row">الأمام (Front) <input type="checkbox" id="chk-front"></label>
                    <label class="setting-row">الخلف (Back) <input type="checkbox" id="chk-back"></label>
                    <label class="setting-row">يسار (Left) <input type="checkbox" id="chk-left"></label>
                    <label class="setting-row">يمين (Right) <input type="checkbox" id="chk-right"></label>
                    <div class="menu-title" style="margin-top:8px;">أبعاد الغرفة (للتطوير المستقبلي)</div>
                    <label class="setting-row">العرض X <input type="range" min="10" max="50" value="20" disabled></label>
                    <label class="setting-row">العمق Z <input type="range" min="10" max="50" value="15" disabled></label>
                    <label class="setting-row">الارتفاع Y <input type="range" min="5" max="20" value="10" disabled></label>
                    <div class="menu-title" style="margin-top:8px;">إضاءة الاستديو</div>
                    <label class="setting-row">قوة الإضاءة <input type="range" id="light-intensity" min="0" max="200" value="120"></label>
                </div>
            </div>

            <div class="dropdown" id="menu-tools">
                <button class="drop-btn">الرسم 🟢</button>
                <div class="dropdown-content">
                    <div class="menu-title">وضع التعديل الحالي</div>
                    <button id="btn-tool-path" class="action-btn" style="background:#00f2fe; color:#000;">رسم المسار 🟢</button>
                    <button id="btn-tool-cut" class="action-btn danger" style="margin-top:4px;">قص المربعات ✂️</button>
                    <div class="menu-title" style="margin-top:8px;">تشغيل ومسح</div>
                    <button id="btn-play-path" class="action-btn" style="color:#2ed573; border-color:#2ed573;">▶ تشغيل المسار</button>
                    <button id="btn-clear-path" class="action-btn danger" style="margin-top:4px;">مسح الكود بالكامل 🗑️</button>
                    <div class="menu-title" style="margin-top:8px;">حركات الإضافة (JSON)</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                        <button class="action-btn anim-insert" data-act="idle_1">وقوف</button>
                        <button class="action-btn anim-insert" data-act="idle_3">تحدث</button>
                        <button class="action-btn anim-insert" data-act="idle_6">جلوس</button>
                        <button class="action-btn anim-insert" data-act="idle_9">نوم</button>
                    </div>
                </div>
            </div>

            <div class="dropdown" id="menu-char">
                <button class="drop-btn">الشخصية 🧍</button>
                <div class="dropdown-content">
                    <div class="menu-title">التحكم المباشر</div>
                    <button id="btn-char-swap" class="action-btn">تبديل المجسم 👤</button>
                    <button id="btn-anim-swap" class="action-btn" style="margin-top:4px;">تبديل الحركة 🏃</button>
                    <button id="btn-sleep-toggle" class="action-btn" style="margin-top:4px;">وضع النوم 💤</button>
                    <div class="menu-title" style="margin-top:8px;">إعدادات متقدمة</div>
                    <label class="setting-row">سرعة المشي <input type="range" id="char-speed" min="50" max="300" value="175"></label>
                </div>
            </div>

            <div class="dropdown" id="menu-view">
                <button class="drop-btn">العرض 🎥</button>
                <div class="dropdown-content">
                    <div class="menu-title">الكاميرا والمظهر</div>
                    <button id="btn-cam-normal" class="action-btn">كاميرا اللعب 🎮</button>
                    <button id="btn-cam-free" class="action-btn" style="margin-top:4px;">كاميرا حرة 🚁</button>
                    <div class="menu-title" style="margin-top:8px;">النظام</div>
                    <button id="btn-music" class="action-btn">الموسيقى: إيقاف 🎵</button>
                </div>
            </div>
        </div>

        <div id="code-editor-container">
            <textarea id="code-editor" placeholder="[JSON Data...]"></textarea>
        </div>

        <div id="canvas-container"></div>
    </div>
`;

// هندسة فتح وإغلاق القوائم المنسدلة
document.querySelectorAll('.dropdown').forEach(dropdown => {
    dropdown.querySelector('.drop-btn').addEventListener('click', function(e) {
        let isActive = dropdown.classList.contains('active');
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
        if(!isActive) dropdown.classList.add('active');
        e.stopPropagation();
    });
});
document.addEventListener('click', () => { document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active')); });
document.querySelectorAll('.dropdown-content').forEach(dc => dc.addEventListener('click', (e) => e.stopPropagation()));

// ==========================================
// [2] تهيئة المحرك الأساسي (Three.js)
// ==========================================
const wrapper = document.getElementById('game-wrapper');
const container = document.getElementById('canvas-container');
const codeEditor = document.getElementById('code-editor');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, wrapper.clientWidth / wrapper.clientHeight, 0.001, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(2, 8, 4);
scene.add(mainLight);

// ربط سلايدر الإضاءة
document.getElementById('light-intensity').addEventListener('input', (e) => {
    mainLight.intensity = e.target.value / 100;
});

// ==========================================
// [3] استرجاع هندسة الشبكة الأصلية + الغرفة الاختيارية
// ==========================================
const SQUARE_SIZE = 0.5;
const COLS = 20; const ROWS = 15; const HEIGHT_Y = 10;
const DIM_X = COLS * SQUARE_SIZE; const DIM_Z = ROWS * SQUARE_SIZE; const DIM_Y = HEIGHT_Y * SQUARE_SIZE;

let roomCutData = { floor: [], ceiling: [], back: [], front: [], left: [], right: [] };
const wallsMap = {}; // خريطة الجدران للتحكم بها بسهولة
const wallsArray = []; // للـ Raycaster

// الدالة الأصلية المعتمدة لرسم النسيج (مع احترام الترقيم من أعلى اليسار)
function createGridTex(cols, rows, wallName) {
    const canvas = document.createElement('canvas');
    canvas.width = cols * 100; canvas.height = rows * 100; 
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00f2fe'; ctx.lineWidth = 4;
    ctx.font = 'bold 35px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    
    let c = 1, w = 100, h = 100;
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            if (roomCutData[wallName].includes(c)) { 
                ctx.clearRect(x*w, y*h, w, h); // نظام القص الشفاف
            } else { 
                ctx.strokeRect(x*w, y*h, w, h); 
                ctx.fillText(c, x*w + w/2, y*h + h/2); 
            }
            c++;
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

function buildWall(name, cols, rows, width, height, posX, posY, posZ, rotX, rotY, rotZ, isVisibleByDefault) {
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({ map: createGridTex(cols, rows, name), side: THREE.DoubleSide, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX, posY, posZ); mesh.rotation.set(rotX, rotY, rotZ);
    mesh.name = name; mesh.userData = { cols: cols, rows: rows };
    mesh.visible = isVisibleByDefault;
    scene.add(mesh);
    wallsMap[name] = mesh;
    wallsArray.push(mesh);
}

// 1. الأرضية (معتمدة ومرئية)
buildWall('floor', COLS, ROWS, DIM_X, DIM_Z, 0, 0, 0, -Math.PI/2, 0, 0, true);
// 2. السقف (مخفي افتراضياً)
buildWall('ceiling', COLS, ROWS, DIM_X, DIM_Z, 0, DIM_Y, 0, Math.PI/2, 0, 0, false);
// 3. الخلف (مخفي)
buildWall('back', COLS, HEIGHT_Y, DIM_X, DIM_Y, 0, DIM_Y/2, -DIM_Z/2, 0, 0, 0, false);
// 4. الأمام (مخفي)
buildWall('front', COLS, HEIGHT_Y, DIM_X, DIM_Y, 0, DIM_Y/2, DIM_Z/2, 0, Math.PI, 0, false);
// 5. اليسار (مخفي)
buildWall('left', ROWS, HEIGHT_Y, DIM_Z, DIM_Y, -DIM_X/2, DIM_Y/2, 0, 0, Math.PI/2, 0, false);
// 6. اليمين (مخفي)
buildWall('right', ROWS, HEIGHT_Y, DIM_Z, DIM_Y, DIM_X/2, DIM_Y/2, 0, 0, -Math.PI/2, 0, false);
scene.updateMatrixWorld(true);

// ربط الجدران بصناديق الاختيار في الواجهة
const wallChecks = ['floor', 'ceiling', 'front', 'back', 'left', 'right'];
wallChecks.forEach(w => {
    document.getElementById(`chk-${w}`).addEventListener('change', (e) => {
        if(wallsMap[w]) wallsMap[w].visible = e.target.checked;
    });
});

// المؤشر البصري للمربع
const indicatorGeo = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x2ed573, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
const cursorIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
cursorIndicator.visible = false;
scene.add(cursorIndicator);

// إعدادات وضع الرسم والقص
let currentToolMode = 'PATH'; // 'PATH' أو 'CUT'
const btnToolPath = document.getElementById('btn-tool-path');
const btnToolCut = document.getElementById('btn-tool-cut');

btnToolPath.addEventListener('click', () => {
    currentToolMode = 'PATH'; 
    btnToolPath.style.background = '#00f2fe'; btnToolPath.style.color = '#000';
    btnToolCut.style.background = 'rgba(255,71,87,0.1)'; btnToolCut.style.color = '#ff4757';
    indicatorMat.color.setHex(0x2ed573);
});

btnToolCut.addEventListener('click', () => {
    currentToolMode = 'CUT'; 
    btnToolCut.style.background = '#ff4757'; btnToolCut.style.color = '#000';
    btnToolPath.style.background = 'rgba(0,242,254,0.1)'; btnToolPath.style.color = '#00f2fe';
    indicatorMat.color.setHex(0xff4757);
});

// ==========================================
// [4] استرجاع نظام Raycaster واللمس الأصلي بالملي
// ==========================================
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();

function updateMousePosition(clientX, clientY) {
    let isPortrait = window.innerHeight > window.innerWidth;
    // المعادلة الأصلية التي تعالج التفاف التاتش بدقة
    if(isPortrait) { 
        let logicalX = clientY; let logicalY = window.innerWidth - clientX;
        mouse.x = (logicalX / window.innerHeight) * 2 - 1; mouse.y = -(logicalY / window.innerWidth) * 2 + 1; 
    } 
    else { 
        mouse.x = (clientX / window.innerWidth) * 2 - 1; mouse.y = -(clientY / window.innerHeight) * 2 + 1; 
    }
}

container.addEventListener('pointermove', (e) => {
    updateMousePosition(e.clientX, e.clientY); raycaster.setFromCamera(mouse, camera);
    const visibleWalls = wallsArray.filter(w => w.visible); const intersects = raycaster.intersectObjects(visibleWalls);
    if(intersects.length > 0) {
        const hit = intersects[0]; const wall = hit.object; const cols = wall.userData.cols; const rows = wall.userData.rows;
        let c = Math.floor(hit.uv.x * cols); 
        // استرجاع المنطق الأصلي 1.0 - uv.y لضمان تطابق الأرقام مع التاتش
        let r = Math.floor((1.0 - hit.uv.y) * rows); 
        c = Math.max(0, Math.min(cols - 1, c)); r = Math.max(0, Math.min(rows - 1, r));
        const localX = (c * SQUARE_SIZE) + (SQUARE_SIZE / 2) - (cols * SQUARE_SIZE / 2); 
        const localY = (r * SQUARE_SIZE) + (SQUARE_SIZE / 2) - (rows * SQUARE_SIZE / 2);
        cursorIndicator.position.set(localX, localY, 0.01); cursorIndicator.rotation.set(0, 0, 0);
        wall.localToWorld(cursorIndicator.position); cursorIndicator.setRotationFromQuaternion(wall.quaternion); cursorIndicator.visible = true;
    } else { cursorIndicator.visible = false; }
});

container.addEventListener('pointerdown', (e) => {
    updateMousePosition(e.clientX, e.clientY); raycaster.setFromCamera(mouse, camera);
    const visibleWalls = wallsArray.filter(w => w.visible); const intersects = raycaster.intersectObjects(visibleWalls);
    if(intersects.length > 0) {
        const hit = intersects[0]; const wall = hit.object; const cols = wall.userData.cols; const rows = wall.userData.rows;
        let c = Math.floor(hit.uv.x * cols); let r = Math.floor((1.0 - hit.uv.y) * rows); 
        c = Math.max(0, Math.min(cols - 1, c)); r = Math.max(0, Math.min(rows - 1, r));
        let squareNum = (r * cols) + c + 1; const wallName = wall.name;
        
        if (currentToolMode === 'CUT') {
            const index = roomCutData[wallName].indexOf(squareNum);
            if(index === -1) roomCutData[wallName].push(squareNum); else roomCutData[wallName].splice(index, 1);
            wall.material.map = createGridTex(cols, rows, wallName);
        } else if (currentToolMode === 'PATH') {
            let arr = getCodeArray(); if(arr === null) return;
            if(arr.length === 0 || arr[arr.length-1][1] !== squareNum || arr[arr.length-1][0] !== wallName) { arr.push([wallName, squareNum]); setCodeArray(arr); }
        }
    }
});

// JSON Management
function getCodeArray() { let val = codeEditor.value.trim(); if(!val) return []; try { return JSON.parse(val); } catch(e) { return null; } }
function setCodeArray(arr) { if(arr.length === 0) { codeEditor.value = ''; return; } codeEditor.value = "[\n" + arr.map(p => "  " + JSON.stringify(p)).join(",\n") + "\n]"; codeEditor.scrollTop = codeEditor.scrollHeight; }

document.getElementById('btn-clear-path').addEventListener('click', () => { codeEditor.value = ''; if(pathVisualLine) { scene.remove(pathVisualLine); pathVisualLine = null; } });
document.querySelectorAll('.anim-insert').forEach(btn => {
    btn.addEventListener('click', (e) => {
        let act = e.currentTarget.getAttribute('data-act'); let arr = getCodeArray(); if(!arr || arr.length === 0) return;
        let lastPoint = arr[arr.length - 1]; if(lastPoint.length === 2) lastPoint.push(act); else lastPoint[2] = act; setCodeArray(arr);
    });
});

// ==========================================
// [5] نظام الكاميرا والتحكم المتقدم (Touch & FreeCam)
// ==========================================
let mode = 'NORMAL'; 
let camAngle = 0, camPitch = 0.2, camRadius = 6.5;
let focusX = 0, focusY = 1.2, focusZ = 0;
let tCamAngle = 0, tCamPitch = 0.2, tCamRadius = 6.5;
let tFocusX = 0, tFocusY = 1.2, tFocusZ = 0;

document.getElementById('btn-cam-normal').addEventListener('click', () => { mode = 'NORMAL'; tCamAngle = 0; tCamPitch = 0.2; tCamRadius = 6.5; tFocusX = 0; tFocusY = 1.2; tFocusZ = 0; });
document.getElementById('btn-cam-free').addEventListener('click', () => { mode = 'FREECAM'; tCamRadius = 20; tCamPitch = Math.PI/3; tCamAngle = 0; tFocusX = 0; tFocusY = 0; tFocusZ = 0; });

let startX = 0, startY = 0; let initialPinchDist = null;
window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2 && mode === 'FREECAM') { initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); startX = (e.touches[0].clientX + e.touches[1].clientX)/2; startY = (e.touches[0].clientY + e.touches[1].clientY)/2; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
});

window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let touchX = e.touches[0].clientX; let touchY = e.touches[0].clientY; let isPortrait = window.innerHeight > window.innerWidth;
    let moveX = isPortrait ? (touchY - startY) : (touchX - startX); let moveY = isPortrait ? -(touchX - startX) : (touchY - startY);
    if(mode === 'FREECAM') {
        if(e.touches.length === 1) { tCamAngle -= moveX * 0.005; tCamPitch += moveY * 0.005; if(tCamPitch < 0.05) tCamPitch = 0.05; if(tCamPitch > Math.PI/2 - 0.05) tCamPitch = Math.PI/2 - 0.05; startX = touchX; startY = touchY; } 
        else if (e.touches.length === 2) { let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); let cx = (e.touches[0].clientX + e.touches[1].clientX)/2; let cy = (e.touches[0].clientY + e.touches[1].clientY)/2; let mX = isPortrait ? (cy - startY) : (cx - startX); let mY = isPortrait ? -(cx - startX) : (cy - startY); if (initialPinchDist) { tCamRadius -= (dist - initialPinchDist) * 0.05; tCamRadius = Math.max(0.01, Math.min(tCamRadius, 35.0)); tFocusX -= Math.cos(tCamAngle) * mX * 0.01; tFocusZ += Math.sin(tCamAngle) * mX * 0.01; tFocusY += mY * 0.01; } initialPinchDist = dist; startX = cx; startY = cy; }
    }
}, {passive: false});

// ==========================================
// [6] استرجاع الشخصية وحركاتها بالكامل
// ==========================================
let charactersData = []; let globalWalkClip = null; let idleActions = {}; 
let currentIdleIndex = 0, currentCharNum = 5, targetObjRotation = 0; 
let isSleeping = false, isTransitioningSleep = false, idleSwitchTimer = 0.0, isCharLoading = false;
let movementState = 'IDLE', pathProgress = 0, pathTotalLength = 0, currentTargetNodeIndex = 1, actionWaitTimer = 0;
let actualPathPoints3D = [], parsedPathData = [], pathCurve = null, pathVisualLine = null;

const clock = new THREE.Clock(); const loader = new GLTFLoader();

// إعداد السرعة
let walkSpeedMultiplier = 1.75;
document.getElementById('char-speed').addEventListener('input', (e) => { walkSpeedMultiplier = e.target.value / 100; });

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
    let mixer = new THREE.AnimationMixer(charScene); let wAction = globalWalkClip ? mixer.clipAction(globalWalkClip) : null; if(wAction) wAction.setLoop(THREE.LoopRepeat);
    let currentActionToPlay = wAction;
    Object.keys(idleActions).forEach(key => { let clip = idleActions[key].getClip(); idleActions[key] = mixer.clipAction(clip); if(key === 'idle_9' || key === 'idle_10') { idleActions[key].setLoop(THREE.LoopOnce); idleActions[key].clampWhenFinished = true; } if(key === 'idle_1') currentActionToPlay = idleActions[key]; });
    charactersData[0] = { scene: charScene, mixer: mixer, walkAction: wAction, currentAction: currentActionToPlay };
    if(charactersData[0].currentAction) charactersData[0].currentAction.play();
}

async function loadRestOfIdlesInBackground() {
    for(let i = 1; i <= 10; i++) { try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/idle_${i}.glb`); if(gltf.animations[0]) { let clip = gltf.animations[0]; if(i === 9) clip.duration = Math.max(0, clip.duration - 0.35); if(charactersData[0]) { let newAction = charactersData[0].mixer.clipAction(clip); if(i === 9 || i === 10) { newAction.setLoop(THREE.LoopOnce); newAction.clampWhenFinished = true; } idleActions[`idle_${i}`] = newAction; if(i === 1 && movementState === 'IDLE') playAction(newAction); } } } catch(e) { } }
}

function playAction(nextAction) { let char = charactersData[0]; if (!char || !nextAction || char.currentAction === nextAction) return; if (char.currentAction) char.currentAction.fadeOut(0.2); nextAction.reset().fadeIn(0.2).play(); char.currentAction = nextAction; }

document.getElementById('btn-char-swap').addEventListener('click', async (e) => {
    if(isCharLoading || isSleeping || isTransitioningSleep || movementState === 'PATHING') return;
    isCharLoading = true; let originalText = e.target.innerText; e.target.innerText = "⏳..."; let attempt = currentCharNum + 1, success = false;
    while(!success && attempt <= 20) { try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/char_${attempt}.glb`); setupCharacter(gltf.scene); currentCharNum = attempt; success = true; } catch(err) { attempt++; } }
    if(!success) { attempt = 1; while(!success && attempt <= currentCharNum) { try { let gltf = await loader.loadAsync(`https://raw.githubusercontent.com/korpika/hoolgem/main/char_${attempt}.glb`); setupCharacter(gltf.scene); currentCharNum = attempt; success = true; } catch(err) { attempt++; } } }
    e.target.innerText = originalText; isCharLoading = false;
});

document.getElementById('btn-anim-swap').addEventListener('click', () => {
    if(movementState !== 'IDLE' || isSleeping || isTransitioningSleep || movementState === 'PATHING') return;
    let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length === 0) return;
    currentIdleIndex = (currentIdleIndex + 1) % keys.length; playAction(idleActions[keys[currentIdleIndex]]);
});

document.getElementById('btn-sleep-toggle').addEventListener('click', (e) => {
    if(!charactersData[0] || isTransitioningSleep || movementState === 'PATHING') return;
    if(!isSleeping) { if(idleActions['idle_9']) { isSleeping = true; playAction(idleActions['idle_9']); e.target.style.background = '#00f2fe'; e.target.style.color = '#000'; } } 
    else { if(idleActions['idle_10']) { isSleeping = false; isTransitioningSleep = true; e.target.style.background = 'transparent'; e.target.style.color = '#00f2fe'; let wakeAction = idleActions['idle_10']; wakeAction.timeScale = 1.0; playAction(wakeAction); const onWakeFinished = (ev) => { if(ev.action === wakeAction) { charactersData[0].mixer.removeEventListener('finished', onWakeFinished); isTransitioningSleep = false; if(!isSleeping && idleActions['idle_1']) { currentIdleIndex = 0; playAction(idleActions['idle_1']); } } }; charactersData[0].mixer.addEventListener('finished', onWakeFinished); } }
});

// اللمس لتوجيه الشخصية (السحب)
window.addEventListener('touchend', (e) => {
    initialPinchDist = null; if(charactersData.length === 0 || isSleeping || isTransitioningSleep || movementState === 'PATHING' || movementState === 'PLAYING_ACTION') return; 
    let diffX = e.changedTouches[0].clientX - startX; let diffY = e.changedTouches[0].clientY - startY; let isPortrait = window.innerHeight > window.innerWidth;
    if (mode !== 'NORMAL') return; 
    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) { movementState = 'IDLE'; let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length > 0 && charactersData[0]) { let currentKey = Object.keys(idleActions).find(k => idleActions[k] === charactersData[0].currentAction); if(!currentKey || currentKey === 'walk') playAction(idleActions[keys[currentIdleIndex]]); } return; }
    let swipeX = isPortrait ? diffY : diffX; let swipeY = isPortrait ? -diffX : diffY;
    if (Math.abs(swipeX) > Math.abs(swipeY)) { if (swipeX > 0) { movementState = 'RIGHT'; targetObjRotation = Math.PI / 2; } else { movementState = 'LEFT'; targetObjRotation = -Math.PI / 2; } } 
    else { if (swipeY > 0) { movementState = 'DOWN'; targetObjRotation = 0; } else { movementState = 'UP'; targetObjRotation = Math.PI; } }
    if(charactersData[0] && charactersData[0].walkAction) playAction(charactersData[0].walkAction);
});

// ==========================================
// 7. حساب المسارات اللانهائية (شاملة الأضلاع)
// ==========================================
function getExact3DPosition(wallName, num) {
    let index = num - 1; let wall = wallsMap[wallName]; if(!wall) return new THREE.Vector3(0,0,0);
    let c = index % wall.userData.cols; let r = Math.floor(index / wall.userData.cols);
    let localX = (c * SQUARE_SIZE) + (SQUARE_SIZE/2) - (wall.geometry.parameters.width / 2);
    let localY = (r * SQUARE_SIZE) + (SQUARE_SIZE/2) - (wall.geometry.parameters.height / 2);
    let pos = new THREE.Vector3(localX, localY, 0);
    wall.localToWorld(pos); return pos;
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

document.getElementById('btn-play-path').addEventListener('click', () => {
    if(!charactersData[0] || isSleeping || isTransitioningSleep) return;
    let arr = getCodeArray(); if(arr === null || arr.length === 0) { alert("لا يوجد مسار محفوظ!"); return; }
    parsedPathData = arr; let tempPoints = [];
    parsedPathData.forEach(item => { tempPoints.push(getExact3DPosition(item[0], item[1])); });
    if(tempPoints.length === 0) return;
    actualPathPoints3D = [tempPoints[0]]; for(let i=1; i<tempPoints.length; i++) { if(tempPoints[i].distanceTo(tempPoints[i-1]) > 0.05) actualPathPoints3D.push(tempPoints[i]); }
    if(pathVisualLine) scene.remove(pathVisualLine); pathProgress = 0; currentTargetNodeIndex = 1; actionWaitTimer = 0;
    if (actualPathPoints3D.length > 0) charactersData[0].scene.position.copy(actualPathPoints3D[0]); if (actualPathPoints3D.length < 2) return;
    pathCurve = createRoundedPath(actualPathPoints3D, 0.2); pathTotalLength = pathCurve.getLength(); movementState = 'PATHING'; 
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pathCurve.getPoints(200)); const lineMat = new THREE.LineBasicMaterial({ color: 0x2ed573, linewidth: 3 });
    pathVisualLine = new THREE.Line(lineGeo, lineMat); pathVisualLine.position.y += 0.02; scene.add(pathVisualLine);
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
            let moveSpeed = walkSpeedMultiplier * delta; let oldX = char.scene.position.x; let oldZ = char.scene.position.z;
            if (movementState === 'RIGHT') char.scene.position.x += moveSpeed; if (movementState === 'LEFT') char.scene.position.x -= moveSpeed; if (movementState === 'UP') char.scene.position.z -= moveSpeed; if (movementState === 'DOWN') char.scene.position.z += moveSpeed;
            char.scene.position.x = Math.max(-DIM_X/2, Math.min(DIM_X/2, char.scene.position.x)); char.scene.position.z = Math.max(-DIM_Z/2, Math.min(DIM_Z/2, char.scene.position.z));
            if (char.scene.position.x === oldX && char.scene.position.z === oldZ) { movementState = 'IDLE'; let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length > 0) playAction(idleActions[keys[currentIdleIndex]]); }
        }
        if (movementState === 'PLAYING_ACTION') { actionWaitTimer -= delta; if (actionWaitTimer <= 0) { movementState = 'PATHING'; currentTargetNodeIndex++; if(char.walkAction) playAction(char.walkAction); } }
        else if (movementState === 'PATHING' && pathCurve) {
            let pathSpeed = walkSpeedMultiplier; let progressDelta = (pathSpeed * delta) / pathTotalLength; pathProgress += progressDelta;
            if (pathProgress >= 1.0) { pathProgress = 1.0; movementState = 'IDLE'; currentTargetNodeIndex = 1; let keys = Object.keys(idleActions).filter(k => k !== 'idle_9' && k !== 'idle_10'); if(keys.length > 0) playAction(idleActions[keys[currentIdleIndex]]); if(pathVisualLine) { scene.remove(pathVisualLine); pathVisualLine = null; } }
            let currentPos = pathCurve.getPoint(pathProgress); char.scene.position.set(currentPos.x, currentPos.y, currentPos.z);
            if (pathProgress < 1.0) { let tangent = pathCurve.getTangent(pathProgress); let targetRot = Math.atan2(tangent.x, tangent.z); let diff = targetRot - char.scene.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); char.scene.rotation.y += diff * 12.0 * delta; }
            if (currentTargetNodeIndex < actualPathPoints3D.length) {
                let targetNode3D = actualPathPoints3D[currentTargetNodeIndex]; let dist = char.scene.position.distanceTo(targetNode3D);
                if (dist < 0.1) { let dataIndex = parsedPathData.findIndex(p => getExact3DPosition(p[0], p[1]).distanceTo(targetNode3D) < 0.05); if(dataIndex !== -1 && parsedPathData[dataIndex].length > 2) { movementState = 'PLAYING_ACTION'; let reqAction = parsedPathData[dataIndex][2]; if(reqAction === 'idle_9' || reqAction === 'idle_10') actionWaitTimer = 4.0; else actionWaitTimer = 2.5; if(idleActions[reqAction]) playAction(idleActions[reqAction]); else if(idleActions['idle_1']) playAction(idleActions['idle_1']); } else { currentTargetNodeIndex++; } }
            }
        }
    }
    camAngle = THREE.MathUtils.lerp(camAngle, tCamAngle, 5.0 * delta); camPitch = THREE.MathUtils.lerp(camPitch, tCamPitch, 5.0 * delta); camRadius = THREE.MathUtils.lerp(camRadius, tCamRadius, 5.0 * delta); focusX = THREE.MathUtils.lerp(focusX, tFocusX, 8.0 * delta); focusY = THREE.MathUtils.lerp(focusY, tFocusY, 8.0 * delta); focusZ = THREE.MathUtils.lerp(focusZ, tFocusZ, 8.0 * delta);
    let xz_radius = Math.cos(camPitch) * camRadius; camera.position.x = focusX + Math.sin(camAngle) * xz_radius; camera.position.y = focusY + Math.sin(camPitch) * camRadius; camera.position.z = focusZ + Math.cos(camAngle) * xz_radius; camera.lookAt(focusX, focusY, focusZ);
    renderer.render(scene, camera);
}
animate();
