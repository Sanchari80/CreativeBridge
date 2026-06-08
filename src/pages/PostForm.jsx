import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, push, set } from "firebase/database";
import { db } from '../App.jsx';

// ── Cloudinary config ─────────────────────────────────────────
const CLOUD_NAME    = 'danbshghf';
const UPLOAD_PRESET = 'CreativeBridge';

const TALENT_CFG = {
  Singer:  { label:'Song',    icon:'🎤', accept:'audio/*',  maxMB:50,  resourceType:'video', extra:{ name:'genre', ph:'Genre (Folk, Pop, Classical...)' } },
  Painter: { label:'Artwork', icon:'🎨', accept:'image/*',  maxMB:10,  resourceType:'image', extra:{ name:'style', ph:'Style (Abstract, Realism...)' } },
  Actor:   { label:'Video',   icon:'🎬', accept:'video/*',  maxMB:100, resourceType:'video', extra:{ name:'type',  ph:'Type (Actor, Anchor, Host...)' } },
  Dancer:  { label:'Video',   icon:'💃', accept:'video/*',  maxMB:100, resourceType:'video', extra:{ name:'style', ph:'Dance Style (Bharatnatyam...)' } },
};

const PostForm = ({ closeForm }) => {
  const { user } = useContext(AppContext);
  const isWriter = user?.role === 'Writer';
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0 }}>
            {isWriter ? '✍️ Post New Story' : `${TALENT_CFG[user?.role]?.icon} Upload ${TALENT_CFG[user?.role]?.label}`}
          </h3>
          <button onClick={closeForm} style={closeBtn}>✕</button>
        </div>
        {isWriter
          ? <WriterForm closeForm={closeForm} user={user} />
          : <TalentForm closeForm={closeForm} user={user} />}
      </div>
    </div>
  );
};

/* ── Writer Form (unchanged) ─────────────────────────────────── */
const WriterForm = ({ closeForm, user }) => {
  const [form, setForm] = useState({
    Name:'', logline:'', synopsis:'', fullStoryFile:'', genre:'Action',
    portfolio:'', contactEmail:'', contactPhone:'',
    isSynopsisLocked:false, isFullStoryLocked:true, isContactLocked:true
  });
  const s_ = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async () => {
    if (!form.Name?.trim())    return alert("Story title is required!");
    if (!form.logline?.trim()) return alert("Logline is required!");
    if (!form.contactEmail?.trim() && !form.contactPhone?.trim())
      return alert("At least one contact (email or phone) is required!");
    try {
      const newRef = push(ref(db,'stories'));
      await set(newRef, {
        ...form,
        writerId:         user?.id || Date.now(),
        writerName:       user?.name || "Anonymous",
        writerEmail:      user?.email,
        writerPic:        user?.profilePic || "/icon.png",
        writerProfession: user?.profession || "Writer",
        createdAt:        new Date().toISOString(),
        timestamp:        Date.now()
      });
      alert("Story published successfully!"); closeForm();
    } catch(e) { alert("Failed: " + e.message); }
  };

  return (
    <div>
      <select style={inp} onChange={e=>s_('genre',e.target.value)} value={form.genre}>
        {['Action','Thriller','Romance','Drama','Comedy','Sci-Fi','Horror','Documentary'].map(g=>(
          <option key={g}>{g}</option>
        ))}
      </select>
      <input style={inp} placeholder="Story Title *" onChange={e=>s_('Name',e.target.value)} />
      <input style={inp} placeholder="Logline (one-line summary) *" onChange={e=>s_('logline',e.target.value)} />

      <div style={secBox}>
        <div style={lockRow}>
          <label style={lbl}>Synopsis</label>
          <label style={lockLbl}>
            <input type="checkbox" checked={form.isSynopsisLocked} onChange={e=>s_('isSynopsisLocked',e.target.checked)} />
            {form.isSynopsisLocked ? '🔒 Locked' : '🔓 Public'}
          </label>
        </div>
        <textarea style={{...inp,height:70,resize:'none'}} placeholder="Brief story overview..." onChange={e=>s_('synopsis',e.target.value)} />
      </div>

      <div style={secBox}>
        <div style={lockRow}>
          <label style={lbl}>Full Script Link (Google Drive)</label>
          <label style={lockLbl}>
            <input type="checkbox" checked={form.isFullStoryLocked} onChange={e=>s_('isFullStoryLocked',e.target.checked)} />
            {form.isFullStoryLocked ? '🔒 Locked' : '🔓 Public'}
          </label>
        </div>
        <input style={inp} placeholder="https://drive.google.com/..." onChange={e=>s_('fullStoryFile',e.target.value)} />
      </div>

      <div style={secBox}>
        <div style={lockRow}>
          <label style={lbl}>Contact & Portfolio</label>
          <label style={lockLbl}>
            <input type="checkbox" checked={form.isContactLocked} onChange={e=>s_('isContactLocked',e.target.checked)} />
            {form.isContactLocked ? '🔒 Locked' : '🔓 Public'}
          </label>
        </div>
        <input style={inp} placeholder="Portfolio URL" onChange={e=>s_('portfolio',e.target.value)} />
        <input style={inp} placeholder="Contact Email *" onChange={e=>s_('contactEmail',e.target.value)} />
        <input style={inp} placeholder="Phone / WhatsApp" onChange={e=>s_('contactPhone',e.target.value)} />
      </div>

      <button style={submitBtn} onClick={handleSubmit}>🚀 Publish Story</button>
    </div>
  );
};

