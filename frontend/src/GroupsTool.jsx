import React, { useState, useEffect } from 'react';

const GroupsTool = () => {
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'success', 'error'

  // In a real app, we would have backend methods to manage groups.
  // For now, we'll simulate with local state and pretend to call backend.
  // Since the backend doesn't have group management yet, we'll mock it.

  useEffect(() => {
    // Load groups (mocked for now)
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      // Since there's no backend method for groups, we'll simulate
      // In a real app, this would be: const result = await window.go.main.App.GetGroups();
      // For now, we'll use an empty array or maybe from localStorage
      const saved = localStorage.getItem('network-scanner-groups');
      setGroups(saved ? JSON.parse(saved) : []);
    } catch (err) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const addGroup = async () => {
    if (!newGroup.trim()) {
      setError('Group name cannot be empty');
      return;
    }
    setSaveStatus('saving');
    try {
      // Simulate adding a group
      const newGroups = [...groups, newGroup.trim()];
      // In a real app, we would call: await window.go.main.App.AddGroup(newGroup.trim());
      // For now, we'll save to localStorage
      localStorage.setItem('network-scanner-groups', JSON.stringify(newGroups));
      setGroups(newGroups);
      setNewGroup('');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setError(err.message || 'Failed to add group');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const removeGroup = async (index) => {
    setSaveStatus('saving');
    try {
      const newGroups = groups.filter((_, i) => i !== index);
      // In a real app, we would call: await window.go.main.App.RemoveGroup(index);
      localStorage.setItem('network-scanner-groups', JSON.stringify(newGroups));
      setGroups(newGroups);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setError(err.message || 'Failed to remove group');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2>Device Groups</h2>
        <p>Organize your devices into groups for easier management</p>
      </div>
      
      <div className="tool-content">
        {loading && (
          <div className="loading-message">Loading groups...</div>
        )}
        
        {!loading && (
          <>
            <div className="groups-management">
              <div className="input-group">
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="Enter group name"
                  disabled={saveStatus === 'saving'}
                />
                <button 
                  onClick={addGroup} 
                  disabled={saveStatus === 'saving' || !newGroup.trim()}
                  className="btn-primary"
                >
                  {saveStatus === 'saving' ? 'Adding...' : 'Add Group'}
                </button>
              </div>
              
              {error && (
                <div className="error-message">
                  <strong>Error:</strong> {error}
                </div>
              )}
              
              {saveStatus === 'success' && (
                <div className="status-message success">Group added successfully!</div>
              )}
              {saveStatus === 'error' && (
                <div className="status-message error">Failed to add group. Please try again.</div>
              )}
              
              <div className="groups-list">
                {groups.length === 0 ? (
                  <p className="empty-state">No groups created yet. Add a group above to get started.</p>
                ) : (
                  <>
                    <h3>Your Groups ({groups.length}):</h3>
                    <div className="groups-items">
                      {groups.map((group, index) => (
                        <div key={index} className="group-item">
                          <span className="group-name">{group}</span>
                          <button 
                            onClick={() => removeGroup(index)} 
                            className="btn-danger"
                            title="Remove group"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupsTool;