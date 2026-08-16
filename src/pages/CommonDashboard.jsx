import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

const TABS = [
  { id:'following', label:'⭐ Following', color:'#fdcb6e' },
  { id:'writer',    label:'✍️ Writers',   color:'#4834d4' },
  { id:'singer',    label:'🎤 Music',     color:'#00b894' },
  { id:'painter',   label:'🎨 Art',       color:'#e17055' },
  { id:'actor',     label:'🎬 Actors',    color:'#f39c12' },
  { id:'dancer',    label:'💃 Dancers',   color:'#fd79a8' },
];
const GENRES = ["All","Thriller","Romance","Drama","Action","Comedy","Horror","Sci-Fi","Saved"];

// Role → color/label map (handles all roles including Hirer)
const ROLE_CFG = {
  Writer:  { color:'#4834d4', label:'✍️ Writer',  cat:'writer'  },
  Singer:  { color:'#00b894', label:'🎤 Singer',  cat:'singer'  },
  Painter: { color:'#e17055', label:'🎨 Painter', cat:'painter' },
  Actor:   { color:'#f39c12', label:'🎬 Actor',   cat:'actor'   },
  Dancer:  { color:'#fd79a8', label:'💃 Dancer',  cat:'dancer'  },
  Hirer:   { color:'#636e72', label:'🔍 Hirer',   cat:'hirer'   },
  'Looking for new stories': { color:'#636e72', label:'🔍 Hirer', cat:'hirer' },
};

// ── Detect Google Drive links and build an embeddable preview URL ──
// Cloudinary URLs play fine with normal <video>/<audio> tags, but a raw
// Google Drive "share" link is just an HTML viewer page — it can't be
// used directly as a media `src`. We detect Drive links and embed them
// via Drive's own /preview endpoint inside an <iframe> instead.
const isDriveLink = (url) => /drive\.google\.com/.test(url || '');
const driveEmbedUrl = (url) => {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
};

// ── Sound utility ──────────────────────────────────────────────
const playClick = () => {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.08);
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

