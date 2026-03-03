import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, update } from "firebase/database";
import { db } from "../App"; // আপনার db যেখানে এক্সপোর্ট করা আছে সেই পাথ অনুযায়ী দিন

const Navbar = ({ setView, setShowNotifications, showNotifications, setShowPostForm, handleLogout, liveVisitors }) => {
  const { user, requests } = useContext(AppContext);
  
  // ইমেইল থেকে ডট সরিয়ে কি তৈরি করা (Writer এর ownerPath এর সাথে ম্যাচ করার জন্য)
  const userKey = user?.email?.toLowerCase().replace(/\./g, ',');
  // Director-এর unread requests আলাদা করা
  const unreadApproved = requests.filter(r => 
    r.status === 'approved' && r.fromEmail === user?.email && !r.read
  );

  // নোটিফিকেশন ক্লিক হ্যান্ডলার
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    
    // Director ক্লিক করলে Firebase-এ read: true আপডেট হবে
    if (!showNotifications && user?.role === 'Director' && unreadApproved.length > 0) {
      unreadApproved.forEach(req => {
        const reqRef = ref(db, `requests/${req.ownerPath}/${req.firebaseKey}`);
        update(reqRef, { read: true });
      });
    }
  };

  // নোটিফিকেশন কাউন্ট লজিক (Writer এবং Director উভয়ের জন্য)
  // নোটিফিকেশন কাউন্ট লজিক (Writer এবং Director উভয়ের জন্য)
  const count = user?.role === 'Writer' 
  ? requests.filter(r => r.status === 'pending' && r.ownerPath === userKey).length 
  : unreadApproved.length; // সরাসরি unreadApproved.length ব্যবহার করুন
  return (
    <nav className="navbar" style={navStyle}>
      {/* Logo Section */}
      <div className="logo-section" style={logoSectionStyle} onClick={() => setView('dashboard')}>
        <img src="/icon.png" alt="App Icon" style={{ width: '35px', height: '35px' }} />
        <h2 style={logoTextStyle}>Creative Bridge</h2>
        <div style={liveBadgeStyle}><span style={pulseDot}></span>{liveVisitors} Live</div>
      </div>
      
      {/* Action Buttons & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* Notification Button */}
       <button 
  onClick={handleNotificationClick}  // এখানে handleNotificationClick দিন
  style={notifBtnStyle}
>
          🔔
          {count > 0 && (
            <span style={badgeStyle}>
              {count}
            </span>
          )}
        </button>

        {/* Writer specific: Post Story Button */}
        {user.role === 'Writer' && (
          <button onClick={() => setShowPostForm(true)} style={postBtnStyle}>+ Post Story</button>
        )}

        {/* Profile Section */}
        <div style={profileContainerStyle} onClick={() => setView('profile')}>
          <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
            <div style={{ fontWeight: 'bold', color: '#2d3436' }}>{user.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#636e72' }}>{user.role} Account</div>
          </div>
          <img src={user.profilePic || "/icon.png"} alt="Profile" style={avatarStyle} />
        </div>

        {/* Logout Button */}
        <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
      </div>
    </nav>
  );
};

// --- Styles ---
const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 5%', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 15px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 };
const logoSectionStyle = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' };
const logoTextStyle = { margin: 0, color: '#2d3436', fontSize: '1.4rem', fontWeight: '800' };
const liveBadgeStyle = { display: 'flex', alignItems: 'center', gap: '6px', background: '#e8f5e9', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', color: '#2e7d32', fontWeight: 'bold', marginLeft: '10px', border: '1px solid #c8e6c9' };
const pulseDot = { width: '6px', height: '6px', background: '#4caf50', borderRadius: '50%', boxShadow: '0 0 5px #4caf50' };
const notifBtnStyle = { position: 'relative', background: '#f1f2f6', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const badgeStyle = { position: 'absolute', top: '-5px', right: '-5px', background: '#ff4757', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', border: '2px solid white' };
const postBtnStyle = { padding: '10px 22px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const profileContainerStyle = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' };
const avatarStyle = { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #646cff' };
const logoutBtnStyle = { padding: '8px 18px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' };

export default Navbar;