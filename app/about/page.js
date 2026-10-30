import Link from 'next/link';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'About',
  description:
    'E-Club PESU is an entrepreneurial community at PES University Electronic City Campus where students explore problems, experiment fearlessly, and build what comes next.',
};

const HERO_STEPS = [
  {
    step: 'Phase 1',
    title: 'Problem Discovery',
    desc: 'Observe frictions in campus life and identify unmet user demand.',
  },
  {
    step: 'Phase 2',
    title: 'Rapid Prototype',
    desc: 'Build testable artifacts through disciplined, iterative sprint cycles.',
  },
  {
    step: 'Phase 3',
    title: 'Community Synthesis & Launch',
    desc: 'Validate through peer critique, real-world feedback, and active adoption.',
  },
];

const PHILOSOPHIES = [
  {
    title: 'Think differently',
    lead: 'Question assumptions, explore unfamiliar problems, and approach challenges with curiosity.',
  },
  {
    title: 'Build fearlessly',
    lead: 'Experiment, test ideas, learn from failure, and keep improving.',
  },
  {
    title: 'Grow together',
    lead: 'Collaborate with people who challenge your thinking and help turn individual ambition into collective progress.',
  },
];

const JOURNEY_STEPS = [
  {
    num: '01',
    name: 'Discover',
    summary: 'Identify problems worth solving.',
    outputLabel: 'Output',
    outputVal: 'Problem statement & opportunity space',
  },
  {
    num: '02',
    name: 'Explore',
    summary: 'Research opportunities & challenge assumptions.',
    outputLabel: 'Output',
    outputVal: 'User insights & core hypothesis',
  },
  {
    num: '03',
    name: 'Experiment',
    summary: 'Test concepts, build prototypes, and learn.',
    outputLabel: 'Output',
    outputVal: 'Working prototype & feedback loop',
  },
  {
    num: '04',
    name: 'Launch',
    summary: 'Take ideas forward & create something tangible.',
    outputLabel: 'Output',
    outputVal: 'Live product & initial adoption',
  },
];

