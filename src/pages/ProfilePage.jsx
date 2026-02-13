import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const ProfilePage = () => {
  const { user, setUser } = useContext(AppContext);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // user অবজেক্টে profilePic আপডেট করা হচ্ছে
        setUser({ ...user, profilePic: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#2d3436', marginBottom: '30px' }}>User Profile Settings</h2>
      
      <div style={profileCard}>
        <div style={imageWrapper}>
          <img 
            src={user?.profilePic || '/icon.png'} 
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

// --- Styles ---
const containerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' };
const profileCard = { background: 'rgba(255, 255, 255, 0.9)', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px', textAlign: 'center' };
const imageWrapper = { position: 'relative', width: '150px', height: '150px', margin: '0 auto 30px' };
const imageStyle = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' };
const uploadBtn = { position: 'absolute', bottom: '0', right: '0', background: '#2d3436', color: '#fff', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };
const infoStyle = { textAlign: 'left', marginTop: '20px' };
const fieldStyle = { marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' };

export default ProfilePage;