export const DEFAULT_TEST_DEFINITIONS = [
  {
    id: 'online',
    label: 'Online',
    icon: '🛰️',
    okText: 'SSH reachable and authenticated',
    failText: 'SSH unavailable or authentication failed',
  },
  {
    id: 'general',
    label: 'General Topics',
    icon: '📡',
    okText: 'All general topics present',
    failText: 'Missing general topics',
  },
  {
    id: 'battery',
    label: 'Battery',
    icon: '🔋',
    okText: 'Voltage and temperature in range',
    failText: 'Low voltage or abnormal discharge',
  },
  {
    id: 'movement',
    label: 'Movement',
    icon: '🛞',
    okText: 'All movement topics present',
    failText: 'Missing movement topics',
  },
  {
    id: 'proximity',
    label: 'Proximity Sensors',
    icon: '👁️',
    okText: 'All proximity sensors clear',
    failText: 'One or more sensors unavailable',
  },
  {
    id: 'lidar',
    label: 'LiDAR',
    icon: '🌐',
    okText: 'Scan stream stable',
    failText: 'No scan frames or frame corruption',
  },
  {
    id: 'camera',
    label: 'Camera',
    icon: '📷',
    okText: 'Image stream healthy',
    failText: 'Camera stream interrupted',
  },
];

export const PRESET_COMMANDS = [
  {
    id: 'status',
    label: 'Run status scan',
    command: 'rostopic list',
    description: 'All system health and version signals',
    auto: true,
  },
  {
    id: 'sensors',
    label: 'Run sensors check',
    command: 'labctl test --module sensors --json',
    description: 'Proximity + lidar validation',
  },
  {
    id: 'motors',
    label: 'Run wheel diagnostics',
    command: 'labctl test --module wheels --json',
    description: 'Current draw, odometry and stop/start check',
  },
  {
    id: 'camera',
    label: 'Run camera check',
    command: 'labctl test --module camera --json',
    description: 'Feed frames + latency + sync health',
  },
  {
    id: 'battery',
    label: 'Run battery check',
    command: 'labctl test --module battery --json',
    description: 'Voltage, discharge and thermal state',
  },
  {
    id: 'restart-docker',
    label: 'Restart docker',
    command: 'docker compose down && docker compose up -d',
    description: 'Restart local docker compose stack',
  },
];

export const ROBOTS_CONFIG_URL = 'config/robots.config.json';
export const ROBOT_TYPES_CONFIG_URL = 'config/robot-types.config.json';
export const DEFAULT_ROBOT_MODEL_URL = 'assets/models/rosbot-2-pro.glb';

export const backendData = [
  {
    id: 'rosbot-a1',
    name: 'ROSbot-2P-A1',
    type: 'Rosbot 2 Pro',
    modelUrl: 'assets/models/rosbot-2-pro.glb',
    tests: {
      general: { status: 'ok', value: 'online', details: '2 consecutive packets/min no loss' },
      battery: { status: 'ok', value: '93%', details: 'Charging healthy, temp 29C' },
      movement: { status: 'ok', value: '4/4', details: 'All motors within ±1.5% speed error' },
      proximity: { status: 'warning', value: '3/4', details: 'Rear-left sensor noisy after reboot' },
      lidar: { status: 'ok', value: 'normal', details: '13Hz stable' },
      camera: { status: 'ok', value: '30fps', details: 'RTSP feed stable' },
    },
  },
  {
    id: 'rosbot-b2',
    name: 'ROSbot-2P-B2',
    type: 'Rosbot 2 Pro',
    modelUrl: 'assets/models/rosbot-2-pro.glb',
    tests: {
      general: { status: 'warning', value: 'packet jitter', details: 'Latency spikes every 40-60s' },
      battery: { status: 'ok', value: '81%', details: 'Charge stable' },
      movement: { status: 'error', value: '3/4', details: 'Rear-right wheel encoder timeout' },
      proximity: { status: 'ok', value: '4/4', details: 'All channels active' },
      lidar: { status: 'ok', value: '12.9Hz', details: 'Frame count good' },
      camera: { status: 'warning', value: 'autofocus unstable', details: 'Minor stream lag at 1080p' },
    },
  },
  {
    id: 'rosbot-c3',
    name: 'ROSbot-2P-C3',
    type: 'Rosbot 2 Pro',
    modelUrl: 'assets/models/rosbot-2-pro.glb',
    tests: {
      general: { status: 'ok', value: 'online', details: 'No packet drops' },
      battery: { status: 'error', value: '37%', details: 'Voltage sag under load' },
      movement: { status: 'ok', value: '4/4', details: 'All motors tuned' },
      proximity: { status: 'ok', value: '4/4', details: 'All clear' },
      lidar: { status: 'ok', value: 'healthy', details: 'Cloud quality good' },
      camera: { status: 'ok', value: '30fps', details: 'Frame sync stable' },
    },
  },
  {
    id: 'rosbot-d4',
    name: 'ROSbot-2P-D4',
    type: 'Rosbot 2 Pro',
    modelUrl: 'assets/models/rosbot-2-pro.glb',
    tests: {
      general: { status: 'error', value: 'offline', details: 'No heartbeat in last minute' },
      battery: { status: 'warning', value: '54%', details: 'Long runtime on old cycle' },
      movement: { status: 'warning', value: '4/4', details: 'Right-front wheel current is high' },
      proximity: { status: 'warning', value: '2/4', details: 'L/R sensors stuck high' },
      lidar: { status: 'error', value: 'stale', details: 'Last valid frame delayed' },
      camera: { status: 'error', value: 'disconnected', details: 'USB capture not found' },
    },
  },
  {
    id: 'rosbot-e5',
    name: 'ROSbot-2P-E5',
    type: 'Rosbot 2 Pro',
    modelUrl: 'assets/models/rosbot-2-pro.glb',
    tests: {
      general: { status: 'ok', value: 'online', details: 'Healthy network tunnel' },
      battery: { status: 'ok', value: '88%', details: 'Expected for 4h workload' },
      movement: { status: 'ok', value: '4/4', details: 'Encoder health good' },
      proximity: { status: 'ok', value: '4/4', details: 'No proximity faults' },
      lidar: { status: 'ok', value: '14Hz', details: 'No outliers' },
      camera: { status: 'ok', value: 'good', details: 'Calibrated on last restart' },
    },
  },
  {
    id: 'rosbot-f6',
    name: 'ROSbot-2P-F6',
    type: 'Rosbot 2 Pro',
    modelUrl: 'assets/models/rosbot-2-pro.glb',
    tests: {
      general: { status: 'ok', value: 'online', details: 'Heartbeat steady' },
      battery: { status: 'warning', value: '61%', details: 'Unusual discharge when lidar active' },
      movement: { status: 'error', value: '3/4', details: 'Left rear wheel torque abnormal' },
      proximity: { status: 'ok', value: '4/4', details: 'Sensors passing threshold checks' },
      lidar: { status: 'ok', value: '13Hz', details: 'Stable points frame' },
      camera: { status: 'warning', value: 'frame drops', details: 'Dropped 5% packets in last 5m' },
    },
  },
];
