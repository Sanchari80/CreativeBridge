import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
// শুধু এই একটি লাইন নতুন যোগ করা হয়েছে db শেয়ার করার জন্য
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
    // এখানে আলাদা getDatabase এর বদলে শেয়ারড db ব্যবহার করা হয়েছে
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

  const toggleSave = (id) => {
    let newSaved = [...savedStories];
    if (newSaved.includes(id)) {
      newSaved = newSaved.filter(item => item !== id);
    } else {
      newSaved.push(id);
    }
    setSavedStories(newSaved);
    localStorage.setItem('savedStories', JSON.stringify(newSaved));
  };

  const handleRequest = () => {
    if (!requestModal || !user) return;
    const { story, type } = requestModal;
    sendRequest(story.writerEmail || story.email, story.Name || story.title, story.id, type, directorNote);
    setRequestModal(null);
    setDirectorNote("");
  };

  const filteredStories = stories.filter(s => 
    selectedCategory === "Saved" ? savedStories.includes(s.id) : 
    selectedCategory === "All" || s.genre === selectedCategory
  );

  return (
    <div className="dashboard-wrapper" style={{ position: 'relative' }}>
      
      {/* Category Bar */}
      <div style={{ display: 'flex', gap: '10px', padding: '15px', overflowX: 'auto', background: '#fff' }}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #eee', cursor: 'pointer',
              background: selectedCategory === cat ? '#2d3436' : '#fff', color: selectedCategory === cat ? '#fff' : '#2d3436'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {requestModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{marginTop: 0}}>Request {requestModal.type === 'fullStory' ? 'Script Access' : 'Synopsis Access'}</h3>
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
          const isOwner = s.writerEmail === user?.email || s.email === user?.email;
          const checkAccess = (type) => requests?.find(r => r.storyId === s.id && r.fromEmail === user?.email && r.status === 'approved');
          
          const hasSynopsisAccess = !s.isSynopsisLocked || checkAccess('synopsis') || isOwner;
          const hasFullStoryAccess = !s.isFullStoryLocked || checkAccess('fullStory') || isOwner;
          // Contact Access logic (approval required if locked)
          const hasContactAccess = !s.isContactLocked || checkAccess('fullStory') || checkAccess('synopsis') || isOwner;

          return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                <button onClick={() => setExpandedStory(null)} style={backBtnStyle}>← Back to Dashboard</button>
                {isOwner && (
                  <button onClick={() => { deleteStory(s.id); setExpandedStory(null); }} style={{...backBtnStyle, background: '#ff4757', color: '#fff'}}>Delete Story</button>
                )}
              </div>
              
              <div style={cardWrapper}>
                <div style={profileHeader}>
                  <img src={isOwner ? (user?.profilePic || "/icon.png") : (s.writerPic || s.profilePic || "/icon.png")} alt="p" style={avatarImg} />
                  <div style={{marginLeft: '12px', flex: 1}}>
                    <strong style={{display: 'block'}}>{s.writerName || "Unknown Writer"}</strong>
                    <span style={tagStyle}>{s.genre}</span>
                  </div>
                  <button onClick={() => toggleSave(s.id)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px'}}>
                    {savedStories.includes(s.id) ? '❤️' : '🤍'}
                  </button>
                </div>

                <h2 style={{color: '#4834d4'}}>{s.Name}</h2>
                <p style={loglineStyle}>{s.logline}</p>

                <div style={detailsBox}>
                  <div style={{marginBottom: '20px'}}>
                    <h5 style={labelStyle}>Synopsis / Outline</h5>
                    {hasSynopsisAccess ? <p style={{fontSize: '14px', whiteSpace: 'pre-wrap'}}>{s.synopsis}</p> : (
                      <div style={lockedBox}><span>🔒 Locked</span><button onClick={() => setRequestModal({story: s, type: 'synopsis'})} style={smallReqBtn}>Request Access</button></div>
                    )}
                  </div>

                  <div style={{borderTop: '1px solid #eee', paddingTop: '15px', marginBottom: '20px'}}>
                    <h5 style={labelStyle}>Full Story / Script</h5>
                    {hasFullStoryAccess ? (
                      // ফিক্স: মালিক বা এপ্রুভড ডিরেক্টর ফাইল লিঙ্ক দেখবে
                      (s.fullStoryFile || s.fullStoryPath) ? (
                        <a href={s.fullStoryFile || s.fullStoryPath} target="_blank" rel="noreferrer" style={downloadLink}>
                          📄 {s.fileName || "View Script"}
                        </a>
                      ) : "No file uploaded"
                    ) : (
                      <div style={lockedBox}><span>🔒 Locked</span><button onClick={() => setRequestModal({story: s, type: 'fullStory'})} style={smallReqBtn}>Request Script</button></div>
                    )}
                  </div>

                  <div style={{borderTop: '1px solid #eee', paddingTop: '15px'}}>
                    <h5 style={labelStyle}>Writer's Info & Portfolio</h5>
                    <div style={{fontSize: '13px'}}>
                      {hasContactAccess ? (
                        <>
                          <p>📞 Contact: {s.contactInfo || "No contact info shared"}</p>
                          <p>📧 Email: {s.writerEmail || s.email}</p>
                          {s.portfolio && (
                            <p style={{marginTop: '10px'}}>🌐 Portfolio: <a href={s.portfolio} target="_blank" rel="noreferrer" style={{color: '#6c5ce7', textDecoration: 'none'}}>{s.portfolio}</a></p>
                          )}
                        </>
                      ) : (
                        <div style={lockedBox}>
                          <span>🔒 Contact & Portfolio Locked</span>
                          <button onClick={() => setRequestModal({story: s, type: 'fullStory'})} style={smallReqBtn}>Request Access</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div style={gridStyle}>
          {filteredStories.map(s => {
            const isOwner = s.writerEmail === user?.email || s.email === user?.email;
            return (
              <div key={s.id} style={cardWrapper}>
                <div style={profileHeader}>
                  <img src={isOwner ? (user?.profilePic || "/icon.png") : (s.writerPic || s.profilePic || "/icon.png")} alt="p" style={avatarImg} />
                  <div style={{marginLeft: '12px', flex: 1}}>
                    <strong>{s.writerName}</strong>
                    <div style={tagStyle}>{s.genre}</div>
                  </div>
                  <button onClick={() => toggleSave(s.id)} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                    {savedStories.includes(s.id) ? '❤️' : '🤍'}
                  </button>
                </div>
                <h4 style={{color: '#4834d4'}}>{s.Name}</h4>
                <p style={{...loglineStyle, fontSize: '14px', height: '40px', overflow: 'hidden'}}>{s.logline}</p>
                
                <div style={{display: 'flex', gap: '10px'}}>
                  <button onClick={() => setExpandedStory(s.id)} style={{...viewBtn, flex: 2}}>View Details</button>
                  {isOwner && (
                    <button onClick={() => { if(window.confirm("Delete this story?")) deleteStory(s.id) }} style={{...viewBtn, flex: 1, background: '#ff4757'}}>Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- STYLES (Exactly same as original) ---
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
const backBtnStyle = { padding: '8px 15px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: '#f1f2f6' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' };
const textareaStyle = { width: '100%', height: '100px', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '15px' };
const cancelBtn = { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer' };
const confirmBtn = { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#2d3436', color: '#fff', cursor: 'pointer' };
const downloadLink = { color: '#4834d4', fontWeight: 'bold', textDecoration: 'none' };

export default CommonDashboard;