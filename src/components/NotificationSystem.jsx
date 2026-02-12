import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const NotificationSystem = () => {
  const { user, requests, setRequests } = useContext(AppContext);
  const displayName = user?.name || user?.email?.split('@')[0];

  // রিকোয়েস্ট স্ট্যাটাস আপডেট করার ফাংশন (Writer এর জন্য)
  const updateStatus = (requestId, newStatus) => {
    const updatedRequests = requests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    );
    setRequests(updatedRequests);
    alert(`Request ${newStatus}!`);
  };

  // লজিক অনুযায়ী নোটিফিকেশন ফিল্টার করা
  const myNotifications = requests.filter(req => {
    if (user.role === 'Writer') {
      // রাইটার দেখবে তার কাছে আসা সব রিকোয়েস্ট (পেন্ডিং এবং ডিক্লাইন্ড - হিস্ট্রি হিসেবে থাকবে)
      return req.writerName === displayName && (req.status === 'pending' || req.status === 'declined' || req.status === 'approved');
    } else if (user.role === 'Director') {
      // ডিরেক্টর দেখবে তার এপ্রুভ হওয়া রিকোয়েস্টগুলো (হিস্ট্রি হিসেবে থাকবে)
      return req.directorName === displayName && req.status === 'approved';
    }
    return false;
  });

  return (
    <div className="notification-list" style={listStyle}>
      {myNotifications.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', fontSize: '13px' }}>No notifications found</p>
      ) : (
        // লজিক অনুযায়ী সর্ট করে নতুনগুলো উপরে রাখা
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
                <>Your request for <strong>{req.writerName}'s</strong> {req.requestType === 'synopsis' ? 'Synopsis' : 'Full Story'} was approved!</>
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

// --- Styles (Fixed for Scrolling) ---
const listStyle = { 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '10px',
  maxHeight: '400px', // স্ক্রলিং এর জন্য নির্দিষ্ট হাইট
  overflowY: 'auto',   // স্ক্রলিং এনাবেল করা হলো
  paddingRight: '5px'
};

const notifCard = { 
  padding: '12px', 
  background: '#f9f9f9', 
  borderRadius: '10px',
  marginBottom: '5px',
  flexShrink: 0 // স্ক্রল কন্টেইনারে কার্ড যেন চ্যাপ্টা না হয়ে যায়
};

const noteStyle = { 
  fontSize: '12px', 
  fontStyle: 'italic', 
  color: '#636e72', 
  margin: '5px 0',
  background: '#fff',
  padding: '5px',
  borderRadius: '5px'
};

const actionBtn = { 
  padding: '5px 12px', 
  border: 'none', 
  borderRadius: '5px', 
  color: 'white', 
  cursor: 'pointer', 
  fontSize: '11px', 
  fontWeight: 'bold' 
};

export default NotificationSystem;