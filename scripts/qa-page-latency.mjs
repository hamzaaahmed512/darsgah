// Read-only authenticated page timing. Set QA_BASE_URL and QA_COOKIE to a
// staging user session; optionally QA_ROUTES as comma-separated relative URLs.
// Run against a consistent fixture before and after a deployment.
import { performance } from "node:perf_hooks";

const base = process.env.QA_BASE_URL;
const cookie = process.env.QA_COOKIE;
if (!base || !cookie) throw new Error("Set QA_BASE_URL and QA_COOKIE.");
const routes = (process.env.QA_ROUTES ||
  "/students,/attendance,/results?view=cards,/finance/dashboard,/finance/challans,/library")
  .split(",").map((route) => route.trim()).filter(Boolean);
const repetitions = Number(process.env.QA_SAMPLES || "5");
if (!Number.isInteger(repetitions) || repetitions < 2 || repetitions > 30) {
  throw new Error("QA_SAMPLES must be an integer from 2 to 30.");
}
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1].toFixed(0);
}

for (const route of routes) {
  const target = new URL(route, base);
  if (target.origin !== new URL(base).origin) throw new Error("Routes must stay on QA_BASE_URL.");
  const ttfb = [];
  const total = [];
  for (let i = 0; i <= repetitions; i += 1) {
    const start = performance.now();
    const response = await fetch(target, {
      redirect: "manual",
      headers: { Cookie: cookie, Accept: "text/html", "Cache-Control": "no-cache" }
    });
    const firstByte = performance.now();
    await response.arrayBuffer();
    const end = performance.now();
    if (!response.ok || response.headers.get("content-type")?.includes("text/html") !== true) {
      throw new Error(`${route}: HTTP ${response.status}; check session and route`);
    }
    // The first run warms application and DB caches; report it separately.
    if (i === 0) {
      console.log(`${route} cold_total_ms=${(end - start).toFixed(0)}`);
    } else {
      ttfb.push(firstByte - start);
      total.push(end - start);
    }
  }
  console.log(`${route} warm_n=${repetitions} ttfb_p50_ms=${percentile(ttfb, 0.5)} ttfb_p95_ms=${percentile(ttfb, 0.95)} total_p50_ms=${percentile(total, 0.5)} total_p95_ms=${percentile(total, 0.95)}`);
}
