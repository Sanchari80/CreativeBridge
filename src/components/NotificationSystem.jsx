import React, { useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue, update } from "firebase/database";
import { db } from '../App.jsx'; 

const NotificationSystem = ({ onBack }) => {
  const { user, requests, setRequests, setView, setActiveStoryId } = useContext(AppContext); 
  
  // সাউন্ড ফাইল রেফারেন্স (Public ফোল্ডার থেকে)
  const notifAudio = useRef(new Audio('/Notification.mp3'));
  const approveAudio = useRef(new Audio('/approve.mp3'));
  
  // আগের রিকোয়েস্ট সংখ্যা ট্র্যাক করার জন্য
  const prevRequestsCount = useRef(0);

  const userKey = user?.email?.toLowerCase().replace(/\./g, ',');

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
              allReqs.push({
                ...value,
                firebaseKey: key,
                ownerPath: ownerKey 
              });
            });
          }
        });

        // সাউন্ড লজিক: যদি নতুন কোনো রিকোয়েস্ট আসে
        if (allReqs.length > prevRequestsCount.current) {
          const latestReq = allReqs[allReqs.length - 1];

          // ১. রাইটার হিসেবে নতুন রিকোয়েস্ট পেলে
          if (user.role === 'Writer' && latestReq.ownerPath?.toLowerCase() === userKey) {
            notifAudio.current.play().catch(e => console.log("Sound play blocked by browser"));
          }
          
          // ২. ডিরেক্টর/ইউজার হিসেবে রিকোয়েস্ট এপ্রুভড হলে
          if (latestReq.fromEmail?.toLowerCase() === user.email?.toLowerCase() && latestReq.status === 'approved') {
            approveAudio.current.play().catch(e => console.log("Sound play blocked by browser"));
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
    
    update(ref(db), updates)
      .then(() => {
        // এপ্রুভ করার সাথে সাথে রাইটারের নিজের এন্ডেও সাউন্ড হবে
        if(newStatus === 'approved') {
            approveAudio.current.play().catch(e => {});
        }
        alert(`Request ${newStatus}!`);
      })
      .catch((err) => alert("Error: " + err.message));
  };

  const myNotifications = requests.filter(req => {
    const currentUserEmail = user?.email?.toLowerCase();
    if (user.role === 'Writer') {
      return req.ownerPath?.toLowerCase() === userKey;
    } else {
      return req.fromEmail?.toLowerCase() === currentUserEmail;
    }
  });

  const handleViewStory = (storyId) => {
    setActiveStoryId(storyId); 
    setView('dashboard'); 
  };

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
              background: req.status === 'pending' ? '#fff9db' : '#f9f9f9'
            }}>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                {user.role === 'Writer' ? (
                  <>
                    <strong>{req.fromName}</strong> requested <strong>{req.type}</strong> for <strong>{req.storyTitle}</strong>.
                    <div style={{fontSize: '11px', color: '#666', marginTop: '2px'}}>Status: <b style={{textTransform: 'capitalize'}}>{req.status}</b></div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span>
                      Your request for <strong>{req.storyTitle}</strong> is <strong>{req.status}</strong>
                      {req.status === 'pending' ? '...' : '!'}
                    </span>
                    {/* View Story Button - এপ্রুভ হলে অবশ্যই দেখাবে */}
                    {req.status === 'approved' && (
                      <button 
                        onClick={() => handleViewStory(req.storyId)}
                        style={{ ...actionBtn, background: '#2d3436', width: 'fit-content', marginTop: '5px' }}
                      >
                        View Story
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {req.note && <p style={noteStyle}>Note: "{req.note}"</p>}

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