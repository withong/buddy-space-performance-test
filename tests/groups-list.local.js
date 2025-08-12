import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN = __ENV.TOKEN || '';
const SORT = __ENV.SORT || 'LATEST';
const INTEREST = __ENV.INTEREST || '';
const MODE = __ENV.MODE || 'on';
const REQ_TIMEOUT = __ENV.REQ_TIMEOUT || '120s';
const MAX_DUR = __ENV.MAX_DUR || '30m';

// 총 10000건 / 페이지당 100건 → 페이지 0~99
const TOTAL = 10000;
const PAGE_SIZE = 100;
const MAX_PAGE = Math.max(Math.floor((TOTAL - 1) / PAGE_SIZE), 0);

export const options = {
  scenarios: {
    main: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 10000,
      maxDuration: MAX_DUR,
      exec: 'hit',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

function pickPage() {
  return Math.floor(Math.random() * (MAX_PAGE + 1));
}

export function hit() {
  const page = pickPage();
  let url =
    MODE === 'on'
      ? `${BASE_URL}/api/groups/on?sort=${encodeURIComponent(SORT)}&page=${page}`
      : `${BASE_URL}/api/groups/off?sort=${encodeURIComponent(SORT)}&page=${page}`;

  if (INTEREST) url += `&interest=${encodeURIComponent(INTEREST)}`;

  const res = http.get(url, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    timeout: REQ_TIMEOUT,
  });

  check(res, { '200 OK': (r) => r.status === 200 });
  sleep(Math.random() * 0.3 + 0.1);
}
