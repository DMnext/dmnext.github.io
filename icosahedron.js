/* ============================================
   DMlabs Portfolio — 3D Icosahedron
   Built with Three.js
   ============================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Theme Colors ---
const THEME_COLORS = {
  dark: {
    faceColor: 0x00c9a7,
    edgeColor: 0xa7f3d0,
    ambientIntensity: 0.35,
    dirIntensity: 1.0,
  },
  light: {
    faceColor: 0x0d9488,
    edgeColor: 0x134e4a,
    ambientIntensity: 0.5,
    dirIntensity: 0.9,
  },
};

// --- Main Init ---
function initIcosahedron() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 2.2, 4.5);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(4, 6, 4);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x5eead4, 0.3);
  fillLight.position.set(-3, -2, -2);
  scene.add(fillLight);

  // --- Icosahedron Geometry (built-in Three.js) ---
  // radius=1.5, detail=0 gives the standard 20-face icosahedron
  const icoGeometry = new THREE.IcosahedronGeometry(1.5, 0);

  // Face material — solid colored with flat shading
  const faceMaterial = new THREE.MeshPhongMaterial({
    color: 0x00c9a7,
    flatShading: true,
    shininess: 60,
    specular: new THREE.Color(0x333333),
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });

  const faceMesh = new THREE.Mesh(icoGeometry, faceMaterial);

  // Edge wireframe overlay
  const edgesGeometry = new THREE.EdgesGeometry(icoGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xa7f3d0,
    linewidth: 1,
    transparent: true,
    opacity: 0.9,
  });
  const edgeLines = new THREE.LineSegments(edgesGeometry, edgeMaterial);

  // Group them together
  const group = new THREE.Group();
  group.add(faceMesh);
  group.add(edgeLines);
  scene.add(group);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.8;

  // --- Theme Handling ---
  function applyTheme(theme) {
    const tc = THEME_COLORS[theme] || THEME_COLORS.dark;
    faceMaterial.color.setHex(tc.faceColor);
    edgeMaterial.color.setHex(tc.edgeColor);
    ambientLight.intensity = tc.ambientIntensity;
    dirLight.intensity = tc.dirIntensity;
  }

  // Listen for theme changes from script.js
  document.addEventListener('themechange', (e) => {
    applyTheme(e.detail.theme);
  });

  // Apply initial theme
  const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(initialTheme);

  // --- Floating Animation ---
  let floatTime = 0;

  // --- Resize ---
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', onResize);

  // --- Animate ---
  function animate() {
    requestAnimationFrame(animate);

    // Subtle floating motion
    floatTime += 0.012;
    group.position.y = Math.sin(floatTime) * 0.08;

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

// Init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIcosahedron);
} else {
  initIcosahedron();
}
