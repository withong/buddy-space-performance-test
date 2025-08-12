import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN = __ENV.TOKEN || '';

const userIds = new SharedArray('userIds', () =>
  JSON.parse(open('../data/users.json'))
);

export const options = {
  scenarios: {
    main: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 10000, // 1만 요청
      maxDuration: '30m',
      exec: 'hit',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<600'],
  },
};

export function hit() {
  const id = userIds[Math.floor(Math.random() * userIds.length)];

  const res = http.get(`${BASE_URL}/support/users/${id}`, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });

  check(res, { '200 OK': (r) => r.status === 200 });

  sleep(Math.random() * 0.5 + 0.2);
}
