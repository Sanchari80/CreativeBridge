import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, push, set } from "firebase/database";
import { ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from '../App.jsx';

const TALENT_CFG = {
  Singer:  { folder:'songs',    label:'Song',    icon:'🎤', accept:'audio/*',  hint:'MP3, WAV — max 50MB',  extra:{ name:'genre', ph:'Genre (Folk, Pop, Classical...)' } },
  Painter: { folder:'artworks', label:'Artwork', icon:'🎨', accept:'image/*',  hint:'JPG, PNG — protected',  extra:{ name:'style', ph:'Style (Abstract, Realism...)' } },
  Actor:   { folder:'videos',   label:'Video',   icon:'🎬', accept:'video/*',  hint:'MP4, MOV — max 500MB',  extra:{ name:'type',  ph:'Type (Actor, Anchor, Host...)' } },
  Dancer:  { folder:'videos',   label:'Video',   icon:'💃', accept:'video/*',  hint:'MP4, MOV — max 500MB',  extra:{ name:'style', ph:'Dance Style (Bharatnatyam...)' } },
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
        {isWriter ? <WriterForm closeForm={closeForm} user={user} /> : <TalentForm closeForm={closeForm} user={user} />}
      </div>
    </div>
  );
};

/* ── Writer Form (existing logic, unchanged) ────────────────────────────── */
const WriterForm = ({ closeForm, user }) => {
  const [form, setForm] = useState({
    Name:'', logline:'', synopsis:'', fullStoryFile:'', genre:'Action',
    portfolio:'', contactEmail:'', contactPhone:'',
    isSynopsisLocked:false, isFullStoryLocked:true, isContactLocked:true
  });
  const s_ = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async () => {
    if (!form.Name?.trim()) return alert("Story Name is required!");
    if (!form.logline?.trim()) return alert("Logline is required!");
    if (!form.contactEmail?.trim() && !form.contactPhone?.trim()) return alert("At least Email or Phone is required!");
    try {
      const newRef = push(ref(db,'stories'));
      await set(newRef, {
        ...form,
        writerId: user?.id || Date.now(),
        writerName: user?.name || "Anonymous",
        writerEmail: user?.email,
        writerPic: user?.profilePic || "/icon.png",
        writerProfession: user?.profession || "Writer",
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      });
      alert("Story Published!"); closeForm();
    } catch(e) { alert("Failed: " + e.message); }
  };

  return (
    <div>
      <select style={inp} onChange={e=>s_('genre',e.target.value)} value={form.genre}>
        {['Action','Thriller','Romance','Drama','Comedy','Sci-Fi','Horror','Documentary'].map(g=><option key={g}>{g}</option>)}
      </select>
      <input style={inp} placeholder="Story Title *" onChange={e=>s_('Name',e.target.value)} />
      <input style={inp} placeholder="Logline (short summary) *" onChange={e=>s_('logline',e.target.value)} />

      <div style={secBox}>
        <div style={lockRow}>
          <label style={lbl}>Synopsis</label>
          <label style={lockLbl}><input type="checkbox" checked={form.isSynopsisLocked} onChange={e=>s_('isSynopsisLocked',e.target.checked)} /> {form.isSynopsisLocked?'🔒':'🔓'}</label>
        </div>
        <textarea style={{...inp,height:70,resize:'none'}} placeholder="Brief overview..." onChange={e=>s_('synopsis',e.target.value)} />
      </div>

      <div style={secBox}>
        <div style={lockRow}>
          <label style={lbl}>Full Script Link (Google Drive)</label>
          <label style={lockLbl}><input type="checkbox" checked={form.isFullStoryLocked} onChange={e=>s_('isFullStoryLocked',e.target.checked)} /> {form.isFullStoryLocked?'🔒':'🔓'}</label>
        </div>
        <input style={inp} placeholder="https://drive.google.com/..." onChange={e=>s_('fullStoryFile',e.target.value)} />
      </div>

      <div style={secBox}>
        <div style={lockRow}>
          <label style={lbl}>Contact & Portfolio</label>
          <label style={lockLbl}><input type="checkbox" checked={form.isContactLocked} onChange={e=>s_('isContactLocked',e.target.checked)} /> {form.isContactLocked?'🔒':'🔓'}</label>
        </div>
        <input style={inp} placeholder="Portfolio URL" onChange={e=>s_('portfolio',e.target.value)} />
        <input style={inp} placeholder="Contact Email" onChange={e=>s_('contactEmail',e.target.value)} />
        <input style={inp} placeholder="Phone / WhatsApp" onChange={e=>s_('contactPhone',e.target.value)} />
      </div>

      <button style={submitBtn} onClick={handleSubmit}>🚀 Publish Story</button>
    </div>
  );
};

