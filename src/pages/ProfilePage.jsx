import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, update } from "firebase/database";
import { db } from '../App.jsx';

const CLOUD_NAME    = 'danbshghf';
const UPLOAD_PRESET = 'CreativeBridge';

// ── Neon Silver + Deep Blue palette ───────────────────────────
const N = {
  bg:     'rgba(4,6,28,0.92)',
  glass:  'rgba(5,8,35,0.75)',
  border: 'rgba(147,197,253,0.12)',
  silver: 'rgba(147,197,253,0.55)',
  text:   'rgba(255,255,255,0.92)',
  muted:  'rgba(147,197,253,0.45)',
  deep:   '#020818',
};

// ── Role config ────────────────────────────────────────────────
const ROLE_CFG = {
  Actor:   { color:'#ef4444', glow:'rgba(239,68,68,0.35)',   tag:'🎬 CINEMA ARTIST',   frame:'cinema'  },
  Dancer:  { color:'#ec4899', glow:'rgba(236,72,153,0.35)',  tag:'💃 STAGE PERFORMER', frame:'stage'   },
  Painter: { color:'#f59e0b', glow:'rgba(245,158,11,0.35)',  tag:'🎨 VISUAL ARTIST',   frame:'canvas'  },
  Writer:  { color:'#8b5cf6', glow:'rgba(139,92,246,0.35)',  tag:'✍️ AUTHOR',           frame:'book'    },
  Singer:  { color:'#06b6d4', glow:'rgba(6,182,212,0.35)',   tag:'🎤 MUSIC ARTIST',    frame:'music'   },
  Hirer:   { color:'#94a3b8', glow:'rgba(148,163,184,0.2)',  tag:'🔍 PRODUCER',         frame:'pro'     },
  'Looking for new stories': { color:'#94a3b8', glow:'rgba(148,163,184,0.2)', tag:'🔍 PRODUCER', frame:'pro' },
  Admin:   { color:'#8b5cf6', glow:'rgba(139,92,246,0.35)',  tag:'🛡️ ADMIN',            frame:'pro'     },
};

