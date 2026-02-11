import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const PostForm = ({ closeForm }) => {
  const { user, stories, setStories } = useContext(AppContext);
  const [formData, setFormData] = useState({
    logline: '',
    synopsis: '',
    fullStoryFile: null,
    fileName: '',
    genre: 'Action',
    isLocked: true, // এটি ফাইল লক রাখবে
    isContactLocked: true 
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      // লোকাল স্টোরেজের জন্য URL তৈরি (রিয়েল অ্যাপে এটি সার্ভার লিঙ্কে রিপ্লেস হবে)
      setFormData({ ...formData, fullStoryFile: URL.createObjectURL(file), fileName: file.name });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.logline || !formData.synopsis || !formData.fullStoryFile) {
      return alert("Logline, Synopsis & Story File are required!");
    }

    const newStory = {
      ...formData,
      id: Date.now(),
      writerName: user.name,
      writerPic: user.pic,
      writerProfession: user.profession,
      createdAt: new Date().toLocaleDateString()
    };

    setStories([newStory, ...stories]);
    alert("Story Published Successfully!");
    closeForm(); 
  };

  return (
    <div style={modalOverlay}>
      <div className="card" style={modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{margin: 0, color: '#4A4A4A'}}>Create New Story</h3>
          <button onClick={closeForm} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '24px', color: '#999' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Genre Selection */}
          <label style={labelStyle}>Select Genre:</label>
          <select value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} style={inputStyle}>
            <option>Action</option><option>Thriller</option><option>Drama</option><option>Comedy</option><option>Sci-Fi</option><option>Horror</option>
          </select>

          {/* Logline (Public) */}
          <label style={labelStyle}>Logline (Publicly Visible):</label>
          <input 
            placeholder="A short one-line summary..." 
            value={formData.logline} 
            onChange={e => setFormData({...formData, logline: e.target.value})} 
            style={inputStyle} 
          />

          {/* Synopsis (Public/Approval Based) */}
          <label style={labelStyle}>Synopsis:</label>
          <textarea 
            placeholder="Write a brief overview of your story..." 
            value={formData.synopsis} 
            onChange={e => setFormData({...formData, synopsis: e.target.value})} 
            style={{...inputStyle, height: '100px', resize: 'vertical'}} 
          />

          {/* PDF File Upload (Locked by Default) */}
          <div style={sectionBox}>
            <label style={labelStyle}>📄 Upload Full Story (Locked PDF/Word):</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFile} style={{fontSize: '13px'}} />
            {formData.fileName && <p style={{fontSize: '12px', color: '#20c997', marginTop: '5px'}}>Selected: {formData.fileName}</p>}
            <p style={{fontSize: '11px', color: '#888', marginTop: '5px'}}>*This file will only be visible after you approve a request.</p>
          </div>

          {/* Locking Status Visual (Optional) */}
          <div style={lockBadge}>
            <span style={{fontSize: '12px'}}>🔒 Full Story File is **Locked** by default</span>
          </div>

          <button type="submit" className="btn-ash" style={{width: '100%', marginTop: '10px'}}>Publish Story</button>
        </form>
      </div>
    </div>
  );
};

// --- STYLES ---
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' };
const modalContent = { background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' };
const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'inherit' };
const sectionBox = { border: '1px solid #eee', padding: '15px', borderRadius: '10px', margin: '15px 0', background: '#fcfcfc' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '2px' };
const lockBadge = { background: '#fff3cd', color: '#856404', padding: '8px', borderRadius: '6px', textAlign: 'center', marginBottom: '15px', border: '1px solid #ffeeba' };

export default PostForm;