import React, { useState, useEffect } from 'react';

const PortScanTool = () => {
  const [host, setHost] = useState('');
  const [ports, setPorts] = useState('22,80,443,8080'); // common ports
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runPortScan = async () => {
    if (!host.trim()) {
      setError('Please enter a host');
      return;
    }
    
    if (!ports.trim()) {
      setError('Please enter ports to scan');
      return;
    }
    
    const portList = ports.split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        const num = parseInt(p, 10);
        return isNaN(num) ? null : num;
      })
      .filter(p => p !== null && p > 0 && p < 65536);
    
    if (portList.length === 0) {
      setError('Please enter valid port numbers (1-65535)');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.go.main.App.PortScan(host, portList);
      setResults(result);
    } catch (err) {
      setError(err.message || 'Port scan failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2>Port Scan Tool</h2>
        <p>Scan a host for open ports</p>
      </div>
      
      <div className="tool-content">
        <div className="input-section">
          <label htmlFor="portscan-host">Host:</label>
          <input
            type="text"
            id="portscan-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="example.com or 192.168.1.1"
            disabled={loading}
          />
        </div>
        
        <div className="input-section">
          <label htmlFor="portscan-ports">Ports (comma-separated):</label>
          <input
            type="text"
            id="portscan-ports"
            value={ports}
            onChange={(e) => setPorts(e.target.value)}
            placeholder="22,80,443,8080 or 1-100"
            disabled={loading}
          />
          <p className="input-help">Enter port numbers or ranges (e.g., 22,80,443 or 1-1000)</p>
        </div>
        
        <div className="button-group">
          <button 
            onClick={runPortScan} 
            disabled={loading || !host.trim() || !ports.trim()}
            className="btn-primary"
          >
            {loading ? 'Scanning...' : 'Start Scan'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {results.length > 0 && (
          <div className="results-section">
            <h3>Scan Results:</h3>
            <div className="results-table">
              <div className="results-header">
                <div className="result-cell">Port</div>
                <div className="result-cell">Status</div>
                <div className="result-cell">Service</div>
              </div>
              {results.map((result, index) => (
                <div key={index} className="result-row">
                  <div className="result-cell">{result.Port}</div>
                  <div className="result-cell">
                    {result.Open ? (
                      <span className="status-online">✓ Open</span>
                    ) : (
                      <span className="status-offline">✗ Closed</span>
                    )}
                  </div>
                  <div className="result-cell">
                    {result.Service || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortScanTool;