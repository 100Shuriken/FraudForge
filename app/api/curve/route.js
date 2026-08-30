import { makeRng } from "@/lib/rng";
import { scoreTransaction } from "@/lib/risk";
import { CUSTOMERS, ATTACK_FAMILIES, generateAndScore } from "@/lib/lab-engine";

export const dynamic = "force-dynamic";

/**
 * Score a labelled corpus once and hand back the raw (score, label) pairs.
 *
 * The client can then sweep the decision threshold instantly without another
 * round trip, which is what makes the policy tuner feel live rather than
 * laggy. The threshold is a policy choice, not a model property, so exposing
 * the whole curve is more honest than shipping one preset cutoff.
 */
export async function GET(request) {
  const seed = Number(new URL(request.url).searchParams.get("seed")) || 2026;
  const rng = makeRng(`curve:${seed}`);

  const points = [];

  for (const family of ATTACK_FAMILIES) {
    for (let i = 0; i < 3; i += 1) {
      const c = rng.choice(CUSTOMERS);
      const recs = generateAndScore(c, family.name, rng, rng.choice(["easy", "medium", "hard"]), rng.uniform(0.4, 0.9));
      for (const r of recs) points.push({ s: r.riskScore, y: 1, amount: r.amount });
    }
  }

  for (const c of CUSTOMERS) {
    for (let i = 0; i < 30; i += 1) {
      const spread = 0.45 * (1.2 - c.regularity);
      const amount = Math.max(20, Number((c.baseline * rng.gauss(1, Math.max(0.08, spread))).toFixed(2)));
      const f = {
        amount,
        amountBaseline: c.baseline,
        velocity1h: Math.max(1, Math.round(rng.gauss(Math.max(1, c.daily / 8), 0.6))),
        dailyBaseline: c.daily,
        isNewPayee: rng.random() < 0.08 ? 1 : 0,
        isInternational: rng.random() < 0.03 ? 1 : 0,
        isNewDevice: rng.random() < 0.05 ? 1 : 0,
        hour: rng.choice([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
      };
      points.push({ s: scoreTransaction(f).score, y: 0, amount });
    }
  }

  return Response.json({
    seed,
    fraud: points.filter((p) => p.y === 1).length,
    legit: points.filter((p) => p.y === 0).length,
    points,
  });
}
