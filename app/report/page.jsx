"use client";

import { useCallback, useEffect, useState } from "react";
import { FileArrowDown, Printer, ArrowsClockwise } from "@phosphor-icons/react";
import { Shell, Panel, Stat, Verdict, Spinner, ErrorNote, pct, money } from "@/components/shell";

const clock = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
};

export default function Report() {
  const [meta, setMeta] = useState(null);
  const [targetId, setTargetId] = useState("C0001");
  const [attackType, setAttackType] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setMeta)
      .catch((e) => setError(e?.message || String(e)));
  }, []);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, attackType: attackType || null }),
      });
      if (!res.ok) throw new Error(`Report failed, HTTP ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setReport(null);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [targetId, attackType]);

  useEffect(() => {
    if (meta && !report) generate();
  }, [meta]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Word opens an HTML document served as .doc, which needs no zip library. */
  const downloadDoc = () => {
    if (!report) return;
    const rows = report.payments
      .map(
        (p) =>
          `<tr><td>${p.step}</td><td>$${p.amount.toLocaleString()}</td><td>${p.amountRatio}x</td><td>${p.velocity}</td><td>${p.riskScore.toFixed(2)}</td><td>${p.action}</td><td>${p.legacyFlagged ? "FLAG" : "MISS"}</td><td>${p.reasons.join(", ")}</td></tr>`
      )
      .join("");
    const phases = report.phases
      .map(
        (ph) =>
          `<h2>${ph.title}</h2><p><b>${ph.headline}</b></p><p>${ph.detail}</p><p>${ph.facts
            .map((f) => `${f.label}: <b>${f.value}</b>`)
            .join(" &nbsp;|&nbsp; ")}</p>`
      )
      .join("");
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${report.incidentId}</title>
<style>body{font-family:Calibri,sans-serif;font-size:11pt}h1{font-size:20pt}h2{font-size:14pt;margin-top:18pt}
table{border-collapse:collapse;width:100%;font-size:9pt}td,th{border:1px solid #ccc;padding:4pt;text-align:left}
th{background:#f0f0f0}</style></head><body>
<h1>FraudForge incident report</h1>
<p><b>${report.incidentId}</b> &nbsp; generated ${report.generatedAt} &nbsp; seed ${report.seed}</p>
<p><i>All data in this report is synthetic. No real customer, payment or account is represented.</i></p>
<h2>Summary</h2>
<p>Target: <b>${report.target.name} (${report.target.id}), ${report.target.city}</b><br>
Attack: <b>${report.attack.label}</b>, exploiting ${report.attack.primaryWeakness}<br>
Payments sent: <b>${report.summary.total}</b> worth <b>$${report.summary.valueTotal.toLocaleString()}</b><br>
Hardened scorer caught: <b>${report.summary.hardenedCaught}</b> &nbsp; Legacy rules caught: <b>${report.summary.legacyCaught}</b><br>
Value stopped: <b>$${report.summary.valueStopped.toLocaleString()}</b> &nbsp; Value through: <b>$${report.summary.valueThrough.toLocaleString()}</b></p>
<p><i>${report.attack.lure}</i></p>
${phases}
<h2>Payment ledger</h2>
<table><tr><th>#</th><th>Amount</th><th>vs base</th><th>Vel</th><th>Risk</th><th>Hardened</th><th>Legacy</th><th>Why</th></tr>${rows}</table>
</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.incidentId}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const s = report?.summary;

  return (
    <Shell>
      <div className="space-y-6">
        <ErrorNote>{error}</ErrorNote>

        <div className="ff-no-print space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
              One incident, start to finish
            </h1>
            <p className="mt-2 max-w-[76ch] text-sm leading-relaxed text-bone-dim">
              Who was targeted, why that attack was chosen, what was sent, what each detector
              said, what got through, and what the model learned. Computed in a single pass so
              every section describes the same run.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <label className="lg:col-span-5">
              <span className="mb-1.5 block text-xs font-medium text-bone-faint uppercase tracking-wide">Target</span>
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-bone">
                {meta?.customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.id} · {c.city}</option>)}
              </select>
            </label>
            <label className="lg:col-span-4">
              <span className="mb-1.5 block text-xs font-medium text-bone-faint uppercase tracking-wide">Attack</span>
              <select value={attackType} onChange={(e) => setAttackType(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-bone">
                <option value="">Auto</option>
                {meta?.families.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2 lg:col-span-3">
              <button type="button" onClick={generate} disabled={busy || !meta}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-signal-deep hover:text-bone disabled:opacity-50">
                {busy ? <><Spinner /> Building</> : <><ArrowsClockwise size={15} weight="bold" /> Generate</>}
              </button>
            </div>
          </div>
        </div>

        {report && s ? (
          <>
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="font-mono text-lg font-semibold">{report.incidentId}</h2>
                  <p className="mt-1 text-xs text-bone-dim">
                    {report.target.name} ({report.target.id}) · {report.target.city} ·{" "}
                    <span className="font-mono">{report.attack.label}</span>
                  </p>
                </div>
                <div className="ff-no-print flex items-center gap-2">
                  <button type="button" onClick={downloadDoc}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-ink px-3 py-2 text-xs font-semibold hover:border-bone-faint">
                    <FileArrowDown size={14} weight="bold" /> Word
                  </button>
                  <button type="button" onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-ink px-3 py-2 text-xs font-semibold hover:border-bone-faint">
                    <Printer size={14} weight="bold" /> PDF
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Payments sent" value={s.total} note={money(s.valueTotal)} />
                <Stat label="Hardened caught" value={`${s.hardenedCaught}/${s.total}`} note={pct(s.detectionRate)} tone="signal" />
                <Stat label="Legacy caught" value={`${s.legacyCaught}/${s.total}`} note={pct(s.legacyDetectionRate)} tone="fail" />
                <Stat label="Value through" value={money(s.valueThrough)} note={`legacy let ${money(s.valueThroughLegacy)} through`} tone="warn" />
              </div>

              <blockquote className="mt-5 rounded-lg border border-line bg-ink px-4 py-3 text-sm italic leading-relaxed text-bone-dim">
                {report.attack.lure}
              </blockquote>
            </Panel>

            <div className="space-y-3">
              {report.phases.map((ph, i) => (
                <section key={ph.id} className="rounded-2xl border border-line bg-ink-raised p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-signal/30 bg-signal/12 font-mono text-xs font-semibold text-signal">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div>
                        <h3 className="text-sm font-semibold">{ph.title}</h3>
                        <p className="mt-0.5 text-sm font-medium text-signal">{ph.headline}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-bone-dim">{ph.detail}</p>
                      <dl className="flex flex-wrap gap-2 pt-1">
                        {ph.facts.map((f) => (
                          <div key={f.label} className="rounded-lg border border-line bg-ink px-2.5 py-1.5">
                            <dt className="text-[10px] text-bone-faint">{f.label}</dt>
                            <dd className="font-mono text-xs font-semibold">{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <Panel title="Payment ledger" description="Every payment, both verdicts, and the scorer's own reasons.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-bone-faint">
                      <th className="pb-2 pr-4 font-medium">#</th>
                      <th className="pb-2 pr-4 font-medium">Time</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 text-right font-medium">vs base</th>
                      <th className="pb-2 pr-4 text-right font-medium">Risk</th>
                      <th className="pb-2 pr-4 font-medium">Hardened</th>
                      <th className="pb-2 pr-4 font-medium">Legacy</th>
                      <th className="pb-2 font-medium">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.map((p) => (
                      <tr key={p.id} className="border-b border-line/60 align-top">
                        <td className="py-2.5 pr-4 font-mono text-bone-faint">{p.step}</td>
                        <td className="py-2.5 pr-4 font-mono text-bone-faint">{clock(p.at)}</td>
                        <td className="py-2.5 pr-4 font-mono font-semibold">${p.amount.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-bone-dim">{p.amountRatio}x</td>
                        <td className="py-2.5 pr-4 text-right font-mono font-semibold">{p.riskScore.toFixed(2)}</td>
                        <td className="py-2.5 pr-4"><Verdict action={p.action} /></td>
                        <td className="py-2.5 pr-4"><Verdict action={p.legacyFlagged ? "FLAG" : "MISS"} /></td>
                        <td className="py-2.5 max-w-[26rem] text-xs leading-relaxed text-bone-dim">{p.reasons.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {report.training ? (
              <Panel title="What the defender learned" description="Three rounds against one fixed held-out split.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-bone-faint">
                        <th className="pb-2 pr-4 font-medium">Pass</th>
                        <th className="pb-2 pr-4 text-right font-medium">Recall</th>
                        <th className="pb-2 pr-4 text-right font-medium">Precision</th>
                        <th className="pb-2 pr-4 text-right font-medium">AUC</th>
                        <th className="pb-2 font-medium">What changed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.training.rounds.map((r) => (
                        <tr key={r.round} className="border-b border-line/60 align-top">
                          <td className="py-2.5 pr-4 font-medium">{r.name}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-signal">{pct(r.recall)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-bone-dim">{pct(r.precision)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-bone-dim">{r.auc.toFixed(3)}</td>
                          <td className="py-2.5 text-xs leading-relaxed text-bone-dim">{r.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 rounded-lg border border-line bg-ink px-4 py-3 text-xs leading-relaxed text-bone-dim">
                  {report.training.evasionAdvice}
                </p>
              </Panel>
            ) : null}

            <p className="text-xs leading-relaxed text-bone-faint">
              Generator: {report.provenance.generator}. Scorers: {report.provenance.scorers}.
              Review threshold {report.thresholds.review}, block threshold {report.thresholds.block}.
              Seed {report.seed}. All data synthetic.
            </p>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
