import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

import http from 'k6/http';
import { check, sleep } from 'k6';

// ── 환경 변수 및 기본값 ───────────────────────────────────────────────
const PHASE       = (__ENV.PHASE || 'cold').toLowerCase(); // 'cold' | 'warm'
const BASE_URL    = __ENV.BASE_URL    || 'http://localhost:8080';
const TOKEN       = __ENV.TOKEN       || '';
const SORT        = __ENV.SORT        || 'LATEST';
const INTEREST    = __ENV.INTEREST    || '';
const REQ_TIMEOUT = __ENV.REQ_TIMEOUT || '120s';
const MAX_DUR     = __ENV.MAX_DUR     || '30m';

const VUS   = parseInt(__ENV.VUS   || '50', 10);
const ITERS = parseInt(__ENV.ITERS || '10000', 10);

// 총 10000건 / 페이지당 100건 → 0~99
const TOTAL = 10000;
const PAGE_SIZE = 100;
const MAX_PAGE = Math.max(Math.floor((TOTAL - 1) / PAGE_SIZE), 0);

// ── 시나리오/임계치: 단일 phase만 켬 ────────────────────────────────────
export const options = {
  scenarios: {
    [PHASE]: {
      executor: 'shared-iterations',
      vus: VUS,
      iterations: ITERS,
      maxDuration: MAX_DUR,
      exec: 'hitOn',
      tags: { phase: PHASE },
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    ...(PHASE === 'cold'
      ? { 'http_req_duration': ['p(95)<1500'] }  // cold는 여유
      : { 'http_req_duration': ['p(95)<800'] }   // warm는 더 엄격
    ),
  },
};

// ── 유틸 ──────────────────────────────────────────────────────────────
function pickPage() {
  return Math.floor(Math.random() * (MAX_PAGE + 1));
}
function buildOnlineUrl(page) {
  let url = `${BASE_URL}/api/groups/on?sort=${encodeURIComponent(SORT)}&page=${page}`;
  if (INTEREST) url += `&interest=${encodeURIComponent(INTEREST)}`;
  return url;
}
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ── VU 함수 ───────────────────────────────────────────────────────────
export function hitOn() {
  const page = pickPage();
  const res = http.get(buildOnlineUrl(page), {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    timeout: REQ_TIMEOUT,
  });
  check(res, { '200 OK': (r) => r.status === 200 });
  sleep(Math.random() * 0.3 + 0.1);
}

// ── 리포트 출력 ───────────────────────────────────────────────────────
export function handleSummary(data) {
  const s = stamp();
  const phase = PHASE;
  const prefix = `reports/groups-on.${phase}.${s}`;

  return {
    // 콘솔에 보기 좋은 텍스트 요약
    stdout: textSummary(data, { indent: ' ', enableColors: true }),

    // 예쁜 HTML 리포트 (benc-uk/k6-reporter)
    [`${prefix}.html`]: htmlReport(data),

    // k6 요약 JSON (원본 전체)
    [`${prefix}.summary.json`]: JSON.stringify(data, null, 2),
  };
}
