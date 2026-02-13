import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

const CommonDashboard = () => {
  // ১. activeStoryState যোগ করা হয়েছে যাতে নোটিফিকেশন থেকে আসা স্টোরিটি সরাসরি ওপেন হয়
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

  // ২. নোটিফিকেশন থেকে আসা স্টোরি আইডি থাকলে সেটি অটোমেটিক এক্সপ্যান্ড (Open) করবে
  useEffect(() => {
    if (activeStoryId) {
      setExpandedStory(activeStoryId);
      setSelectedCategory("All"); // নিশ্চিত করতে যে স্টোরিটি ফিল্টারে দেখা যাবে
      
      // স্ক্রল করে ওই স্টোরিতে নিয়ে যাওয়ার জন্য
      setTimeout(() => {
        const element = document.getElementById(`story-${activeStoryId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveStoryId(null); // কাজ শেষ হলে আইডি ক্লিয়ার করে দিন
      }, 500);
    }
  }, [activeStoryId, setActiveStoryId]);

  useEffect(() => {
    localStorage.setItem('allRequests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('allStories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('savedStories', JSON.stringify(savedStories));
  }, [savedStories]);

  const deleteStory = (storyId) => {
    if (window.confirm("Are you sure you want to delete this story?")) {
      const updatedStories = stories.filter(s => s.id !== storyId);
      setStories(updatedStories);
      const updatedRequests = requests.filter(r => r.storyId !== storyId);
      setRequests(updatedRequests);
      alert("Story deleted successfully!");
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
    
    if (alreadySent) return alert(`Already sent a ${type} request for this story!`);

    const newRequest = { 
      id: Date.now(), 
      storyId: story.id, 
      writerName: story.writerName, 
      directorName: displayName,
      status: 'pending',
      requestType: type,
      note: directorNote 
    };

    setRequests([...requests, newRequest]);
    setRequestModal(null);
    setDirectorNote("");
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} request sent successfully!`);
  };

  const filteredStories = stories.filter(s => {
    const isApproved = requests.some(r => r.storyId === s.id && r.directorName === displayName && r.status === 'approved');
    if (selectedCategory === "Saved") return savedStories.includes(s.id);
    if (selectedCategory === "All") return true;
    const matchesCategory = s.genre === selectedCategory;
    return matchesCategory || isApproved; 
  });

  return (
    <div className="dashboard-wrapper" style={{ position: 'relative' }}>
      
      <div style={categoryTabWrapper}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            style={{
              ...categoryBtn,
              background: selectedCategory === cat ? '#2d3436' : '#fff',
              color: selectedCategory === cat ? '#fff' : '#2d3436'
            }}
          >
            {cat === "Saved" ? `⭐ ${cat}` : cat}
          </button>
        ))}
      </div>

      <div className="main-content" style={contentWrapperStyle}>
        <div className="story-grid" style={gridStyle}>
          {filteredStories.map(s => {
            const isExpanded = expandedStory === s.id;
            const isOwner = s.writerName === displayName;
            const isSaved = savedStories.includes(s.id);

            const checkAccess = (type) => {
                return requests.find(r => 
                  r.storyId === s.id && r.directorName === displayName && r.status === 'approved' && r.requestType === type
                );
            };

            const canSeeSynopsis = !s.isSynopsisLocked || checkAccess('synopsis') || isOwner;
            const canSeeFullStory = !s.isFullStoryLocked || checkAccess('fullStory') || isOwner;
            const canSeeContact = !s.isContactLocked || checkAccess('contactInfo') || isOwner;

            return (
              <div key={s.id} id={`story-${s.id}`} style={cardWrapper}>
                <div style={profileHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={avatarWrapper}>
                      {/* ৩. ইউজার প্রোফাইল পিকচার লজিক আপডেট করা হয়েছে */}
                      <img 
                        src={isOwner ? (user?.profilePic || "/icon.png") : (s.writerPic || "/icon.png")} 
                        alt="p" 
                        style={avatarImg} 
                      />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px', color: '#2d3436' }}>{s.writerName}</strong>
                      <span style={tagStyle}>{s.genre || "Creator"}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => toggleSaveStory(s.id)} style={{ ...deleteBtn, opacity: 1 }}>
                      {isSaved ? "⭐" : "☆"}
                    </button>
                    {isOwner && (
                      <button onClick={() => deleteStory(s.id)} style={deleteBtn}>🗑️</button>
                    )}
                  </div>
                </div>

                <p style={loglineStyle}>{s.logline}</p>
                
                <button onClick={() => setExpandedStory(isExpanded ? null : s.id)} style={viewBtn}>
                  {isExpanded ? "Close Details" : "View Details"}
                </button>

                {isExpanded && (
                  <div style={detailsBox}>
                    {/* ... (বাকি ডিটেইলস সেকশন অপরিবর্তিত) ... */}
                    <div style={{ marginBottom: '15px' }}>
                      <h5 style={labelStyle}>Synopsis</h5>
                      {canSeeSynopsis ? (
                        <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.5' }}>{s.synopsis || "No synopsis provided."}</p>
                      ) : (
                        <div style={lockedBox}>
                          <span style={{ fontSize: '12px' }}>🔒 Synopsis Locked</span>
                          <button onClick={() => setRequestModal({ story: s, type: 'synopsis' })} style={smallReqBtn}>Request</button>
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginBottom: '15px' }}>
                      <h5 style={labelStyle}>Full Story / Script</h5>
                      {canSeeFullStory ? (
                        s.fullStoryFile ? (
                          <a href={s.fullStoryFile} download style={downloadLink}>📄 Download Script</a>
                        ) : <p style={{ fontSize: '12px', color: '#888' }}>No file uploaded.</p>
                      ) : (
                        <div style={lockedBox}>
                          <span style={{ fontSize: '12px' }}>🔒 Story Locked</span>
                          <button onClick={() => setRequestModal({ story: s, type: 'fullStory' })} style={smallReqBtn}>Request</button>
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                      <h5 style={labelStyle}>Contact & Portfolio</h5>
                      {canSeeContact ? (
                        <div style={{ fontSize: '13px', color: '#2d3436' }}>
                          <p><strong>Contact:</strong> {s.contactInfo || "N/A"}</p>
                          {s.portfolio && <p><strong>Portfolio:</strong> <a href={s.portfolio} target="_blank" rel="noreferrer" style={{color: '#6c5ce7'}}>Link</a></p>}
                        </div>
                      ) : (
                        <div style={lockedBox}>
                          <span style={{ fontSize: '12px' }}>🔒 Contact Locked</span>
                          <button onClick={() => setRequestModal({ story: s, type: 'contactInfo' })} style={smallReqBtn}>Request</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {requestModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ marginTop: 0, color: '#2d3436' }}>Request {requestModal.type}</h3>
            <textarea 
              placeholder="Write a note to the writer..." 
              value={directorNote}
              onChange={(e) => setDirectorNote(e.target.value)}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setRequestModal(null)} style={cancelBtn}>Cancel</button>
              <button onClick={() => sendRequest(requestModal.type)} style={confirmBtn}>Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles (Unchanged)
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