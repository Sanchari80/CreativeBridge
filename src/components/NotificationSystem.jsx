import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const NotificationSystem = ({ onBack }) => { // onBack প্রপস যোগ করা হলো
  const { user, requests, setRequests, setView, stories, setActiveStoryId } = useContext(AppContext); 
  const displayName = user?.name || user?.email?.split('@')[0];

  const updateStatus = (requestId, newStatus) => {
    const updatedRequests = requests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    );
    setRequests(updatedRequests);
    alert(`Request ${newStatus}!`);
  };

  const myNotifications = requests.filter(req => {
    if (user.role === 'Writer') {
      return req.writerName === displayName && (req.status === 'pending' || req.status === 'declined' || req.status === 'approved');
    } else if (user.role === 'Director') {
      return req.directorName === displayName && req.status === 'approved';
    }
    return false;
  });

  const handleViewStory = (storyId) => {
    const storyExists = stories.some(s => s.id === storyId);
    if (storyExists) {
      setActiveStoryId(storyId); // এই আইডিটি ড্যাশবোর্ডকে বলবে কার্ড ওপেন করতে
      setView('dashboard'); 
    } else {
      alert("Story not found or deleted.");
    }
  };

  return (
    <div className="notification-wrapper">
      {/* ব্যাক বাটন */}
      <div style={{ marginBottom: '15px' }}>
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
      </div>

      <div className="notification-list" style={listStyle}>
        {myNotifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', fontSize: '13px' }}>No notifications found</p>
        ) : (
          [...myNotifications].reverse().map(req => (
            <div key={req.id} style={{
              ...notifCard, 
              borderLeft: req.status === 'declined' ? '4px solid #e74c3c' : (req.status === 'approved' ? '4px solid #2ecc71' : '4px solid #2d3436'),
              opacity: req.status !== 'pending' && user.role === 'Writer' ? 0.8 : 1
            }}>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                {user.role === 'Writer' ? (
                  <>
                    <strong>{req.directorName}</strong> requested access to <strong>{req.requestType === 'synopsis' ? 'Synopsis' : 'Full Story'}</strong>.
                    <div style={{fontSize: '11px', color: '#888', marginTop: '2px'}}>Status: {req.status}</div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span>Your request for <strong>{req.writerName}'s</strong> {req.requestType === 'synopsis' ? 'Synopsis' : 'Full Story'} was approved!</span>
                    <button 
                      onClick={() => handleViewStory(req.storyId)}
                      style={{ ...actionBtn, background: '#2d3436', width: 'fit-content' }}
                    >
                      View Story
                    </button>
                  </div>
                )}
              </div>
              
              {req.note && <p style={noteStyle}>"{req.note}"</p>}

              {user.role === 'Writer' && req.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => updateStatus(req.id, 'approved')} 
                    style={{ ...actionBtn, background: '#2ecc71' }}
                  >Approve</button>
                  <button 
                    onClick={() => updateStatus(req.id, 'declined')} 
                    style={{ ...actionBtn, background: '#e74c3c' }}
                  >Decline</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Styles ---
const backBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#2d3436',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '0'
};

const listStyle = { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' };
const notifCard = { padding: '12px', background: '#f9f9f9', borderRadius: '10px', marginBottom: '5px', flexShrink: 0 };
const noteStyle = { fontSize: '12px', fontStyle: 'italic', color: '#636e72', margin: '5px 0', background: '#fff', padding: '5px', borderRadius: '5px' };
const actionBtn = { padding: '5px 12px', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };

export default NotificationSystem;