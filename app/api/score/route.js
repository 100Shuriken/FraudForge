import { scoreTransaction, legacyScore } from "@/lib/risk";

export const dynamic = "force-dynamic";

/** Score one hand-built payment. Powers the manual sandbox. */
export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const features = {
    amount: Number(b.amount) || 0,
    amountBaseline: Number(b.amountBaseline) || 1000,
    velocity1h: Number(b.velocity1h) || 1,
    dailyBaseline: Number(b.dailyBaseline) || 1,
    isNewPayee: b.isNewPayee ? 1 : 0,
    isInternational: b.isInternational ? 1 : 0,
    isNewDevice: b.isNewDevice ? 1 : 0,
    hour: Number.isFinite(b.hour) ? b.hour : 12,
  };
  return Response.json({
    features,
    hardened: scoreTransaction(features),
    legacy: legacyScore(features),
  });
}
