"use client";

import { useState } from "react";
import { Copy, Check, DownloadSimple, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { DataTable, Badge, CodeBlock, EmptyState } from "@/components/primitives";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className="btn-secondary h-8 px-3 text-2xs uppercase tracking-[0.06em]"
    >
      {done ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
      {done ? "Copied" : label}
    </button>
  );
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function TechnicalSection({ vm }: { vm: ViewModel }) {
  const t = vm.technical;

  if (!t.has) {
    return (
      <>
        <DashHead title="Technical GEO" lede="Crawler access, llms.txt, schema and rendering." />
        <EmptyState title="No technical data">The backend returned no crawl result or llms.txt for this audit.</EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead
        title="Technical GEO"
        lede={t.readinessScore ? `GEO readiness ${t.readinessScore}/100. Crawler access, llms.txt and schema — with copy-paste fixes.` : "Crawler access, llms.txt and schema — with copy-paste fixes."}
      />

      <Panel title="AI crawler access">
        <DataTable
          columns={[
            { key: "bot", label: "Agent", mono: true },
            { key: "purpose", label: "Feeds" },
            {
              key: "status",
              label: "Status",
              align: "right",
              render: (r: (typeof t.crawlerTable)[number]) =>
                r.explicit ? (
                  <Badge tone={r.blocked ? "neg" : "pos"}>{r.blocked ? "Blocked" : "Allowed"}</Badge>
                ) : (
                  <Badge tone="neutral">Not specified</Badge>
                ),
            },
          ]}
          rows={t.crawlerTable}
        />
        {!t.crawlerTable.some((r) => r.explicit) && (
          <p className="mt-3 text-2xs text-ink-3">
            No AI-crawler rules were detected in robots.txt. Add explicit <code className="rounded bg-subtle px-1 py-0.5">Allow</code> lines
            for the agents above.
          </p>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">
              /llms.txt {t.hasLlmsTxt ? "" : <span className="text-neg">— not generated</span>}
            </p>
            {t.hasLlmsTxt && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadText(t.llmsTxt!, "llms.txt")}
                  className="btn-ghost h-8 px-3 text-2xs uppercase tracking-[0.06em]"
                >
                  <DownloadSimple size={13} weight="bold" /> Download
                </button>
                <CopyButton text={t.llmsTxt!} />
              </div>
            )}
          </div>
          {t.hasLlmsTxt ? (
            <CodeBlock label={`${vm.domain}/llms.txt`} code={t.llmsTxt!} />
          ) : (
            <EmptyState title="No llms.txt in this audit">
              Run the audit with the crawl step enabled and the backend will generate declarative facts for this file.
            </EmptyState>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Organization schema (JSON-LD)</p>
            <CopyButton text={t.recommendedSchema} label="Copy schema" />
          </div>
          <CodeBlock label="add to your homepage &lt;head&gt;" code={t.recommendedSchema} />
        </div>
      </div>

      {t.issues.length > 0 && (
        <Panel title="GEO readiness issues" className="mt-4">
          <ul className="space-y-2">
            {t.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                <WarningCircle size={14} weight="bold" className="mt-0.5 shrink-0 text-warn" />
                {issue}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {t.gaps.length > 0 && (
        <Panel title="Technical findings" className="mt-4">
          <ul className="divide-y divide-line">
            {t.gaps.map((g) => (
              <li key={g.gap_id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{g.issue}</p>
                  <Badge tone={/critical|high|p0|p1/i.test(g.severity) ? "neg" : "warn"}>{g.severity}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-2">{g.recommended_action}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {t.issues.length === 0 && t.gaps.length === 0 && (
        <Panel title="GEO readiness" className="mt-4">
          <p className="flex items-center gap-2 text-sm text-pos">
            <CheckCircle size={16} weight="fill" /> No technical GEO issues were flagged in this audit.
          </p>
        </Panel>
      )}
    </>
  );
}
