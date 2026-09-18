import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { BarList, RadarChart, Meter } from "@/components/charts";
import { Reveal, SectionHeading, Badge } from "@/components/primitives";
import { toneOfScore, tone as toneMap } from "@/lib/format";
import { sampleDimensions, sampleBenchmark, samplePagePriorities, sampleTechnicalChecks } from "@/data/sample-report";

export const metadata = { title: "The GEO Audit — GEO Tool" };

const MEASURES: [string, string][] = [
  ["AI Visibility", "How often, how high and how positively models mention you across every major engine."],
  ["Brand Prominence", "Whether a mention is a real recommendation or a throwaway 'other options include…' line."],
  ["Recommendation Performance", "How you do on the queries where the decision is actually made — discovery and feature questions."],
  ["Competitive Position", "Your share of voice against the exact brands models name instead of you."],
  ["Authority & Trust", "Sentiment, verifiable trust claims, and the freshness of your entity data."],
  ["Technical GEO", "Crawler access, llms.txt, rendering, structured-data coverage and semantic HTML."],
  ["Entity Consistency", "Whether models get your founding year, HQ, pricing and integrations right — and agree with each other."],
];

export default function ProductGeoAudit() {
  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-brand-soft/40 to-canvas">
        <div className="site-container py-16 sm:py-20">
          <p className="eyebrow">The GEO Audit</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            One audit. Every dimension of AI visibility.
          </h1>
          <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-ink-2">
            GEO Tool crawls your site, probes the AI models with buyer questions, and returns a single GEO score —
            plus the evidence and the plan behind it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/audit" className="btn-primary">
              Run a free audit <ArrowRight size={15} weight="bold" />
            </Link>
            <Link href="/pricing" className="btn-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="site-container py-16 sm:py-20">
        <SectionHeading
          eyebrow="What we measure"
          title="The dimensions"
          lede="Each is scored 0–100 and calibrated against a benchmark set. Together they weight into your overall GEO score. The exact dimension set comes from the audit backend."
        />
        <div className="mt-8 grid gap-x-8 gap-y-6 md:grid-cols-2">
          {MEASURES.map(([label, body], i) => {
            const d = sampleDimensions[i];
            return (
              <Reveal key={label} delay={i * 0.03}>
                <div id={d.key} className="scroll-mt-24">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-ink">{label}</h3>
                    <span className={`data-fig text-sm font-semibold ${toneMap[toneOfScore(d.score)].text}`}>e.g. {d.score}</span>
                  </div>
                  <div className="mt-2">
                    <Meter value={d.score} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-y border-line bg-subtle/40">
        <div className="site-container grid gap-10 py-16 sm:py-20 lg:grid-cols-2">
          <Reveal>
            <div id="ai-visibility" className="scroll-mt-24">
              <h3 className="text-lg font-bold text-ink">Presence in every model, not an average</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                Each model retrieves and reasons differently. We show your presence per model — so you know whether the
                fix is a crawler rule, a content gap or an entity problem.
              </p>
              <div className="mt-4 card p-4">
                <BarList items={sampleBenchmark} max={100} labelWidth="6.5rem" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div id="competitive-position" className="scroll-mt-24">
              <h3 className="text-lg font-bold text-ink">Your radar across all dimensions</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                The shape tells the story at a glance. Compare observed AI performance with Technical GEO to see
                whether the next priority is machine access, content or entity clarity.
              </p>
              <div className="mt-4 card p-4">
                <RadarChart
                  axes={sampleDimensions.map((d) => d.label.split(" ")[0])}
                  series={[{ name: "Example brand", values: sampleDimensions.map((d) => d.score / 100) }]}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="page-findings" className="site-container scroll-mt-24 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="eyebrow">Page-level findings</p>
              <h3 className="mt-2 text-lg font-bold text-ink">See which pages need attention first</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                The report connects technical and content findings to the commercial pages where a focused fix can
                improve AI understanding and discoverability.
              </p>
              <div className="mt-4 card p-4">
                <BarList items={samplePagePriorities} max={20} labelWidth="9rem" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div id="technical-geo" className="scroll-mt-24">
              <p className="eyebrow">Technical GEO</p>
              <h3 className="mt-2 text-lg font-bold text-ink">The files that decide if models can read you</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                We check crawler access for every major AI agent, whether llms.txt exists, rendering dependency and
                structured-data coverage — then hand you the corrected files.
              </p>
              <ul className="mt-4 card space-y-2.5 p-4">
                {sampleTechnicalChecks.map((c) => (
                  <li key={c.check} className="grid grid-cols-[1fr_2.5rem_5rem] items-center gap-3">
                    <span className="text-sm text-ink-2">{c.check}</span>
                    <span className="data-fig text-right text-sm text-ink">{c.score}</span>
                    <Badge tone={c.status === "pass" ? "pos" : c.status === "warn" ? "warn" : "neg"}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="action-plan" className="scroll-mt-24 border-y border-line bg-subtle">
        <div className="site-container py-16 text-center sm:py-20">
          <CheckCircle size={26} weight="fill" className="mx-auto text-brand" />
          <h3 className="mx-auto mt-4 max-w-lg text-2xl font-bold tracking-tight text-ink">Every audit ends with a plan</h3>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-2">
            Recommendations ranked by impact and effort, with the roadmap grouped into phases.
          </p>
          <Link href="/audit" className="btn-primary mx-auto mt-6">
            Run your free audit <ArrowRight size={15} weight="bold" />
          </Link>
        </div>
      </section>
    </>
  );
}