/* ── Talent Form — Cloudinary direct upload ──────────────────── */
const TalentForm = ({ closeForm, user }) => {
  const cfg     = TALENT_CFG[user?.role];
  const fileRef = useRef(null);

  const [title,    setTitle]    = useState('');
  const [extra,    setExtra]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [file,     setFile]     = useState(null);
  const [prog,     setProg]     = useState(0);
  const [busy,     setBusy]     = useState(false);
  const [uploaded, setUploaded] = useState(null); // Cloudinary URL after upload

  const emailKey = user?.email?.replace(/\./g, ',');
  const dbPath   = `talents/${user?.role?.toLowerCase()}/${emailKey}`;
  const folder   = user?.role === 'Painter' ? 'artworks' : user?.role === 'Singer' ? 'songs' : 'videos';

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const maxBytes = cfg.maxMB * 1024 * 1024;
    if (f.size > maxBytes) {
      alert(`File too large! Maximum size is ${cfg.maxMB} MB.`);
      e.target.value = '';
      return;
    }
    setFile(f);
    setUploaded(null);
    setProg(0);
  };

  // Upload to Cloudinary with progress
  const uploadToCloudinary = () => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file',           file);
    formData.append('upload_preset',  UPLOAD_PRESET);
    formData.append('folder',         'CreativeBridge');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${cfg.resourceType}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProg(Math.round(e.loaded / e.total * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error('Upload failed: ' + xhr.statusText));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Please enter a title!");
    if (!file)         return alert("Please select a file!");

    setBusy(true);
    setProg(0);

    try {
      // Step 1: Upload to Cloudinary
      const cloudUrl = await uploadToCloudinary();
      setUploaded(cloudUrl);

      // Step 2: Save profile to Firebase
      await set(ref(db, `${dbPath}/profile`), {
        name:       user.name,
        email:      user.email,
        profilePic: user.profilePic || '/icon.png',
        profession: user.profession || user.role,
        address:    user.address    || '',
        phone:      user.phone      || '',
        bio:        user.bio        || '',
      });

      // Step 3: Save work to Firebase
      await push(ref(db, `${dbPath}/${folder}`), {
        title,
        fileUrl:       cloudUrl,
        description:   desc,
        uploadedAt:    Date.now(),
        uploaderEmail: user.email,
        uploaderName:  user.name,
        uploaderPic:   user.profilePic || '/icon.png',
        ...(cfg.extra ? { [cfg.extra.name]: extra } : {}),
      });

      setBusy(false);
      alert("Published successfully!");
      closeForm();
    } catch(e) {
      setBusy(false);
      alert("Failed: " + e.message);
    }
  };

  return (
    <div>
      {/* Title */}
      <input
        style={inp}
        placeholder={`${cfg.label} Title *`}
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      {/* Genre / Style / Type */}
      {cfg.extra && (
        <input
          style={inp}
          placeholder={cfg.extra.ph}
          value={extra}
          onChange={e => setExtra(e.target.value)}
        />
      )}

      {/* File picker */}
      <div
        style={{ ...dropZone, borderColor: file ? '#6c5ce7' : '#dfe6e9' }}
        onClick={() => !busy && fileRef.current?.click()}
      >
        {file ? (
          <>
            <span style={{ fontSize:28 }}>
              {user.role==='Singer' ? '🎵' : user.role==='Painter' ? '🖼️' : '🎬'}
            </span>
            <p style={{ margin:'6px 0 2px', fontWeight:700, fontSize:14 }}>{file.name}</p>
            <p style={{ margin:0, fontSize:12, color:'#636e72' }}>
              {(file.size/1024/1024).toFixed(2)} MB
            </p>
          </>
        ) : (
          <>
            <span style={{ fontSize:32 }}>{cfg.icon}</span>
            <p style={{ margin:'8px 0 4px', fontWeight:700, fontSize:14 }}>
              Tap to select file
            </p>
            <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>
              {user.role==='Singer'  ? `MP3, WAV, M4A — max ${cfg.maxMB}MB` :
               user.role==='Painter' ? `JPG, PNG, WEBP — max ${cfg.maxMB}MB` :
               `MP4, MOV — max ${cfg.maxMB}MB`}
            </p>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={cfg.accept}
        onChange={handleFileChange}
        style={{ display:'none' }}
      />

      {/* Description */}
      <textarea
        style={{ ...inp, height:65, resize:'none' }}
        placeholder="Description (optional)"
        value={desc}
        onChange={e => setDesc(e.target.value)}
      />

      {/* Painter copyright notice */}
      {user.role === 'Painter' && (
        <div style={noticeBox}>
          🔒 Your artwork will be copyright-protected on Creative Bridge.
        </div>
      )}

      {/* Upload progress */}
      {busy && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:12, color:'#636e72' }}>
              {prog < 100 ? `Uploading... ${prog}%` : 'Saving...'}
            </span>
            <span style={{ fontSize:12, fontWeight:700, color:'#6c5ce7' }}>{prog}%</span>
          </div>
          <div style={{ background:'#f1f2f6', borderRadius:8, height:8, overflow:'hidden' }}>
            <div style={{
              background: 'linear-gradient(90deg,#6c5ce7,#a29bfe)',
              height:'100%', width:`${prog}%`,
              transition:'width 0.3s', borderRadius:8
            }}/>
          </div>
        </div>
      )}

      <button
        style={{ ...submitBtn, opacity: busy ? 0.7 : 1 }}
        disabled={busy}
        onClick={handleSubmit}
      >
        {busy ? `Uploading... ${prog}%` : `🚀 Publish ${cfg.label}`}
      </button>
    </div>
  );
};