// ── Sound + ripple ────────────────────────────────────────────
const playClick = () => {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type='sine'; o.frequency.value=880;
    g.gain.setValueAtTime(0.1,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.08);
  } catch(e){}
};
const withRipple=(e,fn)=>{
  const btn=e.currentTarget, r=document.createElement('span');
  const rect=btn.getBoundingClientRect(), sz=Math.max(rect.width,rect.height);
  r.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,0.18);transform:scale(0);animation:ripple 0.5s linear;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px;pointer-events:none`;
  btn.style.overflow='hidden'; btn.style.position=btn.style.position||'relative';
  btn.appendChild(r); setTimeout(()=>r.remove(),600); fn&&fn();
};

// ──────────────────────────────────────────────────────────────
// ROLE-SPECIFIC PROFILE FRAMES
// ──────────────────────────────────────────────────────────────

// 🎬 Cinema frame — Actor / Anchor
const CinemaFrame = ({ src, size, uploading, onPicClick }) => (
  <div style={{position:'relative',cursor:'pointer'}} onClick={onPicClick}>
    {/* Film strip top */}
    <div style={{display:'flex',gap:3,padding:'4px 7px',background:'#090909',borderRadius:'8px 8px 0 0',border:'1px solid #1a1a1a',borderBottom:'none'}}>
      {[...Array(8)].map((_,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:'#202020'}}/>)}
    </div>
    {/* Screen */}
    <div style={{padding:5,background:'#0f0f0f',border:'5px solid #151515',boxShadow:`0 0 40px rgba(239,68,68,0.35),inset 0 0 20px rgba(0,0,0,0.8)`,position:'relative'}}>
      <img src={src||'/icon.png'} alt="" draggable={false}
        style={{width:size,height:size,objectFit:'cover',display:'block',filter:'contrast(1.05)'}}/>
      {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#ef4444',fontSize:12,fontWeight:700}}>Uploading...</div>}
      {/* Spotlight top */}
      <div style={{position:'absolute',top:-25,left:'50%',transform:'translateX(-50%)',width:size*0.9,height:25,background:'linear-gradient(180deg,rgba(239,68,68,0.5),transparent)',pointerEvents:'none'}}/>
    </div>
    {/* Film strip bottom */}
    <div style={{display:'flex',gap:3,padding:'4px 7px',background:'#090909',borderRadius:'0 0 8px 8px',border:'1px solid #1a1a1a',borderTop:'none'}}>
      {[...Array(8)].map((_,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:'#202020'}}/>)}
    </div>
    {/* Camera icon */}
    <div style={{position:'absolute',bottom:-8,right:-8,background:'#ef4444',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,border:'2px solid #0a0a0a',zIndex:2}}>📷</div>
  </div>
);

// 💃 Stage frame — Dancer
const StageFrame = ({ src, size, uploading, onPicClick }) => (
  <div style={{position:'relative',cursor:'pointer'}} onClick={onPicClick}>
    {/* Stage curtains */}
    <div style={{display:'flex',position:'absolute',top:-8,left:-10,right:-10,zIndex:1,pointerEvents:'none'}}>
      <div style={{flex:1,height:20,background:'linear-gradient(90deg,#4a0030,#1a0012)',borderRadius:'0 0 8px 0'}}/>
      <div style={{flex:1,height:20,background:'linear-gradient(270deg,#4a0030,#1a0012)',borderRadius:'0 0 0 8px'}}/>
    </div>
    {/* Stage box */}
    <div style={{padding:6,background:'rgba(5,0,20,0.95)',border:`3px solid #ec4899`,borderRadius:8,boxShadow:`0 0 35px rgba(236,72,153,0.45),inset 0 0 25px rgba(236,72,153,0.05)`,position:'relative',marginTop:8}}>
      {/* Spotlight cone */}
      <div style={{position:'absolute',top:-40,left:'50%',transform:'translateX(-50%)',width:size*0.8,height:40,background:'linear-gradient(180deg,rgba(236,72,153,0.4),transparent)',clipPath:'polygon(20% 0,80% 0,100% 100%,0 100%)',pointerEvents:'none'}}/>
      <img src={src||'/icon.png'} alt="" draggable={false}
        style={{width:size,height:size,objectFit:'cover',display:'block',borderRadius:4}}/>
      {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#ec4899',fontSize:12,fontWeight:700,borderRadius:4}}>Uploading...</div>}
    </div>
    {/* Stage floor */}
    <div style={{height:5,background:'linear-gradient(90deg,rgba(236,72,153,0),rgba(236,72,153,0.5),rgba(236,72,153,0))',marginTop:3,borderRadius:2}}/>
    <div style={{position:'absolute',bottom:-8,right:-8,background:'#ec4899',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,border:'2px solid #0a0a0a',zIndex:2}}>📷</div>
  </div>
);

