import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const FRONTEND_NGINX_CONFIG_PATH = path.resolve('config/nginx/frontend.conf');

test('frontend nginx proxies /api traffic to the backend instead of the SPA fallback', async () => {
  const source = await fs.readFile(FRONTEND_NGINX_CONFIG_PATH, 'utf8');

  assert.match(source, /location\s+\/api\/\s*\{/);
  assert.match(source, /proxy_pass\s+http:\/\/backend:5010;/);
  assert.match(source, /proxy_set_header\s+Upgrade\s+\$http_upgrade;/);
  assert.match(source, /proxy_set_header\s+Connection\s+\$connection_upgrade;/);
});
