"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  MagnifyingGlass,
  Sparkle,
  ShieldCheck,
  Star,
  Gauge,
} from "@phosphor-icons/react";
import { MarketingShell } from "@/components/MarketingShell";
import { useAuditFlow } from "@/state/audit-flow";
import { socialProof, pricing } from "@/data/site";
import { sampleAiPresence, sampleBenchmark, sampleShareOfVoice } from "@/data/sample-report";
import { BarList, DonutChart } from "@/components/charts";
import { Reveal, SectionHeading, Badge, Disclose } from "@/components/primitives";
import { AmbientMetricCards } from "@/components/marketing/AmbientMetricCards";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { MockupFrame } from "@/components/marketing/MockupFrame";
import { RecommendedActionsPanel } from "@/components/marketing/RecommendedActionsPanel";
import { ImpactStack } from "@/components/marketing/ImpactStack";
import { AnalyticsSection } from "@/components/marketing/AnalyticsSection";
import { PricingCta } from "@/components/PricingCta";
import { money, pct } from "@/lib/format";

function HeroAuditInput() {
  const router = useRouter();
  const { setInput } = useAuditFlow();
  const [url, setUrl] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) setInput({ url: url.trim() });
    router.push("/audit");
  };
  return (
    <form onSubmit={submit} className="mx-auto mt-8 flex w-full max-w-lg flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <MagnifyingGlass size={16} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="text"
          aria-label="Your website URL"
          placeholder="yourcompany.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="field h-12 pl-11 text-base"
        />
      </div>
      <button type="submit" className="btn-primary h-12 shrink-0 px-6">
        Run free audit <ArrowRight size={16} weight="bold" />
      </button>
    </form>
  );
}

const UNDERSTAND_POINTS = [
  "GEO score out of 100, benchmarked against your category",
  "AI visibility, entity understanding and answerability, scored separately",
  "The exact prompts where a competitor is named instead of you",
];

