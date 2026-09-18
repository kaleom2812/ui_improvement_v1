"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Buildings, ShieldCheck, Check } from "@phosphor-icons/react";
import { enterprise } from "@/data/site";
import { Reveal, SectionHeading } from "@/components/primitives";

export default function Enterprise() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <section className="border-b border-line bg-subtle text-ink">
        <div className="site-container py-16 sm:py-20">
          <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-3">
            <Buildings size={14} weight="bold" /> Enterprise
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{enterprise.headline}</h1>
          <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-ink-2">{enterprise.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="btn-primary">
              Talk to sales <ArrowRight size={15} weight="bold" />
            </a>
            <Link href="/audit" className="btn-secondary">
              Run a free audit first
            </Link>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {enterprise.stats.map((s) => (
              <div key={s.label}>
                <p className="data-fig text-2xl font-bold">{s.value}</p>
                <p className="text-2xs text-ink-3">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-container py-16 sm:py-20">
        <SectionHeading eyebrow="Capabilities" title="Built for many brands and many stakeholders" />
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {enterprise.capabilities.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.04}>
              <div className="card h-full p-5">
                <h3 className="text-sm font-bold text-ink">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="contact" className="scroll-mt-20 border-t border-line bg-subtle/40">
        <div className="site-container grid gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Talk to sales</h2>
            <p className="mt-2 max-w-md text-sm text-ink-2">
              Tell us how many brands and domains you track. We&apos;ll set up a workspace and walk your team through a
              live audit.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-2">
              {["A named GEO analyst", "SSO / SAML and audit logs", "Custom competitor benchmarks", "Quarterly strategy reviews"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <ShieldCheck size={15} weight="bold" className="text-brand-dark" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
            {sent ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pos-soft text-pos">
                  <Check size={24} weight="bold" />
                </span>
                <p className="mt-4 text-sm font-semibold text-ink">Thanks — we&apos;ll be in touch.</p>
                <p className="mt-1 text-2xs text-ink-3">Prototype — nothing was actually sent.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-4"
              >
                {[
                  ["name", "Full name", "text"],
                  ["email", "Work email", "email"],
                  ["company", "Company", "text"],
                ].map(([id, label, type]) => (
                  <div key={id}>
                    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
                      {label}
                    </label>
                    <input id={id} type={type} required className="field" />
                  </div>
                ))}
                <div>
                  <label htmlFor="brands" className="mb-1.5 block text-sm font-medium text-ink">
                    Brands / domains to track
                  </label>
                  <select id="brands" className="field">
                    <option>1–5</option>
                    <option>6–15</option>
                    <option>16–40</option>
                    <option>40+</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary w-full">
                  Request a demo <ArrowRight size={15} weight="bold" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
