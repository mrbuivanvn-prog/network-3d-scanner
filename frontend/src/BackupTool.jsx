import React, { useState, useEffect } from 'react';

const BackupTool = () => {
  const [backupData, setBackupData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null); // null, 'creating', 'success', 'error'
  const [restoreStatus, setRestoreStatus] = useState(null); // null, 'restoring', 'success', 'error'

  // For file upload
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    // Try to load any existing backup info on mount
    // This would be enhanced in a real app
  }, []);

  const createBackup = async () => {
    setBackupStatus('creating');
    setError(null);
    try {
      const result = await window.go.main.App.ExportBackup();
      setBackupData(result);
      setBackupStatus('success');
      // In a real app, we might automatically download or save this
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (err) {
      setBackupStatus('error');
      setError(err.message || 'Failed to create backup');
      setTimeout(() => setBackupStatus(null), 3000);
    }
  };

  const handleFileChange = (e) => {
    setUploadedFile(e.target.files[0]);
  };

  const restoreFromBackup = async () => {
    if (!uploadedFile) {
      setError('Please select a backup file to restore');
      return;
    }
    
    setRestoreStatus('restoring');
    setError(null);
    
    try {
      // Read the file as JSON
      const fileContent = await uploadedFile.text();
      const backupData = JSON.parse(fileContent);
      
      // Call the backend to import the backup
      await window.go.main.App.ImportBackup(backupData);
      
      setRestoreStatus('success');
      setUploadedFile(null);
      setTimeout(() => setRestoreStatus(null), 3000);
    } catch (err) {
      setRestoreStatus('error');
      setError(err.message || 'Failed to restore backup');
      setTimeout(() => setRestoreStatus(null), 3000);
    }
  };

  const downloadBackup = () => {
    if (!backupData) return;
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `network-scanner-backup-${timestamp}.json`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2>Backup & Restore</h2>
        <p>Export and import your network scanner configuration</p>
      </div>
      
      <div className="tool-content">
        <div className="backup-section">
          <h3>Create Backup</h3>
          <p>Export your current settings, groups, and device history</p>
          
          <div className="button-group">
            <button 
              onClick={createBackup} 
              disabled={backupStatus === 'creating'}
              className="btn-primary"
            >
              {backupStatus === 'creating' ? 'Creating...' : 'Create Backup'}
            </button>
            {backupData && (
              <button 
                onClick={downloadBackup}
                disabled={backupStatus === 'creating'}
                className="btn-secondary"
              >
                Download Backup
              </button>
            )}
          </div>
          
          {backupStatus === 'success' && (
            <div className="status-message success">Backup created successfully!</div>
          )}
          {backupStatus === 'error' && (
            <div className="status-message error">Failed to create backup. Please try again.</div>
          )}
          
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {backupData && (
            <div className="backup-preview">
              <h4>Backup Preview:</h4>
              <p><strong>Version:</strong> {backupData.version}</p>
              <p><strong>Timestamp:</strong> {new Date(backupData.timestamp * 1000).toLocaleString()}</p>
              <p><strong>Settings:</strong> {Object.keys(backupData.settings || {}).length} items</p>
              <p><strong>Groups:</strong> {(backupData.groups || []).length} items</p>
              <p><strong>Devices:</strong> {(backupData.devices || []).length} items</p>
              
              {/* Optionally show raw data */}
              <button 
                onClick={() => {
                  const pre = document.createElement('pre');
                  pre.textContent = JSON.stringify(backupData, null, 2);
                  alert('Backup Data:\n\n' + pre.textContent);
                }}
                className="btn-link"
              >
                View Raw Data
              </button>
            </div>
          )}
        </div>
        
        <div className="restore-section">
          <h3>Restore from Backup</h3>
          <p>Upload a previously exported backup file</p>
          
          <div className="upload-area">
            <input
              type="file"
              id="backup-file"
              accept=".json"
              onChange={handleFileChange}
              disabled={restoreStatus === 'restoring'}
            />
            <label htmlFor="backup-file">
              {uploadedFile ? 
                `Selected: ${uploadedFile.name}` : 
                'Choose a backup file to restore'
              }
            </label>
          </div>
          
          <div className="button-group">
            <button 
              onClick={restoreFromBackup} 
              disabled={restoreStatus === 'restoring' || !uploadedFile}
              className="btn-primary"
            >
              {restoreStatus === 'restoring' ? 'Restoring...' : 'Restore Backup'}
            </button>
          </div>
          
          {restoreStatus === 'success' && (
            <div className="status-message success">Backup restored successfully!</div>
          )}
          {restoreStatus === 'error' && (
            <div className="status-message error">Failed to restore backup. Please try again.</div>
          )}
          
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupTool;