import { applyActionButton, createActionButton } from './action-button-component.js';

export class RobotTerminalComponent {
    constructor(options = {}) {
      this.terminalElement = options.terminalElement;
      this.toolbarElement = options.toolbarElement;
      this.badgeElement = options.badgeElement;
      this.hintElement = options.hintElement;
      this.terminalCtor = options.terminalCtor;
      this.fitAddonCtor = options.fitAddonCtor;
      this.endpointBuilder =
        options.endpointBuilder ||
        ((robotId) => `${window.location.protocol}//${window.location.host}/api/robots/${encodeURIComponent(robotId)}/terminal`);
      this.onFallbackMode = options.onFallbackMode || (() => {});
      this.onFallbackCommand = options.onFallbackCommand || (() => {});
      this.onPresetLaunch = options.onPresetLaunch || (() => {});
      this.onModeChange = options.onModeChange || (() => {});
      this.terminal = null;
      this.fitAddon = null;
      this.streamSocket = null;
      this._streamOpenPromise = null;
      this.currentRobot = null;
      this.mode = 'fallback';
      this.presetCommands = [];
      this._fallbackInputEl = null;
      this._fallbackInputHandler = null;
      this.pageSessionId = this._createPageSessionId();
      this._connectionState = 'disconnected';
      this._connectionMessage = 'Disconnected';
      this._modeMessage = 'Streaming terminal';
      this._sessionConnectController = null;
      this._sessionStatePromise = null;
      this._sessionInFlight = false;
      this._disposing = false;
      this._connectionLedElement = null;
      this._connectionTextElement = null;
      this._connectionWrapElement = null;
      this._reconnectButtonElement = null;
      this._fullscreenButtonElement = null;
    }

    connect(robot, presetCommands = []) {
      this.presetCommands = Array.isArray(presetCommands) ? presetCommands : [];
      this.dispose();
      this._disposing = false;
      this.currentRobot = robot;
      this._renderToolbar();
      this._initializeTerminal(robot);
      this._connectLiveSession(robot, { runAutoPreset: true }).catch(() => {});
    }

    _initializeTerminal(robot) {
      if (!this.terminalElement || !robot) {
        this._setFallbackMode('Invalid terminal container or robot.');
        this._fallbackState();
        return;
      }

      if (!this.terminalCtor) {
        this._setFallbackMode('Terminal runtime is not available in this browser.');
        this._fallbackState();
        return;
      }

      const endpoint = this._buildEndpoint(robot.id);
      if (!endpoint) {
        this._setFallbackMode('Command endpoint not configured.');
        this._fallbackState();
        return;
      }

      this._cleanupTerminalDOM();
      this._detachLegacyInput();

      try {
        const xterm = new this.terminalCtor({
          fontFamily: 'Share Tech Mono, Menlo, Monaco, Consolas, monospace',
          fontSize: 13,
          cursorBlink: true,
          allowTransparency: true,
          convertEol: true,
          theme: {
            background: '#060912',
            foreground: '#dff9ff',
            cursor: '#9dc4ff',
            selection: '#2f4878',
          },
        });

        this.terminal = xterm;
        this.fitAddon = this.fitAddonCtor ? new this.fitAddonCtor() : null;
        this.mode = 'live';
        this._setConnectionStatus('connecting', 'Creating terminal session');

        xterm.open(this.terminalElement);
        if (this.fitAddon) {
          try {
            xterm.loadAddon(this.fitAddon);
            this.fitAddon.fit();
          } catch (_error) {
            this.fitAddon = null;
            this._writeLine('Fit addon unavailable: terminal resizing is disabled.', 'warn');
          }
        }

        this._setModeBadge(`Streaming terminal: ${endpoint}`, 'ok');
        this._setConnectionStatus('disconnected', 'Not connected');
        this._writeLine(`Connecting to ${robot.name || robot.id} interactive shell...`, 'ok');
        xterm.focus();
        xterm.element?.addEventListener('pointerdown', () => {
          xterm.focus();
        });
        xterm.onResize(({ cols, rows }) => this._sendResize(cols, rows));
        xterm.onData((data) => this._handleInput(data));
      } catch (_error) {
        this._setFallbackMode('Unable to initialize terminal view.');
        this._fallbackState();
      }
    }

