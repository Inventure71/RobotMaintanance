import { renderRecorderLlmSystemPromptSection } from './recorderLlmSystemPromptSection.js';

export const RECORDER_LLM_PROMPT_VERSION = 'recorder-llm-roundtrip.v1';

export const RECORDER_LLM_RESPONSE_EXAMPLE = {
  id: 'topics_snapshot_startup',
  label: 'Topics Snapshot Startup',
  enabled: true,
  mode: 'orchestrate',
  execute: [
    {
      id: 'step_1',
      command: 'source /opt/ros/humble/setup.bash && source ~/robot_ws/install/setup.bash',
      saveAs: 'env_ready',
    },
    {
      id: 'step_2',
      command: 'ros2 topic list',
      saveAs: 'topics_raw',
    },
    {
      id: 'step_3',
      command: 'ros2 topic echo /battery_state --once',
      saveAs: 'battery_raw',
    },
  ],
  checks: [
    {
      id: 'topics_snapshot_startup__topics',
      label: 'Required topics',
      icon: 'T',
      runAtConnection: true,
      manualOnly: true,
      enabled: true,
      defaultStatus: 'warning',
      defaultValue: 'unknown',
      defaultDetails: 'Not checked yet',
      read: {
        kind: 'all_of',
        rules: [
          {
            kind: 'contains_lines_unordered',
            inputRef: 'topics_raw',
            lines: ['/battery_state', '/cmd_vel'],
            requireAll: true,
          },
          {
            kind: 'contains_any_string',
            inputRef: 'topics_raw',
            needles: ['/scan', '/lidar/scan'],
            caseSensitive: false,
          },
        ],
      },
      pass: {
        status: 'ok',
        value: 'all_present',
        details: 'Required startup topics are present.',
      },
      fail: {
        status: 'error',
        value: 'missing',
        details: 'One or more required startup topics are missing.',
      },
    },
    {
      id: 'topics_snapshot_startup__battery',
      label: 'Battery topic payload',
      icon: 'B',
      runAtConnection: true,
      manualOnly: true,
      enabled: true,
      defaultStatus: 'warning',
      defaultValue: 'unknown',
      defaultDetails: 'Not checked yet',
      read: {
        kind: 'contains_string',
        inputRef: 'battery_raw',
        needle: 'voltage',
        caseSensitive: false,
      },
      pass: {
        status: 'ok',
        value: 'present',
        details: 'Battery payload includes voltage data.',
      },
      fail: {
        status: 'error',
        value: 'missing',
        details: 'Battery payload did not include voltage data.',
      },
    },
  ],
};

export function renderRecorderLlmPromptTemplate({
  selectedRobot,
  currentDefinition,
  currentRecorderDraft,
  recorderTerminalTranscript,
  userSystemDetails,
  userTestRequest,
}) {
  return {
    promptVersion: RECORDER_LLM_PROMPT_VERSION,
    selectedRobot,
    currentDefinition,
    currentRecorderDraft,
    recorderTerminalTranscript,
    userSystemDetails,
    userTestRequest,
  };
}

export function renderRecorderLlmPromptText(promptPayload) {
  const systemSection = renderRecorderLlmSystemPromptSection({
    fullResponseExample: RECORDER_LLM_RESPONSE_EXAMPLE,
  });
  return `${systemSection}\n${JSON.stringify(promptPayload, null, 2)}`;
}
