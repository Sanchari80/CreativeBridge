import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, onValue, push, set, remove } from "firebase/database";

const CommonDashboard = () => {
  const { user, stories, setStories, requests, setRequests, activeStoryId, setActiveStoryId } = useContext(AppContext);
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

  // --- ডাটাবেজ ইউআরএল আপডেট করা হলো ---
  useEffect(() => {
    const db = getDatabase(undefined, "https://kholachithi-default-rtdb.asia-southeast1.firebasedatabase.app/");
    const storiesRef = ref(db, 'stories');
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storyList = Object.entries(data).map(([key, value]) => ({
          ...value,
          firebaseId: key 
        })).reverse();
        setStories(storyList);
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
      setTimeout(() => {
        const element = document.getElementById(`story-${activeStoryId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveStoryId(null); 
      }, 500);
    }
  }, [activeStoryId, setActiveStoryId]);

  useEffect(() => {
    localStorage.setItem('allRequests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('savedStories', JSON.stringify(savedStories));
  }, [savedStories]);

  const deleteStory = (story) => {
    if (window.confirm("Are you sure you want to delete this story?")) {
      const db = getDatabase(undefined, "https://kholachithi-default-rtdb.asia-southeast1.firebasedatabase.app/");
      remove(ref(db, `stories/${story.firebaseId}`))
        .then(() => alert("Story deleted successfully!"))
        .catch((err) => alert("Error: " + err.message));
    }
  };

  const toggleSaveStory = (storyId) => {
    if (savedStories.includes(storyId)) {
      setSavedStories(savedStories.filter(id => id !== storyId));
    } else {
      setSavedStories([...savedStories, storyId]);
    }
  };

  const sendRequest = (type) => {
    if (!requestModal) return;
    const { story } = requestModal;
    
    const alreadySent = requests.find(r => 
      r.storyId === story.id && 
      r.directorName === displayName && 
      r.requestType === type
    );
    
    if (alreadySent) return alert(`Already sent a ${type} request!`);

    const newRequest = { 
      id: Date.now(), 
      storyId: story.id, 
      firebaseId: story.firebaseId,
      writerName: story.writerName, 
      directorName: displayName,
      directorPic: user?.profilePic,
      status: 'pending',
      requestType: type,
      note: directorNote,
      timestamp: Date.now()
    };

    const db = getDatabase(undefined, "https://kholachithi-default-rtdb.asia-southeast1.firebasedatabase.app/");
    const requestsRef = ref(db, 'requests');
    push(requestsRef, newRequest)
      .then(() => {
        setRequests([...requests, newRequest]);
        setRequestModal(null);
        setDirectorNote("");
        alert("Request sent successfully to the writer!");
      })
      .catch(err => alert("Failed to send request: " + err.message));
  };

  const filteredStories = stories.filter(s => {
    if (selectedCategory === "Saved") return savedStories.includes(s.id);
    if (selectedCategory === "All") return true;
    return s.genre === selectedCategory; 
  });

  if (expandedStory && activeStoryId === null) {
    const s = stories.find(item => item.id === expandedStory);
    if (s) {
      const isOwner = s.writerName === displayName;
      const checkAccess = (type) => requests.find(r => r.storyId === s.id && r.directorName === displayName && r.status === 'approved' && r.requestType === type);
      const canSeeSynopsis = !s.isSynopsisLocked || checkAccess('synopsis') || isOwner;
      const canSeeFullStory = !s.isFullStoryLocked || checkAccess('fullStory') || isOwner;

      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <button onClick={() => setExpandedStory(null)} style={backBtnStyle}>← Back to Dashboard</button>
          <div style={cardWrapper}>
            <div style={profileHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={avatarWrapper}>
                  <img src={isOwner ? (user?.profilePic || "/icon.png") : (s.writerPic || "/icon.png")} alt="p" style={avatarImg} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#2d3436' }}>{s.writerName}</strong>
                  <span style={tagStyle}>{s.genre || "Creator"}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => toggleSaveStory(s.id)} style={{ ...deleteBtn, opacity: 1 }}>
                  {savedStories.includes(s.id) ? "⭐" : "☆"}
                </button>
                {isOwner && (
                  <button onClick={() => deleteStory(s)} style={{ ...deleteBtn, color: '#e74c3c' }}>🗑️</button>
                )}
              </div>
            </div>
            <h2 style={{ margin: '0 0 5px 0', color: '#4834d4', fontSize: '22px' }}>{s.Name || "Untitled Story"}</h2>
            <p style={loglineStyle}>{s.logline}</p>
            <div style={detailsBox}>
              <div style={{ marginBottom: '15px' }}>
                <h5 style={labelStyle}>Synopsis</h5>
                {canSeeSynopsis ? <p style={{ fontSize: '14px', color: '#444' }}>{s.synopsis}</p> : <div style={lockedBox}><span>🔒 Locked</span><button onClick={() => setRequestModal({ story: s, type: 'synopsis' })} style={smallReqBtn}>Request</button></div>}
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <h5 style={labelStyle}>Full Story</h5>
                {canSeeFullStory ? (s.fullStoryFile ? <a href={s.fullStoryFile} download style={downloadLink}>📄 Download Script</a> : "No file") : <div style={lockedBox}><span>🔒 Locked</span><button onClick={() => setRequestModal({ story: s, type: 'fullStory' })} style={smallReqBtn}>Request</button></div>}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="dashboard-wrapper" style={{ position: 'relative' }}>
      {requestModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{marginTop: 0}}>Request {requestModal.type}</h3>
            <textarea 
              style={textareaStyle} 
              placeholder="Write a note to the writer..." 
              value={directorNote} 
              onChange={(e) => setDirectorNote(e.target.value)}
            />
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={() => setRequestModal(null)} style={cancelBtn}>Cancel</button>
              <button onClick={() => sendRequest(requestModal.type)} style={confirmBtn}>Send Request</button>
            </div>
          </div>
        </div>
      )}

      <div style={categoryTabWrapper}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ ...categoryBtn, background: selectedCategory === cat ? '#2d3436' : '#fff', color: selectedCategory === cat ? '#fff' : '#2d3436' }}>
            {cat === "Saved" ? `⭐ ${cat}` : cat}
          </button>
        ))}
      </div>

      <div className="main-content" style={contentWrapperStyle}>
        <div className="story-grid" style={gridStyle}>
          {filteredStories.map(s => {
            const isOwner = s.writerName === displayName;
            return (
              <div key={s.id} id={`story-${s.id}`} style={cardWrapper}>
                <div style={profileHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={avatarWrapper}>
                      <img src={isOwner ? (user?.profilePic || "/icon.png") : (s.writerPic || "/icon.png")} alt="p" style={avatarImg} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px', color: '#2d3436' }}>{s.writerName}</strong>
                      <span style={tagStyle}>{s.genre || "Creator"}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => toggleSaveStory(s.id)} style={{ ...deleteBtn, opacity: 1 }}>
                      {savedStories.includes(s.id) ? "⭐" : "☆"}
                    </button>
                    {isOwner && (
                      <button onClick={() => deleteStory(s)} style={{ ...deleteBtn, color: '#e74c3c' }}>🗑️</button>
                    )}
                  </div>
                </div>
                <h4 style={{ margin: '0 0 5px 0', color: '#4834d4', fontSize: '16px' }}>{s.Name || "Untitled"}</h4>
                <p style={{ ...loglineStyle, fontSize: '15px', minHeight: '40px' }}>{s.logline}</p>
                <button onClick={() => setExpandedStory(s.id)} style={viewBtn}>View Details</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Styles (তোর আগের গুলোই আছে) ---
const backBtnStyle = { marginBottom: '20px', padding: '8px 15px', background: '#f1f2f6', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const categoryTabWrapper = { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '20px', marginBottom: '20px', scrollbarWidth: 'none' };
const categoryBtn = { padding: '8px 18px', borderRadius: '20px', border: '1px solid #ddd', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: '0.3s', whiteSpace: 'nowrap' };
const lockedBox = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #eee', marginTop: '5px' };
const smallReqBtn = { background: '#6c5ce7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };
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
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' };
const modalContent = { background: '#fff', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '450px' };
const textareaStyle = { width: '100%', height: '120px', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px', resize: 'none', fontSize: '14px', outline: 'none' };
const cancelBtn = { flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#f1f2f6', cursor: 'pointer', fontWeight: '600' };
const confirmBtn = { flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#2d3436', color: '#fff', cursor: 'pointer', fontWeight: '600' };

export default CommonDashboard;