    async runCommand(command, commandId = '', options = {}) {
      if (!this.currentRobot) return;

      const shouldEchoCommand = options.echoCommand === true;
      const commandText = String(command || '').trim();
      if (!commandText) return;

      if (this.mode === 'fallback') {
        await Promise.resolve(this.onFallbackCommand(this.currentRobot, commandText, commandId, 'terminal offline'));
        return;
      }

      if (shouldEchoCommand) {
        this._writeLine(commandText, 'plain');
      }

      if (commandText.toLowerCase() === 'clear') {
        this.terminal?.clear();
        return;
      }

      const sessionReady = await this._connectLiveSession(this.currentRobot);
      if (!sessionReady) {
        this._writeLine('SSH session not available. Use Reconnect SSH and retry.', 'warn');
        return;
      }

      if (!this._sendStreamInput(`${commandText}\n`)) {
        this._setConnectionStatus('error', 'Terminal stream not connected');
        this._writeLine('Terminal stream is disconnected. Click Reconnect SSH and retry.', 'err');
        return;
      }
    }

    _writePayload(payload) {
      if (payload === null || payload === undefined) {
        this._writeLine('[Empty output]', 'warn');
        return;
      }
      if (typeof payload.stdout === 'string') {
        this._writeLine(payload.stdout, 'plain');
      }
      if (typeof payload.stderr === 'string') {
        this._writeLine(payload.stderr, 'err');
      }
      if (typeof payload.output === 'string') {
        this._writeLine(payload.output, 'plain');
      }
      if (Array.isArray(payload.lines)) {
        this._writeLine(payload.lines.join('\n'), 'plain');
      }
      if (payload.result !== undefined) {
        this._writeLine(String(payload.result), 'plain');
      }
      if (typeof payload.exitCode === 'number' && payload.exitCode !== 0) {
        this._writeLine(`[exit ${payload.exitCode}]`, 'warn');
      }
      if (typeof payload.code === 'number' && payload.code !== 0) {
        this._writeLine(`[exit ${payload.code}]`, 'warn');
      }

      const hasKnownFields =
        typeof payload.stdout === 'string'
        || typeof payload.stderr === 'string'
        || typeof payload.output === 'string'
        || Array.isArray(payload.lines)
        || payload.result !== undefined
        || typeof payload.exitCode === 'number'
        || typeof payload.code === 'number';
      if (!hasKnownFields) {
        this._writeLine(JSON.stringify(payload), 'plain');
      }
    }

    _handleInput(data) {
      if (!this.terminal) {
        return;
      }

      if (!this._sendStreamInput(data)) {
        if (this.mode === 'live') {
          this._setConnectionStatus('error', 'Terminal stream not connected');
        }
        return;
      }
    }

    _renderToolbar() {
      if (!this.toolbarElement) return;
      this.toolbarElement.innerHTML = '';

      const mainRow = document.createElement('div');
      mainRow.className = 'terminal-toolbar-main';
      this.toolbarElement.appendChild(mainRow);

      const actionRow = document.createElement('div');
      actionRow.className = 'terminal-toolbar-actions';
      this.toolbarElement.appendChild(actionRow);

      const statusWrap = document.createElement('span');
      statusWrap.className = 'terminal-connection-wrap';
      this._connectionWrapElement = statusWrap;

      const statusDot = document.createElement('span');
      statusDot.className = 'terminal-connection-led';
      statusDot.setAttribute('aria-hidden', 'true');

      const statusText = document.createElement('span');
      statusText.className = 'terminal-connection-text';
      statusText.textContent = this._connectionMessage || 'SSH disconnected';

      statusWrap.append(statusDot, statusText);
      mainRow.appendChild(statusWrap);
      this._connectionLedElement = statusDot;
      this._connectionTextElement = statusText;

      this.presetCommands.forEach((preset) => {
        const button = createActionButton({
          intent: this._resolvePresetIntent(preset),
          compact: true,
          label: preset.label,
          title: preset.description,
        });
        button.addEventListener('click', async () => {
          this._writeLine(`Launching preset: ${preset.label}`, 'ok');
          this.onPresetLaunch(preset);
          await this.runCommand(preset.command, preset.id);
        });
        actionRow.appendChild(button);
      });

      const reconnect = createActionButton({
        intent: 'terminal',
        compact: true,
        label: 'Reconnect SSH',
        title: 'Reconnect the SSH session for this terminal',
      });
      reconnect.classList.add('terminal-reconnect-btn');
      this._reconnectButtonElement = reconnect;
      reconnect.addEventListener('click', () => {
        this._reconnectSession();
      });
      actionRow.appendChild(reconnect);

      const rebuildTerminal = createActionButton({
        intent: 'utility',
        compact: true,
        label: 'Rebuild terminal',
      });
      rebuildTerminal.addEventListener('click', () => {
        this.connect(this.currentRobot, this.presetCommands);
      });
      actionRow.appendChild(rebuildTerminal);

      const fullscreenButton = createActionButton({
        intent: 'navigation',
        compact: true,
      });
      this._fullscreenButtonElement = fullscreenButton;
      fullscreenButton.addEventListener('click', () => {
        this._toggleFullscreen();
      });
      this._syncFullscreenButtonLabel();
      mainRow.appendChild(fullscreenButton);

      this._setConnectionStatus(this._connectionState, this._connectionMessage);
    }

