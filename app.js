import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Инициализация сцены
const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1017);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 2, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
fillLight.position.set(-5, 5, -5);
scene.add(fillLight);

// Контролы
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Не даем камере уйти под землю
controls.minDistance = 3;
controls.maxDistance = 15;
controls.autoRotateSpeed = 1.5;

// Плоскость (пол)
const gridHelper = new THREE.GridHelper(50, 50, 0x253142, 0x161e2b);
scene.add(gridHelper);

// Загрузка модели
const loader = new GLTFLoader();
let carModel = null;

loader.load(
    'models/car.glb', // Путь к вашей модели
    (gltf) => {
        carModel = gltf.scene;
        
        // Автоматический расчет масштаба и центрирование
        const box = new THREE.Box3().setFromObject(carModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        carModel.position.x = -center.x;
        carModel.position.y = -center.y;
        carModel.position.z = -center.z;
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim;
        carModel.scale.set(scale, scale, scale);
        
        scene.add(carModel);

        // Скрываем лоадер
        document.getElementById('loader').classList.add('hidden');
    },
    (xhr) => {
        // Прогресс загрузки
        const percent = (xhr.loaded / xhr.total) * 100;
        document.getElementById('loader-bar-fill').style.width = percent + '%';
    },
    (error) => {
        console.error('Ошибка загрузки:', error);
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('error-screen').classList.remove('hidden');
        document.getElementById('error-message').textContent = "Файл models/car.glb не найден на сервере.";
    }
);

// Цвета
const colors = [
    { name: 'A08 · Crystal White', hex: '#ffffff' },
    { name: 'A12 · Obsidian Black', hex: '#111111' },
    { name: 'A05 · Metallic Grey', hex: '#6b7280' },
    { name: 'A22 · Sport Red', hex: '#dc2626' },
    { name: 'A30 · Ocean Blue', hex: '#2563eb' }
];

const swatchesContainer = document.getElementById('color-swatches');
const colorNameDisplay = document.getElementById('color-name');

colors.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch' + (index === 0 ? ' active' : '');
    swatch.style.backgroundColor = color.hex;
    swatch.style.border = color.hex === '#ffffff' ? '1px solid #ccc' : 'none';
    
    swatch.onclick = () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        colorNameDisplay.textContent = color.name;
        changeColor(color.hex);
    };
    
    swatchesContainer.appendChild(swatch);
});

function changeColor(hex) {
    if (!carModel) return;
    carModel.traverse((child) => {
        if (child.isMesh && (child.name.toLowerCase().includes('body') || child.name.toLowerCase().includes('paint'))) {
            child.material.color.set(hex);
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

// Камеры (виды)
const views = {
    front: { pos: [0, 2, 8] },
    rear: { pos: [0, 2, -8] },
    left: { pos: [-8, 2, 0] },
    right: { pos: [8, 2, 0] },
    'front-left': { pos: [-6, 3, 6] },
    'front-right': { pos: [6, 3, 6] }
};

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const view = views[btn.dataset.view];
        if (view) {
            // Плавное перемещение камеры (в простом виде, просто ставим позицию)
            camera.position.set(...view.pos);
            controls.target.set(0, 1, 0);
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

// Ресайз
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
