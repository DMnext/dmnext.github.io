/* ============================================
   DMlabs Portfolio — 3D Icosahedron
   Full 3D rotation (up, down, left, right) with inertia
   ============================================ */

import * as THREE from 'three';

// --- Theme Colors ---
const THEME_COLORS = {
  dark: {
    faceColor: 0x00c9a7,
    edgeColor: 0xa7f3d0,
    ambientIntensity: 0.4,
    dir1Intensity: 1.0,
    dir2Intensity: 0.45,
  },
  light: {
    faceColor: 0x0d9488,
    edgeColor: 0x134e4a,
    ambientIntensity: 0.55,
    dir1Intensity: 0.9,
    dir2Intensity: 0.35,
  },
};

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
  camera.position.set(0, 0.8, 4.2);
  camera.lookAt(0, 0, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Key light from top-front
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight1.position.set(4, 6, 4);
  scene.add(dirLight1);

  // Fill light from bottom-back to illuminate when rotated upside down
  const dirLight2 = new THREE.DirectionalLight(0x5eead4, 0.45);
  dirLight2.position.set(-4, -5, -3);
  scene.add(dirLight2);

  // --- Icosahedron Geometry ---
  const icoGeometry = new THREE.IcosahedronGeometry(1.5, 0);

  // Face material — flat shaded solid faces
  const faceMaterial = new THREE.MeshPhongMaterial({
    color: 0x00c9a7,
    flatShading: true,
    shininess: 60,
    specular: new THREE.Color(0x333333),
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  const faceMesh = new THREE.Mesh(icoGeometry, faceMaterial);

  // Edge wireframe overlay
  const edgesGeometry = new THREE.EdgesGeometry(icoGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xa7f3d0,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.95,
  });
  const edgeLines = new THREE.LineSegments(edgesGeometry, edgeMaterial);

  // Main 3D group
  const group = new THREE.Group();
  group.add(faceMesh);
  group.add(edgeLines);
  scene.add(group);

  // Pre-allocated objects to avoid per-frame GC pressure
  const _axisY = new THREE.Vector3(0, 1, 0);
  const _axisX = new THREE.Vector3(1, 0, 0);
  const _quatA = new THREE.Quaternion();
  const _quatB = new THREE.Quaternion();

  // --- Free 3D Rotation Controls (Up, Down, Left, Right) ---
  let isDragging = false;
  let prevPointerX = 0;
  let prevPointerY = 0;
  let velX = 0; // horizontal rotation velocity (around Y axis)
  let velY = 0; // vertical rotation velocity (around X axis)
  let lastMoveTime = performance.now();

  const dom = renderer.domElement;

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    isDragging = true;
    prevPointerX = e.clientX;
    prevPointerY = e.clientY;
    velX = 0;
    velY = 0;
    lastMoveTime = performance.now();

    try {
      dom.setPointerCapture(e.pointerId);
    } catch (_) {}

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const deltaX = currentX - prevPointerX;
    const deltaY = currentY - prevPointerY;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);

    prevPointerX = currentX;
    prevPointerY = currentY;
    lastMoveTime = now;

    // Rotation sensitivity
    const ROTATION_SPEED = 0.007;
    const stepX = deltaX * ROTATION_SPEED;
    const stepY = deltaY * ROTATION_SPEED;

    // Calculate velocity for inertia release
    velX = (stepX / dt) * 16;
    velY = (stepY / dt) * 16;

    // Apply rotation on world axes (reuse pre-allocated objects):
    // deltaX (horizontal drag) rotates around world Y axis (left-right)
    // deltaY (vertical drag) rotates around world X axis (up-down)
    _quatA.setFromAxisAngle(_axisY, stepX);
    _quatB.setFromAxisAngle(_axisX, stepY);
    group.quaternion.premultiply(_quatA).premultiply(_quatB);
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    // Clamp velocity to reasonable limit
    velX = Math.max(-0.08, Math.min(0.08, velX));
    velY = Math.max(-0.08, Math.min(0.08, velY));

    try {
      dom.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  dom.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // --- Theme Handling ---
  function applyTheme(theme) {
    const tc = THEME_COLORS[theme] || THEME_COLORS.dark;
    faceMaterial.color.setHex(tc.faceColor);
    edgeMaterial.color.setHex(tc.edgeColor);
    ambientLight.intensity = tc.ambientIntensity;
    dirLight1.intensity = tc.dir1Intensity;
    dirLight2.intensity = tc.dir2Intensity;
  }

  document.addEventListener('themechange', (e) => {
    applyTheme(e.detail.theme);
  });

  const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(initialTheme);

  // --- Floating & Resize ---
  let floatTime = 0;

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', onResize);

  // --- Visibility Gating: skip rendering when canvas is off-screen ---
  let isCanvasVisible = true;
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => { isCanvasVisible = entry.isIntersecting; },
    { threshold: 0 }
  );
  visibilityObserver.observe(container);

  // --- Animation Loop ---
  function animate() {
    requestAnimationFrame(animate);

    // Skip rendering when the canvas is scrolled out of view
    if (!isCanvasVisible) return;

    // Subtle vertical floating motion
    floatTime += 0.012;
    group.position.y = Math.sin(floatTime) * 0.07;

    // Handle rotation physics when not dragging
    if (!isDragging) {
      // If there's inertia from a swipe/drag (horizontal or vertical)
      if (Math.abs(velX) > 0.0001 || Math.abs(velY) > 0.0001) {
        velX *= 0.94; // damping
        velY *= 0.94; // damping

        _quatA.setFromAxisAngle(_axisY, velX);
        _quatB.setFromAxisAngle(_axisX, velY);
        group.quaternion.premultiply(_quatA).premultiply(_quatB);
      } else {
        // Gentle default auto-rotation (yaw + slight tilt)
        _quatA.setFromAxisAngle(_axisY, 0.006);
        group.quaternion.premultiply(_quatA);
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIcosahedron);
} else {
  initIcosahedron();
}
