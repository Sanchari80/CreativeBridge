import React, { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, onValue, update } from "firebase/database"; // Firebase ইমপোর্ট

const NotificationSystem = ({ onBack }) => {
  const { user, requests, setRequests, setView, stories, setActiveStoryId } = useContext(AppContext); 
  const displayName = user?.name || user?.email?.split('@')[0];

  // --- Firebase থেকে রিয়েলটাইম রিকোয়েস্ট লোড করা ---
  useEffect(() => {
    const db = getDatabase();
    const reqRef = ref(db, 'requests');
    
    const unsubscribe = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reqList = Object.entries(data).map(([key, value]) => ({
          ...value,
          firebaseKey: key // আপডেট করার জন্য কী রাখা হলো
        }));
        setRequests(reqList);
      } else {
        setRequests([]);
      }
    });

    return () => unsubscribe();
  }, [setRequests]);

  const updateStatus = (req, newStatus) => {
    const db = getDatabase();
    // Firebase-এ স্ট্যাটাস আপডেট
    const updates = {};
    updates[`/requests/${req.firebaseKey}/status`] = newStatus;
    
    update(ref(db), updates)
      .then(() => alert(`Request ${newStatus}!`))
      .catch((err) => alert("Error: " + err.message));
  };

  const myNotifications = requests.filter(req => {
    if (user.role === 'Writer') {
      return req.writerName === displayName;
    } else if (user.role === 'Director') {
      return req.directorName === displayName && req.status === 'approved';
    }
    return false;
  });

  const handleViewStory = (storyId) => {
    // এখানে storyId-টি মূলত ড্যাশবোর্ডের আইটেমের আইডির সাথে মিলতে হবে
    setActiveStoryId(storyId); 
    setView('dashboard'); 
  };

  return (
    <div className="notification-wrapper">
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
                    <strong>{req.directorName}</strong> requested access to <strong>{req.requestType}</strong>.
                    <div style={{fontSize: '11px', color: '#888', marginTop: '2px'}}>Status: {req.status}</div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span>Your request for <strong>{req.writerName}'s</strong> {req.requestType} was approved!</span>
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
                    onClick={() => updateStatus(req, 'approved')} 
                    style={{ ...actionBtn, background: '#2ecc71' }}
                  >Approve</button>
                  <button 
                    onClick={() => updateStatus(req, 'declined')} 
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

// --- Styles (আপনার দেওয়া স্টাইলই থাকবে) ---
const backBtnStyle = { background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px', padding: '0' };
const listStyle = { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' };
const notifCard = { padding: '12px', background: '#f9f9f9', borderRadius: '10px', marginBottom: '5px', flexShrink: 0 };
const noteStyle = { fontSize: '12px', fontStyle: 'italic', color: '#636e72', margin: '5px 0', background: '#fff', padding: '5px', borderRadius: '5px' };
const actionBtn = { padding: '5px 12px', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };

export default NotificationSystem;