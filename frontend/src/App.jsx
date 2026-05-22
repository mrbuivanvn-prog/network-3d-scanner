import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import Network2D from './Network2D';
import PingTool from './PingTool';
import TracerouteTool from './TracerouteTool';
import PortScanTool from './PortScanTool';
import SettingsTool from './SettingsTool';
import GroupsTool from './GroupsTool';
import BackupTool from './BackupTool';
import './App.css';

// ── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught', error, info);
  }
  render() {
    // Chỉ hiện overlay nếu chúng ta đang ở chế độ 3D
    const in3D = this.props?.in3D ?? false;
    if (this.state.hasError && in3D) {
      return (
        <div className="error-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="error-card">
            <div className="error-card-title">⚠️ 3D Renderer Error</div>
            <pre className="error-card-body">{String(this.state.error)}</pre>
            <button className="error-card-btn" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    // Nếu không phải 3D thì không render gì cả — không giết app
    return this.props.children || null;
  }
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ devices, localIP, scanning, preferredMode, setPreferredMode, effectiveMode }) {
  const onlineCount = devices.filter((d) => d.status === 'Online').length;
  const statusColor = scanning ? 'var(--green)' : 'var(--accent)';
  const statusLabel = scanning ? '● SCANNING' : '● READY';

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1.5" fill="var(--accent)" stroke="none" />
            <circle cx="6" cy="5" r="1.5" fill="var(--accent)" stroke="none" />
            <circle cx="18" cy="5" r="1.5" fill="var(--accent)" stroke="none" />
            <circle cx="5" cy="19" r="1.5" fill="var(--accent)" stroke="none" />
            <circle cx="19" cy="19" r="1.5" fill="var(--accent)" stroke="none" />
            <line x1="12" y1="12" x2="6" y2="5" /><line x1="12" y1="12" x2="18" y2="5" />
            <line x1="12" y1="12" x2="5" y2="19" /><line x1="12" y1="12" x2="19" y2="19" />
            <line x1="6" y1="5" x2="18" y2="5" opacity="0.4" />
            <line x1="5" y1="19" x2="19" y2="19" opacity="0.4" />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-name">NETWORK 3D SCANNER</span>
          <span className="brand-divider" />
          <span className="brand-author">mrbuivan.vn</span>
        </div>
      </div>

      <div className="header-stats">
        <span className="stat" style={{ '--stat-color': 'var(--accent)' }}>
          <span className="stat-label">Online</span><span className="stat-value">{onlineCount}</span>
        </span>
        <span className="stat" style={{ '--stat-color': '#818cf8' }}>
          <span className="stat-label">Total</span><span className="stat-value">{devices.length}</span>
        </span>
        <span className="stat" style={{ '--stat-color': 'var(--green)' }}>
          <span className="stat-label">Subnet</span>
          <span className="stat-value mono">{localIP ? '...' + localIP.split('.').slice(3).join('.') : '—'}</span>
        </span>
        <span className="pulse-dot" style={{ background: statusColor }} />
        <span className="status-text" style={{ color: statusColor }}>{statusLabel}</span>

        {/* View Mode: Auto / 2D / 3D */}
        <div className="view-mode-group">
          <button
            onClick={() => setPreferredMode('auto')}
            className={`view-toggle ${preferredMode === 'auto' ? 'active' : ''}`}
            title="Tự động chọn tốt nhất"
          >
            Auto{preferredMode === 'auto' && <span className="auto-badge">({effectiveMode.toUpperCase()})</span>}
          </button>
          <button
            onClick={() => setPreferredMode('2d')}
            className={`view-toggle ${preferredMode === '2d' ? 'active' : ''}`}
          >
            2D
          </button>
          <button
            onClick={() => setPreferredMode('3d')}
            className={`view-toggle ${preferredMode === '3d' ? 'active' : ''}`}
          >
            3D
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Control Bar ──────────────────────────────────────────────────────────────
function ControlBar({ cidr, setCidr, onScan, scanning }) {
  return (
    <div className="control-bar">
      <div className="control-inner">
        <div className="input-group">
          <label className="input-label">CIDR Range</label>
          <input
            className="cidr-input"
            type="text"
            value={cidr}
            onChange={(e) => setCidr(e.target.value)}
            placeholder="192.168.1.0/24"
            disabled={scanning}
          />
        </div>
        <div className="divider" />
        <button
          className={`scan-btn ${scanning ? 'scanning' : ''}`}
          onClick={onScan}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <span className="scan-spinner" />
              SCANNING…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5-4.5 4.5" />
              </svg>
              START 3D SCAN
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Top-right devices panel ───────────────────────────────────────────────────
function DevicePanel({
  devices,
  collapsed,
  onToggleCollapse,
  filter,
  setFilter,
}) {
  const scrollRef = useRef(null);
  const online = devices.filter((d) => d.status === 'Online');
  const offline = devices.filter((d) => d.status !== 'Online');
  const rows = filter === 'online' ? online : filter === 'offline' ? offline : devices;

  return (
    <aside className={`device-panel ${collapsed ? 'collapsed' : ''}`}>
      {/* collapse handle */}
      <button className="panel-toggle" onClick={onToggleCollapse} title={collapsed ? 'Expand devices' : 'Collapse'}>
        {collapsed ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 19l-7-7 7-7" /></svg>
        )}
      </button>

      <div className="panel-header">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span className="panel-label">DEVICES FOUND</span>
        <span className="panel-count">{devices.length}</span>
      </div>

      {/* filter pills */}
      {!collapsed && (
        <div className="filter-row">
          {['all', 'online', 'offline'].map((f) => (
            <button
              key={f}
              className={`pill ${filter === f ? 'pill-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'online' ? `Online (${online.length})` : `Offline (${offline.length})`}
            </button>
          ))}
        </div>
      )}

      {!collapsed && (
        <div className="column-headers">
          <span className="ch icon">#</span>
          <span className="ch ip">IP</span>
          <span className="ch host">Host</span>
          <span className="ch mac">MAC</span>
          <span className="ch stat">Status</span>
        </div>
      )}

      {!collapsed && (
        <div className="device-list" ref={scrollRef}>
          {rows.length === 0 ? (
            <div className="device-empty">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8M12 8v8" />
              </svg>
              <span>No devices yet — run a scan</span>
            </div>
          ) : (
            rows.map((d, i) => <DeviceRow key={(d.id || d.ip || d.mac || i) + '-' + i} device={d} index={i} />)
          )}
          <div className="device-list-mask" />
        </div>
      )}
    </aside>
  );
}

// ── Device Icon helper ────────────────────────────────────────────────────────
// Returns a small React element (inline SVG) for each device type.
function DeviceIcon({ host = '', status = '' }) {
  const h = (host || '').toLowerCase();

  // ── Router / Gateway ────────────────────────────────────────────────────────
  if (h.includes('router') || h.includes('gw') || h.includes('gateway')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
        <circle cx="9" cy="12" r="1.5" fill="var(--accent)" stroke="none" />
        <path d="M9 13.5v4M12 13.5v4M15 13.5v4" />
      </svg>
    );
  }

  // ── NAS / Storage ──────────────────────────────────────────────────────────
  if (h.includes('nas') || h.includes('storage') || h.includes('hdd') || h.includes('fileserver')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 10c0 1.66 3.58 3 8 3s8-1.34 8-3" opacity="0.4" />
        <path d="M4 14c0 1.66 3.58 3 8 3s8-1.34 8-3" opacity="0.4" />
      </svg>
    );
  }

  // ── Laptop ──────────────────────────────────────────────────────────────────
  if (h.includes('laptop')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M2 8h20" />
        <path d="M8 18v2M16 18v2M3 18h18" opacity="0.5" />
      </svg>
    );
  }

  // ── Desktop / PC ────────────────────────────────────────────────────────────
  if (h.includes('pc') || h.includes('desktop') || h.startsWith('win') || h.startsWith('ubu')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" opacity="0.5" />
      </svg>
    );
  }

  // ── Printer ──────────────────────────────────────────────────────────────────
  if (h.includes('printer') || h.includes('print')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V3h12v6" />
        <rect x="4" y="9" width="16" height="10" rx="1" />
        <path d="M10 18v4M14 18v4" opacity="0.5" />
        <circle cx="12" cy="14" r="2" />
      </svg>
    );
  }

  // ── Camera / IoT ────────────────────────────────────────────────────────────
  if (h.includes('cam') || h.includes('camera') || h.includes('iot') || h.includes('sensor')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12a10 10 0 0 1 20 0" opacity="0.4" />
        <circle cx="12" cy="12" r="9" opacity="0.2" />
      </svg>
    );
  }

  // ── Phone / Mobile ──────────────────────────────────────────────────────────
  if (h.includes('phone') || h.includes('mobile') || h.includes('iphone') || h.includes('android')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M10 18h4M12 16v2" opacity="0.5" />
      </svg>
    );
  }

  // ── TV / Smart TV ───────────────────────────────────────────────────────────
  if (h.includes('tv') || h.includes('television') || h.includes('roku') || h.includes('chromecast')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 18v3" opacity="0.5" />
      </svg>
    );
  }

  // ── Default: generic network node ───────────────────────────────────────────
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="8" opacity="0.4" />
      <circle cx="5" cy="6" r="1.5" fill="var(--accent)" stroke="none" />
      <circle cx="19" cy="6" r="1.5" fill="var(--accent)" stroke="none" />
      <circle cx="5" cy="18" r="1.5" fill="var(--accent)" stroke="none" />
      <circle cx="19" cy="18" r="1.5" fill="var(--accent)" stroke="none" />
      <path d="M8.2 9.2L5.5 7M15.8 9.2l2.7-2.2M8.2 14.8l-2.7 2.2M15.8 14.8l2.7 2.2" opacity="0.4" />
    </svg>
  );
}

// ── Device Row ──────────────────────────────────────────────────────────────────
function DeviceRow({ device, index }) {
  return (
    <div
      key={(device.id || device.ip || device.mac || index) + '-' + index}
      className={`device-row ${device.status === 'Online' ? 'row-online' : 'row-offline'}`}
    >
      {/* Icon column */}
      <div className="device-icon-cell">
        <DeviceIcon host={device.host} status={device.status} />
      </div>
      <span className="ip">{device.ip || '—'}</span>
      <span className="host" title={device.host || ''}>{device.host || '—'}</span>
      <span className="mac">{device.mac || '—'}</span>
      <span className={`status-badge ${device.status === 'Online' ? 'badge-online' : 'badge-offline'}`}>
        <span className="badge-dot" />
        {device.status || 'Unknown'}
      </span>
    </div>
  );
}

// ── Global Error Banner ────────────────────────────────────────────────────────
function GlobalErrorBanner({ error, onDismiss }) {
  const [expanded, setExpanded] = useState(true);
  if (!error) return null;

  return (
    <div className="global-error">
      <div className="global-error-inner">
        <div className="global-error-icon">⚠️</div>
        <div className="global-error-msg">
          <div className="global-error-title">Global Error Detected</div>
          <pre className="global-error-body" onClick={() => setExpanded(!expanded)} title="Click to toggle">
            {expanded ? String(error) : String(error).split('\n')[0]}
          </pre>
          {String(error).split('\n').length > 1 && !expanded && (
            <span className="global-error-more">… (click to expand)</span>
          )}
        </div>
        <div className="global-error-actions">
          <button className="btn-icon" title="Dismiss" onClick={onDismiss}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [localIP, setLocalIP] = useState('');
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanPulse, setScanPulse] = useState(0);
  const [cidr, setCidr] = useState('192.168.1.0/24');
  const [globalError, setGlobalError] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [filter, setFilter] = useState('all');

  // User's preference: 'auto' | '2d' | '3d'
  // Mặc định '2d' để khởi động an toàn.
  const [preferredMode, setPreferredMode] = useState('2d');

  // Tab selection: 'scanner' | 'ping' | 'traceroute' | 'portscan' | 'settings' | 'groups' | 'backup'
  const [tab, setTab] = useState('scanner');

  // WebGL detection (optimistic = true, chỉ set false khi confirm không hỗ trợ)
  const [hasWebGL, setHasWebGL] = useState(true);

  /**
   * effectiveMode: chế độ cuối cùng dùng để render.
   * Nếu user chọn 3D mà WebGL không có → tự động về 2D.
   */
  const effectiveMode = React.useMemo(() => {
    if (preferredMode === '3d' && !hasWebGL) {
      console.warn('[App] 3D được chọn nhưng WebGL không khả dụng → fallback 2D');
      return '2d';
    }
    return preferredMode === 'auto'
      ? (hasWebGL ? '3d' : '2d')
      : preferredMode;
  }, [preferredMode, hasWebGL]);

  const expectedCountRef = useRef(8);

  // ── Detect WebGL support (chạy 1 lần khi mount) ──────────────────────────────
  useEffect(() => {
    const supported = (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    })();

    setHasWebGL(supported);
    if (!supported) {
      console.warn('[App] WebGL không khả dụng — chế độ 3D sẽ bị vô hiệu hóa');
    }
  }, []);

  // ── Lazy-load Scene3D chỉ khi cần ─────────────────────────────────────────
  // Sử dụng dynamic import để @react-three/fiber không được evaluate lúc khởi tạo.
  // Nếu import lỗi → coi như 3D không khả dụng, tự động fallback về 2D.
  const Scene3DLazy = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    return lazy(() =>
      import('./Scene3D').then((mod) => ({ default: mod.default }))
        .catch((err) => {
          console.error('[App] Không thể nạp Scene3D:', err);
          setHasWebGL(false);
          setPreferredMode('2d');
          // Trả về component rỗng
          return { default: () => null };
        })
    );
  }, []);

  // ── Dual-mode binding ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const unsubs = [];

    const init = async () => {
      let EventsOnFn = null;
      let api = null;

      try {
        const mod = await import('../wailsjs/runtime/runtime');
        EventsOnFn = mod.EventsOn;
        api = window.go?.main?.App;
      } catch (err) {
        console.info('[App] Wails runtime không có, dùng mock adapter');
        EventsOnFn = window.EventsOn;
        api = window.go?.main?.App;
      }

      if (typeof EventsOnFn !== 'function') {
        console.error('[App] Không có EventsOn — scan events bị vô hiệu hóa');
        if (mounted) setReady(true);
        return;
      }

      if (api) {
        window.startSmartScan = api.StartSmartScan || api.StartMockScan;
        if (api.GetLocalIP) {
          try { setLocalIP(await api.GetLocalIP()); } catch { /* ignore */ }
        }
        if (api.GetDevices) {
          try { setDevices(await api.GetDevices()); } catch { /* ignore */ }
        }
      }

      unsubs.push(EventsOnFn('scan_started', () => {
        setDevices([]);
        setScanning(true);
        setScanPulse(0);
      }));
      unsubs.push(EventsOnFn('device_found', (device) => {
        setDevices((prev) => {
          if (prev.some((d) => d.ip === device.ip)) return prev;
          return [...prev, { ...device, id: Date.now() + Math.random() }];
        });
      }));
      unsubs.push(EventsOnFn('scan_completed', () => {
        setScanning(false);
        setScanPulse(100);
      }));

      if (mounted) setReady(true);
    };

    init();
    return () => {
      mounted = false;
      unsubs.forEach((u) => { try { u?.(); } catch (_) {} });
    };
  }, []);

  // ── Progress bar ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scanning) return;
    const pct = Math.min(100, Math.round((devices.length / Math.max(expectedCountRef.current, 1)) * 100));
    setScanPulse((prev) => Math.max(prev, pct));
  }, [devices.length, scanning]);

  // ── Global error handler ──────────────────────────────────────────────────
  useEffect(() => {
    const onErr = (e) => {
      console.error('window.onerror', e);
      setGlobalError(e.error || e.message || String(e));
    };
    const onRej = (e) => {
      console.error('unhandledrejection', e);
      setGlobalError(e.reason || String(e));
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  // ── Scan trigger ──────────────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    if (scanning) return;
    expectedCountRef.current = 8;
    if (typeof window.startSmartScan === 'function') {
      try {
        await Promise.resolve(window.startSmartScan(cidr));
      } catch (err) {
        console.error('[App] startSmartScan failed', err);
        setGlobalError(err);
        setScanning(false);
      }
    }
  }, [scanning, cidr]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="loading">
        <div className="loading-ring" /><div className="loading-orb" />
        <span className="loading-text">Loading…</span>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Header
        devices={devices} localIP={localIP} scanning={scanning}
        preferredMode={preferredMode} setPreferredMode={setPreferredMode}
        effectiveMode={effectiveMode}
      />

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'scanner' ? 'tab-active' : ''}`}
          onClick={() => setTab('scanner')}
        >
          Scanner
        </button>
        <button
          className={`tab-btn ${tab === 'ping' ? 'tab-active' : ''}`}
          onClick={() => setTab('ping')}
        >
          Ping
        </button>
        <button
          className={`tab-btn ${tab === 'traceroute' ? 'tab-active' : ''}`}
          onClick={() => setTab('traceroute')}
        >
          Traceroute
        </button>
        <button
          className={`tab-btn ${tab === 'portscan' ? 'tab-active' : ''}`}
          onClick={() => setTab('portscan')}
        >
          Port Scan
        </button>
        <button
          className={`tab-btn ${tab === 'settings' ? 'tab-active' : ''}`}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
        <button
          className={`tab-btn ${tab === 'groups' ? 'tab-active' : ''}`}
          onClick={() => setTab('groups')}
        >
          Groups
        </button>
        <button
          className={`tab-btn ${tab === 'backup' ? 'tab-active' : ''}`}
          onClick={() => setTab('backup')}
        >
          Backup
        </button>
      </div>

      {globalError && (
        <GlobalErrorBanner
          error={globalError}
          onDismiss={() => setGlobalError(null)}
        />
      )}

      {/* Content area */}
      <div className="tab-content">
        {tab === 'scanner' ? (
          <>
            <div className="scene-wrap">
              {scanning && (
                <div className="scan-hud">
                  <div className="scan-hud-bar">
                    <div className="scan-hud-progress" style={{ width: `${scanPulse}%` }} />
                  </div>
                  <div className="scan-hud-meta">
                    <span className="scan-hud-label">
                      {preferredMode === 'auto'
                        ? `AUTO (${effectiveMode.toUpperCase()}) NETWORK SCAN`
                        : `${effectiveMode.toUpperCase()} NETWORK SCAN`}
                    </span>
                    <span className="scan-hud-dots" />
                    <span className="scan-hud-cidr">{cidr}</span>
                    <span className="scan-hud-count">{devices.length} found</span>
                  </div>
                </div>
              )}

              {effectiveMode === '2d' ? (
                <Network2D devices={devices} />
              ) : Scene3DLazy ? (
                <ErrorBoundary in3D={true}>
                  <Suspense fallback={<div style={{ color: '#4e5f7a', padding: 16 }}>Đang nạp 3D…</div>}>
                    <Scene3DLazy devices={devices} />
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <div style={{ color: '#ef4444', padding: 24 }}>
                  Không thể nạp 3D renderer. Vui lòng chuyển sang chế độ <b>2D</b>.
                </div>
              )}
            </div>

            <DevicePanel
              devices={devices} collapsed={panelCollapsed}
              onToggleCollapse={() => setPanelCollapsed((p) => !p)}
              filter={filter} setFilter={setFilter}
            />

            {!panelCollapsed && (
              <ControlBar cidr={cidr} setCidr={setCidr} onScan={startScan} scanning={scanning} />
            )}

            {panelCollapsed && devices.length > 0 && (
              <button className="collapsed-scan-btn" onClick={startScan} disabled={scanning}>
                {scanning ? '◌' : '▶'} {scanning ? 'SCANNING' : 'START 3D SCAN'}
              </button>
            )}
          </>
        ) : (
          // Render the selected tool
          <div className="tool-wrapper">
            {tab === 'ping' && <PingTool />}
            {tab === 'traceroute' && <TracerouteTool />}
            {tab === 'portscan' && <PortScanTool />}
            {tab === 'settings' && <SettingsTool />}
            {tab === 'groups' && <GroupsTool />}
            {tab === 'backup' && <BackupTool />}
          </div>
        )}
       </div>
    </div>
  );
}
