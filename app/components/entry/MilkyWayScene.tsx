"use client";

import { useEffect, useRef } from "react";

type MilkyWaySceneProps = {
  progress: number;
};

const PARALLAX_STRENGTH = 1;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function MilkyWayScene({ progress }: MilkyWaySceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let frameId = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let disposeScene: (() => void) | null = null;

    const mouseTarget = { x: 0, y: 0 };
    const mouseCurrent = { x: 0, y: 0 };
    const reducedMotion = prefersReducedMotion();

    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return;
      mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        glowRef.current.style.opacity = "1";
      }
    };

    const onPointerLeave = () => {
      mouseTarget.x = 0;
      mouseTarget.y = 0;
      if (glowRef.current) glowRef.current.style.opacity = "0";
    };

    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    }

    const cleanup = () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      disposeScene?.();
      renderer?.dispose();
      renderer = null;
    };

    (async () => {
      const THREE = await import("three");
      if (disposed || !canvas) return;

      const scene = new THREE.Scene();
      const spaceFog = new THREE.FogExp2(0x0a0a23, 0.0024);
      scene.fog = spaceFog;

      const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        500,
      );

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setClearColor(0x000000, 0);

      const bgCount = 8000;
      const bgPos = new Float32Array(bgCount * 3);
      const bgColors = new Float32Array(bgCount * 3);
      const starPalettes = [
        new THREE.Color("#ffffff"),
        new THREE.Color("#f0f8ff"),
        new THREE.Color("#e6e6fa"),
        new THREE.Color("#d8bfd8"),
        new THREE.Color("#c8a2c8"),
        new THREE.Color("#b19cd9"),
      ];
      for (let i = 0; i < bgCount; i++) {
        const r = 160 + Math.random() * 140;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        bgPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        bgPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        bgPos[i * 3 + 2] = r * Math.cos(phi);
        const a = starPalettes[Math.floor(Math.random() * starPalettes.length)];
        const b = starPalettes[Math.floor(Math.random() * starPalettes.length)];
        const c = a.clone().lerp(b, Math.random());
        bgColors[i * 3] = c.r;
        bgColors[i * 3 + 1] = c.g;
        bgColors[i * 3 + 2] = c.b;
      }
      const bgGeo = new THREE.BufferGeometry();
      bgGeo.setAttribute("position", new THREE.BufferAttribute(bgPos, 3));
      bgGeo.setAttribute("color", new THREE.BufferAttribute(bgColors, 3));
      const bgMat = new THREE.PointsMaterial({
        size: 0.4,
        vertexColors: true,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const bgStars = new THREE.Points(bgGeo, bgMat);
      scene.add(bgStars);

      // Persistent purple nebula wash — stays visible behind the globe during zoom-in.
      const spaceAmbience = new THREE.Group();
      scene.add(spaceAmbience);

      const nebulaPurple = new THREE.MeshBasicMaterial({
        color: 0x6a0dad,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const nebulaIndigo = new THREE.MeshBasicMaterial({
        color: 0x4b0082,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const nebulaMagenta = new THREE.MeshBasicMaterial({
        color: 0x8b3a8b,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const nebulaLavender = new THREE.MeshBasicMaterial({
        color: 0xd8bfd8,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ambienceMats = [nebulaPurple, nebulaIndigo, nebulaMagenta, nebulaLavender];
      for (let i = 0; i < 5; i++) {
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(140, 140),
          ambienceMats[i % ambienceMats.length],
        );
        plane.rotation.set(0.4 + i * 0.22, i * 0.9, 0.1 + i * 0.08);
        plane.position.set((i - 2) * 18, -2 + i * 1.2, -35 - i * 8);
        spaceAmbience.add(plane);
      }

      const ambienceCoreGeo = new THREE.SphereGeometry(28, 24, 24);
      const ambienceCoreMat = new THREE.MeshBasicMaterial({
        color: 0x6a0dad,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ambienceCore = new THREE.Mesh(ambienceCoreGeo, ambienceCoreMat);
      ambienceCore.position.z = -20;
      spaceAmbience.add(ambienceCore);

      const milkyGroup = new THREE.Group();
      scene.add(milkyGroup);

      const arms = 4;
      const count = 18000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const radius = 55;

      const coreColor = new THREE.Color("#e6e6fa");
      const corePink = new THREE.Color("#d8bfd8");
      const armPurple = new THREE.Color("#6a0dad");
      const armIndigo = new THREE.Color("#4b0082");
      const armMagenta = new THREE.Color("#8b3a8b");
      const armWhite = new THREE.Color("#f0f8ff");

      for (let i = 0; i < count; i++) {
        const arm = i % arms;
        const dist = Math.pow(Math.random(), 0.55) * radius;
        const spin = dist * 0.14;
        const armAngle = (arm / arms) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 0.55;
        const angle = armAngle + spin + jitter;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = (Math.random() - 0.5) * (2.2 + dist * 0.04);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const t = dist / radius;
        const c = new THREE.Color();
        if (t < 0.14) {
          c.copy(corePink).lerp(coreColor, t / 0.14).lerp(armWhite, t * 0.35);
        } else if (arm % 3 === 0) {
          c.copy(armPurple).lerp(armWhite, (t - 0.14) / 0.86);
        } else if (arm % 3 === 1) {
          c.copy(armIndigo).lerp(armMagenta, 0.35).lerp(armWhite, (t - 0.14) / 0.86);
        } else {
          c.copy(armMagenta).lerp(armPurple, 0.4).lerp(armWhite, (t - 0.14) / 0.86);
        }
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      const galaxyGeo = new THREE.BufferGeometry();
      galaxyGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      galaxyGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const galaxyMat = new THREE.PointsMaterial({
        size: 0.52,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
      galaxy.rotation.x = 0.42;
      milkyGroup.add(galaxy);

      const coreGeo = new THREE.SphereGeometry(3.2, 32, 32);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xe6e6fa,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      milkyGroup.add(core);

      const coreHaloGeo = new THREE.SphereGeometry(8, 32, 32);
      const coreHaloMat = new THREE.MeshBasicMaterial({
        color: 0xd8bfd8,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
      });
      const coreHalo = new THREE.Mesh(coreHaloGeo, coreHaloMat);
      milkyGroup.add(coreHalo);

      const clock = new THREE.Clock();

      const onResize = () => {
        if (!renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      window.addEventListener("resize", onResize);

      const tick = () => {
        if (disposed) return;
        const t = clock.getElapsedTime();
        const p = easeInOutCubic(Math.min(1, Math.max(0, progressRef.current)));
        const interact = reducedMotion ? 0 : (1 - p * 0.9) * PARALLAX_STRENGTH;

        mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.07;
        mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.07;
        const mx = mouseCurrent.x * interact;
        const my = mouseCurrent.y * interact;

        const camZ = lerp(130, 6, p);
        const camY = lerp(22, 0.5, p);
        const camX = lerp(0, 0, p);
        camera.position.set(camX + mx * 10, camY + my * 6, camZ);
        camera.lookAt(mx * 2.5, my * 1.8, 0);

        bgStars.rotation.y = mx * 0.035;
        bgStars.rotation.x = my * 0.025;
        spaceAmbience.rotation.y = mx * 0.02;
        spaceAmbience.rotation.x = my * 0.015;

        milkyGroup.rotation.y = mx * 0.14;
        milkyGroup.rotation.x = my * 0.09;
        milkyGroup.position.x = mx * 1.8;
        milkyGroup.position.y = my * 1.2;

        galaxy.rotation.z = t * 0.018 + mx * 0.025;
        core.scale.setScalar(1 + Math.sin(t * 1.4) * 0.06 + Math.abs(mx) * 0.04);
        coreHalo.scale.setScalar(1 + Math.sin(t * 0.9) * 0.08);

        const spread = 1 + p * p * 2.8;
        galaxy.scale.set(spread, 1 + p * 0.4, spread);

        // Dense spiral fades as the globe appears; coloured space ambience stays behind.
        const galaxyFade = Math.max(0, 1 - Math.max(0, (p - 0.2) / 0.5));
        const globePhase = Math.min(1, Math.max(0, (p - 0.35) / 0.45));
        const ambienceBoost = 0.55 + globePhase * 0.55;

        milkyGroup.visible = galaxyFade > 0.02;
        galaxyMat.opacity = 0.9 * galaxyFade;
        coreMat.opacity = 0.62 * galaxyFade;
        coreHaloMat.opacity = 0.22 * galaxyFade;

        nebulaPurple.opacity = 0.16 * ambienceBoost;
        nebulaIndigo.opacity = 0.2 * ambienceBoost;
        nebulaMagenta.opacity = 0.12 * ambienceBoost;
        nebulaLavender.opacity = 0.08 * ambienceBoost;
        ambienceCoreMat.opacity = 0.06 * ambienceBoost;

        bgMat.opacity = 0.82 + globePhase * 0.14;
        bgMat.size = 0.4 + globePhase * 0.08;
        spaceFog.density = lerp(0.0024, 0.0009, globePhase);

        if (glowRef.current) {
          glowRef.current.style.opacity = String(
            Math.max(0.2, galaxyFade * 0.85),
          );
        }

        renderer!.render(scene, camera);
        frameId = requestAnimationFrame(tick);
      };

      tick();

      disposeScene = () => {
        window.removeEventListener("resize", onResize);
        bgGeo.dispose();
        bgMat.dispose();
        galaxyGeo.dispose();
        galaxyMat.dispose();
        coreGeo.dispose();
        coreMat.dispose();
        coreHaloGeo.dispose();
        coreHaloMat.dispose();
        ambienceCoreGeo.dispose();
        ambienceCoreMat.dispose();
        nebulaPurple.dispose();
        nebulaIndigo.dispose();
        nebulaMagenta.dispose();
        nebulaLavender.dispose();
      };
    })();

    return cleanup;
  }, []);

  return (
    <div ref={rootRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      />
      <div
        ref={glowRef}
        className="milky-cursor-glow pointer-events-none absolute left-0 top-0 z-[1] opacity-0 transition-opacity duration-300"
        aria-hidden
      />
    </div>
  );
}
