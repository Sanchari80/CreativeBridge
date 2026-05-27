import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, update } from "firebase/database";
import { db, TALENT_ROLES } from "../App";

const Navbar = ({ view, setView, setShowNotifications, showNotifications, setShowPostForm, handleLogout, liveVisitors, isAdmin }) => {
  const { user, requests, talentRequests } = useContext(AppContext);

  const userKey  = user?.email?.toLowerCase().replace(/\./g, ',');
  const isWriter = user?.role === 'Writer';
  const isTalent = TALENT_ROLES.includes(user?.role);
  const isHirer  = user?.role === 'Hirer' || user?.role === 'Looking for new stories';

  const writerPending     = requests.filter(r => r.status === 'pending' && r.ownerPath === userKey).length;
  const talentPending     = (talentRequests||[]).filter(r => r.status === 'pending' && r.ownerPath === userKey).length;
  const hirerUnreadStory  = requests.filter(r => r.status === 'approved' && r.fromEmail === user?.email && !r.read);
  const hirerUnreadTalent = (talentRequests||[]).filter(r => r.status === 'approved' && r.fromEmail === user?.email && !r.read);
  const hirerTotal        = hirerUnreadStory.length + hirerUnreadTalent.length;
  const notifCount        = isWriter ? writerPending : isTalent ? talentPending : isHirer ? hirerTotal : 0;

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && isHirer) {
      hirerUnreadStory.forEach(r  => update(ref(db, `requests/${r.ownerPath}/${r.firebaseKey}`),       { read: true }));
      hirerUnreadTalent.forEach(r => update(ref(db, `talentRequests/${r.ownerPath}/${r.firebaseKey}`), { read: true }));
    }
  };

  const catColor = { Writer:'#7B6CF6', Singer:'#00C48C', Painter:'#FF6B47', Actor:'#FFB830', Dancer:'#FF5CA8', Hirer:'#636e72', 'Looking for new stories':'#636e72' };
  const catEmoji = { Writer:'✍️', Singer:'🎤', Painter:'🎨', Actor:'🎬', Dancer:'💃', Hirer:'🔍', 'Looking for new stories':'🔍' };
  const c = catColor[user?.role] || '#636e72';

  return (
    <nav style={{
      display: 'flex',
      flexDirection: 'row',       /* ← এটাই key */
      flexWrap: 'nowrap',         /* ← কখনো wrap হবে না */
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 4%',
      height: 64,
      minHeight: 64,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      borderBottom: '1px solid rgba(201,168,76,0.2)',
      boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>

      {/* ── Logo (left, shrink হবে না) ── */}
      <div
        onClick={() => setView('dashboard')}
        style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flexShrink:0 }}
      >
        <img src="/icon.png" alt="icon" style={{ width:38, height:38, borderRadius:10, boxShadow:'0 4px 14px rgba(201,168,76,0.3)', flexShrink:0 }} />
        <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:800, fontSize:'1.2rem', background:'linear-gradient(135deg,#1a1a2c,#5846E4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', whiteSpace:'nowrap' }}>
          Creative Bridge
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5, background:'#e8f5e9', border:'1px solid #c8e6c9', padding:'3px 10px', borderRadius:20, fontSize:11, color:'#2e7d32', fontWeight:700, whiteSpace:'nowrap', marginLeft:4 }}>
          <span style={{ width:6, height:6, background:'#4caf50', borderRadius:'50%', display:'inline-block', flexShrink:0 }}/>
          {liveVisitors} Live
        </span>
      </div>

      {/* ── Actions (right, overflow-x scroll — কখনো নিচে নামবে না) ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',       /* ← কখনো wrap হবে না */
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto',        /* ← জায়গা না থাকলে scroll */
        flexShrink: 1,
        minWidth: 0,
        paddingLeft: 10,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>

        {/* Role badge */}
        <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:c+'18', color:c, border:`1px solid ${c}33`, whiteSpace:'nowrap', flexShrink:0 }}>
          {catEmoji[user?.role]||'👤'} {user?.role}
        </span>

        {/* Dashboard */}
        <Btn active={view==='dashboard'} onClick={()=>setView('dashboard')}>🏠 Dashboard</Btn>

        {/* My Work */}
        {isTalent && <Btn active={view==='mywork'} onClick={()=>setView('mywork')}>🗂 My Work</Btn>}

        {/* Hire View */}
        {isHirer && (
          <Btn active={view==='hire'} onClick={()=>setView('hire')} color="#6c5ce7">🔍 Hire</Btn>
        )}

        {/* Admin */}
        {isAdmin && (
          <Btn active={view==='admin'} onClick={()=>setView('admin')} color="#e17055">🛡️</Btn>
        )}

        {/* Bell */}
        <button
          onClick={handleNotificationClick}
          style={{ position:'relative', background:'#f8f8fc', border:'none', fontSize:18, cursor:'pointer', width:38, height:38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'transform 0.2s' }}
        >
          🔔
          {notifCount > 0 && (
            <span style={{ position:'absolute', top:-3, right:-3, background:'#ff4757', color:'#fff', borderRadius:'50%', padding:'1px 5px', fontSize:9, fontWeight:800, border:'2px solid #fff', lineHeight:1.4 }}>
              {notifCount}
            </span>
          )}
        </button>

        {/* Post / Upload */}
        {isWriter && (
          <button onClick={()=>setShowPostForm(true)} style={actionBtnStyle('linear-gradient(135deg,#2d3436,#1a2025)')}>
            + Post
          </button>
        )}
        {isTalent && (
          <button onClick={()=>setShowPostForm(true)} style={actionBtnStyle('linear-gradient(135deg,#6c5ce7,#a29bfe)')}>
            + Upload
          </button>
        )}

        {/* Profile */}
        <div
          onClick={()=>setView('profile')}
          style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', flexShrink:0, padding:'2px 6px', borderRadius:12 }}
        >
          <div style={{ textAlign:'right', lineHeight:1.2 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#1a1a2c', whiteSpace:'nowrap', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize:10, color:'#636e72', whiteSpace:'nowrap' }}>{user?.profession||user?.role}</div>
          </div>
          <img src={user?.profilePic||'/icon.png'} alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(201,168,76,0.35)', flexShrink:0 }}/>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{ ...actionBtnStyle('linear-gradient(135deg,#ff4757,#ff6b81)'), padding:'8px 12px', flexShrink:0 }}
        >
          ⏻
        </button>
      </div>
    </nav>
  );
};

/* ── Helper components & functions ── */

const Btn = ({ children, onClick, active, color = '#2d3436' }) => (
  <button
    onClick={onClick}
    style={{
      padding: '7px 13px',
      background: active ? `linear-gradient(135deg,${color},${color}cc)` : '#fff',
      color:  active ? '#fff' : color,
      border: `1.5px solid ${active ? color : color+'44'}`,
      borderRadius: 12,
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 12,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      boxShadow: active ? `0 4px 14px ${color}44` : 'none',
      transition: 'all 0.18s ease',
      fontFamily: "'DM Sans',sans-serif",
    }}
  >
    {children}
  </button>
);

const actionBtnStyle = (bg) => ({
  padding: '7px 14px',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
  transition: 'all 0.18s ease',
  fontFamily: "'DM Sans',sans-serif",
});

export default Navbar;