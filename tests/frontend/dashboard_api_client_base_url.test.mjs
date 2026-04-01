import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const moduleUrl = pathToFileURL(
  path.resolve('assets/js/modules/dashboard/api/client.js'),
).href;

async function loadApiClientWithWindow(windowMock) {
  const previousWindow = globalThis.window;
  globalThis.window = windowMock;
  try {
    return await import(`${moduleUrl}?t=${Date.now()}-${Math.random()}`);
  } finally {
    if (typeof previousWindow === 'undefined') {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
}

test('API_BASE_URL defaults to backend on local Vite dev ports', async () => {
  const mod = await loadApiClientWithWindow({
    location: {
      search: '',
      port: '8081',
      protocol: 'http:',
      host: '127.0.0.1:8081',
      hostname: '127.0.0.1',
    },
  });

  assert.equal(mod.API_BASE_URL, 'http://127.0.0.1:8010');
});

test('API_BASE_URL keeps docker frontend->backend mapping on port 5000', async () => {
  const mod = await loadApiClientWithWindow({
    location: {
      search: '',
      port: '5000',
      protocol: 'http:',
      host: '10.0.0.15:5000',
      hostname: '10.0.0.15',
    },
  });

  assert.equal(mod.API_BASE_URL, 'http://10.0.0.15:5010');
});

test('API_BASE_URL honors explicit query apiBase override', async () => {
  const mod = await loadApiClientWithWindow({
    location: {
      search: '?apiBase=http://example.local:9999/',
      port: '8081',
      protocol: 'http:',
      host: '127.0.0.1:8081',
      hostname: '127.0.0.1',
    },
  });

  assert.equal(mod.API_BASE_URL, 'http://example.local:9999');
});

test('API_BASE_URL falls back to same-origin host when no override matches', async () => {
  const mod = await loadApiClientWithWindow({
    location: {
      search: '',
      port: '443',
      protocol: 'https:',
      host: 'vigil.example.com',
      hostname: 'vigil.example.com',
    },
  });

  assert.equal(mod.API_BASE_URL, 'https://vigil.example.com');
});
