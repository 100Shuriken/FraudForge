import { benchmark } from "@/lib/benchmark-engine";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const seed = Number(new URL(request.url).searchParams.get("seed")) || 2026;
  return Response.json(benchmark(seed));
}
