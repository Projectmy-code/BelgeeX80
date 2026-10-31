import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// === 1. ИНИЦИАЛИЗАЦИЯ СЦЕНЫ ===
const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();

// Убираем сплошной черный фон, чтобы использовать красивый CSS-градиент
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
viewport.appendChild(renderer.domElement);

// Красивое студийное окружение для отражений
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// === 2. ОСВЕЩЕНИЕ ===
// Мягкий общий свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Основной направленный свет (сверху справа)
const mainLight = new THREE.DirectionalLight(0xffffff, 2);
mainLight.position.set(5, 10, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 50;
mainLight.shadow.camera.left = -10;
mainLight.shadow.camera.right = 10;
mainLight.shadow.camera.top = 10;
mainLight.shadow.camera.bottom = -10;
mainLight.shadow.bias = -0.0005;
scene.add(mainLight);

// Подсветка спереди (чтобы выделить решетку и фары)
const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
frontLight.position.set(0, 2, 10);
scene.add(frontLight);

// === 3. СТИЛЬНЫЙ ПОЛ (БЕЗ СЕТКИ) ===
const floorGeometry = new THREE.CircleGeometry(50, 64);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1e293b, 
    metalness: 0.9, 
    roughness: 0.15,
    envMapIntensity: 1.5 
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
floor.receiveShadow = true;
scene.add(floor);

// === 4. УПРАВЛЕНИЕ (МЫШЬ) ===
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 2, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.minDistance = 4;
controls.maxDistance = 20;
controls.autoRotateSpeed = 1.0;
controls.target.set(0, 1, 0);

// === 5. ЗАГРУЗКА МОДЕЛИ ===
const loader = new GLTFLoader();
let carModel = null;

loader.load(
    'models/car.glb', 
    (gltf) => {
        carModel = gltf.scene;
        
        carModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material && child.material.isMeshStandardMaterial) {
                    child.material.envMapIntensity = 2.0; // Усиливаем отражения
                }
            }
        });

        const box = new THREE.Box3().setFromObject(carModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        carModel.position.x = -center.x;
        carModel.position.y = -center.y + (size.y / 2);
        carModel.position.z = -center.z;
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 6 / maxDim;
        carModel.scale.set(scale, scale, scale);
        
        scene.add(carModel);

        // Инициализируем цвет по умолчанию
        changeColor(colors[0]);

        document.getElementById('loader').classList.add('hidden');
    },
    (xhr) => {
        if (xhr.total) {
            const percent = (xhr.loaded / xhr.total) * 100;
            document.getElementById('loader-bar-fill').style.width = percent + '%';
        }
    },
    (error) => {
        console.error(error);
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('error-screen').classList.remove('hidden');
        document.getElementById('error-message').textContent = "Ошибка загрузки модели.";
    }
);

// === 6. ЦВЕТА КУЗОВА ===
const colors = [
    { name: 'A08 · Crystal White', hex: '#ffffff', metal: 0.4, rough: 0.1 },
    { name: 'A12 · Obsidian Black', hex: '#050505', metal: 0.9, rough: 0.1 },
    { name: 'A05 · Metallic Grey', hex: '#6b7280', metal: 0.8, rough: 0.2 },
    { name: 'A22 · Sport Red', hex: '#991b1b', metal: 0.7, rough: 0.15 },
    { name: 'A30 · Ocean Blue', hex: '#1e3a8a', metal: 0.7, rough: 0.15 }
];

const swatchesContainer = document.getElementById('color-swatches');
const colorNameDisplay = document.getElementById('color-name');

colors.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch' + (index === 0 ? ' active' : '');
    swatch.style.backgroundColor = color.hex;
    
    if (color.hex === '#ffffff') {
        swatch.style.border = '1px solid #ccc';
    }
    
    swatch.onclick = () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        colorNameDisplay.textContent = color.name;
        changeColor(color);
    };
    
    swatchesContainer.appendChild(swatch);
});

function changeColor(colorObj) {
    if (!carModel) return;
    
    carModel.traverse((child) => {
        if (child.isMesh) {
            const mat = child.material;
            if (mat) {
                // Более надежный поиск кузова
                const isBody = mat.name.toLowerCase().includes('body') || 
                               mat.name.toLowerCase().includes('paint') || 
                               child.name.toLowerCase().includes('body') || 
                               child.name.toLowerCase().includes('paint');
                               
                if (isBody) {
                    mat.color.set(colorObj.hex);
                    
                    if (mat.isMeshStandardMaterial) {
                        mat.metalness = colorObj.metal;
                        mat.roughness = colorObj.rough;
                        mat.envMapIntensity = 2.0; 
                        mat.needsUpdate = true;
                    }
                }
            }
        }
    });
}

// Вращение
const btnRotate = document.getElementById('btn-rotate');
btnRotate.onclick = () => {
    const isPressed = btnRotate.getAttribute('aria-pressed') === 'true';
    btnRotate.setAttribute('aria-pressed', !isPressed);
    controls.autoRotate = !isPressed;
};

// === 7. КАМЕРЫ ===
const views = {
    front: { pos: [0, 1.5, 9], target: [0, 0.8, 0] },
    rear: { pos: [0, 1.5, -9], target: [0, 0.8, 0] },
    left: { pos: [-9, 1.5, 0], target: [0, 0.8, 0] },
    right: { pos: [9, 1.5, 0], target: [0, 0.8, 0] },
    'front-left': { pos: [-6, 3, 6], target: [0, 0.8, 0] },
    'front-right': { pos: [6, 3, 6], target: [0, 0.8, 0] }
};

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const view = views[btn.dataset.view];
        if (view) {
            camera.position.set(...view.pos);
            controls.target.set(...view.target);
            controls.update();
        }
    };
});

// Анимация
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
