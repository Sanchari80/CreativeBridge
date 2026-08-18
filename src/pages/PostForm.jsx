import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, push, set } from "firebase/database";
import { db } from '../App.jsx';

const CLOUD_NAME    = 'danbshghf';
const UPLOAD_PRESET = 'CreativeBridge';

// ── Talent upload config ──────────────────────────────────────
const TALENT_CFG = {
  Singer:  { label:'Song',    icon:'🎤', accept:'audio/*,video/*', maxMB:100, resourceType:'auto', extra:{name:'genre',ph:'Genre (Folk, Pop, Classical...)'}, allowLink:true,  linkOnly:false },
  Painter: { label:'Artwork', icon:'🎨', accept:'image/*',         maxMB:10,  resourceType:'auto', extra:{name:'style',ph:'Style (Abstract, Realism...)'},    allowLink:false, linkOnly:false },
  Actor:   { label:'Video',   icon:'🎬', accept:'video/*',         maxMB:100, resourceType:'auto', extra:{name:'type', ph:'Type (Actor, Anchor, Host...)'},   allowLink:true,  linkOnly:true  },
  Dancer:  { label:'Video',   icon:'💃', accept:'video/*',         maxMB:100, resourceType:'auto', extra:{name:'style',ph:'Dance Style (Bharatnatyam...)'},    allowLink:true,  linkOnly:true  },
};

// ── Neon Silver + Deep Blue ────────────────────────────────────
const N = {
  glass:  'rgba(5,8,35,0.82)',
  border: 'rgba(147,197,253,0.14)',
  text:   'rgba(255,255,255,0.92)',
  muted:  'rgba(147,197,253,0.45)',
  silver: 'rgba(147,197,253,0.6)',
};

