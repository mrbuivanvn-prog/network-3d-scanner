import React, { useState, useEffect } from 'react';

const TracerouteTool = () => {
  const [host, setHost] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTraceroute = async () => {
    if (!host.trim()) {
      setError('Please enter a host');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.go.main.App.Traceroute(host);
      setResults(result);
    } catch (err) {
      setError(err.message || 'Traceroute failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2>Traceroute Tool</h2>
        <p>Trace the route to a host</p>
      </div>
      
      <div className="tool-content">
        <div className="input-section">
          <label htmlFor="trace-host">Host:</label>
          <input
            type="text"
            id="trace-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="example.com or 8.8.8.8"
            disabled={loading}
          />
        </div>
        
        <div className="button-group">
          <button 
            onClick={runTraceroute} 
            disabled={loading || !host.trim()}
            className="btn-primary"
          >
            {loading ? 'Tracing...' : 'Start Traceroute'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {results.length > 0 && (
          <div className="results-section">
            <h3>Traceroute Results:</h3>
            <div className="results-table">
              <div className="results-header">
                <div className="result-cell">Hop</div>
                <div className="result-cell">IP</div>
                <div className="result-cell">Host</div>
                <div className="result-cell">Latency</div>
              </div>
              {results.map((hop, index) => (
                <div key={index} className="result-row">
                  <div className="result-cell">{hop.Hop}</div>
                  <div className="result-cell">{hop.IP}</div>
                  <div className="result-cell">{hop.Host || '—'}</div>
                  <div className="result-cell">{hop.Latency}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TracerouteTool;