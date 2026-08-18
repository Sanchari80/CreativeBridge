import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, update } from "firebase/database";
import { db, TALENT_ROLES } from "../App";

// ── Sound ─────────────────────────────────────────────────────
const playTick = () => {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=1047;
    g.gain.setValueAtTime(0.08,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.07);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.08);
  }catch(e){}
};

// ── Ripple ────────────────────────────────────────────────────
const withRipple=(e,fn)=>{
  const btn=e.currentTarget,r=document.createElement('span');
  const rect=btn.getBoundingClientRect(),sz=Math.max(rect.width,rect.height);
  r.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,0.18);transform:scale(0);animation:nb-ripple 0.5s linear;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px;pointer-events:none;z-index:0`;
  btn.style.overflow='hidden';btn.style.position=btn.style.position||'relative';
  btn.appendChild(r);setTimeout(()=>r.remove(),600);fn&&fn();
};

// ── Inject navbar CSS once ────────────────────────────────────
const injectNavAnims = () => {
  if (document.getElementById('nb-anims')) return;
  const s = document.createElement('style');
  s.id = 'nb-anims';
  s.textContent = `
    @keyframes nb-ripple { to{transform:scale(2.5);opacity:0} }
    @keyframes nb-gradient { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
    @keyframes nb-note { 0%,100%{transform:translateY(0) rotate(-5deg);opacity:0.4} 50%{transform:translateY(-4px) rotate(5deg);opacity:0.7} }
    @keyframes nb-glow { 0%,100%{box-shadow:0 0 8px rgba(147,197,253,0.1)} 50%{box-shadow:0 0 18px rgba(147,197,253,0.25)} }
    @keyframes nb-bell { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-12deg)} 75%{transform:rotate(12deg)} }
    .nb-btn { transition:all 0.18s ease !important; }
    .nb-btn:hover { filter:brightness(1.2); transform:translateY(-1px); }
    .nb-btn:active { transform:scale(0.95); }
  `;
  document.head?.appendChild(s);
};

// ── Navigation items with creative icons ──────────────────────
const NAV_ITEMS = {
  dashboard: { icon:'🎬', label:'Dashboard',  color:'#8b5cf6' },
  search:    { icon:'🔭', label:'Discover',   color:'#06b6d4' },
  releases:  { icon:'🎭', label:'Releases',   color:'#f59e0b' },
  mywork:    { icon:'🎸', label:'My Work',    color:'#10b981' },
  hire:      { icon:'🎯', label:'Hire',       color:'#ec4899' },
  admin:     { icon:'🛡️', label:'Admin',      color:'#ef4444' },
  profile:   { icon:'🎪', label:'Profile',    color:'#94a3b8' },
};

// ── Logo with floating music notes ────────────────────────────
const AnimatedLogo = ({ onClick, mobile }) => (
  <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', position:'relative', minWidth:0 }}>
    {/* Floating notes — desktop only */}
    {!mobile && <div style={{ position:'absolute', left:-8, top:-8, fontSize:9, color:'rgba(147,197,253,0.5)', animation:'nb-note 2s ease-in-out infinite', pointerEvents:'none' }}>♪</div>}
    {!mobile && <div style={{ position:'absolute', right:-4, bottom:-6, fontSize:10, color:'rgba(139,92,246,0.5)', animation:'nb-note 2.5s ease-in-out 0.5s infinite', pointerEvents:'none' }}>♫</div>}

    {/* Logo icon */}
    <div style={{
      width:36, height:36, borderRadius:10, flexShrink:0,
      background:'linear-gradient(135deg,rgba(139,92,246,0.4),rgba(59,130,246,0.4))',
      border:'1px solid rgba(147,197,253,0.25)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:17, boxShadow:'0 0 14px rgba(139,92,246,0.3)',
    }}>🎬</div>

    {/* Brand name */}
    <div style={{ minWidth:0, overflow:'hidden' }}>
      <div style={{
        fontFamily:"'Playfair Display',Georgia,serif",
        fontWeight:800, fontSize: mobile ? '0.95rem' : '1.05rem',
        background:'linear-gradient(135deg,#e2e8f0,#93c5fd,#c4b5fd)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        backgroundClip:'text', letterSpacing:0.3, lineHeight:1.1,
        whiteSpace:'nowrap',
      }}>
        Creative Bridge
      </div>
      {/* Subtitle — hidden on mobile to prevent overlap */}
      {!mobile && (
        <div style={{ fontSize:7.5, color:'rgba(147,197,253,0.38)', letterSpacing:2.5, textTransform:'uppercase', marginTop:2, whiteSpace:'nowrap' }}>
          ♪ Entertainment Platform ♪
        </div>
      )}
    </div>
  </div>
);

// ── Nav button component ──────────────────────────────────────
const NavBtn = ({ id, active, onClick, color, icon, label, badge }) => (
  <button onClick={onClick} className="nb-btn"
    style={{
      display:'flex', alignItems:'center', gap:6,
      padding:'7px 13px', borderRadius:24, cursor:'pointer',
      fontWeight:700, fontSize:12, whiteSpace:'nowrap', flexShrink:0,
      position:'relative',
      background: active
        ? `linear-gradient(135deg,${color}55,${color}30)`
        : 'rgba(255,255,255,0.04)',
      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
      border: active
        ? `1.5px solid ${color}66`
        : '1.5px solid rgba(255,255,255,0.08)',
      boxShadow: active ? `0 0 18px ${color}44,0 2px 8px rgba(0,0,0,0.3)` : 'none',
    }}>
    <span style={{ fontSize:14, filter: active ? `drop-shadow(0 0 4px ${color})` : 'none' }}>{icon}</span>
    <span>{label}</span>
    {badge > 0 && (
      <span style={{
        position:'absolute', top:-5, right:-5,
        background:'#ef4444', color:'#fff',
        borderRadius:'50%', padding:'1px 5px',
        fontSize:9, fontWeight:800,
        border:'1.5px solid rgba(4,6,28,0.9)',
        lineHeight:1.4,
      }}>{badge}</span>
    )}
  </button>
);

// ── Bell Button ───────────────────────────────────────────────
const BellBtn = ({ count, onClick }) => (
  <button onClick={onClick} className="nb-btn"
    style={{
      position:'relative', width:38, height:38, borderRadius:'50%',
      background: count>0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
      border: count>0 ? '1.5px solid rgba(245,158,11,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:18, flexShrink:0,
      boxShadow: count>0 ? '0 0 16px rgba(245,158,11,0.3)' : 'none',
      animation: count>0 ? 'nb-bell 0.4s ease-in-out' : 'none',
    }}>
    🔔
    {count > 0 && (
      <span style={{ position:'absolute', top:-3, right:-3, background:'#ef4444', color:'#fff', borderRadius:'50%', padding:'1px 4px', fontSize:8, fontWeight:800, border:'1.5px solid rgba(4,6,28,0.9)', lineHeight:1.4 }}>
        {count}
      </span>
    )}
  </button>
);

// ══════════════════════════════════════════════════════════════
// MAIN NAVBAR
// ══════════════════════════════════════════════════════════════
const Navbar = ({ view, setView, setShowNotifications, showNotifications, setShowPostForm, handleLogout, liveVisitors, isAdmin }) => {
  const {
    user, requests, talentRequests, adminNotifications, bidNotifications,
    followNotifications, markFollowNotifRead, markBidNotifRead, markAdminNotifRead,
  } = useContext(AppContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    injectNavAnims();
    const onR = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const go = (v) => { playTick(); setView(v); setMenuOpen(false); };

  const userKey  = user?.email?.toLowerCase().replace(/\./g, ',');
  const isWriter = user?.role === 'Writer';
  const isTalent = TALENT_ROLES.includes(user?.role);
  const isHirer  = user?.role === 'Hirer' || user?.role === 'Looking for new stories';

  const writerPending    = requests.filter(r=>r.status==='pending'&&r.ownerPath===userKey).length;
  const hirerUnread      = requests.filter(r=>r.status==='approved'&&r.fromEmail===user?.email&&!r.read);
  const talentIncoming   = (talentRequests||[]).filter(r=>r.status==='pending'&&r.ownerPath===userKey).length;
  const talentOutgoing   = (talentRequests||[]).filter(r=>r.status==='approved'&&r.fromEmail===user?.email&&!r.read);
  const unreadBid        = (bidNotifications||[]).filter(n=>!n.read).length;
  const unreadFollow     = (followNotifications||[]).filter(n=>!n.read).length;
  const unreadAdmin      = isAdmin?(adminNotifications||[]).filter(n=>!n.read).length:0;
  const storyCount       = isWriter?writerPending:isHirer?hirerUnread.length:0;
  const talentTotal      = talentIncoming+talentOutgoing.length;
  const notifCount       = storyCount+talentTotal+unreadBid+unreadFollow+unreadAdmin;

  const handleBell = () => {
    setShowNotifications(!showNotifications);
    setMenuOpen(false);
    if (!showNotifications) {
      if (isHirer) hirerUnread.forEach(r=>update(ref(db,`requests/${r.ownerPath}/${r.firebaseKey}`),{read:true}));
      talentOutgoing.forEach(r=>update(ref(db,`talentRequests/${r.ownerPath}/${r.firebaseKey}`),{read:true}));
      (bidNotifications||[]).filter(n=>!n.read).forEach(n=>markBidNotifRead(n.firebaseKey));
      (followNotifications||[]).filter(n=>!n.read).forEach(n=>markFollowNotifRead(n.firebaseKey));
      if (isAdmin)(adminNotifications||[]).filter(n=>!n.read).forEach(n=>markAdminNotifRead(n.firebaseKey));
    }
  };

  // ── Animated navbar background ──────────────────────────────
  const navBg = {
    background:'linear-gradient(270deg,#020818,#050d2e,#080820,#03092a,#020818)',
    backgroundSize:'400% 400%',
    animation:'nb-gradient 10s ease infinite',
    borderBottom:'1px solid rgba(147,197,253,0.1)',
    boxShadow:'0 4px 30px rgba(0,0,0,0.5),0 1px 0 rgba(147,197,253,0.08)',
    backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    position:'sticky',top:0,zIndex:200,
    width:'100%',boxSizing:'border-box',
  };

  // ── Mobile drawer ───────────────────────────────────────────
  const MobileMenu = () => (
    <>
      <div onClick={()=>setMenuOpen(false)}
        style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:299,backdropFilter:'blur(6px)'}}/>
      <div style={{
        position:'fixed',top:0,right:0,width:260,height:'100%',
        background:'linear-gradient(180deg,#020818,#04102e,#020818)',
        backgroundSize:'400% 400%',animation:'nb-gradient 8s ease infinite',
        borderLeft:'1px solid rgba(147,197,253,0.12)',
        boxShadow:'-8px 0 40px rgba(0,0,0,0.6)',
        zIndex:300,overflowY:'auto',
      }}>
        {/* Header */}
        <div style={{padding:'20px 16px 14px',borderBottom:'1px solid rgba(147,197,253,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:10,color:'rgba(147,197,253,0.4)',letterSpacing:3,textTransform:'uppercase'}}>
            ♪ Navigation ♪
          </div>
          <button onClick={()=>setMenuOpen(false)}
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:13,fontWeight:700}}>✕</button>
        </div>

        {/* Profile card */}
        <div onClick={()=>go('profile')}
          style={{margin:'12px',padding:'12px 14px',borderRadius:14,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.18)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
          <img src={user?.profilePic||'/icon.png'} alt="" style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(139,92,246,0.4)',flexShrink:0}}/>
          <div style={{overflow:'hidden'}}>
            <div style={{fontWeight:700,fontSize:13,color:'rgba(255,255,255,0.9)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name}</div>
            <div style={{fontSize:10,color:'rgba(147,197,253,0.5)'}}>{user?.profession||user?.role}</div>
          </div>
        </div>

        {/* Live badge */}
        <div style={{margin:'0 12px 12px',display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:20,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#10b981'}}/>
          <span style={{fontSize:11,color:'#10b981',fontWeight:700}}>{liveVisitors} Live Creators</span>
        </div>

        {/* Nav links */}
        <div style={{padding:'0 10px',display:'flex',flexDirection:'column',gap:4}}>
          {[
            {id:'dashboard',show:true},
            {id:'search',show:true},
            {id:'releases',show:true},
            {id:'mywork',show:isTalent},
            {id:'hire',show:isHirer},
            {id:'admin',show:isAdmin},
          ].filter(i=>i.show).map(({id})=>{
            const item=NAV_ITEMS[id];
            return(
              <button key={id} onClick={e=>withRipple(e,()=>go(id))} className="nb-btn"
                style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:14,border:`1px solid ${view===id?item.color+'44':'rgba(255,255,255,0.06)'}`,cursor:'pointer',fontWeight:600,fontSize:13,textAlign:'left',position:'relative',transition:'all 0.18s',background:view===id?`linear-gradient(135deg,${item.color}20,${item.color}10)`:'rgba(255,255,255,0.03)',color:view===id?'#fff':'rgba(255,255,255,0.6)',boxShadow:view===id?`0 0 14px ${item.color}33`:'none'}}>
                <span style={{fontSize:20,filter:view===id?`drop-shadow(0 0 6px ${item.color})`:''}}>{item.icon}</span>
                <span>{item.label}</span>
                {view===id&&<div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:item.color,boxShadow:`0 0 8px ${item.color}`}}/>}
              </button>
            );
          })}
        </div>

        <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(147,197,253,0.1),transparent)',margin:'12px 10px'}}/>

        {/* Bell */}
        <div style={{padding:'0 10px'}}>
          <button onClick={handleBell} className="nb-btn"
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderRadius:14,border:`1px solid ${notifCount>0?'rgba(245,158,11,0.3)':'rgba(255,255,255,0.06)'}`,cursor:'pointer',fontWeight:600,fontSize:13,background:notifCount>0?'rgba(245,158,11,0.08)':'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.7)',position:'relative'}}>
            <span>🔔 Notifications</span>
            {notifCount>0&&<span style={{background:'#ef4444',color:'#fff',borderRadius:'50%',padding:'1px 6px',fontSize:10,fontWeight:800}}>{notifCount}</span>}
          </button>

          {/* Upload */}
          {(isWriter||isTalent)&&(
            <button onClick={e=>withRipple(e,()=>{playTick();setShowPostForm(true);setMenuOpen(false);})} className="nb-btn"
              style={{width:'100%',marginTop:6,padding:'11px 14px',borderRadius:14,border:'1px solid rgba(139,92,246,0.3)',cursor:'pointer',fontWeight:700,fontSize:13,background:'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(59,130,246,0.2))',color:'#fff',position:'relative',display:'flex',alignItems:'center',gap:8}}>
              <span>{isWriter?'✒️':'🎸'}</span>
              <span>{isWriter?'Post Story':'Upload Work'}</span>
            </button>
          )}

          <button onClick={()=>{playTick();handleLogout();setMenuOpen(false);}} className="nb-btn"
            style={{width:'100%',marginTop:6,padding:'11px 14px',borderRadius:14,border:'1px solid rgba(239,68,68,0.2)',cursor:'pointer',fontWeight:700,fontSize:13,background:'rgba(239,68,68,0.08)',color:'rgba(239,68,68,0.7)',display:'flex',alignItems:'center',gap:8}}>
            <span>⏻</span><span>Logout</span>
          </button>
        </div>
        <div style={{height:30}}/>
      </div>
    </>
  );

  // ── MOBILE NAVBAR ──────────────────────────────────────────
  if (isMobile) return (
    <>
      <nav style={{...navBg,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px',height:58}}>
        <AnimatedLogo onClick={()=>go('dashboard')} mobile={true}/>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* Live */}
          <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',padding:'3px 8px',borderRadius:20}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'#10b981'}}/>
            <span style={{fontSize:9,color:'#10b981',fontWeight:700}}>{liveVisitors}</span>
          </div>
          {/* Search shortcut */}
          <button onClick={e=>withRipple(e,()=>go('search'))} className="nb-btn"
            style={{background:'rgba(6,182,212,0.1)',border:'1px solid rgba(6,182,212,0.2)',width:34,height:34,borderRadius:'50%',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
            🔭
          </button>
          {/* Bell */}
          <BellBtn count={notifCount} onClick={handleBell}/>
          {/* Hamburger */}
          <button onClick={()=>setMenuOpen(true)}
            style={{width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(59,130,246,0.2))',border:'1px solid rgba(139,92,246,0.3)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,flexShrink:0}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{width:i===1?12:16,height:2,background:i===1?'rgba(139,92,246,0.8)':'rgba(255,255,255,0.7)',borderRadius:2}}/>
            ))}
          </button>
        </div>
      </nav>
      {menuOpen && <MobileMenu/>}
    </>
  );

  // ── DESKTOP NAVBAR ─────────────────────────────────────────
  return (
    <nav style={{...navBg,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 4%',height:62,minHeight:62}}>

      {/* Left: Logo + Live */}
      <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <AnimatedLogo onClick={()=>setView('dashboard')} mobile={false}/>
        <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',padding:'4px 10px',borderRadius:20}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#10b981'}}/>
          <span style={{fontSize:10,color:'#10b981',fontWeight:700,whiteSpace:'nowrap'}}>{liveVisitors} Live</span>
        </div>
      </div>

      {/* Center: Nav buttons */}
      <div style={{display:'flex',alignItems:'center',gap:4,overflowX:'auto',flexShrink:1,minWidth:0,padding:'0 12px',scrollbarWidth:'none'}}>
        <NavBtn id="dashboard" active={view==='dashboard'} onClick={e=>withRipple(e,()=>go('dashboard'))} {...NAV_ITEMS.dashboard}/>
        <NavBtn id="search"    active={view==='search'}    onClick={e=>withRipple(e,()=>go('search'))}    {...NAV_ITEMS.search}/>
        <NavBtn id="releases"  active={view==='releases'}  onClick={e=>withRipple(e,()=>go('releases'))}  {...NAV_ITEMS.releases}/>
        {isTalent && <NavBtn id="mywork" active={view==='mywork'} onClick={e=>withRipple(e,()=>go('mywork'))} {...NAV_ITEMS.mywork}/>}
        {isHirer   && <NavBtn id="hire"  active={view==='hire'}   onClick={e=>withRipple(e,()=>go('hire'))}   {...NAV_ITEMS.hire}/>}
        {isAdmin   && <NavBtn id="admin" active={view==='admin'}  onClick={e=>withRipple(e,()=>go('admin'))}  {...NAV_ITEMS.admin}/>}
      </div>

      {/* Right: Actions */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        {/* Upload button */}
        {(isWriter||isTalent) && (
          <button onClick={e=>withRipple(e,()=>{playTick();setShowPostForm(true);})} className="nb-btn"
            style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:24,border:'1px solid rgba(139,92,246,0.4)',cursor:'pointer',fontWeight:700,fontSize:12,background:'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(59,130,246,0.2))',color:'#fff',whiteSpace:'nowrap',boxShadow:'0 0 14px rgba(139,92,246,0.3)',position:'relative'}}>
            <span style={{fontSize:14}}>{isWriter?'✒️':'🎸'}</span>
            <span>{isWriter?'Post':'Upload'}</span>
          </button>
        )}

        {/* Bell */}
        <BellBtn count={notifCount} onClick={handleBell}/>

        {/* Profile */}
        <div onClick={()=>setView('profile')} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'4px 6px',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',transition:'all 0.2s'}}>
          <div style={{textAlign:'right',lineHeight:1.2}}>
            <div style={{fontWeight:700,fontSize:12,color:'rgba(255,255,255,0.85)',whiteSpace:'nowrap',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name}</div>
            <div style={{fontSize:9,color:'rgba(147,197,253,0.4)',whiteSpace:'nowrap',letterSpacing:0.5}}>{user?.role}</div>
          </div>
          <img src={user?.profilePic||'/icon.png'} alt="" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(139,92,246,0.4)',flexShrink:0}}/>
        </div>

        {/* Logout */}
        <button onClick={e=>withRipple(e,()=>handleLogout())} className="nb-btn"
          style={{width:32,height:32,borderRadius:'50%',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',cursor:'pointer',color:'rgba(239,68,68,0.7)',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
          ⏻
        </button>
      </div>
    </nav>
  );
};

export default Navbar;