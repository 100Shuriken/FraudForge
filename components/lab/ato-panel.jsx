"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint, ArrowCounterClockwise, Play } from "@phosphor-icons/react";
import { Panel, Skeleton } from "@/components/shell";
import { BlurFade, BorderBeam } from "@/components/magic";
import { score } from "@/lib/lgbm";
import { createSession, buildProfile, deviations, topDeviations } from "@/lib/behaviour";

const PROMPT = "the quick brown fox jumps over the lazy dog";
const ENROL_TARGET = 3;
const MIN_KEYS = 18;

/**
 * Account takeover, driven by how you actually type.
 *
 * The model scores deviation from a personal profile, so the interaction has
 * to build one first: type the prompt a few times to enrol, then type it again
 * as the "session" being judged. Hand the keyboard to someone else for the
 * test round and the score moves, which is the entire point of behavioural
 * biometrics and the only honest way to demonstrate it.
 *
 * Only timings and counts are captured. The characters are never stored.
 */
export default function AtoPanel({ model }) {
  const [phase, setPhase] = useState("enrol"); // enrol | ready | done
  const [enrolled, setEnrolled] = useState([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const session = useRef(null);

  const reset = useCallback(() => {
    session.current = createSession();
    setText("");
  }, []);

  useEffect(() => { reset(); }, [reset]);

  // Pointer behaviour is part of the profile, so it is collected page-wide
  // rather than only over the textarea.
  useEffect(() => {
    const move = (e) => session.current?.onMouseMove(e);
    const click = () => session.current?.onClick();
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, []);

  const enough = session.current && session.current.keystrokes() >= MIN_KEYS;

  const submit = () => {
    if (!session.current || !enough) return;
    const metrics = session.current.metrics();

    if (phase === "enrol") {
      const next = [...enrolled, metrics];
      setEnrolled(next);
      if (next.length >= ENROL_TARGET) setPhase("ready");
      reset();
      return;
    }

    const profile = buildProfile(enrolled);
    const devs = deviations(profile, metrics);
    setResult({
      ...score(model, devs),
      top: topDeviations(devs, 5),
    });
    setPhase("done");
    reset();
  };

  const startOver = () => {
    setEnrolled([]);
    setResult(null);
    setPhase("enrol");
    reset();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel
        title={phase === "enrol" ? `Enrol · ${enrolled.length} of ${ENROL_TARGET}` : "Test session"}
        className="lg:col-span-7"
      >
        <div className="space-y-3">
          <p className="text-body-sm text-fg-subtle">
            {phase === "enrol" ? (
              <>Type the line below {ENROL_TARGET} times, naturally. This builds
              the profile the model compares against — nothing is scored yet.</>
            ) : (
              <>Now type it once more. To see the model work, hand your keyboard
              to someone else for this round.</>
            )}
          </p>

          <p className="rounded-lg border border-white/10 bg-inset px-4 py-3 font-mono text-[13px] text-fg-muted select-none">
            {PROMPT}
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => session.current?.onKeyDown(e)}
            onKeyUp={(e) => session.current?.onKeyUp(e)}
            rows={3}
            spellCheck={false}
            autoComplete="off"
            aria-label="Type the prompt"
            className="field w-full resize-none font-mono text-[13px]"
            placeholder="Type here…"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={submit} disabled={!enough} className="btn btn-primary">
              <Play size={13} weight="fill" />
              {phase === "enrol" ? "Record session" : "Score this session"}
            </button>
            {enrolled.length > 0 ? (
              <button type="button" onClick={startOver} className="btn btn-sm">
                <ArrowCounterClockwise size={12} weight="bold" /> Start over
              </button>
            ) : null}
            <span className="caption">
              {enough
                ? "enough keystrokes captured"
                : `${MIN_KEYS - (session.current?.keystrokes() ?? 0)} more keystrokes needed`}
            </span>
          </div>

          <p className="caption border-t border-white/10 pt-3">
            Only timings, counts and pointer distances are measured. The
            characters you type are never stored — the model does not use them.
          </p>
        </div>
      </Panel>

      <Panel title="Model verdict" className="lg:col-span-5">
        {result ? (
          <BlurFade key={result.probability}>
            <div
              className="relative overflow-hidden rounded-lg border p-5"
              style={{
                borderColor: result.prediction === "fraud"
                  ? "rgb(251 110 104 / 0.45)" : "rgb(53 214 164 / 0.45)",
                background: result.prediction === "fraud"
                  ? "rgb(251 110 104 / 0.07)" : "rgb(53 214 164 / 0.07)",
              }}
            >
              <BorderBeam
                colorFrom={result.prediction === "fraud" ? "#fb6e68" : "#35d6a4"}
                colorTo="var(--color-signal)"
              />
              <p className="overline">Takeover likelihood</p>
              <p className={`mt-1.5 font-mono text-[34px] leading-none font-semibold tracking-tight ${
                result.prediction === "fraud" ? "text-evaded" : "text-caught"}`}>
                {(result.probability * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-body-sm text-fg-muted">
                {result.prediction === "fraud"
                  ? "this does not look like the enrolled typist"
                  : "consistent with the enrolled typist"}
                {" · "}threshold {result.threshold}
              </p>

              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="overline mb-2">Largest deviations (z)</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.top.map((t) => (
                    <span
                      key={t.name}
                      className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                        Math.abs(t.value) > 2
                          ? "border-evaded/40 bg-evaded/10 text-evaded"
                          : "border-white/12 bg-white/[0.03] text-fg-subtle"}`}
                    >
                      {t.name.replace(/_/g, " ")} {t.value > 0 ? "+" : ""}
                      {t.value.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </BlurFade>
        ) : phase === "enrol" ? (
          <div className="space-y-3">
            <p className="text-body-sm text-fg-subtle">
              The profile needs {ENROL_TARGET - enrolled.length} more session
              {ENROL_TARGET - enrolled.length === 1 ? "" : "s"} before anything
              can be scored.
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: ENROL_TARGET }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < enrolled.length ? "bg-signal" : "bg-white/10"}`}
                />
              ))}
            </div>
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <p className="text-body-sm text-fg-subtle">
            Profile built from {enrolled.length} sessions. Type the prompt once
            more and score it.
          </p>
        )}
      </Panel>
    </div>
  );
}
