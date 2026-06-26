import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue, push, set } from "firebase/database";
import { db } from '../App.jsx';

// ── Cloudinary config (same as PostForm.jsx) ────────────────────
const CLOUD_NAME    = 'danbshghf';
const UPLOAD_PRESET = 'CreativeBridge';

const CONFIG = {
  Singer:  { folder: 'songs',    label: 'Songs',    icon: '🎤', accept: 'audio/*,video/*',  resourceType:'video', maxMB:100, hint: 'Audio (MP3, WAV, FLAC) or Video (MP4, MOV) — max 100MB. Bigger video? Paste a Drive link instead.', allowLink:true },
  Painter: { folder: 'artworks', label: 'Artworks', icon: '🎨', accept: 'image/*',          resourceType:'image', maxMB:10,  hint: 'JPG, PNG — সম্পূর্ণ Copyright protected', allowLink:false },
  Actor:   { folder: 'videos',   label: 'Videos',   icon: '🎬', accept: 'video/*',          resourceType:'video', maxMB:100, hint: 'MP4, MOV — max 100MB. Bigger video? Paste a Drive link instead.', allowLink:true },
  Dancer:  { folder: 'videos',   label: 'Videos',   icon: '💃', accept: 'video/*',          resourceType:'video', maxMB:100, hint: 'MP4, MOV — max 100MB. Bigger video? Paste a Drive link instead.', allowLink:true },
};

const EXTRA = {
  Singer:  { name: 'genre', placeholder: 'Genre (Folk, Pop, Classical, Baul...)' },
  Painter: { name: 'style', placeholder: 'Style (Abstract, Realism, Digital Art...)' },
  Actor:   { name: 'type',  placeholder: 'Type (Actor, Anchor, Host, Voiceover...)' },
  Dancer:  { name: 'style', placeholder: 'Dance Style (Bharatnatyam, Hip-hop, Folk...)' },
};