// 🎨 Canvas frame — Painter
const CanvasFrame = ({ src, size, uploading, onPicClick }) => (
  <div style={{position:'relative',cursor:'pointer'}} onClick={onPicClick}>
    {/* Outer wooden frame */}
    <div style={{padding:12,background:'linear-gradient(135deg,#4a2c0a,#2a1606,#4a2c0a,#1e0f04,#3a2208)',boxShadow:`6px 6px 0 #0a0400,-3px -3px 0 #8b5e3c,0 0 35px rgba(245,158,11,0.25)`,borderRadius:4,position:'relative'}}>
      {/* Corner accents */}
      {[{t:-3,l:-3},{t:-3,r:-3},{b:-3,l:-3},{b:-3,r:-3}].map((pos,i)=>(
        <div key={i} style={{position:'absolute',width:14,height:14,background:'#c4973e',borderRadius:2,...pos}}/>
      ))}
      {/* Inner frame */}
      <div style={{border:'3px solid #8b5e3c',padding:3}}>
        <div style={{border:'1.5px solid #c4973e',background:'rgba(0,0,0,0.5)'}}>
          <img src={src||'/icon.png'} alt="" draggable={false}
            style={{width:size,height:size,objectFit:'cover',display:'block'}}/>
          {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#f59e0b',fontSize:12,fontWeight:700}}>Uploading...</div>}
        </div>
      </div>
    </div>
    <div style={{position:'absolute',bottom:-4,right:-8,background:'#f59e0b',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,border:'2px solid #0a0a0a',zIndex:2}}>📷</div>
  </div>
);

// 📖 Book cover frame — Writer
const BookFrame = ({ src, size, uploading, onPicClick }) => (
  <div style={{position:'relative',cursor:'pointer',display:'inline-flex'}} onClick={onPicClick}>
    {/* Book spine */}
    <div style={{width:16,background:'linear-gradient(180deg,#3b0764,#6d28d9,#3b0764)',borderRadius:'4px 0 0 4px',display:'flex',alignItems:'center',justifyContent:'center',writingMode:'vertical-rl',fontSize:8,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:2,paddingTop:8,boxShadow:'inset -2px 0 4px rgba(0,0,0,0.5)'}}>
      PROFILE
    </div>
    {/* Book cover */}
    <div style={{padding:6,background:'linear-gradient(135deg,#0f0828,#1e0f50,#0a0520)',border:'1px solid rgba(139,92,246,0.5)',borderLeft:'none',borderRadius:'0 6px 6px 0',boxShadow:`0 0 30px rgba(139,92,246,0.3),4px 4px 12px rgba(0,0,0,0.6)`,position:'relative'}}>
      {/* Top decorative rule */}
      <div style={{height:2,background:'linear-gradient(90deg,transparent,#8b5cf6,transparent)',marginBottom:5,borderRadius:1}}/>
      <img src={src||'/icon.png'} alt="" draggable={false}
        style={{width:size-10,height:size-10,objectFit:'cover',display:'block',borderRadius:2}}/>
      {/* Bottom decorative rule */}
      <div style={{height:2,background:'linear-gradient(90deg,transparent,#8b5cf6,transparent)',marginTop:5,borderRadius:1}}/>
      {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b5cf6',fontSize:12,fontWeight:700}}>Uploading...</div>}
    </div>
    <div style={{position:'absolute',bottom:-6,right:-8,background:'#8b5cf6',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,border:'2px solid #0a0a0a',zIndex:2}}>📷</div>
  </div>
);

// 🎤 Music frame — Singer
const MusicFrame = ({ src, size, uploading, onPicClick }) => (
  <div style={{position:'relative',cursor:'pointer'}} onClick={onPicClick}>
    {/* Soundwave top */}
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:2,height:14,marginBottom:4}}>
      {[4,8,12,6,14,10,5,12,8,4].map((h,i)=>(
        <div key={i} style={{width:4,height:h,background:`rgba(6,182,212,${0.4+i*0.05})`,borderRadius:2,animation:'floatNote 1.5s ease-in-out infinite',animationDelay:`${i*0.1}s`}}/>
      ))}
    </div>
    {/* Main frame */}
    <div style={{padding:6,background:'rgba(0,15,25,0.95)',border:`3px solid #06b6d4`,borderRadius:10,boxShadow:`0 0 35px rgba(6,182,212,0.4),inset 0 0 20px rgba(6,182,212,0.05)`,position:'relative'}}>
      <img src={src||'/icon.png'} alt="" draggable={false}
        style={{width:size,height:size,objectFit:'cover',display:'block',borderRadius:6}}/>
      {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#06b6d4',fontSize:12,fontWeight:700,borderRadius:6}}>Uploading...</div>}
      {/* Musical notes */}
      <div style={{position:'absolute',top:4,right:4,fontSize:12,opacity:0.6}}>🎵</div>
    </div>
    {/* Soundwave bottom */}
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'center',gap:2,height:14,marginTop:4}}>
      {[4,8,12,6,14,10,5,12,8,4].map((h,i)=>(
        <div key={i} style={{width:4,height:h,background:`rgba(6,182,212,${0.4+i*0.05})`,borderRadius:2}}/>
      ))}
    </div>
    <div style={{position:'absolute',bottom:6,right:-8,background:'#06b6d4',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,border:'2px solid #0a0a0a',zIndex:2}}>📷</div>
  </div>
);

