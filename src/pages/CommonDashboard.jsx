import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
// শুধু এই একটি লাইন নতুন যোগ করা হয়েছে db শেয়ার করার জন্য
import { db } from '../App.jsx'; 

const CommonDashboard = () => {
  const { 
    user, stories, setStories, requests, 
    activeStoryId, setActiveStoryId, deleteStory, sendRequest 
  } = useContext(AppContext);

  const [expandedStory, setExpandedStory] = useState(null);
  const [requestModal, setRequestModal] = useState(null); 
  const [directorNote, setDirectorNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const [savedStories, setSavedStories] = useState(() => {
    const saved = localStorage.getItem('savedStories');
    return saved ? JSON.parse(saved) : [];
  });

  const displayName = user?.name || user?.email?.split('@')[0] || "User";
  const categories = ["All", "Thriller", "Romance", "Drama", "Action", "Comedy", "Horror", "Sci-Fi", "Saved"];

  useEffect(() => {
    // এখানে আলাদা getDatabase এর বদলে শেয়ারড db ব্যবহার করা হয়েছে
    const storiesRef = ref(db, 'stories');
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStories(Object.entries(data).map(([key, value]) => ({ ...value, id: key })).reverse());
      } else {
        setStories([]);
      }
    });
    return () => unsubscribe();
  }, [setStories]);

  useEffect(() => {
    if (activeStoryId) {
      setSelectedCategory("All");
      setExpandedStory(activeStoryId); 
      setActiveStoryId(null); 
    }
  }, [activeStoryId, setActiveStoryId]);

  const handleRequest = () => {
    if (!requestModal || !user) return;
    const { story, type } = requestModal;
    sendRequest(story.writerEmail || story.email, story.Name || story.title, story.id, type, directorNote);
    setRequestModal(null);
    setDirectorNote("");
  };

  const filteredStories = stories.filter(s => selectedCategory === "Saved" ? savedStories.includes(s.id) : selectedCategory === "All" || s.genre === selectedCategory);

  return (
    <div className="dashboard-wrapper" style={{ position: 'relative' }}>
      
      {requestModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{marginTop: 0}}>Request {requestModal.type}</h3>
            <textarea style={textareaStyle} placeholder="Note to writer..." value={directorNote} onChange={(e) => setDirectorNote(e.target.value)} />
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={() => setRequestModal(null)} style={cancelBtn}>Cancel</button>
              <button onClick={handleRequest} style={confirmBtn}>Send Request</button>
            </div>
          </div>
        </div>
      )}

      {expandedStory ? (
        (() => {
          const s = stories.find(item => item.id === expandedStory);
          if (!s) return null;
          const isOwner = s.writerEmail === user?.email;
          const checkAccess = (type) => requests?.find(r => r.storyId === s.id && r.fromEmail === user?.email && r.status === 'approved');
          const hasSynopsisAccess = !s.isSynopsisLocked || checkAccess('synopsis') || isOwner;
          const hasFullStoryAccess = !s.isFullStoryLocked || checkAccess('fullStory') || isOwner;

          return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
              <button onClick={() => setExpandedStory(null)} style={backBtnStyle}>← Back to Dashboard</button>
              <div style={cardWrapper}>
                <div style={profileHeader}>
                  <img src={isOwner ? (user?.profilePic || "/icon.png") : (s.writerPic || s.profilePic || "/icon.png")} alt="p" style={avatarImg} />
                  <div style={{marginLeft: '12px'}}>
                    <strong style={{display: 'block'}}>{s.writerName}</strong>
                    <span style={tagStyle}>{s.genre}</span>
                  </div>
                </div>

                <h2 style={{color: '#4834d4'}}>{s.Name}</h2>
                <p style={loglineStyle}>{s.logline}</p>

                <div style={detailsBox}>
                  <div style={{marginBottom: '20px'}}>
                    <h5 style={labelStyle}>Synopsis / Outline</h5>
                    {hasSynopsisAccess ? <p style={{fontSize: '14px'}}>{s.synopsis}</p> : (
                      <div style={lockedBox}><span>🔒 Locked</span><button onClick={() => setRequestModal({story: s, type: 'synopsis'})} style={smallReqBtn}>Request Access</button></div>
                    )}
                  </div>

                  <div style={{borderTop: '1px solid #eee', paddingTop: '15px', marginBottom: '20px'}}>
                    <h5 style={labelStyle}>Full Story / Script</h5>
                    {hasFullStoryAccess ? (
                      s.fullStoryFile ? <a href={s.fullStoryFile} download style={downloadLink}>📄 Download Script</a> : "No file uploaded"
                    ) : (
                      <div style={lockedBox}><span>🔒 Locked</span><button onClick={() => setRequestModal({story: s, type: 'fullStory'})} style={smallReqBtn}>Request Script</button></div>
                    )}
                  </div>

                  {!isOwner && user.role === 'Director' && (
                    <div style={{borderTop: '1px solid #eee', paddingTop: '15px'}}>
                      <h5 style={labelStyle}>Writer's Info & Portfolio</h5>
                      <div style={{fontSize: '13px'}}>
                         <p>📧 Email: {checkAccess('fullStory') ? (s.writerEmail || s.email) : "Locked"}</p>
                         {s.portfolio && <p>🌐 Portfolio: <a href={s.portfolio} target="_blank" rel="noreferrer" style={{color: '#6c5ce7', textDecoration: 'none'}}>{s.portfolio}</a></p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div style={gridStyle}>
          {filteredStories.map(s => {
            const isOwner = s.writerEmail === user?.email;
            return (
              <div key={s.id} style={cardWrapper}>
                <div style={profileHeader}>
                  <img src={isOwner ? (user?.profilePic || "/icon.png") : (s.writerPic || s.profilePic || "/icon.png")} alt="p" style={avatarImg} />
                  <div style={{marginLeft: '12px'}}>
                    <strong>{s.writerName}</strong>
                    <div style={tagStyle}>{s.genre}</div>
                  </div>
                </div>
                <h4 style={{color: '#4834d4'}}>{s.Name}</h4>
                <p style={{...loglineStyle, fontSize: '14px'}}>{s.logline}</p>
                <button onClick={() => setExpandedStory(s.id)} style={viewBtn}>View Details</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- STYLES (Hubuhu same) ---
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' };
const modalContent = { background: '#fff', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px' };
const cardWrapper = { background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', marginBottom: '20px' };
const profileHeader = { display: 'flex', alignItems: 'center', marginBottom: '15px' };
const avatarImg = { width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' };
const tagStyle = { fontSize: '11px', color: '#636e72', background: '#f1f2f6', padding: '2px 8px', borderRadius: '10px' };
const loglineStyle = { fontWeight: '600', color: '#2d3436', marginBottom: '15px' };
const viewBtn = { width: '100%', padding: '10px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' };
const detailsBox = { marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '12px' };
const labelStyle = { margin: '0 0 8px 0', fontSize: '10px', color: '#adb5bd', textTransform: 'uppercase' };
const lockedBox = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #eee' };
const smallReqBtn = { background: '#6c5ce7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' };
const backBtnStyle = { marginBottom: '20px', padding: '8px 15px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' };
const textareaStyle = { width: '100%', height: '100px', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '15px' };
const cancelBtn = { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer' };
const confirmBtn = { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#2d3436', color: '#fff', cursor: 'pointer' };
const downloadLink = { color: '#4834d4', fontWeight: 'bold', textDecoration: 'none' };

export default CommonDashboard;