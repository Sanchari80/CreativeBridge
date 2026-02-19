import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, push, set } from "firebase/database";
// App.jsx থেকে db ইম্পোর্ট করো
import { db } from '../App.jsx'; 

const PostForm = ({ closeForm }) => {
  const { user } = useContext(AppContext);
  const [formData, setFormData] = useState({
    Name: '',
    logline: '',
    synopsis: '',
    fullStoryFile: null,
    fileName: '',
    genre: 'Action',
    portfolio: '', 
    contactInfo: '', 
    isSynopsisLocked: false, 
    isFullStoryLocked: true,
    isContactLocked: true 
  });

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ 
        ...prev, 
        contactInfo: user.email,
        portfolio: user.portfolio || "" 
      }));
    }
  }, [user]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, fullStoryFile: file, fileName: file.name });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.Name?.trim()) return alert("Story Name is required!");
    if (!formData.logline?.trim()) return alert("Logline is required!");
    if (!formData.contactInfo?.trim()) return alert("Contact Info is required!");

    // এখানে আলাদা getDatabase এর বদলে App.jsx এর db ব্যবহার করা হয়েছে
    const storiesRef = ref(db, 'stories');
    const newStoryRef = push(storiesRef); 

    const { fullStoryFile, ...otherData } = formData;

    const newStory = {
      ...otherData,
      writerId: user?.id || Date.now(),
      writerName: user?.name || "Anonymous",
      writerEmail: user?.email, 
      writerPic: user?.profilePic || "/icon.png",
      writerProfession: user?.profession || "Writer",
      fullStoryFile: "", 
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    set(newStoryRef, newStory)
      .then(() => {
        alert("Story Published Successfully!");
        closeForm(); 
      })
      .catch((error) => {
        alert("Publishing Failed: " + error.message);
      });
  };

  return (
    <div style={modalOverlay}>
      <div className="card" style={modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{margin: 0, color: '#2d3436'}}>Create New Story</h3>
          <button onClick={closeForm} style={closeBtn}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Select Genre *:</label>
          <select value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} style={inputStyle}>
            <option>Action</option><option>Thriller</option><option>Romance</option><option>Drama</option>
            <option>Comedy</option><option>Sci-Fi</option><option>Horror</option><option>Documentary</option>
          </select>
            
          <label style={labelStyle}>Name (Required) *:</label>
          <input placeholder="Story Title..." value={formData.Name} onChange={e => setFormData({...formData, Name: e.target.value})} style={inputStyle} />

          <label style={labelStyle}>Logline (Required) *:</label>
          <input placeholder="Short one-line summary..." value={formData.logline} onChange={e => setFormData({...formData, logline: e.target.value})} style={inputStyle} />

          <div style={sectionBox}>
            <div style={flexSpace}>
              <label style={labelStyle}>Synopsis (Optional):</label>
              <label style={lockToggle}>
                <input type="checkbox" checked={formData.isSynopsisLocked} onChange={e => setFormData({...formData, isSynopsisLocked: e.target.checked})} />
                {formData.isSynopsisLocked ? "🔒 Locked" : "🔓 Public"}
              </label>
            </div>
            <textarea placeholder="Brief overview..." value={formData.synopsis} onChange={e => setFormData({...formData, synopsis: e.target.value})} style={{...inputStyle, height: '70px', resize: 'none'}} />
          </div>

          <div style={sectionBox}>
            <div style={flexSpace}>
              <label style={labelStyle}>📄 Full Story File (Optional):</label>
              <label style={lockToggle}>
                <input type="checkbox" checked={formData.isFullStoryLocked} onChange={e => setFormData({...formData, isFullStoryLocked: e.target.checked})} />
                {formData.isFullStoryLocked ? "🔒 Locked" : "🔓 Public"}
              </label>
            </div>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFile} style={{fontSize: '12px', marginTop: '5px'}} />
            {formData.fileName && <div style={{fontSize: '11px', color: '#2ecc71'}}>Selected: {formData.fileName}</div>}
          </div>

          <div style={sectionBox}>
            <div style={flexSpace}>
              <label style={labelStyle}>Portfolio & Contact Info:</label>
              <label style={lockToggle}>
                <input type="checkbox" checked={formData.isContactLocked} onChange={e => setFormData({...formData, isContactLocked: e.target.checked})} />
                {formData.isContactLocked ? "🔒 Locked" : "🔓 Public"}
              </label>
            </div>
            <input placeholder="Portfolio URL..." value={formData.portfolio} onChange={e => setFormData({...formData, portfolio: e.target.value})} style={inputStyle} />
            <input placeholder="Email or Phone..." value={formData.contactInfo} onChange={e => setFormData({...formData, contactInfo: e.target.value})} style={inputStyle} />
          </div>

          <button type="submit" style={btnStyle}>Publish Story</button>
        </form>
      </div>
    </div>
  );
};

// Styles (Same as before)
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(5px)' };
const modalContent = { background: 'white', padding: '20px', borderRadius: '20px', width: '95%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' };
const inputStyle = { width: '100%', padding: '12px', margin: '6px 0', borderRadius: '10px', border: '1px solid #eee', background: '#f9f9f9', boxSizing: 'border-box', outline: 'none', fontSize: '14px' };
const sectionBox = { border: '1px solid #f0f0f0', padding: '10px', borderRadius: '12px', margin: '8px 0', background: '#fff' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#666' };
const flexSpace = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' };
const lockToggle = { fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#6c5ce7' };
const btnStyle = { width: '100%', padding: '14px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' };
const closeBtn = { border: 'none', background: '#eee', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' };

export default PostForm;