    _toggleFullscreen() {
      const shell = this.terminalElement?.closest('.terminal-shell');
      if (!shell) return;
      shell.classList.toggle('terminal-shell-expanded');
      this._syncFullscreenButtonLabel();
      if (this.fitAddon && typeof this.fitAddon.fit === 'function') {
        setTimeout(() => {
          try {
            this.fitAddon.fit();
            this._sendResize();
          } catch (_error) {}
        }, 0);
      }
    }

    _syncFullscreenButtonLabel() {
      if (!this._fullscreenButtonElement) return;
      const shell = this.terminalElement?.closest('.terminal-shell');
      const expanded = !!shell?.classList?.contains('terminal-shell-expanded');
      applyActionButton(this._fullscreenButtonElement, {
        intent: 'navigation',
        compact: true,
        label: expanded ? 'Exit fullscreen' : 'Fullscreen',
        title: expanded ? 'Restore terminal size' : 'Expand terminal to near full screen',
      });
    }

    _resolvePresetIntent(preset) {
      const presetId = String(preset?.id || '').toLowerCase();
      const command = String(preset?.command || '').toLowerCase();
      if (presetId.includes('restart') || command.includes('docker compose')) {
        return 'danger';
      }
      return 'run';
    }

    _fallbackState() {
      this.mode = 'fallback';
      this._closeStream({ suppressStatus: true });
      this._setModeBadge('Fallback terminal mode', 'warn');
      if (!this.terminalElement) return;
      this.terminal = null;
      this.fitAddon = null;
      this._cleanupTerminalDOM();
      this.terminalElement.classList.add('fallback');
      this._writeFallbackLine('Fallback terminal mode. Type command then press Enter.', 'warn');
      this._attachLegacyInput();
      this.onFallbackMode(this.currentRobot);
    }

    _setFallbackMode(message) {
      this._setModeBadge(`Fallback terminal mode: ${message}`, 'warn');
    }

    _setModeBadge(message, kind) {
      if (!this.badgeElement || !this.hintElement) return;
      this._modeMessage = message;
      this.badgeElement.classList.remove('ok', 'warn', 'err');
      this.badgeElement.classList.add(kind);
      const connectionText = this._connectionStateLabel();
      this.badgeElement.textContent = `${message} · ${connectionText}`;
      this.hintElement.textContent =
        this.mode === 'live'
          ? `${connectionText} — terminal output is streamed in real time.`
          : 'Command endpoint not found. Using fallback simulation.';
      this.onModeChange(this.mode);

      if (!this._connectionLedElement || !this._connectionTextElement) {
        return;
      }

      this._connectionLedElement.classList.remove('connected', 'connecting', 'disconnected', 'error');
      this._connectionLedElement.classList.add(this._connectionState);
      if (this._connectionWrapElement) {
        this._connectionWrapElement.classList.remove('connected', 'connecting', 'disconnected', 'error');
        this._connectionWrapElement.classList.add(this._connectionState);
      }
      if (this._connectionState === 'connected') {
        this._connectionLedElement.setAttribute('title', 'SSH connected');
      } else if (this._connectionState === 'connecting') {
        this._connectionLedElement.setAttribute('title', 'SSH connecting');
      } else if (this._connectionState === 'error') {
        this._connectionLedElement.setAttribute('title', 'SSH error');
      } else {
        this._connectionLedElement.setAttribute('title', 'SSH disconnected');
      }

      this._connectionTextElement.textContent = connectionText;
      this._updateConnectionControls();
    }

