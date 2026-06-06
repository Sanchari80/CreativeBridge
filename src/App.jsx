import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import AuthPage from './pages/AuthPage.jsx';
import CommonDashboard from './pages/CommonDashboard';
import PostForm from './pages/PostForm';
import ProfilePage from './pages/ProfilePage';
import NotificationSystem from './components/NotificationSystem';
import Navbar from './components/Navbar';
import HireDashboard from './pages/HireDashboard';
import TalentDashboard from './pages/TalentDashboard';
import AdminDashboard from './pages/AdminDashboard';

import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD4z9lc0igmGliK4qhwT7p5VcPp5ZHG0VM",
  authDomain: "creativebridge-88c8a.firebaseapp.com",
  projectId: "creativebridge-88c8a",
  storageBucket: "creativebridge-88c8a.firebasestorage.app",
  messagingSenderId: "576097901738",
  appId: "1:576097901738:web:5cd79c3d32d65bac2c04d3",
  databaseURL: "https://creativebridge-88c8a-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
export const db           = getDatabase(app);
export const storage      = getStorage(app);
export const TALENT_ROLES = ['Singer', 'Painter', 'Actor', 'Dancer'];

function App() {
  const { user, setUser, setRequests } = useContext(AppContext);
  const [showPostForm,      setShowPostForm]      = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [view,              setView]              = useState('dashboard');
  const [liveVisitors,      setLiveVisitors]      = useState(0);
  const [pendingProfile,    setPendingProfile]    = useState(null); // ← notification profile redirect

  useEffect(() => {
    const savedUser = localStorage.getItem('activeUser');
    if (savedUser && !user) setUser(JSON.parse(savedUser));
  }, [setUser, user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, 'requests'), snapshot => {
      const data = snapshot.val();
      if (data) {
        let allReqs = [];
        Object.entries(data).forEach(([ownerKey, folderData]) => {
          if (typeof folderData === 'object')
            Object.entries(folderData).forEach(([key, value]) =>
              allReqs.push({ ...value, firebaseKey: key, ownerPath: ownerKey })
            );
        });
        setRequests(allReqs);
      }
    });
    return () => unsub();
  }, [user, setRequests]);

  useEffect(() => {
    const visitorId = Math.random().toString(36).substr(2, 9);
    const myStatusRef = ref(db, 'status/' + visitorId);
    set(myStatusRef, { online: true, lastChanged: serverTimestamp() });
    onDisconnect(myStatusRef).remove();
    const allStatusRef = ref(db, 'status');
    onValue(allStatusRef, snap => {
      setLiveVisitors(snap.exists() ? Object.keys(snap.val()).length : 0);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('activeUser');
    setUser(null);
  };

  if (!user) return <AuthPage />;

  const isTalent = TALENT_ROLES.includes(user?.role);
  const isHirer  = user?.role === 'Hirer' || user?.role === 'Looking for new stories';
  const isAdmin  = user?.isAdmin === true;

  return (
    <div className="app-container" style={appContainerStyle}>

      {/* ── Animated CSS Background ── */}
      <div style={bgWrapper}>
        <div style={bgOverlay}></div>
      </div>

      {/* ── Navbar ── */}
      <Navbar
        view={view}
        setView={setView}
        setShowNotifications={setShowNotifications}
        showNotifications={showNotifications}
        setShowPostForm={setShowPostForm}
        handleLogout={handleLogout}
        liveVisitors={liveVisitors}
        isAdmin={isAdmin}
      />

      {/* ── Notification Panel ── */}
      {showNotifications && (
        <div style={notifPanel}>
          <div style={notifHeader}>
            <span style={{ fontWeight: 800, fontFamily: "'DM Sans',sans-serif" }}>
              🔔 Notifications
            </span>
            <button onClick={() => setShowNotifications(false)} style={closeBtnStyle}>✕</button>
          </div>
          <NotificationSystem
            onBack={() => setShowNotifications(false)}
            onViewProfile={(profile) => {
              setShowNotifications(false);
              setView('dashboard');
              setPendingProfile(profile);
            }}
          />
        </div>
      )}

      {/* ── Post / Upload Form ── */}
      {showPostForm && <PostForm closeForm={() => setShowPostForm(false)} />}

      {/* ── Main Content ── */}
      <main style={mainStyle}>
        {view === 'dashboard' && (
          <CommonDashboard
            pendingProfile={pendingProfile}
            onClearPending={() => setPendingProfile(null)}
          />
        )}
        {view === 'hire'    && isHirer && <HireDashboard />}
        {view === 'mywork'  && isTalent && <TalentDashboard />}
        {view === 'profile' && <ProfilePage onBack={() => setView('dashboard')} />}
        {view === 'admin'   && isAdmin  && <AdminDashboard />}
      </main>

      {/* ── Footer ── */}
      <footer style={footerStyle}>
        <img
          src="/SKT logo.jpg"
          alt="SKT Logo"
          style={{ width: 52, borderRadius: 10, marginBottom: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        />
        <div style={{
          fontFamily: "'Playfair Display',serif",
          fontWeight: 800, fontSize: 15,
          letterSpacing: 2,
          background: 'linear-gradient(135deg,#2d3436,#5846E4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          CREATIVE BRIDGE • SKT
        </div>
        <div style={{ fontSize: '0.8rem', color: '#636e72', marginTop: 4 }}>
          © {new Date().getFullYear()} | Connecting Creative Minds
        </div>
      </footer>
    </div>
  );
}

/* ── Styles ── */
const appContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  position: 'relative',
};

const bgWrapper = {
  position: 'fixed',
  top: 0, left: 0,
  width: '100%', height: '100%',
  zIndex: -1,
  overflow: 'hidden',
};

const bgOverlay = {
  position: 'absolute',
  inset: 0,
  background: `
    radial-gradient(ellipse 80% 60% at 15% 20%, rgba(108,92,231,0.35) 0%, transparent 60%),
    radial-gradient(ellipse 70% 60% at 85% 80%, rgba(0,196,140,0.28) 0%, transparent 60%),
    radial-gradient(ellipse 60% 70% at 80% 15%, rgba(255,91,168,0.22) 0%, transparent 55%),
    radial-gradient(ellipse 65% 55% at 20% 85%, rgba(255,107,71,0.20) 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(201,168,76,0.12) 0%, transparent 70%),
    linear-gradient(135deg, #0c0c1e 0%, #120820 40%, #0c1a1e 100%)
  `,
};

const notifPanel = {
  position: 'absolute',
  top: 72, right: '4%',
  width: 320,
  background: 'rgba(255,255,255,0.96)',
  borderRadius: 20,
  boxShadow: '0 30px 80px rgba(0,0,0,0.22)',
  zIndex: 1001,
  padding: 16,
  border: '1px solid rgba(255,255,255,0.8)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};

const notifHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 10,
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  marginBottom: 10,
};

const closeBtnStyle = {
  background: '#f1f2f6',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  width: 28, height: 28,
  borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#636e72',
  fontWeight: 700,
};

const mainStyle = {
  padding: '24px 5%',
  flex: 1,
  position: 'relative',
  zIndex: 1,
};

const footerStyle = {
  textAlign: 'center',
  padding: '40px 20px',
  background: 'rgba(255,255,255,0.93)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderTop: '1px solid rgba(201,168,76,0.18)',
  marginTop: 50,
  position: 'relative',
  zIndex: 1,
};

export default App;