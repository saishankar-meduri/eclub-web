'use client';

import { useEffect, useRef, useState } from 'react';

const PHRASES = [
  'become real ventures.',
  'scale into global impact.',
  'build tomorrow’s economy.',
];

const PARSED_PHRASES = PHRASES.map((phrase) => {
  const words = [];
  let idx = 0;
  for (const part of phrase.split(' ')) {
    const chars = Array.from(part);
    words.push({
      text: part,
      chars,
      start: idx,
    });
    idx += chars.length + 1;
  }
  const fullChars = Array.from(phrase);
  return { phrase, fullChars, length: fullChars.length, words };
});

export default function HeroTypewriter() {
  const headingRef = useRef(null);
  const [state, setState] = useState({
    phraseIdx: 0,
    count: PARSED_PHRASES[0].length,
    phase: 'hold', // 'hold' | 'deleting' | 'switching' | 'empty' | 'typing'
  });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = headingRef.current;
    if (!el) return;

    let isVisible = true;
    let rafId = 0;
    let nextAt = performance.now() + 3400;

    const cur = {
      phraseIdx: 0,
      count: PARSED_PHRASES[0].length,
      phase: 'hold',
    };

    const observer = new IntersectionObserver(([entry]) => {
      const wasVisible = isVisible;
      isVisible = entry.isIntersecting;
      if (!wasVisible && isVisible) {
        nextAt = performance.now() + 600;
      }
    });
    observer.observe(el);

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      if (!isVisible || now < nextAt) return;

      const activePhrase = PARSED_PHRASES[cur.phraseIdx];
      const currentLen = activePhrase.length;

      if (cur.phase === 'hold') {
        cur.phase = 'deleting';
        nextAt = now + 75;
      } else if (cur.phase === 'deleting') {
        if (cur.count > 0) {
          cur.count -= 1;
          // Calm, smooth ease-in / glide / ease-out backspace curve
          const progress = 1 - cur.count / Math.max(1, currentLen);
          const edgeEase = Math.pow(Math.abs(progress - 0.5) * 2, 3);
          nextAt = now + (cur.count === 0 ? 220 : 44 + edgeEase * 26);
        } else {
          cur.phase = 'switching';
          nextAt = now + 30;
        }
      } else if (cur.phase === 'switching') {
        cur.phraseIdx = (cur.phraseIdx + 1) % PARSED_PHRASES.length;
        cur.count = 0;
        cur.phase = 'empty';
        nextAt = now + 320;
      } else if (cur.phase === 'empty') {
        cur.phase = 'typing';
        nextAt = now + 45;
      } else if (cur.phase === 'typing') {
        const target = PARSED_PHRASES[cur.phraseIdx];
        if (cur.count < target.length) {
          const typedChar = target.fullChars[cur.count];
          cur.count += 1;
          const jitter = (cur.count * 17) % 18;
          const spacePause = typedChar === ' ' ? 52 : 0;
          nextAt = now + (cur.count === target.length ? 3400 : 68 + jitter + spacePause);
          if (cur.count === target.length) {
            cur.phase = 'hold';
          }
        } else {
          cur.phase = 'hold';
          nextAt = now + 3400;
        }
      }

      setState({
        phraseIdx: cur.phraseIdx,
        count: cur.count,
        phase: cur.phase,
      });
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const active = PARSED_PHRASES[state.phraseIdx];
  const isIdle = state.phase === 'hold' || state.phase === 'empty';
  const caret = <span className={`tw-caret${isIdle ? ' is-idle' : ''}`} />;

  return (
    <h1
      ref={headingRef}
      id="home-hero-title"
      className="modern-display-title ed-hero-display tw-heading"
      aria-label="Where bold ideas become real ventures, scale into global impact, and build tomorrow’s economy."
    >
      {PHRASES.map((p) => (
        <span key={p} className="tw-sizer" aria-hidden="true">
          Where bold ideas <span className="modern-title-dim">{p}</span>
        </span>
      ))}

      <span className="tw-live" aria-hidden="true">
        Where bold ideas{' '}
        <span className="modern-title-dim">
          {active.words.map((word, wIdx) => (
            <span key={`${state.phraseIdx}-${wIdx}`}>
              <span className="tw-word">
                {state.count === word.start ? caret : null}
                {word.chars.map((ch, cIdx) => {
                  const globalIdx = word.start + cIdx;
                  const isOn = globalIdx < state.count;
                  return (
                    <span key={cIdx} className={isOn ? 'tw-char is-on' : 'tw-char'}>
                      {ch}
                      {state.count === globalIdx + 1 ? caret : null}
                    </span>
                  );
                })}
              </span>
              {wIdx < active.words.length - 1 ? ' ' : null}
            </span>
          ))}
        </span>
      </span>
    </h1>
  );
}
