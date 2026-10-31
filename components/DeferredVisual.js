'use client';

import { useEffect, useState } from 'react';

const LOADERS = {
  bulb: () => import('./NeuralBulb'),
  core: () => import('./KineticCore'),
};

export default function DeferredVisual({ kind }) {
  const [Component, setComponent] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let rafId;
    let idleId;
    let timerId;

    const load = () => {
      const loader = LOADERS[kind];
      if (!loader) return;
      loader().then((mod) => {
        if (cancelled) return;
        setComponent(() => mod.default);
        rafId = requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    };

    // Wait until initial UI paint & entrance animation have settled before loading heavy 3D canvas
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(load, { timeout: 260 });
    } else {
      timerId = window.setTimeout(load, 140);
    }

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) window.clearTimeout(timerId);
    };
  }, [kind]);

  const stageClass = kind === 'bulb' ? 'neural-bulb-stage' : 'about-kinetic-wrap';

  return (
    <div className={`${stageClass} deferred-stage${ready ? ' is-ready' : ''}`}>
      {Component ? <Component /> : null}
    </div>
  );
}
