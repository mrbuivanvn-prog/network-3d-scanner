import React, { useState, useEffect } from 'react';

const PingTool = () => {
  const [host, setHost] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pingSingle = async () => {
    if (!host.trim()) {
      setError('Please enter a host');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.go.main.App.PingSingle(host);
      setResults([result]);
    } catch (err) {
      setError(err.message || 'Ping failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const pingMultiple = async () => {
    if (!host.trim()) {
      setError('Please enter hosts (comma-separated)');
      return;
    }
    
    const hosts = host.split(',').map(h => h.trim()).filter(h => h);
    if (hosts.length === 0) {
      setError('Please enter at least one host');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await window.go.main.App.PingMultiple(hosts);
      setResults(results);
    } catch (err) {
      setError(err.message || 'Multi-ping failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2>Ping Tool</h2>
        <p>Test network connectivity to one or more hosts</p>
      </div>
      
      <div className="tool-content">
        <div className="input-section">
          <label htmlFor="ping-host">Host(s):</label>
          <input
            type="text"
            id="ping-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="example.com or 8.8.8.8 (comma-separated for multiple)"
            disabled={loading}
          />
          <p className="input-help">Enter one hostname/IP, or multiple comma-separated values</p>
        </div>
        
        <div className="button-group">
          <button 
            onClick={pingSingle} 
            disabled={loading || !host.trim()}
            className="btn-primary"
          >
            {loading ? 'Pinging...' : 'Ping Single'}
          </button>
          <button 
            onClick={pingMultiple} 
            disabled={loading || !host.trim()}
            className="btn-secondary"
          >
            {loading ? 'Testing...' : 'Ping Multiple'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {results.length > 0 && (
          <div className="results-section">
            <h3>Results:</h3>
            <div className="results-table">
              {results.map((result, index) => (
                <div key={index} className="result-row">
                  <div className="result-cell">
                    <strong>{result.host}</strong>
                  </div>
                  <div className="result-cell">
                    {result.Success ? (
                      <span className="status-online">✓ Online</span>
                    ) : (
                      <span className="status-offline">✗ Offline</span>
                    )}
                  </div>
                  <div className="result-cell">
                    {result.Latency}
                  </div>
                  {!result.Success && result.Error && (
                    <div className="result-cell error-detail">
                      {result.Error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PingTool;