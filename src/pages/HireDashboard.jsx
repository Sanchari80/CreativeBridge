import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

const CATS = [
  { id: 'all',     label: 'All Talent',           emoji: '⭐', color: '#2d3436' },
  { id: 'saved',   label: 'Saved',                emoji: '❤️', color: '#e84393' },
  { id: 'writer',  label: 'Script Writers',        emoji: '✍️', color: '#4834d4' },
  { id: 'singer',  label: 'Singers',               emoji: '🎤', color: '#00b894' },
  { id: 'painter', label: 'Painters / Designers',  emoji: '🎨', color: '#e17055' },
  { id: 'actor',   label: 'Actors & Anchors',      emoji: '🎬', color: '#f9ca24' },
  { id: 'dancer',  label: 'Dancers',               emoji: '💃', color: '#fd79a8' },
];

// ── Detect Google Drive links and build an embeddable preview URL ──
// (Cloudinary URLs play fine in normal <video>/<audio> tags, but a raw
// Drive "share" link is just an HTML viewer page — it has to be embedded
// via Drive's own /preview endpoint inside an <iframe> instead.)
const isDriveLink = (url) => /drive\.google\.com/.test(url || '');
const driveEmbedUrl = (url) => {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
};

const HireDashboard = () => {
  const { user, stories, sendTalentRequest, talentRequests } = useContext(AppContext);

  const [activeCat, setActiveCat]         = useState('all');
  const [talents, setTalents]             = useState({ singer: [], painter: [], actor: [], dancer: [] });
  const [contactModal, setContactModal]   = useState(null);
  const [message, setMessage]             = useState('');
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');

  // ── Personally saved talents (Hirer-only bookmarking, kept on this device) ──
  const [savedTalents, setSavedTalents] = useState(() => {
    const s = localStorage.getItem('savedTalents');
    return s ? JSON.parse(s) : [];
  });

  const isSaved = (email) => !!email && savedTalents.includes(email.toLowerCase());

  const toggleSaveTalent = (email) => {
    if (!email) return;
    const e = email.toLowerCase();
    const next = savedTalents.includes(e) ? savedTalents.filter(x => x !== e) : [...savedTalents, e];
    setSavedTalents(next);
    localStorage.setItem('savedTalents', JSON.stringify(next));
  };

  // Firebase থেকে singer/painter/actor/dancer fetch
  useEffect(() => {
    const cats = ['singer', 'painter', 'actor', 'dancer'];
    const subs = [];
    cats.forEach(cat => {
      const r = ref(db, `talents/${cat}`);
      const u = onValue(r, snap => {
        const data = snap.val();
        if (data) {
          const list = Object.entries(data).map(([emailKey, profile]) => ({
            ...profile,
            emailKey,
            email: emailKey.replace(/,/g, '.'),
            category: cat,
          }));
          setTalents(prev => ({ ...prev, [cat]: list }));
        } else {
          setTalents(prev => ({ ...prev, [cat]: [] }));
        }
      });
      subs.push(u);
    });
    return () => subs.forEach(u => u());
  }, []);

  // Stories থেকে unique writer profiles
  const writerProfiles = React.useMemo(() => {
    const map = {};
    stories.forEach(s => {
      const key = (s.writerEmail || s.email || '').toLowerCase();
      if (!map[key]) {
        map[key] = {
          email: key,
          emailKey: key.replace(/\./g, ','),
          name: s.writerName || 'Unknown',
          profilePic: s.writerPic || '/icon.png',
          profession: s.writerProfession || 'Writer',
          category: 'writer',
          storyCount: 0,
          genres: [],
        };
      }
      map[key].storyCount++;
      if (s.genre && !map[key].genres.includes(s.genre)) map[key].genres.push(s.genre);
    });
    return Object.values(map);
  }, [stories]);

  const allTalents = [
    ...writerProfiles,
    ...talents.singer,
    ...talents.painter,
    ...talents.actor,
    ...talents.dancer,
  ];

  const filtered = (
    activeCat === 'all'    ? allTalents :
    activeCat === 'saved'  ? allTalents.filter(t => isSaved(t.email)) :
    activeCat === 'writer' ? writerProfiles :
    talents[activeCat] || []
  ).filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.address?.toLowerCase().includes(q) ||
      t.profession?.toLowerCase().includes(q)
    );
  });

  const getReqStatus    = (email) => talentRequests.find(r => r.fromEmail?.toLowerCase() === user?.email?.toLowerCase() && r.talentEmail?.toLowerCase() === email?.toLowerCase())?.status || null;
  const getRevealedContact = (email) => talentRequests.find(r => r.fromEmail?.toLowerCase() === user?.email?.toLowerCase() && r.talentEmail?.toLowerCase() === email?.toLowerCase() && r.status === 'approved')?.revealedContact || null;

  const handleSend = async () => {
    if (!message.trim()) return alert("পরিচয় ও উদ্দেশ্য লিখুন!");
    if (!contactModal) return;
    await sendTalentRequest(contactModal.email, contactModal.name, message);
    setMessage('');
    setContactModal(null);
  };

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────────
  if (selectedTalent) {
    const t       = selectedTalent;
    const catObj  = CATS.find(c => c.id === t.category);
    const status  = getReqStatus(t.email);
    const contact = getRevealedContact(t.email);
    const wStories = t.category === 'writer' ? stories.filter(s => (s.writerEmail || s.email)?.toLowerCase() === t.email?.toLowerCase()) : [];

    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <button onClick={() => setSelectedTalent(null)} style={backBtn}>← Back to Browse</button>

        <div style={profileCard}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <img src={t.profilePic || '/icon.png'} alt="" style={bigAvatar} />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 4px' }}>{t.name}</h2>
              <span style={{ ...catTagStyle, background: catObj?.color + '22', color: catObj?.color }}>{catObj?.emoji} {catObj?.label}</span>
              <p style={metaText}>📍 {t.address || t.city || 'Bangladesh'}</p>
              {t.profession && <p style={metaText}>💼 {t.profession}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <button onClick={() => toggleSaveTalent(t.email)} style={{ ...saveDetailBtn, background: isSaved(t.email) ? '#e84393' : '#fff', color: isSaved(t.email) ? '#fff' : '#e84393', border: `1.5px solid #e84393` }}>
                {isSaved(t.email) ? '❤️ Saved' : '🤍 Save'}
              </button>
              {status === null     && <button onClick={() => setContactModal(t)} style={reqBtn}>📩 Send Contact Request</button>}
              {status === 'pending'   && <div style={pendingBadge}>⏳ Request Pending</div>}
              {status === 'approved'  && <div style={approvedBadge}>✅ Approved</div>}
              {status === 'declined'  && <div style={declinedBadge}>❌ Declined</div>}
            </div>
          </div>

          {t.bio && <p style={bioBox}>{t.bio}</p>}

          {/* Contact Info */}
          <div style={section}>
            <p style={sectionLabel}>Contact Information</p>
            {contact ? (
              <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {contact.email    && <p style={{ margin: 0 }}>📧 {contact.email}</p>}
                {contact.phone    && <p style={{ margin: 0 }}>📞 {contact.phone}</p>}
                {contact.whatsapp && <p style={{ margin: 0 }}>💬 WhatsApp: {contact.whatsapp}</p>}
                {contact.facebook && <p style={{ margin: 0 }}>👤 <a href={contact.facebook} target="_blank" rel="noreferrer" style={{ color: '#4834d4' }}>{contact.facebook}</a></p>}
                {contact.instagram && <p style={{ margin: 0 }}>📸 {contact.instagram}</p>}
              </div>
            ) : (
              <div style={lockedRow}>
                🔒 Contact info locked.
                {status === null    && <button onClick={() => setContactModal(t)} style={smallReqBtn}>Request Access</button>}
                {status === 'pending' && <span style={{ fontSize: '12px', color: '#636e72' }}>Waiting for approval...</span>}
              </div>
            )}
          </div>

          {/* Writer stories */}
          {t.category === 'writer' && wStories.length > 0 && (
            <div style={section}>
              <p style={sectionLabel}>Stories ({wStories.length})</p>
              {wStories.map(s => (
                <div key={s.id} style={miniCard}>
                  <div style={{ fontWeight: '700', color: '#4834d4' }}>{s.Name}</div>
                  <div style={{ fontSize: '12px', color: '#636e72' }}>{s.genre} · {s.logline}</div>
                </div>
              ))}
            </div>
          )}

          {/* Singer songs (audio, video, or Drive link) */}
          {t.category === 'singer' && t.songs && (
            <div style={section}>
              <p style={sectionLabel}>Songs</p>
              {Object.values(t.songs).map((song, i) => {
                const fromDrive = isDriveLink(song.fileUrl);
                return (
                  <div key={i} style={{ ...miniCard, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: '0 0 auto' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{song.title}</div>
                      <div style={{ fontSize: '11px', color: '#636e72' }}>{song.genre}</div>
                    </div>
                    {fromDrive ? (
                      <iframe src={driveEmbedUrl(song.fileUrl)} style={{ flex: 1, height: song.mediaType === 'video' ? 160 : 80, border: 'none', borderRadius: 8, minWidth: 0 }} allow="autoplay" title={song.title} />
                    ) : song.mediaType === 'video' ? (
                      <video controls src={song.fileUrl} style={{ flex: 1, borderRadius: 8, maxHeight: 160, minWidth: 0 }} />
                    ) : (
                      <audio controls src={song.fileUrl} style={{ flex: 1, height: '32px', minWidth: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Painter artworks */}
          {t.category === 'painter' && t.artworks && (
            <div style={section}>
              <p style={sectionLabel}>Artworks 🔒 Protected</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.values(t.artworks).map((art, i) => (
                  <ProtectedImage key={i} src={art.fileUrl} title={art.title} />
                ))}
              </div>
            </div>
          )}

          {/* Actor/Dancer videos (Cloudinary or Drive link) */}
          {(t.category === 'actor' || t.category === 'dancer') && t.videos && (
            <div style={section}>
              <p style={sectionLabel}>{t.category === 'actor' ? 'Videos' : 'Dance Videos'}</p>
              {Object.values(t.videos).map((vid, i) => {
                const fromDrive = isDriveLink(vid.fileUrl);
                return (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '5px', fontSize: '13px' }}>{vid.title}</div>
                    {fromDrive ? (
                      <iframe src={driveEmbedUrl(vid.fileUrl)} style={{ width: '100%', height: '220px', border: 'none', borderRadius: '10px' }} allow="autoplay" title={vid.title} />
                    ) : (
                      <video controls src={vid.fileUrl} style={{ width: '100%', borderRadius: '10px', maxHeight: '220px' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── BROWSE VIEW ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
        {CATS.map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
            padding: '8px 16px', borderRadius: '20px', border: '1px solid',
            cursor: 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap',
            background:   activeCat === cat.id ? '#2d3436' : '#fff',
            color:        activeCat === cat.id ? '#fff'    : '#2d3436',
            borderColor:  activeCat === cat.id ? '#2d3436' : '#eee',
          }}>
            {cat.emoji} {cat.label}{cat.id === 'saved' && savedTalents.length > 0 ? ` (${savedTalents.length})` : ''}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={searchBox}>
        <span>🔍</span>
        <input
          type="text"
          placeholder="Name, city বা profession দিয়ে খুঁজুন..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', background: 'transparent' }}
        />
      </div>

      <p style={{ fontSize: '13px', color: '#636e72', marginBottom: '14px' }}>{filtered.length} talent found</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#b2bec3' }}>
          <p style={{ fontSize: '40px' }}>{activeCat === 'saved' ? '❤️' : '🎭'}</p>
          <p>{activeCat === 'saved' ? "You haven't saved anyone yet." : 'No talent found in this category yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: '14px' }}>
          {filtered.map((t, i) => {
            const catObj = CATS.find(c => c.id === t.category);
            const status = getReqStatus(t.email);
            return (
              <div key={i} style={talentCard} onClick={() => setSelectedTalent(t)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <img src={t.profilePic || '/icon.png'} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: '#636e72' }}>📍 {(t.address || '').split(',')[0] || 'Bangladesh'}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleSaveTalent(t.email); }} style={saveIconBtn} title={isSaved(t.email) ? 'Unsave' : 'Save'}>
                    {isSaved(t.email) ? '❤️' : '🤍'}
                  </button>
                  <span style={{ ...catTagStyle, background: catObj?.color + '22', color: catObj?.color, fontSize: '10px' }}>
                    {catObj?.emoji}
                  </span>
                </div>

                {/* Preview */}
                <div style={{ fontSize: '12px', color: '#636e72', marginBottom: '10px' }}>
                  {t.category === 'writer'  && `📝 ${t.storyCount} stories · ${t.genres?.slice(0,3).join(', ')}`}
                  {t.category === 'singer'  && t.songs   && `🎵 ${Object.keys(t.songs).length} songs uploaded`}
                  {t.category === 'painter' && t.artworks && `🖼 ${Object.keys(t.artworks).length} artworks · 🔒 Protected`}
                  {(t.category === 'actor' || t.category === 'dancer') && t.videos && `🎬 ${Object.keys(t.videos).length} videos`}
                  {t.profession && ` · ${t.profession}`}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {status === 'pending'  && <span style={pendingBadge}>⏳ Pending</span>}
                    {status === 'approved' && <span style={approvedBadge}>✅ Approved</span>}
                    {status === 'declined' && <span style={declinedBadge}>❌ Declined</span>}
                    {!status && (
                      <button onClick={e => { e.stopPropagation(); setContactModal(t); }} style={smallReqBtn}>
                        📩 Contact
                      </button>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setSelectedTalent(t); }} style={viewBtn}>
                    View Profile →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Modal */}
      {contactModal && (
        <div style={modalOverlay} onClick={() => setContactModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>📩 Contact Request</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <img src={contactModal.profilePic || '/icon.png'} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: '700' }}>{contactModal.name}</div>
                <div style={{ fontSize: '12px', color: '#636e72' }}>{contactModal.profession}</div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#636e72', margin: '0 0 8px' }}>আপনার পরিচয় ও উদ্দেশ্য লিখুন (Required):</p>
            <textarea
              style={textarea}
              placeholder="আমি একজন Director/Producer। আপনার সাথে কাজ করতে চাই..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setContactModal(null); setMessage(''); }} style={cancelBtn}>Cancel</button>
              <button onClick={handleSend} style={confirmBtn}>Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Protected Image (Painter artwork) ─────────────────────────────────────────
const ProtectedImage = ({ src, title }) => {
  const [blobUrl, setBlobUrl] = React.useState(null);
  React.useEffect(() => {
    if (!src) return;
    fetch(src)
      .then(r => r.blob())
      .then(blob => setBlobUrl(URL.createObjectURL(blob)))
      .catch(() => setBlobUrl(src));
  }, [src]);

  return (
    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', userSelect: 'none' }}
      onContextMenu={e => e.preventDefault()}>
      {blobUrl
        ? <img src={blobUrl} alt={title} draggable={false} style={{ width: '100%', height: '130px', objectFit: 'cover', pointerEvents: 'none', WebkitUserDrag: 'none' }} />
        : <div style={{ height: '130px', background: '#f1f2f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#aaa' }}>Loading...</div>
      }
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} onContextMenu={e => e.preventDefault()} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '4px 8px', fontSize: '11px', zIndex: 2 }}>
        🔒 {title}
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const backBtn        = { background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginBottom: '14px', display: 'block', padding: 0 };
const profileCard    = { background: 'rgba(255,255,255,0.95)', padding: '25px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.07)' };
const bigAvatar      = { width: '78px', height: '78px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #eee' };
const catTagStyle    = { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' };
const metaText       = { margin: '3px 0 0', fontSize: '13px', color: '#636e72' };
const reqBtn         = { padding: '10px 18px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' };
const bioBox         = { fontSize: '14px', color: '#2d3436', background: '#f8f9fa', padding: '12px', borderRadius: '10px', margin: '0 0 10px' };
const section        = { marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #eee' };
const sectionLabel   = { margin: '0 0 10px', fontSize: '11px', color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.5px' };
const lockedRow      = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '12px', borderRadius: '10px', border: '1px solid #eee', fontSize: '13px', color: '#636e72', gap: '10px', flexWrap: 'wrap' };
const miniCard       = { padding: '10px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '8px' };
const searchBox      = { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.9)', padding: '10px 16px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '12px' };
const talentCard     = { background: 'rgba(255,255,255,0.95)', padding: '16px', borderRadius: '16px', boxShadow: '0 3px 12px rgba(0,0,0,0.06)', cursor: 'pointer', border: '1px solid #f0f0f0', transition: 'transform 0.15s' };
const pendingBadge   = { background: '#fff9db', color: '#f39c12', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' };
const approvedBadge  = { background: '#d4edda', color: '#2ecc71', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' };
const declinedBadge  = { background: '#fdecea', color: '#e74c3c', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' };
const smallReqBtn    = { background: '#6c5ce7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '11px' };
const viewBtn        = { background: 'none', border: 'none', color: '#4834d4', cursor: 'pointer', fontWeight: '700', fontSize: '12px' };
const saveIconBtn    = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '2px', flexShrink: 0 };
const saveDetailBtn  = { padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' };
const modalOverlay   = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' };
const modalBox       = { background: '#fff', padding: '28px', borderRadius: '20px', width: '90%', maxWidth: '400px' };
const textarea       = { width: '100%', height: '100px', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '14px', boxSizing: 'border-box', fontSize: '13px', resize: 'none' };
const cancelBtn      = { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #eee', cursor: 'pointer', background: '#f8f9fa' };
const confirmBtn     = { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#2d3436', color: '#fff', cursor: 'pointer', fontWeight: 'bold' };

export default HireDashboard;