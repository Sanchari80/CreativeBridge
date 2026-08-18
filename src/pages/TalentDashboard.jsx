import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue, push, set } from "firebase/database";
import { db } from '../App.jsx';

const CLOUD_NAME    = 'danbshghf';
const UPLOAD_PRESET = 'CreativeBridge';

const CONFIG = {
  Singer:  { folder:'songs',    label:'Songs',    icon:'🎤', accept:'audio/*,video/*', resourceType:'auto', maxMB:100, hint:'Audio (MP3, WAV) or Video (MP4) — max 100MB. Larger? Use Drive link.', mode:'both'     },
  Painter: { folder:'artworks', label:'Artworks', icon:'🎨', accept:'image/*',         resourceType:'auto', maxMB:10,  hint:'JPG, PNG — Copyright protected',                                          mode:'fileOnly' },
  Actor:   { folder:'videos',   label:'Videos',   icon:'🎬', accept:'video/*',         resourceType:'auto', maxMB:100, hint:'',                                                                         mode:'linkOnly' },
  Dancer:  { folder:'videos',   label:'Videos',   icon:'💃', accept:'video/*',         resourceType:'auto', maxMB:100, hint:'',                                                                         mode:'linkOnly' },
};

const EXTRA = {
  Singer:  { name:'genre', placeholder:'Genre (Folk, Pop, Classical, Baul...)' },
  Painter: { name:'style', placeholder:'Style (Abstract, Realism, Digital Art...)' },
  Actor:   { name:'type',  placeholder:'Type (Actor, Anchor, Host, Voiceover...)' },
  Dancer:  { name:'style', placeholder:'Dance Style (Bharatnatyam, Hip-hop, Folk...)' },
};

const isDriveLink  = (url) => /drive\.google\.com/.test(url || '');
const driveEmbedUrl = (url) => {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
};

