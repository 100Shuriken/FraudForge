"use client";

import { useCallback, useEffect, useState } from "react";
import { FileArrowDown, Printer, ArrowsClockwise } from "@phosphor-icons/react";
import {
  Shell, Panel, Stat, Verdict, Spinner, ErrorNote, PageHead, Footnote,
  StatSkeleton, Hint, DEFS, pct, money,
} from "@/components/shell";
import { SpatialSequence, SequenceDetail } from "@/components/sequence";
import { rateTone, countTone, costTone } from "@/lib/tone";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
  const [attackType, setAttackType] = useState("auto");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(0);

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
        body: JSON.stringify({
          targetId,
          attackType: attackType === "auto" ? null : attackType,
        }),
      });
      if (!res.ok) throw new Error(`Report failed, HTTP ${res.status}`);
      setReport(await res.json());
      setSelected(0);
    } catch (e) {
      setReport(null);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [targetId, attackType]);

  useEffect(() => { if (meta && !report) generate(); }, [meta]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Word opens an HTML document served as .doc, so this needs no zip library. */
  const downloadDoc = () => {
    if (!report) return;
    const rows = report.payments.map((p) =>
      `<tr><td>${p.step}</td><td>$${p.amount.toLocaleString()}</td><td>${p.amountRatio}x</td><td>${p.velocity}</td><td>${p.riskScore.toFixed(2)}</td><td>${p.action}</td><td>${p.legacyFlagged ? "FLAG" : "MISS"}</td><td>${p.reasons.join(", ")}</td></tr>`
    ).join("");
    const phases = report.phases.map((ph) =>
      `<h2>${ph.title}</h2><p><b>${ph.headline}</b></p><p>${ph.detail}</p><p>${ph.facts.map((x) => `${x.label}: <b>${x.value}</b>`).join(" &nbsp;|&nbsp; ")}</p>`
    ).join("");
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${report.incidentId}</title>
<style>body{font-family:Calibri,sans-serif;font-size:11pt}h1{font-size:20pt}h2{font-size:14pt;margin-top:18pt}
table{border-collapse:collapse;width:100%;font-size:9pt}td,th{border:1px solid #ccc;padding:4pt;text-align:left}th{background:#f0f0f0}</style></head><body>
<h1>FraudForge incident report</h1>
<p><b>${report.incidentId}</b> &nbsp; generated ${report.generatedAt} &nbsp; seed ${report.seed}</p>
<p><i>All data in this report is synthetic. No real customer, payment or account is represented.</i></p>
<h2>Summary</h2>
<p>Target: <b>${report.target.name} (${report.target.id}), ${report.target.city}</b><br>
Attack: <b>${report.attack.label}</b>, exploiting ${report.attack.primaryWeakness}<br>
Payments sent: <b>${report.summary.total}</b> worth <b>$${report.summary.valueTotal.toLocaleString()}</b><br>
Hardened caught: <b>${report.summary.hardenedCaught}</b> &nbsp; Legacy caught: <b>${report.summary.legacyCaught}</b><br>
Value stopped: <b>$${report.summary.valueStopped.toLocaleString()}</b> &nbsp; Value through: <b>$${report.summary.valueThrough.toLocaleString()}</b></p>
<p><i>${report.attack.lure}</i></p>${phases}
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
  const active = report?.payments[selected];

  return (
    <Shell>
      <div className="space-y-8">
        <ErrorNote>{error}</ErrorNote>

        <div className="ff-no-print space-y-5">
          <PageHead kicker="Evidence" title="One incident, start to finish">
            Who was targeted, why that attack was chosen, what was sent, what each detector
            said, what got through, and what the model learned. Computed in a single pass so
            every section describes the same run.
          </PageHead>

          <div className="card grid gap-4 p-5 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label htmlFor="rep-target" className="label mb-1.5 block">Target</label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="rep-target" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meta?.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.id} · {c.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-5">
              <label htmlFor="rep-vector" className="label mb-1.5 block">Attack vector</label>
              <Select value={attackType} onValueChange={setAttackType}>
                <SelectTrigger id="rep-vector" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {meta?.families.map((f) => (
                    <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end lg:col-span-2">
              <button
                type="button"
                onClick={generate}
                disabled={busy || !meta}
                aria-busy={busy}
                className="btn btn-primary w-full"
              >
                {busy ? (
                  <><Spinner /> Building</>
                ) : (
                  <><ArrowsClockwise size={13} weight="bold" /> Generate</>
                )}
              </button>
            </div>
          </div>
        </div>

        {busy && !report ? <StatSkeleton /> : null}

        {report && s ? (
          <div className="space-y-6">
            {/* ── Masthead. This is a document, so it gets a document's head. ── */}
            <section className="card-lg overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-edge px-6 py-5">
                <div className="min-w-0">
                  <p className="overline">Incident report</p>
                  <h2 className="mt-1.5 font-mono text-h2 tracking-tight">
                    {report.incidentId}
                  </h2>
                  <p className="mt-1.5 text-body-sm text-fg-muted">
                    {report.target.name} ({report.target.id}) · {report.target.city} ·{" "}
                    <span className="text-ember">{report.attack.label}</span>
                  </p>
                </div>
                <div className="ff-no-print flex items-center gap-2">
                  <button type="button" onClick={downloadDoc} className="btn btn-sm">
                    <FileArrowDown size={13} weight="bold" /> Word
                  </button>
                  <button type="button" onClick={() => window.print()} className="btn btn-sm">
                    <Printer size={13} weight="bold" /> PDF
                  </button>
                </div>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <Stat emphasis label="Hardened caught"
                  value={`${s.hardenedCaught}/${s.total}`} note={pct(s.detectionRate)}
                  tone={countTone(s.hardenedCaught, s.total)} hint={DEFS.recall} />
                <Stat label="Legacy caught" value={`${s.legacyCaught}/${s.total}`}
                  note={pct(s.legacyDetectionRate)}
                  tone={countTone(s.legacyCaught, s.total)} />
                <Stat label="Payments sent" value={s.total} note={money(s.valueTotal)} />
                <Stat label="Value through" value={money(s.valueThrough)}
                  note={`legacy let ${money(s.valueThroughLegacy)} through`}
                  tone={costTone(s.valueThrough / Math.max(1, s.valueTotal),
                                 { warn: 0.001, bad: 0.34 })} />
              </div>

              <figure className="border-t border-edge bg-inset px-6 py-5">
                <figcaption className="overline mb-2">The lure</figcaption>
                <blockquote className="prose-measure border-l-2 border-ember/60 pl-4 text-body text-fg-muted italic">
                  {report.attack.lure}
                </blockquote>
              </figure>
            </section>

            <Panel
              title="Attack sequence"
              description="The shape of the attack, in the order it was sent."
            >
              <div className="space-y-4">
                <SpatialSequence
                  records={report.payments}
                  selected={selected}
                  onSelect={setSelected}
                />
                <SequenceDetail record={active} />
              </div>
            </Panel>

            {/* ── Phases as a numbered rail, so the narrative reads in order ── */}
            <section className="card-lg">
              <header className="border-b border-edge px-5 py-4">
                <h2 className="text-h3">How the incident unfolded</h2>
                <p className="mt-1.5 text-body-sm text-fg-subtle">
                  Six phases, all computed from the same run.
                </p>
              </header>
              <ol className="divide-y divide-edge">
                {report.phases.map((ph, i) => (
                  <li key={ph.id} className="flex gap-4 px-5 py-5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-azure/15 font-mono text-[12px] font-semibold text-azure">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div>
                        <p className="overline">{ph.title}</p>
                        <p className="mt-1 text-h3 text-fg">{ph.headline}</p>
                      </div>
                      <p className="prose-measure text-body text-fg-muted">{ph.detail}</p>
                      <dl className="flex flex-wrap gap-2 pt-1">
                        {ph.facts.map((x) => (
                          <div key={x.label} className="well px-3 py-2">
                            <dt className="caption">{x.label}</dt>
                            <dd className="mt-0.5 font-mono text-[12px] font-semibold tabular-nums">
                              {x.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Panel
              title="Payment ledger"
              description="Every payment, both verdicts, and the scorer's own reasons."
            >
              <div className="overflow-x-auto">
                <table className="zebra w-full min-w-[860px] text-left">
                  <thead>
                    <tr className="border-b border-edge">
                      {["#", "Time", "Amount", "vs base", "Risk", "Hardened", "Legacy", "Why"].map(
                        (h, i) => (
                          <th
                            key={h}
                            className={`col-head pb-2.5 ${i === 7 ? "" : "pr-4"} ${
                              i === 3 || i === 4 ? "text-right" : ""
                            }`}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.map((p, i) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelected(i)}
                        className={`cursor-pointer border-b border-edge/60 align-top transition-colors ${
                          i === selected ? "bg-azure/8" : "hover:bg-overlay/50"
                        }`}
                      >
                        <td className="caption py-2.5 pr-4 font-mono tabular-nums">{p.step}</td>
                        <td className="caption py-2.5 pr-4 font-mono tabular-nums">{clock(p.at)}</td>
                        <td className="py-2.5 pr-4 font-mono text-[13px] font-semibold tabular-nums">
                          ${p.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono text-[13px] text-fg-muted tabular-nums">
                          {p.amountRatio}x
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums">
                          {p.riskScore.toFixed(2)}
                        </td>
                        <td className="py-2.5 pr-4"><Verdict action={p.action} /></td>
                        <td className="py-2.5 pr-4">
                          <Verdict action={p.legacyFlagged ? "FLAG" : "MISS"} />
                        </td>
                        <td className="py-2.5 max-w-[24rem] text-body-sm text-fg-subtle">
                          {p.reasons.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {report.training ? (
              <Panel
                title="What the defender learned"
                description="Three rounds against one fixed held-out split."
              >
                <div className="overflow-x-auto">
                  <table className="zebra w-full min-w-[620px] text-left">
                    <thead>
                      <tr className="border-b border-edge">
                        <th className="col-head pr-4 pb-2.5">Pass</th>
                        {[["Recall", DEFS.recall], ["Precision", DEFS.precision],
                          ["AUC", DEFS.auc]].map(([h, d]) => (
                          <th key={h} className="col-head pr-4 pb-2.5 text-right">
                            <span className="inline-flex items-center gap-1">
                              {h} <Hint>{d}</Hint>
                            </span>
                          </th>
                        ))}
                        <th className="col-head pb-2.5">What changed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.training.rounds.map((r) => (
                        <tr key={r.round} className="border-b border-edge/60 align-top">
                          <td className="py-2.5 pr-4 text-body-sm font-medium">{r.name}</td>
                          <td className={`py-2.5 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums ${
                            { caught: "text-caught", review: "text-review", evaded: "text-evaded" }[rateTone(r.recall)]
                          }`}>
                            {pct(r.recall)}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono text-[13px] text-fg-muted tabular-nums">
                            {pct(r.precision)}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono text-[13px] text-fg-muted tabular-nums">
                            {r.auc.toFixed(3)}
                          </td>
                          <td className="py-2.5 text-body-sm text-fg-subtle">{r.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-md border border-ember/35 bg-ember/6 p-4">
                  <p className="overline mb-1.5">Where the attacker goes next</p>
                  <p className="text-body-sm text-fg-muted">
                    {report.training.evasionAdvice}
                  </p>
                </div>
              </Panel>
            ) : null}

            <Footnote>
              Generator: {report.provenance.generator}. Scorers: {report.provenance.scorers}.
              Review threshold {report.thresholds.review}, block threshold{" "}
              {report.thresholds.block}. Seed {report.seed}. All data synthetic.
            </Footnote>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