// ── Ripple effect on click ──────────────────────────────────────
const withRipple = (e, fn) => {
  const btn = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.25);transform:scale(0);animation:ripple 0.5s linear;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;pointer-events:none`;
  btn.style.position = btn.style.position || 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(), 600);
  fn && fn();
};

// ── Inject keyframes once ───────────────────────────────────────
if (!document.getElementById('cb-anims')) {
  const style = document.createElement('style');
  style.id = 'cb-anims';
  style.textContent = `
    @keyframes ripple { to { transform:scale(2.5); opacity:0; } }
    @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes glowPulse { 0%,100%{box-shadow:0 0 15px rgba(139,92,246,0.3)} 50%{box-shadow:0 0 30px rgba(139,92,246,0.7)} }
    @keyframes slideIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
    .cb-card { transition: transform 0.2s ease, box-shadow 0.2s ease !important; }
    .cb-card:hover { transform: translateY(-4px) scale(1.01) !important; }
    .cb-btn:hover { filter: brightness(1.15); transform: scale(1.03); }
    .cb-tab:hover { filter: brightness(1.2); }
  `;
  document.head?.appendChild(style);
}

const BackToDashboardBtn = ({ onClick }) => (
  <button onClick={e=>withRipple(e,()=>{playClick();onClick();})}
    className="cb-btn"
    style={{
      padding:'10px 28px', background:'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(59,130,246,0.3))',
      color:'rgba(255,255,255,0.9)', border:'1px solid rgba(139,92,246,0.4)',
      borderRadius:12, cursor:'pointer', fontWeight:700, marginTop:15,
      backdropFilter:'blur(10px)', transition:'all 0.2s', fontSize:13,
    }}>
    ← Back
  </button>
);

// ── BidModal (unchanged) ───────────────────────────────────────
const BidModal = ({ work, category, onClose, bids, user, submitBid }) => {
  const [tokens,     setTokens]     = useState(5);
  const [step,       setStep]       = useState(1);
  const [screenshot, setScreenshot] = useState('');

  const myBid = bids?.find(b => b.workId === work.id && b.userEmail === user?.email && b.status !== 'rejected');

  if (myBid) return (
    <div style={moOverlay} onClick={onClose}>
      <div style={moBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop:0,color:'rgba(255,255,255,0.9)' }}>💰 Bid Status</h3>
        <p style={{ fontSize:14 }}>Status: <strong style={{ color: myBid.status==='approved'?'#2ecc71':'#f39c12', textTransform:'capitalize' }}>{myBid.status}</strong></p>
        {myBid.status==='approved' && <p style={{ fontSize:13, color:'#2ecc71' }}>✅ Your work is now promoted!</p>}
        {myBid.status==='pending'  && <p style={{ fontSize:13, color:'#636e72' }}>⏳ Awaiting admin approval.</p>}
        <button onClick={onClose} style={{ ...submitBtn, marginTop:8 }}>Close</button>
      </div>
    </div>
  );

  const amount   = tokens === 5 ? 500 : 200;
  const workLink = work.fileUrl || work.fullStoryFile || '';
  const workId   = work.id || work.Name || '';

  if (step === 1) return (
    <div style={moOverlay} onClick={onClose}>
      <div style={moBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop:0,color:'rgba(255,255,255,0.9)' }}>💰 Promote Your Work</h3>
        <p style={{ fontSize:13, color:'#636e72', marginBottom:14 }}>"{work.title||work.Name}" — Will appear at the top of the dashboard.</p>
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          {[
            { t:5, price:'৳500', label:'Top Priority', emoji:'🥇', color:'#fdcb6e' },
            { t:2, price:'৳200', label:'2nd Priority',  emoji:'🥈', color:'#b2bec3' },
          ].map(opt => (
            <div key={opt.t} onClick={() => setTokens(opt.t)}
              style={{ flex:1, padding:14, borderRadius:12, border:`2px solid ${tokens===opt.t?opt.color:'#eee'}`,
                cursor:'pointer', textAlign:'center', background: tokens===opt.t?'#fffbee':'#fff', transition:'all 0.15s' }}>
              <div style={{ fontSize:24 }}>{opt.emoji}</div>
              <div style={{ fontWeight:700, fontSize:14 }}>{opt.t} Tokens</div>
              <div style={{ fontSize:13, color:'#2d3436', fontWeight:600 }}>{opt.price}</div>
              <div style={{ fontSize:11, color:'#00b894', marginTop:4 }}>{opt.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#f0f4ff', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#4834d4', marginBottom:14 }}>
          ℹ️ Admin will review your bid and payment. Once approved, your work goes to the top immediately.
        </div>
        {workLink && (
          <div style={{ background:'#f8f9fa', borderRadius:10, padding:'10px 12px', fontSize:12, marginBottom:14 }}>
            <span style={{ color:'#636e72' }}>Work link: </span>
            <a href={workLink} target="_blank" rel="noreferrer" style={{ color:'#6c5ce7', fontWeight:600 }}>🔗 {work.title||work.Name}</a>
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:'1px solid #eee', cursor:'pointer', background:'#f8f9fa' }}>Cancel</button>
          <button onClick={() => setStep(2)} style={{ flex:1, padding:10, borderRadius:10, border:'none', background:'#2d3436', color:'#fff', cursor:'pointer', fontWeight:'bold' }}>
            Next → Pay {amount}৳
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={moOverlay} onClick={onClose}>
      <div style={{ ...moBox, maxWidth:460 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop:0,color:'rgba(255,255,255,0.9)',textAlign:'center' }}>💳 Payment Details</h3>
        <p style={{ fontSize:13, color:'#636e72', textAlign:'center', marginBottom:16 }}>
          Send <strong style={{ color:'#2d3436', fontSize:16 }}>{amount}৳</strong> to one of the numbers below, then paste your payment screenshot link.
        </p>
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <div style={{ flex:1, background:'linear-gradient(135deg,#e91e8c,#c2185b)', borderRadius:14, padding:'14px 12px', color:'#fff', textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>📱</div>
            <div style={{ fontWeight:800, fontSize:13, letterSpacing:1 }}>bKash</div>
            <div style={{ fontSize:16, fontWeight:700, margin:'6px 0', letterSpacing:2 }}>01XXXXXXXXX</div>
            <div style={{ fontSize:11, opacity:0.85 }}>Send Money → Personal</div>
          </div>
          <div style={{ flex:1, background:'linear-gradient(135deg,#f97316,#ea580c)', borderRadius:14, padding:'14px 12px', color:'#fff', textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>📱</div>
            <div style={{ fontWeight:800, fontSize:13, letterSpacing:1 }}>Nagad</div>
            <div style={{ fontSize:16, fontWeight:700, margin:'6px 0', letterSpacing:2 }}>01XXXXXXXXX</div>
            <div style={{ fontSize:11, opacity:0.85 }}>Send Money → Personal</div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f0f4ff', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
          <span style={{ fontSize:13, color:'#4834d4', fontWeight:600 }}>Plan: {tokens===5?'🥇 Top Priority':'🥈 2nd Priority'}</span>
          <span style={{ fontSize:16, fontWeight:800, color:'#2d3436' }}>{amount}৳</span>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#636e72', display:'block', marginBottom:6 }}>📸 Payment Screenshot Link *</label>
          <input type="url" placeholder="Upload screenshot to Google Drive and paste link here..."
            value={screenshot} onChange={e => setScreenshot(e.target.value)}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #eee', boxSizing:'border-box', fontSize:13 }}
          />
          <p style={{ fontSize:11, color:'#94a3b8', margin:'4px 0 0' }}>Upload your payment screenshot to Google Drive → Share → Anyone with link → paste here.</p>
        </div>
        <div style={{ background:'#fff9db', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#636e72', marginBottom:14 }}>
          <strong style={{ color:'#f39c12' }}>⚠️ Important:</strong> Admin will verify your payment screenshot before approving. Approval is usually within 24 hours.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setStep(1)} style={{ flex:1, padding:10, borderRadius:10, border:'1px solid #eee', cursor:'pointer', background:'#f8f9fa' }}>← Back</button>
          <button
            onClick={() => {
              if (!screenshot.trim()) return alert("Please paste your payment screenshot link!");
              submitBid(category, workId, work.title||work.Name, tokens, screenshot.trim(), workLink);
              onClose();
            }}
            style={{ flex:2, padding:10, borderRadius:10, border:'none', background:'linear-gradient(135deg,#2d3436,#1a2025)', color:'#fff', cursor:'pointer', fontWeight:'bold', fontSize:13 }}>
            ✅ I've Paid — Submit Bid
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CommonDashboard({ pendingProfile, onClearPending }) {
  const {
    user, stories, setStories, requests,
    activeStoryId, setActiveStoryId, deleteStory, sendRequest,
    talentRequests, sendTalentRequest,
    follows, followTalent, unfollowTalent, isFollowing,
    promotedWorks, submitBid, bids,
    deleteTalentWork,
  } = useContext(AppContext);

  const [activeTab,       setActiveTab]       = useState('writer');
  const [talents,         setTalents]         = useState({singer:[],painter:[],actor:[],dancer:[]});
  const [allUsers,        setAllUsers]        = useState({});   // ← NEW
  const [expandedStory,   setExpandedStory]   = useState(null);
  const [storyModal,      setStoryModal]      = useState(null);
  const [directorNote,    setDirectorNote]    = useState('');
  const [selectedGenre,   setSelectedGenre]   = useState('All');
  const [savedStories,    setSavedStories]    = useState(()=>{
    const s=localStorage.getItem('savedStories'); return s?JSON.parse(s):[];
  });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [contactModal,    setContactModal]    = useState(null);
  const [contactMsg,      setContactMsg]      = useState('');
  const [bidModal,        setBidModal]        = useState(null);
  const [allFollowers,    setAllFollowers]    = useState({});
  const [highlightWorkId, setHighlightWorkId] = useState(null);   // ← NEW: shared-link work highlight

  const isOwnProfile = e => e?.toLowerCase()===user?.email?.toLowerCase();
  const followedKeys   = Object.keys(follows||{});
  const followedEmails = followedKeys.map(k=>k.replace(/,/g,'.'));

  useEffect(()=>{
    const u=onValue(ref(db,'stories'),snap=>{
      const d=snap.val();
      setStories(d?Object.entries(d).map(([k,v])=>({...v,id:k})).reverse():[]);
    });
    return()=>u();
  },[setStories]);

  useEffect(()=>{
    const cats=['singer','painter','actor','dancer'];
    const subs=[];
    cats.forEach(cat=>{
      const u=onValue(ref(db,`talents/${cat}`),snap=>{
        const d=snap.val();
        setTalents(prev=>({...prev,[cat]:d?Object.entries(d).map(([ek,p])=>({
          ...p,emailKey:ek,email:ek.replace(/,/g,'.'),category:cat
        })):[]}));
      });
      subs.push(u);
    });
    return()=>subs.forEach(u=>u());
  },[]);

  // ── Load all users ─────────────────────────────────────────────
  useEffect(()=>{
    const unsub=onValue(ref(db,'users'),snap=>{
      setAllUsers(snap.val()||{});
    });
    return()=>unsub();
  },[]);

  useEffect(()=>{
    if(activeStoryId){
      setActiveTab('writer');setSelectedGenre('All');
      setExpandedStory(activeStoryId);setActiveStoryId(null);
    }
  },[activeStoryId,setActiveStoryId]);

  useEffect(()=>{
    const unsub=onValue(ref(db,'followers'),snap=>{
      setAllFollowers(snap.val()||{});
    });
    return()=>unsub();
  },[]);

  // Notification / shared-link profile redirect
  useEffect(()=>{
    if(!pendingProfile) return;
    const allTalentsList=[...talents.singer,...talents.painter,...talents.actor,...talents.dancer];
    const found=allTalentsList.find(t=>t.email?.toLowerCase()===pendingProfile.email?.toLowerCase());
    if(found){ setSelectedProfile(found); }
    else {
      const fallbackRoleCfg = ROLE_CFG[pendingProfile.role] || { cat:'writer' };
      setSelectedProfile({
        email:      pendingProfile.email,
        name:       pendingProfile.name,
        profilePic: pendingProfile.pic,
        profession: pendingProfile.role||'',
        category:   fallbackRoleCfg.cat,
      });
    }
    setHighlightWorkId(pendingProfile.workId || null);   // ← NEW: remember which work to highlight/scroll to
    onClearPending?.();
  },[pendingProfile]);

  // ── Scroll the shared work into view once its profile is open ──
  useEffect(()=>{
    if(!selectedProfile || !highlightWorkId) return;
    const t = setTimeout(()=>{
      const el = document.getElementById(`work-${highlightWorkId}`);
      if(el) el.scrollIntoView({ behavior:'smooth', block:'center' });
    }, 200);
    return ()=>clearTimeout(t);
  },[selectedProfile, highlightWorkId]);

  const getFollowers=(email)=>{
    if(!email) return [];
    const key=email.replace(/\./g,',');
    return Object.values(allFollowers[key]||{});
  };
  const getFollowerCount=(email)=>getFollowers(email).length;

  // ── Build full profile for any email ──────────────────────────
  const buildProfile = (email) => {
    const lEmail = email.toLowerCase();
    const emailKey = lEmail.replace(/\./g, ',');

    // 1. Try talent data first (has songs/artworks/videos)
    const talentProfile = [...talents.singer,...talents.painter,...talents.actor,...talents.dancer]
      .find(t => t.email?.toLowerCase() === lEmail);
    if (talentProfile) return talentProfile;

    // 2. Try writer profiles
    const writerProfile = writerProfiles.find(p => p.email === lEmail);
    if (writerProfile) return writerProfile;

    // 3. Fallback to allUsers
    const u = allUsers[emailKey];
    if (u) {
      const roleCfg = ROLE_CFG[u.role] || { color:'#636e72', label:'👤 User', cat:'writer' };
      return {
        email:      lEmail,
        emailKey,
        name:       u.name       || 'Unknown',
        profilePic: u.profilePic || '/icon.png',
        profession: u.profession || u.role || '',
        address:    u.address    || '',
        role:       u.role       || '',
        category:   roleCfg.cat,
      };
    }
    return null;
  };

  const writerProfiles=React.useMemo(()=>{
    const map={};
    stories.forEach(s=>{
      const key=(s.writerEmail||s.email||'').toLowerCase();
      if(!key) return;
      if(!map[key]){
        map[key]={
          email:key,emailKey:key.replace(/\./g,','),
          name:s.writerName||'Unknown',
          profilePic:s.writerPic||'/icon.png',
          profession:s.writerProfession||'Writer',
          category:'writer',storyCount:0,genres:[],
        };
      }
      map[key].storyCount++;
      if(s.genre&&!map[key].genres.includes(s.genre)) map[key].genres.push(s.genre);
    });
    return Object.values(map);
  },[stories]);

  const toggleSave=id=>{
    const n=savedStories.includes(id)?savedStories.filter(i=>i!==id):[...savedStories,id];
    setSavedStories(n); localStorage.setItem('savedStories',JSON.stringify(n));
  };

  const handleStoryRequest=()=>{
    if(!directorNote.trim()) return alert("Please send your portfolio link or identity for verification!");
    if(!storyModal||!user) return;
    const {story,type}=storyModal;
    sendRequest(story.writerEmail||story.email,story.Name||story.title,story.id,type,directorNote);
    setStoryModal(null); setDirectorNote('');
  };

  const getReqStatus=email=>{
    if(!email) return null;
    return talentRequests?.find(r=>
      r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()&&
      r.talentEmail?.toLowerCase()===email?.toLowerCase()
    )?.status||null;
  };

  const getRevealedContact=email=>{
    if(!email) return null;
    return talentRequests?.find(r=>
      r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()&&
      r.talentEmail?.toLowerCase()===email?.toLowerCase()&&
      r.status==='approved'
    )?.revealedContact||null;
  };

  const handleSendContact=async()=>{
    if(!contactMsg.trim()) return alert("Please write your identity and purpose!");
    if(!contactModal) return;
    const talentEmail=contactModal.email||contactModal.profile?.email;
    const talentName=contactModal.profile?.name||contactModal.name||'Unknown';
    if(!talentEmail) return alert("Could not find talent email. Please try again.");
    try {
      await sendTalentRequest(talentEmail,talentName,contactMsg);
      setContactMsg(''); setContactModal(null);
    } catch(e) { alert("Request failed: "+(e?.message||'Unknown error')); }
  };

  const openContactModal=(p)=>{ if(!p) return; setContactModal(p); };

  const getPromoTokens=(category,workId,emailKey)=>{
    const key=`${emailKey}_${workId}`;
    return promotedWorks?.[category]?.[key]?.tokens||0;
  };

  const getPromoApprovedAt=(category,workId,emailKey)=>{
    const key=`${emailKey}_${workId}`;
    return promotedWorks?.[category]?.[key]?.approvedAt||0;
  };

  const sortWithPromo=(list,category)=>[...list].sort((a,b)=>{
    const aEK=a.emailKey||a.uploaderEmail?.replace(/\./g,',')||a.writerEmail?.replace(/\./g,',')||a.email?.replace(/\./g,',')||'';
    const bEK=b.emailKey||b.uploaderEmail?.replace(/\./g,',')||b.writerEmail?.replace(/\./g,',')||b.email?.replace(/\./g,',')||'';
    const aP=getPromoTokens(category,a.id,aEK);
    const bP=getPromoTokens(category,b.id,bEK);
    if(bP!==aP) return bP-aP;
    if(aP>0&&bP>0){
      const aAT=getPromoApprovedAt(category,a.id,aEK);
      const bAT=getPromoApprovedAt(category,b.id,bEK);
      if(aAT!==bAT) return aAT-bAT;
    }
    const aF=followedEmails.includes((a.uploaderEmail||a.email||'').toLowerCase())?1:0;
    const bF=followedEmails.includes((b.uploaderEmail||b.email||'').toLowerCase())?1:0;
    if(bF!==aF) return bF-aF;
    return (b.uploadedAt||b.timestamp||0)-(a.uploadedAt||a.timestamp||0);
  });

  const getFlatWorks=(cat)=>{
    const list=[];
    (talents[cat]||[]).forEach(t=>{
      const folder=cat==='painter'?'artworks':cat==='singer'?'songs':'videos';
      Object.entries(t[folder]||{}).forEach(([wid,w])=>{
        list.push({
          ...w,id:wid,emailKey:t.emailKey,
          uploaderEmail:t.email,
          uploaderName:t.profile?.name||t.name||'Unknown',
          uploaderPic:t.profile?.profilePic||t.profilePic||'/icon.png',
          category:cat,talentProfile:t
        });
      });
    });
    return sortWithPromo(list,cat);
  };

  const filteredStories=sortWithPromo(
    stories.filter(s=>selectedGenre==='Saved'?savedStories.includes(s.id):selectedGenre==='All'?true:s.genre===selectedGenre),
    'writer'
  );

  // ── All followed user profiles (for Following tab) ─────────────
  const followingProfiles = React.useMemo(() => {
    return followedEmails
      .map(email => buildProfile(email))
      .filter(Boolean);
  }, [followedEmails, allUsers, talents, writerProfiles]);

  // STORY DETAIL VIEW
  if(expandedStory){
    const s=stories.find(i=>i.id===expandedStory);
    if(!s){setExpandedStory(null);return null;}
    const isOwner=s.writerEmail===user?.email||s.email===user?.email;
    const chk=type=>requests?.find(r=>r.storyId===s.id&&r.fromEmail===user?.email&&r.status==='approved'&&r.requestType===type);
    const hasSyn=!s.isSynopsisLocked||chk('synopsis')||isOwner;
    const hasFull=!s.isFullStoryLocked||chk('fullStory')||isOwner;
    const hasCon=!s.isContactLocked||chk('contact')||isOwner;
    const writerEmail=(s.writerEmail||s.email||'').toLowerCase();
    const iFollow=isFollowing(writerEmail);
    const promoT=getPromoTokens('writer',s.id,writerEmail.replace(/\./g,','));
    const wProfile=writerProfiles.find(p=>p.email===writerEmail);

    return(
      <div style={{padding:16,maxWidth:800,margin:'0 auto'}}>
        {storyModal&&<StoryModal modal={storyModal} note={directorNote} setNote={setDirectorNote} onSend={handleStoryRequest} onClose={()=>{setStoryModal(null);setDirectorNote('');}}/>}
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
          <button onClick={e=>withRipple(e,()=>{playClick();setExpandedStory(null);})} className='cb-btn' style={backBtn}>← Back</button>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {promoT>0&&<span style={promoT===5?goldBadge:silverBadge}>{promoT===5?'🥇 Top':'🥈'}</span>}
            {!isOwner&&wProfile&&(
              <button onClick={()=>{setExpandedStory(null);setSelectedProfile(wProfile);}} style={{...followBtn,background:'#4834d4',color:'#fff'}}>👤 View Profile</button>
            )}
            {!isOwner&&<button onClick={()=>iFollow?unfollowTalent(writerEmail):followTalent(writerEmail,s.writerName,s.writerPic||'/icon.png')} style={{...followBtn,background:iFollow?'#f1f2f6':'#fdcb6e'}}>{iFollow?'✓ Following':'+ Follow'}</button>}
            {isOwner&&<button onClick={()=>setBidModal({work:{...s},category:'writer'})} style={{...followBtn,background:'#a29bfe',color:'#fff'}}>💰 Promote</button>}
            {isOwner&&<button onClick={()=>{deleteStory(s.id);setExpandedStory(null);}} style={{...followBtn,background:'#ff4757',color:'#fff'}}>Delete</button>}
          </div>
        </div>
        <div style={{...card,animation:'slideIn 0.3s ease'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
            <img src={isOwner?(user?.profilePic||'/icon.png'):(s.writerPic||'/icon.png')} alt="" style={av45}/>
            <div style={{marginLeft:12,flex:1}}>
              <strong style={{cursor:wProfile&&!isOwner?'pointer':'default',color:wProfile&&!isOwner?'#4834d4':'#2d3436'}}
                onClick={()=>{if(wProfile&&!isOwner){setExpandedStory(null);setSelectedProfile(wProfile);}}}>
                {s.writerName||'Unknown Writer'}
              </strong>
              <div style={chip}>{s.genre}</div>
            </div>
            <button onClick={()=>toggleSave(s.id)} style={iconBtn}>{savedStories.includes(s.id)?'❤️':'🤍'}</button>
          </div>
          <h2 style={{color:'#a78bfa',margin:'0 0 6px',fontFamily:'Georgia,serif'}}>{s.Name}</h2>
          <p style={{fontWeight:600,color:'rgba(255,255,255,0.7)',marginBottom:12,fontStyle:'italic'}}>{s.logline}</p>
          <div style={{marginTop:16,padding:14,background:'rgba(139,92,246,0.08)',borderRadius:12,border:'1px solid rgba(139,92,246,0.15)'}}>
            <LS label="Synopsis / Outline" locked={!hasSyn} onReq={()=>setStoryModal({story:s,type:'synopsis'})} reqLabel="Request Access">
              <p style={{fontSize:14,whiteSpace:'pre-wrap',margin:0}}>{s.synopsis||'No synopsis provided.'}</p>
            </LS>
            <LS label="Full Story / Script" locked={!hasFull} onReq={()=>setStoryModal({story:s,type:'fullStory'})} reqLabel="Request Script" div>
              {s.fullStoryFile?<a href={s.fullStoryFile.startsWith('http')?s.fullStoryFile:`https://${s.fullStoryFile}`} target="_blank" rel="noreferrer" style={linkS}>🔗 View Full Story</a>:<span style={{color:'#aaa',fontSize:13}}>No link provided</span>}
            </LS>
            <LS label="Writer's Info & Portfolio" locked={!hasCon} onReq={()=>setStoryModal({story:s,type:'contact'})} reqLabel="Request Contact" div>
              <div style={{fontSize:13,display:'flex',flexDirection:'column',gap:4}}>
                <p style={{margin:0}}>📧 {s.contactEmail||s.writerEmail||s.email}</p>
                {s.contactPhone&&<p style={{margin:0}}>📞 {s.contactPhone}</p>}
                {s.portfolio&&<p style={{margin:0}}>🌐 <a href={s.portfolio.startsWith('http')?s.portfolio:`https://${s.portfolio}`} target="_blank" rel="noreferrer" style={{color:'#6c5ce7'}}>{s.portfolio}</a></p>}
              </div>
            </LS>
          </div>
        </div>
        <div style={{textAlign:'center'}}><BackToDashboardBtn onClick={()=>setExpandedStory(null)}/></div>
      </div>
    );
  }

  // PROFILE DETAIL VIEW
  if(selectedProfile){
    const p=selectedProfile;
    // ── Handle ALL roles including Hirer ─────────────────────────
    const roleCfg = ROLE_CFG[p.role] || ROLE_CFG[
      p.category==='writer'  ? 'Writer'  :
      p.category==='singer'  ? 'Singer'  :
      p.category==='painter' ? 'Painter' :
      p.category==='actor'   ? 'Actor'   :
      p.category==='dancer'  ? 'Dancer'  : 'Hirer'
    ] || { color:'#636e72', label:'👤 User', cat:'writer' };
    const tabColor = roleCfg.color;
    const tabLabel = roleCfg.label;

    const status=getReqStatus(p.email);
    const contact=getRevealedContact(p.email);
    const isMe=isOwnProfile(p.email);
    const iFollow=isFollowing(p.email);
    const name=p.profile?.name||p.name||'Unknown';
    const pic=p.profile?.profilePic||p.profilePic||'/icon.png';
    const writerStories=p.category==='writer'?stories.filter(s=>(s.writerEmail||s.email||'').toLowerCase()===p.email):[];
    const followerList=getFollowers(p.email);

    return(
      <div style={{maxWidth:720,margin:'0 auto',padding:16}}>
        {contactModal&&(
          <ContactModal talent={contactModal} msg={contactMsg} setMsg={setContactMsg}
            onSend={handleSendContact} onClose={()=>{setContactModal(null);setContactMsg('');}}/>
        )}
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <button onClick={()=>{setSelectedProfile(null);setHighlightWorkId(null);}} style={backBtn}>← Back</button>
          {/* Follow/Unfollow for ANY user */}
          {!isMe&&(
            <button onClick={()=>iFollow?unfollowTalent(p.email):followTalent(p.email,name,pic)}
              style={{...followBtn,background:iFollow?'#f1f2f6':'#fdcb6e'}}>
              {iFollow?'✓ Following':'+ Follow'}
            </button>
          )}
        </div>
        <div style={{...card,animation:'slideIn 0.3s ease'}}>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16,flexWrap:'wrap'}}>
            <img src={pic} alt="" style={{width:76,height:76,borderRadius:'50%',objectFit:'cover',border:'3px solid #eee',flexShrink:0}}/>
            <div style={{flex:1}}>
              <h2 style={{margin:'0 0 4px',color:'rgba(255,255,255,0.95)',fontSize:20}}>{name}</h2>
              <span style={{...chip,background:tabColor+'22',color:tabColor,fontSize:12}}>{tabLabel}</span>
              {followerList.length>0&&(
                <span style={{display:'inline-block',marginLeft:8,fontSize:11,fontWeight:700,color:'#fdcb6e',background:'#fffbee',border:'1px solid #fdcb6e44',padding:'2px 8px',borderRadius:20}}>
                  ⭐ {followerList.length} follower{followerList.length>1?'s':''}
                </span>
              )}
              {(p.profile?.address||p.address)&&<p style={{margin:'4px 0 0',fontSize:13,color:'#636e72'}}>📍 {p.profile?.address||p.address}</p>}
              {(p.profile?.profession||p.profession)&&<p style={{margin:'2px 0 0',fontSize:13,color:'#636e72'}}>💼 {p.profile?.profession||p.profession}</p>}
            </div>
            {!isMe&&(
              <div>
                {status===null&&<button onClick={()=>openContactModal(p)} style={reqBtn}>📩 Contact</button>}
                {status==='pending'&&<div style={pChip}>⏳ Request Pending</div>}
                {status==='approved'&&<div style={aChip}>✅ Accepted</div>}
                {status==='declined'&&<div style={dChip}>❌ Declined</div>}
              </div>
            )}
            {isMe&&<span style={{fontSize:12,color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.05)',padding:'5px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,0.1)'}}>👤 Your Profile</span>}
          </div>

          {p.profile?.bio&&<p style={{fontSize:14,background:'#f8f9fa',padding:12,borderRadius:10,margin:'0 0 14px'}}>{p.profile.bio}</p>}

          {/* Followers */}
          <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
            <p style={secLbl}>Followers ({followerList.length})</p>
            {followerList.length===0?(
              <p style={{fontSize:13,color:'#b2bec3'}}>No followers yet.</p>
            ):(
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {followerList.map((f,i)=>(
                  <div key={i} className='cb-card' style={{display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'6px 10px',fontSize:12,cursor:'pointer'}}
                    onClick={()=>{ const fp=buildProfile(f.followerEmail); if(fp) setSelectedProfile(fp); }}>
                    <img src={f.followerPic||'/icon.png'} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',border:'1.5px solid #eee',flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:600,color:'rgba(255,255,255,0.85)',lineHeight:1.2}}>{f.followerName||'User'}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{f.followerRole||f.followerProfession||''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
            <p style={secLbl}>Contact Information</p>
            {(isMe||contact)?(
              <div style={{fontSize:13,display:'flex',flexDirection:'column',gap:5}}>
                {(contact?.email||(isMe&&user?.email))&&<p style={{margin:0}}>📧 {contact?.email||user?.email}</p>}
                {(contact?.phone||(isMe&&user?.phone))&&<p style={{margin:0}}>📞 {contact?.phone||user?.phone}</p>}
                {(contact?.whatsapp||(isMe&&user?.whatsapp))&&<p style={{margin:0}}>💬 {contact?.whatsapp||user?.whatsapp}</p>}
                {(contact?.facebook||(isMe&&user?.facebook))&&<p style={{margin:0}}>👤 <a href={contact?.facebook||user?.facebook} target="_blank" rel="noreferrer" style={{color:'#4834d4'}}>{contact?.facebook||user?.facebook}</a></p>}
              </div>
            ):(
              <div style={lockedRow}>
                <span style={{fontSize:13,color:'#636e72'}}>🔒 Contact info locked</span>
                {status===null&&<button onClick={()=>openContactModal(p)} style={smallReq}>Request Access</button>}
                {status==='pending'&&<span style={{fontSize:12,color:'#f39c12'}}>⏳ Waiting for approval...</span>}
              </div>
            )}
          </div>

          {/* Writer: Stories */}
          {p.category==='writer'&&writerStories.length>0&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              <p style={secLbl}>Stories ({writerStories.length})</p>
              {writerStories.map(s=>{
                const isHL = s.id===highlightWorkId;
                return (
                  <div key={s.id} id={`work-${s.id}`} style={{
                    padding:'10px 12px',
                    background: isHL ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                    borderRadius:10, marginBottom:8, cursor:'pointer',
                    border: isHL ? '2px solid #fdcb6e' : '1px solid transparent',
                    transition:'all 0.2s',
                  }}
                    onClick={()=>{setSelectedProfile(null);setExpandedStory(s.id);}}>
                    <div style={{fontWeight:700,color:'#a78bfa',fontSize:14,fontFamily:'Georgia,serif'}}>{s.Name}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{s.genre} · {s.logline?.slice(0,60)}...</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Singer: Songs (audio, video, or Drive link) */}
          {p.category==='singer'&&p.songs&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              <p style={secLbl}>Songs ({Object.keys(p.songs).length})</p>
              {Object.entries(p.songs).map(([wid,s])=>{
                const isHL = wid===highlightWorkId;
                const fromDrive = isDriveLink(s.fileUrl);
                return (
                  <div key={wid} id={`work-${wid}`} style={{
                    display:'flex',alignItems:'center',gap:10,
                    background: isHL ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                    padding:10, borderRadius:10, marginBottom:8,
                    border: isHL ? '2px solid #fdcb6e' : '1px solid transparent',
                    transition:'all 0.2s',
                  }}>
                    <div style={{flex:'0 0 auto'}}>
                      <div style={{fontWeight:600,fontSize:13}}>{s.title}</div>
                      <div style={{fontSize:11,color:'#636e72'}}>{s.genre}</div>
                    </div>
                    {fromDrive ? (
                      <iframe src={driveEmbedUrl(s.fileUrl)} style={{flex:1,height:s.mediaType==='video'?160:80,border:'none',borderRadius:8,minWidth:0}} allow="autoplay" title={s.title}/>
                    ) : s.mediaType==='video'
                      ? <video controls src={s.fileUrl} style={{flex:1,borderRadius:8,maxHeight:160,minWidth:0}}/>
                      : <audio controls src={s.fileUrl} style={{flex:1,height:32,minWidth:0}}/>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Painter: Artworks */}
          {p.category==='painter'&&p.artworks&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              <p style={secLbl}>Artworks — Copyright Protected ({Object.keys(p.artworks).length})</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
                {Object.entries(p.artworks).map(([wid,a])=>{
                  const isHL = wid===highlightWorkId;
                  return (
                    <div key={wid} id={`work-${wid}`} style={{
                      borderRadius:10,
                      border: isHL ? '3px solid #fdcb6e' : '3px solid transparent',
                      boxShadow: isHL ? '0 0 0 3px rgba(253,203,110,0.35)' : 'none',
                      transition:'all 0.2s',
                    }}>
                     <ProtImg src={a.fileUrl} title={a.title} height={220} viewerName={user?.name} viewerEmail={user?.email}/>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actor/Dancer: Videos (Cloudinary or Drive link) */}
          {(p.category==='actor'||p.category==='dancer')&&p.videos&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
              <p style={secLbl}>{p.category==='actor'?'Videos':'Dance Videos'} ({Object.keys(p.videos).length})</p>
              {Object.entries(p.videos).map(([wid,v])=>{
                const isHL = wid===highlightWorkId;
                const fromDrive = isDriveLink(v.fileUrl);
                return (
                  <div key={wid} id={`work-${wid}`} style={{
                    marginBottom:12, padding: isHL ? 8 : 4,
                    border: isHL ? '2px solid #fdcb6e' : '1px solid #f0f0f0',
                    borderRadius:10, transition:'all 0.2s', background:'#fafafa',
                  }}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:8,padding:'0 4px'}}>{v.title}</div>
                    {v.fileUrl ? (
                      fromDrive
                        ? <iframe src={driveEmbedUrl(v.fileUrl)} style={{width:'100%',height:220,border:'none',borderRadius:8}} allow="autoplay" title={v.title}/>
                        : <video controls src={v.fileUrl} style={{width:'100%',borderRadius:8,maxHeight:220,display:'block'}}/>
                    ) : (
                      <div style={{background:'#fff3cd',border:'1px solid #ffc107',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#856404'}}>
                        ⚠️ Video file missing — please delete this entry and re-upload from "My Work" page using the new upload system.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{textAlign:'center'}}><BackToDashboardBtn onClick={()=>{setSelectedProfile(null);setHighlightWorkId(null);}}/></div>
      </div>
    );
  }

  // MAIN BROWSE
  const tabCount={following:followedKeys.length};

  return(
    <div>
      {bidModal&&(
        <BidModal work={bidModal.work} category={bidModal.category} onClose={()=>setBidModal(null)}
          bids={bids} user={user} submitBid={submitBid}/>
      )}
      {contactModal&&(
        <ContactModal talent={contactModal} msg={contactMsg} setMsg={setContactMsg}
          onSend={handleSendContact} onClose={()=>{setContactModal(null);setContactMsg('');}}/>
      )}
      {storyModal&&(
        <StoryModal modal={storyModal} note={directorNote} setNote={setDirectorNote}
          onSend={handleStoryRequest} onClose={()=>{setStoryModal(null);setDirectorNote('');}}/>
      )}

      {/* ── Cinematic Tab Bar ── */}
      <div style={{
        display:'flex',gap:6,overflowX:'auto',padding:'16px 16px 0',
        background:'rgba(5,3,20,0.7)',
        backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(139,92,246,0.15)',
        scrollbarWidth:'none',
      }}>
        {TABS.map(t=>{
          const cnt=tabCount[t.id];
          const isAct=activeTab===t.id;
          return(
            <button key={t.id}
              className="cb-tab"
              onClick={e=>{
                withRipple(e,()=>playClick());
                setActiveTab(t.id);setSelectedProfile(null);setExpandedStory(null);
              }}
              style={{
                padding:'10px 18px',borderRadius:24,cursor:'pointer',
                fontWeight:700,fontSize:12,whiteSpace:'nowrap',
                background: isAct
                  ? `linear-gradient(135deg,${t.color},${t.color}aa)`
                  : 'rgba(255,255,255,0.05)',
                color: isAct ? '#fff' : t.color,
                border: isAct
                  ? `1.5px solid ${t.color}`
                  : `1.5px solid ${t.color}44`,
                boxShadow: isAct ? `0 0 20px ${t.color}55` : 'none',
                position:'relative',transition:'all 0.2s',
                backdropFilter:'blur(8px)',
                marginBottom:8,
              }}>
              {t.label}
              {cnt>0&&<span style={{position:'absolute',top:-5,right:-5,background:'#ef4444',color:'#fff',borderRadius:'50%',padding:'1px 5px',fontSize:9,fontWeight:800,border:'1.5px solid rgba(5,3,20,0.8)'}}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* ── FOLLOWING TAB ── */}
      {activeTab==='following'&&(
        <div style={{padding:16}}>
          {followedKeys.length===0 ? (
            <Empty emoji="⭐" text="You haven't followed anyone yet."/>
          ) : followingProfiles.length===0 ? (
            <Empty emoji="⭐" text="Loading followed profiles..."/>
          ) : (
            <div>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:13,margin:'0 0 14px'}}>
                {followingProfiles.length} people you follow
              </p>
              <div style={grid}>
                {followingProfiles.map((p, i) => {
                  if (!p) return null;
                  const iF = isFollowing(p.email);
                  const name = p.profile?.name || p.name || 'Unknown';
                  const pic  = p.profile?.profilePic || p.profilePic || '/icon.png';
                  const addr = (p.profile?.address || p.address || '').split(',')[0];
                  const fCount = getFollowerCount(p.email);
                  const roleCfgItem = ROLE_CFG[p.role] || ROLE_CFG[
                    p.category==='writer'  ? 'Writer'  :
                    p.category==='singer'  ? 'Singer'  :
                    p.category==='painter' ? 'Painter' :
                    p.category==='actor'   ? 'Actor'   :
                    p.category==='dancer'  ? 'Dancer'  : 'Hirer'
                  ] || { color:'#636e72', label:'👤 User' };

                  return (
                    <div key={i} className="cb-card" style={{...card, cursor:'pointer', animation:'slideIn 0.3s ease both', animationDelay:`${i*0.05}s`}}
                      onClick={() => { playClick(); setSelectedProfile(p); }}>
                      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                        <img src={pic} alt="" style={{...av45,width:52,height:52,border:`2px solid ${roleCfgItem.color}33`}}/>
                        <div style={{flex:1,overflow:'hidden'}}>
                          <strong style={{fontSize:15,color:'#2d3436',display:'block',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</strong>
                          {addr&&<p style={{margin:'2px 0 0',fontSize:11,color:'#636e72'}}>📍 {addr}</p>}
                          {fCount>0&&<p style={{margin:'2px 0 0',fontSize:11,color:'#fdcb6e',fontWeight:700}}>⭐ {fCount} follower{fCount>1?'s':''}</p>}
                        </div>
                        <span style={{...chip,background:roleCfgItem.color+'22',color:roleCfgItem.color,fontSize:10,flexShrink:0}}>
                          {roleCfgItem.label}
                        </span>
                      </div>

                      {/* Tap to view hint */}
                      <p style={{fontSize:11,color:'#94a3b8',margin:'0 0 10px',textAlign:'center'}}>
                        👆 Tap to view profile
                      </p>

                      {/* Unfollow button */}
                      <button
                        onClick={e => { e.stopPropagation(); withRipple(e,()=>unfollowTalent(p.email)); }}
                        className="cb-btn"
                        style={{...followBtn,width:'100%',justifyContent:'center',background:'rgba(255,255,255,0.08)',fontSize:12,padding:'8px'}}>
                        ✓ Following — Unfollow
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WRITER TAB */}
      {activeTab==='writer'&&(
        <div>
          <div style={{display:'flex',gap:8,padding:'12px 16px',overflowX:'auto',background:'rgba(5,3,20,0.5)',backdropFilter:'blur(12px)',scrollbarWidth:'none'}}>
            {GENRES.map(g=>(
              <button key={g} onClick={e=>{withRipple(e,()=>playClick());setSelectedGenre(g);}} style={{
                padding:'6px 18px',borderRadius:20,cursor:'pointer',whiteSpace:'nowrap',
                fontSize:12,fontWeight:600,
                background: selectedGenre===g ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'rgba(255,255,255,0.05)',
                color: selectedGenre===g ? '#fff' : 'rgba(255,255,255,0.6)',
                border: selectedGenre===g ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: selectedGenre===g ? '0 0 15px rgba(139,92,246,0.4)' : 'none',
                transition:'all 0.2s',
              }}>{g}</button>
            ))}
          </div>
          {filteredStories.length===0?<Empty emoji="📝" text={selectedGenre==='Saved'?'No saved stories.':'No stories in this category.'}/>:(
            <div style={grid}>
              {filteredStories.map(s=>{
                const wE=(s.writerEmail||s.email||'').toLowerCase();
                const wP=writerProfiles.find(p=>p.email===wE);
                const isOwner=isOwnProfile(wE);
                return <SCard key={s.id} s={s} user={user} saved={savedStories} toggleSave={toggleSave}
                  onView={()=>setExpandedStory(s.id)} onDelete={deleteStory}
                  isFollowing={isFollowing}
                  onFollow={()=>isFollowing(wE)?unfollowTalent(wE):followTalent(wE,s.writerName,s.writerPic||'/icon.png')}
                  onViewProfile={wP&&!isOwner?()=>setSelectedProfile(wP):null}
                  promoTokens={getPromoTokens('writer',s.id,wE.replace(/\./g,','))}
                  followerCount={getFollowerCount(wE)}
                  onBid={isOwner?()=>setBidModal({work:{...s},category:'writer'}):null}/>;
              })}
            </div>
          )}
        </div>
      )}

      {/* SINGER / PAINTER / ACTOR / DANCER TABS */}
      {['singer','painter','actor','dancer'].includes(activeTab)&&(()=>{
        const works=getFlatWorks(activeTab);
        if(works.length===0) return <Empty emoji={TABS.find(t=>t.id===activeTab)?.label?.split(' ')[0]||'🎭'} text="No content found yet."/>;
        return(
          <div style={grid}>
            {works.map((w,i)=>{
              const isOwner=isOwnProfile(w.uploaderEmail);
              const promoT=getPromoTokens(activeTab,w.id,w.emailKey);
              const reqSt=getReqStatus(w.uploaderEmail);
              const fCount=getFollowerCount(w.uploaderEmail);
              const fromDrive = isDriveLink(w.fileUrl);
              return(
                <div key={i} className="cb-card" style={{...card,position:'relative',overflow:'hidden'}}>
                  {promoT>0&&<span style={{position:'absolute',top:10,right:10,zIndex:2,...(promoT===5?goldBadge:silverBadge)}}>{promoT===5?'🥇':'🥈'}</span>}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,cursor:'pointer'}}
                    onClick={()=>{playClick();w.talentProfile&&setSelectedProfile(w.talentProfile);}}>
                    <img src={w.uploaderPic||'/icon.png'} alt="" style={av45}/>
                    <div style={{flex:1}}>
                      <strong style={{fontSize:14,color:'#2d3436'}}>{w.uploaderName}</strong>
                      {w.talentProfile?.profile?.address&&<p style={{margin:'2px 0 0',fontSize:11,color:'#636e72'}}>📍 {w.talentProfile.profile.address.split(',')[0]}</p>}
                      {fCount>0&&<p style={{margin:'2px 0 0',fontSize:11,color:'#fdcb6e',fontWeight:700}}>⭐ {fCount} follower{fCount>1?'s':''}</p>}
                    </div>
                  </div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{w.title}</div>
                  <div style={{fontSize:12,color:'#636e72',marginBottom:8}}>{w.genre||w.style||w.type||''}</div>
                  {activeTab==='singer'&&w.fileUrl&&(
                    fromDrive ? (
                      <iframe src={driveEmbedUrl(w.fileUrl)} style={{width:'100%',height:w.mediaType==='video'?200:80,border:'none',borderRadius:10,marginBottom:8}} allow="autoplay" title={w.title}/>
                    ) : w.mediaType==='video'
                      ? <video controls src={w.fileUrl} style={{width:'100%',borderRadius:10,maxHeight:200,marginBottom:8}}/>
                      : <audio controls src={w.fileUrl} style={{width:'100%',height:32,marginBottom:8}}/>
                  )}
                  {activeTab==='painter'&&w.fileUrl&&<ProtImg src={w.fileUrl} title={w.title} height={200} viewerName={user?.name} viewerEmail={user?.email}/>}
                  {activeTab==='actor'&&w.fileUrl&&(
                    <div onClick={()=>w.talentProfile&&setSelectedProfile(w.talentProfile)} style={{cursor:'pointer',marginBottom:8}}>
                      {/* Film screen frame */}
                      <div style={{background:'#0a0a0a',borderRadius:6,border:'6px solid #1a1a1a',boxShadow:'0 0 0 3px #2a2a2a,0 0 20px rgba(239,68,68,0.15)',overflow:'hidden',position:'relative'}}>
                        {/* Film perforations */}
                        <div style={{display:'flex',justifyContent:'space-between',padding:'3px 6px',background:'#111'}}>
                          {[...Array(8)].map((_,i)=><div key={i} style={{width:8,height:8,borderRadius:2,background:'#333'}}/>)}
                        </div>
                        <div style={{background:'#000',padding:'6px 12px',textAlign:'center'}}>
                          <div style={{fontSize:10,color:'rgba(239,68,68,0.7)',fontWeight:700,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>🎬 {w.title}</div>
                          <div style={{color:'rgba(255,255,255,0.3)',fontSize:10}}>Tap to view on screen</div>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'3px 6px',background:'#111'}}>
                          {[...Array(8)].map((_,i)=><div key={i} style={{width:8,height:8,borderRadius:2,background:'#333'}}/>)}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab==='dancer'&&w.fileUrl&&(
                    <div onClick={()=>w.talentProfile&&setSelectedProfile(w.talentProfile)} style={{cursor:'pointer',marginBottom:8}}>
                      {/* Mobile phone frame */}
                      <div style={{maxWidth:160,margin:'0 auto',background:'#1a1a1a',borderRadius:24,border:'3px solid #2a2a2a',padding:'10px 5px',boxShadow:'0 8px 30px rgba(0,0,0,0.7)'}}>
                        <div style={{width:50,height:12,background:'#0a0a0a',borderRadius:6,margin:'0 auto 6px',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:'#2a2a2a'}}/>
                          <div style={{width:20,height:4,borderRadius:2,background:'#2a2a2a'}}/>
                        </div>
                        <div style={{background:'#000',borderRadius:4,padding:'6px',textAlign:'center',minHeight:60,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                          <div style={{fontSize:18,marginBottom:3}}>💃</div>
                          <div style={{fontSize:9,color:'rgba(236,72,153,0.7)',fontWeight:700,letterSpacing:1}}>{w.title}</div>
                          <div style={{fontSize:8,color:'rgba(255,255,255,0.25)',marginTop:2}}>Tap to play</div>
                        </div>
                        <div style={{width:30,height:3,background:'#333',borderRadius:2,margin:'6px auto 0'}}/>
                      </div>
                    </div>
                  )}
                  <div style={{display:'flex',gap:6,alignItems:'center',marginTop:8,flexWrap:'wrap'}}>
                    <button onClick={e=>withRipple(e,()=>{playClick();w.talentProfile&&setSelectedProfile(w.talentProfile);})} className="cb-btn" style={{...actionBtn,flex:1,fontSize:12,padding:'8px'}}>
                      View Profile
                    </button>
                    {!isOwner&&(
                      <>
                        {reqSt===null&&<button onClick={e=>withRipple(e,()=>{playClick();w.talentProfile&&openContactModal(w.talentProfile);})} className="cb-btn" style={smallReq}>📩</button>}
                        {reqSt==='pending'&&<span style={pChip}>⏳</span>}
                        {reqSt==='approved'&&<span style={aChip}>✅</span>}
                        <button onClick={e=>withRipple(e,()=>{playChime();isFollowing(w.uploaderEmail)?unfollowTalent(w.uploaderEmail):followTalent(w.uploaderEmail,w.uploaderName,w.uploaderPic);})} className="cb-btn"
                          style={{...followBtn,padding:'6px 10px',fontSize:11,background:isFollowing(w.uploaderEmail)?'rgba(255,255,255,0.1)':undefined}}>
                          {isFollowing(w.uploaderEmail)?'✓':'+ Follow'}
                        </button>
                      </>
                    )}
                    {isOwner&&<button onClick={e=>withRipple(e,()=>setBidModal({work:w,category:activeTab}))} className="cb-btn" style={{...followBtn,padding:'6px 10px',fontSize:11,background:'linear-gradient(135deg,rgba(245,158,11,0.4),rgba(217,119,6,0.4))'}}>💰</button>}
                    {isOwner&&<button className="cb-btn"
                      onClick={()=>{
                        if(window.confirm("Delete this work?")){
                          const roleMap={singer:'Singer',painter:'Painter',actor:'Actor',dancer:'Dancer'};
                          deleteTalentWork(roleMap[activeTab], w.emailKey, w.id);
                        }
                      }}
                      style={{...followBtn,padding:'6px 10px',fontSize:11,background:'linear-gradient(135deg,rgba(239,68,68,0.4),rgba(220,38,38,0.4))'}}>
                      🗑️
                    </button>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
/* ── Sub Components (unchanged) ── */
const SCard=({s,user,saved,toggleSave,onView,onDelete,isFollowing,onFollow,onViewProfile,promoTokens,followerCount,onBid})=>{
  const isOwner=s.writerEmail===user?.email||s.email===user?.email;
  const wEmail=(s.writerEmail||s.email||'').toLowerCase();
  const iF=isFollowing?isFollowing(wEmail):false;
  return(
    <div className="cb-card" style={{...card,position:'relative',overflow:'hidden'}}>
      {/* Parchment paper top strip */}
      <div style={{
        margin:'-16px -16px 12px',padding:'10px 14px',
        background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.1))',
        borderBottom:'1px solid rgba(139,92,246,0.2)',
        display:'flex',alignItems:'center',justifyContent:'space-between',
      }}>
        <span style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'rgba(139,92,246,0.8)',textTransform:'uppercase'}}>✍️ SCREENPLAY</span>
        {promoTokens>0&&<span style={promoTokens===5?goldBadge:silverBadge}>{promoTokens===5?'🥇':'🥈'}</span>}
      </div>

      <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
        <img src={isOwner?(user?.profilePic||'/icon.png'):(s.writerPic||'/icon.png')} alt=""
          style={{...av45,cursor:onViewProfile?'pointer':'default'}}
          onClick={onViewProfile||undefined}/>
        <div style={{marginLeft:10,flex:1}}>
          <strong style={{fontSize:13,cursor:onViewProfile?'pointer':'default',color:onViewProfile?'#a78bfa':'rgba(255,255,255,0.9)'}}
            onClick={onViewProfile||undefined}>{s.writerName}</strong>
          <div style={chip}>{s.genre}</div>
          {followerCount>0&&<div style={{fontSize:10,color:'#f59e0b',fontWeight:700,marginTop:2}}>⭐ {followerCount} followers</div>}
        </div>
        <div style={{display:'flex',gap:4}}>
          {!isOwner&&onFollow&&<button onClick={e=>{withRipple(e,()=>playChime());onFollow();}} className="cb-btn" style={{...followBtn,padding:'4px 10px',fontSize:10,background:iF?'rgba(255,255,255,0.1)':undefined}}>{iF?'✓':'+ Follow'}</button>}
          <button onClick={()=>toggleSave(s.id)} style={iconBtn}>{saved.includes(s.id)?'❤️':'🤍'}</button>
        </div>
      </div>

      {/* Story title — parchment feel */}
      <h4 style={{color:'#a78bfa',margin:'0 0 6px',fontSize:15,fontFamily:'Georgia,serif',letterSpacing:0.3}}>{s.Name}</h4>
      <p style={{color:'rgba(255,255,255,0.55)',fontSize:12,height:36,overflow:'hidden',margin:'0 0 10px',lineHeight:1.5,fontStyle:'italic'}}>{s.logline}</p>

      <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
        {s.isSynopsisLocked&&<span style={lockChip}>🔒 Synopsis</span>}
        {s.isFullStoryLocked&&<span style={lockChip}>🔒 Script</span>}
        {s.isContactLocked&&<span style={lockChip}>🔒 Contact</span>}
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={e=>withRipple(e,()=>{playClick();onView();})} className="cb-btn" style={{...actionBtn,flex:2}}>📖 Read</button>
        {!isOwner&&onViewProfile&&<button onClick={e=>withRipple(e,()=>{playClick();onViewProfile();})} className="cb-btn" style={{...actionBtn,flex:1,background:'linear-gradient(135deg,rgba(99,102,241,0.6),rgba(139,92,246,0.6))'}}>Profile</button>}
        {isOwner&&onBid&&<button onClick={e=>withRipple(e,()=>onBid())} className="cb-btn" style={{...actionBtn,flex:1,background:'linear-gradient(135deg,rgba(245,158,11,0.4),rgba(217,119,6,0.4))'}}>💰</button>}
        {isOwner&&<button onClick={()=>{if(window.confirm("Delete this story?"))onDelete(s.id);}} className="cb-btn" style={{...actionBtn,flex:1,background:'linear-gradient(135deg,rgba(239,68,68,0.4),rgba(220,38,38,0.4))'}}>🗑</button>}
      </div>
    </div>
  );
};

const TCard=({p,user,TABS,getReqStatus,isFollowing,onView,onContact,onFollow,onUnfollow,followerCount})=>{
  const isMe=p.email?.toLowerCase()===user?.email?.toLowerCase();
  const catObj=TABS.find(t=>t.id===p.category);
  const status=getReqStatus(p.email);
  const iF=isFollowing(p.email);
  const name=p.profile?.name||p.name||'Unknown';
  const pic=p.profile?.profilePic||p.profilePic||'/icon.png';
  const addr=(p.profile?.address||p.address||'').split(',')[0];
  return(
    <div style={card}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10,cursor:'pointer'}} onClick={onView}>
        <img src={pic} alt="" style={{...av45,width:50,height:50}}/>
        <div style={{flex:1}}>
          <strong style={{fontSize:15,color:'#2d3436'}}>{name}</strong>
          {addr&&<p style={{margin:'2px 0 0',fontSize:12,color:'#636e72'}}>📍 {addr}</p>}
          {followerCount>0&&<p style={{margin:'2px 0 0',fontSize:11,color:'#fdcb6e',fontWeight:700}}>⭐ {followerCount} follower{followerCount>1?'s':''}</p>}
        </div>
        <span style={{...chip,background:(catObj?.color||'#eee')+'22',color:catObj?.color,fontSize:10}}>{catObj?.label?.split(' ')[0]}</span>
      </div>
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={onView} style={{...actionBtn,flex:1,fontSize:12,padding:7}}>View Profile →</button>
        {!isMe&&(
          <>
            {status===null&&<button onClick={onContact} style={smallReq}>📩</button>}
            {status==='pending'&&<span style={pChip}>⏳</span>}
            {status==='approved'&&<span style={aChip}>✅</span>}
            <button onClick={iF?onUnfollow:onFollow} style={{...followBtn,padding:'6px 10px',fontSize:11,background:iF?'#f1f2f6':'#fdcb6e'}}>{iF?'✓':'+ Follow'}</button>
          </>
        )}
        {isMe&&<span style={{fontSize:11,color:'#b2bec3'}}>You</span>}
      </div>
    </div>
  );
};

const LS=({label,locked,onReq,reqLabel,children,div})=>(
  <div style={{...(div?{borderTop:'1px solid #eee',paddingTop:14,marginTop:14}:{}),marginBottom:14}}>
    <h5 style={{margin:'0 0 8px',fontSize:10,color:'#adb5bd',textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</h5>
    {locked?<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fff',padding:10,borderRadius:8,border:'1px solid #eee'}}>
      <span style={{fontSize:13,color:'#636e72'}}>🔒 Locked</span>
      <button onClick={onReq} style={smallReq}>{reqLabel}</button>
    </div>:children}
  </div>
);

const StoryModal=({modal,note,setNote,onSend,onClose})=>(
  <div style={moOverlay}><div style={moBox}>
    <h3 style={{marginTop:0}}>Request {modal.type==='fullStory'?'Script':modal.type==='synopsis'?'Synopsis':'Contact'} Access</h3>
    <textarea style={ta} placeholder="Send your portfolio link or identity for verification (Required)..."
      value={note} onChange={e=>setNote(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)onSend();}}/>
    <p style={{fontSize:11,color:'#aaa',margin:'-10px 0 10px'}}>Ctrl + Enter to send</p>
    <div style={{display:'flex',gap:10}}>
      <button onClick={onClose} style={cancelB}>Cancel</button>
      <button onClick={onSend} style={confirmB}>Send Request</button>
    </div>
  </div></div>
);

const ContactModal=({talent,msg,setMsg,onSend,onClose})=>(
  <div style={moOverlay}><div style={moBox}>
    <h3 style={{marginTop:0}}>📩 Contact Request</h3>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
      <img src={talent.profile?.profilePic||talent.profilePic||'/icon.png'} alt="" style={{width:44,height:44,borderRadius:'50%',objectFit:'cover'}}/>
      <div>
        <div style={{fontWeight:700}}>{talent.profile?.name||talent.name||'Unknown'}</div>
        <div style={{fontSize:12,color:'#636e72'}}>{talent.profile?.profession||talent.profession||talent.category}</div>
      </div>
    </div>
    <p style={{fontSize:12,color:'#636e72',margin:'0 0 8px'}}>Introduce yourself and state your purpose (Required):</p>
    <textarea style={ta} placeholder="e.g. I'm a Film Director looking to collaborate..."
      value={msg} onChange={e=>setMsg(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)onSend();}}/>
    <p style={{fontSize:11,color:'#aaa',margin:'-10px 0 10px'}}>Ctrl + Enter to send</p>
    <div style={{display:'flex',gap:10}}>
      <button onClick={onClose} style={cancelB}>Cancel</button>
      <button onClick={onSend} style={confirmB}>Send Request</button>
    </div>
  </div></div>
);
const ProtImg=({src,title,height=130,viewerName,viewerEmail})=>{
  const [blob,setBlob]=React.useState(null);
  const [expanded,setExpanded]=React.useState(false);
  React.useEffect(()=>{
    if(!src)return;
    fetch(src).then(r=>r.blob()).then(b=>setBlob(URL.createObjectURL(b))).catch(()=>setBlob(src));
  },[src]);

  return(
    <>
      {/* ── Fullscreen canvas modal ── */}
      {expanded&&(
        <div onClick={()=>setExpanded(false)} onContextMenu={e=>e.preventDefault()}
          style={{position:'fixed',inset:0,zIndex:99999,background:'rgba(0,0,0,0.95)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',backdropFilter:'blur(16px)',padding:20,cursor:'zoom-out',overflowY:'auto'}}>
          <div style={{position:'relative',maxWidth:'80vw'}} onClick={e=>e.stopPropagation()}>
            {/* Canvas/gallery frame */}
            <div style={{
              padding:14,
              background:'linear-gradient(135deg,#4a2c0a,#2d1a06,#4a2c0a)',
              boxShadow:'6px 6px 0 #1a0a00,-3px -3px 0 #8b5e3c,0 0 60px rgba(245,158,11,0.15)',
              borderRadius:6,
            }}>
              <div style={{border:'3px solid #8b5e3c',padding:4,borderRadius:2}}>
                <div style={{border:'1px solid #c4973e',position:'relative'}}>
                  {blob&&<img src={blob} alt={title} draggable={false}
                    style={{maxWidth:'76vw',maxHeight:'72vh',objectFit:'contain',display:'block',pointerEvents:'none'}}/>}
                  <div style={{position:'absolute',inset:0,zIndex:1}} onContextMenu={e=>e.preventDefault()}/>
                  {/* Watermark grid */}
                  <div style={{position:'absolute',inset:0,zIndex:2,display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',overflow:'hidden',pointerEvents:'none',opacity:0.15}}>
                    {Array.from({length:20}).map((_,i)=>(
                      <div key={i} style={{color:'#fff',fontSize:11,fontWeight:700,fontFamily:'monospace',whiteSpace:'nowrap',transform:'rotate(-30deg)',padding:'18px 24px',userSelect:'none'}}>
                        {viewerName||'Viewer'} · {viewerEmail||'creative-bridge.vercel.app'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Gallery label */}
            <div style={{textAlign:'center',marginTop:12,color:'rgba(255,255,255,0.5)',fontSize:12,fontStyle:'italic',letterSpacing:1}}>
              🎨 {title} — Copyright Protected
            </div>
          </div>
          <button onClick={()=>setExpanded(false)}
            style={{marginTop:20,padding:'9px 28px',background:'rgba(139,92,246,0.2)',color:'#fff',border:'1px solid rgba(139,92,246,0.4)',borderRadius:12,cursor:'pointer',fontSize:13,fontWeight:600,backdropFilter:'blur(8px)'}}>
            ✕ Close
          </button>
        </div>
      )}

      {/* ── Thumbnail with wooden frame ── */}
      <div style={{
        padding:8,
        background:'linear-gradient(135deg,#3a1e05,#1f0f00,#3a1e05)',
        boxShadow:'3px 3px 0 #0a0500,-2px -2px 0 #6b4210,0 4px 20px rgba(245,158,11,0.12)',
        borderRadius:4, cursor:'zoom-in', userSelect:'none',
      }} onContextMenu={e=>e.preventDefault()} onClick={()=>setExpanded(true)}>
        <div style={{border:'2px solid #6b4210'}}>
          <div style={{position:'relative'}}>
            {blob
              ?<img src={blob} alt={title} draggable={false} style={{width:'100%',height,objectFit:'contain',pointerEvents:'none',background:'rgba(0,0,0,0.3)',display:'block'}}/>
              :<div style={{height,background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'rgba(255,255,255,0.3)'}}>Loading...</div>
            }
            <div style={{position:'absolute',inset:0,zIndex:1}} onContextMenu={e=>e.preventDefault()}/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.7)',color:'rgba(255,255,255,0.7)',padding:'4px 8px',fontSize:10,zIndex:2,display:'flex',justifyContent:'space-between'}}>
              <span>🔒 {title}</span>
              <span style={{opacity:0.7}}>🔍 Gallery View</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


const Empty=({emoji,text})=>(
  <div style={{
    textAlign:'center',padding:'60px 20px',
    background:'rgba(15,10,40,0.4)',
    backdropFilter:'blur(12px)',
    borderRadius:20,margin:16,
    border:'1px solid rgba(139,92,246,0.15)',
  }}>
    <p style={{fontSize:52,margin:'0 0 12px',animation:'floatUp 3s ease-in-out infinite'}}>{emoji}</p>
    <p style={{fontSize:14,color:'rgba(255,255,255,0.5)'}}>{text}</p>
  </div>
);

// ── Cinematic Entertainment Design System ───────────────────────
// Black + Purple + Deep Blue glassmorphic theme
const G = {
  card:    'rgba(15,12,40,0.75)',
  cardHov: 'rgba(25,18,60,0.85)',
  border:  'rgba(139,92,246,0.18)',
  borderH: 'rgba(139,92,246,0.55)',
  text:    'rgba(255,255,255,0.92)',
  muted:   'rgba(255,255,255,0.5)',
  purple:  '#8b5cf6',
  blue:    '#3b82f6',
  gold:    '#f59e0b',
  teal:    '#06b6d4',
  pink:    '#ec4899',
  red:     '#ef4444',
};

const grid      = {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(275px,1fr))',gap:16,padding:16};
const card      = {
  background: G.card,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  padding:16, borderRadius:20,
  border: `1px solid ${G.border}`,
  boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
  transition:'all 0.25s ease',
};
const av45      = {width:44,height:44,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'2px solid rgba(139,92,246,0.4)'};
const chip      = {display:'inline-block',fontSize:10,color:'rgba(255,255,255,0.7)',background:'rgba(139,92,246,0.2)',padding:'2px 10px',borderRadius:20,marginTop:3,border:'1px solid rgba(139,92,246,0.3)'};
const lockChip  = {fontSize:10,background:'rgba(245,158,11,0.15)',color:'#f59e0b',padding:'2px 10px',borderRadius:20,border:'1px solid rgba(245,158,11,0.3)'};
const iconBtn   = {background:'none',border:'none',cursor:'pointer',fontSize:18,padding:2,transition:'transform 0.15s',filter:'drop-shadow(0 0 4px rgba(245,158,11,0.5))'};
const actionBtn = {
  padding:'9px 14px',
  background:'linear-gradient(135deg,rgba(139,92,246,0.6),rgba(59,130,246,0.6))',
  color:'#fff', border:'1px solid rgba(139,92,246,0.4)',
  borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:12,
  backdropFilter:'blur(8px)', transition:'all 0.2s', letterSpacing:0.3,
};
const followBtn = {
  padding:'7px 14px',
  background:'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(236,72,153,0.25))',
  color:'#f59e0b', border:'1px solid rgba(245,158,11,0.4)',
  borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:11,
  backdropFilter:'blur(8px)', transition:'all 0.2s',
};
const smallReq  = {
  background:'linear-gradient(135deg,rgba(139,92,246,0.5),rgba(59,130,246,0.5))',
  color:'#fff', border:'1px solid rgba(139,92,246,0.4)',
  padding:'5px 12px', borderRadius:10, cursor:'pointer', fontWeight:600, fontSize:11,
  backdropFilter:'blur(8px)',
};
const reqBtn    = {
  padding:'9px 18px',
  background:'linear-gradient(135deg,rgba(139,92,246,0.5),rgba(59,130,246,0.5))',
  color:'#fff', border:'1px solid rgba(139,92,246,0.4)',
  borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:13,
  backdropFilter:'blur(8px)',
};
const pChip     = {background:'rgba(245,158,11,0.15)',color:'#f59e0b',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,border:'1px solid rgba(245,158,11,0.3)'};
const aChip     = {background:'rgba(16,185,129,0.15)',color:'#10b981',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,border:'1px solid rgba(16,185,129,0.3)'};
const dChip     = {background:'rgba(239,68,68,0.15)',color:'#ef4444',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,border:'1px solid rgba(239,68,68,0.3)'};
const secLbl    = {margin:'0 0 12px',fontSize:10,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'2px',fontWeight:700};
const lockedRow = {display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(245,158,11,0.08)',padding:'10px 14px',borderRadius:12,gap:10,flexWrap:'wrap',border:'1px solid rgba(245,158,11,0.2)'};
const backBtn   = {background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontWeight:700,fontSize:14,padding:0,transition:'color 0.2s'};
const linkS     = {color:'#8b5cf6',fontWeight:700,textDecoration:'none',fontSize:14};
const goldBadge = {
  background:'linear-gradient(135deg,#f59e0b,#d97706)',
  color:'#fff', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800,
  boxShadow:'0 2px 10px rgba(245,158,11,0.5)',
};
const silverBadge = {
  background:'linear-gradient(135deg,rgba(148,163,184,0.4),rgba(100,116,139,0.4))',
  color:'rgba(255,255,255,0.8)', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800,
  border:'1px solid rgba(148,163,184,0.3)',
};
const moOverlay = {
  position: 'fixed', top: 0, left: 0,
  width: '100%', height: '100%',
  background: 'rgba(0,0,0,0.82)',
  display: 'flex', justifyContent: 'center',
  alignItems: 'flex-start', zIndex: 9999,
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  overflowY: 'auto', paddingTop: '20px', paddingBottom: '20px',
};
const moBox = {
  background: 'rgba(15,10,40,0.92)',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(139,92,246,0.3)',
  padding: 26, borderRadius: 24,
  width: '90%', maxWidth: 440,
  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
  flexShrink: 0, marginBottom: '10px',
  color: 'rgba(255,255,255,0.9)',
};
const ta=        {width:'100%',height:90,padding:10,borderRadius:12,border:'1px solid rgba(139,92,246,0.3)',marginBottom:14,boxSizing:'border-box',fontSize:13,resize:'none',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.9)'};
const cancelB=   {flex:1,padding:10,borderRadius:12,border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.7)'};
const confirmB=  {flex:1,padding:10,borderRadius:12,border:'none',background:'linear-gradient(135deg,#7c3aed,#2563eb)',color:'#fff',cursor:'pointer',fontWeight:'bold'};
const submitBtn= {width:'100%',padding:13,background:'linear-gradient(135deg,#7c3aed,#2563eb)',color:'#fff',border:'none',borderRadius:14,cursor:'pointer',fontWeight:'bold',fontSize:15};
const submitBtn= {width:'100%',padding:13,background:'#2d3436',color:'#fff',border:'none',borderRadius:12,cursor:'pointer',fontWeight:'bold',fontSize:15};