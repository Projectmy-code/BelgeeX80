import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// === 1. ИНИЦИАЛИЗАЦИЯ СЦЕНЫ ===
const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1017);

// Камера
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 3, 8);

// Рендерер
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Высокое качество на Retina
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Реалистичное освещение
renderer.toneMappingExposure = 1.0;
viewport.appendChild(renderer.domElement);

// === 2. РЕАЛИСТИЧНОЕ ОКРУЖЕНИЕ (ДЛЯ ОТРАЖЕНИЙ) ===
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// === 3. ОСВЕЩЕНИЕ ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Подсветка сзади (для красивых бликов на кузове)
const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
rimLight.position.set(-10, 5, -10);
scene.add(rimLight);

// === 4. ПОЛ И ТЕНИ ===
const gridHelper = new THREE.GridHelper(50, 50, 0x253142, 0x161e2b);
gridHelper.position.y = -0.01; // Чуть ниже уровня колес
scene.add(gridHelper);

// Невидимая плоскость для принятия тени от машины
const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.ShadowMaterial({ opacity: 0.4 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// === 5. УПРАВЛЕНИЕ (МЫШЬ) ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Запрещаем камере уходить под пол
controls.minDistance = 4;
controls.maxDistance = 20;
controls.autoRotateSpeed = 1.5;
controls.target.set(0, 1, 0); // Смотрим чуть выше центра

// === 6. ЗАГРУЗКА МОДЕЛИ ===
const loader = new GLTFLoader();
let carModel = null;

loader.load(
    'models/car.glb', 
    (gltf) => {
        carModel = gltf.scene;
        
        // Включаем тени для всех деталей машины
        carModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Делаем материалы чуть более глянцевыми, если они стандартные
                if (child.material && child.material.isMeshStandardMaterial) {
                    child.material.envMapIntensity = 1.5; 
                }
            }
        });

        // Автоматическое центрирование и масштабирование
        const box = new THREE.Box3().setFromObject(carModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        carModel.position.x = -center.x;
        carModel.position.y = -center.y + (size.y / 2); // Ставим на пол
        carModel.position.z = -center.z;
        
        // Масштабируем так, чтобы машина была комфортного размера
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 6 / maxDim;
        carModel.scale.set(scale, scale, scale);
        
        scene.add(carModel);

        // Скрываем лоадер
        document.getElementById('loader').classList.add('hidden');
    },
    (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100;
        document.getElementById('loader-bar-fill').style.width = percent + '%';
    },
    (error) => {
        console.error('Ошибка загрузки:', error);
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('error-screen').classList.remove('hidden');
        document.getElementById('error-message').textContent = "Файл models/car.glb не найден.";
    }
);

// === 7. ЦВЕТА КУЗОВА ===
const colors = [
    { name: 'A08 · Crystal White', hex: '#ffffff', metal: 0.1, rough: 0.2 },
    { name: 'A12 · Obsidian Black', hex: '#0a0a0a', metal: 0.8, rough: 0.1 },
    { name: 'A05 · Metallic Grey', hex: '#6b7280', metal: 0.6, rough: 0.3 },
    { name: 'A22 · Sport Red', hex: '#b91c1c', metal: 0.6, rough: 0.2 },
    { name: 'A30 · Ocean Blue', hex: '#1d4ed8', metal: 0.6, rough: 0.2 }
];

const swatchesContainer = document.getElementById('color-swatches');
const colorNameDisplay = document.getElementById('color-name');

// Создаем кружочки цветов
colors.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch' + (index === 0 ? ' active' : '');
    swatch.style.backgroundColor = color.hex;
    
    // Для белого цвета нужна рамка, чтобы его было видно
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

// Функция покраски
function changeColor(colorObj) {
    if (!carModel) return;
    
    carModel.traverse((child) => {
        if (child.isMesh) {
            // Ищем материалы, которые относятся к кузову (по названию или индексу)
            // Обычно это основной материал или имеет в названии 'body', 'paint', 'car'
            const mat = child.material;
            if (mat) {
                // Применяем цвет и свойства только к основному кузову (грубо, но работает)
                // Если в модели есть салон или стекла, они обычно имеют другие материалы
                if (mat.name.toLowerCase().includes('body') || 
                    mat.name.toLowerCase().includes('paint') || 
                    mat.name.toLowerCase().includes('car') ||
                    child.name.toLowerCase().includes('body')) {
                    
                    mat.color.set(colorObj.hex);
                    
                    // Делаем эффект автомобильной краски
                    if (mat.isMeshStandardMaterial) {
                        mat.metalness = colorObj.metal;
                        mat.roughness = colorObj.rough;
                        mat.envMapIntensity = 1.5;
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

// === 8. КАМЕРЫ (ВИДЫ) ===
const views = {
    front: { pos: [0, 2.5, 10], target: [0, 1, 0] },
    rear: { pos: [0, 2.5, -10], target: [0, 1, 0] },
    left: { pos: [-10, 2.5, 0], target: [0, 1, 0] },
    right: { pos: [10, 2.5, 0], target: [0, 1, 0] },
    'front-left': { pos: [-7, 4, 7], target: [0, 1, 0] },
    'front-right': { pos: [7, 4, 7], target: [0, 1, 0] }
};

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const view = views[btn.dataset.view];
        if (view) {
            // Плавное перемещение (можно сделать через анимацию, но пока ставим резко)
            camera.position.set(...view.pos);
            controls.target.set(...view.target);
            controls.update();
        }
    };
});

// === 9. АНИМАЦИЯ И РЕСАЙЗ ===
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
