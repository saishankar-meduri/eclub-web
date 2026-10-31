'use client';

import { useEffect, useRef } from 'react';

export default function KineticCore() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let isVisible = true;
    let width = 0;
    let height = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVertices = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return [x / len, y / len, z / len];
    });

    const V = rawVertices.length;
    const pxArr = new Float32Array(V);
    const pyArr = new Float32Array(V);
    const depthArr = new Float32Array(V);

    const edges = [];
    for (let i = 0; i < V; i++) {
      for (let j = i + 1; j < V; j++) {
        const dist = Math.hypot(
          rawVertices[i][0] - rawVertices[j][0],
          rawVertices[i][1] - rawVertices[j][1],
          rawVertices[i][2] - rawVertices[j][2]
        );
        if (Math.abs(dist - 1.05146) < 0.1) edges.push([i, j]);
      }
    }

    let seed = 19;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const particleCount = 26;
    const particles = Array.from({ length: particleCount }, (_, idx) => {
      const theta = (idx / particleCount) * Math.PI * 2;
      const u = (rand() - 0.5) * 2;
      const r = Math.sqrt(1 - u * u);
      return {
        baseX: r * Math.cos(theta) * 1.35,
        baseY: r * Math.sin(theta) * 1.35,
        baseZ: u * 1.35,
        phase: rand() * Math.PI * 2,
        speed: 0.55 + rand() * 0.35,
      };
    });

    let angleX = 0.2;
    let angleY = 0.4;
    let targetAngleX = 0.2;
    let targetAngleY = 0.4;

    let rectLeft = 0;
    let rectTop = 0;

    const syncRect = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      rectLeft = rect.left;
      rectTop = rect.top;
    };

    const resize = () => {
      if (!canvas) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!cw || !ch) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = cw;
      height = ch;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      syncRect();
    };

    resize();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', syncRect, { passive: true });

    const onPointerMove = (e) => {
      if (prefersReducedMotion || !width || !height) return;
      const mx = (e.clientX - (rectLeft + width * 0.5)) / (width * 0.5);
      const my = (e.clientY - (rectTop + height * 0.5)) / (height * 0.5);
      targetAngleY = Math.max(-1.2, Math.min(1.2, mx * 0.65));
      targetAngleX = Math.max(-1.0, Math.min(1.0, -my * 0.65));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    let lastNow = performance.now();
    let elapsed = 0;

    const render = (now) => {
      animId = requestAnimationFrame(render);
      if (!isVisible || !width || !height) {
        lastNow = now;
        return;
      }

      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) * 0.001));
      lastNow = now;
      elapsed += dt;

      if (!prefersReducedMotion) {
        const spring = 1 - Math.exp(-3.2 * dt);
        angleX += (targetAngleX - angleX) * spring + 0.12 * dt;
        angleY += (targetAngleY - angleY) * spring + 0.24 * dt;
      }

      ctx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.dataset.theme === 'light';
      const nodeColor = isLight ? '#111827' : '#ffffff';
      const glowColor = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';

      const cx = width * 0.5;
      const cy = height * 0.5;
      const radius = Math.min(width, height) * 0.38;

      const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.4);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const fov = 3.2;

      for (let i = 0; i < V; i++) {
        const [x, y, z] = rawVertices[i];
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const scale = fov / (fov + z2);
        pxArr[i] = cx + x1 * radius * scale;
        pyArr[i] = cy + y2 * radius * scale;
        depthArr[i] = scale;
      }

      ctx.lineWidth = 1;
      for (let k = 0; k < edges.length; k++) {
        const [i, j] = edges[k];
        const avgDepth = (depthArr[i] + depthArr[j]) * 0.5;
        const alpha = Math.max(0.08, Math.min(0.5, (avgDepth - 0.7) * 0.6));
        ctx.strokeStyle = isLight
          ? `rgba(0,0,0,${(alpha * 0.8).toFixed(3)})`
          : `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(pxArr[i], pyArr[i]);
        ctx.lineTo(pxArr[j], pyArr[j]);
        ctx.stroke();
      }

      ctx.fillStyle = nodeColor;
      for (let i = 0; i < V; i++) {
        const d = depthArr[i];
        const nodeSize = Math.max(2, 3.2 * d);
        ctx.globalAlpha = Math.max(0.2, Math.min(1, (d - 0.7) * 1.2));
        ctx.beginPath();
        ctx.arc(pxArr[i], pyArr[i], nodeSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const ang = elapsed * pt.speed + pt.phase;
        const bx = pt.baseX * Math.cos(ang) - pt.baseZ * Math.sin(ang);
        const bz = pt.baseX * Math.sin(ang) + pt.baseZ * Math.cos(ang);
        const x1 = bx * cosY + bz * sinY;
        const z1 = -bx * sinY + bz * cosY;
        const y2 = pt.baseY * cosX - z1 * sinX;
        const z2 = pt.baseY * sinX + z1 * cosX;
        const sc = fov / (fov + z2);
        const pr = Math.max(1, 1.8 * sc);
        const ppx = cx + x1 * radius * sc;
        const ppy = cy + y2 * radius * sc;
        ctx.moveTo(ppx + pr, ppy);
        ctx.arc(ppx, ppy, pr, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', syncRect);
      window.removeEventListener('pointermove', onPointerMove);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="about-kinetic-canvas" aria-hidden="true" />;
}
