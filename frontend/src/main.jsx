import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

// ── Mock Wails Adapter ───────────────────────────────────────────────────────
// Được chạy tự động khi không có Wails Go runtime (chế độ trình duyệt thuần).
// Cung cấp: StartSmartScan, StartMockScan, GetLocalIP, và EventsOn.
(function installMockAdapter() {
  if (typeof window === 'undefined') return;
  if (window.go && window.go.main && window.go.main.App) return;

  // ─── Stub window.runtime (Wails runtime shim used by wailsjs/runtime/runtime.js)
  // The real runtime.js exports Functions like EventsOn() that call window.runtime.*.
  // In browser mode window.runtime is not injected — we stub it here so the
  // real exports can be used in both Wails desktop and pure web.
  if (!window.runtime) {
    window.runtime = {
      LogPrint:  (msg) => console.info('[Wails Mock]', msg),
      LogTrace:  (msg) => console.debug('[Wails Mock]', msg),
      LogDebug:  (msg) => console.debug('[Wails Mock]', msg),
      LogInfo:   (msg) => console.info('[Wails Mock]', msg),
      LogWarning:(msg) => console.warn('[Wails Mock]', msg),
      LogError:  (msg) => console.error('[Wails Mock]', msg),
      LogFatal:  (msg) => console.error('[Wails Mock FATAL]', msg),
      EventsOnMultiple: (event, cb, max) => window.__wails_mock_emit ? window.__wails_mock_emit(event, cb) : null,
      EventsOff:    (e, ...rest) => {},
      EventsOffAll: () => {},
      EventsOnce:   (e, cb) => window.EventsOn ? window.EventsOn(e, cb) : null,
      EventsEmit:   () => {},
      // minimal stubs so nothing crashes on lookup
      SetClipboard:   () => Promise.resolve(),
      FileDialog:     () => {},
      MessageDialog:  () => {},
      SetWindowTitle: () => {},
      MinimiseWindow: () => {},
      MaximiseWindow: () => {},
      UnMaximiseWindow: () => {},
      Fullscreen: () => {},
      UnFullscreen: () => {},
      SetAlwaysOnTop: () => {},
      SetResizable: () => {},
      SetSize:    () => {},
      SetMinSize: () => {},
      SetMaxSize: () => {},
      SetPosition: () => {},
      Centre: () => {},
      Hide: () => {},
      Show: () => {},
      Close: () => {},
    };
  }

  // ─── Event registry ───────────────────────────────────────────────────────
  const _registry = Object.create(null);   // eventName → Set<callback>

  window.__wails_mock_emit = function (event, data) {
    (_registry[event]?.values() || []).forEach(fn => { try { fn(data); } catch (_) {} });
  };

  window.EventsOn = function (eventName, callback) {
    if (!_registry[eventName]) _registry[eventName] = new Set();
    _registry[eventName].add(callback);
    // Return unsubscribe function
    return () => _registry[eventName]?.delete(callback);
  };
  window.EventsOnce = function (event, cb) { window.EventsOn(event, cb); };
  window.EventsOff = function (event, cb) { _registry[event]?.delete(cb); };

  // ─── Go API mock ──────────────────────────────────────────────────────────
  const api = {
    StartMockScan(cidr) {
      // Reset first
      window.__wails_mock_emit('scan_started', null);
      const devices = [
        { ip: '192.168.1.1',  status: 'Online', host: 'router-gw',   mac: 'AA:BB:CC:DD:EE:FF' },
        { ip: '192.168.1.10', status: 'Online', host: 'pc-john',     mac: '11:22:33:44:55:66' },
        { ip: '192.168.1.15', status: 'Online', host: 'laptop-mary', mac: 'A1:B2:C3:D4:E5:F6' },
        { ip: '192.168.1.20', status: 'Offline', host: '',            mac: 'Unknown' },
        { ip: '192.168.1.30', status: 'Online', host: 'nas-storage',  mac: 'DE:AD:BE:EF:CA:FE' },
        { ip: '192.168.1.99', status: 'Offline', host: '',            mac: 'Unknown' },
      ];
      let i = 0;
      const next = () => {
        if (i < devices.length) {
          window.__wails_mock_emit('device_found', devices[i]);
          i++;
          setTimeout(next, 700);
        } else {
          window.__wails_mock_emit('scan_completed', null);
        }
      };
      setTimeout(next, 400);
    },
    async GetDevices() {
      return [
        { ip: '192.168.1.1',  status: 'Online', host: 'router-gw',   mac: 'AA:BB:CC:DD:EE:FF' },
        { ip: '192.168.1.10', status: 'Online', host: 'pc-john',     mac: '11:22:33:44:55:66' },
        { ip: '192.168.1.15', status: 'Online', host: 'laptop-mary', mac: 'A1:B2:C3:D4:E5:F6' },
        { ip: '192.168.1.20', status: 'Offline', host: '',            mac: 'Unknown' },
        { ip: '192.168.1.30', status: 'Online', host: 'nas-storage',  mac: 'DE:AD:BE:EF:CA:FE' },
        { ip: '192.168.1.99', status: 'Offline', host: '',            mac: 'Unknown' },
      ];
    },
    async GetLocalIP() { return '192.168.1.105'; },
    StartSmartScan(cidr) { this.StartMockScan(cidr); },

    // ── Network Tools (mock) ─────────────────────────────────────────────────
    async PingSingle(host) {
      await new Promise(r => setTimeout(r, 300));
      const success = Math.random() > 0.3;
      return {
        Host: host,
        Success: success,
        Latency: success ? `${(Math.random() * 50 + 1).toFixed(1)}ms` : 'timeout',
        Error: success ? '' : 'Request timed out',
      };
    },
    async PingMultiple(hosts) {
      return Promise.all(hosts.map(h => this.PingSingle(h)));
    },
    async Traceroute(host) {
      await new Promise(r => setTimeout(r, 800));
      const hops = [];
      for (let i = 1; i <= 5; i++) {
        hops.push({
          Hop: i,
          IP: `10.0.0.${i}`,
          Host: i < 5 ? `hop${i}.example.com` : host,
          Latency: `${(Math.random() * 30 + 5).toFixed(1)}ms`,
        });
      }
      return hops;
    },
    async PortScan(host, ports) {
      await new Promise(r => setTimeout(r, 600));
      return ports.map(port => ({
        Port: port,
        Open: Math.random() > 0.6,
        Service: this._guessService(port),
      }));
    },
    _guessService(port) {
      const map = { 21:'FTP', 22:'SSH', 23:'Telnet', 25:'SMTP', 53:'DNS', 80:'HTTP', 110:'POP3', 143:'IMAP', 443:'HTTPS', 3306:'MySQL', 3389:'RDP', 5900:'VNC', 8080:'HTTP-ALT' };
      return map[port] || '';
    },

    // ── Settings (mock) ──────────────────────────────────────────────────────
    async GetSettings() {
      return {
        theme: 'dark',
        refreshInterval: '30',
        notifyOnNewDevice: 'true',
        autoScanEnabled: 'false',
      };
    },
    async SaveSettings(settings) {
      await new Promise(r => setTimeout(r, 300));
      console.info('[Mock] Settings saved:', settings);
      return null;
    },

    // ── Backup (mock) ───────────────────────────────────────────────────────
    async ExportBackup() {
      await new Promise(r => setTimeout(r, 400));
      return {
        version: '1.0',
        timestamp: Math.floor(Date.now() / 1000),
        settings: await this.GetSettings(),
        groups: [],
        devices: await this.GetDevices(),
      };
    },
    async ImportBackup(data) {
      await new Promise(r => setTimeout(r, 400));
      console.info('[Mock] Backup imported:', data);
      return null;
    },
    async ResetToDefault() {
      await new Promise(r => setTimeout(r, 300));
      console.info('[Mock] Reset to default');
      return null;
    },
  };

  window.go = { main: { App: api } };
  window.startSmartScan = api.StartMockScan;
})();

// ── Render ──────────────────────────────────────────────────────────────────
const container = document.getElementById('root');
if (!container) {
  throw new Error('[main] #root element not found in index.html');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
