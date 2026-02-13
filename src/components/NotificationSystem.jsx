import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const NotificationSystem = () => {
  const { user, requests, setRequests, setView, stories } = useContext(AppContext); // setView যুক্ত করা হলো
  const displayName = user?.name || user?.email?.split('@')[0];

  const updateStatus = (requestId, newStatus) => {
    const updatedRequests = requests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    );
    setRequests(updatedRequests);
    alert(`Request ${newStatus}!`);
  };

  // নোটিফিকেশন হিস্ট্রি সেভড রাখার ফিল্টার লজিক
  const myNotifications = requests.filter(req => {
    if (user.role === 'Writer') {
      return req.writerName === displayName && (req.status === 'pending' || req.status === 'declined' || req.status === 'approved');
    } else if (user.role === 'Director') {
      return req.directorName === displayName && req.status === 'approved';
    }
    return false;
  });

  // নোটিফিকেশন থেকে স্টোরি ওপেন করার ফাংশন
  const handleViewStory = (storyId) => {
    const storyExists = stories.some(s => s.id === storyId);
    if (storyExists) {
      setView('dashboard'); // প্রথমে ড্যাশবোর্ডে নিয়ে যাবে
      // ছোট ডিলে দিয়ে স্ক্রল বা ফোকাস করার লজিক ড্যাশবোর্ড হ্যান্ডেল করবে
    } else {
      alert("Story not found or deleted.");
    }
  };

  return (
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
                  {/* ডিরেক্টরের জন্য View Story বাটন */}
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
  );
};

// --- Styles (অপরিবর্তিত) ---
const listStyle = { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' };
const notifCard = { padding: '12px', background: '#f9f9f9', borderRadius: '10px', marginBottom: '5px', flexShrink: 0 };
const noteStyle = { fontSize: '12px', fontStyle: 'italic', color: '#636e72', margin: '5px 0', background: '#fff', padding: '5px', borderRadius: '5px' };
const actionBtn = { padding: '5px 12px', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };

export default NotificationSystem;