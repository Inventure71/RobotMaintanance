import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FEATURES_ROOT = path.resolve(__dirname, '../../assets/js/modules/dashboard/features');

const FEATURE_RUNTIME_FILES = [
  ['monitor-config', 'createMonitorConfigFeatureRuntime.js'],
  ['fleet', 'createFleetFeatureRuntime.js'],
  ['fix-tests', 'createFixTestsFeatureRuntime.js'],
  ['detail', 'createDetailFeatureRuntime.js'],
  ['recorder', 'createRecorderFeatureRuntime.js'],
  ['data-init', 'createDataInitFeatureRuntime.js'],
];

function normalizeIdentifier(token) {
  return token
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .trim()
    .replace(/\s*=.*$/s, '')
    .replace(/\s*:\s*.*$/s, '')
    .trim();
}

function parseIdentifierList(block) {
  return block
    .split(',')
    .map((token) => normalizeIdentifier(token))
    .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name));
}

function getRuntimeDestructureNames(source) {
  const runtimeMatch = source.match(/\}\s*=\s*runtime\s*;/s);
  if (!runtimeMatch) return [];
  const start = source.lastIndexOf('const {', runtimeMatch.index);
  if (start < 0) return [];
  const block = source.slice(start + 'const {'.length, runtimeMatch.index);
  return parseIdentifierList(block);
}

function getReturnNames(source) {
  const returnStart = source.lastIndexOf('return {');
  if (returnStart < 0) return [];
  const returnEnd = source.indexOf('\n  };', returnStart);
  if (returnEnd < 0) return [];
  const block = source.slice(returnStart + 'return {'.length, returnEnd);
  return parseIdentifierList(block);
}

test('dashboard runtime cross-feature dependencies are fully connected and unambiguous', async () => {
  const featureData = [];

  for (const [featureName, runtimeFilename] of FEATURE_RUNTIME_FILES) {
    const filePath = path.join(FEATURES_ROOT, featureName, 'runtime', runtimeFilename);
    const source = await fs.readFile(filePath, 'utf8');
    featureData.push({
      featureName,
      runtimeDependencies: getRuntimeDestructureNames(source),
      providedMethods: getReturnNames(source),
    });
  }

  const providers = new Map();
  for (const feature of featureData) {
    for (const name of feature.providedMethods) {
      if (!providers.has(name)) providers.set(name, []);
      providers.get(name).push(feature.featureName);
    }
  }

  const unresolved = [];
  const duplicateProviders = [];

  for (const feature of featureData) {
    for (const dependency of feature.runtimeDependencies) {
      const ownerFeatures = providers.get(dependency) || [];
      if (ownerFeatures.length === 0) {
        unresolved.push(`${feature.featureName}:${dependency}`);
      }
      if (ownerFeatures.length > 1) {
        duplicateProviders.push(`${dependency}=>${ownerFeatures.join(',')}`);
      }
    }
  }

  assert.deepEqual(
    unresolved,
    [],
    `Unresolved runtime dependencies detected:\n${unresolved.join('\n')}`,
  );
  assert.deepEqual(
    duplicateProviders,
    [],
    `Ambiguous runtime dependency providers detected:\n${duplicateProviders.join('\n')}`,
  );
});