/* ── Talent Upload Form (Singer / Painter / Actor / Dancer) ─────────────── */
const TalentForm = ({ closeForm, user }) => {
  const cfg = TALENT_CFG[user?.role];
  const [title, setTitle]     = useState('');
  const [extra, setExtra]     = useState('');
  const [file,  setFile]      = useState(null);
  const [prog,  setProg]      = useState(0);
  const [busy,  setBusy]      = useState(false);
  const fileRef = useRef(null);
  const emailKey = user?.email?.replace(/\./g,',');
  const dbPath   = `talents/${user?.role?.toLowerCase()}/${emailKey}`;

  const handleUpload = async () => {
    if (!title.trim()) return alert("Title দিন!");
    if (!file)         return alert("File select করুন!");
    setBusy(true); setProg(0);
    try {
      const path  = `talents/${user.role.toLowerCase()}/${emailKey}/${cfg.folder}/${Date.now()}_${file.name}`;
      const task  = uploadBytesResumable(sRef(storage, path), file);
      task.on('state_changed',
        snap => setProg(Math.round(snap.bytesTransferred/snap.totalBytes*100)),
        err  => { setBusy(false); alert("Upload failed: "+err.message); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await set(ref(db,`${dbPath}/profile`), {
            name: user.name, email: user.email,
            profilePic: user.profilePic||'/icon.png',
            profession: user.profession||user.role,
            address: user.address||'', phone: user.phone||'', bio: user.bio||''
          });
          await push(ref(db,`${dbPath}/${cfg.folder}`), {
            title, fileUrl: url, uploadedAt: Date.now(),
            uploaderEmail: user.email, uploaderName: user.name,
            uploaderPic: user.profilePic||'/icon.png',
            ...(cfg.extra ? { [cfg.extra.name]: extra } : {})
          });
          setBusy(false); closeForm(); alert("Upload successful!");
        }
      );
    } catch(e) { setBusy(false); alert("Error: "+e.message); }
  };

  return (
    <div>
      <input style={inp} placeholder={`${cfg.label} Title *`} value={title} onChange={e=>setTitle(e.target.value)} />
      {cfg.extra && <input style={inp} placeholder={cfg.extra.ph} value={extra} onChange={e=>setExtra(e.target.value)} />}

      <div style={dropZone} onClick={()=>fileRef.current?.click()}>
        {file ? (
          <><span style={{fontSize:24}}>✅</span><p style={{margin:'6px 0 2px',fontWeight:600}}>{file.name}</p><p style={{margin:0,fontSize:12,color:'#636e72'}}>{(file.size/1024/1024).toFixed(2)} MB</p></>
        ) : (
          <><span style={{fontSize:32}}>{cfg.icon}</span><p style={{margin:'8px 0 4px',fontWeight:600}}>Click to choose file</p><p style={{margin:0,fontSize:12,color:'#636e72'}}>{cfg.hint}</p></>
        )}
      </div>
      <input ref={fileRef} type="file" accept={cfg.accept} onChange={e=>setFile(e.target.files[0]||null)} style={{display:'none'}} />

      {user.role==='Painter' && <div style={noticeBox}>🔒 তোমার artwork copyright-protected হবে।</div>}

      {busy && (
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:13,color:'#636e72'}}>Uploading...</span>
            <span style={{fontSize:13,fontWeight:700,color:'#6c5ce7'}}>{prog}%</span>
          </div>
          <div style={{background:'#f1f2f6',borderRadius:8,height:8,overflow:'hidden'}}>
            <div style={{background:'#6c5ce7',height:'100%',width:`${prog}%`,transition:'width 0.3s'}} />
          </div>
        </div>
      )}
      <button style={{...submitBtn, opacity:busy?0.7:1}} disabled={busy} onClick={handleUpload}>
        {busy ? `Uploading... ${prog}%` : '🚀 Publish'}
      </button>
    </div>
  );
};

const overlay   = {position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.8)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:2000,backdropFilter:'blur(5px)'};
const modal     = {background:'#fff',padding:20,borderRadius:20,width:'95%',maxWidth:420,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.3)'};
const closeBtn  = {border:'none',background:'#eee',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:16};
const inp       = {width:'100%',padding:'11px 12px',margin:'0 0 10px',border:'1px solid #eee',borderRadius:10,boxSizing:'border-box',fontSize:14,background:'#f9f9f9'};
const secBox    = {border:'1px solid #f0f0f0',padding:10,borderRadius:12,margin:'8px 0',background:'#fff'};
const lockRow   = {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5};
const lbl       = {fontSize:12,fontWeight:'bold',color:'#666'};
const lockLbl   = {fontSize:10,display:'flex',alignItems:'center',gap:4,cursor:'pointer',color:'#6c5ce7'};
const dropZone  = {border:'2px dashed #dfe6e9',borderRadius:12,padding:22,textAlign:'center',cursor:'pointer',marginBottom:12};
const noticeBox = {background:'#fff9db',border:'1px solid #f9ca24',borderRadius:10,padding:'8px 12px',fontSize:12,color:'#636e72',marginBottom:12};
const submitBtn = {width:'100%',padding:13,background:'#2d3436',color:'#fff',border:'none',borderRadius:12,cursor:'pointer',fontWeight:'bold',fontSize:15,marginTop:8};

export default PostForm;