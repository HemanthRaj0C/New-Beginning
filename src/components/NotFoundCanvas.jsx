"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

const NotFoundCanvas = forwardRef((props, ref) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const instancedMeshRef = useRef(null);
  const particlesRef = useRef(null);

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;

      gsap.to(cam.position, {
        x: 24, y: 22, z: 24,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
      gsap.to(ctrl.target, {
        x: 0, y: 5, z: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d16);
    scene.fog = new THREE.FogExp2(0x0a0d16, 0.012);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(24, 22, 24);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 5, 0);
    controls.minDistance = 6;
    controls.maxDistance = 80;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controlsRef.current = controls;

    // ── Create 3D Voxel "404" & Island ──
    const voxels = generate404Voxels();
    const VS = 0.4;
    const boxSize = 0.41;
    const geo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const mat = new THREE.MeshBasicMaterial();

    const count = voxels.length;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    let maxY = 1;
    for (const v of voxels) if (v.y > maxY) maxY = v.y;

    for (let i = 0; i < count; i++) {
      const v = voxels[i];
      dummy.position.set(v.x * VS, v.y * VS, v.z * VS);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Height AO shading for 3D depth
      const ao = 0.6 + 0.4 * (v.y / maxY);
      col.setRGB(v.color.r * ao, v.color.g * ao, v.color.b * ao);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    instancedMeshRef.current = mesh;

    // ── Floating Drift Particles ──
    const ptCanvas = document.createElement("canvas");
    ptCanvas.width = ptCanvas.height = 64;
    const ptCtx = ptCanvas.getContext("2d");
    const grad = ptCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,182,213,1.0)");
    grad.addColorStop(0.4, "rgba(251,113,133,0.8)");
    grad.addColorStop(0.8, "rgba(244,63,94,0.2)");
    grad.addColorStop(1.0, "rgba(244,63,94,0.0)");
    ptCtx.fillStyle = grad;
    ptCtx.beginPath();
    ptCtx.arc(32, 32, 32, 0, Math.PI * 2);
    ptCtx.fill();
    const ptTex = new THREE.CanvasTexture(ptCanvas);

    const ptCount = 300;
    const pos = new Float32Array(ptCount * 3);
    const speeds = new Float32Array(ptCount);

    for (let i = 0; i < ptCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = Math.random() * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      speeds[i] = 0.02 + Math.random() * 0.04;
    }

    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const ptMat = new THREE.PointsMaterial({
      size: 0.35,
      map: ptTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      alphaTest: 0.01,
      sizeAttenuation: true,
    });

    const pts = new THREE.Points(ptGeo, ptMat);
    scene.add(pts);
    particlesRef.current = pts;

    // ── Animation Loop ──
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      controls.update();

      // Animate floating particles
      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array;
        for (let i = 0; i < ptCount; i++) {
          positions[i * 3 + 1] -= speeds[i];
          positions[i * 3] += Math.sin(clock.getElapsedTime() + i) * 0.01;
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 24;
            positions[i * 3] = (Math.random() - 0.5) * 36;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 36;
          }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize Handler ──
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none"
    />
  );
});

NotFoundCanvas.displayName = "NotFoundCanvas";

export default NotFoundCanvas;

// ── Voxel Generator for "404" & Floating Voxel Tree Island ──
function generate404Voxels() {
  const voxels = [];
  const map = new Map();

  const add = (x, y, z, color) => {
    const key = `${x},${y},${z}`;
    if (!map.has(key)) {
      const v = { x: x - 2, y, z: z - 2, color };
      map.set(key, v);
      voxels.push(v);
    }
  };

  // Base circular floating island
  const islandR = 14;
  for (let x = -islandR; x <= islandR; x++) {
    for (let z = -islandR; z <= islandR; z++) {
      const distSq = x * x + z * z;
      if (distSq <= islandR * islandR) {
        const depth = Math.max(1, Math.floor(3 * (1 - Math.sqrt(distSq) / islandR)));
        for (let y = 0; y >= -depth; y--) {
          const isTop = y === 0;
          const col = isTop
            ? { r: 0.22, g: 0.55, b: 0.35 } // Green grass
            : { r: 0.35, g: 0.24, b: 0.15 }; // Dirt brown
          add(x, y, z, col);
        }
      }
    }
  }

  // Trunk
  for (let y = 1; y <= 12; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx * dx + dz * dz <= 1.5) {
          add(dx, y, dz, { r: 0.42, g: 0.28, b: 0.16 });
        }
      }
    }
  }

  // 404 Voxel Structure embedded in the foliage
  // Grid layout for 4 - 0 - 4
  const digitY = 13;

  // Digit "4" (Left)
  drawDigit4(-8, digitY, 0, add, { r: 0.98, g: 0.45, b: 0.65 });

  // Digit "0" (Center)
  drawDigit0(0, digitY + 2, 0, add, { r: 0.95, g: 0.85, b: 0.35 });

  // Digit "4" (Right)
  drawDigit4(8, digitY, 0, add, { r: 0.98, g: 0.45, b: 0.65 });

  // Soft organic foliage clouds surrounding the 404 digits
  const foliageCenters = [
    { x: -9, y: 13, z: 0, r: 4, col: { r: 0.96, g: 0.65, b: 0.82 } },
    { x: 0, y: 15, z: 0, r: 5, col: { r: 0.92, g: 0.82, b: 0.55 } },
    { x: 9, y: 13, z: 0, r: 4, col: { r: 0.96, g: 0.65, b: 0.82 } },
    { x: -4, y: 10, z: -3, r: 3.5, col: { r: 0.42, g: 0.82, b: 0.55 } },
    { x: 4, y: 10, z: 3, r: 3.5, col: { r: 0.42, g: 0.82, b: 0.55 } },
  ];

  for (const c of foliageCenters) {
    const rInt = Math.ceil(c.r);
    for (let dx = -rInt; dx <= rInt; dx++) {
      for (let dy = -rInt; dy <= rInt; dy++) {
        for (let dz = -rInt; dz <= rInt; dz++) {
          if (dx * dx + dy * dy + dz * dz <= c.r * c.r && Math.random() < 0.7) {
            add(c.x + dx, c.y + dy, c.z + dz, c.col);
          }
        }
      }
    }
  }

  return voxels;
}

function drawDigit4(offsetX, startY, offsetZ, add, col) {
  // Left vertical stroke
  for (let y = startY + 3; y <= startY + 7; y++) add(offsetX - 2, y, offsetZ, col);
  // Horizontal bar
  for (let x = offsetX - 2; x <= offsetX + 2; x++) add(x, startY + 3, offsetZ, col);
  // Right full vertical stroke
  for (let y = startY; y <= startY + 7; y++) add(offsetX + 1, y, offsetZ, col);
}

function drawDigit0(offsetX, startY, offsetZ, add, col) {
  // Outer rectangle outline for '0'
  for (let y = startY; y <= startY + 7; y++) {
    add(offsetX - 2, y, offsetZ, col);
    add(offsetX + 2, y, offsetZ, col);
  }
  for (let x = offsetX - 1; x <= offsetX + 1; x++) {
    add(x, startY, offsetZ, col);
    add(x, startY + 7, offsetZ, col);
  }
}
