import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { resources, pricing } from "@/data/site";
import { sampleMethodologyIntro, sampleMethodologyItems } from "@/data/sample-report";
import { Reveal, SectionHeading, Disclose, Badge } from "@/components/primitives";

export const metadata = { title: "Resources — GEO Tool" };

export default function Resources() {
  return (
    <>
      <section className="site-container py-16 sm:py-20">
        <p className="eyebrow">Resources</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Everything we know about GEO, written down.
        </h1>
      </section>

      <section id="guide" className="scroll-mt-20 border-y border-line bg-subtle/40">
        <div className="site-container py-14">
          <div className="flex items-center gap-2">
            <BookOpen size={18} weight="bold" className="text-brand-dark" />
            <h2 className="text-xl font-bold text-ink">{resources.guide.title}</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{resources.guide.summary}</p>
          <ol className="mt-6 grid gap-2 sm:grid-cols-2">
            {resources.guide.chapters.map((c) => (
              <li key={c.n} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <span className="data-fig text-xs text-ink-3">{c.n}</span>
                <span className="flex-1 text-sm text-ink">{c.title}</span>
                <span className="text-2xs text-ink-3">{c.read}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="blog" className="scroll-mt-20 site-container py-14">
        <SectionHeading eyebrow="Blog" title="Field notes on AI search" />
        <div className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
          {resources.posts.map((p) => (
            <article key={p.title} className="flex items-start gap-4 px-5 py-4 hover:bg-subtle/50">
              <Badge tone="neutral" className="mt-0.5 shrink-0">
                {p.tag}
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{p.title}</p>
                <p className="mt-0.5 text-2xs text-ink-3">
                  {p.date} · {p.read} read
                </p>
              </div>
              <ArrowUpRight size={15} className="mt-1 text-ink-3" />
            </article>
          ))}
        </div>
      </section>

      <section id="cases" className="scroll-mt-20 border-y border-line bg-subtle/40">
        <div className="site-container py-14">
          <SectionHeading eyebrow="Case studies" title="Before and after" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {resources.cases.map((c) => (
              <Reveal key={c.company}>
                <div className="card h-full p-5">
                  <p className="text-sm font-bold text-ink">{c.company}</p>
                  <p className="text-2xs text-ink-3">{c.industry}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="data-fig text-lg text-ink-3">{c.before}</span>
                    <span className="text-ink-3">→</span>
                    <span className="data-fig text-2xl font-bold text-pos">{c.after}</span>
                    <span className="ml-auto text-2xs text-ink-3">{c.days} days</span>
                  </div>
                  <p className="mt-3 border-t border-line pt-3 text-sm italic text-ink-2">&ldquo;{c.quote}&rdquo;</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 site-container py-14">
        <SectionHeading eyebrow="FAQ" title="Common questions" />
        <div className="mx-auto mt-6 max-w-2xl space-y-3">
          {pricing.faq.map((f) => (
            <Disclose key={f.q} summary={f.q}>
              {f.a}
            </Disclose>
          ))}
        </div>
      </section>

      <section id="methodology" className="scroll-mt-20 border-t border-line bg-subtle/40">
        <div className="site-container py-14">
          <SectionHeading eyebrow="Documentation" title="How the audit works" lede={sampleMethodologyIntro} />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {sampleMethodologyItems.map((m) => (
              <li key={m.label} className="rounded-lg border border-line bg-surface p-4">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">{m.label}</p>
                <p className="mt-1 text-sm text-ink-2">{m.value}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Link href="/audit" className="btn-primary mx-auto">
              Run a free audit <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
