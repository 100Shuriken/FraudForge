import { train } from "@/lib/benchmark-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  return Response.json(train(body.seed ?? null));
}
