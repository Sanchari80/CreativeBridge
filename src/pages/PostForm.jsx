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
    portfolio: '', // New Field
    contactInfo: '', // New Field
    isSynopsisLocked: true, // Independent Lock
    isFullStoryLocked: true  // Independent Lock
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, fullStoryFile: URL.createObjectURL(file), fileName: file.name });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only Logline and Genre are mandatory as per your rule
    if (!formData.logline || !formData.genre) {
      return alert("Logline and Genre are required!");
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
          {/* Genre Selection - Added more categories */}
          <label style={labelStyle}>Select Genre:</label>
          <select value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} style={inputStyle}>
            <option>Action</option><option>Thriller</option><option>Romance</option><option>Drama</option>
            <option>Comedy</option><option>Sci-Fi</option><option>Horror</option><option>Documentary</option>
          </select>

          {/* Logline (Required & Public) */}
          <label style={labelStyle}>Logline (Required):</label>
          <input 
            placeholder="A short one-line summary..." 
            value={formData.logline} 
            onChange={e => setFormData({...formData, logline: e.target.value})} 
            style={inputStyle} 
          />

          {/* Synopsis & Lock */}
          <div style={sectionBox}>
            <label style={labelStyle}>Synopsis (Optional):</label>
            <textarea 
              placeholder="Brief overview..." 
              value={formData.synopsis} 
              onChange={e => setFormData({...formData, synopsis: e.target.value})} 
              style={{...inputStyle, height: '80px', resize: 'vertical'}} 
            />
            <label style={lockLabel}>
              <input type="checkbox" checked={formData.isSynopsisLocked} onChange={e => setFormData({...formData, isSynopsisLocked: e.target.checked})} />
              Lock Synopsis (Approval required)
            </label>
          </div>

          {/* PDF File & Lock */}
          <div style={sectionBox}>
            <label style={labelStyle}>📄 Full Story File (Optional):</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFile} style={{fontSize: '13px'}} />
            {formData.fileName && <p style={{fontSize: '11px', color: '#20c997'}}>{formData.fileName}</p>}
            <label style={{...lockLabel, marginTop: '10px'}}>
              <input type="checkbox" checked={formData.isFullStoryLocked} onChange={e => setFormData({...formData, isFullStoryLocked: e.target.checked})} />
              Lock Full Story File
            </label>
          </div>

          {/* Portfolio & Contact (Optional) */}
          <div style={sectionBox}>
            <label style={labelStyle}>Writer Portfolio / CV Link:</label>
            <input 
              placeholder="URL or drive link..." 
              value={formData.portfolio} 
              onChange={e => setFormData({...formData, portfolio: e.target.value})} 
              style={inputStyle} 
            />
            <label style={labelStyle}>Contact Info:</label>
            <input 
              placeholder="Email or Phone..." 
              value={formData.contactInfo} 
              onChange={e => setFormData({...formData, contactInfo: e.target.value})} 
              style={inputStyle} 
            />
          </div>

          <button type="submit" className="btn-ash" style={{width: '100%', marginTop: '10px'}}>Publish Story</button>
        </form>
      </div>
    </div>
  );
};

// --- STYLES ---
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' };
const modalContent = { background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const sectionBox = { border: '1px solid #eee', padding: '12px', borderRadius: '10px', margin: '10px 0', background: '#fcfcfc' };
const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#555', display: 'block' };
const lockLabel = { fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' };

export default PostForm;