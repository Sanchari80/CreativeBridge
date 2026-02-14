import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, push, set } from "firebase/database";

const PostForm = ({ closeForm }) => {
  const { user } = useContext(AppContext);
  const [formData, setFormData] = useState({
    Name: '', // ১. এখানে Name ফিল্ডটি ফাঁকা ছিল, তাই পোস্ট হচ্ছিল না
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

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, fullStoryFile: URL.createObjectURL(file), fileName: file.name });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ২. ফিল্ড চেক করার সময় Name ঠিকমতো চেক হচ্ছে কিনা নিশ্চিত করা
    if (!formData.Name.trim() || !formData.logline.trim() || !formData.genre) {
      return alert("Name, Logline and Genre are required!");
    }
    
    if (!formData.contactInfo.trim()) {
      return alert("Please provide at least an Email or Phone number in Contact Info!");
    }

    const newStory = {
      ...formData,
      writerName: user?.name || user?.email?.split('@')[0], // ইউজার নেম না থাকলে ইমেল থেকে নেবে
      writerPic: user?.profilePic || "/icon.png",
      writerProfession: user?.profession || "Writer",
      createdAt: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };

    const db = getDatabase();
    const storiesRef = ref(db, 'stories');
    const newStoryRef = push(storiesRef); 
    
    set(newStoryRef, newStory)
      .then(() => {
        alert("Story Published Successfully!");
        closeForm(); 
      })
      .catch((error) => {
        alert("Error: " + error.message);
      });
  };

  return (
    <div style={modalOverlay}>
      <div className="card" style={modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{margin: 0, color: '#4A4A4A'}}>Create New Story</h3>
          <button onClick={closeForm} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '24px', color: '#999' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Select Genre *:</label>
          <select value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} style={inputStyle}>
            <option>Action</option><option>Thriller</option><option>Romance</option><option>Drama</option>
            <option>Comedy</option><option>Sci-Fi</option><option>Horror</option><option>Documentary</option>
          </select>
            
          <label style={labelStyle}>Name (Required) *:</label>
          <input 
            placeholder="Story Title..." 
            value={formData.Name} 
            onChange={e => setFormData({...formData, Name: e.target.value})} 
            style={inputStyle} 
          />

          <label style={labelStyle}>Logline (Required) *:</label>
          <input 
            placeholder="Short one-line summary..." 
            value={formData.logline} 
            onChange={e => setFormData({...formData, logline: e.target.value})} 
            style={inputStyle} 
          />

          <div style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={labelStyle}>Synopsis (Optional):</label>
              <label style={lockToggle}>
                <input 
                  type="checkbox" 
                  checked={formData.isSynopsisLocked} 
                  onChange={e => setFormData({...formData, isSynopsisLocked: e.target.checked})} 
                />
                {formData.isSynopsisLocked ? "🔒 Locked" : "🔓 Public"}
              </label>
            </div>
            <textarea 
              placeholder="Brief overview..." 
              value={formData.synopsis} 
              onChange={e => setFormData({...formData, synopsis: e.target.value})} 
              style={{...inputStyle, height: '80px', resize: 'vertical'}} 
            />
          </div>

          <div style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={labelStyle}>📄 Full Story File (Optional):</label>
              <label style={lockToggle}>
                <input 
                  type="checkbox" 
                  checked={formData.isFullStoryLocked} 
                  onChange={e => setFormData({...formData, isFullStoryLocked: e.target.checked})} 
                />
                {formData.isFullStoryLocked ? "🔒 Locked" : "🔓 Public"}
              </label>
            </div>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFile} style={{fontSize: '13px', marginTop: '10px'}} />
            {formData.fileName && <p style={{fontSize: '11px', color: '#20c997', margin: '5px 0'}}>{formData.fileName}</p>}
          </div>

          <div style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={labelStyle}>Portfolio & Contact Info:</label>
              <label style={lockToggle}>
                <input 
                  type="checkbox" 
                  checked={formData.isContactLocked} 
                  onChange={e => setFormData({...formData, isContactLocked: e.target.checked})} 
                />
                {formData.isContactLocked ? "🔒 Locked" : "🔓 Public"}
              </label>
            </div>
            <input 
              placeholder="Portfolio URL..." 
              value={formData.portfolio} 
              onChange={e => setFormData({...formData, portfolio: e.target.value})} 
              style={inputStyle} 
            />
            <input 
              placeholder="Email or Phone (Required)..." 
              value={formData.contactInfo} 
              onChange={e => setFormData({...formData, contactInfo: e.target.value})} 
              style={inputStyle} 
            />
          </div>

          <button type="submit" style={btnStyle}>Publish Story</button>
        </form>
      </div>
    </div>
  );
};

const btnStyle = { width: '100%', padding: '12px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' };
const modalContent = { background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' };
const inputStyle = { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const sectionBox = { border: '1px solid #eee', padding: '12px', borderRadius: '10px', margin: '10px 0', background: '#fcfcfc' };
const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#555', display: 'block' };
const lockToggle = { fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold', color: '#4834d4' };

export default PostForm;