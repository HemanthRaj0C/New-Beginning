"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

const VoxelCanvas = forwardRef(function VoxelCanvas(
  { voxels, season = "spring", isFlat = false },
  ref
) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const instancedMeshRef = useRef(null);
  const groundMeshRef = useRef(null);
  const groundPropsRef = useRef(null);
  const particlesRef = useRef(null);
  const groundTexCacheRef = useRef({});

  // Camera snap methods
  useImperativeHandle(ref, () => ({
    snapToTop: () => {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;

      // Keep camera.up = (0,1,0) stable. Use tiny Z epsilon 0.0001 to prevent gimbal lock.
      cam.up.set(0, 1, 0);
      gsap.to(cam.position, {
        x: 0,
        y: 45,
        z: 0.0001,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
      gsap.to(ctrl.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
    },

    snapToSide: () => {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;

      cam.up.set(0, 1, 0);
      gsap.to(cam.position, {
        x: 0,
        y: 8,
        z: 32,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
      gsap.to(ctrl.target, {
        x: 0,
        y: 6,
        z: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
    },

    snapToIsometric: () => {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;

      cam.up.set(0, 1, 0);
      gsap.to(cam.position, {
        x: 22,
        y: 22,
        z: 22,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
      gsap.to(ctrl.target, {
        x: 0,
        y: 5,
        z: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => ctrl.update(),
      });
    },
  }));

  // ── Initialize Three.js Scene ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d16);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(22, 22, 22);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 5, 0);
    controls.minDistance = 3;
    controls.maxDistance = 120;
    
    // Ensure camera.up is always reset on user interaction
    controls.addEventListener("start", () => {
      if (camera.up.y !== 1) {
        camera.up.set(0, 1, 0);
      }
    });

    controls.update();
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xfff5e0, 2.0);
    sun.position.set(15, 35, 15);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x80aaff, 0.8);
    fill.position.set(-15, 15, -15);
    scene.add(fill);

    // Subdivided ground disc (segments=64 needed for displacementMap)
    const groundGeo = new THREE.CylinderGeometry(15, 16, 0.6, 64, 12);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.85,
      metalness: 0.05,
      displacementScale: 0.35,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.3;
    scene.add(ground);
    groundMeshRef.current = ground;

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();

      // Particle Animation
      if (particlesRef.current) {
        const pos = particlesRef.current.geometry.attributes.position.array;
        const speed = particlesRef.current.userData.speed ?? 0.08;
        const isRain = particlesRef.current.userData.isRain;

        for (let i = 1; i < pos.length; i += 3) {
          pos[i] -= speed;
          if (isRain) {
            pos[i - 1] += 0.01;
          }
          if (pos[i] < -1) {
            pos[i] = 28;
            if (isRain) pos[i - 1] = (Math.random() - 0.5) * 32;
          }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []);

  // ── Season Ground Surface, 3D Elements, & Weather Particles ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // ── 1. Procedural PBR Ground Textures (color map + bump map + displacement map) ──
    const cache = groundTexCacheRef.current;
    if (!cache[season]) {
      const S = 512;
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = colorCanvas.height = S;
      const cc = colorCanvas.getContext('2d');

      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = bumpCanvas.height = S;
      const bc = bumpCanvas.getContext('2d');

      if (season === 'spring') {
        // Base: rich green
        cc.fillStyle = '#2a5c38'; cc.fillRect(0, 0, S, S);
        bc.fillStyle = '#505050'; bc.fillRect(0, 0, S, S);
        // Dense grass blades
        for (let i = 0; i < 8000; i++) {
          const gx = Math.random() * S, gy = Math.random() * S;
          const h  = 6 + Math.random() * 18;
          const hue = 100 + Math.random() * 40;
          const lit = 22 + Math.random() * 18;
          cc.strokeStyle = `hsl(${hue},62%,${lit}%)`;
          cc.lineWidth   = 0.8 + Math.random();
          cc.beginPath();
          cc.moveTo(gx, gy + h);
          cc.quadraticCurveTo(gx + (Math.random()-0.5)*7, gy+h*0.5, gx+(Math.random()-0.5)*4, gy);
          cc.stroke();
          // bump: lighter = taller
          bc.strokeStyle = `hsl(0,0%,${60 + Math.random() * 35}%)`;
          bc.lineWidth = 0.8;
          bc.beginPath(); bc.moveTo(gx, gy+h); bc.lineTo(gx, gy); bc.stroke();
        }
        // Cherry blossom petals on ground
        for (let i = 0; i < 600; i++) {
          const px2 = Math.random()*S, py2 = Math.random()*S;
          const r2  = 2 + Math.random() * 4;
          cc.fillStyle = Math.random() > 0.5 ? 'rgba(249,168,212,0.7)' : 'rgba(251,207,232,0.6)';
          cc.beginPath(); cc.ellipse(px2,py2,r2,r2*0.5,Math.random()*Math.PI,0,Math.PI*2); cc.fill();
        }

      } else if (season === 'summer') {
        cc.fillStyle = '#1a3d1a'; cc.fillRect(0, 0, S, S);
        bc.fillStyle = '#444';    bc.fillRect(0, 0, S, S);
        // Very dense, tall dark grass
        for (let i = 0; i < 12000; i++) {
          const gx = Math.random()*S, gy = Math.random()*S;
          const h  = 10 + Math.random() * 24;
          const hue = 108 + Math.random() * 24;
          const lit = 16 + Math.random() * 18;
          cc.strokeStyle = `hsl(${hue},65%,${lit}%)`;
          cc.lineWidth = 0.7 + Math.random() * 0.5;
          cc.beginPath();
          cc.moveTo(gx, gy+h);
          cc.quadraticCurveTo(gx+(Math.random()-0.5)*6, gy+h*0.4, gx+(Math.random()-0.5)*3, gy);
          cc.stroke();
          bc.strokeStyle = `hsl(0,0%,${50 + Math.random() * 40}%)`;
          bc.lineWidth = 0.6; bc.beginPath(); bc.moveTo(gx,gy+h); bc.lineTo(gx,gy); bc.stroke();
        }
        // Yellow & purple wildflowers
        for (let i = 0; i < 300; i++) {
          const fx = Math.random()*S, fy = Math.random()*S;
          cc.fillStyle = Math.random() > 0.5 ? 'rgba(250,204,21,0.9)' : 'rgba(167,139,250,0.85)';
          cc.beginPath(); cc.arc(fx, fy, 2 + Math.random() * 3, 0, Math.PI*2); cc.fill();
        }

      } else if (season === 'autumn') {
        cc.fillStyle = '#5c3d1e'; cc.fillRect(0, 0, S, S);
        bc.fillStyle = '#555';    bc.fillRect(0, 0, S, S);
        // Earth cracks / texture
        for (let i = 0; i < 300; i++) {
          const ex = Math.random()*S, ey = Math.random()*S;
          cc.strokeStyle = `rgba(40,20,5,0.4)`;
          cc.lineWidth = 0.5 + Math.random()*1.5;
          cc.beginPath(); cc.moveTo(ex,ey); cc.lineTo(ex+(Math.random()-0.5)*20, ey+(Math.random()-0.5)*20); cc.stroke();
        }
        // Fallen leaves (ellipses in autumn palette)
        const leafC = ['#ef4444','#f97316','#eab308','#b45309','#dc2626','#d97706','#92400e'];
        for (let i = 0; i < 1800; i++) {
          const lx = Math.random()*S, ly = Math.random()*S;
          const rx = 4 + Math.random()*10, ry = 3 + Math.random()*6;
          cc.fillStyle = leafC[Math.floor(Math.random()*leafC.length)];
          cc.globalAlpha = 0.7 + Math.random()*0.3;
          cc.beginPath(); cc.ellipse(lx,ly,rx,ry,Math.random()*Math.PI,0,Math.PI*2); cc.fill();
          bc.fillStyle = `hsl(0,0%,${45 + Math.random()*30}%)`;
          bc.beginPath(); bc.ellipse(lx,ly,rx,ry,Math.random()*Math.PI,0,Math.PI*2); bc.fill();
        }
        cc.globalAlpha = 1;

      } else { // winter
        cc.fillStyle = '#dbeafe'; cc.fillRect(0, 0, S, S);
        bc.fillStyle = '#aaa';    bc.fillRect(0, 0, S, S);
        // Bright snow base with blue shadow dips
        for (let i = 0; i < 1500; i++) {
          const sx2 = Math.random()*S, sy2 = Math.random()*S;
          const r2  = 3 + Math.random() * 12;
          cc.fillStyle = Math.random()>0.6 ? 'rgba(255,255,255,0.9)' : 'rgba(186,220,240,0.5)';
          cc.beginPath(); cc.arc(sx2,sy2,r2,0,Math.PI*2); cc.fill();
          // bump: brighter = higher snow mounds
          bc.fillStyle = `hsl(0,0%,${55 + Math.random() * 45}%)`;
          bc.beginPath(); bc.arc(sx2,sy2,r2,0,Math.PI*2); bc.fill();
        }
        // Sparkle / ice crystal highlights
        for (let i = 0; i < 200; i++) {
          const sx2 = Math.random()*S, sy2 = Math.random()*S;
          cc.fillStyle = 'rgba(220,245,255,0.95)';
          cc.fillRect(sx2, sy2, 1.5, 1.5);
        }
      }

      const colorTex = new THREE.CanvasTexture(colorCanvas);
      colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
      colorTex.repeat.set(3, 3);
      colorTex.needsUpdate = true;

      const bumpTex = new THREE.CanvasTexture(bumpCanvas);
      bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(3, 3);
      bumpTex.needsUpdate = true;

      cache[season] = { colorTex, bumpTex };
    }

    // Apply textures to ground material
    if (groundMeshRef.current) {
      const mat = groundMeshRef.current.material;
      const { colorTex, bumpTex } = cache[season];
      mat.map             = colorTex;
      mat.bumpMap         = bumpTex;
      mat.bumpScale       = season === 'winter' ? 0.18 : 0.28;
      mat.displacementMap = bumpTex;
      mat.displacementScale = season === 'winter' ? 0.22 : 0.30;
      mat.roughness       = season === 'winter' ? 0.35 : 0.88;
      mat.metalness       = season === 'winter' ? 0.15 : 0.02;
      mat.color.setHex(0xffffff); // let the texture carry the color
      mat.needsUpdate     = true;
    }

    // Remove any old box props
    if (groundPropsRef.current) {
      scene.remove(groundPropsRef.current);
      groundPropsRef.current.geometry.dispose();
      groundPropsRef.current.material.dispose();
      groundPropsRef.current = null;
    }

    // 3. Weather Particles
    if (particlesRef.current) {
      scene.remove(particlesRef.current);
      particlesRef.current.geometry.dispose();
      particlesRef.current.material.dispose();
      particlesRef.current = null;
    }

    const count = season === "autumn" ? 350 : 250;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 32;
      positions[i + 1] = Math.random() * 28;
      positions[i + 2] = (Math.random() - 0.5) * 32;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const colorMap = { spring: 0xffb7d5, summer: 0xfde68a, autumn: 0x7dd3fc, winter: 0xf1f5f9 };
    const sizeMap = { spring: 0.28, summer: 0.18, autumn: 0.15, winter: 0.22 };
    const speedMap = { spring: 0.05, summer: 0.02, autumn: 0.25, winter: 0.04 };

    const mat = new THREE.PointsMaterial({
      color: colorMap[season] ?? 0xffb7d5,
      size: sizeMap[season] ?? 0.25,
      transparent: true,
      opacity: season === "autumn" ? 0.6 : 0.8,
      depthWrite: false,
    });

    const pts = new THREE.Points(geo, mat);
    pts.userData.speed = speedMap[season] ?? 0.06;
    pts.userData.isRain = season === "autumn";
    scene.add(pts);
    particlesRef.current = pts;
  }, [season]);

  // ── Build InstancedMesh from Voxels ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (instancedMeshRef.current) {
      scene.remove(instancedMeshRef.current);
      instancedMeshRef.current.geometry.dispose();
      instancedMeshRef.current.material.dispose();
      instancedMeshRef.current = null;
    }

    if (!voxels || voxels.length === 0) return;

    const boxSize = 0.38;
    const geo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const mat = new THREE.MeshLambertMaterial();
    const count = voxels.length;

    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const v = voxels[i];
      const posY = isFlat ? 0 : v.targetY;
      dummy.position.set(v.x, posY, v.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      col.setRGB(
        Math.max(0, Math.min(1, v.color.r)),
        Math.max(0, Math.min(1, v.color.g)),
        Math.max(0, Math.min(1, v.color.b))
      );
      mesh.setColorAt(i, col);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    scene.add(mesh);
    instancedMeshRef.current = mesh;
  }, [voxels, isFlat]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      className="cursor-grab active:cursor-grabbing"
    />
  );
});

export default VoxelCanvas;
