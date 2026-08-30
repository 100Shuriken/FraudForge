import { buildReport } from "@/lib/incident-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  return Response.json(
    buildReport({
      targetId: body.targetId,
      attackType: body.attackType ?? null,
      seed: body.seed ?? null,
      includeTraining: body.includeTraining !== false,
    })
  );
}
