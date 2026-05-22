import React, { useState, useEffect } from 'react';

const SettingsTool = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'success', 'error'

  // Default settings form fields
  const [form, setForm] = useState({
    theme: 'dark',
    refreshInterval: '30',
    notifyOnNewDevice: 'true',
    autoScanEnabled: 'false',
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.go.main.App.GetSettings();
      setSettings(result);
      // Update form with loaded settings
      setForm({
        theme: result.theme || 'dark',
        refreshInterval: result.refreshInterval || '30',
        notifyOnNewDevice: result.notifyOnNewDevice || 'true',
        autoScanEnabled: result.autoScanEnabled || 'false',
      });
    } catch (err) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      await window.go.main.App.SaveSettings(form);
      setSaveStatus('success');
      // Also update the settings state
      setSettings(form);
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setError(err.message || 'Failed to save settings');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const resetToDefault = async () => {
    if (!window.confirm('Reset all settings to default values?')) {
      return;
    }
    setSaveStatus('saving');
    try {
      await window.go.main.App.ResetToDefault();
      // Reload settings to get defaults
      await loadSettings();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setError(err.message || 'Failed to reset settings');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2>Settings</h2>
        <p>Configure application preferences</p>
      </div>
      
      <div className="tool-content">
        {loading && (
          <div className="loading-message">Loading settings...</div>
        )}
        
        {!loading && (
          <>
            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="theme">Theme:</label>
                <select
                  id="theme"
                  name="theme"
                  value={form.theme}
                  onChange={handleChange}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="refreshInterval">Refresh Interval (seconds):</label>
                <input
                  type="number"
                  id="refreshInterval"
                  name="refreshInterval"
                  value={form.refreshInterval}
                  onChange={handleChange}
                  min="5"
                  max="300"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="notifyOnNewDevice">
                  <input
                    type="checkbox"
                    id="notifyOnNewDevice"
                    name="notifyOnNewDevice"
                    checked={form.notifyOnNewDevice === 'true'}
                    onChange={handleChange}
                  />
                  Notify when new device is found
                </label>
              </div>
              
              <div className="form-group">
                <label htmlFor="autoScanEnabled">
                  <input
                    type="checkbox"
                    id="autoScanEnabled"
                    name="autoScanEnabled"
                    checked={form.autoScanEnabled === 'true'}
                    onChange={handleChange}
                  />
                  Enable automatic scanning on startup
                </label>
              </div>
            </div>
            
            <div className="button-group">
              <button 
                onClick={saveSettings} 
                disabled={saveStatus === 'saving'}
                className="btn-primary"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
              </button>
              <button 
                onClick={resetToDefault} 
                disabled={saveStatus === 'saving'}
                className="btn-secondary"
              >
                Reset to Default
              </button>
            </div>
            
            {saveStatus === 'success' && (
              <div className="status-message success">Settings saved successfully!</div>
            )}
            {saveStatus === 'error' && (
              <div className="status-message error">Failed to save settings. Please try again.</div>
            )}
            
            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {!loading && !saveStatus && Object.keys(settings).length > 0 && (
              <div className="current-settings">
                <h3>Current Settings:</h3>
                <pre>{JSON.stringify(settings, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsTool;