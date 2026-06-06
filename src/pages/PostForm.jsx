import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, push, set } from "firebase/database";
import { db } from '../App.jsx';

const TALENT_CFG = {
  Singer:  { label:'Song',    icon:'🎤', extra:{ name:'genre', ph:'Genre (Folk, Pop, Classical...)' },    linkPh:'YouTube / Google Drive link (e.g. https://youtu.be/...)' },
  Painter: { label:'Artwork', icon:'🎨', extra:{ name:'style', ph:'Style (Abstract, Realism...)' },      linkPh:'Google Drive image link (e.g. https://drive.google.com/...)' },
  Actor:   { label:'Video',   icon:'🎬', extra:{ name:'type',  ph:'Type (Actor, Anchor, Host...)' },     linkPh:'YouTube / Google Drive video link' },
  Dancer:  { label:'Video',   icon:'💃', extra:{ name:'style', ph:'Dance Style (Bharatnatyam...)' },     linkPh:'YouTube / Google Drive video link' },
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

/* ── Writer Form ─────────────────────────────────────────────── */
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
        writerId:        user?.id || Date.now(),
        writerName:      user?.name || "Anonymous",
        writerEmail:     user?.email,
        writerPic:       user?.profilePic || "/icon.png",
        writerProfession:user?.profession || "Writer",
        createdAt:       new Date().toISOString(),
        timestamp:       Date.now()
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

/* ── Talent Form — Link based (no file upload) ───────────────── */
const TalentForm = ({ closeForm, user }) => {
  const cfg      = TALENT_CFG[user?.role];
  const [title,  setTitle]  = useState('');
  const [extra,  setExtra]  = useState('');
  const [link,   setLink]   = useState('');
  const [desc,   setDesc]   = useState('');
  const [busy,   setBusy]   = useState(false);

  const emailKey = user?.email?.replace(/\./g, ',');
  const dbPath   = `talents/${user?.role?.toLowerCase()}/${emailKey}`;
  const folder   = user?.role === 'Painter' ? 'artworks' : user?.role === 'Singer' ? 'songs' : 'videos';

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Please enter a title!");
    if (!link.trim())  return alert("Please enter a link!");
    if (!link.startsWith('http')) return alert("Please enter a valid URL starting with https://");

    setBusy(true);
    try {
      // Save profile node
      await set(ref(db, `${dbPath}/profile`), {
        name:       user.name,
        email:      user.email,
        profilePic: user.profilePic || '/icon.png',
        profession: user.profession || user.role,
        address:    user.address    || '',
        phone:      user.phone      || '',
        bio:        user.bio        || '',
      });

      // Save work
      await push(ref(db, `${dbPath}/${folder}`), {
        title,
        fileUrl:       link,
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

      {/* Link input */}
      <div style={linkBox}>
        <p style={linkLabel}>🔗 Paste your link *</p>
        <input
          style={inp}
          placeholder={cfg.linkPh}
          value={link}
          onChange={e => setLink(e.target.value)}
        />
        <p style={linkHint}>
          {user.role === 'Singer'
            ? 'Upload your song to YouTube or Google Drive, then paste the link here.'
            : user.role === 'Painter'
            ? 'Upload your artwork to Google Drive, set sharing to "Anyone with link", then paste here.'
            : 'Upload your video to YouTube or Google Drive, then paste the link here.'}
        </p>
      </div>

      {/* Description */}
      <textarea
        style={{...inp, height:70, resize:'none'}}
        placeholder="Description (optional)"
        value={desc}
        onChange={e => setDesc(e.target.value)}
      />

      {/* Painter notice */}
      {user.role === 'Painter' && (
        <div style={noticeBox}>
          🔒 Your artwork link will be copyright-protected on Creative Bridge. Use Google Drive with restricted sharing for extra protection.
        </div>
      )}

      <button style={{...submitBtn, opacity: busy ? 0.7 : 1}} disabled={busy} onClick={handleSubmit}>
        {busy ? 'Publishing...' : '🚀 Publish'}
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
const linkBox   = { border:'2px dashed #dfe6e9', borderRadius:12, padding:14, marginBottom:12, background:'#f8f9ff' };
const linkLabel = { fontSize:12, fontWeight:700, color:'#6c5ce7', margin:'0 0 8px' };
const linkHint  = { fontSize:11, color:'#94a3b8', margin:'6px 0 0', lineHeight:1.5 };
const noticeBox = { background:'#fff9db', border:'1px solid #f9ca24', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#636e72', marginBottom:12 };
const submitBtn = { width:'100%', padding:13, background:'#2d3436', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontWeight:'bold', fontSize:15, marginTop:8 };

export default PostForm;