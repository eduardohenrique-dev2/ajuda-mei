// k6 smoke + load test — execute fora do Lovable.
//
//   bun add -g k6  (ou: brew install k6)
//   k6 run tests/load/k6-smoke.js                     # smoke
//   k6 run -e VUS=50 -e DURATION=2m tests/load/k6-smoke.js   # load
//
// Variáveis:
//   BASE_URL  — default https://ajuda-mei.lovable.app
//   VUS       — usuários virtuais (default 5)
//   DURATION  — duração (default 30s)

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errors = new Rate("errors");
const ttfb = new Trend("ttfb_ms");

const BASE = __ENV.BASE_URL || "https://ajuda-mei.lovable.app";
const VUS = Number(__ENV.VUS || 5);
const DURATION = __ENV.DURATION || "30s";

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ["rate<0.02"],          // <2% de erro
    http_req_duration: ["p(95)<1500"],       // p95 < 1.5s
    errors: ["rate<0.02"],
  },
};

export default function () {
  const endpoints = [
    `${BASE}/`,
    `${BASE}/login`,
    `${BASE}/api/public/health`,
    `${BASE}/api/public/metrics`,
  ];
  for (const url of endpoints) {
    const res = http.get(url, { tags: { name: url.replace(BASE, "") } });
    ttfb.add(res.timings.waiting);
    const ok = check(res, {
      "status 2xx": (r) => r.status >= 200 && r.status < 300,
    });
    errors.add(!ok);
  }
  sleep(1);
}
