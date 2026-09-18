import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react/dist/ssr";
import { solutions } from "@/data/site";
import { Reveal } from "@/components/primitives";

export const metadata = { title: "Solutions — GEO Tool" };

export default function Solutions() {
  return (
    <>
      <section className="site-container py-16 sm:py-20">
        <p className="eyebrow">Solutions</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          The same audit, framed for the way your team works.
        </h1>
        <p className="mt-4 max-w-xl text-[1.05rem] text-ink-2">
          GEO Tool is one product. How you use it — and what you present internally — changes by role.
        </p>
      </section>

      <div className="border-t border-line">
        {solutions.map((s, i) => (
          <section key={s.id} id={s.id} className={`scroll-mt-20 border-b border-line ${i % 2 ? "bg-subtle/40" : ""}`}>
            <div className="site-container grid gap-8 py-14 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <Reveal>
                <div>
                  <p className="eyebrow">{s.audience}</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">{s.headline}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-2">{s.body}</p>
                  <ul className="mt-4 space-y-2">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-ink-2">
                        <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-pos" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-card">
                  <p className="data-fig text-3xl font-bold text-brand-dark">{s.metric.value}</p>
                  <p className="mt-2 text-sm text-ink-2">{s.metric.label}</p>
                </div>
              </Reveal>
            </div>
          </section>
        ))}
      </div>

      <section className="site-container py-16 text-center sm:py-20">
        <h2 className="mx-auto max-w-lg text-2xl font-bold tracking-tight text-ink">
          Bigger team? See{" "}
          <Link href="/enterprise" className="link">
            Enterprise
          </Link>
          .
        </h2>
        <Link href="/audit" className="btn-primary mx-auto mt-6">
          Run a free audit <ArrowRight size={15} weight="bold" />
        </Link>
      </section>
    </>
  );
}
