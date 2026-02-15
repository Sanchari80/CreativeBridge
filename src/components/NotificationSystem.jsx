import React, { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, onValue, update } from "firebase/database";

const NotificationSystem = ({ onBack }) => {
  const { user, requests, setRequests, setView, setActiveStoryId } = useContext(AppContext); 
  const displayName = user?.name || user?.email?.split('@')[0];
  const userKey = user?.email?.replace(/\./g, ',');
  
  const dbUrl = "https://creativebridge-88c8a-default-rtdb.asia-southeast1.firebasedatabase.app/";

  useEffect(() => {
    const db = getDatabase(undefined, dbUrl);
    // Path-ta ekhon pura 'requests' node-e thakbe
    const reqRef = ref(db, 'requests');
    
    const unsubscribe = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let allReqs = [];
        // requests er bhetore prottekta ownerKey (email) folder theke data nichi
        Object.entries(data).forEach(([ownerKey, requestsInFolder]) => {
          Object.entries(requestsInFolder).forEach(([key, value]) => {
            allReqs.push({
              ...value,
              firebaseKey: key,
              ownerPath: ownerKey // Update korar somoy lagbe
            });
          });
        });
        setRequests(allReqs);
      } else {
        setRequests([]);
      }
    });

    return () => unsubscribe();
  }, [setRequests]);

  const updateStatus = (req, newStatus) => {
    const db = getDatabase(undefined, dbUrl);
    const updates = {};
    // Exact path-e status update korchi
    updates[`/requests/${req.ownerPath}/${req.firebaseKey}/status`] = newStatus;
    
    update(ref(db), updates)
      .then(() => alert(`Request ${newStatus}!`))
      .catch((err) => alert("Error: " + err.message));
  };

  const myNotifications = requests.filter(req => {
    if (user.role === 'Writer') {
      // Writer dekhbe tar kache asha requests
      return req.ownerPath === userKey;
    } else {
      // Director dekhbe tar approved requests
      return req.fromEmail === user?.email && req.status === 'approved';
    }
  });

  const handleViewStory = (storyId) => {
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
            <div key={req.firebaseKey} style={{
              ...notifCard, 
              borderLeft: req.status === 'declined' ? '4px solid #e74c3c' : (req.status === 'approved' ? '4px solid #2ecc71' : '4px solid #2d3436'),
              opacity: req.status !== 'pending' && user.role === 'Writer' ? 0.8 : 1
            }}>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                {user.role === 'Writer' ? (
                  <>
                    <strong>{req.fromName}</strong> requested access to <strong>{req.storyTitle}</strong>.
                    <div style={{fontSize: '11px', color: '#888', marginTop: '2px'}}>Status: {req.status}</div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span>Your request for <strong>{req.storyTitle}</strong> was approved!</span>
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
                  <button onClick={() => updateStatus(req, 'approved')} style={{ ...actionBtn, background: '#2ecc71' }}>Approve</button>
                  <button onClick={() => updateStatus(req, 'declined')} style={{ ...actionBtn, background: '#e74c3c' }}>Decline</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const backBtnStyle = { background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px', padding: '0' };
const listStyle = { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' };
const notifCard = { padding: '12px', background: '#f9f9f9', borderRadius: '10px', marginBottom: '5px', flexShrink: 0 };
const noteStyle = { fontSize: '12px', fontStyle: 'italic', color: '#636e72', margin: '5px 0', background: '#fff', padding: '5px', borderRadius: '5px' };
const actionBtn = { padding: '5px 12px', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };

export default NotificationSystem;