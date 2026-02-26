import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue, update, remove } from "firebase/database";
import { db } from '../App.jsx'; 

const NotificationSystem = ({ onBack }) => {
  const { user, requests, setRequests, setView, setActiveStoryId } = useContext(AppContext); 
  const [expandedNoteId, setExpandedNoteId] = useState(null); // নতুন স্টেট যোগ করা হয়েছে
  const prevRequestsCount = useRef(0);
  const userKey = user?.email?.toLowerCase().replace(/\./g, ',');

  const playSound = (src) => {
    const audio = new Audio(src);
    audio.play().catch(e => console.log("Sound play blocked"));
  };

  useEffect(() => {
    if (!user) return;
    const reqRef = ref(db, 'requests');
    const unsubscribe = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let allReqs = [];
        Object.entries(data).forEach(([ownerKey, requestsInFolder]) => {
          if (requestsInFolder && typeof requestsInFolder === 'object') {
            Object.entries(requestsInFolder).forEach(([key, value]) => {
              allReqs.push({ ...value, firebaseKey: key, ownerPath: ownerKey });
            });
          }
        });

        if (allReqs.length > prevRequestsCount.current && prevRequestsCount.current !== 0) {
          const latestReq = allReqs[allReqs.length - 1];
          if (user.role === 'Writer' && latestReq.ownerPath?.toLowerCase() === userKey) {
            playSound('/Notification.mp3');
          }
          if (latestReq.fromEmail?.toLowerCase() === user.email?.toLowerCase() && latestReq.status === 'approved') {
            playSound('/approve.mp3');
          }
        }
        prevRequestsCount.current = allReqs.length;
        setRequests(allReqs);
      } else {
        setRequests([]);
      }
    });
    return () => unsubscribe();
  }, [user, userKey, setRequests]);

  const updateStatus = (req, newStatus) => {
    const updates = {};
    updates[`/requests/${req.ownerPath}/${req.firebaseKey}/status`] = newStatus;
    update(ref(db), updates).then(() => {
      if(newStatus === 'approved') playSound('/approve.mp3');
      alert(`Request ${newStatus}!`);
    });
  };

  const deleteNotification = (req) => {
    if(window.confirm("Delete this notification?")) {
      remove(ref(db, `requests/${req.ownerPath}/${req.firebaseKey}`))
        .then(() => alert("Deleted!"))
        .catch(e => alert("Error: " + e.message));
    }
  };

  const getRequestTypeText = (req) => {
    if (req.requestType === "fullStory") return "Full Script";
    if (req.requestType === "synopsis") return "Synopsis";
    if (req.requestType === "contact") return "Contact Details";
  };

  const myNotifications = requests.filter(req => {
    const email = user?.email?.toLowerCase();
    return user.role === 'Writer' ? req.ownerPath?.toLowerCase() === userKey : req.fromEmail?.toLowerCase() === email;
  });

  const miniPicStyle = { width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle', border: '1px solid #ddd' };

  return (
    <div className="notification-wrapper">
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
        {user.role === 'Writer' && myNotifications.filter(r => r.status === 'pending').length > 0 && (
          <span style={badgeStyle}>{myNotifications.filter(r => r.status === 'pending').length} New</span>
        )}
      </div>

      <div className="notification-list" style={listStyle}>
        {myNotifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', fontSize: '13px' }}>No notifications found</p>
        ) : (
          [...myNotifications].reverse().map(req => (
            <div key={req.firebaseKey} style={{
              ...notifCard, 
              borderLeft: req.status === 'declined' ? '4px solid #e74c3c' : (req.status === 'approved' ? '4px solid #2ecc71' : '4px solid #f1c40f'),
              background: req.status === 'pending' ? '#fff9db' : '#f9f9f9',
              position: 'relative'
            }}>
              <button 
                onClick={() => deleteNotification(req)} 
                style={{ position: 'absolute', right: '10px', top: '10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}
              >🗑️</button>

              {/* Profile & Info Section - টাচ করলে নোট এক্সপ্যান্ড হবে */}
              <div 
                style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => setExpandedNoteId(expandedNoteId === req.firebaseKey ? null : req.firebaseKey)}
              >
                <div style={{ fontSize: '13px', flex: 1 }}>
                  {user.role === 'Writer' ? (
                    <>
                      <img src={req.fromPic || "/icon.png"} alt="p" style={miniPicStyle} />
                      {" "}<strong>{req.fromName}</strong> requested for <strong>{getRequestTypeText(req)}</strong> of your story <strong>"{req.storyTitle}"</strong>.
                      <div style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>Status: <b style={{textTransform: 'capitalize'}}>{req.status}</b></div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span>
                        {req.status === 'approved' && <img src={req.writerPic || "/icon.png"} alt="p" style={miniPicStyle} />}
                        {" "}Your <strong>{getRequestTypeText(req)}</strong> request for <strong>{req.storyTitle}</strong> is <strong>{req.status}</strong>!
                      </span>
                      {req.status === 'approved' && (
                        <button onClick={() => { setActiveStoryId(req.storyId); setView('dashboard'); }} style={{ ...actionBtn, background: '#2d3436', width: 'fit-content' }}>View Story</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Expandable Note Section */}
              {req.note && (
                <div style={{
                  ...noteStyle,
                  maxHeight: expandedNoteId === req.firebaseKey ? '500px' : '35px', 
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease-in-out',
                  cursor: 'pointer',
                  whiteSpace: expandedNoteId === req.firebaseKey ? 'pre-wrap' : 'nowrap',
                  textOverflow: 'ellipsis'
                }}
                onClick={() => setExpandedNoteId(expandedNoteId === req.firebaseKey ? null : req.firebaseKey)}
                >
                  <strong>Note:</strong> "{req.note}"
                </div>
              )}

              {user.role === 'Writer' && req.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
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

const backBtnStyle = { background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' };
const listStyle = { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', padding: '5px' };
const notifCard = { padding: '15px', borderRadius: '12px', marginBottom: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const noteStyle = { fontSize: '12px', fontStyle: 'italic', color: '#636e72', margin: '8px 0', background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #eee' };
const actionBtn = { padding: '6px 14px', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: '0.2s' };
const badgeStyle = { background: '#ff4757', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' };

export default NotificationSystem;