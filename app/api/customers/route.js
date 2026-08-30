import { CUSTOMERS, ATTACK_FAMILIES, scoreCandidates } from "@/lib/lab-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    customers: CUSTOMERS.map((c) => ({ ...c, candidates: scoreCandidates(c) })),
    families: ATTACK_FAMILIES.map((f) => ({
      name: f.name, label: f.label, modality: f.modality, description: f.description,
    })),
  });
}