// 🔍 Pro frame — Hirer / Admin
const ProFrame = ({ src, size, uploading, onPicClick }) => (
  <div style={{position:'relative',cursor:'pointer'}} onClick={onPicClick}>
    <div style={{padding:4,background:'linear-gradient(135deg,#0f172a,#1e293b)',border:'2px solid rgba(147,197,253,0.3)',borderRadius:'50%',boxShadow:'0 0 25px rgba(147,197,253,0.2)'}}>
      <img src={src||'/icon.png'} alt="" draggable={false}
        style={{width:size,height:size,objectFit:'cover',display:'block',borderRadius:'50%'}}/>
      {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:12,fontWeight:700,borderRadius:'50%'}}>Uploading...</div>}
    </div>
    <div style={{position:'absolute',bottom:2,right:2,background:'#94a3b8',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,border:'2px solid #0a0a0a',zIndex:2}}>📷</div>
  </div>
);

// ── Frame selector ─────────────────────────────────────────────
const ProfileFrame = ({ role, src, size=90, uploading, onPicClick }) => {
  const frame = ROLE_CFG[role]?.frame || 'pro';
  const props = { src, size, uploading, onPicClick };
  if (frame==='cinema') return <CinemaFrame {...props}/>;
  if (frame==='stage')  return <StageFrame {...props}/>;
  if (frame==='canvas') return <CanvasFrame {...props}/>;
  if (frame==='book')   return <BookFrame {...props}/>;
  if (frame==='music')  return <MusicFrame {...props}/>;
  return <ProFrame {...props}/>;
};

