"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { Panel } from "@/components/shell";
import { BlurFade, BorderBeam } from "@/components/magic";
import { score } from "@/lib/lgbm";
import {
  buildTransaction,
  derivedFrom,
  ID_FIELDS,
  PRESETS,
  PRODUCT_AVG_BOUNDS,
  PRODUCT_LABELS,
} from "@/lib/transaction-features";

/** A labelled select backed by the model's own vocabulary for that column. */
function Choice({ label, name, model, value, onChange, hint }) {
  const options = model.cat?.[name] ?? [];
  return (
    <label className="block">
      <span className="caption block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="field w-full"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {PRODUCT_LABELS[o] ?? o}
          </option>
        ))}
      </select>
      {hint ? <span className="caption mt-1 block">{hint}</span> : null}
    </label>
  );
}

function Num({ label, name, value, onChange, min, max, step = 1, hint, suffix }) {
  return (
    <label className="block">
      <span className="caption block mb-1">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(name, e.target.value)}
          className="field w-full font-mono tabular-nums"
        />
        {suffix ? (
          <span className="caption pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <span className="caption mt-1 block">{hint}</span> : null}
    </label>
  );
}

/**
 * Transaction fraud, driven by a form.
 *
 * The backend's adapter refuses these payloads with a schema mismatch, and
 * that reads at first like the model is unusable without the original dataset.
 * It is not: the mismatch is only that the red team's business fields are not
 * IEEE-CIS columns. State the columns directly and the model runs, because the
 * artifact ships the exact vocabulary for all thirteen categorical ones.
 *
 * The panel is split into what the reader states and what is computed from it,
 * because that division is the honest part — four of the twenty-one features
 * are derived, and one is a training statistic the artifact does not carry.
 */
export default function TransactionPanel({ model }) {
  const [values, setValues] = useState(PRESETS.routine.values);
  const [preset, setPreset] = useState("routine");

  const set = (name, v) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setPreset(null);
  };

  const applyPreset = (key) => {
    setValues(PRESETS[key].values);
    setPreset(key);
  };

  const row = useMemo(() => buildTransaction(values), [values]);
  const result = useMemo(() => score(model, row), [model, row]);

  const fraud = result.prediction === "fraud";

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="The transaction" className="lg:col-span-7">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`btn btn-sm ${preset === key ? "btn-primary" : ""}`}
              >
                <ArrowsClockwise size={13} weight="bold" /> {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Num
              label="Amount"
              name="TransactionAmt"
              value={values.TransactionAmt}
              onChange={set}
              min={1}
              step={1}
            />
            <Choice
              label="Product category"
              name="ProductCD"
              model={model}
              value={values.ProductCD}
              onChange={set}
            />
            <Num
              label="Hour of day"
              name="hour"
              value={values.hour}
              onChange={set}
              min={0}
              max={23}
            />
            <Num
              label="Day index"
              name="day"
              value={values.day}
              onChange={set}
              min={1}
              max={181}
              hint="The dataset spans 181 days from an unstated start."
            />
            <Choice
              label="Device type"
              name="DeviceType"
              model={model}
              value={values.DeviceType}
              onChange={set}
            />
            <Choice
              label="Browser"
              name="id_31"
              model={model}
              value={values.id_31}
              onChange={set}
              hint="130 values the model was trained on."
            />
          </div>

          <Choice
            label="Device"
            name="DeviceInfo"
            model={model}
            value={values.DeviceInfo}
            onChange={set}
            hint="1,786 values. Anything outside this list encodes as unseen and routes right, exactly as pandas would send it."
          />

          <div>
            <p className="overline mb-2">Identity signals</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ID_FIELDS.map(([name, label]) => (
                <Choice
                  key={name}
                  label={label}
                  name={name}
                  model={model}
                  value={values[name]}
                  onChange={set}
                />
              ))}
            </div>
            <p className="caption border-t border-white/10 pt-3">
              The IEEE-CIS identity columns are anonymised in the source data — it
              never says what any of them measure. The model has an opinion about
              them regardless, so they are offered as the model knows them rather
              than dressed up with meanings they do not have.
            </p>
          </div>
        </div>
      </Panel>

      <div className="space-y-4 lg:col-span-5">
        <Panel title="Model verdict">
          <BlurFade key={result.probability}>
            <div
              className="relative overflow-hidden rounded-lg border p-5"
              style={{
                borderColor: fraud ? "rgb(251 110 104 / 0.45)" : "rgb(53 214 164 / 0.45)",
                background: fraud ? "rgb(251 110 104 / 0.07)" : "rgb(53 214 164 / 0.07)",
              }}
            >
              <BorderBeam
                colorFrom={fraud ? "#fb6e68" : "#35d6a4"}
                colorTo="var(--color-signal)"
              />
              <p className="overline">Fraud likelihood</p>
              <p
                className={`mt-1.5 font-mono text-[34px] leading-none font-semibold tracking-tight ${
                  fraud ? "text-evaded" : "text-caught"
                }`}
              >
                {(result.probability * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-body-sm text-fg-muted">
                {result.supplied} of {result.features} features supplied ·
                threshold {result.threshold} · 500 trees
              </p>
            </div>
          </BlurFade>
        </Panel>

        <Panel title="Derived from what you set">
          <dl className="space-y-2">
            {derivedFrom(row).map(([name, how, value]) => (
              <div key={name} className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <dt className="text-body-sm text-fg">{name}</dt>
                  <dd className="caption">{how}</dd>
                </div>
                <span className="shrink-0 font-mono text-[12px] text-fg-muted tabular-nums">
                  {typeof value === "number"
                    ? value >= 1000
                      ? value.toLocaleString()
                      : value.toFixed(3)
                    : "—"}
                </span>
              </div>
            ))}
          </dl>

          <div className="mt-4 border-t border-white/10 pt-3">
            <Num
              label="Category average amount"
              name="product_avg_amount"
              value={values.product_avg_amount}
              onChange={set}
              min={1}
              step={1}
            />
            <p className="caption mt-2">
              This one is a training statistic, not a property of the transaction
              — the mean amount for its product category. The artifact does not
              carry the five means, but it does reveal the four boundaries
              between them, recovered from the only four thresholds the 500 trees
              ever split this feature at:{" "}
              <span className="font-mono tabular-nums text-fg-muted">
                {PRODUCT_AVG_BOUNDS.map((b) => b.toFixed(2)).join(" · ")}
              </span>
              . So it is an input here rather than something invented.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
