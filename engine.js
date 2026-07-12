/**
 * ============================================================================
 * HOOL GEM - ADVANCED 3D ENGINE (6-SIDED DYNAMIC ROOM & CUTTING SYSTEM)
 * ============================================================================
 * الشرح الهندسي والرياضي للمحرك (Engineering Architecture):
 * * 1. حقن الواجهة (UI Injection): يتم توليد أزرار التحكم عبر الجافاسكريبت، وتمت إضافة 
 * أدوات جديدة: "وضع القص ✂️" و "وضع المسار 🟢" لتغيير حالة التفاعل مع الشبكة.
 * * 2. بناء الغرفة اللانهائية (Dynamic 6-Sided Box):
 * - بدلاً من أرضية واحدة، نستخدم دالة ذكية `buildWall()` تولد 6 أسطح (Planes) 
 * (Floor, Ceiling, Back, Front, Left, Right).
 * - تعتمد على 3 متغيرات مطلقة: X (العرض), Y (الارتفاع), Z (العمق).
 * - كل سطح يمتلك CanvasTexture مستقل، مما يسمح بتخصيص شبكته.
 * * 3. نظام القص الديناميكي (Dynamic Boolean Cutting):
 * - المحرك لا يكسر المجسمات (Geometry)، بل يحتفظ بمصفوفة `cutSquares` لكل جدار.
 * - عند تحديد مربع في "وضع القص"، يقوم الكود بمسح هذا المربع من الـ Canvas 
 * باستخدام `ctx.clearRect`، مما يجعله شفافاً تماماً (Transparent).
 * * 4. نظام المؤشر البصري (Visual Feedback Raycasting):
 * - تم ربط الـ Raycaster بحدث `pointermove` بدلاً من النقر فقط.
 * - يتم حساب إحداثيات المربع الذي يقف عليه الماوس/الإصبع رياضياً.
 * - يتم نقل مجسم صغير شفاف (أخضر للمسار، وأحمر للقص) فوق المربع فوراً ليعرف 
 * المستخدم مكان النقر بدقة تامة وسط مئات المربعات.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// إيقاف رسائل التحذير لضمان نظافة الكونسول
console.warn = () => {}; console.error = () => {}; 

// ==========================================
// [1] حقن واجهة المستخدم (UI Injection)
// ==========================================
document.body.innerHTML = `
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; user-select: none; font-family: sans-serif; }
        
        /* إجبار العرض على النمط الأفقي (Landscape) */
        #game-wrapper { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; overflow: hidden; }
        @media screen and (orientation: portrait) {
            #game-wrapper { width: 100vh; height: 100vw; transform: rotate(90deg); transform-origin: center; top: 50%; left: 50%; margin-top: -50vw; margin-left: -50vh; }
        }

        #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; touch-action: none; }
        
        #ui-layer { position: absolute; top: 15px; left: 15px; z-index: 10; display: flex; flex-direction: column; gap: 8px; }
        
        .hud-btn { background: rgba(0,0,0,0.85); color: #00f2fe; border: 1px solid #00f2fe; border-radius: 5px; padding: 8px 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 11px; text-align: center; }
        .hud-btn.active-mode { background: #00f2fe; color: #000; box-shadow: 0 0 10px #00f2fe; }

        /* أزرار أدوات التعديل الجديدة (الرسم والقص) */
        .tool-btn { background: rgba(20,20,20,0.9); border: 1px solid #aaa; color: #aaa; }
        .tool-btn.active-path { border-color: #2ed573; color: #2ed573; background: rgba(46, 213, 115, 0.2); }
        .tool-btn.active-cut { border-color: #ff4757; color: #ff4757; background: rgba(255, 71, 87, 0.2); }

        #path-panel { position: absolute; top: 15px; right: -250px; width: 180px; background: rgba(10, 10, 10, 0.95); border: 1px solid #00f2fe; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 6px; z-index: 10; transition: right 0.3s ease; box-shadow: -5px 5px 15px rgba(0,0,0,0.8); max-height: 90vh; }
        #path-panel.open { right: 15px; }
        .panel-title { color: #00f2fe; font-size: 13px; text-align: center; margin: 0 0 5px 0; font-weight: bold; }
        
        #code-editor { width: 100%; height: 90px; background: #050505; color: #00f2fe; border: 1px solid #333; padding: 6px; font-family: monospace; font-size: 11px; direction: ltr; resize: none; border-radius: 4px; outline: none; white-space: pre; box-sizing: border-box; }
        #code-editor:focus { border-color: #00f2fe; }

        .actions-scroller { max-height: 85px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding-right: 4px; }
        .action-btn { background: #1a1a1a; color: #fff; border: 1px solid #444; border-radius: 3px; padding: 6px 0; font-size: 10px; cursor: pointer; text-align: center; }
        .flex-row { display: flex; gap: 4px; }
        .flex-row button { flex: 1; padding: 6px 0; font-size: 10px; }
    </style>

    <div id="game-wrapper">
        <div id="ui-layer">
            <button id="btn-play-path" class="hud-btn" style="border-color: #2ed573; color: #2ed573;">▶ تشغيل المسار</button>
            <button id="btn-path" class="hud-btn">صفحة المطور</button>
            
            <button id="btn-tool-mode" class="hud-btn tool-btn active-path">🟢 وضع الرسم: مسار</button>
            
            <button id="btn-walls" class="hud-btn active-mode">إخفاء/إظهار الجدران</button>
            <button id="btn-camera" class="hud-btn">الكاميرا</button>
            <button id="btn-freecam" class="hud-btn">كاميرا حرة</button>
        </div>

        <div id="path-panel">
            <h3 class="panel-title">البيانات (JSON)</h3>
            <textarea id="code-editor" placeholder="[JSON Data...]"></textarea>
            <div style="font-size: 10px; color: #aaa; text-align: center;">إضافة حركة:</div>
            <div class="actions-scroller">
                <button class="action-btn" data-act="idle_1">حركة 1</button>
                <button class="action-btn" data-act="idle_2">حركة 2</button>
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
// [2] تهيئة محرك 3D الأساسي وإضاءة الاستديو
// ==========================================
const wrapper = document.getElementById('game-wrapper');
const container = document.getElementById('canvas-container');

// المتغيرات الرسومية
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

// ==========================================
// [3] الهندسة الرياضية لغرفة الـ 6 أضلاع (Dynamic 6-Sided Room)
// ==========================================
// هذه المتغيرات تتيح توسيع الغرفة لانهائياً برمجياً
// مقاس المربع الواحد = 0.5 متر
const SQUARE_SIZE = 0.5;
const COLS_X = 20; // العرض (10 متر)
const ROWS_Z = 15; // العمق (7.5 متر)
const ROWS_Y = 10; // الارتفاع (5 متر)

const DIM_X = COLS_X * SQUARE_SIZE;
const DIM_Z = ROWS_Z * SQUARE_SIZE;
const DIM_Y = ROWS_Y * SQUARE_SIZE;

// قاعدة بيانات القص: لتسجيل أرقام المربعات المحذوفة لكل جدار
let roomCutData = {
    floor: [], ceiling: [], back: [], front: [], left: [], right: []
};

// دالة توليد النسيج الذكية (Canvas Texture Generator)
// تقوم برسم الشبكة، وإذا كان المربع مقصوصاً، تقوم بتفريغه بـ clearRect ليكون شفافاً
function generateWallTexture(cols, rows, wallName) {
    const canvas = document.createElement('canvas');
    canvas.width = cols * 100; // 100 بكسل دقة المربع
    canvas.height = rows * 100;
    const ctx = canvas.getContext('2d');
    
    // لون خلفية الجدار
    ctx.fillStyle = '#0a0a0c'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // لون خطوط الشبكة
    ctx.strokeStyle = '#00f2fe'; 
    ctx.lineWidth = 4;
    ctx.font = 'bold 30px Arial'; 
    ctx.fillStyle = '#fff'; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    
    let c = 1, w = 100, h = 100;
    for(let y = 0; y < rows; y++) {
        for(let x = 0; x < cols; x++) {
            // التحقق رياضياً إذا كان هذا المربع مقصوصاً
            if (roomCutData[wallName].includes(c)) {
                // تفريغ المربع بالكامل ليصبح شفافاً للرؤية والمرور
                ctx.clearRect(x*w, y*h, w, h);
            } else {
                ctx.strokeRect(x*w, y*h, w, h);
                ctx.fillText(c, x*w + w/2, y*h + h/2);
            }
            c++;
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    // تفعيل التحديث التلقائي للنسيج في Three.js
    texture.needsUpdate = true;
    return texture;
}

// دالة بناء الجدار الواحد وإعطائه التموضع والتدوير الدقيق
const roomGroup = new THREE.Group();
scene.add(roomGroup);
const wallsArray = []; // مصفوفة لتخزين الجدران لاستخدامها في الـ Raycaster

function buildWall(name, cols, rows, width, height, posX, posY, posZ, rotX, rotY, rotZ) {
    const geo = new THREE.PlaneGeometry(width, height);
    const tex = generateWallTexture(cols, rows, name);
    // Material مزدوجة الأوجه وشفافة لدعم عملية القص
    const mat = new THREE.MeshBasicMaterial({ 
        map: tex, 
        side: THREE.DoubleSide, 
        transparent: true,
        opacity: 1.0 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX, posY, posZ);
    mesh.rotation.set(rotX, rotY, rotZ);
    mesh.name = name; // حفظ اسم الجدار (مهم جداً للاستدعاء)
    mesh.userData = { cols: cols, rows: rows }; // حفظ الأبعاد الرياضية
    
    roomGroup.add(mesh);
    wallsArray.push(mesh);
    return mesh;
}

// 1. الأرضية (Floor)
buildWall('floor', COLS_X, ROWS_Z, DIM_X, DIM_Z, 0, 0, 0, -Math.PI/2, 0, 0);
// 2. السقف (Ceiling)
buildWall('ceiling', COLS_X, ROWS_Z, DIM_X, DIM_Z, 0, DIM_Y, 0, Math.PI/2, 0, 0);
// 3. الجدار الخلفي (Back)
buildWall('back', COLS_X, ROWS_Y, DIM_X, DIM_Y, 0, DIM_Y/2, -DIM_Z/2, 0, 0, 0);
// 4. الجدار الأمامي (Front)
buildWall('front', COLS_X, ROWS_Y, DIM_X, DIM_Y, 0, DIM_Y/2, DIM_Z/2, 0, Math.PI, 0);
// 5. الجدار الأيسر (Left)
buildWall('left', ROWS_Z, ROWS_Y, DIM_Z, DIM_Y, -DIM_X/2, DIM_Y/2, 0, 0, Math.PI/2, 0);
// 6. الجدار الأيمن (Right)
buildWall('right', ROWS_Z, ROWS_Y, DIM_Z, DIM_Y, DIM_X/2, DIM_Y/2, 0, 0, -Math.PI/2, 0);

scene.updateMatrixWorld(true);

// ==========================================
// [4] المؤشر البصري (Hover Indicator)
// ==========================================
// مجسم يظهر فوق المربع للإشارة إليه (أخضر للرسم، أحمر للقص)
const indicatorGeo = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x2ed573, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
const cursorIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
cursorIndicator.visible = false;
scene.add(cursorIndicator);

// ==========================================
// [5] متحكمات الواجهة ونظام الأدوات
// ==========================================
let currentToolMode = 'PATH'; // الحالات: 'PATH' (رسم مسار) | 'CUT' (قص جدار)
let isPathModeActive = false;
let areWallsVisible = true;

const btnToolMode = document.getElementById('btn-tool-mode');
btnToolMode.addEventListener('click', () => {
    if(currentToolMode === 'PATH') {
        currentToolMode = 'CUT';
        btnToolMode.innerText = "🔴 وضع الرسم: قص مربعات";
        btnToolMode.className = "hud-btn tool-btn active-cut";
        indicatorMat.color.setHex(0xff4757); // تغيير لون المؤشر لأحمر
    } else {
        currentToolMode = 'PATH';
        btnToolMode.innerText = "🟢 وضع الرسم: مسار";
        btnToolMode.className = "hud-btn tool-btn active-path";
        indicatorMat.color.setHex(0x2ed573); // تغيير لون المؤشر لأخضر
    }
});

const btnWalls = document.getElementById('btn-walls');
btnWalls.addEventListener('click', () => {
    areWallsVisible = !areWallsVisible;
    // إخفاء أو إظهار كل الجدران ما عدا الأرضية
    wallsArray.forEach(wall => {
        if(wall.name !== 'floor') wall.visible = areWallsVisible;
    });
    areWallsVisible ? btnWalls.classList.add('active-mode') : btnWalls.classList.remove('active-mode');
});

// فتح لوحة المطور
document.getElementById('btn-path').addEventListener('click', () => {
    isPathModeActive = !isPathModeActive;
    const pathPanel = document.getElementById('path-panel');
    const btnPath = document.getElementById('btn-path');
    if(isPathModeActive) {
        pathPanel.classList.add('open'); btnPath.classList.add('active-mode');
        tCamRadius = 15.0; tCamPitch = Math.PI/2 - 0.05; // رفع الكاميرا للرؤية
    } else {
        pathPanel.classList.remove('open'); btnPath.classList.remove('active-mode');
        tCamRadius = 8.0; tCamPitch = 0.2;
        cursorIndicator.visible = false; // إخفاء المؤشر
    }
});

// ==========================================
// [6] نظام Raycaster الرياضي المطور (للـ 6 أضلاع)
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const codeEditor = document.getElementById('code-editor');

// دالة لتحديث إحداثيات الماوس/اللمس (بمعالجة إجبارية الـ Landscape)
function updateMousePosition(clientX, clientY) {
    let isPortrait = window.innerHeight > window.innerWidth;
    if(isPortrait) {
        let logicalX = clientY;
        let logicalY = window.innerWidth - clientX;
        mouse.x = (logicalX / window.innerHeight) * 2 - 1;
        mouse.y = -(logicalY / window.innerWidth) * 2 + 1;
    } else {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    }
}

// التفاعل عند تحريك المؤشر (لتحريك المربع البصري)
container.addEventListener('pointermove', (e) => {
    if(!isPathModeActive) return;
    updateMousePosition(e.clientX, e.clientY);
    raycaster.setFromCamera(mouse, camera);
    
    // فحص التقاطع مع جميع الأضلاع الستة المرئية
    const visibleWalls = wallsArray.filter(w => w.visible);
    const intersects = raycaster.intersectObjects(visibleWalls);
    
    if(intersects.length > 0) {
        const hit = intersects[0];
        const wall = hit.object;
        const uv = hit.uv;
        const cols = wall.userData.cols;
        const rows = wall.userData.rows;
        
        // حساب العمود والصف بناءً على نقطة التقاطع
        let c = Math.floor(uv.x * cols);
        let r = Math.floor((1.0 - uv.y) * rows);
        c = Math.max(0, Math.min(cols - 1, c));
        r = Math.max(0, Math.min(rows - 1, r));
        
        // حساب الموقع الدقيق لوضع مربع المؤشر (Indicator)
        const localX = (c * SQUARE_SIZE) + (SQUARE_SIZE / 2) - (cols * SQUARE_SIZE / 2);
        const localY = (r * SQUARE_SIZE) + (SQUARE_SIZE / 2) - (rows * SQUARE_SIZE / 2);
        
        // ربط المؤشر بالسطح الملموس ومحاذاته تماماً
        cursorIndicator.position.set(localX, localY, 0.01); // 0.01 لمنع التداخل (Z-fighting)
        cursorIndicator.rotation.set(0, 0, 0);
        
        // نقل المؤشر لإحداثيات العالم بناءً على موضع وتدوير الجدار
        wall.localToWorld(cursorIndicator.position);
        cursorIndicator.setRotationFromQuaternion(wall.quaternion);
        
        cursorIndicator.visible = true;
    } else {
        cursorIndicator.visible = false;
    }
});

// التفاعل عند النقر (تنفيذ الرسم أو القص)
container.addEventListener('pointerdown', (e) => {
    if(!isPathModeActive) return;
    updateMousePosition(e.clientX, e.clientY);
    raycaster.setFromCamera(mouse, camera);
    
    const visibleWalls = wallsArray.filter(w => w.visible);
    const intersects = raycaster.intersectObjects(visibleWalls);
    
    if(intersects.length > 0) {
        const hit = intersects[0];
        const wall = hit.object;
        const uv = hit.uv;
        const cols = wall.userData.cols;
        const rows = wall.userData.rows;
        
        let c = Math.floor(uv.x * cols);
        let r = Math.floor((1.0 - uv.y) * rows);
        c = Math.max(0, Math.min(cols - 1, c));
        r = Math.max(0, Math.min(rows - 1, r));
        
        let squareNum = (r * cols) + c + 1;
        const wallName = wall.name;
        
        if (currentToolMode === 'CUT') {
            // [هندسة القص]: إضافة أو إزالة المربع من مصفوفة القص
            const index = roomCutData[wallName].indexOf(squareNum);
            if(index === -1) {
                roomCutData[wallName].push(squareNum); // إضافة للقص
            } else {
                roomCutData[wallName].splice(index, 1); // إلغاء القص
            }
            // إعادة توليد نسيج الجدار ليصبح المربع شفافاً
            wall.material.map = generateWallTexture(cols, rows, wallName);
            
        } else if (currentToolMode === 'PATH') {
            // [هندسة المسار]: تسجيل نقطة الحركة في كود JSON
            let arr = getCodeArray();
            if(arr === null) return;
            // منع تكرار نفس النقطة المتتالية
            if(arr.length === 0 || arr[arr.length-1][1] !== squareNum || arr[arr.length-1][0] !== wallName) {
                arr.push([wallName, squareNum]);
                setCodeArray(arr);
            }
        }
    }
});

// دوال إدارة مصفوفة الكود JSON
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

// ==========================================
// [7] الكاميرا والمحاكاة اللانهائية
// ==========================================
let camAngle = 0, camPitch = 0.2, camRadius = 8.0;
let focusX = 0, focusY = 2.5, focusZ = 0; // التركيز في منتصف الغرفة
let tCamAngle = 0, tCamPitch = 0.2, tCamRadius = 8.0;
let tFocusX = 0, tFocusY = 2.5, tFocusZ = 0;

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    let delta = clock.getDelta();

    // تنعيم حركة الكاميرا رياضياً
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

window.addEventListener('resize', () => {
    camera.aspect = wrapper.clientWidth / wrapper.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
});