    _updateConnectionControls() {
      if (!this._reconnectButtonElement) return;
      const enabled = this.mode === 'live' && this._connectionState !== 'connecting';
      this._reconnectButtonElement.disabled = !enabled;
      if (this._connectionState === 'connecting') {
        this._reconnectButtonElement.textContent = 'Reconnecting...';
      } else {
        this._reconnectButtonElement.textContent = 'Reconnect SSH';
      }
    }

    _connectionStateLabel() {
      if (this._connectionState === 'connected') {
        return this._connectionMessage || 'SSH connected';
      }
      if (this._connectionState === 'connecting') {
        return this._connectionMessage || 'SSH connecting';
      }
      if (this._connectionState === 'error') {
        return this._connectionMessage || 'SSH error';
      }
      return this._connectionMessage || 'SSH disconnected';
    }

    _setConnectionStatus(status, message = '') {
      const nextState = String(status || '').toLowerCase();
      if (!['connected', 'connecting', 'disconnected', 'error'].includes(nextState)) {
        return;
      }

      this._connectionState = nextState;
      if (message) {
        this._connectionMessage = message;
      }

      const kind = nextState === 'connected' ? 'ok' : nextState === 'error' ? 'err' : 'warn';
      this._setModeBadge(this._modeMessage || 'Streaming terminal', kind);

      if (!this.hintElement) return;
      if (this.mode !== 'live') return;

      if (nextState === 'connected') {
        this.hintElement.textContent = 'SSH connected. Terminal output is streamed in real time.';
      } else if (nextState === 'connecting') {
        this.hintElement.textContent = 'SSH connecting. Establishing terminal stream...';
      } else if (nextState === 'error') {
        this.hintElement.textContent = 'SSH stream error. Click Reconnect SSH to retry.';
      } else {
        this.hintElement.textContent = 'SSH stream disconnected.';
      }
    }

    _writeLine(content, level = 'plain') {
      if (!this.terminal || !this.terminal.write) {
        return;
      }
      const text = String(content ?? '').replace(/\r\n/g, '\n');
      if (!text) {
        this.terminal.write('\r\n');
        return;
      }
      const color =
        level === 'warn'
          ? '\x1b[33m'
          : level === 'err'
            ? '\x1b[31m'
            : level === 'ok'
              ? '\x1b[32m'
              : '';
      const reset = '\x1b[0m';
      text.split('\n').forEach((line, index, lines) => {
        if (color) {
          this.terminal.write(`${color}${line || ' '}${reset}`);
        } else {
          this.terminal.write(line || ' ');
        }
        if (index < lines.length - 1) {
          this.terminal.write('\r\n');
        }
      });
      this.terminal.write('\r\n');
    }

    _writeFallbackLine(content, level = 'ok') {
      if (!this.terminalElement) return;
      const line = document.createElement('span');
      line.className = `line ${level}`;
      line.textContent = String(content ?? '').replace(/\r\n/g, '\n');
      this.terminalElement.appendChild(line);
      const breakLine = document.createElement('br');
      this.terminalElement.appendChild(breakLine);
      this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
    }

    _attachLegacyInput() {
      if (!this.terminalElement || this._fallbackInputEl) return;
      const line = document.createElement('div');
      line.className = 'terminal-legacy-input-line';
      const prompt = document.createElement('span');
      prompt.className = 'terminal-legacy-prompt';
      prompt.textContent = `${this.currentRobot?.name || this.currentRobot?.id || 'robot'}@terminal$ `;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'terminal-legacy-input';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.placeholder = 'Enter command';
      input.setAttribute('aria-label', 'Terminal command input');

      this._fallbackInputHandler = async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const command = input.value.trim();
        if (!command) return;
        this._writeFallbackLine(`${prompt.textContent}${command}`, 'ok');
        input.value = '';
        await this.runCommand(command);
      };
      input.addEventListener('keydown', this._fallbackInputHandler);