// ── Main Component ─────────────────────────────────────────────
const ProfilePage = ({ onBack }) => {
  const { user, setUser } = useContext(AppContext);

  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 640);

  const [form, setForm] = useState({
    name:       user?.name       || '',
    profession: user?.profession || '',
    address:    user?.address    || '',
    phone:      user?.phone      || '',
    whatsapp:   user?.whatsapp   || '',
    facebook:   user?.facebook   || '',
    bio:        user?.bio        || '',
  });

  const picRef   = useRef(null);
  const emailKey = user?.email?.replace(/\./g, ',');
  const roleCfg  = ROLE_CFG[user?.role] || ROLE_CFG['Hirer'];

  useEffect(() => {
    // Inject animations once
    if (!document.getElementById('profile-anims')) {
      const s = document.createElement('style');
      s.id = 'profile-anims';
      s.textContent = `
        @keyframes ripple { to{transform:scale(2.5);opacity:0} }
        @keyframes floatNote { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes neonPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .p-input:focus { border-color:rgba(147,197,253,0.5)!important; box-shadow:0 0 0 3px rgba(147,197,253,0.1)!important; }
        .p-btn:hover { filter:brightness(1.15); transform:scale(1.02); }
      `;
      document.head?.appendChild(s);
    }
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const buildProfileLink = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?profile=${user.email}`;
  };

  const handleCopyLink = async () => {
    const link = buildProfileLink();
    try { await navigator.clipboard.writeText(link); }
    catch { const t=document.createElement('textarea');t.value=link;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t); }
    setCopied(true); setTimeout(()=>setCopied(false), 2500);
  };

  const handlePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { alert('Image must be under 5MB'); return; }
    setUploadingPic(true);
    const fd = new FormData();
    fd.append('file', file); fd.append('upload_preset', UPLOAD_PRESET); fd.append('folder','CreativeBridge/profiles');
    try {
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{method:'POST',body:fd});
      const data = await res.json();
      if (data.secure_url) {
        await update(ref(db,`users/${emailKey}`),{profilePic:data.secure_url});
        const u = {...user,profilePic:data.secure_url};
        setUser(u); localStorage.setItem('activeUser',JSON.stringify(u));
      }
    } catch(err){ alert('Upload failed: '+err.message); }
    finally { setUploadingPic(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Name required'); return; }
    setSaving(true);
    try {
      const updates = { name:form.name.trim(), profession:form.profession.trim(), address:form.address.trim(), phone:form.phone.trim(), whatsapp:form.whatsapp.trim(), facebook:form.facebook.trim(), bio:form.bio.trim() };
      await update(ref(db,`users/${emailKey}`),updates);
      const u = {...user,...updates};
      setUser(u); localStorage.setItem('activeUser',JSON.stringify(u));
      setEditing(false);
    } catch(err){ alert('Save failed: '+err.message); }
    finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setForm({ name:user?.name||'', profession:user?.profession||'', address:user?.address||'', phone:user?.phone||'', whatsapp:user?.whatsapp||'', facebook:user?.facebook||'', bio:user?.bio||'' });
    setEditing(false);
  };

  const inpStyle = {
    width:'100%', padding:'11px 14px',
    border:'1px solid rgba(147,197,253,0.18)',
    borderRadius:12, boxSizing:'border-box', fontSize:14,
    background:'rgba(5,8,35,0.6)', color:N.text,
    marginBottom:10, outline:'none', fontFamily:'inherit',
    transition:'border-color 0.2s,box-shadow 0.2s',
  };
  const lblStyle = { display:'block', fontSize:10, fontWeight:700, color:N.muted, marginBottom:5, textTransform:'uppercase', letterSpacing:'1.5px' };
  const glass = { background:N.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${N.border}`, borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,0,0.5)' };

  return (
    <div style={{maxWidth:640, margin:'0 auto', animation:'slideUp 0.35s ease'}}>

      {/* Back */}
      <button onClick={e=>withRipple(e,()=>{playClick();onBack();})} className="p-btn"
        style={{background:'none',border:'none',color:N.muted,cursor:'pointer',fontWeight:700,fontSize:14,marginBottom:16,display:'block',padding:0,transition:'color 0.2s',position:'relative'}}>
        ← Back
      </button>

      {/* ── Main card ── */}
      <div style={{...glass,padding: isMobile ? '20px 14px' : '28px 24px'}}>

        {/* Header section */}
        <div style={{display:'flex',alignItems:'flex-start',gap: isMobile ? 14 : 24,marginBottom:20,flexWrap:'wrap'}}>

          {/* Role-specific profile frame */}
          <div style={{flexShrink:0,paddingTop:4}}>
            <ProfileFrame
              role={user?.role}
              src={user?.profilePic}
              size={isMobile ? 72 : 90}
              uploading={uploadingPic}
              onPicClick={() => picRef.current?.click()}
            />
            <input ref={picRef} type="file" accept="image/*" onChange={handlePicUpload} style={{display:'none'}}/>
          </div>

          {/* Name + role + actions */}
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{margin:'0 0 8px',color:N.text,fontSize: isMobile ? 18 : 22,fontFamily:'Georgia,serif'}}>{user?.name}</h2>

            {/* Role badge */}
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 14px',borderRadius:20,background:`${roleCfg.color}18`,border:`1px solid ${roleCfg.color}44`,marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:800,color:roleCfg.color,letterSpacing:1.5,textTransform:'uppercase'}}>{roleCfg.tag}</span>
            </div>

            <p style={{margin:'4px 0 0',fontSize:12,color:N.muted}}>{user?.email}</p>
            {user?.profession && <p style={{margin:'3px 0 0',fontSize:13,color:N.silver}}>💼 {user.profession}</p>}

            {/* Action buttons */}
            <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
              <button onClick={e=>withRipple(e,()=>handleCopyLink())} className="p-btn"
                style={{padding:'8px 16px',background:copied?'rgba(16,185,129,0.2)':'rgba(147,197,253,0.08)',color:copied?'#10b981':N.silver,border:`1px solid ${copied?'rgba(16,185,129,0.3)':'rgba(147,197,253,0.2)'}`,borderRadius:12,cursor:'pointer',fontWeight:700,fontSize:12,transition:'all 0.2s',position:'relative'}}>
                {copied?'✅ Link Copied!':'🔗 Copy Profile Link'}
              </button>
              {!editing && (
                <button onClick={e=>withRipple(e,()=>{playClick();setEditing(true);})} className="p-btn"
                  style={{padding:'8px 16px',background:'rgba(139,92,246,0.12)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.25)',borderRadius:12,cursor:'pointer',fontWeight:700,fontSize:12,position:'relative'}}>
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Share hint */}
        <div style={{background:'rgba(147,197,253,0.04)',border:'1px solid rgba(147,197,253,0.1)',borderRadius:10,padding:'10px 14px',fontSize:12,color:N.muted,marginBottom:18}}>
          🔗 Share your profile link anywhere — anyone who clicks it will land directly on your profile.
        </div>

        {/* Divider */}
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${roleCfg.color}44,transparent)`,marginBottom:18}}/>

        {editing ? (
          /* ── EDIT MODE ── */
          <div>
            <p style={{margin:'0 0 16px',fontSize:10,color:N.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>Edit Profile</p>

            <label style={lblStyle}>Full Name *</label>
            <input className="p-input" style={inpStyle} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your full name"/>

            <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:10}}>
              <div>
                <label style={lblStyle}>Profession</label>
                <input className="p-input" style={{...inpStyle,marginBottom:0}} value={form.profession} onChange={e=>setForm(f=>({...f,profession:e.target.value}))} placeholder="Your expertise"/>
              </div>
              <div>
                <label style={lblStyle}>Address</label>
                <input className="p-input" style={{...inpStyle,marginBottom:0}} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="City, District"/>
              </div>
            </div>
            <div style={{height:10}}/>

            <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:10}}>
              <div>
                <label style={lblStyle}>Phone</label>
                <input className="p-input" style={{...inpStyle,marginBottom:0}} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="01XXXXXXXXX"/>
              </div>
              <div>
                <label style={lblStyle}>WhatsApp</label>
                <input className="p-input" style={{...inpStyle,marginBottom:0}} value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="01XXXXXXXXX"/>
              </div>
            </div>
            <div style={{height:10}}/>

            <label style={lblStyle}>Facebook Profile Link</label>
            <input className="p-input" style={inpStyle} value={form.facebook} onChange={e=>setForm(f=>({...f,facebook:e.target.value}))} placeholder="https://facebook.com/yourname"/>

            <label style={lblStyle}>Bio / About</label>
            <textarea className="p-input" style={{...inpStyle,height:80,resize:'none'}} value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} placeholder="Tell others about yourself and your work..."/>

            <div style={{display:'flex',gap:10,marginTop:6}}>
              <button onClick={e=>withRipple(e,cancelEdit)} className="p-btn"
                style={{flex:1,padding:10,borderRadius:12,border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',background:'rgba(255,255,255,0.03)',color:N.muted,fontWeight:600,position:'relative'}}>
                Cancel
              </button>
              <button onClick={e=>withRipple(e,()=>handleSave())} disabled={saving} className="p-btn"
                style={{flex:2,padding:10,borderRadius:12,border:'none',background:`linear-gradient(135deg,${roleCfg.color}88,${roleCfg.color}44)`,color:'#fff',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontSize:13,boxShadow:`0 4px 20px ${roleCfg.glow}`,position:'relative',opacity:saving?0.7:1}}>
                {saving?'Saving...':'✅ Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          /* ── VIEW MODE ── */
          <div>
            <p style={{margin:'0 0 14px',fontSize:10,color:N.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>Profile Information</p>

            {[
              {icon:'📍',label:'Address',   val:user?.address},
              {icon:'📞',label:'Phone',     val:user?.phone},
              {icon:'💬',label:'WhatsApp',  val:user?.whatsapp},
            ].filter(r=>r.val).map((r,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(147,197,253,0.06)'}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{r.icon}</span>
                <div>
                  <div style={{fontSize:10,color:N.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>{r.label}</div>
                  <div style={{fontSize:14,color:N.text}}>{r.val}</div>
                </div>
              </div>
            ))}

            {user?.facebook && (
              <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(147,197,253,0.06)'}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}}>👤</span>
                <div>
                  <div style={{fontSize:10,color:N.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Facebook</div>
                  <a href={user.facebook} target="_blank" rel="noreferrer" style={{fontSize:13,color:roleCfg.color,wordBreak:'break-all'}}>{user.facebook}</a>
                </div>
              </div>
            )}

            {user?.bio && (
              <div style={{marginTop:14,padding:'12px 16px',background:'rgba(147,197,253,0.04)',borderRadius:12,fontSize:14,color:'rgba(255,255,255,0.7)',lineHeight:1.7,border:'1px solid rgba(147,197,253,0.06)'}}>
                {user.bio}
              </div>
            )}

            {!user?.address && !user?.phone && !user?.whatsapp && !user?.facebook && !user?.bio && (
              <p style={{color:N.muted,fontSize:13}}>No profile info yet. Click "Edit Profile" to add details.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;