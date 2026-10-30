'use client';

import { useEffect, useRef } from 'react';

export default function KineticCore() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let isVisible = true;
    let width = 0;
    let height = 0;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Golden ratio for icosahedron vertices
    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVertices = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return [x / len, y / len, z / len];
    });

    // Edges between vertices of icosahedron (distance is equal)
    const edges = [];
    for (let i = 0; i < rawVertices.length; i++) {
      for (let j = i + 1; j < rawVertices.length; j++) {
        const dx = rawVertices[i][0] - rawVertices[j][0];
        const dy = rawVertices[i][1] - rawVertices[j][1];
        const dz = rawVertices[i][2] - rawVertices[j][2];
        const dist = Math.hypot(dx, dy, dz);
        if (Math.abs(dist - 1.05146) < 0.1) {
          edges.push([i, j]);
        }
      }
    }

    // Outer orbital particles
    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, (_, idx) => {
      const theta = (idx / particleCount) * Math.PI * 2;
      const u = (Math.random() - 0.5) * 2;
      const r = Math.sqrt(1 - u * u);
      return {
        baseX: r * Math.cos(theta) * 1.35,
        baseY: r * Math.sin(theta) * 1.35,
        baseZ: u * 1.35,
        phase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.01,
      };
    });

    let angleX = 0.2;
    let angleY = 0.4;
    let targetAngleX = 0.2;
    let targetAngleY = 0.4;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    function onMouseMove(e) {
      if (prefersReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const my = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      targetAngleY = mx * 0.75;
      targetAngleX = -my * 0.75;
    }

    window.addEventListener('mousemove', onMouseMove);

    // Pause when not visible
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    let time = 0;

    function render() {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      time += 0.015;
      if (!prefersReducedMotion) {
        angleX += (targetAngleX - angleX) * 0.05 + 0.002;
        angleY += (targetAngleY - angleY) * 0.05 + 0.004;
      }

      ctx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.dataset.theme === 'light';
      const edgeColor = isLight ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.2)';
      const nodeColor = isLight ? '#111827' : '#ffffff';
      const glowColor = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.38;

      // Draw subtle background radial aura
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.4);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Rotation matrix values
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      function project([x, y, z]) {
        // Rotate Y
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        // Rotate X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspective projection
        const fov = 3.2;
        const scale = fov / (fov + z2);
        return {
          px: cx + x1 * radius * scale,
          py: cy + y2 * radius * scale,
          depth: scale,
          z: z2,
        };
      }

      const projected = rawVertices.map(project);

      // Draw edges
      ctx.lineWidth = 1;
      for (const [i, j] of edges) {
        const p1 = projected[i];
        const p2 = projected[j];
        const avgDepth = (p1.depth + p2.depth) / 2;
        const alpha = Math.max(0.08, Math.min(0.5, (avgDepth - 0.7) * 0.6));

        ctx.strokeStyle = isLight
          ? `rgba(0, 0, 0, ${alpha * 0.8})`
          : `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }

      // Draw vertices (nodes)
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const nodeSize = Math.max(2, 3.2 * p.depth);
        const nodeAlpha = Math.max(0.2, Math.min(1, (p.depth - 0.7) * 1.2));

        ctx.fillStyle = nodeColor;
        ctx.globalAlpha = nodeAlpha;
        ctx.beginPath();
        ctx.arc(p.px, p.py, nodeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw orbiting constellation particles
      for (const pt of particles) {
        const currentAngle = time * pt.speed + pt.phase;
        const px = pt.baseX * Math.cos(currentAngle) - pt.baseZ * Math.sin(currentAngle);
        const pz = pt.baseX * Math.sin(currentAngle) + pt.baseZ * Math.cos(currentAngle);
        const p = project([px, pt.baseY, pz]);

        const pSize = Math.max(1, 1.8 * p.depth);
        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(p.px, p.py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="about-kinetic-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="about-kinetic-canvas" />
    </div>
  );
}

