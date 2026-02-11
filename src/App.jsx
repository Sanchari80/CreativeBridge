import React, { useContext, useState } from 'react';
import { AppContext } from './context/AppContext';
import AuthPage from './pages/Authpage'; 
import CommonDashboard from './pages/CommonDashboard';
import PostForm from './pages/PostForm';
import NotificationSystem from './components/NotificationSystem'; // ইমপোর্ট করা হলো

function App() {
  const { user, setUser, requests } = useContext(AppContext); // requests আনা হলো
  const [showPostForm, setShowPostForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // নোটিফিকেশন স্টেট

  const navIconPath = "/icon.png"; 
  const footerLogoPath = "/SKT logo.jpg";

  // নোটিফিকেশন কাউন্ট চেক (লাল ডটের জন্য)
  const hasNewNotifications = requests?.some(r => 
    (user?.role === 'Writer' && r.status === 'pending' && r.writerName === user.name) || 
    (user?.role === 'Director' && r.status === 'approved' && r.directorName === user.name)
  );

  const handleLogout = () => {
    localStorage.removeItem('activeUser');
    setUser(null);
  };

  if (!user) return <AuthPage />;

  return (
    <div className="app-container" style={appContainerStyle}>
      <div style={videoWrapper}>
        <video autoPlay loop muted playsInline style={videoBgStyle}>
          <source src="/CommonDashboard.mp4" type="video/mp4" />
        </video>
        <div style={overlayStyle}></div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="navbar" style={navStyle}>
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={navIconPath} alt="App Icon" style={{ width: '35px', height: '35px', objectFit: 'contain' }} />
          <h2 style={{ margin: 0, color: '#2d3436', fontSize: '1.4rem', fontWeight: '800' }}>Creative Bridge</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Global Notification Button */}
          <div 
            style={iconBtnStyle} 
            title="Notifications" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <span style={{ fontSize: '18px' }}>🔔</span>
            {hasNewNotifications && <span style={badgeStyle}></span>}
          </div>

          {user.role === 'Writer' && (
            <button onClick={() => setShowPostForm(true)} style={postBtnStyle}>+ Post Story</button>
          )}

          <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
            <div style={{ fontWeight: 'bold', color: '#2d3436' }}>{user.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#636e72' }}>{user.role} Account</div>
          </div>
          <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
        </div>
      </nav>

      {/* --- NOTIFICATION PANEL --- */}
      {showNotifications && (
        <div style={notifPanelContainer}>
          <div style={notifHeader}>
            <span style={{ fontWeight: '800' }}>Notifications</span>
            <button onClick={() => setShowNotifications(false)} style={closeBtn}>✕</button>
          </div>
          <NotificationSystem />
        </div>
      )}

      {showPostForm && <PostForm closeForm={() => setShowPostForm(false)} />}

      <main style={mainStyle}>
        <CommonDashboard />
      </main>

      <footer style={footerStyle}>
        <img src={footerLogoPath} alt="SKT Logo" style={{ width: '50px', borderRadius: '8px', marginBottom: '10px' }} />
        <div style={{ fontWeight: '700', color: '#2d3436', letterSpacing: '1px' }}>CREATIVE BRIDGE • SKT</div>
        <div style={{ fontSize: '0.8rem', color: '#636e72', marginTop: '5px' }}>
          © {new Date().getFullYear()} | Connecting Creative Minds Globally
        </div>
      </footer>
    </div>
  );
}

// --- Styles ---
const notifPanelContainer = {
  position: 'absolute', top: '75px', right: '5%', width: '320px', 
  background: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  zIndex: 1001, padding: '15px', border: '1px solid #eee'
};
const notifHeader = { display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0', marginBottom: '10px' };
const closeBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' };
const badgeStyle = { position: 'absolute', top: '5px', right: '5px', width: '8px', height: '8px', background: '#ff4757', borderRadius: '50%', border: '2px solid white' };

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