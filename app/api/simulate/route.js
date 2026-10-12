
import {
  runAttack,
  runAllAttacks,
  CUSTOMERS,
  ATTACK_FAMILIES,
} from "@/lib/lab-engine";
import { legacyScore } from "@/lib/risk";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must contain valid JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const targetId = body.targetId ?? "C0001";

  if (
    typeof targetId !== "string" ||
    !CUSTOMERS.some((customer) => customer.id === targetId)
  ) {
    return Response.json(
      { error: "Invalid targetId. Select a valid customer." },
      { status: 400 }
    );
  }

  if (
    body.mode != null &&
    !["all", "single"].includes(body.mode)
  ) {
    return Response.json(
      { error: 'Invalid mode. Use "single" or "all".' },
      { status: 400 }
    );
  }

  if (body.mode === "all") {
    if (body.seed != null && !Number.isSafeInteger(body.seed)) {
      return Response.json(
        { error: "Seed must be a safe integer." },
        { status: 400 }
      );
    }

    return Response.json(
      runAllAttacks(targetId, body.seed ?? null)
    );
  }

  const attackType = body.attackType ?? null;
  const difficulty = body.difficulty ?? "medium";
  const intensity = body.intensity ?? 0.7;

  if (
    attackType !== null &&
    (typeof attackType !== "string" ||
      !ATTACK_FAMILIES.some((family) => family.name === attackType))
  ) {
    return Response.json(
      { error: "Invalid attackType. Select a supported attack family." },
      { status: 400 }
    );
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return Response.json(
      { error: 'Invalid difficulty. Use "easy", "medium", or "hard".' },
      { status: 400 }
    );
  }

  if (
    typeof intensity !== "number" ||
    !Number.isFinite(intensity) ||
    intensity < 0 ||
    intensity > 1
  ) {
    return Response.json(
      { error: "Intensity must be a finite number between 0 and 1." },
      { status: 400 }
    );
  }

  if (body.seed != null && !Number.isSafeInteger(body.seed)) {
    return Response.json(
      { error: "Seed must be a safe integer." },
      { status: 400 }
    );
  }

  const run = runAttack({
    targetId,
    attackType,
    difficulty,
    intensity,
    seed: body.seed ?? null,
  });

  // Score every step with the legacy detector too.
  const records = run.records.map((record) => {
    const legacy = legacyScore(record.features);

    return {
      ...record,
      legacyFlagged: legacy.flagged,
      legacyReasons: legacy.reasons,
    };
  });

  const legacyCaught = records.filter(
    (record) => record.legacyFlagged
  ).length;

  const valueTotal = records.reduce(
    (total, record) => total + record.amount,
    0
  );

  const valueStopped = records
    .filter((record) => record.flagged)
    .reduce((total, record) => total + record.amount, 0);

  return Response.json({
    ...run,
    records,
    comparison: {
      legacyCaught,
      hardenedCaught: run.defence.flagged,
      total: records.length,
      legacyDetectionRate: records.length
        ? Number((legacyCaught / records.length).toFixed(4))
        : 0,
      valueTotal: Number(valueTotal.toFixed(2)),
      valueStopped: Number(valueStopped.toFixed(2)),
      valueThrough: Number((valueTotal - valueStopped).toFixed(2)),
    },
  });
}
