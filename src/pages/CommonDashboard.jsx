import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

const CommonDashboard = () => {
  const { user, stories, setStories, requests, setRequests } = useContext(AppContext);
  const [expandedStory, setExpandedStory] = useState(null);
  const [requestModal, setRequestModal] = useState(null); 
  const [directorNote, setDirectorNote] = useState("");

  const displayName = user?.name || user?.email?.split('@')[0] || "User";

  useEffect(() => {
    localStorage.setItem('allRequests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('allStories', JSON.stringify(stories));
  }, [stories]);

  const deleteStory = (storyId) => {
    if (window.confirm("Are you sure you want to delete this story?")) {
      const updatedStories = stories.filter(s => s.id !== storyId);
      setStories(updatedStories);
      const updatedRequests = requests.filter(r => r.storyId !== storyId);
      setRequests(updatedRequests);
      alert("Story deleted successfully!");
    }
  };

  const sendRequest = () => {
    if (!requestModal) return;
    const { story } = requestModal;
    const alreadySent = requests.find(r => r.storyId === story.id && r.directorName === displayName);
    if (alreadySent) return alert(`Already sent a request for this story!`);

    const newRequest = { 
      id: Date.now(), 
      storyId: story.id, 
      writerName: story.writerName, 
      directorName: displayName,
      status: 'pending',
      note: directorNote 
    };

    setRequests([...requests, newRequest]);
    setRequestModal(null);
    setDirectorNote("");
    alert("Request sent successfully!");
  };

  return (
    <div className="dashboard-wrapper" style={{ position: 'relative' }}>
      
      {/* মেইন কন্টেন্ট গ্রিড */}
      <div className="main-content" style={contentWrapperStyle}>
        
        <div className="story-grid" style={gridStyle}>
          {stories.map(s => {
            const isExpanded = expandedStory === s.id;
            const revealReq = requests.find(r => r.storyId === s.id && r.directorName === displayName && r.status === 'approved');
            const isOwner = s.writerName === displayName;
            const canSeeStory = revealReq || isOwner;

            return (
              <div key={s.id} style={cardWrapper}>
                <div style={profileHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={avatarWrapper}>
                      <img src={s.writerPic || "/icon.png"} alt="p" style={avatarImg} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px', color: '#2d3436' }}>{s.writerName}</strong>
                      <span style={tagStyle}>{s.writerProfession || "Creator"}</span>
                    </div>
                  </div>
                  {isOwner && (
                    <button onClick={() => deleteStory(s.id)} style={deleteBtn}>🗑️</button>
                  )}
                </div>

                <p style={loglineStyle}>{s.logline}</p>
                
                <button onClick={() => setExpandedStory(isExpanded ? null : s.id)} style={viewBtn}>
                  {isExpanded ? "Close Details" : "View Details"}
                </button>

                {isExpanded && (
                  <div style={detailsBox}>
                    {canSeeStory ? (
                      <div>
                        <h5 style={labelStyle}>Synopsis</h5>
                        <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.5' }}>{s.synopsis}</p>
                        <a href={s.fullStoryFile} download style={downloadLink}>📄 Download Script</a>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '10px' }}>
                        <p style={{ fontSize: '13px', color: '#888' }}>🔒 Private Content</p>
                        {user.role === 'Director' && (
                          <button onClick={() => setRequestModal({ story: s })} style={reqBtn}>Request Access</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL --- */}
      {requestModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ marginTop: 0, color: '#2d3436' }}>Request Access</h3>
            <textarea 
              placeholder="Hi, I'm interested in your story..." 
              value={directorNote}
              onChange={(e) => setDirectorNote(e.target.value)}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setRequestModal(null)} style={cancelBtn}>Cancel</button>
              <button onClick={sendRequest} style={confirmBtn}>Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Styles ---
const contentWrapperStyle = { position: 'relative', zIndex: 1 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' };
const cardWrapper = { background: 'rgba(255, 255, 255, 0.95)', padding: '25px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.4)' };
const profileHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const avatarWrapper = { width: '50px', height: '50px', borderRadius: '15px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 3px 10px rgba(0,0,0,0.1)' };
const avatarImg = { width: '100%', height: '100%', objectFit: 'cover' };
const tagStyle = { fontSize: '11px', color: '#636e72', background: '#f1f2f6', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' };
const deleteBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', opacity: 0.6 };
const loglineStyle = { fontWeight: '700', fontSize: '18px', color: '#2d3436', marginBottom: '20px', minHeight: '50px', lineHeight: '1.4' };
const viewBtn = { width: '100%', padding: '12px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' };
const detailsBox = { marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #eee' };
const labelStyle = { margin: '0 0 8px 0', fontSize: '10px', color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '1px' };
const downloadLink = { display: 'inline-block', marginTop: '15px', color: '#4834d4', fontWeight: 'bold', textDecoration: 'none', fontSize: '14px' };
const reqBtn = { background: '#6c5ce7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', marginTop: '10px', width: '100%', fontWeight: '600' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' };
const modalContent = { background: '#fff', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '450px' };
const textareaStyle = { width: '100%', height: '120px', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px', resize: 'none', fontSize: '14px', outline: 'none' };
const cancelBtn = { flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#f1f2f6', cursor: 'pointer', fontWeight: '600' };
const confirmBtn = { flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#2d3436', color: '#fff', cursor: 'pointer', fontWeight: '600' };

export default CommonDashboard;