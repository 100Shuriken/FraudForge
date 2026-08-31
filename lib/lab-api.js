/**
 * Client for the AI Defense Lab service (the Python/FastAPI half of the system).
 *
 * The site is deployed on Vercel, which cannot run Python, so this service
 * lives separately on Render. Everything here is written on the assumption
 * that it may be unreachable — free-tier hosts sleep, and a demo must not die
 * because of it. Every call resolves to a shaped result rather than throwing,
 * and the page degrades to an explanatory state instead of an error.
 */

export const LAB_URL =
  process.env.NEXT_PUBLIC_LAB_URL || "http://localhost:8000";

const TIMEOUT_MS = 20000;

async function call(path, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${LAB_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `Service returned ${res.status}` };
    }
    return { ok: true, data: await res.json() };
  } catch (e) {
    // A cold Render instance can take ~30s to wake; say so rather than
    // reporting a generic network failure the reader cannot act on.
    const asleep = e?.name === "AbortError";
    return {
      ok: false,
      offline: true,
      error: asleep
        ? "The lab service did not respond in time. Free-tier instances sleep when idle and can take up to a minute to wake."
        : "The lab service is unreachable.",
    };
  }
}

export const labHealth = () => call("/api/health");
export const labAttacks = () => call("/api/attacks");
export const labStatistics = () => call("/api/dataset/statistics");

/** The one model that can be driven end-to-end from a browser. */
export const labPhishing = (text) =>
  call("/api/defense/phishing", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export const labModels = () => call("/api/defense/models");

export const labRunAttack = ({ targetId, attackType, difficulty, count }) =>
  call("/api/attacks/run", {
    method: "POST",
    body: JSON.stringify({
      target_id: targetId,
      attack_type: attackType,
      difficulty,
      number_of_transactions: count,
    }),
  });
