import { useEffect, useRef } from "react";
import * as THREE from "three";

const ORB_PALETTE = {
  idle: new THREE.Color("#e7a857"),
  listening: new THREE.Color("#7fd4e0"),
  thinking: new THREE.Color("#8b87d9"),
  retrieving: new THREE.Color("#c9a6e8"),
  speaking: new THREE.Color("#f0b96a"),
  error: new THREE.Color("#d9756b"),
};

export function MemoryOrb({ state = "idle", amplitude = 0, size = 1 }) {
  const mountRef = useRef(null);
  const stateRef = useRef(state);
  const ampRef = useRef(amplitude);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    ampRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Core wireframe
    const coreGeo = new THREE.IcosahedronGeometry(1.15, 3);
    const coreMat = new THREE.MeshBasicMaterial({
      color: ORB_PALETTE.idle,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Inner soft glow sphere
    const glowGeo = new THREE.SphereGeometry(0.85, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: ORB_PALETTE.idle,
      transparent: true,
      opacity: 0.18,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    // Outer halo
    const haloGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: ORB_PALETTE.idle,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    // Memory particles orbiting in a shell
    const PARTICLE_COUNT = 260;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const radii = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 2.1 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      radii[i] = r;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: ORB_PALETTE.idle,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    let raf;
    let t = 0;
    const targetColor = new THREE.Color().copy(ORB_PALETTE.idle);
    const currentColor = new THREE.Color().copy(ORB_PALETTE.idle);

    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    function animate() {
      raf = requestAnimationFrame(animate);
      t += 0.016;

      const s = stateRef.current;
      const amp = ampRef.current;
      targetColor.copy(ORB_PALETTE[s] || ORB_PALETTE.idle);
      currentColor.lerp(targetColor, 0.05);
      coreMat.color.copy(currentColor);
      glowMat.color.copy(currentColor);
      haloMat.color.copy(currentColor);
      particleMat.color.copy(currentColor);

      // base breathing
      let pulse = 1 + Math.sin(t * 1.2) * 0.03;
      let particleSpread = 1;
      let rotSpeed = 0.06;

      if (s === "listening") {
        pulse = 1 + Math.sin(t * 6) * 0.02 * (0.4 + amp);
        rotSpeed = 0.1;
      } else if (s === "thinking") {
        particleSpread = 0.65 + Math.sin(t * 2) * 0.05;
        rotSpeed = 0.35;
      } else if (s === "retrieving") {
        particleSpread = 0.5;
        rotSpeed = 0.5;
      } else if (s === "speaking") {
        pulse = 1 + Math.abs(Math.sin(t * 10)) * 0.08 * (0.5 + amp);
        rotSpeed = 0.15;
      } else if (s === "error") {
        pulse = 1 + Math.sin(t * 20) * 0.015;
      }

      core.scale.setScalar(size * pulse);
      glow.scale.setScalar(size * pulse * 0.95);
      halo.scale.setScalar(size * (pulse * 0.5 + 0.5));
      core.rotation.y += rotSpeed * 0.016;
      core.rotation.x += rotSpeed * 0.008;
      particles.rotation.y += rotSpeed * 0.01;

      const posAttr = particleGeo.attributes.position;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const baseR = radii[i] * particleSpread;
        const idx = i * 3;
        const len = Math.sqrt(
          positions[idx] ** 2 + positions[idx + 1] ** 2 + positions[idx + 2] ** 2
        );
        const nx = positions[idx] / len;
        const ny = positions[idx + 1] / len;
        const nz = positions[idx + 2] / len;
        posAttr.array[idx] = nx * baseR;
        posAttr.array[idx + 1] = ny * baseR;
        posAttr.array[idx + 2] = nz * baseR;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeChild(renderer.domElement);
      coreGeo.dispose();
      coreMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [size]);

  return <div ref={mountRef} className="w-full h-full" />;
}

export default MemoryOrb;
