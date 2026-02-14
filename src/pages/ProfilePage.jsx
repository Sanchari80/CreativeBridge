import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, update } from "firebase/database"; // Firebase functions যোগ করা হয়েছে

const ProfilePage = ({ onBack }) => {
  const { user, setUser, stories, setStories } = useContext(AppContext);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto = reader.result;

        // ১. লোকাল স্টেট এবং স্টোরেজ আপডেট
        const updatedUser = { ...user, profilePic: newPhoto };
        setUser(updatedUser);
        localStorage.setItem('activeUser', JSON.stringify(updatedUser));

        // ২. লোকাল স্টোরি স্টেট আপডেট
        if (stories && stories.length > 0) {
          const updatedStories = stories.map(s => 
            s.writerName === user.name ? { ...s, writerPic: newPhoto } : s
          );
          setStories(updatedStories);

          // ৩. Firebase Realtime Database আপডেট (যাতে অন্য সবাই নতুন ছবি দেখে)
          const db = getDatabase();
          stories.forEach(s => {
            if (s.writerName === user.name && s.firebaseId) {
              const storyRef = ref(db, `stories/${s.firebaseId}`);
              update(storyRef, { writerPic: newPhoto });
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: '500px', textAlign: 'left', marginBottom: '10px' }}>
        <button onClick={onBack} style={backBtnStyle}>← Back to Dashboard</button>
      </div>

      <h2 style={{ color: '#2d3436', marginBottom: '20px' }}>User Profile Settings</h2>
      
      <div style={profileCard}>
        <div style={imageWrapper}>
          <img 
            src={user?.profilePic } 
            alt="Profile" 
            style={imageStyle} 
          />
          <label htmlFor="photo-upload" style={uploadBtn}>
            📷 Update Photo
          </label>
          <input 
            id="photo-upload" 
            type="file" 
            accept="image/*" 
            onChange={handleImageChange} 
            style={{ display: 'none' }} 
          />
        </div>

        <div style={infoStyle}>
          <div style={fieldStyle}>
            <strong>Full Name:</strong>
            <p>{user?.name || "Not Set"}</p>
          </div>
          <div style={fieldStyle}>
            <strong>Account Role:</strong>
            <p style={{ color: '#6c5ce7', fontWeight: 'bold' }}>{user?.role}</p>
          </div>
          <div style={fieldStyle}>
            <strong>Email:</strong>
            <p>{user?.email || "No Email Provided"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles (অপরিবর্তিত) ---
const backBtnStyle = { background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' };
const containerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' };
const profileCard = { background: 'rgba(255, 255, 255, 0.9)', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px', textAlign: 'center' };
const imageWrapper = { position: 'relative', width: '150px', height: '150px', margin: '0 auto 30px' };
const imageStyle = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' };
const uploadBtn = { position: 'absolute', bottom: '0', right: '0', background: '#2d3436', color: '#fff', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };
const infoStyle = { textAlign: 'left', marginTop: '20px' };
const fieldStyle = { marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' };

export default ProfilePage;