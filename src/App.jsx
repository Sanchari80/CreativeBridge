import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import AuthPage from './pages/Authpage'; 
import CommonDashboard from './pages/CommonDashboard';
import PostForm from './pages/PostForm';
import ProfilePage from './pages/ProfilePage'; 
import NotificationSystem from './components/NotificationSystem';

import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp } from "firebase/database";

function App() {
  const { user, setUser, requests, setRequests, logout } = useContext(AppContext); 
  const [showPostForm, setShowPostForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [view, setView] = useState('dashboard');
  const [liveVisitors, setLiveVisitors] = useState(0); 
  const db = getDatabase();

  // --- ১. নোটিফিকেশন লিসেনার (App লেভেলে) ---
  useEffect(() => {
    if (!user) return;
    const reqRef = ref(db, 'requests');
    
    const unsubscribe = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let allReqs = [];
        Object.entries(data).forEach(([ownerKey, folderData]) => {
          if (folderData && typeof folderData === 'object') {
            Object.entries(folderData).forEach(([key, value]) => {
              allReqs.push({ ...value, firebaseKey: key, ownerPath: ownerKey });
            });
          }
        });
        setRequests(allReqs);
      } else {
        setRequests([]);
      }
    });
    return () => unsubscribe();
  }, [user, setRequests, db]);

  // --- ২. ভিজিটর লজিক (অনলাইন ট্র্যাকিং) ---
  useEffect(() => {
    const visitorId = Math.random().toString(36).substr(2, 9);
    const myStatusRef = ref(db, 'status/' + visitorId);
    set(myStatusRef, { online: true, lastChanged: serverTimestamp() });
    onDisconnect(myStatusRef).remove();

    const allStatusRef = ref(db, 'status');
    const unsubscribe = onValue(allStatusRef, (snapshot) => {
      setLiveVisitors(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
    });
    return () => unsubscribe();
  }, [db]);

  // --- ৩. ব্যাজ লজিক (ইমেল দিয়ে চেক) ---
  const userKey = user?.email?.replace(/\./g, ',');
  const hasNewNotifications = requests?.some(r => {
    if (user?.role === 'Writer') {
      return r.ownerPath === userKey && r.status === 'pending';
    } else {
      return r.fromEmail === user?.email && (r.status === 'approved' || r.status === 'declined');
    }
  });

  if (!user) return <AuthPage />;

  return (
    <div className="app-container" style={appContainerStyle}>
      <div style={videoWrapper}>
        <video autoPlay loop muted playsInline style={videoBgStyle}>
          <source src="/CommonDashboard.mp4" type="video/mp4" />
        </video>
        <div style={overlayStyle}></div>
      </div>

      <nav className="navbar" style={navStyle}>
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setView('dashboard')}>
          <img src="/icon.png" alt="App Icon" style={{ width: '35px', height: '35px' }} />
          <h2 style={{ margin: 0, color: '#2d3436', fontSize: '1.4rem', fontWeight: '800' }}>Creative Bridge</h2>
          <div style={liveBadgeStyle}><span style={pulseDot}></span>{liveVisitors} Live</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={iconBtnStyle} title="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            {hasNewNotifications && <span style={badgeStyle}></span>}
          </div>

          {user.role === 'Writer' && (
            <button onClick={() => setShowPostForm(true)} style={postBtnStyle}>+ Post Story</button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setView('profile')}>
            <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
              <div style={{ fontWeight: 'bold', color: '#2d3436' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#636e72' }}>{user.role} Account</div>
            </div>
            <img src={user.profilePic || "/icon.png"} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #6c5ce7' }} />
          </div>
          <button onClick={logout} style={logoutBtnStyle}>Logout</button>
        </div>
      </nav>

      {showNotifications && (
        <div style={notifPanelContainer}>
          <div style={notifHeader}>
            <span style={{ fontWeight: '800' }}>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={closeBtn}>✕</button>
          </div>
          <NotificationSystem onBack={() => setShowNotifications(false)} />
        </div>
      )}

      {showPostForm && <PostForm closeForm={() => setShowPostForm(false)} />}

      <main style={mainStyle}>
        {view === 'dashboard' ? <CommonDashboard /> : <ProfilePage onBack={() => setView('dashboard')} />}
      </main>

      <footer style={footerStyle}>
        <img src="/SKT logo.jpg" alt="SKT Logo" style={{ width: '50px', borderRadius: '8px', marginBottom: '10px' }} />
        <div style={{ fontWeight: '700', color: '#2d3436' }}>CREATIVE BRIDGE • SKT</div>
        <div style={{ fontSize: '0.8rem', color: '#636e72' }}>© {new Date().getFullYear()} | Connecting Creative Minds</div>
      </footer>
    </div>
  );
}

// Styles unchanged as per your request...
const liveBadgeStyle = { display: 'flex', alignItems: 'center', gap: '6px', background: '#e8f5e9', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', color: '#2e7d32', fontWeight: 'bold', marginLeft: '10px', border: '1px solid #c8e6c9' };
const pulseDot = { width: '6px', height: '6px', background: '#4caf50', borderRadius: '50%', boxShadow: '0 0 5px #4caf50' };
const notifPanelContainer = { position: 'absolute', top: '75px', right: '5%', width: '320px', background: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 1001, padding: '15px', border: '1px solid #eee' };
const notifHeader = { display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0', marginBottom: '10px' };
const closeBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' };
const badgeStyle = { position: 'absolute', top: '5px', right: '5px', width: '10px', height: '10px', background: '#ff4757', borderRadius: '50%', border: '2px solid white' };
const appContainerStyle = { display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' };
const videoWrapper = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, overflow: 'hidden' };
const videoBgStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const overlayStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.7)' };
const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 5%', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 15px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 };
const iconBtnStyle = { cursor: 'pointer', padding: '8px', background: '#f1f2f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' };
const postBtnStyle = { padding: '10px 22px', background: '#2d3436', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const logoutBtnStyle = { padding: '8px 18px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' };
const mainStyle = { padding: '40px 5%', flex: 1, position: 'relative', zIndex: 1 };
const footerStyle = { textAlign: 'center', padding: '40px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(5px)', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '50px', position: 'relative', zIndex: 1 };

export default App;