const TRACKS = [
  {
    title: 'Engineers & Builders',
    desc: 'Full-stack hackers, systems thinkers, and hardware tinkerers turning architecture blueprints and algorithms into functional, resilient realities.',
  },
  {
    title: 'Designers & Storytellers',
    desc: 'Product designers and visual creators giving ideas clarity, visceral aesthetic form, high usability, and strong brand presence.',
  },
  {
    title: 'Operators & Strategists',
    desc: 'Analytical minds orchestrating product roadmaps, go-to-market strategies, unit economics, and campus partnerships.',
  },
  {
    title: 'Domain Explorers',
    desc: 'Curious minds from biotech, economics, media, and mathematics bringing unique domain insights to spot uncharted venture opportunities.',
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* SECTION 1: HERO */}
      <section className="about-container about-hero" aria-labelledby="about-hero-title">
        <span className="about-eyebrow">
          The Entrepreneurship Club · PES University, EC Campus
        </span>
        <h1 id="about-hero-title" className="about-hero-title">
          Dream. Hustle. Build What’s Next.
        </h1>
        <p className="about-hero-lead">
          An entrepreneurial community at PES University where curious minds come together to
          explore ideas, experiment fearlessly, and turn ambition into action.
        </p>

        <div className="about-actions">
          <Link href="/join" className="about-btn-primary">
            Join the club <span className="about-btn-arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/events" className="about-btn-secondary">
            Explore events
          </Link>
        </div>

        {/* Calm 3-step sequence with hairline dividers */}
        <div className="about-hero-steps" aria-label="Core progression">
          {HERO_STEPS.map((s) => (
            <div key={s.title} className="about-hero-step">
              <span className="about-hero-step-label">{s.step}</span>
              <h2 className="about-hero-step-title">{s.title}</h2>
              <p className="about-hero-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: WHO WE ARE */}
      <section className="about-container about-section" aria-labelledby="who-we-are-heading">
        <div className="about-profile-grid">
          <aside>
            <span className="about-eyebrow">Club profile</span>
            <h2 id="who-we-are-heading" className="about-section-title">
              Not just ideas. Initiative.
            </h2>

            <dl className="about-facts-list">
              <div className="about-fact-item">
                <dt className="about-fact-dt">Campus base</dt>
                <dd className="about-fact-dd">PES University, EC Campus</dd>
              </div>
              <div className="about-fact-item">
                <dt className="about-fact-dt">Character</dt>
                <dd className="about-fact-dd">Student-led builder collective</dd>
              </div>
              <div className="about-fact-item">
                <dt className="about-fact-dt">Focus area</dt>
                <dd className="about-fact-dd">0-to-1 ideation & rapid execution</dd>
              </div>
              <div className="about-fact-item">
                <dt className="about-fact-dt">Motto</dt>
                <dd className="about-fact-dd">Dream. Hustle. Start.</dd>
              </div>
            </dl>
          </aside>

          <div>
            <blockquote className="about-statement">
              “E-Club PESU brings together students who want to explore entrepreneurship, understand
              real-world problems, and learn what it takes to build something of their own.”
            </blockquote>

            <div className="about-prose">
              <p>
                We believe entrepreneurship is neither an exclusive gift nor an academic theory. It
                is an active discipline forged by getting your hands dirty, questioning standard
                operating assumptions, and finding resonance between an urgent problem and an
                inventive solution.
              </p>
              <p>
                Our community provides a sandbox at PES University where students across
                engineering, design, and domain specialties exchange perspectives, debate product
                theses, form interdisciplinary teams, and make the critical leap from speculative
                brainstorms to practical execution.
              </p>
            </div>

            <div className="about-triad-grid">
              <div className="about-triad-item">
                <h4>Curiosity First</h4>
                <p>We start by asking why things are built the way they are—and how they should be.</p>
              </div>
              <div className="about-triad-item">
                <h4>Calculated Action</h4>
                <p>We prioritize building small working experiments over lingering in safe theories.</p>
              </div>
              <div className="about-triad-item">
                <h4>Collective Growth</h4>
                <p>Every failure and victory is debriefed openly to elevate the entire community.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: OUR PHILOSOPHY */}
      <section className="about-container about-section" aria-labelledby="philosophy-heading">
        <header className="about-section-header">
          <span className="about-eyebrow">Core mindset</span>
          <h2 id="philosophy-heading" className="about-section-title">
            Our Philosophy
          </h2>
          <p className="about-section-sub">
            Three guiding commitments that anchor our discussions, our collaborative culture, and
            how we approach every venture we touch.
          </p>
        </header>

        <div className="about-philosophy-grid">
          {PHILOSOPHIES.map((p) => (
            <div key={p.title} className="about-philosophy-col">
              <h3>{p.title}</h3>
              <p className="about-philosophy-lead">{p.lead}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: THE ENTREPRENEURIAL JOURNEY */}
      <section className="about-container about-section" aria-labelledby="journey-heading">
        <header className="about-section-header">
          <span className="about-eyebrow">The trajectory</span>
          <h2 id="journey-heading" className="about-section-title">
            The Entrepreneurial Journey
          </h2>
          <p className="about-section-sub">
            The progression from an unrefined spark to a resilient reality. A framework for
            iterating through ambiguity and turning speculative concepts into validated execution.
          </p>
        </header>

        <div className="about-journey-grid">
          {JOURNEY_STEPS.map((s) => (
            <div key={s.name} className="about-journey-col">
              <span className="about-journey-step-num">{s.num}</span>
              <h3 className="about-journey-title">{s.name}</h3>
              <p className="about-journey-summary">{s.summary}</p>
              <div className="about-journey-output">
                <span>{s.outputLabel}</span>
                <span className="about-journey-output-val">{s.outputVal}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: THE COMMUNITY */}
      <section className="about-container about-section" aria-labelledby="community-heading">
        <header className="about-section-header">
          <span className="about-eyebrow">Community</span>
          <h2 id="community-heading" className="about-section-title">
            Better ideas happen together.
          </h2>
          <p className="about-section-sub">
            Entrepreneurship is rarely a solo endeavor. Genuine breakthroughs happen when diverse
            disciplines converge around a shared obsession to solve meaningful problems.
          </p>
        </header>

        <div className="about-tracks-grid">
          {TRACKS.map((t) => (
            <div key={t.title} className="about-track-col">
              <h3>{t.title}</h3>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="about-manifesto">
          <div className="about-manifesto-header">
            <img
              src="/logo.jpg"
              alt="E-Club PESU official mark"
              width="36"
              height="36"
              className="about-manifesto-logo"
            />
            <div>
              <span className="about-manifesto-name">{SITE.name}</span>
              <span className="about-manifesto-campus">{SITE.campus}</span>
            </div>
          </div>
          <blockquote className="about-manifesto-quote">
            “{SITE.tagline}”
          </blockquote>
          <p className="about-manifesto-meta">
            Official campus charter · Open to all academic disciplines · Bengaluru, India
          </p>
        </div>
      </section>

      {/* SECTION 6: FINAL CALL TO ACTION */}
      <section className="about-container about-cta-section" aria-labelledby="cta-heading">
        <div className="about-cta-content">
          <span className="about-eyebrow">Get involved</span>
          <h2 id="cta-heading" className="about-cta-title">
            Your next idea starts somewhere.
          </h2>
          <p className="about-cta-lead">
            Bring your curiosity. Find your people. Start building.
          </p>
          <div className="about-actions">
            <Link href="/join" className="about-btn-primary">
              Apply to join E-Club <span className="about-btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="/events" className="about-btn-secondary">
              Browse upcoming events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