export default function HomePage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-soft/50 to-canvas">
        <AmbientMetricCards />
        <div className="site-container relative z-10 py-20 text-center sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 py-1 text-2xs font-bold uppercase tracking-[0.08em] text-brand-ink">
            <Sparkle size={12} weight="fill" /> Free GEO audit · about a minute
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Understand how AI sees your brand —{" "}
            <em className="font-serif font-normal italic text-brand-ink">then improve it</em>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[1.05rem] leading-relaxed text-ink-2">
            Buyers ask ChatGPT, Claude and Perplexity what to buy. GEO Tool scores whether they hear your name,
            and gives you a dated plan for the prompts where they don&apos;t.
          </p>
          <HeroAuditInput />
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-2xs text-ink-3">
            <span>
              {socialProof.stat.value} {socialProof.stat.label}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} weight="bold" /> No account needed to see your score
            </span>
          </div>
        </div>
        <div className="site-container relative z-10 mt-14 pb-20 sm:mt-16 sm:pb-24">
          <DashboardPreview />
        </div>
      </section>

      {/* Logos */}
      <section className="border-b border-line">
        <div className="site-container flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-8">
          <p className="text-2xs uppercase tracking-[0.1em] text-ink-3">Teams tracking their AI visibility</p>
          {socialProof.logos.map((l) => (
            <span key={l} className="text-sm font-semibold text-ink-3">
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* Why it matters */}
      <section className="site-container py-16 sm:py-20">
        <SectionHeading
          eyebrow="Why this matters"
          title="AI answers are becoming the shortlist"
          lede="When a model names three options and yours isn't one of them, the buyer never reaches your site. There's no page 2 to climb to."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { value: "~2x", label: "year-over-year growth in category AI search" },
            { value: pct(sampleAiPresence), label: "of relevant answers mention the example brand — vs 78% for the leader" },
            { value: "9%", label: "example share of voice; competitors compound their lead as models cache authority" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.05}>
              <div className="card h-full p-5">
                <p className="data-fig text-3xl font-bold text-ink">{s.value}</p>
                <p className="mt-2 text-sm text-ink-2">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Live analytics showcase */}
      <AnalyticsSection />

      {/* Product story: 01 Understand -> 02 Improve -> 03 Measure */}
      <section className="border-y border-line bg-subtle/40">
        <div className="site-container space-y-20 py-16 sm:space-y-28 sm:py-20">
          {/* 01 — Understand */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="font-serif text-5xl italic text-brand/30">01</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                See exactly how AI represents you —{" "}
                <em className="font-serif italic text-brand-ink">and where it doesn&apos;t</em>
              </h2>
              <p className="mt-3 max-w-md text-[0.975rem] leading-relaxed text-ink-2">
                One score, broken into the dimensions that make it up — benchmarked against the brands models
                recommend instead of you.
              </p>
              <ul className="mt-5 space-y-2.5">
                {UNDERSTAND_POINTS.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-ink-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pos-soft text-pos">
                      <ArrowRight size={11} weight="bold" />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
              <Link href="/audit" className="btn-primary mt-7">
                Run your free audit <ArrowRight size={15} weight="bold" />
              </Link>
            </div>
            <Reveal>
              <MockupFrame label="AI visibility — by model">
                <div className="grid gap-6 sm:grid-cols-2">
                  <BarList items={sampleBenchmark} max={100} labelWidth="6.5rem" />
                  <DonutChart items={sampleShareOfVoice} centerLabel={{ value: "9%", label: "Example brand" }} />
                </div>
              </MockupFrame>
            </Reveal>
          </div>

          {/* 02 — Improve */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal className="lg:order-1">
              <RecommendedActionsPanel />
            </Reveal>
            <div className="lg:order-2">
              <span className="font-serif text-5xl italic text-brand/30">02</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                A ranked plan, <em className="font-serif italic text-brand-ink">not a wall of dashboards</em>
              </h2>
              <p className="mt-3 max-w-md text-[0.975rem] leading-relaxed text-ink-2">
                Every gap becomes a prioritised action — quick wins first, then the content and technical fixes
                mapped to the exact prompts where you&apos;re losing.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-ink-2">
                <li>Content and citation opportunities, ranked by effort</li>
                <li>Competitive gaps tied to named prompts, not vague advice</li>
                <li>A dated 90-day roadmap your team can actually run</li>
              </ul>
              <Link href="/product/geo-audit" className="btn-secondary mt-7">
                Explore the product <ArrowRight size={15} weight="bold" />
              </Link>
            </div>
          </div>

          {/* 03 — Measure */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="font-serif text-5xl italic text-brand/30">03</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Watch the score move, <em className="font-serif italic text-brand-ink">prompt by prompt</em>
              </h2>
              <p className="mt-3 max-w-md text-[0.975rem] leading-relaxed text-ink-2">
                Re-run the audit and see which fixes moved the needle — down to the specific AI answer that
                started citing you.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-ink-2">
                <li>Before / after GEO score for every re-run</li>
                <li>AI mention growth and visibility change, by model</li>
                <li>The exact citation that started recommending you</li>
              </ul>
            </div>
            <Reveal>
              <ImpactStack />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20">
        <div className="site-container">
          <SectionHeading eyebrow="Social proof" title="Teams use GEO Tool to make the case internally" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {socialProof.testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.05}>
                <figure className="card flex h-full flex-col p-5">
                  <div className="flex gap-0.5 text-brand">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} size={13} weight="fill" />
                    ))}
                  </div>
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-2">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-4 border-t border-line pt-3 text-2xs text-ink-3">
                    <span className="font-semibold text-ink">{t.name}</span> · {t.role}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-y border-line bg-subtle/40">
        <div className="site-container py-16 sm:py-20">
          <SectionHeading eyebrow="Pricing" title="Start free. Upgrade when you need the plan." align="center" className="mx-auto" />
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {pricing.plans.map((p) => (
              <div key={p.id} className={`rounded-2xl border p-5 ${p.featured ? "border-brand bg-surface shadow-card" : "border-line bg-surface"}`}>
                {p.featured && (
                  <Badge tone="brand" className="mb-2">
                    Most popular
                  </Badge>
                )}
                <p className="text-sm font-bold text-ink">{p.name}</p>
                <p className="mt-1">
                  <span className="data-fig text-2xl font-bold text-ink">{money(p.price)}</span>
                  <span className="text-2xs text-ink-3"> {p.cadence}</span>
                </p>
                <p className="mt-1 text-2xs text-ink-2">{p.blurb}</p>
                <PricingCta plan={p} className={`mt-4 w-full ${p.featured ? "btn-primary" : "btn-secondary"} h-9 text-sm`} />
              </div>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/pricing" className="link text-sm">
              See full pricing and comparison
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="site-container">
          <SectionHeading eyebrow="FAQ" title="Common questions" align="center" className="mx-auto" />
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {pricing.faq.slice(0, 5).map((f) => (
              <Disclose key={f.q} summary={f.q}>
                {f.a}
              </Disclose>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/resources#faq" className="link text-sm">
              More questions
            </Link>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line bg-gradient-to-b from-canvas to-brand-soft/50">
        <div className="site-container py-16 text-center sm:py-20">
          <Gauge size={28} weight="bold" className="mx-auto text-brand-ink" />
          <h2 className="mx-auto mt-4 max-w-xl text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Find out what AI says about <em className="font-serif italic text-brand-ink">your</em> brand
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-2">It&apos;s free, it takes a minute, and you&apos;ll leave with a plan.</p>
          <Link href="/audit" className="btn-primary mx-auto mt-6">
            Run your free GEO audit <ArrowRight size={15} weight="bold" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
