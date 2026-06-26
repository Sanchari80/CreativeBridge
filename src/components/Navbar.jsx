// Navbar.jsx — full updated
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, update } from "firebase/database";
import { db, TALENT_ROLES } from "../App";

const Navbar = ({ view, setView, setShowNotifications, showNotifications, setShowPostForm, handleLogout, liveVisitors, isAdmin }) => {
  const { user, requests, talentRequests, adminNotifications, bidNotifications } = useContext(AppContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const go = (v) => { setView(v); setMenuOpen(false); };

  const userKey  = user?.email?.toLowerCase().replace(/\./g, ',');
  const isWriter = user?.role === 'Writer';
  const isTalent = TALENT_ROLES.includes(user?.role);
  const isHirer  = user?.role === 'Hirer' || user?.role === 'Looking for new stories';

  // ── Story requests (Writer receives / Hirer sends — unchanged) ──
  const writerPending     = requests.filter(r => r.status === 'pending' && r.ownerPath === userKey).length;
  const hirerUnreadStory  = requests.filter(r => r.status === 'approved' && r.fromEmail === user?.email && !r.read);

  // ── Contact requests — ANY role can send AND receive, so both
  // directions are counted for everyone (not gated by role anymore) ──
  const talentIncomingPending      = (talentRequests||[]).filter(r => r.status === 'pending' && r.ownerPath === userKey).length;
  const talentOutgoingApprovedUnread = (talentRequests||[]).filter(r => r.status === 'approved' && r.fromEmail === user?.email && !r.read);
  const talentTotal = talentIncomingPending + talentOutgoingApprovedUnread.length;

  // ── Bid notification counts ───────────────────────────────────
  const unreadBidNotifs   = (bidNotifications||[]).filter(n => !n.read).length;
  const unreadAdminNotifs = isAdmin ? (adminNotifications||[]).filter(n => !n.read).length : 0;

  // Story count stays role-specific (Writer incoming / Hirer outgoing);
  // contact count is universal for every role.
  const storyCount = isWriter ? writerPending : isHirer ? hirerUnreadStory.length : 0;
  const baseCount  = storyCount + talentTotal;
  const notifCount = baseCount + unreadBidNotifs + unreadAdminNotifs;

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setMenuOpen(false);
    if (!showNotifications) {
      if (isHirer) {
        hirerUnreadStory.forEach(r => update(ref(db, `requests/${r.ownerPath}/${r.firebaseKey}`), { read: true }));
      }
      // Mark MY outgoing approved contact requests as read — works for any role
      talentOutgoingApprovedUnread.forEach(r => update(ref(db, `talentRequests/${r.ownerPath}/${r.firebaseKey}`), { read: true }));
    }
  };

  const catColor = { Writer:'#7B6CF6', Singer:'#00C48C', Painter:'#FF6B47', Actor:'#FFB830', Dancer:'#FF5CA8', Hirer:'#636e72', 'Looking for new stories':'#636e72' };
  const catEmoji = { Writer:'✍️', Singer:'🎤', Painter:'🎨', Actor:'🎬', Dancer:'💃', Hirer:'🔍', 'Looking for new stories':'🔍' };
  const c = catColor[user?.role] || '#636e72';

  // ── Mobile Panel ──────────────────────────────────────────────
  const MobileActions = () => (
    <>
      <div onClick={()=>setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:299, backdropFilter:'blur(3px)' }}/>
      <div style={{
        position:'fixed', top:0, right:0, width:230, height:'100%', maxHeight:'100%',
        background:'rgba(255,255,255,0.98)', backdropFilter:'blur(24px)',
        boxShadow:'-8px 0 40px rgba(0,0,0,0.18)', zIndex:300,
        display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden',
        WebkitOverflowScrolling:'touch',
      }}>
        <div style={{ display:'flex', flexDirection:'column', padding:'64px 14px 32px', gap:8, flexShrink:0 }}>
          <button onClick={()=>setMenuOpen(false)} style={{
            position:'absolute', top:14, right:14, background:'#f1f2f6', border:'none',
            borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:16, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>✕</button>

          {/* Profile card */}
          <div onClick={()=>go('profile')} style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:14,
            background:'linear-gradient(135deg,rgba(108,92,231,0.08),rgba(201,168,76,0.08))',
            border:'1px solid rgba(108,92,231,0.15)', cursor:'pointer', marginBottom:4,
          }}>
            <img src={user?.profilePic||'/icon.png'} alt="" style={{width:40,height:40,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(201,168,76,0.35)',flexShrink:0}}/>
            <div style={{overflow:'hidden'}}>
              <div style={{fontWeight:700,fontSize:13,color:'#1a1a2c',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name}</div>
              <div style={{fontSize:10,color:'#636e72'}}>{user?.profession||user?.role}</div>
            </div>
          </div>

          <span style={{fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:20,background:c+'18',color:c,border:`1px solid ${c}33`,textAlign:'center'}}>
            {catEmoji[user?.role]||'👤'} {user?.role}
          </span>

          <div style={{height:1,background:'#f0f0f0',margin:'2px 0'}}/>

          <ColBtn active={view==='dashboard'} onClick={()=>go('dashboard')}>🏠 Dashboard</ColBtn>
          {isTalent && <ColBtn active={view==='mywork'} onClick={()=>go('mywork')}>🗂 My Work</ColBtn>}
          {isHirer  && <ColBtn active={view==='hire'}   onClick={()=>go('hire')}   color="#6c5ce7">🔍 Hire View</ColBtn>}
          {isAdmin  && <ColBtn active={view==='admin'}  onClick={()=>go('admin')}  color="#e17055">🛡️ Admin</ColBtn>}

          <div style={{height:1,background:'#f0f0f0',margin:'2px 0'}}/>

          {/* Notifications button with total count */}
          <button onClick={handleNotificationClick} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 14px', borderRadius:12, border:'1.5px solid #eee',
            background: notifCount>0 ? '#fff9f0' : '#f8f8fc',
            cursor:'pointer', fontWeight:600, fontSize:13,
          }}>
            <span>🔔 Notifications</span>
            {notifCount>0 && (
              <span style={{background:'#ff4757',color:'#fff',borderRadius:'50%',padding:'1px 6px',fontSize:10,fontWeight:800}}>
                {notifCount}
              </span>
            )}
          </button>

          {/* Bid badge for mobile */}
          {unreadBidNotifs > 0 && (
            <div style={{ background:'#fff9db', border:'1px solid #f9ca24', borderRadius:10, padding:'7px 12px', fontSize:12, color:'#f39c12', fontWeight:600, display:'flex', justifyContent:'space-between' }}>
              <span>💰 Bid Updates</span>
              <span style={{background:'#f39c12',color:'#fff',borderRadius:'50%',padding:'1px 6px',fontSize:10,fontWeight:800}}>{unreadBidNotifs}</span>
            </div>
          )}

          {isWriter && <button onClick={()=>{setShowPostForm(true);setMenuOpen(false);}} style={colActionBtn('linear-gradient(135deg,#2d3436,#1a2025)')}>✍️ + Post Story</button>}
          {isTalent && <button onClick={()=>{setShowPostForm(true);setMenuOpen(false);}} style={colActionBtn('linear-gradient(135deg,#6c5ce7,#a29bfe)')}>🎵 + Upload Work</button>}

          <div style={{height:1,background:'#f0f0f0',margin:'2px 0'}}/>

          <button onClick={()=>{handleLogout();setMenuOpen(false);}} style={colActionBtn('linear-gradient(135deg,#ff4757,#ff6b81)')}>⏻ Logout</button>
          <div style={{height:16}}/>
        </div>
      </div>
    </>
  );

  // ── MOBILE NAVBAR ─────────────────────────────────────────────
  if (isMobile) return (
    <>
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 4%', height:58, background:'rgba(255,255,255,0.96)',
        backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
        borderBottom:'1px solid rgba(201,168,76,0.2)',
        boxShadow:'0 4px 20px rgba(0,0,0,0.08)',
        position:'sticky', top:0, zIndex:200, width:'100%', boxSizing:'border-box',
      }}>
        <div onClick={()=>go('dashboard')} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',flexShrink:0}}>
          <img src="/icon.png" alt="icon" style={{width:34,height:34,borderRadius:8,boxShadow:'0 3px 10px rgba(201,168,76,0.3)'}}/>
          <span style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:'1.05rem',background:'linear-gradient(135deg,#1a1a2c,#5846E4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',whiteSpace:'nowrap'}}>
            Creative Bridge
          </span>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{display:'flex',alignItems:'center',gap:4,background:'#e8f5e9',border:'1px solid #c8e6c9',padding:'3px 8px',borderRadius:20,fontSize:10,color:'#2e7d32',fontWeight:700}}>
            <span style={{width:5,height:5,background:'#4caf50',borderRadius:'50%',display:'inline-block'}}/>{liveVisitors}
          </span>
          <button onClick={handleNotificationClick} style={{position:'relative',background:'#f8f8fc',border:'none',fontSize:16,cursor:'pointer',width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            🔔
            {notifCount>0 && <span style={{position:'absolute',top:-2,right:-2,background:'#ff4757',color:'#fff',borderRadius:'50%',padding:'1px 4px',fontSize:8,fontWeight:800,border:'1.5px solid #fff'}}>{notifCount}</span>}
          </button>
          <button onClick={()=>setMenuOpen(true)} style={{
            background:'linear-gradient(135deg,#2d3436,#1a2025)', border:'none', borderRadius:10, width:38, height:38,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer', flexShrink:0,
          }}>
            {[0,1,2].map(i=><span key={i} style={{width:16,height:2,background:'#fff',borderRadius:2,display:'block'}}/>)}
          </button>
        </div>
      </nav>
      {menuOpen && <MobileActions />}
    </>
  );

  // ── DESKTOP NAVBAR ────────────────────────────────────────────
  return (
    <nav style={{
      display:'flex', flexDirection:'row', flexWrap:'nowrap',
      alignItems:'center', justifyContent:'space-between',
      padding:'0 4%', height:64, minHeight:64,
      background:'rgba(255,255,255,0.95)',
      backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
      borderBottom:'1px solid rgba(201,168,76,0.2)',
      boxShadow:'0 4px 30px rgba(0,0,0,0.1)',
      position:'sticky', top:0, zIndex:200,
      width:'100%', boxSizing:'border-box', overflow:'hidden',
    }}>
      <div onClick={()=>setView('dashboard')} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexShrink:0}}>
        <img src="/icon.png" alt="icon" style={{width:38,height:38,borderRadius:10,boxShadow:'0 4px 14px rgba(201,168,76,0.3)',flexShrink:0}}/>
        <span style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:'1.2rem',background:'linear-gradient(135deg,#1a1a2c,#5846E4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',whiteSpace:'nowrap'}}>
          Creative Bridge
        </span>
        <span style={{display:'flex',alignItems:'center',gap:5,background:'#e8f5e9',border:'1px solid #c8e6c9',padding:'3px 10px',borderRadius:20,fontSize:11,color:'#2e7d32',fontWeight:700,whiteSpace:'nowrap',marginLeft:4}}>
          <span style={{width:6,height:6,background:'#4caf50',borderRadius:'50%',display:'inline-block',flexShrink:0}}/>{liveVisitors} Live
        </span>
      </div>

      <div style={{display:'flex',flexDirection:'row',flexWrap:'nowrap',alignItems:'center',gap:6,overflowX:'auto',flexShrink:1,minWidth:0,paddingLeft:10,scrollbarWidth:'none',msOverflowStyle:'none'}}>
        <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20,background:c+'18',color:c,border:`1px solid ${c}33`,whiteSpace:'nowrap',flexShrink:0}}>
          {catEmoji[user?.role]||'👤'} {user?.role}
        </span>
        <Btn active={view==='dashboard'} onClick={()=>setView('dashboard')}>🏠 Dashboard</Btn>
        {isTalent && <Btn active={view==='mywork'} onClick={()=>setView('mywork')}>🗂 My Work</Btn>}
        {isHirer   && <Btn active={view==='hire'}  onClick={()=>setView('hire')}  color="#6c5ce7">🔍 Hire</Btn>}
        {isAdmin   && <Btn active={view==='admin'} onClick={()=>setView('admin')} color="#e17055">🛡️</Btn>}

        {/* Bell — shows total count including bid notifs */}
        <button onClick={handleNotificationClick} style={{position:'relative',background: notifCount>0?'#fff9f0':'#f8f8fc',border:'none',fontSize:18,cursor:'pointer',width:38,height:38,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'transform 0.2s'}}>
          🔔
          {notifCount>0 && <span style={{position:'absolute',top:-3,right:-3,background:'#ff4757',color:'#fff',borderRadius:'50%',padding:'1px 5px',fontSize:9,fontWeight:800,border:'2px solid #fff',lineHeight:1.4}}>{notifCount}</span>}
        </button>

        {isWriter && <button onClick={()=>setShowPostForm(true)} style={actionBtnStyle('linear-gradient(135deg,#2d3436,#1a2025)')}>+ Post</button>}
        {isTalent && <button onClick={()=>setShowPostForm(true)} style={actionBtnStyle('linear-gradient(135deg,#6c5ce7,#a29bfe)')}>+ Upload</button>}

        <div onClick={()=>setView('profile')} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',flexShrink:0,padding:'2px 6px',borderRadius:12}}>
          <div style={{textAlign:'right',lineHeight:1.2}}>
            <div style={{fontWeight:700,fontSize:13,color:'#1a1a2c',whiteSpace:'nowrap',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name}</div>
            <div style={{fontSize:10,color:'#636e72',whiteSpace:'nowrap'}}>{user?.profession||user?.role}</div>
          </div>
          <img src={user?.profilePic||'/icon.png'} alt="" style={{width:34,height:34,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(201,168,76,0.35)',flexShrink:0}}/>
        </div>

        <button onClick={handleLogout} style={{...actionBtnStyle('linear-gradient(135deg,#ff4757,#ff6b81)'),padding:'8px 12px',flexShrink:0}}>⏻</button>
      </div>
    </nav>
  );
};

/* ── Helpers ── */
const Btn = ({ children, onClick, active, color = '#2d3436' }) => (
  <button onClick={onClick} style={{
    padding:'7px 13px',
    background: active ? `linear-gradient(135deg,${color},${color}cc)` : '#fff',
    color: active ? '#fff' : color,
    border: `1.5px solid ${active ? color : color+'44'}`,
    borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:12,
    whiteSpace:'nowrap', flexShrink:0,
    boxShadow: active ? `0 4px 14px ${color}44` : 'none',
    transition:'all 0.18s ease', fontFamily:"'DM Sans',sans-serif",
  }}>{children}</button>
);

const ColBtn = ({ children, onClick, active, color = '#2d3436' }) => (
  <button onClick={onClick} style={{
    padding:'11px 14px', width:'100%', textAlign:'left',
    background: active ? `linear-gradient(135deg,${color},${color}dd)` : '#f8f9fa',
    color: active ? '#fff' : '#2d3436',
    border: `1.5px solid ${active ? color : '#eee'}`,
    borderRadius:12, cursor:'pointer', fontWeight:600, fontSize:13,
    boxShadow: active ? `0 4px 14px ${color}33` : 'none',
    transition:'all 0.18s ease', fontFamily:"'DM Sans',sans-serif",
  }}>{children}</button>
);

const actionBtnStyle = (bg) => ({
  padding:'7px 14px', background:bg, color:'#fff', border:'none',
  borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:12,
  whiteSpace:'nowrap', flexShrink:0, boxShadow:'0 4px 14px rgba(0,0,0,0.2)',
  transition:'all 0.18s ease', fontFamily:"'DM Sans',sans-serif",
});

const colActionBtn = (bg) => ({
  padding:'11px 14px', width:'100%', background:bg, color:'#fff', border:'none',
  borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:13, textAlign:'left',
  boxShadow:'0 4px 14px rgba(0,0,0,0.15)', fontFamily:"'DM Sans',sans-serif",
});

export default Navbar;