      line.append(prompt, input);
      this.terminalElement.appendChild(line);
      this._fallbackInputEl = input;
      this._fallbackInputEl.focus();
    }

    _detachLegacyInput() {
      if (this._fallbackInputEl && this._fallbackInputHandler) {
        this._fallbackInputEl.removeEventListener('keydown', this._fallbackInputHandler);
      }
      this._fallbackInputEl = null;
      this._fallbackInputHandler = null;
      if (!this.terminalElement) return;
      this.terminalElement.querySelectorAll('.terminal-legacy-input-line').forEach((line) => line.remove());
    }

    _buildEndpoint(robotId) {
      if (!robotId) return null;
      return this.endpointBuilder(robotId);
    }

    _buildStreamEndpoint(robotId) {
      const endpoint = this._buildEndpoint(robotId);
      if (!endpoint) return null;
      const streamUrl = new URL(`${endpoint}/stream`, window.location.href);
      streamUrl.protocol = streamUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      streamUrl.searchParams.set('pageSessionId', this.pageSessionId);
      return streamUrl.toString();
    }

    _isStreamOpen() {
      return !!this.streamSocket && this.streamSocket.readyState === WebSocket.OPEN;
    }

    _sendStreamInput(text) {
      if (!this._isStreamOpen()) {
        return false;
      }
      try {
        this.streamSocket.send(JSON.stringify({ type: 'input', data: String(text ?? '') }));
        return true;
      } catch (_error) {
        return false;
      }
    }

    _sendResize(cols = this.terminal?.cols, rows = this.terminal?.rows) {
      if (!this._isStreamOpen()) {
        return;
      }
      const width = Number(cols);
      const height = Number(rows);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return;
      }
      try {
        this.streamSocket.send(JSON.stringify({ type: 'resize', cols: Math.floor(width), rows: Math.floor(height) }));
      } catch (_error) {}
    }

    _handleStreamMessage(rawData) {
      if (!this.terminal) return;

      if (typeof rawData !== 'string') {
        return;
      }

      try {
        const payload = JSON.parse(rawData);
        const messageType = String(payload?.type || '').toLowerCase();
        if (messageType === 'output' && typeof payload.data === 'string') {
          this.terminal.write(payload.data);
          return;
        }
        if (messageType === 'error') {
          const message = typeof payload.message === 'string' ? payload.message : 'Terminal stream error';
          this._writeLine(message, 'err');
          this._setConnectionStatus('error', 'Terminal stream error');
          return;
        }
        return;
      } catch (_error) {
        this.terminal.write(rawData);
      }
    }

    _closeStream({ suppressStatus = false } = {}) {
      const socket = this.streamSocket;
      this.streamSocket = null;
      this._streamOpenPromise = null;
      if (!socket) return;
      try {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      } catch (_error) {}

      if (!suppressStatus && this.mode === 'live') {
        this._setConnectionStatus('disconnected', 'Terminal stream closed');
      }
    }

    async _openStream(robot) {
      if (!robot || !robot.id) return false;
      if (this._isStreamOpen()) {
        return true;
      }
      if (this._streamOpenPromise) {
        return this._streamOpenPromise;
      }

      const streamEndpoint = this._buildStreamEndpoint(robot.id);
      if (!streamEndpoint) {
        return false;
      }

      this._setConnectionStatus('connecting', 'Opening terminal stream...');
      this._streamOpenPromise = new Promise((resolve) => {
        let settled = false;
        const socket = new WebSocket(streamEndpoint);
        this.streamSocket = socket;

        const finalize = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
          this._streamOpenPromise = null;
        };

        socket.onopen = () => {
          this._setConnectionStatus('connected', 'SSH stream connected');
          this._sendResize();
          finalize(true);
        };

        socket.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            this._handleStreamMessage(event.data);
            return;
          }
          if (event.data instanceof Blob) {
            this._handleStreamMessage(await event.data.text());
          }
        };

        socket.onerror = () => {
          if (!settled) {
            this._setConnectionStatus('error', 'Terminal stream failed');
            finalize(false);
          }
        };

        socket.onclose = (event) => {
          const wasOpen = settled;
          this.streamSocket = null;
          this._streamOpenPromise = null;
          if (this._disposing || this.mode !== 'live') {
            if (!settled) finalize(false);
            return;
          }
          if (event.code === 1000) {
            this._setConnectionStatus('disconnected', 'Terminal stream closed');
          } else {
            this._setConnectionStatus('error', 'Terminal stream disconnected');
            this._writeLine('Terminal stream disconnected. Click Reconnect SSH to continue.', 'warn');
          }
          if (!settled) {
            finalize(false);
          } else if (wasOpen) {
            this._streamOpenPromise = null;
          }
        };
      });

      return this._streamOpenPromise;
    }

    async _connectLiveSession(robot, { runAutoPreset = false } = {}) {
      if (!robot || !robot.id || this.mode !== 'live') return false;
      const sessionReady = await this._ensureRemoteSession(robot);
      if (!sessionReady) {
        return false;
      }
      const streamReady = await this._openStream(robot);
      if (!streamReady) {
        return false;
      }
      if (runAutoPreset) {
        const autoCmd = this.presetCommands.find((cmd) => cmd.auto);
        if (autoCmd) {
          this._writeLine(`Launching preset: ${autoCmd.label}`, 'ok');
          this.onPresetLaunch(autoCmd);
          await this.runCommand(autoCmd.command, autoCmd.id);
        }
      }
      return true;
    }

    async _ensureRemoteSession(robot) {
      if (!robot || !robot.id) return false;
      if (this._connectionState === 'connected') return true;
      if (this._sessionInFlight && this._sessionStatePromise) return this._sessionStatePromise;

      const endpoint = this._buildEndpoint(robot.id);
      if (!endpoint) return false;

      this._sessionInFlight = true;
      const connectTask = (async () => {
        try {
          this._setConnectionStatus('connecting', 'Opening SSH session...');
          this._sessionConnectController =
            typeof AbortController === 'function' ? new AbortController() : null;

          const response = await fetch(`${endpoint}/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: this._sessionConnectController?.signal,
            body: JSON.stringify({ pageSessionId: this.pageSessionId }),
          });

          if (!response.ok) {
            this._setConnectionStatus('error', `${response.statusText || 'Session failed'} (${response.status})`);
            return false;
          }

          this._setConnectionStatus('connecting', 'SSH session ready; opening stream...');
          return true;
        } catch (_error) {
          if (_error && _error.name === 'AbortError') {
            this._setConnectionStatus('disconnected', 'Session connection canceled');
            return false;
          }
          this._setConnectionStatus('error', 'SSH session init failed');
          return false;
        } finally {
          this._sessionConnectController = null;
          this._sessionInFlight = false;
          this._sessionStatePromise = null;
        }
      })();

      this._sessionStatePromise = connectTask;
      return connectTask;
    }

    _disconnectRemoteSession() {
      const robotId = this.currentRobot?.id;
      const endpoint = robotId ? this._buildEndpoint(robotId) : null;
      if (!endpoint) {
        return Promise.resolve();
      }

      const qs = new URLSearchParams({ pageSessionId: this.pageSessionId }).toString();
      return fetch(`${endpoint}/session?${qs}`, { method: 'DELETE' }).catch(() => {});
    }

    async _reconnectSession() {
      if (!this.currentRobot) {
        return;
      }

      if (this._sessionConnectController) {
        this._sessionConnectController.abort();
      }

      this._closeStream({ suppressStatus: true });
      this._setConnectionStatus('disconnected', 'Closing session...');
      await this._disconnectRemoteSession();
      const liveReady = await this._connectLiveSession(this.currentRobot);
      if (!liveReady) {
        this._setConnectionStatus('error', 'Reconnect failed');
        this._writeLine('SSH reconnect failed. Click Reconnect SSH to retry.', 'warn');
        return;
      }

      this._setConnectionStatus('connected', 'SSH reconnected');
      this._writeLine('SSH session reconnected.', 'ok');
    }

    _createPageSessionId() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return `page-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    }

    _cleanupTerminalDOM() {
      if (!this.terminalElement) return;
      this._detachLegacyInput();
      this.terminalElement.classList.remove('fallback');
      this.terminalElement.innerHTML = '';
      this.terminalElement.textContent = '';
    }

    fit() {
      if (this.mode !== 'live' || !this.fitAddon) {
        return;
      }
      this.fitAddon.fit();
      this._sendResize();
    }

    dispose() {
      const robotId = this.currentRobot?.id;
      const endpoint = robotId ? this._buildEndpoint(robotId) : null;
      this._disposing = true;
      this.mode = 'fallback';
      this._detachLegacyInput();
      if (this._sessionConnectController) {
        this._sessionConnectController.abort();
      }
      this._sessionConnectController = null;
      this._sessionInFlight = false;
      this._sessionStatePromise = null;
      this._closeStream({ suppressStatus: true });
      this._connectionState = 'disconnected';
      this._connectionMessage = 'Session closed';
      if (this.terminal && this.terminal.dispose) {
        this.terminal.dispose();
      }
      this.terminal = null;
      this.fitAddon = null;
      this._setModeBadge('Terminal disconnected', 'warn');
      this._setConnectionStatus('disconnected', 'Session closed');

      if (endpoint) {
        const qs = new URLSearchParams({ pageSessionId: this.pageSessionId }).toString();
        fetch(`${endpoint}/session?${qs}`, { method: 'DELETE' }).catch(() => {});
      }
    }
}