/* ── Styles ──────────────────────────────────────────────────── */
const overlay   = { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000, backdropFilter:'blur(5px)' };
const modal     = { background:'#fff', padding:20, borderRadius:20, width:'95%', maxWidth:440, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 40px rgba(0,0,0,0.3)' };
const closeBtn  = { border:'none', background:'#eee', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16 };
const inp       = { width:'100%', padding:'11px 12px', margin:'0 0 10px', border:'1px solid #eee', borderRadius:10, boxSizing:'border-box', fontSize:14, background:'#f9f9f9' };
const secBox    = { border:'1px solid #f0f0f0', padding:10, borderRadius:12, margin:'8px 0', background:'#fff' };
const lockRow   = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 };
const lbl       = { fontSize:12, fontWeight:'bold', color:'#666' };
const lockLbl   = { fontSize:10, display:'flex', alignItems:'center', gap:4, cursor:'pointer', color:'#6c5ce7' };
const dropZone  = { border:'2px dashed #dfe6e9', borderRadius:12, padding:22, textAlign:'center', cursor:'pointer', marginBottom:10, transition:'border-color 0.2s', background:'#f8f9ff' };
const noticeBox = { background:'#fff9db', border:'1px solid #f9ca24', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#636e72', marginBottom:12 };
const submitBtn = { width:'100%', padding:13, background:'#2d3436', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontWeight:'bold', fontSize:15, marginTop:8 };

export default PostForm;