// ── Sound + Ripple (matches CommonDashboard) ──────────────────
const playClick = () => {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.08);
  } catch(e) {}
};
const withRipple = (e, fn) => {
  const btn = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.2);transform:scale(0);animation:ripple 0.5s linear;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;pointer-events:none`;
  btn.style.overflow = 'hidden'; btn.style.position = btn.style.position || 'relative';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
  fn && fn();
};

// ── Design tokens (matches CommonDashboard) ───────────────────
const G = {
  card:   'rgba(15,12,40,0.75)',
  border: 'rgba(139,92,246,0.18)',
  text:   'rgba(255,255,255,0.92)',
  muted:  'rgba(255,255,255,0.5)',
  purple: '#8b5cf6',
  blue:   '#3b82f6',
  gold:   '#f59e0b',
};

const glass = {
  background: G.card,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${G.border}`,
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const TalentDashboard = () => {
  const { user, talentRequests, updateTalentRequest, deleteTalentWork } = useContext(AppContext);

  const [tab,        setTab]        = useState('works');
  const [works,      setWorks]      = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [form,       setForm]       = useState({ title:'', extra:'' });
  const [file,       setFile]       = useState(null);
  const [progress,   setProgress]   = useState(0);
  const [uploading,  setUploading]  = useState(false);
  const [copiedId,   setCopiedId]   = useState(null);
  const [uploadMode,    setUploadMode]    = useState('file');
  const [driveLink,     setDriveLink]     = useState('');
  const [linkMediaType, setLinkMediaType] = useState('video');
  const fileInputRef = useRef(null);

  const role     = user?.role;
  const cfg      = CONFIG[role] || {};
  const emailKey = user?.email?.replace(/\./g, ',');
  const dbPath   = `talents/${role?.toLowerCase()}/${emailKey}`;
  const extraCfg = EXTRA[role];

  const getMediaType = (f) => {
    if (!f) return null;
    if (f.type?.startsWith('video/')) return 'video';
    if (f.type?.startsWith('audio/')) return 'audio';
    return null;
  };

  useEffect(() => {
    if (!user || !cfg.folder) return;
    const unsub = onValue(ref(db, `${dbPath}/${cfg.folder}`), snap => {
      const data = snap.val();
      setWorks(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })).reverse() : []);
    });
    return () => unsub();
  }, [user, dbPath, cfg.folder]);

  const myRequests   = talentRequests.filter(r => r.ownerPath === emailKey);
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  const buildShareLink = (workId) => {
    const base   = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({ profile: user.email, role, work: workId });
    return `${base}?${params.toString()}`;
  };

  const handleCopyLink = async (workId) => {
    const link = buildShareLink(workId);
    try { await navigator.clipboard.writeText(link); }
    catch { const ta = document.createElement('textarea'); ta.value=link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    setCopiedId(workId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const uploadToCloudinary = () => new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder', 'CreativeBridge');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${cfg.resourceType}/upload`);
    xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded/e.total*100)); };
    xhr.onload  = () => xhr.status===200 ? resolve(JSON.parse(xhr.responseText).secure_url) : reject(new Error(xhr.statusText));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(fd);
  });

  const handleUpload = async () => {
    if (!form.title.trim()) return alert('Title required!');
    if (cfg.mode==='linkOnly') { if (!driveLink.trim()) return alert('Google Drive link required!'); if (!driveLink.trim().startsWith('http')) return alert('Valid link required!'); }
    if (cfg.mode==='both' && uploadMode==='file' && !file) return alert('Select a file!');
    if (cfg.mode==='both' && uploadMode==='link') { if (!driveLink.trim()) return alert('Drive link required!'); }
    if (cfg.mode==='fileOnly' && !file) return alert('Select a file!');

    setUploading(true); setProgress(0);
    try {
      let finalUrl, mediaType;
      if (cfg.mode==='linkOnly') { finalUrl=driveLink.trim(); setProgress(100); }
      else if (cfg.mode==='both' && uploadMode==='link') { finalUrl=driveLink.trim(); mediaType=linkMediaType; setProgress(100); }
      else { finalUrl=await uploadToCloudinary(); mediaType=role==='Singer'?(getMediaType(file)||'audio'):undefined; }

      await set(ref(db, `${dbPath}/profile`), { name:user.name, email:user.email, profilePic:user.profilePic||'/icon.png', profession:user.profession||role, address:user.address||'', phone:user.phone||'', bio:user.bio||'' });
      await push(ref(db, `${dbPath}/${cfg.folder}`), { title:form.title, fileUrl:finalUrl, uploadedAt:Date.now(), ...(mediaType?{mediaType}:{}), ...(extraCfg?{[extraCfg.name]:form.extra}:{}) });

      setUploading(false); setProgress(0); setFile(null); setDriveLink(''); setForm({title:'',extra:''}); setShowUpload(false); setUploadMode('file');
      alert('Upload successful!');
    } catch(e) { setUploading(false); alert('Error: '+e.message); }
  };

  const singularLabel = role==='Painter'?'Artwork':role==='Singer'?'Song':'Video';

  const catColor = { Singer:'#06b6d4', Painter:'#f59e0b', Actor:'#ef4444', Dancer:'#ec4899' };
  const roleColor = catColor[role] || G.purple;

  return (
    <div style={{ maxWidth:750, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, color:G.text, fontFamily:'Georgia,serif', fontSize:22 }}>
            <span style={{ color:roleColor }}>{cfg.icon}</span> My {cfg.label}
          </h2>
          <p style={{ margin:'4px 0 0', fontSize:13, color:G.muted }}>{user.name} · {user.profession||role}</p>
        </div>
        <button
          onClick={e=>withRipple(e,()=>{playClick();setShowUpload(v=>!v);})}
          style={{
            padding:'10px 20px',
            background: showUpload
              ? 'linear-gradient(135deg,rgba(239,68,68,0.4),rgba(220,38,38,0.4))'
              : `linear-gradient(135deg,${roleColor}44,${roleColor}22)`,
            color: showUpload ? '#fca5a5' : roleColor,
            border: `1px solid ${showUpload?'rgba(239,68,68,0.4)':roleColor+'44'}`,
            borderRadius:14, cursor:'pointer', fontWeight:700, fontSize:13,
            backdropFilter:'blur(8px)', transition:'all 0.2s', position:'relative',
          }}>
          {showUpload ? '✕ Cancel' : `+ Upload ${singularLabel}`}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', background:'rgba(5,3,20,0.6)', borderRadius:14, padding:4, marginBottom:20, backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.06)' }}>
        {[
          { key:'works',    label:`${cfg.icon} My ${cfg.label} (${works.length})` },
          { key:'requests', label:`📩 Requests${pendingCount>0?` (${pendingCount})`:''}`  },
        ].map(t => (
          <button key={t.key}
            onClick={e=>withRipple(e,()=>{playClick();setTab(t.key);})}
            style={{
              flex:1, padding:'10px', borderRadius:12, cursor:'pointer',
              fontWeight:700, fontSize:13, transition:'all 0.2s', position:'relative',
              background: tab===t.key
                ? `linear-gradient(135deg,${roleColor}44,${G.blue}33)`
                : 'transparent',
              color: tab===t.key ? G.text : G.muted,
              boxShadow: tab===t.key ? `0 0 16px ${roleColor}33` : 'none',
              border: tab===t.key ? `1px solid ${roleColor}44` : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Upload Form ── */}
      {showUpload && (
        <div style={{ ...glass, padding:20, marginBottom:20 }}>
          <h4 style={{ margin:'0 0 16px', color:G.text, fontSize:16 }}>
            <span style={{ color:roleColor }}>{cfg.icon}</span> Upload New {singularLabel}
          </h4>

          <input placeholder={`${singularLabel} Title *`} value={form.title}
            onChange={e => setForm(f => ({...f, title: e.target.value}))}
            style={inputStyle}/>

          {extraCfg && (
            <input placeholder={extraCfg.placeholder} value={form.extra}
              onChange={e => setForm(f => ({...f, extra: e.target.value}))}
              style={inputStyle}/>
          )}

          {/* Actor / Dancer: Drive link only */}
          {cfg.mode==='linkOnly' && (
            <div style={linkBoxStyle}>
              <p style={{ fontSize:11, fontWeight:800, color:roleColor, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:1 }}>
                🔗 Google Drive Video Link *
              </p>
              <input type="url" placeholder="https://drive.google.com/file/d/..."
                value={driveLink} onChange={e=>setDriveLink(e.target.value)} style={inputStyle}/>
              <div style={{ background:'rgba(139,92,246,0.1)', borderRadius:10, padding:'10px 12px', fontSize:12, color:'rgba(139,92,246,0.8)', border:'1px solid rgba(139,92,246,0.2)' }}>
                📁 Google Drive → Right click → Share → "Anyone with the link" → Copy → Paste here
              </div>
            </div>
          )}

          {/* Singer: toggle */}
          {cfg.mode==='both' && (
            <>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                {[{id:'file',label:'📤 Upload File'},{id:'link',label:'🔗 Drive Link'}].map(m=>(
                  <button key={m.id} onClick={e=>withRipple(e,()=>{playClick();setUploadMode(m.id);})}
                    style={{
                      flex:1, padding:'9px 12px', borderRadius:12, cursor:'pointer',
                      fontWeight:700, fontSize:12, transition:'all 0.2s', position:'relative',
                      background: uploadMode===m.id ? `linear-gradient(135deg,${roleColor}44,${G.blue}33)` : 'rgba(255,255,255,0.04)',
                      color: uploadMode===m.id ? G.text : G.muted,
                      border: uploadMode===m.id ? `1px solid ${roleColor}55` : '1px solid rgba(255,255,255,0.08)',
                    }}>{m.label}</button>
                ))}
              </div>
              {uploadMode==='file' && (
                <>
                  <div onClick={()=>fileInputRef.current?.click()} style={dropZoneStyle}>
                    {file ? (
                      <><span style={{fontSize:24}}>✅</span><p style={{margin:'6px 0 2px',fontWeight:700,fontSize:14,color:G.text}}>{file.name}</p><p style={{margin:0,fontSize:12,color:G.muted}}>{(file.size/1024/1024).toFixed(2)} MB</p></>
                    ) : (
                      <><span style={{fontSize:34}}>🎵</span><p style={{margin:'8px 0 4px',fontWeight:700,fontSize:14,color:G.text}}>Click to choose file</p><p style={{margin:0,fontSize:12,color:G.muted}}>{cfg.hint}</p></>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept={cfg.accept} onChange={e=>{const f=e.target.files[0];if(!f)return;if(f.size>cfg.maxMB*1024*1024){alert(`Max ${cfg.maxMB}MB`);e.target.value='';return;}setFile(f);}} style={{display:'none'}}/>
                </>
              )}
              {uploadMode==='link' && (
                <div style={linkBoxStyle}>
                  <p style={{fontSize:11,fontWeight:800,color:roleColor,margin:'0 0 8px',textTransform:'uppercase',letterSpacing:1}}>🔗 Google Drive Link *</p>
                  <input type="url" placeholder="https://drive.google.com/..." value={driveLink} onChange={e=>setDriveLink(e.target.value)} style={inputStyle}/>
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    {['audio','video'].map(t=>(
                      <button key={t} onClick={e=>withRipple(e,()=>setLinkMediaType(t))} style={{flex:1,padding:'8px',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:12,transition:'all 0.2s',position:'relative',background:linkMediaType===t?`${roleColor}44`:'rgba(255,255,255,0.04)',color:linkMediaType===t?G.text:G.muted,border:linkMediaType===t?`1px solid ${roleColor}44`:'1px solid rgba(255,255,255,0.08)'}}>
                        {t==='audio'?'🎵 Audio':'🎬 Video'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Painter: file only */}
          {cfg.mode==='fileOnly' && (
            <>
              <div onClick={()=>fileInputRef.current?.click()} style={dropZoneStyle}>
                {file ? (
                  <><span style={{fontSize:24}}>✅</span><p style={{margin:'6px 0 2px',fontWeight:700,fontSize:14,color:G.text}}>{file.name}</p><p style={{margin:0,fontSize:12,color:G.muted}}>{(file.size/1024/1024).toFixed(2)} MB</p></>
                ) : (
                  <><span style={{fontSize:34}}>🖼</span><p style={{margin:'8px 0 4px',fontWeight:700,fontSize:14,color:G.text}}>Click to choose image</p><p style={{margin:0,fontSize:12,color:G.muted}}>{cfg.hint}</p></>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept={cfg.accept} onChange={e=>{const f=e.target.files[0];if(!f)return;if(f.size>cfg.maxMB*1024*1024){alert(`Max ${cfg.maxMB}MB`);e.target.value='';return;}setFile(f);}} style={{display:'none'}}/>
              <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,padding:'10px 14px',fontSize:12,color:'rgba(245,158,11,0.8)',marginBottom:12}}>
                🔒 Your artwork will be copyright-protected on Creative Bridge.
              </div>
            </>
          )}

          {/* Progress bar */}
          {uploading && (cfg.mode==='fileOnly' || (cfg.mode==='both' && uploadMode==='file')) && (
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:13,color:G.muted}}>Uploading...</span>
                <span style={{fontSize:13,fontWeight:700,color:roleColor}}>{progress}%</span>
              </div>
              <div style={{background:'rgba(255,255,255,0.06)',borderRadius:10,height:8,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{background:`linear-gradient(90deg,${roleColor},${G.blue})`,height:'100%',width:`${progress}%`,borderRadius:10,transition:'width 0.3s',boxShadow:`0 0 10px ${roleColor}88`}}/>
              </div>
            </div>
          )}

          <button onClick={e=>withRipple(e,()=>handleUpload())} disabled={uploading}
            style={{
              width:'100%', padding:13, borderRadius:14, cursor:uploading?'not-allowed':'pointer',
              fontWeight:700, fontSize:14, position:'relative', transition:'all 0.2s',
              background: uploading ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${roleColor}88,${G.blue}66)`,
              color: uploading ? G.muted : G.text,
              border: `1px solid ${uploading?'rgba(255,255,255,0.08)':roleColor+'55'}`,
              boxShadow: uploading ? 'none' : `0 4px 20px ${roleColor}33`,
            }}>
            {uploading ? ((cfg.mode==='linkOnly'||uploadMode==='link')?'Saving...': `Uploading... ${progress}%`) : `🚀 Publish ${singularLabel}`}
          </button>
        </div>
      )}

      {/* ── Works Tab ── */}
      {tab==='works' && (
        works.length===0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',background:'rgba(15,10,40,0.4)',backdropFilter:'blur(12px)',borderRadius:20,border:'1px solid rgba(139,92,246,0.15)'}}>
            <p style={{fontSize:52,margin:0}}>{cfg.icon}</p>
            <p style={{color:G.muted,marginTop:12}}>No {cfg.label.toLowerCase()} uploaded yet.</p>
            <button onClick={e=>withRipple(e,()=>{playClick();setShowUpload(true);})} style={{marginTop:14,padding:'10px 24px',background:`linear-gradient(135deg,${roleColor}44,${G.blue}33)`,color:G.text,border:`1px solid ${roleColor}44`,borderRadius:12,cursor:'pointer',fontWeight:700,position:'relative'}}>+ Upload Now</button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {works.map(work => {
              const fromDrive = isDriveLink(work.fileUrl);
              return (
                <div key={work.id} style={{...glass,padding:16,transition:'all 0.2s'}}>
                  {/* Header */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:G.text,marginBottom:3}}>{work.title}</div>
                      <div style={{fontSize:12,color:G.muted}}>
                        {work.genre||work.style||work.type||''}{work.uploadedAt?' · '+new Date(work.uploadedAt).toLocaleDateString():''}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      <button onClick={e=>withRipple(e,()=>handleCopyLink(work.id))}
                        style={{padding:'6px 12px',background:copiedId===work.id?'rgba(16,185,129,0.2)':'rgba(139,92,246,0.2)',color:copiedId===work.id?'#10b981':G.purple,border:`1px solid ${copiedId===work.id?'rgba(16,185,129,0.3)':'rgba(139,92,246,0.3)'}`,borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:11,transition:'all 0.2s',position:'relative'}}>
                        {copiedId===work.id?'✅ Copied':'🔗 Copy Link'}
                      </button>
                      <button onClick={()=>deleteTalentWork(role, emailKey, work.id)}
                        style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171',borderRadius:8,cursor:'pointer',fontSize:16,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
                    </div>
                  </div>

                  {/* Singer media */}
                  {role==='Singer' && work.fileUrl && (
                    fromDrive
                      ? <iframe src={driveEmbedUrl(work.fileUrl)} style={{width:'100%',height:work.mediaType==='video'?200:80,border:'none',borderRadius:10,marginBottom:8,background:'#000'}} allow="autoplay" title={work.title}/>
                      : work.mediaType==='video'
                        ? <video controls src={work.fileUrl} style={{width:'100%',borderRadius:10,marginBottom:8,maxHeight:200,background:'#000'}}/>
                        : <audio controls src={work.fileUrl} style={{width:'100%',marginBottom:8,height:36}}/>
                  )}

                  {/* Painter — canvas frame */}
                  {role==='Painter' && work.fileUrl && (
                    <div style={{marginTop:8,padding:8,background:'linear-gradient(135deg,#3a1e05,#1f0f00,#3a1e05)',boxShadow:'3px 3px 0 #0a0500,-2px -2px 0 #6b4210',borderRadius:4}}>
                      <div style={{border:'2px solid #6b4210'}}>
                        <img src={work.fileUrl} alt={work.title} draggable={false}
                          style={{width:'100%',maxHeight:220,objectFit:'contain',display:'block',background:'rgba(0,0,0,0.3)',pointerEvents:'none'}}/>
                      </div>
                    </div>
                  )}

                  {/* Actor — film screen */}
                  {role==='Actor' && work.fileUrl && (
                    fromDrive ? (
                      <div style={{background:'#050505',borderRadius:6,border:'6px solid #111',boxShadow:'0 0 0 3px #1a1a1a,0 8px 30px rgba(0,0,0,0.8)',marginTop:8,overflow:'hidden'}}>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'4px 6px',background:'#0a0a0a'}}>
                          {[...Array(10)].map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:1,background:'#222'}}/>)}
                        </div>
                        <iframe src={driveEmbedUrl(work.fileUrl)} style={{width:'100%',height:220,border:'none',display:'block',background:'#000'}} allow="autoplay" title={work.title}/>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'4px 6px',background:'#0a0a0a'}}>
                          {[...Array(10)].map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:1,background:'#222'}}/>)}
                        </div>
                      </div>
                    ) : (
                      <video controls src={work.fileUrl} style={{width:'100%',borderRadius:10,marginTop:8,maxHeight:220,background:'#000'}}/>
                    )
                  )}

                  {/* Actor — missing fileUrl */}
                  {role==='Actor' && !work.fileUrl && (
                    <div style={{marginTop:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:'10px 12px',fontSize:12,color:'rgba(245,158,11,0.7)'}}>
                      ⚠️ Video missing — please delete and re-upload with a Drive link.
                    </div>
                  )}

                  {/* Dancer — mobile frame */}
                  {role==='Dancer' && work.fileUrl && (
                    fromDrive ? (
                      <div style={{maxWidth:260,margin:'8px auto 0',background:'#1a1a1a',borderRadius:28,border:'3px solid #2a2a2a',padding:'12px 6px',boxShadow:'0 12px 40px rgba(0,0,0,0.7)'}}>
                        <div style={{width:60,height:14,background:'#0a0a0a',borderRadius:8,margin:'0 auto 8px',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                          <div style={{width:7,height:7,borderRadius:'50%',background:'#2a2a2a'}}/>
                          <div style={{width:22,height:4,borderRadius:2,background:'#2a2a2a'}}/>
                        </div>
                        <div style={{background:'#000',borderRadius:4,overflow:'hidden'}}>
                          <iframe src={driveEmbedUrl(work.fileUrl)} style={{width:'100%',height:220,border:'none',display:'block'}} allow="autoplay" title={work.title}/>
                        </div>
                        <div style={{width:35,height:4,background:'#333',borderRadius:2,margin:'8px auto 0'}}/>
                      </div>
                    ) : (
                      <video controls src={work.fileUrl} style={{width:'100%',borderRadius:10,marginTop:8,maxHeight:220,background:'#000'}}/>
                    )
                  )}

                  {/* Dancer — missing */}
                  {role==='Dancer' && !work.fileUrl && (
                    <div style={{marginTop:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:'10px 12px',fontSize:12,color:'rgba(245,158,11,0.7)'}}>
                      ⚠️ Video missing — please delete and re-upload with a Drive link.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Requests Tab ── */}
      {tab==='requests' && (
        myRequests.length===0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',background:'rgba(15,10,40,0.4)',backdropFilter:'blur(12px)',borderRadius:20,border:'1px solid rgba(139,92,246,0.15)'}}>
            <p style={{fontSize:52,margin:0}}>📭</p>
            <p style={{color:G.muted,marginTop:12}}>No contact requests yet.</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[...myRequests].reverse().map(req => (
              <div key={req.firebaseKey} style={{
                ...glass,padding:16,
                borderLeft:`4px solid ${req.status==='approved'?'#10b981':req.status==='declined'?'#ef4444':'#f59e0b'}`,
              }}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                  <img src={req.fromPic||'/icon.png'} alt="" style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(139,92,246,0.3)',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:G.text}}>{req.fromName}</div>
                    <div style={{fontSize:12,color:G.muted}}>{req.fromProfession}</div>
                  </div>
                  <span style={{
                    padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,
                    background: req.status==='approved'?'rgba(16,185,129,0.15)':req.status==='declined'?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)',
                    color: req.status==='approved'?'#10b981':req.status==='declined'?'#ef4444':'#f59e0b',
                    border: `1px solid ${req.status==='approved'?'rgba(16,185,129,0.3)':req.status==='declined'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)'}`,
                  }}>
                    {req.status==='approved'?'✅ Approved':req.status==='declined'?'❌ Declined':'⏳ Pending'}
                  </span>
                </div>

                {req.message && (
                  <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',padding:'10px 12px',borderRadius:10,fontSize:13,color:'rgba(255,255,255,0.6)',marginBottom:10,fontStyle:'italic'}}>
                    "{req.message}"
                  </div>
                )}

                {req.status==='pending' && (
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={e=>withRipple(e,()=>updateTalentRequest(req,'approved'))}
                      style={{flex:1,padding:'9px',background:'linear-gradient(135deg,rgba(16,185,129,0.4),rgba(5,150,105,0.4))',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:12,position:'relative'}}>
                      ✅ Accept
                    </button>
                    <button onClick={e=>withRipple(e,()=>updateTalentRequest(req,'declined'))}
                      style={{flex:1,padding:'9px',background:'linear-gradient(135deg,rgba(239,68,68,0.4),rgba(220,38,38,0.4))',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:12,position:'relative'}}>
                      ❌ Decline
                    </button>
                  </div>
                )}
                {req.status==='approved' && (
                  <p style={{fontSize:12,color:'#10b981',margin:0}}>✅ Your contact info has been shared.</p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

/* ── Shared input/dropzone styles ── */
const inputStyle = {
  width:'100%', padding:'11px 14px',
  border:'1px solid rgba(139,92,246,0.25)',
  borderRadius:12, boxSizing:'border-box', fontSize:14,
  background:'rgba(255,255,255,0.04)',
  color:'rgba(255,255,255,0.9)',
  marginBottom:10, outline:'none',
  fontFamily:'inherit',
};
const dropZoneStyle = {
  border:'2px dashed rgba(139,92,246,0.35)',
  borderRadius:14, padding:24, textAlign:'center',
  cursor:'pointer', marginBottom:12,
  background:'rgba(139,92,246,0.04)',
  transition:'all 0.2s',
};
const linkBoxStyle = {
  border:'1px solid rgba(139,92,246,0.2)',
  borderRadius:14, padding:14, marginBottom:12,
  background:'rgba(139,92,246,0.05)',
};

export default TalentDashboard;