// ── Sound + ripple ────────────────────────────────────────────
const playClick = () => {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=880;
    g.gain.setValueAtTime(0.1,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.08);
  }catch(e){}
};
const withRipple=(e,fn)=>{
  const btn=e.currentTarget,r=document.createElement('span');
  const rect=btn.getBoundingClientRect(),sz=Math.max(rect.width,rect.height);
  r.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,0.18);transform:scale(0);animation:ripple 0.5s linear;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px;pointer-events:none`;
  btn.style.overflow='hidden';btn.style.position=btn.style.position||'relative';
  btn.appendChild(r);setTimeout(()=>r.remove(),600);fn&&fn();
};

// ──────────────────────────────────────────────────────────────
// ANIMATED DROP ZONES per role
// ──────────────────────────────────────────────────────────────

// ✍️ Writer: Parchment paper with animated pen writing lines
const WriterDropZone = ({ file, onClick }) => (
  <div onClick={onClick}
    style={{
      border:'2px dashed rgba(139,92,246,0.35)',
      borderRadius:14, cursor:'pointer', overflow:'hidden', position:'relative',
      background:'linear-gradient(135deg,#0e0920,#080618)',
      minHeight:140,
    }}>
    {/* Parchment lines */}
    {[...Array(5)].map((_,i)=>(
      <div key={i} style={{
        position:'absolute', left:40, right:20,
        top: 30+i*20, height:1,
        background:'rgba(139,92,246,0.15)',
        borderRadius:1,
        overflow:'hidden',
      }}>
        {file && <div style={{height:'100%',background:'rgba(139,92,246,0.4)',width:'100%'}}/>}
        {!file && <div style={{height:'100%',background:'linear-gradient(90deg,rgba(139,92,246,0.5),transparent)',width:`${40+i*15}%`,animation:`writeLine 2s ease-in-out ${i*0.3}s infinite alternate`}}/>}
      </div>
    ))}
    {/* Quill/pen icon */}
    <div style={{position:'absolute',left:12,top:22,fontSize:22,animation:'floatNote 2s ease-in-out infinite'}}>✒️</div>
    {/* Corner fold */}
    <div style={{position:'absolute',bottom:0,right:0,width:28,height:28,background:'linear-gradient(225deg,rgba(139,92,246,0.3) 50%,transparent 50%)'}}/>

    <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'28px 20px',minHeight:140}}>
      {file ? (
        <>
          <span style={{fontSize:28,marginBottom:6}}>📄</span>
          <p style={{margin:'4px 0 2px',fontWeight:700,fontSize:14,color:N.text}}>{file.name}</p>
          <p style={{margin:0,fontSize:12,color:'rgba(139,92,246,0.7)'}}>{(file.size/1024/1024).toFixed(2)} MB · Ready to publish</p>
        </>
      ) : (
        <>
          <p style={{margin:'0 0 4px',fontWeight:700,fontSize:15,color:N.text,fontFamily:'Georgia,serif'}}>Write Your Story</p>
          <p style={{margin:0,fontSize:12,color:N.muted}}>Upload script, screenplay or story file</p>
        </>
      )}
    </div>
  </div>
);

// 🎨 Painter: Canvas with brush strokes
const PainterDropZone = ({ file, onClick }) => (
  <div onClick={onClick}
    style={{
      borderRadius:4, cursor:'pointer', overflow:'hidden', position:'relative',
      background:'linear-gradient(135deg,#0a0500,#150a00)',
      minHeight:150,
    }}>
    {/* Wooden frame */}
    <div style={{position:'absolute',inset:0,border:'10px solid',borderImage:'linear-gradient(135deg,#4a2c0a,#8b5e3c,#2a1606) 1',pointerEvents:'none'}}/>
    {/* Canvas texture lines */}
    {!file && [...Array(8)].map((_,i)=>(
      <div key={i} style={{position:'absolute',left:15,right:15,top:25+i*13,height:1.5,background:'rgba(245,158,11,0.08)',borderRadius:1}}/>
    ))}
    {/* Brush strokes (animated) */}
    {!file && (
      <>
        <div style={{position:'absolute',bottom:30,left:20,width:'45%',height:6,background:'linear-gradient(90deg,rgba(245,158,11,0.4),transparent)',borderRadius:3,animation:'brushStroke 3s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:42,left:30,width:'30%',height:4,background:'linear-gradient(90deg,rgba(239,68,68,0.3),transparent)',borderRadius:3,animation:'brushStroke 3s ease-in-out 0.5s infinite'}}/>
        <div style={{position:'absolute',bottom:20,right:20,width:'35%',height:5,background:'linear-gradient(270deg,rgba(6,182,212,0.3),transparent)',borderRadius:3,animation:'brushStroke 3s ease-in-out 1s infinite'}}/>
      </>
    )}

    <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'28px 20px',minHeight:150}}>
      {file ? (
        <>
          <span style={{fontSize:28,marginBottom:6}}>🖼</span>
          <p style={{margin:'4px 0 2px',fontWeight:700,fontSize:14,color:N.text}}>{file.name}</p>
          <p style={{margin:0,fontSize:12,color:'rgba(245,158,11,0.7)'}}>{(file.size/1024/1024).toFixed(2)} MB · Ready for gallery</p>
        </>
      ) : (
        <>
          <span style={{fontSize:36,marginBottom:8}}>🖌️</span>
          <p style={{margin:'0 0 4px',fontWeight:700,fontSize:15,color:N.text}}>Upload Your Artwork</p>
          <p style={{margin:0,fontSize:12,color:N.muted}}>JPG, PNG — Copyright protected</p>
        </>
      )}
    </div>
  </div>
);

// 🎤 Singer: Piano keys + music notes animation
const SingerDropZone = ({ file, mediaType, onClick }) => (
  <div onClick={onClick}
    style={{
      border:'2px dashed rgba(6,182,212,0.3)',
      borderRadius:14, cursor:'pointer', overflow:'hidden', position:'relative',
      background:'linear-gradient(135deg,#00080f,#000d18)',
      minHeight:150,
    }}>
    {/* Piano keys at bottom */}
    <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',height:45}}>
      {[...Array(14)].map((_,i)=>(
        <div key={i} style={{flex:1,background:i%2===0?'rgba(200,200,220,0.85)':'transparent',borderRight:'1px solid rgba(0,0,0,0.4)',borderRadius:'0 0 3px 3px',position:'relative'}}>
          {[2,5,7,10,12].includes(i%14) && <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:'60%',background:'rgba(5,8,30,0.95)',borderRadius:'0 0 3px 3px',zIndex:2}}/>}
        </div>
      ))}
    </div>
    {/* Floating music notes */}
    {!file && ['🎵','🎶','🎼','♪','♫'].map((note,i)=>(
      <div key={i} style={{position:'absolute',bottom:50+i*8,left:`${15+i*15}%`,fontSize:i%2===0?18:14,opacity:0.6,animation:`floatNote ${1.5+i*0.3}s ease-in-out ${i*0.2}s infinite`,color:i%2===0?'#06b6d4':'rgba(147,197,253,0.6)'}}>
        {note}
      </div>
    ))}
    {/* Soundwave bar */}
    <div style={{position:'absolute',top:10,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'center',gap:2,height:20}}>
      {[3,6,10,8,14,11,7,13,9,5,8,12,6,4].map((h,i)=>(
        <div key={i} style={{width:3,height:h,background:`rgba(6,182,212,${0.3+i*0.03})`,borderRadius:2,animation:`floatNote ${0.8+i*0.1}s ease-in-out ${i*0.08}s infinite`}}/>
      ))}
    </div>

    <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px 60px',minHeight:150}}>
      {file ? (
        <>
          <span style={{fontSize:28,marginBottom:6}}>{mediaType==='video'?'🎬':'🎵'}</span>
          <p style={{margin:'4px 0 2px',fontWeight:700,fontSize:14,color:N.text}}>{file.name}</p>
          <p style={{margin:0,fontSize:12,color:'rgba(6,182,212,0.7)'}}>{(file.size/1024/1024).toFixed(2)} MB · Ready to perform</p>
        </>
      ) : (
        <>
          <p style={{margin:'0 0 4px',fontWeight:700,fontSize:15,color:N.text}}>Upload Your Music</p>
          <p style={{margin:0,fontSize:12,color:N.muted}}>Audio (MP3, WAV) or Video — max 100MB</p>
        </>
      )}
    </div>
  </div>
);

// 🎬 Actor / 💃 Dancer: Film/phone Drive link UI
const VideoLinkZone = ({ role, driveLink, setDriveLink }) => {
  const isActor = role === 'Actor';
  const color   = isActor ? '#ef4444' : '#ec4899';

  return (
    <div style={{borderRadius:14,overflow:'hidden',position:'relative',background:'rgba(5,5,20,0.8)',border:`1px solid ${color}33`}}>
      {isActor ? (
        /* Film screen */
        <>
          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',background:'#080808'}}>
            {[...Array(10)].map((_,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:'#1a1a1a'}}/>)}
          </div>
          <div style={{padding:'16px 18px',background:'#060606',textAlign:'center'}}>
            <div style={{fontSize:11,color:`${color}99`,fontWeight:800,letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>🎬 CINEMA UPLOAD</div>
            <input type="url" placeholder="https://drive.google.com/file/d/..."
              value={driveLink} onChange={e=>setDriveLink(e.target.value)}
              onClick={e=>e.stopPropagation()}
              style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1px solid ${color}44`,boxSizing:'border-box',fontSize:13,background:'rgba(255,255,255,0.04)',color:N.text,outline:'none',fontFamily:'inherit'}}/>
            <p style={{margin:'8px 0 0',fontSize:11,color:`${color}66`}}>Google Drive → Share → Anyone with link → Copy & Paste</p>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',background:'#080808'}}>
            {[...Array(10)].map((_,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:'#1a1a1a'}}/>)}
          </div>
        </>
      ) : (
        /* Mobile screen */
        <div style={{maxWidth:280,margin:'0 auto',padding:'10px 6px',background:'#111',borderRadius:22,border:'3px solid #1e1e1e',boxShadow:`0 8px 30px rgba(0,0,0,0.6)`}}>
          <div style={{width:55,height:12,background:'#080808',borderRadius:8,margin:'0 auto 10px',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#1a1a1a'}}/>
            <div style={{width:20,height:4,borderRadius:2,background:'#1a1a1a'}}/>
          </div>
          <div style={{background:'#0a0a0a',borderRadius:8,padding:'12px 10px',textAlign:'center'}}>
            <div style={{fontSize:11,color:`${color}99`,fontWeight:800,letterSpacing:2,marginBottom:10,textTransform:'uppercase'}}>💃 STAGE UPLOAD</div>
            <input type="url" placeholder="https://drive.google.com/..."
              value={driveLink} onChange={e=>setDriveLink(e.target.value)}
              onClick={e=>e.stopPropagation()}
              style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${color}44`,boxSizing:'border-box',fontSize:12,background:'rgba(255,255,255,0.04)',color:N.text,outline:'none',fontFamily:'inherit'}}/>
            <p style={{margin:'8px 0 0',fontSize:10,color:`${color}55`}}>Drive → Share → Anyone → Copy link</p>
          </div>
          <div style={{width:32,height:4,background:'#222',borderRadius:2,margin:'10px auto 0'}}/>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// MAIN PostForm COMPONENT
// ──────────────────────────────────────────────────────────────
const PostForm = ({ closeForm }) => {
  const { user, stories, setStories, addStory } = useContext(AppContext);

  const [uploadMode,    setUploadMode]    = useState('file');
  const [driveLink,     setDriveLink]     = useState('');
  const [linkMediaType, setLinkMediaType] = useState('audio');
  const [title,         setTitle]         = useState('');
  const [file,          setFile]          = useState(null);
  const [prog,          setProg]          = useState(0);
  const [busy,          setBusy]          = useState(false);
  const [uploaded,      setUploaded]      = useState(null);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth<640);
  const fileRef = useRef(null);

  // Writer-specific
  const [writerForm, setWriterForm] = useState({
    Name:'', logline:'', genre:'Action', synopsis:'',
    fullStoryFile:'', contactEmail:'', contactPhone:'', portfolio:'',
    isSynopsisLocked:true, isFullStoryLocked:true, isContactLocked:true,
  });

  const isWriter = user?.role === 'Writer';
  const cfg = TALENT_CFG[user?.role];

  useEffect(() => {
    if (!document.getElementById('postform-anims')) {
      const s = document.createElement('style');
      s.id = 'postform-anims';
      s.textContent = `
        @keyframes ripple { to{transform:scale(2.5);opacity:0} }
        @keyframes writeLine { from{width:0} to{width:100%} }
        @keyframes floatNote { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes brushStroke { from{width:0;opacity:0} to{width:100%;opacity:1} }
        .pf-input:focus{border-color:rgba(147,197,253,0.4)!important;box-shadow:0 0 0 3px rgba(147,197,253,0.08)!important;}
        .pf-btn:hover{filter:brightness(1.15);transform:scale(1.02);}
      `;
      document.head?.appendChild(s);
    }
    const onR=()=>setIsMobile(window.innerWidth<640);
    window.addEventListener('resize',onR);
    return()=>window.removeEventListener('resize',onR);
  }, []);

  const getMediaType = (f) => { if(!f)return null; if(f.type?.startsWith('video/'))return'video'; if(f.type?.startsWith('audio/'))return'audio'; return null; };

  const uploadToCloudinary = () => new Promise((resolve,reject)=>{
    const fd=new FormData();
    fd.append('file',file); fd.append('upload_preset',UPLOAD_PRESET); fd.append('folder','CreativeBridge');
    const xhr=new XMLHttpRequest();
    xhr.open('POST',`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)setProg(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>xhr.status===200?resolve(JSON.parse(xhr.responseText).secure_url):reject(new Error(xhr.statusText));
    xhr.onerror=()=>reject(new Error('Network error during upload'));
    xhr.send(fd);
  });

  const handleSubmit = async () => {
    if (isWriter) {
      if (!writerForm.Name.trim()) return alert('Story title required!');
      if (!writerForm.logline.trim()) return alert('Logline required!');
      setBusy(true);
      try {
        const emailKey = user.email.replace(/\./g,',');
        await push(ref(db,'stories'),{
          ...writerForm,
          writerEmail:user.email, writerName:user.name||'', writerPic:user.profilePic||'/icon.png',
          writerProfession:user.profession||'Writer',
          email:user.email, timestamp:Date.now(),
        });
        closeForm();
      } catch(e){ alert('Error: '+e.message); }
      finally { setBusy(false); }
      return;
    }

    if (!cfg) return;
    if (!title.trim()) return alert('Title required!');

    if (cfg.linkOnly) {
      if (!driveLink.trim()) return alert('Google Drive link required!');
      if (!driveLink.trim().startsWith('http')) return alert('Valid link required!');
    } else if (uploadMode==='file') {
      if (!file) return alert('Select a file!');
    } else {
      if (!driveLink.trim()) return alert('Drive link required!');
    }

    setBusy(true); setProg(0);
    try {
      let finalUrl, mediaType;
      if (cfg.linkOnly) { finalUrl=driveLink.trim(); setProg(100); }
      else if (uploadMode==='link') { finalUrl=driveLink.trim(); mediaType=user.role==='Singer'?linkMediaType:undefined; setProg(100); }
      else { finalUrl=await uploadToCloudinary(); setUploaded(finalUrl); mediaType=user.role==='Singer'?(getMediaType(file)||'audio'):undefined; }

      const emailKey=user.email.replace(/\./g,',');
      const dbPath=`talents/${user.role.toLowerCase()}/${emailKey}`;
      await set(ref(db,`${dbPath}/profile`),{ name:user.name, email:user.email, profilePic:user.profilePic||'/icon.png', profession:user.profession||user.role, address:user.address||'', phone:user.phone||'', bio:user.bio||'' });
      const folder = user.role==='Painter'?'artworks':user.role==='Singer'?'songs':'videos';
      const extraKey = user.role==='Painter'?'style':user.role==='Singer'?'genre':'type';
      await push(ref(db,`${dbPath}/${folder}`),{ title, fileUrl:finalUrl, uploadedAt:Date.now(), ...(mediaType?{mediaType}:{}), [extraKey]:title });
      closeForm();
    } catch(e){ setBusy(false); alert('Error: '+e.message); }
    finally { setBusy(false); }
  };

  const glass = { background:N.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${N.border}`, borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,0,0.6)' };
  const inpStyle = { width:'100%', padding:'10px 14px', border:'1px solid rgba(147,197,253,0.15)', borderRadius:12, boxSizing:'border-box', fontSize:14, background:'rgba(5,8,35,0.5)', color:N.text, marginBottom:10, outline:'none', fontFamily:'inherit', transition:'all 0.2s' };

  const roleColor = { Writer:'#8b5cf6', Singer:'#06b6d4', Painter:'#f59e0b', Actor:'#ef4444', Dancer:'#ec4899' }[user?.role] || '#8b5cf6';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10000, display:'flex', justifyContent:'center', alignItems:'flex-start', background:'rgba(0,0,0,0.88)', backdropFilter:'blur(18px)', overflowY:'auto', padding:'20px 12px 40px' }}
      onClick={e=>{ if(e.target===e.currentTarget) closeForm(); }}>

      <div style={{ ...glass, width:'100%', maxWidth: isMobile ? '100%' : 520, padding: isMobile ? '18px 14px' : '24px 20px', marginTop:4 }}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h3 style={{ margin:0, color:N.text, fontSize:18, fontFamily:'Georgia,serif' }}>
              <span style={{ color:roleColor }}>{isWriter?'📜':cfg?.icon}</span>{' '}
              {isWriter ? 'Post Your Story' : `Upload ${cfg?.label}`}
            </h3>
            <p style={{ margin:'3px 0 0', fontSize:11, color:N.muted, letterSpacing:1, textTransform:'uppercase' }}>
              {user?.role} · Creative Bridge
            </p>
          </div>
          <button onClick={e=>withRipple(e,closeForm)} className="pf-btn"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:N.muted, borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', position:'relative' }}>
            ✕
          </button>
        </div>

        {/* Top color accent */}
        <div style={{ height:2, background:`linear-gradient(90deg,transparent,${roleColor},transparent)`, marginBottom:18, borderRadius:1 }}/>

        {/* ══════════════════════════════════ WRITER FORM ══ */}
        {isWriter && (
          <div style={{ position:'relative' }}>
            {/* Parchment paper background */}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(139,92,246,0.04),rgba(59,130,246,0.02))', borderRadius:14, border:'1px solid rgba(139,92,246,0.1)', pointerEvents:'none' }}/>

            {/* Animated pen at top */}
            <div style={{ textAlign:'center', fontSize:28, marginBottom:10, animation:'floatNote 2s ease-in-out infinite' }}>✒️</div>

            <div style={{ position:'relative' }}>
              <label style={{ display:'block', fontSize:10, color:N.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Story Title *</label>
              <input className="pf-input" style={{ ...inpStyle, fontFamily:'Georgia,serif', fontSize:16 }} placeholder="Your Story Title..." value={writerForm.Name} onChange={e=>setWriterForm(f=>({...f,Name:e.target.value}))}/>

              <label style={{ display:'block', fontSize:10, color:N.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Genre</label>
              <select className="pf-input" style={{ ...inpStyle }} value={writerForm.genre} onChange={e=>setWriterForm(f=>({...f,genre:e.target.value}))}>
                {['Action','Drama','Romance','Thriller','Comedy','Horror','Sci-Fi','Documentary','Biography'].map(g=><option key={g}>{g}</option>)}
              </select>

              <label style={{ display:'block', fontSize:10, color:N.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Logline *</label>
              <textarea className="pf-input" style={{ ...inpStyle, height:60, resize:'none', fontStyle:'italic' }} placeholder="One line that captures your story's essence..." value={writerForm.logline} onChange={e=>setWriterForm(f=>({...f,logline:e.target.value}))}/>

              <label style={{ display:'block', fontSize:10, color:N.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Synopsis</label>
              <textarea className="pf-input" style={{ ...inpStyle, height:80, resize:'none' }} placeholder="Brief summary of your story..." value={writerForm.synopsis} onChange={e=>setWriterForm(f=>({...f,synopsis:e.target.value}))}/>

              <label style={{ display:'block', fontSize:10, color:N.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Full Story / Script Link</label>
              <input className="pf-input" style={inpStyle} placeholder="Google Drive or PDF link..." value={writerForm.fullStoryFile} onChange={e=>setWriterForm(f=>({...f,fullStoryFile:e.target.value}))}/>

              {/* Privacy toggles */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                {[
                  { key:'isSynopsisLocked',  label:'🔒 Synopsis' },
                  { key:'isFullStoryLocked', label:'🔒 Script' },
                  { key:'isContactLocked',   label:'🔒 Contact' },
                ].map(toggle=>(
                  <button key={toggle.key} onClick={e=>withRipple(e,()=>setWriterForm(f=>({...f,[toggle.key]:!f[toggle.key]})))} className="pf-btn"
                    style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${writerForm[toggle.key]?'rgba(139,92,246,0.5)':'rgba(255,255,255,0.1)'}`, cursor:'pointer', fontSize:11, fontWeight:700, transition:'all 0.2s', position:'relative', background:writerForm[toggle.key]?'rgba(139,92,246,0.15)':'rgba(255,255,255,0.04)', color:writerForm[toggle.key]?'#a78bfa':N.muted }}>
                    {toggle.label}
                  </button>
                ))}
              </div>

              <label style={{ display:'block', fontSize:10, color:N.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Contact Email</label>
              <input className="pf-input" style={inpStyle} placeholder="your@email.com" value={writerForm.contactEmail} onChange={e=>setWriterForm(f=>({...f,contactEmail:e.target.value}))}/>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════ TALENT FORMS ══ */}
        {!isWriter && cfg && (
          <>
            <label style={{ display:'block', fontSize:10, color:N.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Title *</label>
            <input className="pf-input" style={inpStyle} placeholder={`${cfg.label} title...`} value={title} onChange={e=>setTitle(e.target.value)}/>

            {/* Actor / Dancer: Drive link only */}
            {cfg.linkOnly && (
              <VideoLinkZone role={user?.role} driveLink={driveLink} setDriveLink={setDriveLink}/>
            )}

            {/* Singer: toggle */}
            {cfg.allowLink && !cfg.linkOnly && (
              <>
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  {[{id:'file',label:'📤 Upload File'},{id:'link',label:'🔗 Drive Link'}].map(m=>(
                    <button key={m.id} onClick={e=>withRipple(e,()=>{playClick();setUploadMode(m.id);})} className="pf-btn"
                      style={{ flex:1, padding:'9px', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:12, transition:'all 0.2s', position:'relative', background:uploadMode===m.id?`rgba(6,182,212,0.2)`:'rgba(255,255,255,0.04)', color:uploadMode===m.id?'#06b6d4':N.muted, border:uploadMode===m.id?'1px solid rgba(6,182,212,0.4)':'1px solid rgba(255,255,255,0.08)' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {uploadMode==='file' && (
                  <>
                    <div onClick={()=>fileRef.current?.click()}>
                      <SingerDropZone file={file} mediaType={getMediaType(file)} onClick={()=>fileRef.current?.click()}/>
                    </div>
                    <input ref={fileRef} type="file" accept={cfg.accept} onChange={e=>{const f=e.target.files[0];if(!f)return;if(f.size>cfg.maxMB*1024*1024){alert(`Max ${cfg.maxMB}MB`);e.target.value='';return;}setFile(f);}} style={{display:'none'}}/>
                  </>
                )}
                {uploadMode==='link' && (
                  <VideoLinkZone role="Actor" driveLink={driveLink} setDriveLink={setDriveLink}/>
                )}
              </>
            )}

            {/* Painter: file only */}
            {!cfg.allowLink && !cfg.linkOnly && (
              <>
                <div onClick={()=>fileRef.current?.click()}>
                  <PainterDropZone file={file} onClick={()=>fileRef.current?.click()}/>
                </div>
                <input ref={fileRef} type="file" accept={cfg.accept} onChange={e=>{const f=e.target.files[0];if(!f)return;if(f.size>cfg.maxMB*1024*1024){alert(`Max ${cfg.maxMB}MB`);e.target.value='';return;}setFile(f);}} style={{display:'none'}}/>
              </>
            )}

            {/* Upload progress */}
            {busy && uploadMode==='file' && !cfg.linkOnly && (
              <div style={{ margin:'12px 0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, color:N.muted }}>Uploading...</span>
                  <span style={{ fontSize:13, fontWeight:700, color:roleColor }}>{prog}%</span>
                </div>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, height:8, overflow:'hidden' }}>
                  <div style={{ background:`linear-gradient(90deg,${roleColor},#3b82f6)`, height:'100%', width:`${prog}%`, borderRadius:10, transition:'width 0.3s', boxShadow:`0 0 10px ${roleColor}88` }}/>
                </div>
              </div>
            )}
          </>
        )}

        {/* Submit button */}
        <button onClick={e=>withRipple(e,()=>handleSubmit())} disabled={busy} className="pf-btn"
          style={{ width:'100%', padding:13, borderRadius:14, cursor:busy?'not-allowed':'pointer', fontWeight:700, fontSize:14, marginTop:14, position:'relative', transition:'all 0.2s',
            background: busy ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${roleColor}88,#1d4ed866)`,
            color: busy ? N.muted : N.text, opacity:busy?0.7:1,
            boxShadow: busy ? 'none' : `0 4px 24px ${roleColor}44`,
            border: `1px solid ${busy?'rgba(255,255,255,0.08)':roleColor+'44'}`,
          }}>
          {busy ? 'Publishing...' : isWriter ? '📜 Publish Story' : `🚀 Publish ${cfg?.label}`}
        </button>
      </div>
    </div>
  );
};

export default PostForm;