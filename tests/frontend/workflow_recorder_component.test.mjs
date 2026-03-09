import test from 'node:test';
import assert from 'node:assert/strict';

import { WorkflowRecorderComponent } from '../../assets/js/components/workflow-recorder-component.js';

function buildDefinitionWithRunAtConnection(runAtConnection) {
  const recorder = new WorkflowRecorderComponent({});
  recorder.createNewTest();
  recorder.addOrUpdateOutput({
    key: 'battery',
    label: 'Battery',
    icon: 'B',
    passDetails: 'ok',
    failDetails: 'fail',
    runAtConnection,
  });
  const write = recorder.addWriteBlock({
    command: 'echo battery',
    outputPayload: { stdout: 'battery ok' },
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: write.saveAs,
    kind: 'contains_string',
    needle: 'battery',
  });

  return recorder.buildTestDefinition({
    definitionId: 'battery_health',
    label: 'Battery health',
  });
}

test('workflow recorder emits checks with runAtConnection=true by default', () => {
  const definition = buildDefinitionWithRunAtConnection(undefined);
  assert.equal(definition.checks.length, 1);
  assert.equal(definition.checks[0].runAtConnection, true);
});

test('workflow recorder emits checks with explicit runAtConnection=false', () => {
  const definition = buildDefinitionWithRunAtConnection(false);
  assert.equal(definition.checks.length, 1);
  assert.equal(definition.checks[0].runAtConnection, false);
});

test('workflow recorder can load an existing definition back into editable outputs and blocks', () => {
  const definition = buildDefinitionWithRunAtConnection(false);
  const recorder = new WorkflowRecorderComponent({});

  const loaded = recorder.loadTestDefinition(definition);
  const state = recorder.getState(definition.id);
  const rebuilt = recorder.buildTestDefinition({
    definitionId: definition.id,
    label: definition.label,
  });

  assert.equal(loaded.outputCount, 1);
  assert.equal(state.started, true);
  assert.equal(state.writeCount, 1);
  assert.equal(state.readCount, 1);
  assert.equal(state.outputCount, 1);
  assert.equal(rebuilt.execute.length, 1);
  assert.deepEqual(rebuilt.execute[0], definition.execute[0]);
  assert.deepEqual(rebuilt.checks, definition.checks);
});

test('workflow recorder preserves multi-rule all_of checks when loading an existing definition', () => {
  const recorder = new WorkflowRecorderComponent({});
  recorder.createNewTest();
  recorder.addOrUpdateOutput({
    key: 'battery',
    label: 'Battery',
    icon: 'B',
    passDetails: 'ok',
    failDetails: 'fail',
  });
  const write = recorder.addWriteBlock({
    command: 'echo battery',
    outputPayload: { stdout: 'battery ok' },
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: write.saveAs,
    kind: 'contains_string',
    needle: 'battery',
  });
  recorder.addOrUpdateReadBlock({
    outputKey: 'battery',
    inputRef: write.saveAs,
    kind: 'contains_any_string',
    needles: 'ok,healthy',
  });
  const definition = recorder.buildTestDefinition({
    definitionId: 'battery_health',
    label: 'Battery health',
  });

  const restored = new WorkflowRecorderComponent({});
  restored.loadTestDefinition(definition);
  const restoredState = restored.getState(definition.id);
  const rebuilt = restored.buildTestDefinition({
    definitionId: definition.id,
    label: definition.label,
  });

  assert.equal(restoredState.outputCount, 1);
  assert.equal(restoredState.readCount, 2);
  assert.equal(rebuilt.checks.length, 1);
  assert.equal(rebuilt.checks[0].read.kind, 'all_of');
  assert.equal(rebuilt.checks[0].read.rules.length, 2);
});