const TalentDashboard = () => {
  const { user, talentRequests, updateTalentRequest, deleteTalentWork } = useContext(AppContext);

  const [tab, setTab]                   = useState('works');
  const [works, setWorks]               = useState([]);
  const [showUpload, setShowUpload]     = useState(false);
  const [form, setForm]                 = useState({ title: '', extra: '' });
  const [file, setFile]                 = useState(null);
  const [progress, setProgress]         = useState(0);
  const [uploading, setUploading]       = useState(false);
  const [copiedId, setCopiedId]         = useState(null);
  const [uploadMode, setUploadMode]     = useState('file');   // ← NEW: 'file' or 'link'
  const [driveLink, setDriveLink]       = useState('');       // ← NEW: drive link input
  const [linkMediaType, setLinkMediaType] = useState('video'); // ← NEW: audio/video choice for link mode (Singer)
  const fileInputRef                    = useRef(null);

  const role     = user?.role;
  const cfg      = CONFIG[role] || {};
  const emailKey = user?.email?.replace(/\./g, ',');
  const dbPath   = `talents/${role?.toLowerCase()}/${emailKey}`;
  const extraCfg = EXTRA[role];

  // Detect whether selected file is audio or video (only relevant for Singer)
  const getMediaType = (f) => {
    if (!f) return null;
    if (f.type?.startsWith('video/')) return 'video';
    if (f.type?.startsWith('audio/')) return 'audio';
    return null;
  };

  // Fetch this talent's works
  useEffect(() => {
    if (!user || !cfg.folder) return;
    const r = ref(db, `${dbPath}/${cfg.folder}`);
    const u = onValue(r, snap => {
      const data = snap.val();
      setWorks(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })).reverse() : []);
    });
    return () => u();
  }, [user, dbPath, cfg.folder]);

  const myRequests   = talentRequests.filter(r => r.ownerPath === emailKey);
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  // ── Build a shareable link for a specific work ──────────────────
  const buildShareLink = (workId) => {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      profile: user.email,
      role:    role,
      work:    workId,
    });
    return `${base}?${params.toString()}`;
  };

  const handleCopyLink = async (workId) => {
    const link = buildShareLink(workId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(workId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      // Fallback for browsers without clipboard API permission
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(workId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ── Upload selected file to Cloudinary with progress ────────────
  const uploadToCloudinary = () => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file',          file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder',        'CreativeBridge');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${cfg.resourceType}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
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

  const handleUpload = async () => {
    if (!form.title.trim()) return alert("Title দিন!");

    if (uploadMode === 'file') {
      if (!file) return alert("File select করুন!");
    } else {
      if (!driveLink.trim()) return alert("Drive link দিন!");
      if (!driveLink.trim().startsWith('http')) return alert("সঠিক link দিন (http দিয়ে শুরু হতে হবে)!");
    }

    setUploading(true);
    setProgress(0);

    try {
      let finalUrl;
      let mediaType;

      if (uploadMode === 'file') {
        finalUrl = await uploadToCloudinary();
        mediaType = role === 'Singer' ? (getMediaType(file) || 'audio') : undefined;
      } else {
        finalUrl = driveLink.trim();
        mediaType = role === 'Singer' ? linkMediaType : undefined;
        setProgress(100);
      }

      // Profile info save (first upload বা update)
      await set(ref(db, `${dbPath}/profile`), {
        name:       user.name,
        email:      user.email,
        profilePic: user.profilePic || '/icon.png',
        profession: user.profession || role,
        address:    user.address    || '',
        phone:      user.phone      || '',
        bio:        user.bio        || '',
      });

      // Work metadata save
      await push(ref(db, `${dbPath}/${cfg.folder}`), {
        title:       form.title,
        fileUrl:     finalUrl,
        uploadedAt:  Date.now(),
        ...(mediaType ? { mediaType } : {}),
        ...(extraCfg ? { [extraCfg.name]: form.extra } : {}),
      });

      setUploading(false);
      setProgress(0);
      setFile(null);
      setDriveLink('');
      setForm({ title: '', extra: '' });
      setShowUpload(false);
      setUploadMode('file');
      alert("Upload successful!");
    } catch (e) {
      setUploading(false);
      alert("Error: " + e.message);
    }
  };

  const singularLabel = role === 'Painter' ? 'Artwork' : role === 'Singer' ? 'Song' : 'Video';

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2d3436' }}>{cfg.icon} My {cfg.label}</h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#636e72' }}>{user.name} · {user.profession || role}</p>
        </div>
        <button onClick={() => setShowUpload(v => !v)} style={uploadBtn}>
          {showUpload ? '✕ Cancel' : `+ Upload ${singularLabel}`}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#f1f2f6', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
        {[
          { key: 'works',    label: `${cfg.icon} My ${cfg.label} (${works.length})` },
          { key: 'requests', label: `📩 Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px', transition: 'all 0.2s',
            background: tab === t.key ? '#fff' : 'transparent',
            boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Upload Form ── */}
      {showUpload && (
        <div style={uploadCard}>
          <h4 style={{ margin: '0 0 15px', color: '#2d3436' }}>Upload New {singularLabel}</h4>

          <input
            placeholder={`${singularLabel} Title *`}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={inp}
          />

          {extraCfg && (
            <input
              placeholder={extraCfg.placeholder}
              value={form.extra}
              onChange={e => setForm(f => ({ ...f, extra: e.target.value }))}
              style={inp}
            />
          )}

          {/* Mode toggle: File upload vs Drive Link (not shown for Painter) */}
          {cfg.allowLink && (
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <button
                onClick={() => setUploadMode('file')}
                style={{ ...modeBtn, ...(uploadMode==='file' ? modeBtnActive : {}) }}
              >
                📤 Upload File
              </button>
              <button
                onClick={() => setUploadMode('link')}
                style={{ ...modeBtn, ...(uploadMode==='link' ? modeBtnActive : {}) }}
              >
                🔗 Paste Drive Link
              </button>
            </div>
          )}

          {/* ── FILE MODE ── */}
          {uploadMode === 'file' && (
            <>
              <div style={dropZone} onClick={() => fileInputRef.current?.click()}>
                {file ? (
                  <>
                    <span style={{ fontSize: '24px' }}>✅</span>
                    <p style={{ margin: '6px 0 2px', fontWeight: '600', fontSize: '14px' }}>{file.name}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#636e72' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '32px' }}>{role === 'Singer' ? '🎵' : role === 'Painter' ? '🖼' : '🎬'}</span>
                    <p style={{ margin: '8px 0 4px', fontWeight: '600', fontSize: '14px' }}>Click to choose file</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#636e72' }}>{cfg.hint}</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={cfg.accept}
                onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  const maxBytes = (cfg.maxMB || 50) * 1024 * 1024;
                  if (f.size > maxBytes) {
                    alert(`File too large! Maximum size is ${cfg.maxMB}MB. Use "Paste Drive Link" instead for bigger files.`);
                    e.target.value = '';
                    return;
                  }
                  setFile(f);
                }}
                style={{ display: 'none' }}
              />
            </>
          )}

          {/* ── LINK MODE ── */}
          {uploadMode === 'link' && (
            <div style={linkBox}>
              <p style={linkLabel}>🔗 Paste your Google Drive (or any) link *</p>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={driveLink}
                onChange={e => setDriveLink(e.target.value)}
                style={inp}
              />
              <p style={linkHint}>
                Upload your video to Google Drive → Share → "Anyone with the link" → paste the link here.
              </p>

              {role === 'Singer' && (
                <div style={{ marginTop:8 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#636e72', margin:'0 0 6px' }}>This link is:</p>
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      onClick={() => setLinkMediaType('audio')}
                      style={{ ...modeBtn, flex:1, ...(linkMediaType==='audio' ? modeBtnActive : {}) }}
                    >
                      🎵 Audio
                    </button>
                    <button
                      onClick={() => setLinkMediaType('video')}
                      style={{ ...modeBtn, flex:1, ...(linkMediaType==='video' ? modeBtnActive : {}) }}
                    >
                      🎬 Video
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {role === 'Painter' && (
            <div style={noticeBox}>
              🔒 তোমার artwork টি copyright-protected হবে। কেউ download বা screenshot করতে পারবে না।
            </div>
          )}

          {uploading && uploadMode === 'file' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '13px', color: '#636e72' }}>Uploading...</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#6c5ce7' }}>{progress}%</span>
              </div>
              <div style={{ background: '#f1f2f6', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#6c5ce7', height: '100%', width: `${progress}%`, borderRadius: '10px', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          <button onClick={handleUpload} disabled={uploading} style={{ ...uploadBtn, width: '100%', padding: '13px', opacity: uploading ? 0.7 : 1 }}>
            {uploading ? (uploadMode==='file' ? `Uploading... ${progress}%` : 'Saving...') : '🚀 Publish'}
          </button>
        </div>
      )}

      {/* ── Works Tab ── */}
      {tab === 'works' && (
        works.length === 0 ? (
          <div style={emptyBox}>
            <p style={{ fontSize: '40px', margin: 0 }}>{cfg.icon}</p>
            <p style={{ color: '#b2bec3' }}>এখনো কোনো {cfg.label.toLowerCase()} upload করা হয়নি।</p>
            <button onClick={() => setShowUpload(true)} style={uploadBtn}>+ Upload করুন</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {works.map(work => (
              <div key={work.id} style={workCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '3px' }}>{work.title}</div>
                    <div style={{ fontSize: '12px', color: '#636e72' }}>
                      {work.genre || work.style || work.type || ''}{' '}
                      {work.uploadedAt ? '· ' + new Date(work.uploadedAt).toLocaleDateString('bn-BD') : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => handleCopyLink(work.id)} style={copyBtn} title="Copy shareable link">
                      {copiedId === work.id ? '✅ Copied' : '🔗 Copy Link'}
                    </button>
                    <button onClick={() => deleteTalentWork(role, emailKey, work.id)} style={delBtn}>🗑</button>
                  </div>
                </div>

                {role === 'Singer' && work.fileUrl && (
                  work.mediaType === 'video' ? (
                    <video controls src={work.fileUrl} style={{ width: '100%', borderRadius: '10px', marginTop: '10px', maxHeight: '200px' }} />
                  ) : (
                    <audio controls src={work.fileUrl} style={{ width: '100%', marginTop: '10px', height: '36px' }} />
                  )
                )}

                {role === 'Painter' && work.fileUrl && (
                  <div style={{ marginTop: '10px', position: 'relative', userSelect: 'none' }} onContextMenu={e => e.preventDefault()}>
                    <img src={work.fileUrl} alt={work.title} draggable={false} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} onContextMenu={e => e.preventDefault()} />
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', zIndex: 2 }}>🔒 Protected</div>
                  </div>
                )}

                {(role === 'Actor' || role === 'Dancer') && work.fileUrl && (
                  <video controls src={work.fileUrl} style={{ width: '100%', borderRadius: '10px', marginTop: '10px', maxHeight: '200px' }} />
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Requests Tab ── */}
      {tab === 'requests' && (
        myRequests.length === 0 ? (
          <div style={emptyBox}>
            <p style={{ fontSize: '40px', margin: 0 }}>📭</p>
            <p style={{ color: '#b2bec3' }}>এখনো কোনো contact request আসেনি।</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...myRequests].reverse().map(req => (
              <div key={req.firebaseKey} style={{
                ...reqCard,
                borderLeft: `4px solid ${req.status === 'approved' ? '#2ecc71' : req.status === 'declined' ? '#e74c3c' : '#f9ca24'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <img src={req.fromPic || '/icon.png'} alt="" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{req.fromName}</div>
                    <div style={{ fontSize: '12px', color: '#636e72' }}>{req.fromProfession}</div>
                  </div>
                  <span style={{
                    padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: req.status === 'approved' ? '#d4edda' : req.status === 'declined' ? '#fdecea' : '#fff9db',
                    color:      req.status === 'approved' ? '#2ecc71' : req.status === 'declined' ? '#e74c3c' : '#f39c12',
                  }}>
                    {req.status === 'approved' ? '✅ Approved' : req.status === 'declined' ? '❌ Declined' : '⏳ Pending'}
                  </span>
                </div>

                {req.message && (
                  <div style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', color: '#2d3436', marginBottom: '10px', fontStyle: 'italic' }}>
                    "{req.message}"
                  </div>
                )}

                {req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => updateTalentRequest(req, 'approved')} style={greenBtn}>
                      ✅ Accept — Contact Info শেয়ার করো
                    </button>
                    <button onClick={() => updateTalentRequest(req, 'declined')} style={redBtn}>
                      ❌ Decline
                    </button>
                  </div>
                )}

                {req.status === 'approved' && (
                  <p style={{ fontSize: '12px', color: '#2ecc71', margin: 0 }}>✅ তোমার contact info শেয়ার হয়ে গেছে।</p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

const uploadBtn  = { padding: '10px 20px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' };
const uploadCard = { background: 'rgba(255,255,255,0.95)', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', marginBottom: '20px', border: '1px solid #f0f0f0' };
const inp        = { width: '100%', padding: '12px', margin: '0 0 12px', border: '1px solid #eee', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', background: '#f9f9f9' };
const dropZone   = { border: '2px dashed #dfe6e9', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' };
const noticeBox  = { background: '#fff9db', border: '1px solid #f9ca24', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#636e72', marginBottom: '12px' };
const emptyBox   = { textAlign: 'center', padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' };
const workCard   = { background: 'rgba(255,255,255,0.95)', padding: '16px', borderRadius: '14px', boxShadow: '0 3px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' };
const reqCard    = { background: 'rgba(255,255,255,0.95)', padding: '16px', borderRadius: '14px', boxShadow: '0 3px 12px rgba(0,0,0,0.06)' };
const delBtn     = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', flexShrink: 0 };
const copyBtn    = { background: '#f0f0ff', color: '#6c5ce7', border: '1px solid #d4d0ff', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap' };
const greenBtn   = { flex: 1, padding: '9px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' };
const redBtn     = { flex: 1, padding: '9px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' };
const modeBtn       = { flex:1, padding:'9px 12px', border:'1.5px solid #eee', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:12, background:'#f8f9fa', color:'#636e72' };
const modeBtnActive = { background:'#2d3436', color:'#fff', border:'1.5px solid #2d3436' };
const linkBox    = { border:'2px dashed #dfe6e9', borderRadius:12, padding:14, marginBottom:12, background:'#f8f9ff' };
const linkLabel  = { fontSize:12, fontWeight:700, color:'#6c5ce7', margin:'0 0 8px' };
const linkHint   = { fontSize:11, color:'#94a3b8', margin:'6px 0 0', lineHeight:1.5 };

export default TalentDashboard;