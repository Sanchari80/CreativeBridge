import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

const CATS = [
  { id:'all',     label:'All Talent',          emoji:'⭐', color:'#8b5cf6' },
  { id:'saved',   label:'Saved',               emoji:'❤️', color:'#ec4899' },
  { id:'writer',  label:'Script Writers',       emoji:'✍️', color:'#a78bfa' },
  { id:'singer',  label:'Singers',              emoji:'🎤', color:'#06b6d4' },
  { id:'painter', label:'Painters',             emoji:'🎨', color:'#f59e0b' },
  { id:'actor',   label:'Actors & Anchors',     emoji:'🎬', color:'#ef4444' },
  { id:'dancer',  label:'Dancers',              emoji:'💃', color:'#ec4899' },
];

const isDriveLink   = (url) => /drive\.google\.com/.test(url || '');
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
    osc.type='sine'; osc.frequency.value=880;
    gain.gain.setValueAtTime(0.1,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+0.08);
  } catch(e) {}
};
const playChime = () => {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [[523,0],[659,0.08],[784,0.16]].forEach(([f,t])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.frequency.value=f; o.type='sine';
      g.gain.setValueAtTime(0,ctx.currentTime+t);
      g.gain.linearRampToValueAtTime(0.1,ctx.currentTime+t+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.35);
    });
  } catch(e) {}
};
const withRipple = (e, fn) => {
  const btn = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.2);transform:scale(0);animation:ripple 0.5s linear;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;pointer-events:none`;
  btn.style.overflow='hidden'; btn.style.position=btn.style.position||'relative';
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(),600);
  fn&&fn();
};

// ── Design tokens ─────────────────────────────────────────────
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
  backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
  border:`1px solid ${G.border}`, borderRadius:20,
  boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
};

const HireDashboard = () => {
  const { user, stories, sendTalentRequest, talentRequests } = useContext(AppContext);

  const [activeCat,      setActiveCat]      = useState('all');
  const [talents,        setTalents]        = useState({singer:[],painter:[],actor:[],dancer:[]});
  const [contactModal,   setContactModal]   = useState(null);
  const [message,        setMessage]        = useState('');
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [savedTalents,   setSavedTalents]   = useState(() => {
    const s = localStorage.getItem('savedTalents');
    return s ? JSON.parse(s) : [];
  });

  const isSaved      = (email) => !!email && savedTalents.includes(email.toLowerCase());
  const toggleSave   = (email) => {
    if (!email) return;
    const e = email.toLowerCase();
    const next = savedTalents.includes(e) ? savedTalents.filter(x=>x!==e) : [...savedTalents, e];
    setSavedTalents(next);
    localStorage.setItem('savedTalents', JSON.stringify(next));
    playChime();
  };

  useEffect(() => {
    const cats = ['singer','painter','actor','dancer'];
    const subs = [];
    cats.forEach(cat => {
      const unsub = onValue(ref(db,`talents/${cat}`), snap => {
        const data = snap.val();
        setTalents(prev => ({
          ...prev,
          [cat]: data ? Object.entries(data).map(([ek,p])=>({...p,emailKey:ek,email:ek.replace(/,/g,'.'),category:cat})) : []
        }));
      });
      subs.push(unsub);
    });
    return () => subs.forEach(u=>u());
  }, []);

  const writerProfiles = React.useMemo(() => {
    const map = {};
    stories.forEach(s => {
      const key = (s.writerEmail||s.email||'').toLowerCase();
      if (!map[key]) map[key] = { email:key, emailKey:key.replace(/\./g,','), name:s.writerName||'Unknown', profilePic:s.writerPic||'/icon.png', profession:s.writerProfession||'Writer', category:'writer', storyCount:0, genres:[] };
      map[key].storyCount++;
      if (s.genre && !map[key].genres.includes(s.genre)) map[key].genres.push(s.genre);
    });
    return Object.values(map);
  }, [stories]);

  const allTalents = [...writerProfiles, ...talents.singer, ...talents.painter, ...talents.actor, ...talents.dancer];

  const filtered = (
    activeCat==='all'    ? allTalents :
    activeCat==='saved'  ? allTalents.filter(t=>isSaved(t.email)) :
    activeCat==='writer' ? writerProfiles :
    talents[activeCat] || []
  ).filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name?.toLowerCase().includes(q) || t.address?.toLowerCase().includes(q) || t.profession?.toLowerCase().includes(q);
  });

  const getReqStatus     = (email) => talentRequests.find(r=>r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()&&r.talentEmail?.toLowerCase()===email?.toLowerCase())?.status||null;
  const getRevealedContact = (email) => talentRequests.find(r=>r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()&&r.talentEmail?.toLowerCase()===email?.toLowerCase()&&r.status==='approved')?.revealedContact||null;

  const handleSend = async () => {
    if (!message.trim()) return alert("Please write your identity and purpose!");
    if (!contactModal) return;
    await sendTalentRequest(contactModal.email, contactModal.name, message);
    setMessage(''); setContactModal(null);
  };

  const catColor = (cat) => CATS.find(c=>c.id===cat)?.color || G.purple;

  // ── DETAIL VIEW ──────────────────────────────────────────────
  if (selectedTalent) {
    const t       = selectedTalent;
    const catObj  = CATS.find(c=>c.id===t.category);
    const status  = getReqStatus(t.email);
    const contact = getRevealedContact(t.email);
    const wStories = t.category==='writer' ? stories.filter(s=>(s.writerEmail||s.email)?.toLowerCase()===t.email?.toLowerCase()) : [];
    const cc = catObj?.color || G.purple;

    return (
      <div style={{maxWidth:700,margin:'0 auto'}}>
        <button onClick={e=>withRipple(e,()=>{playClick();setSelectedTalent(null);})}
          style={{background:'none',border:'none',color:G.muted,cursor:'pointer',fontWeight:700,fontSize:14,marginBottom:14,display:'block',padding:0,transition:'color 0.2s',position:'relative'}}>
          ← Back
        </button>

        <div style={{...glass,padding:0,overflow:'hidden'}}>
          {/* Category banner */}
          <div style={{
            padding:'20px 24px 16px',
            background:`linear-gradient(135deg,${cc}22,${cc}0a)`,
            borderBottom:`1px solid ${cc}22`,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <img src={t.profilePic||'/icon.png'} alt="" style={{width:80,height:80,borderRadius:'50%',objectFit:'cover',border:`3px solid ${cc}55`,boxShadow:`0 0 20px ${cc}33`,flexShrink:0}}/>
              <div style={{flex:1}}>
                <h2 style={{margin:'0 0 6px',color:G.text,fontSize:20}}>{t.name}</h2>
                <span style={{display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,background:`${cc}22`,color:cc,border:`1px solid ${cc}44`}}>{catObj?.emoji} {catObj?.label}</span>
                {(t.address||t.city) && <p style={{margin:'6px 0 0',fontSize:13,color:G.muted}}>📍 {t.address||t.city}</p>}
                {t.profession && <p style={{margin:'3px 0 0',fontSize:13,color:G.muted}}>💼 {t.profession}</p>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
                <button onClick={e=>withRipple(e,()=>toggleSave(t.email))}
                  style={{padding:'8px 16px',background:isSaved(t.email)?'rgba(236,72,153,0.2)':'rgba(255,255,255,0.05)',color:isSaved(t.email)?'#ec4899':G.muted,border:`1px solid ${isSaved(t.email)?'rgba(236,72,153,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:12,cursor:'pointer',fontWeight:700,fontSize:12,transition:'all 0.2s',position:'relative'}}>
                  {isSaved(t.email)?'❤️ Saved':'🤍 Save'}
                </button>
                {status===null     && <button onClick={e=>withRipple(e,()=>{playClick();setContactModal(t);})} style={{padding:'9px 18px',background:`linear-gradient(135deg,${G.purple}55,${G.blue}44)`,color:G.text,border:`1px solid ${G.purple}44`,borderRadius:12,cursor:'pointer',fontWeight:700,fontSize:13,position:'relative'}}>📩 Contact</button>}
                {status==='pending'   && <div style={{background:'rgba(245,158,11,0.15)',color:'#f59e0b',padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700,border:'1px solid rgba(245,158,11,0.3)'}}>⏳ Pending</div>}
                {status==='approved'  && <div style={{background:'rgba(16,185,129,0.15)',color:'#10b981',padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700,border:'1px solid rgba(16,185,129,0.3)'}}>✅ Approved</div>}
                {status==='declined'  && <div style={{background:'rgba(239,68,68,0.15)',color:'#ef4444',padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700,border:'1px solid rgba(239,68,68,0.3)'}}>❌ Declined</div>}
              </div>
            </div>
          </div>

          <div style={{padding:'20px 24px'}}>
            {t.bio && <p style={{fontSize:14,background:'rgba(255,255,255,0.04)',padding:'12px 14px',borderRadius:12,margin:'0 0 16px',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.06)'}}>{t.bio}</p>}

            {/* Contact */}
            <div style={{marginBottom:16}}>
              <p style={{margin:'0 0 10px',fontSize:10,color:G.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>Contact Information</p>
              {contact ? (
                <div style={{fontSize:13,display:'flex',flexDirection:'column',gap:5,color:G.text}}>
                  {contact.email    && <p style={{margin:0}}>📧 {contact.email}</p>}
                  {contact.phone    && <p style={{margin:0}}>📞 {contact.phone}</p>}
                  {contact.whatsapp && <p style={{margin:0}}>💬 {contact.whatsapp}</p>}
                  {contact.facebook && <p style={{margin:0}}>👤 <a href={contact.facebook} target="_blank" rel="noreferrer" style={{color:G.purple}}>{contact.facebook}</a></p>}
                </div>
              ) : (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(245,158,11,0.06)',padding:'12px 14px',borderRadius:12,border:'1px solid rgba(245,158,11,0.15)',flexWrap:'wrap',gap:8}}>
                  <span style={{fontSize:13,color:G.muted}}>🔒 Contact info locked</span>
                  {status===null && <button onClick={e=>withRipple(e,()=>{playClick();setContactModal(t);})} style={{background:`linear-gradient(135deg,${G.purple}55,${G.blue}44)`,color:G.text,border:`1px solid ${G.purple}44`,padding:'6px 14px',borderRadius:10,cursor:'pointer',fontWeight:600,fontSize:12,position:'relative'}}>Request Access</button>}
                  {status==='pending' && <span style={{fontSize:12,color:'#f59e0b'}}>⏳ Waiting...</span>}
                </div>
              )}
            </div>

            {/* Writer stories */}
            {t.category==='writer' && wStories.length>0 && (
              <div style={{marginBottom:16}}>
                <p style={{margin:'0 0 10px',fontSize:10,color:G.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>Stories ({wStories.length})</p>
                {wStories.map(s=>(
                  <div key={s.id} style={{padding:'10px 12px',background:'rgba(139,92,246,0.06)',borderRadius:10,marginBottom:8,border:'1px solid rgba(139,92,246,0.15)'}}>
                    <div style={{fontWeight:700,color:'#a78bfa',fontSize:14,fontFamily:'Georgia,serif'}}>{s.Name}</div>
                    <div style={{fontSize:12,color:G.muted}}>{s.genre} · {s.logline}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Singer songs */}
            {t.category==='singer' && t.songs && (
              <div style={{marginBottom:16}}>
                <p style={{margin:'0 0 10px',fontSize:10,color:G.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>Songs</p>
                {Object.values(t.songs).map((song,i)=>{
                  const fromDrive=isDriveLink(song.fileUrl);
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(6,182,212,0.06)',padding:10,borderRadius:10,marginBottom:8,border:'1px solid rgba(6,182,212,0.15)'}}>
                      <div style={{flex:'0 0 auto'}}>
                        <div style={{fontWeight:600,fontSize:13,color:G.text}}>{song.title}</div>
                        <div style={{fontSize:11,color:G.muted}}>{song.genre}</div>
                      </div>
                      {fromDrive ? <iframe src={driveEmbedUrl(song.fileUrl)} style={{flex:1,height:song.mediaType==='video'?160:80,border:'none',borderRadius:8,minWidth:0,background:'#000'}} allow="autoplay" title={song.title}/>
                        :song.mediaType==='video'?<video controls src={song.fileUrl} style={{flex:1,borderRadius:8,maxHeight:160,minWidth:0}}/>
                        :<audio controls src={song.fileUrl} style={{flex:1,height:32,minWidth:0}}/>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Painter artworks — canvas frame */}
            {t.category==='painter' && t.artworks && (
              <div style={{marginBottom:16}}>
                <p style={{margin:'0 0 10px',fontSize:10,color:G.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>Artworks 🔒 Protected</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
                  {Object.values(t.artworks).map((art,i)=>(
                    <div key={i} style={{padding:6,background:'linear-gradient(135deg,#3a1e05,#1f0f00,#3a1e05)',boxShadow:'2px 2px 0 #0a0500,-1px -1px 0 #6b4210',borderRadius:3}}>
                      <div style={{border:'1px solid #6b4210'}}>
                        <ProtectedImage src={art.fileUrl} title={art.title}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actor videos — film screen */}
            {t.category==='actor' && t.videos && (
              <div style={{marginBottom:16}}>
                <p style={{margin:'0 0 10px',fontSize:10,color:G.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>🎬 Videos on Screen</p>
                {Object.values(t.videos).map((vid,i)=>{
                  const fromDrive=isDriveLink(vid.fileUrl);
                  return(
                    <div key={i} style={{marginBottom:14}}>
                      <div style={{background:'#050505',borderRadius:6,border:'6px solid #111',boxShadow:'0 0 0 3px #1a1a1a,0 8px 30px rgba(0,0,0,0.8)',overflow:'hidden'}}>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'4px 6px',background:'#0a0a0a'}}>
                          {[...Array(10)].map((_,j)=><div key={j} style={{width:7,height:7,borderRadius:1,background:'#222'}}/>)}
                        </div>
                        <div style={{background:'#000',padding:'4px 0',textAlign:'center'}}>
                          <div style={{fontSize:9,color:'rgba(239,68,68,0.6)',letterSpacing:2,fontWeight:700,marginBottom:2}}>🎬 {vid.title}</div>
                          {fromDrive?<iframe src={driveEmbedUrl(vid.fileUrl)} style={{width:'100%',height:220,border:'none',display:'block'}} allow="autoplay" title={vid.title}/>:<video controls src={vid.fileUrl} style={{width:'100%',maxHeight:220,display:'block'}}/>}
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'4px 6px',background:'#0a0a0a'}}>
                          {[...Array(10)].map((_,j)=><div key={j} style={{width:7,height:7,borderRadius:1,background:'#222'}}/>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dancer videos — mobile frame */}
            {t.category==='dancer' && t.videos && (
              <div style={{marginBottom:16}}>
                <p style={{margin:'0 0 10px',fontSize:10,color:G.muted,textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>💃 Dance on Mobile</p>
                {Object.values(t.videos).map((vid,i)=>{
                  const fromDrive=isDriveLink(vid.fileUrl);
                  return(
                    <div key={i} style={{maxWidth:260,margin:'0 auto 14px',background:'#1a1a1a',borderRadius:28,border:'3px solid #2a2a2a',padding:'12px 6px',boxShadow:'0 12px 40px rgba(0,0,0,0.8)'}}>
                      <div style={{width:60,height:14,background:'#0a0a0a',borderRadius:8,margin:'0 auto 8px',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                        <div style={{width:7,height:7,borderRadius:'50%',background:'#2a2a2a'}}/>
                        <div style={{width:22,height:4,borderRadius:2,background:'#2a2a2a'}}/>
                      </div>
                      <div style={{background:'#000',borderRadius:4,overflow:'hidden'}}>
                        <div style={{fontSize:9,color:'rgba(236,72,153,0.7)',textAlign:'center',letterSpacing:2,fontWeight:700,padding:'4px 0'}}>💃 {vid.title}</div>
                        {fromDrive?<iframe src={driveEmbedUrl(vid.fileUrl)} style={{width:'100%',height:220,border:'none',display:'block'}} allow="autoplay" title={vid.title}/>:<video controls src={vid.fileUrl} style={{width:'100%',maxHeight:220,display:'block'}}/>}
                      </div>
                      <div style={{width:35,height:4,background:'#333',borderRadius:2,margin:'8px auto 0'}}/>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── BROWSE VIEW ───────────────────────────────────────────────
  return (
    <div>
      {/* Category tabs */}
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:14,scrollbarWidth:'none'}}>
        {CATS.map(cat => (
          <button key={cat.id} onClick={e=>withRipple(e,()=>{playClick();setActiveCat(cat.id);})}
            style={{
              padding:'9px 16px', borderRadius:24, cursor:'pointer',
              fontWeight:700, fontSize:12, whiteSpace:'nowrap', position:'relative',
              background: activeCat===cat.id ? `linear-gradient(135deg,${cat.color}55,${cat.color}33)` : 'rgba(255,255,255,0.04)',
              color: activeCat===cat.id ? G.text : cat.color,
              border: activeCat===cat.id ? `1.5px solid ${cat.color}66` : `1.5px solid ${cat.color}33`,
              boxShadow: activeCat===cat.id ? `0 0 18px ${cat.color}44` : 'none',
              backdropFilter:'blur(8px)', transition:'all 0.2s',
            }}>
            {cat.emoji} {cat.label}{cat.id==='saved'&&savedTalents.length>0?` (${savedTalents.length})`:''}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(15,12,40,0.6)',border:'1px solid rgba(139,92,246,0.2)',padding:'10px 16px',borderRadius:14,marginBottom:12,backdropFilter:'blur(12px)'}}>
        <span style={{fontSize:16}}>🔍</span>
        <input type="text" placeholder="Search by name, city or profession..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
          style={{border:'none',outline:'none',flex:1,fontSize:14,background:'transparent',color:G.text}}/>
      </div>

      <p style={{fontSize:13,color:G.muted,marginBottom:14}}>{filtered.length} talent found</p>

      {/* Grid */}
      {filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',background:'rgba(15,10,40,0.4)',backdropFilter:'blur(12px)',borderRadius:20,border:'1px solid rgba(139,92,246,0.15)'}}>
          <p style={{fontSize:52,margin:0}}>{activeCat==='saved'?'❤️':'🎭'}</p>
          <p style={{color:G.muted,marginTop:12}}>{activeCat==='saved'?"You haven't saved anyone yet.":'No talent found.'}</p>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:14}}>
          {filtered.map((t,i) => {
            const catObj = CATS.find(c=>c.id===t.category);
            const status = getReqStatus(t.email);
            const cc = catObj?.color || G.purple;
            return (
              <div key={i} className="cb-card"
                style={{...glass,cursor:'pointer',overflow:'hidden',transition:'all 0.2s',border:`1px solid ${cc}22`}}
                onClick={()=>{playClick();setSelectedTalent(t);}}>
                {/* Top color strip */}
                <div style={{height:3,background:`linear-gradient(90deg,${cc},${cc}44,transparent)`,margin:'-16px -16px 12px',...{margin:0,borderRadius:'20px 20px 0 0'}}}/>

                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10,padding:'12px 14px 0'}}>
                  <img src={t.profilePic||'/icon.png'} alt="" style={{width:48,height:48,borderRadius:'50%',objectFit:'cover',border:`2px solid ${cc}44`,boxShadow:`0 0 12px ${cc}22`,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:G.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</div>
                    <div style={{fontSize:11,color:G.muted}}>📍 {(t.address||'').split(',')[0]||'Worldwide'}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();toggleSave(t.email);}}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:20,padding:2,flexShrink:0}}>
                    {isSaved(t.email)?'❤️':'🤍'}
                  </button>
                  <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:12,background:`${cc}22`,color:cc,border:`1px solid ${cc}33`,flexShrink:0}}>
                    {catObj?.emoji}
                  </span>
                </div>

                <div style={{padding:'0 14px',fontSize:12,color:G.muted,marginBottom:12}}>
                  {t.category==='writer' && `📝 ${t.storyCount} stories · ${t.genres?.slice(0,2).join(', ')}`}
                  {t.category==='singer' && t.songs && `🎵 ${Object.keys(t.songs).length} songs`}
                  {t.category==='painter' && t.artworks && `🖼 ${Object.keys(t.artworks).length} artworks · 🔒`}
                  {(t.category==='actor'||t.category==='dancer') && t.videos && `🎬 ${Object.keys(t.videos).length} videos`}
                  {t.profession && ` · ${t.profession}`}
                </div>

                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 14px 14px'}}>
                  <div>
                    {status==='pending'  && <span style={{background:'rgba(245,158,11,0.15)',color:'#f59e0b',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,border:'1px solid rgba(245,158,11,0.3)'}}>⏳ Pending</span>}
                    {status==='approved' && <span style={{background:'rgba(16,185,129,0.15)',color:'#10b981',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,border:'1px solid rgba(16,185,129,0.3)'}}>✅ Approved</span>}
                    {status==='declined' && <span style={{background:'rgba(239,68,68,0.15)',color:'#ef4444',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,border:'1px solid rgba(239,68,68,0.3)'}}>❌ Declined</span>}
                    {!status && (
                      <button onClick={e=>{e.stopPropagation();withRipple(e,()=>{playClick();setContactModal(t);});}}
                        style={{background:`linear-gradient(135deg,${G.purple}44,${G.blue}33)`,color:G.text,border:`1px solid ${G.purple}44`,padding:'6px 14px',borderRadius:10,cursor:'pointer',fontWeight:600,fontSize:11,position:'relative'}}>
                        📩 Contact
                      </button>
                    )}
                  </div>
                  <span style={{fontSize:11,color:cc,fontWeight:600}}>View Profile →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Modal */}
      {contactModal && (
        <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.85)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:9999,backdropFilter:'blur(18px)'}}
          onClick={()=>setContactModal(null)}>
          <div style={{...glass,padding:26,width:'90%',maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0,color:G.text}}>📩 Contact Request</h3>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <img src={contactModal.profilePic||'/icon.png'} alt="" style={{width:46,height:46,borderRadius:'50%',objectFit:'cover',border:`2px solid ${G.purple}44`}}/>
              <div>
                <div style={{fontWeight:700,color:G.text}}>{contactModal.name}</div>
                <div style={{fontSize:12,color:G.muted}}>{contactModal.profession}</div>
              </div>
            </div>
            <p style={{fontSize:12,color:G.muted,margin:'0 0 8px'}}>Introduce yourself and state your purpose:</p>
            <textarea style={{width:'100%',height:100,padding:10,borderRadius:12,border:'1px solid rgba(139,92,246,0.3)',marginBottom:14,boxSizing:'border-box',fontSize:13,resize:'none',background:'rgba(255,255,255,0.04)',color:G.text,fontFamily:'inherit'}}
              placeholder="e.g. I'm a Film Director looking to collaborate..." value={message} onChange={e=>setMessage(e.target.value)}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setContactModal(null);setMessage('');}} style={{flex:1,padding:10,borderRadius:12,border:'1px solid rgba(255,255,255,0.1)',cursor:'pointer',background:'rgba(255,255,255,0.04)',color:G.muted,fontWeight:600}}>Cancel</button>
              <button onClick={e=>withRipple(e,()=>handleSend())} style={{flex:1,padding:10,borderRadius:12,border:'none',background:`linear-gradient(135deg,${G.purple}88,${G.blue}66)`,color:G.text,cursor:'pointer',fontWeight:700,position:'relative'}}>Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Protected artwork thumbnail ────────────────────────────────
const ProtectedImage = ({ src, title }) => {
  const [blobUrl, setBlobUrl] = React.useState(null);
  React.useEffect(() => {
    if (!src) return;
    fetch(src).then(r=>r.blob()).then(blob=>setBlobUrl(URL.createObjectURL(blob))).catch(()=>setBlobUrl(src));
  }, [src]);
  return (
    <div style={{position:'relative',userSelect:'none'}} onContextMenu={e=>e.preventDefault()}>
      {blobUrl
        ?<img src={blobUrl} alt={title} draggable={false} style={{width:'100%',height:130,objectFit:'contain',pointerEvents:'none',background:'rgba(0,0,0,0.3)',display:'block'}}/>
        :<div style={{height:130,background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      }
      <div style={{position:'absolute',inset:0,zIndex:1}} onContextMenu={e=>e.preventDefault()}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.7)',color:'rgba(255,255,255,0.6)',padding:'3px 6px',fontSize:10,zIndex:2}}>🔒 {title}</div>
    </div>
  );
};

export default HireDashboard;