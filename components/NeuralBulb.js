'use client';

import { useEffect, useRef } from 'react';

export default function NeuralBulb() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let isVisible = true;
    let width = 0;
    let height = 0;

    // Deterministic PRNG for organic neuron placement
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // 1. Sculpt 3D Lightbulb Neuron Coordinates
    const nodes = [];
    const addNode = (x, y, z, kind) => {
      nodes.push({ x, y, z, kind, phase: rand() * Math.PI * 2 });
    };

    addNode(0, -0.98, 0, 'shell');

    const shellBands = [
      { y: -0.91, r: 0.24, n: 6 },
      { y: -0.80, r: 0.44, n: 10 },
      { y: -0.66, r: 0.56, n: 13 },
      { y: -0.50, r: 0.625, n: 15 },
      { y: -0.34, r: 0.645, n: 16 },
      { y: -0.17, r: 0.615, n: 15 },
      { y: -0.01, r: 0.54, n: 13 },
      { y: 0.14, r: 0.44, n: 11 },
      { y: 0.28, r: 0.34, n: 9 },
      { y: 0.40, r: 0.27, n: 8 },
      { y: 0.50, r: 0.235, n: 8 },
    ];

    shellBands.forEach((band, bIdx) => {
      const offset = bIdx * 0.42;
      for (let i = 0; i < band.n; i++) {
        const theta = (i / band.n) * Math.PI * 2 + offset + (rand() - 0.5) * 0.12;
        const rJ = band.r * (0.97 + rand() * 0.06);
        const yJ = band.y + (rand() - 0.5) * 0.028;
        addNode(Math.cos(theta) * rJ, yJ, Math.sin(theta) * rJ, 'shell');
      }
    });

    const baseBands = [
      { y: 0.58, r: 0.24, n: 10 },
      { y: 0.69, r: 0.235, n: 10 },
      { y: 0.80, r: 0.215, n: 9 },
      { y: 0.91, r: 0.145, n: 6 },
    ];

    baseBands.forEach((band, bIdx) => {
      const offset = bIdx * (Math.PI / band.n);
      for (let i = 0; i < band.n; i++) {
        const theta = (i / band.n) * Math.PI * 2 + offset;
        addNode(Math.cos(theta) * band.r, band.y, Math.sin(theta) * band.r, 'base');
      }
    });
    addNode(0, 1.0, 0, 'base');

    // Inner Filament Neural Core
    addNode(0, 0.46, 0, 'core');
    addNode(-0.08, 0.24, 0.02, 'core');
    addNode(0.08, 0.24, -0.02, 'core');
    addNode(-0.14, 0.03, 0.04, 'core');
    addNode(0.14, 0.03, -0.04, 'core');
    addNode(0, -0.32, 0, 'core');

    const coreCount = 15;
    for (let i = 0; i < coreCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / coreCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const cr = 0.2 + (i % 3) * 0.045;
      addNode(
        Math.sin(phi) * Math.cos(theta) * cr,
        -0.32 + Math.cos(phi) * cr * 1.15,
        Math.sin(phi) * Math.sin(theta) * cr,
        'core'
      );
    }

    const N = nodes.length;

    // Pre-allocated typed buffers for zero-GC 120fps projection, smoothing & depth sorting
    const pxArr = new Float32Array(N);
    const pyArr = new Float32Array(N);
    const depthArr = new Float32Array(N);
    const zArr = new Float32Array(N);
    const hoverArr = new Float32Array(N);
    const targetExciteArr = new Float32Array(N);
    const exciteArr = new Float32Array(N);
    const orderArr = new Int16Array(N);
    for (let i = 0; i < N; i++) orderArr[i] = i;

    // 2. Build Synaptic Connections
    const edges = [];
    const edgeSet = new Set();
    const connect = (i, j, type, dist) => {
      if (i === j) return;
      const key = i < j ? i * 1000 + j : j * 1000 + i;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push({ i, j, type, dist });
    };

    for (let i = 0; i < N; i++) {
      const a = nodes[i];
      const candidates = [];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (a.kind === 'shell' && b.kind === 'shell' && dist < 0.33) {
          candidates.push({ j, dist, type: 'shell' });
        } else if (a.kind === 'base' && b.kind === 'base' && dist < 0.21) {
          candidates.push({ j, dist, type: 'base' });
        } else if (
          ((a.kind === 'shell' && b.kind === 'base') || (a.kind === 'base' && b.kind === 'shell')) &&
          dist < 0.18
        ) {
          candidates.push({ j, dist, type: 'base' });
        } else if (a.kind === 'core' && b.kind === 'core' && dist < 0.34) {
          candidates.push({ j, dist, type: 'core' });
        }
      }
      candidates.sort((u, v) => u.dist - v.dist);
      const maxLinks = a.kind === 'core' ? 4 : a.kind === 'base' ? 4 : 5;
      for (let k = 0; k < Math.min(maxLinks, candidates.length); k++) {
        connect(i, candidates[k].j, candidates[k].type, candidates[k].dist);
      }

      if (a.kind === 'core' && a.y < 0.05) {
        let bestShell = -1;
        let bestDist = Infinity;
        for (let j = 0; j < N; j++) {
          if (nodes[j].kind !== 'shell') continue;
          const dist = Math.hypot(a.x - nodes[j].x, a.y - nodes[j].y, a.z - nodes[j].z);
          if (dist < bestDist) {
            bestDist = dist;
            bestShell = j;
          }
        }
        if (bestShell !== -1) connect(i, bestShell, 'axon', bestDist);
      }
    }

    const E = edges.length;
    const BUCKETS = 14;
    const edgeBucketArr = new Int8Array(E);
    const hoverBucketArr = new Int8Array(E);

    const adj = Array.from({ length: N }, () => []);
    edges.forEach((e, idx) => {
      adj[e.i].push({ to: e.j, dist: e.dist, idx });
      adj[e.j].push({ to: e.i, dist: e.dist, idx });
    });

    const coreIndices = [];
    for (let i = 0; i < N; i++) {
      if (nodes[i].kind === 'core') coreIndices.push(i);
    }

    const pickNextNeighbor = (fromIdx, prevIdx) => {
      const list = adj[fromIdx];
      if (!list.length) return null;
      if (list.length === 1) return list[0];
      // Prefer forward synaptic propagation rather than bouncing straight back
      for (let tries = 0; tries < 4; tries++) {
        const cand = list[(Math.random() * list.length) | 0];
        if (cand.to !== prevIdx) return cand;
      }
      return list[(Math.random() * list.length) | 0];
    };

    const pulses = [];
    const spawnPulse = (fromIdx, speedBoost = 1) => {
      const link = pickNextNeighbor(fromIdx, -1);
      if (!link) return;
      const lenNorm = 0.24 / Math.max(0.14, Math.min(0.42, link.dist));
      const baseRate = (0.66 + Math.random() * 0.36) * speedBoost;
      pulses.push({
        from: fromIdx,
        to: link.to,
        t: 0,
        baseRate,
        speed: baseRate * lenNorm, // calm, unhurried ~1.15s per synapse hop
        hop: 0,
        hopsLeft: 2 + ((Math.random() * 3) | 0),
      });
    };

    const ambient = Array.from({ length: 18 }, (_, idx) => {
      const theta = (idx / 18) * Math.PI * 2;
      const y = -0.75 + (idx / 18) * 1.45;
      const r = 0.82 + (idx % 3) * 0.1;
      return {
        x: Math.cos(theta) * r,
        y,
        z: Math.sin(theta) * r,
        speed: 0.28 + (idx % 4) * 0.09,
        phase: idx * 0.7,
      };
    });

    // 3. Smooth Delta-Time Interaction State
    let angleX = 0.08;
    let angleY = 0.35;
    let velX = 0;
    let velY = 0.22; // gentle idle rotation (radians / sec)
    let targetTiltX = 0;
    let targetTiltY = 0;
    let smoothTiltX = 0;
    let smoothTiltY = 0;

    let rawPtrX = 0;
    let rawPtrY = 0;
    let smoothPtrX = 0;
    let smoothPtrY = 0;
    let hasPtrSeed = false;
    let isPointerInside = false;
    let hoverPresence = 0;

    let isDragging = false;
    let lastDragX = 0;
    let lastDragY = 0;
    let dragDistance = 0;
    let targetIgnition = 0.3;
    let ignition = 0.3;

    const triggerIgnition = () => {
      targetIgnition = 0.95;
      for (let k = 0; k < 10; k++) {
        const start = coreIndices[k % coreIndices.length];
        targetExciteArr[start] = 0.9;
        if (!prefersReducedMotion) spawnPulse(start, 1.16);
      }
    };

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
      ctx.lineCap = 'round';
      syncRect();
    };

    resize();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', syncRect, { passive: true });

    const onPointerDown = (e) => {
      syncRect();
      isDragging = true;
      dragDistance = 0;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!width || !height) return;
      const px = e.clientX - rectLeft;
      const py = e.clientY - rectTop;
      const inside = px >= 0 && px <= width && py >= 0 && py <= height;
      isPointerInside = inside;

      if (inside) {
        rawPtrX = px;
        rawPtrY = py;
        if (!hasPtrSeed) {
          smoothPtrX = px;
          smoothPtrY = py;
          hasPtrSeed = true;
        }
      }

      if (isDragging) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        dragDistance += Math.hypot(dx, dy);
        const stepY = dx * 0.0068;
        const stepX = -dy * 0.0052;
        angleY += stepY;
        angleX = Math.max(-0.85, Math.min(0.85, angleX + stepX));
        velY = stepY * 42;
        velX = stepX * 42;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
      } else if (inside && !prefersReducedMotion) {
        const nx = (px - width * 0.5) / (width * 0.5);
        const ny = (py - height * 0.5) / (height * 0.5);
        targetTiltY = nx * 0.22;
        targetTiltX = -ny * 0.16;
      } else if (!inside) {
        targetTiltX = 0;
        targetTiltY = 0;
      }
    };

    const onPointerUp = (e) => {
      if (isDragging && dragDistance < 6) triggerIgnition();
      isDragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    const onPointerLeave = () => {
      isPointerInside = false;
      targetTiltX = 0;
      targetTiltY = 0;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    // 4. Frame-Rate Independent 120fps Render Loop with Continuous Smooth Synapses
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

      const ptrLerp = 1 - Math.exp(-13 * dt);
      const presenceLerp = 1 - Math.exp(-5.2 * dt);
      const hoverLerp = 1 - Math.exp(-6.2 * dt);
      const exciteAttack = 1 - Math.exp(-8.5 * dt);
      const exciteDecay = Math.exp(-2.3 * dt);
      const spring = 1 - Math.exp(-6.5 * dt);

      smoothPtrX += (rawPtrX - smoothPtrX) * ptrLerp;
      smoothPtrY += (rawPtrY - smoothPtrY) * ptrLerp;
      hoverPresence += ((isPointerInside ? 1 : 0) - hoverPresence) * presenceLerp;

      targetIgnition *= Math.exp(-1.5 * dt);
      ignition += (targetIgnition - ignition) * (1 - Math.exp(-7 * dt));

      smoothTiltX += (targetTiltX - smoothTiltX) * spring;
      smoothTiltY += (targetTiltY - smoothTiltY) * spring;

      if (!prefersReducedMotion) {
        if (!isDragging) {
          angleY += velY * dt;
          angleX += velX * dt;
          velX *= Math.exp(-4.5 * dt);
          velY += (0.22 - velY) * (1 - Math.exp(-2.2 * dt));
          angleX += (0.08 + smoothTiltX - angleX) * (1 - Math.exp(-3.2 * dt));
        }

        if (pulses.length < 15 && Math.random() < 6.8 * dt) {
          spawnPulse(coreIndices[(Math.random() * coreIndices.length) | 0], 1);
        }
      }

      ctx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.dataset.theme === 'light';
      const cx = width * 0.5;
      const cy = height * 0.51;
      const radius = Math.min(width, height) * 0.42;

      // Ambient internal bulb glow
      const domeY = cy - radius * 0.26;
      const glow = (isLight ? 0.045 : 0.095) + ignition * (isLight ? 0.055 : 0.13);
      const aura = ctx.createRadialGradient(cx, domeY, radius * 0.04, cx, domeY, radius * 1.22);
      aura.addColorStop(0, isLight ? `rgba(120,128,142,${glow})` : `rgba(255,255,255,${glow})`);
      aura.addColorStop(
        0.48,
        isLight ? `rgba(148,156,170,${glow * 0.28})` : `rgba(243,241,234,${glow * 0.32})`
      );
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, domeY, radius * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // Whisper-light soft hover mist following cursor
      if (hoverPresence > 0.015) {
        const hGlowR = radius * 0.52;
        const hAura = ctx.createRadialGradient(
          smoothPtrX,
          smoothPtrY,
          2,
          smoothPtrX,
          smoothPtrY,
          hGlowR
        );
        const hAlpha = (isLight ? 0.055 : 0.045) * hoverPresence;
        hAura.addColorStop(
          0,
          isLight ? `rgba(165,178,198,${hAlpha})` : `rgba(246,245,240,${hAlpha})`
        );
        hAura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hAura;
        ctx.beginPath();
        ctx.arc(smoothPtrX, smoothPtrY, hGlowR, 0, Math.PI * 2);
        ctx.fill();
      }

      const effAngleX = angleX;
      const effAngleY = angleY + (isDragging ? 0 : smoothTiltY * 0.35);
      const cosX = Math.cos(effAngleX);
      const sinX = Math.sin(effAngleX);
      const cosY = Math.cos(effAngleY);
      const sinY = Math.sin(effAngleY);
      const fov = 3.3;
      const hoverRadius = 96;

      for (let i = 0; i < N; i++) {
        const n = nodes[i];
        const x1 = n.x * cosY + n.z * sinY;
        const z1 = -n.x * sinY + n.z * cosY;
        const y2 = n.y * cosX - z1 * sinX;
        const z2 = n.y * sinX + z1 * cosX;
        const scale = fov / (fov + z2);
        const px = cx + x1 * radius * scale;
        const py = cy + y2 * radius * scale;

        pxArr[i] = px;
        pyArr[i] = py;
        depthArr[i] = scale;
        zArr[i] = z2;

        let targetHover = 0;
        if (hoverPresence > 0.01) {
          const d = Math.hypot(px - smoothPtrX, py - smoothPtrY);
          if (d < hoverRadius) {
            const u = 1 - d / hoverRadius;
            targetHover = u * u * (3 - 2 * u) * hoverPresence;
            if (!prefersReducedMotion && d < 38 && pulses.length < 18 && Math.random() < 1.15 * dt) {
              spawnPulse(i, 1.06);
            }
          }
        }

        hoverArr[i] += (targetHover - hoverArr[i]) * hoverLerp;
        targetExciteArr[i] *= exciteDecay;
        exciteArr[i] += (targetExciteArr[i] - exciteArr[i]) * exciteAttack;
      }

      // Advance pulses & pre-warm receiving neurons so connections flow seamlessly
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pl = pulses[i];
        pl.t += pl.speed * dt;

        if (pl.t > 0.55 && pl.t < 1) {
          const warm = ((pl.t - 0.55) / 0.45) * 0.62;
          if (warm > targetExciteArr[pl.to]) targetExciteArr[pl.to] = warm;
        }

        if (pl.t >= 1) {
          targetExciteArr[pl.to] = Math.max(targetExciteArr[pl.to], 0.72);
          if (pl.hopsLeft > 0 && pulses.length < 22) {
            const next = pickNextNeighbor(pl.to, pl.from);
            if (next) {
              const prevFrom = pl.from;
              pl.from = pl.to;
              pl.to = next.to;
              pl.t -= 1;
              if (pl.t > 0.25) pl.t = 0;
              const lenNorm = 0.24 / Math.max(0.14, Math.min(0.42, next.dist));
              pl.speed = pl.baseRate * lenNorm;
              pl.hop += 1;
              pl.hopsLeft -= 1;
              void prevFrom;
              continue;
            }
          }
          pulses.splice(i, 1);
        }
      }

      // Continuous Smooth Edge Bucketing (eliminates depth-plane & hover threshold popping)
      const baseRgb = isLight ? '18,20,26' : '255,255,255';
      const minA = isLight ? 0.045 : 0.065;
      const maxA = isLight ? 0.34 : 0.44;

      for (let k = 0; k < E; k++) {
        const e = edges[k];
        if (e.type === 'core') {
          edgeBucketArr[k] = -1;
          hoverBucketArr[k] = -1;
          continue;
        }
        const avgD = (depthArr[e.i] + depthArr[e.j]) * 0.5;
        const dNorm = Math.max(0, Math.min(1, (avgD - 0.72) / 0.56));
        const dSmooth = dNorm * dNorm * (3 - 2 * dNorm);

        const hAmt = (hoverArr[e.i] + hoverArr[e.j]) * 0.5;
        const xAmt =
          Math.max(exciteArr[e.i], exciteArr[e.j]) * 0.6 +
          (exciteArr[e.i] + exciteArr[e.j]) * 0.2;

        let alpha = minA + dSmooth * (isLight ? 0.145 : 0.175) + xAmt * (isLight ? 0.14 : 0.19);
        if (isLight && hAmt > 0.01) {
          // Lighten dark ink under cursor in light mode so hover shifts to a lighter silver
          alpha *= 1 - hAmt * 0.55;
        }

        const norm = Math.max(0, Math.min(0.999, (alpha - minA) / (maxA - minA)));
        edgeBucketArr[k] = (norm * BUCKETS) | 0;
        hoverBucketArr[k] = hAmt > 0.03 ? Math.min(5, (hAmt * 6) | 0) : -1;
      }

      ctx.lineWidth = 0.9;
      for (let b = 0; b < BUCKETS; b++) {
        let count = 0;
        ctx.beginPath();
        for (let k = 0; k < E; k++) {
          if (edgeBucketArr[k] !== b) continue;
          const e = edges[k];
          ctx.moveTo(pxArr[e.i], pyArr[e.i]);
          ctx.lineTo(pxArr[e.j], pyArr[e.j]);
          count++;
        }
        if (count > 0) {
          const a = minA + ((b + 0.5) / BUCKETS) * (maxA - minA);
          ctx.strokeStyle = `rgba(${baseRgb},${a.toFixed(3)})`;
          ctx.stroke();
        }
      }

      // Soft, lighter-colour hover sheen across nearby synapses
      const hoverRgb = isLight ? '156,168,186' : '244,243,238';
      ctx.lineWidth = 1.0;
      for (let hb = 0; hb < 6; hb++) {
        let count = 0;
        ctx.beginPath();
        for (let k = 0; k < E; k++) {
          if (hoverBucketArr[k] !== hb) continue;
          const e = edges[k];
          ctx.moveTo(pxArr[e.i], pyArr[e.i]);
          ctx.lineTo(pxArr[e.j], pyArr[e.j]);
          count++;
        }
        if (count > 0) {
          const ha = ((hb + 1) / 6) * (isLight ? 0.34 : 0.19);
          ctx.strokeStyle = `rgba(${hoverRgb},${ha.toFixed(3)})`;
          ctx.stroke();
        }
      }

      // Luminous inner filament core synapses
      const coreAlpha = Math.min(0.84, (isLight ? 0.34 : 0.44) + ignition * 0.34);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(${baseRgb},${coreAlpha.toFixed(3)})`;
      ctx.beginPath();
      for (let k = 0; k < E; k++) {
        const e = edges[k];
        if (e.type !== 'core') continue;
        ctx.moveTo(pxArr[e.i], pyArr[e.i]);
        ctx.lineTo(pxArr[e.j], pyArr[e.j]);
      }
      ctx.stroke();

      // Progressive Connecting Filaments + Gentle Traveling Sparks
      for (let i = 0; i < pulses.length; i++) {
        const pl = pulses[i];
        const t = Math.max(0, Math.min(1, pl.t));
        const smoothT = t * 0.38 + t * t * (3 - 2 * t) * 0.62;
        const tailT = Math.max(0, smoothT - 0.46);

        let env = 1;
        if (pl.hop === 0 && t < 0.24) env = t / 0.24;
        if (pl.hopsLeft === 0 && t > 0.72) env = Math.min(env, (1 - t) / 0.28);
        env = env * env * (3 - 2 * env);

        const x0 = pxArr[pl.from];
        const y0 = pyArr[pl.from];
        const dx = pxArr[pl.to] - x0;
        const dy = pyArr[pl.to] - y0;

        const tx = x0 + dx * tailT;
        const ty = y0 + dy * tailT;
        const sx = x0 + dx * smoothT;
        const sy = y0 + dy * smoothT;
        const sD = depthArr[pl.from] + (depthArr[pl.to] - depthArr[pl.from]) * smoothT;

        // Smooth connecting filament trail along synapse
        const trailAlpha = (isLight ? 0.34 : 0.46) * env;
        ctx.lineWidth = 1.35 * sD;
        ctx.strokeStyle = isLight
          ? `rgba(75,85,102,${trailAlpha.toFixed(3)})`
          : `rgba(243,241,234,${trailAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Soft spark halo + core
        const sr = Math.max(1.35, 2.05 * sD);
        ctx.fillStyle = isLight
          ? `rgba(90,100,118,${(0.2 * env).toFixed(3)})`
          : `rgba(243,241,234,${(0.22 * env).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isLight
          ? `rgba(24,27,34,${(0.78 * env).toFixed(3)})`
          : `rgba(246,244,238,${(0.9 * env).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // In-place insertion sort on orderArr (frame-to-frame order is 99% sorted -> O(N) zero-GC)
      for (let i = 1; i < N; i++) {
        const cur = orderArr[i];
        const curZ = zArr[cur];
        let j = i - 1;
        while (j >= 0 && zArr[orderArr[j]] < curZ) {
          orderArr[j + 1] = orderArr[j];
          j--;
        }
        orderArr[j + 1] = cur;
      }

      // Draw neuron nodes back-to-front
      for (let k = 0; k < N; k++) {
        const idx = orderArr[k];
        const n = nodes[idx];
        const px = pxArr[idx];
        const py = pyArr[idx];
        const d = depthArr[idx];
        const isCore = n.kind === 'core';
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.65 + n.phase);
        const hAmt = hoverArr[idx];
        const xAmt = exciteArr[idx];
        const energy = Math.max(
          xAmt,
          isCore ? 0.32 + ignition * 0.62 : ignition * 0.2 + hAmt * 0.42
        );

        const baseR = isCore ? 2.7 : n.kind === 'base' ? 1.8 : 2.1;
        const r = Math.max(
          1.2,
          (baseR + xAmt * 1.15 + hAmt * 0.65 + (isCore ? pulse * 0.36 : 0)) * d
        );
        const alpha = Math.max(
          0.16,
          Math.min(0.95, (d - 0.68) * 1.1 + (isCore ? 0.34 : 0) + xAmt * 0.38 + hAmt * 0.16)
        );

        if (energy > 0.28 || hAmt > 0.18 || isCore) {
          const haloAlpha = (isCore ? 0.15 : 0.09 + hAmt * 0.07 + xAmt * 0.08) * alpha;
          ctx.fillStyle = isLight
            ? `rgba(148,163,184,${haloAlpha.toFixed(3)})`
            : `rgba(244,243,238,${haloAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, r * 2.25, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isLight) {
          // Shift hovered nodes from dark charcoal toward a lighter slate-silver
          const shade = Math.round(14 + hAmt * 112);
          const gShade = Math.round(15 + hAmt * 120);
          const bShade = Math.round(20 + hAmt * 134);
          ctx.fillStyle = `rgba(${shade},${gShade},${bShade},${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle =
            isCore || hAmt > 0.15
              ? `rgba(246,244,238,${alpha.toFixed(3)})`
              : `rgba(255,255,255,${alpha.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ambient orbital micro-neurons (single batched fill)
      ctx.fillStyle = isLight ? 'rgba(18,20,26,0.26)' : 'rgba(255,255,255,0.34)';
      ctx.beginPath();
      for (let i = 0; i < ambient.length; i++) {
        const pt = ambient[i];
        const ang = elapsed * pt.speed + pt.phase;
        const ax = pt.x * Math.cos(ang) - pt.z * Math.sin(ang);
        const az = pt.x * Math.sin(ang) + pt.z * Math.cos(ang);
        const x1 = ax * cosY + az * sinY;
        const z1 = -ax * sinY + az * cosY;
        const y2 = pt.y * cosX - z1 * sinX;
        const z2 = pt.y * sinX + z1 * cosX;
        const sc = fov / (fov + z2);
        const ar = Math.max(0.9, 1.4 * sc);
        const apx = cx + x1 * radius * sc;
        const apy = cy + y2 * radius * sc;
        ctx.moveTo(apx + ar, apy);
        ctx.arc(apx, apy, ar, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', syncRect);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="neural-bulb-canvas"
        role="img"
        aria-label="Interactive 3D lightbulb formed by firing neuron connections. Drag to rotate or click to spark."
      />
      <span className="neural-bulb-hint" aria-hidden="true">
        Drag to rotate · Click to spark
      </span>
    </>
  );
}
