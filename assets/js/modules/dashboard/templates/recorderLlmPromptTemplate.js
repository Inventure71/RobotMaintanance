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
    instructions: {
      objective: 'Return only ready test-definition JSON for the existing /api/definitions/tests save contract.',
      responseFormat: 'Return a single JSON object with no prose before or after it.',
      mode: 'orchestrate',
      preparation: [
        'SSH into the robot, run the "Run generic info commands" terminal action first, then run any additional commands you normally use before asking the external LLM for help.',
        'The recorder terminal transcript below must include enough command context for the model to understand what it is checking. This mainly helps the model define the read blocks correctly.',
        'The model should not invent write commands for your system. If the transcript does not show the relevant commands or outputs, the result will be wrong.',
        'It is fine for the terminal transcript to contain more command history than strictly necessary, but it must not contain less than the context needed to understand the workflow.',
        'Use the example response below as the formatting reference. It includes multiple write steps, multiple outputs/checks, and multiple read rules.',
      ],
      requiredTopLevelFields: ['id', 'label', 'mode', 'execute', 'checks'],
      allowedReadKinds: ['contains_string', 'contains_any_string', 'contains_lines_unordered', 'all_of'],
      constraints: [
        'mode must be orchestrate',
        'execute must be a non-empty array',
        'checks must be a non-empty array',
        'each check must define a top-level boolean runAtConnection',
        'all checks must share the same runAtConnection value',
      ],
      fullResponseExample: RECORDER_LLM_RESPONSE_EXAMPLE,
    },
    selectedRobot,
    currentDefinition,
    currentRecorderDraft,
    recorderTerminalTranscript,
    userSystemDetails,
    userTestRequest,
  };
}
