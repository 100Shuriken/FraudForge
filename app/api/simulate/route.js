import { runAttack, runAllAttacks } from "@/lib/lab-engine";
import { legacyScore } from "@/lib/risk";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  if (body.mode === "all") {
    return Response.json(runAllAttacks(body.targetId, body.seed ?? null));
  }

  const run = runAttack({
    targetId: body.targetId,
    attackType: body.attackType ?? null,
    difficulty: body.difficulty ?? "medium",
    intensity: body.intensity ?? 0.7,
    seed: body.seed ?? null,
  });

  // Score every step with the legacy detector too, so the UI can show the gap
  // on a per-payment basis rather than only in aggregate.
  const records = run.records.map((r) => {
    const legacy = legacyScore(r.features);
    return { ...r, legacyFlagged: legacy.flagged, legacyReasons: legacy.reasons };
  });

  const legacyCaught = records.filter((r) => r.legacyFlagged).length;
  const valueTotal = records.reduce((a, r) => a + r.amount, 0);
  const valueStopped = records.filter((r) => r.flagged).reduce((a, r) => a + r.amount, 0);

  return Response.json({
    ...run,
    records,
    comparison: {
      legacyCaught,
      hardenedCaught: run.defence.flagged,
      total: records.length,
      legacyDetectionRate: Number((legacyCaught / records.length).toFixed(4)),
      valueTotal: Number(valueTotal.toFixed(2)),
      valueStopped: Number(valueStopped.toFixed(2)),
      valueThrough: Number((valueTotal - valueStopped).toFixed(2)),
    },
  });
}
