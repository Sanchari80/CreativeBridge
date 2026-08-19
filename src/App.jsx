import React, { useContext, useState, useEffect, lazy, Suspense } from 'react';
import { AppContext } from './context/AppContext';
import AuthPage from './pages/AuthPage.jsx';
import Navbar from './components/Navbar';

// ── Lazy-load heavy pages for faster initial load ─────────────
const CommonDashboard    = lazy(()=>import('./pages/CommonDashboard'));
const PostForm           = lazy(()=>import('./pages/PostForm'));
const ProfilePage        = lazy(()=>import('./pages/ProfilePage'));
const SearchPage         = lazy(()=>import('./pages/SearchPage'));
const ReleasePage        = lazy(()=>import('./pages/ReleasePage'));
const NotificationSystem = lazy(()=>import('./components/NotificationSystem'));
const HireDashboard      = lazy(()=>import('./pages/HireDashboard'));
const TalentDashboard    = lazy(()=>import('./pages/TalentDashboard'));
const AdminDashboard     = lazy(()=>import('./pages/AdminDashboard'));

// ── Loader spinner ────────────────────────────────────────────
const PageLoader = () => (
  <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh',flexDirection:'column',gap:12}}>
    <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(139,92,246,0.2)',borderTop:'3px solid #8b5cf6',animation:'spin 0.8s linear infinite'}}/>
    <p style={{color:'rgba(147,197,253,0.5)',fontSize:13,margin:0}}>Loading...</p>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

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
  const [pendingProfile,    setPendingProfile]    = useState(null); // ← notification / search profile redirect

  useEffect(() => {
    const savedUser = localStorage.getItem('activeUser');
    if (savedUser && !user) setUser(JSON.parse(savedUser));
  }, [setUser, user]);

  // ── Read shareable work-link query params (?profile=&role=&work=) ──
  useEffect(() => {
    const params       = new URLSearchParams(window.location.search);
    const profileEmail = params.get('profile');
    const profileRole  = params.get('role');
    const workId       = params.get('work');

    if (profileEmail) {
      setView('dashboard');
      setPendingProfile({
        email:  profileEmail,
        role:   profileRole || '',
        workId: workId || null,
      });

      // Clean the URL so refreshing doesn't re-trigger the redirect
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

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
    const visitorId   = Math.random().toString(36).substr(2, 9);
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
  const isAdmin  = user?.isAdmin === true || user?.role === 'Admin';

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
            <span style={{ fontWeight:800, fontFamily:"'DM Sans',sans-serif", color:'rgba(255,255,255,0.9)' }}>
              🔔 Notifications
            </span>
            <button onClick={() => setShowNotifications(false)} style={closeBtnStyle}>✕</button>
          </div>
          <Suspense fallback={<div style={{padding:20,color:'rgba(147,197,253,0.5)',textAlign:'center',fontSize:13}}>Loading...</div>}>
            <NotificationSystem
              onBack={() => setShowNotifications(false)}
              onViewProfile={(profile) => {
                setShowNotifications(false);
                setView('dashboard');
                setPendingProfile(profile);
              }}
            />
          </Suspense>
        </div>
      )}

      {/* ── Post / Upload Form ── */}
      {showPostForm && (
        <Suspense fallback={null}>
          <PostForm closeForm={() => setShowPostForm(false)} />
        </Suspense>
      )}

      {/* ── Main Content ── */}
      <main style={mainStyle}>
        <Suspense fallback={<PageLoader/>}>
          {view === 'dashboard' && (
            <CommonDashboard
              pendingProfile={pendingProfile}
              onClearPending={() => setPendingProfile(null)}
            />
          )}
          {view === 'search'  && (
            <SearchPage
              onViewProfile={(profile) => {
                setView('dashboard');
                setPendingProfile(profile);
              }}
            />
          )}
          {view === 'hire'     && isHirer  && <HireDashboard />}
          {view === 'mywork'   && isTalent && <TalentDashboard />}
          {view === 'profile'  && <ProfilePage onBack={() => setView('dashboard')} />}
          {view === 'admin'    && isAdmin   && <AdminDashboard />}
          {view === 'releases' && <ReleasePage />}
        </Suspense>
      </main>

      {/* ── Footer ── */}
      <footer style={footerStyle}>
        <img src="/SKT logo.jpg" alt="SKT Logo" style={{ width:38, borderRadius:8, marginBottom:6, boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }}/>
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

// ── Dark notification panel (text clearly visible) ────────────
const notifPanel = {
  position: 'absolute',
  top: 72, right: '4%',
  width: 330, maxWidth: '94vw',
  background: 'rgba(8,10,42,0.97)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  zIndex: 1001,
  padding: 16,
  border: '1px solid rgba(139,92,246,0.25)',
  maxHeight: '80vh',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const notifHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 10,
  borderBottom: '1px solid rgba(147,197,253,0.12)',
  marginBottom: 10,
};

const closeBtnStyle = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  fontSize: 14,
  width: 28, height: 28,
  borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'rgba(255,255,255,0.6)',
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
  padding: '16px 20px',
  background: 'rgba(255,255,255,0.93)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderTop: '1px solid rgba(201,168,76,0.18)',
  marginTop: 20,
  position: 'relative',
  zIndex: 1,
};

export default App;