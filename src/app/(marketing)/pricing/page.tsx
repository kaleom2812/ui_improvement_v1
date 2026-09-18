import Link from "next/link";
import { Check, ArrowRight, Minus } from "@phosphor-icons/react/dist/ssr";
import { pricing } from "@/data/site";
import { Reveal, SectionHeading, Badge, Disclose } from "@/components/primitives";
import { PricingCta } from "@/components/PricingCta";
import { money } from "@/lib/format";

export const metadata = { title: "Pricing — GEO Tool" };

const COMPARE: [string, (boolean | string)[]][] = [
  ["GEO score out of 100", [true, true, true]],
  ["All dimension scores", [true, true, true]],
  ["Top strengths & weaknesses", [true, true, true]],
  ["#1 opportunity with evidence", [true, true, true]],
  ["Example AI answers", ["2", "all", "all"]],
  ["Competitor snapshot", [true, true, true]],
  ["Full competitor intelligence & SoV", [false, true, true]],
  ["Page-level findings & content priorities", [false, true, true]],
  ["Technical GEO + copy-paste files", [false, true, true]],
  ["Prioritised action plan & roadmap", [false, true, true]],
  ["PDF export & shareable link", [false, true, true]],
  ["Weekly re-audits & trend lines", [false, false, true]],
  ["Competitor-overtake alerts", [false, false, true]],
  ["Domains", ["1", "1", "3"]],
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check size={15} weight="bold" className="mx-auto text-pos" />;
  if (v === false) return <Minus size={14} className="mx-auto text-ink-3" />;
  return <span className="data-fig text-sm text-ink">{v}</span>;
}

export default function Pricing() {
  return (
    <>
      <section className="site-container py-16 text-center sm:py-20">
        <p className="eyebrow">Pricing</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Start free. Pay once for the full plan.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[1.05rem] text-ink-2">
          Every plan starts with the same free audit. Upgrade only when you want the evidence and the roadmap.
        </p>
      </section>

      <section className="site-container pb-12">
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-3">
          {pricing.plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <div
                className={`flex h-full flex-col rounded-xl border p-6 ${
                  p.featured ? "border-brand bg-surface shadow-card ring-1 ring-brand/20" : "border-line bg-surface"
                }`}
              >
                {p.featured ? (
                  <Badge tone="brand" className="mb-3 self-start">
                    Most popular
                  </Badge>
                ) : (
                  <span className="mb-3 h-5" />
                )}
                <h2 className="text-base font-bold text-ink">{p.name}</h2>
                <p className="mt-2">
                  <span className="data-fig text-3xl font-bold text-ink">{money(p.price)}</span>
                  <span className="text-sm text-ink-3"> / {p.cadence}</span>
                </p>
                <p className="mt-2 text-sm text-ink-2">{p.blurb}</p>
                <PricingCta plan={p} className={`mt-5 w-full ${p.featured ? "btn-primary" : "btn-secondary"}`} showArrow />
                <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-ink-2">
                      <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-pos" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-2xs text-ink-3">{p.limits}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-2xs text-ink-3">{pricing.note}</p>
      </section>

      <section className="border-y border-line bg-subtle/40">
        <div className="site-container py-16 sm:py-20">
          <SectionHeading eyebrow="Compare" title="What's in each plan" />
          <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">Feature</th>
                  {pricing.plans.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-center text-2xs font-semibold uppercase tracking-[0.06em] text-ink-2">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARE.map(([label, vals]) => (
                  <tr key={label}>
                    <td className="px-4 py-2.5 text-ink-2">{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-4 py-2.5 text-center">
                        <Cell v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="site-container py-16 sm:py-20">
        <SectionHeading eyebrow="FAQ" title="Questions about pricing and the product" />
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {pricing.faq.map((f) => (
            <Disclose key={f.q} summary={f.q}>
              {f.a}
            </Disclose>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-line bg-surface p-6 text-center">
          <p className="text-sm font-semibold text-ink">Not sure yet?</p>
          <p className="mt-1 text-sm text-ink-2">Run the free audit — you&apos;ll see your score and top issues before deciding.</p>
          <Link href="/audit" className="btn-primary mx-auto mt-4">
            Run a free audit <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </section>
    </>
  );
}
