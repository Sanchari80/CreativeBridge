import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import AuthPage from './pages/AuthPage.jsx';
import CommonDashboard from './pages/CommonDashboard';
import PostForm from './pages/PostForm';
import ProfilePage from './pages/ProfilePage'; 
import NotificationSystem from './components/NotificationSystem';
import Navbar from './components/Navbar'; // এটি যোগ করুন
// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp } from "firebase/database";

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
export const db = getDatabase(app);

function App() {
  const { user, setUser, requests, setRequests } = useContext(AppContext); 
  const [showPostForm, setShowPostForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [view, setView] = useState('dashboard');
  const [liveVisitors, setLiveVisitors] = useState(0); 

  useEffect(() => {
    const savedUser = localStorage.getItem('activeUser');
    if (savedUser && !user) {
      setUser(JSON.parse(savedUser));
    }
  }, [setUser, user]);

  useEffect(() => {
    if (!user) return;
    const reqRef = ref(db, 'requests');
    const unsubscribe = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let allReqs = [];
        Object.entries(data).forEach(([ownerKey, folderData]) => {
          if (typeof folderData === 'object') {
            Object.entries(folderData).forEach(([key, value]) => {
              allReqs.push({ ...value, firebaseKey: key, ownerPath: ownerKey });
            });
          }
        });
        setRequests(allReqs);
      }
    });
    return () => unsubscribe();
  }, [user, setRequests]);

  useEffect(() => {
    const visitorId = Math.random().toString(36).substr(2, 9);
    const myStatusRef = ref(db, 'status/' + visitorId);
    set(myStatusRef, { online: true, lastChanged: serverTimestamp() });
    onDisconnect(myStatusRef).remove();
    
    const allStatusRef = ref(db, 'status');
    onValue(allStatusRef, (snapshot) => {
      setLiveVisitors(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('activeUser');
    setUser(null);
  };

  const VideoBackground = () => (
    <div style={videoWrapper}>
      <video autoPlay loop muted playsInline style={videoBgStyle}>
        <source src="/CommonDashboard.mp4" type="video/mp4" />
      </video>
      <div style={overlayStyle}></div>
    </div>
  );

  if (!user) {
    return <AuthPage />; 
  }

  const userKey = user?.email?.toLowerCase().replace(/\./g, ',');

 return (
  <div className="app-container" style={appContainerStyle}>
    <VideoBackground />

    {/* শুধু এই অংশটুকু পরিবর্তন হবে */}
    <Navbar 
      setView={setView}
      setShowNotifications={setShowNotifications}
      showNotifications={showNotifications}
      setShowPostForm={setShowPostForm}
      handleLogout={handleLogout}
      liveVisitors={liveVisitors}
    />

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

// Styles
const notifPanelContainer = { position: 'absolute', top: '75px', right: '5%', width: '320px', background: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 1001, padding: '15px', border: '1px solid #eee' };
const notifHeader = { display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0', marginBottom: '10px' };
const closeBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' };
const appContainerStyle = { display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' };
const videoWrapper = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, overflow: 'hidden' };
const videoBgStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const overlayStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.7)' };
const mainStyle = { padding: '40px 5%', flex: 1, position: 'relative', zIndex: 1 };
const footerStyle = { textAlign: 'center', padding: '40px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(5px)', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '50px', position: 'relative', zIndex: 1 };

export default App;