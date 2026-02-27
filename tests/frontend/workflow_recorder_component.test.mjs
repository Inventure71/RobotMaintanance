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
