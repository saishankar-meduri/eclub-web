import Link from 'next/link';
import { eventImages, optimize } from '../lib/images';

// Auto-scrolling strip of every event image. Pure CSS animation, pauses on hover.
export default function EventMarquee({ events }) {
  const items = events.flatMap((e) =>
    eventImages(e).map((src) => ({ src, slug: e.slug, title: e.title }))
  );
  if (!items.length) return null;

  let base = items;
  while (base.length < 6) base = [...base, ...items];
  const loop = [...base, ...base]; // second copy makes the loop seamless

  return (
    <section className="marquee" aria-label="Event highlights">
      <div className="marquee-track" style={{ animationDuration: `${base.length * 6}s` }}>
        {loop.map((it, i) => {
          const dup = i >= base.length;
          return (
            <Link
              key={i}
              href={`/events/${it.slug}`}
              className="marquee-item"
              aria-hidden={dup || undefined}
              tabIndex={dup ? -1 : undefined}
            >
              <img src={optimize(it.src, 640)} alt={dup ? '' : it.title} loading="lazy" />
              <span>{it.title}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
