import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, update, onValue } from "firebase/database";
import { db } from '../App.jsx';

const TALENT_ROLES = ['Singer', 'Painter', 'Actor', 'Dancer'];

const ProfilePage = ({ onBack }) => {
  const { user, setUser, stories, setStories, requests, talentRequests } = useContext(AppContext);

  const [editing, setEditing]   = useState(false);
  const [works, setWorks]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    name:       user?.name       || '',
    profession: user?.profession || '',
    address:    user?.address    || '',
    portfolio:  user?.portfolio  || '',
    bio:        user?.bio        || '',
    phone:      user?.phone      || '',
    whatsapp:   user?.whatsapp   || '',
    facebook:   user?.facebook   || '',
    instagram:  user?.instagram  || '',
  });

  const isWriter = user?.role === 'Writer';
  const isTalent = TALENT_ROLES.includes(user?.role);
  const emailKey = user?.email?.replace(/\./g, ',');

  const set_ = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Fetch this talent's own uploaded works
  useEffect(() => {
    if (!isTalent) return;
    const folderMap = { Singer: 'songs', Painter: 'artworks', Actor: 'videos', Dancer: 'videos' };
    const folder    = folderMap[user.role];
    const r = ref(db, `talents/${user.role.toLowerCase()}/${emailKey}/${folder}`);
    const u = onValue(r, snap => {
      const data = snap.val();
      setWorks(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })).reverse() : []);
    });
    return () => u();
  }, [user?.role, emailKey, isTalent]);

  // ── Profile picture update ──────────────────────────────────────────────────
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const newPhoto = reader.result;
      try {
        // 1. User node update
        await update(ref(db, `users/${emailKey}`), { profilePic: newPhoto });

        // 2. Stories writerPic update
        if (stories?.length > 0) {
          await Promise.all(
            stories
              .filter(s => s.writerEmail === user.email)
              .map(s => update(ref(db, `stories/${s.id}`), { writerPic: newPhoto }))
          );
          setStories(prev => prev.map(s =>
            s.writerEmail === user.email ? { ...s, writerPic: newPhoto } : s
          ));
        }

        // 3. Story requests pic update
        if (requests?.length > 0) {
          await Promise.all(requests.map(r => {
            if (r.fromEmail === user.email)
              return update(ref(db, `requests/${r.ownerPath}/${r.firebaseKey}`), { fromPic: newPhoto });
            if (r.ownerPath?.replace(/,/g, '.') === user.email.toLowerCase())
              return update(ref(db, `requests/${r.ownerPath}/${r.firebaseKey}`), { writerPic: newPhoto });
            return null;
          }).filter(Boolean));
        }

        // 4. Talent requests pic update
        if (talentRequests?.length > 0) {
          await Promise.all(talentRequests.map(r => {
            if (r.fromEmail === user.email)
              return update(ref(db, `talentRequests/${r.ownerPath}/${r.firebaseKey}`), { fromPic: newPhoto });
            if (r.ownerPath === emailKey)
              return update(ref(db, `talentRequests/${r.ownerPath}/${r.firebaseKey}`), { talentPic: newPhoto });
            return null;
          }).filter(Boolean));
        }

        // 5. Talent profile node update
        if (isTalent) {
          await update(ref(db, `talents/${user.role.toLowerCase()}/${emailKey}/profile`), { profilePic: newPhoto });
        }

        const updated = { ...user, profilePic: newPhoto };
        setUser(updated);
        localStorage.setItem('activeUser', JSON.stringify(updated));
        alert("Profile Picture Updated!");
      } catch (err) {
        alert("Failed: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Save profile info ───────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(db, `users/${emailKey}`), form);

      // Talent profile node ও update
      if (isTalent) {
        await update(ref(db, `talents/${user.role.toLowerCase()}/${emailKey}/profile`), {
          name:       form.name,
          profession: form.profession,
          address:    form.address,
          bio:        form.bio,
          profilePic: user.profilePic || '/icon.png',
          email:      user.email,
        });
      }

      const updated = { ...user, ...form };
      setUser(updated);
      localStorage.setItem('activeUser', JSON.stringify(updated));
      setEditing(false);
      alert("Profile Updated Successfully!");
    } catch (err) {
      alert("Save failed: " + err.message);
    }
    setSaving(false);
  };

  const myStories = stories.filter(s =>
    s.writerEmail === user?.email || s.email === user?.email
  );

  const roleEmoji = {
    Writer: '✍️', Singer: '🎤', Painter: '🎨',
    Actor: '🎬', Dancer: '💃', Hirer: '🔍', 'Looking for new stories': '🔍'
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: '600px', marginBottom: '10px' }}>
        <button onClick={onBack} style={backBtn}>← Back to Dashboard</button>
      </div>

      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Basic Info Card ── */}
        <div style={card}>
          <CardHeader title="Basic Info" onEdit={() => setEditing(!editing)} editing={editing} />

          {/* Profile Picture */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={imgWrapper}>
              <img src={user?.profilePic || '/icon.png'} alt="Profile" style={imgStyle} />
              <label htmlFor="photo-upload" style={camBtn} title="Update Photo">📷</label>
              <input id="photo-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#b2bec3' }}>📷 icon এ click করে photo update করুন</p>
          </div>

          {editing ? (
            <div>
              <F label="Full Name *">
                <input style={inp} value={form.name} onChange={e => set_('name', e.target.value)} placeholder="Your full name" />
              </F>
              <F label="Profession / Expertise">
                <input style={inp} value={form.profession} onChange={e => set_('profession', e.target.value)} placeholder="e.g. Film Director, Singer, Graphic Designer" />
              </F>
              <F label="Full Address">
                <input style={inp} value={form.address} onChange={e => set_('address', e.target.value)} placeholder="Road, Area, District, Division" />
              </F>
              <F label="Portfolio / Website Link">
                <input style={inp} value={form.portfolio} onChange={e => set_('portfolio', e.target.value)} placeholder="https://your-portfolio.com" />
              </F>
              <F label="Bio / About">
                <textarea style={{ ...inp, height: '80px', resize: 'none' }} value={form.bio} onChange={e => set_('bio', e.target.value)} placeholder="নিজের সম্পর্কে কিছু লিখুন..." />
              </F>
              <SaveBtn onClick={handleSave} saving={saving} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <IR icon={roleEmoji[user?.role] || '👤'} label="Role"       value={user?.role}       color="#6c5ce7" />
              <IR icon="👤"                             label="Name"       value={user?.name} />
              <IR icon="🛠"                             label="Profession" value={user?.profession} />
              <IR icon="📍"                             label="Address"    value={user?.address} />
              <IR icon="📧"                             label="Email"      value={user?.email} />
              {user?.portfolio && (
                <div style={iRow}>
                  <span>🌐</span>
                  <div>
                    <div style={iLabel}>Portfolio</div>
                    
                      href={user.portfolio.startsWith('http') ? user.portfolio : `https://${user.portfolio}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: '14px', color: '#6c5ce7' }}
                    <a>{user.portfolio}</a>
                  </div>
                </div>
              )}
              {user?.bio && <IR icon="📝" label="Bio" value={user.bio} />}
            </div>
          )}
        </div>

        {/* ── Contact Info Card ── */}
        <div style={card}>
          <CardHeader title="🔒 Contact Info" onEdit={() => setEditing(!editing)} editing={editing} />

          <div style={noticeBox}>
            ℹ️ এই তথ্য শুধুমাত্র approved hirer দের কাছে reveal হবে — অন্য কেউ দেখতে পাবে না।
          </div>

          {editing ? (
            <div>
              <F label="Phone Number">
                <input style={inp} value={form.phone}     onChange={e => set_('phone', e.target.value)}     placeholder="+880 1X XX XXX XXX" />
              </F>
              <F label="WhatsApp">
                <input style={inp} value={form.whatsapp}  onChange={e => set_('whatsapp', e.target.value)}  placeholder="+880 1X XX XXX XXX" />
              </F>
              <F label="Facebook Profile Link">
                <input style={inp} value={form.facebook}  onChange={e => set_('facebook', e.target.value)}  placeholder="facebook.com/yourprofile" />
              </F>
              <F label="Instagram">
                <input style={inp} value={form.instagram} onChange={e => set_('instagram', e.target.value)} placeholder="@yourusername" />
              </F>
              <SaveBtn onClick={handleSave} saving={saving} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <IR icon="📞" label="Phone"     value={user?.phone     || '—'} />
              <IR icon="💬" label="WhatsApp"  value={user?.whatsapp  || '—'} />
              <IR icon="👤" label="Facebook"  value={user?.facebook  || '—'} />
              <IR icon="📸" label="Instagram" value={user?.instagram || '—'} />
            </div>
          )}
        </div>

        {/* ── Writer: My Stories ── */}
        {isWriter && (
          <div style={card}>
            <h3 style={cardTitle}>✍️ My Stories ({myStories.length})</h3>
            {myStories.length === 0 ? (
              <p style={emptyText}>এখনো কোনো story post করা হয়নি।</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myStories.map(s => (
                  <div key={s.id} style={workRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: '#4834d4', fontSize: '14px' }}>{s.Name}</div>
                      <div style={{ fontSize: '12px', color: '#636e72' }}>
                        {s.genre} · {s.logline?.slice(0, 55)}{s.logline?.length > 55 ? '...' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {s.isSynopsisLocked  && <span style={lockTag}>🔒 Synopsis</span>}
                      {s.isFullStoryLocked && <span style={lockTag}>🔒 Script</span>}
                      {s.isContactLocked   && <span style={lockTag}>🔒 Contact</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Talent: My Works ── */}
        {isTalent && (
          <div style={card}>
            <h3 style={cardTitle}>
              {user.role === 'Singer' ? '🎤 My Songs' : user.role === 'Painter' ? '🎨 My Artworks' : '🎬 My Videos'}
              {' '}({works.length})
            </h3>
            {works.length === 0 ? (
              <p style={emptyText}>এখনো কোনো কাজ upload করা হয়নি। "My Work" এ গিয়ে upload করুন।</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {works.map(w => (
                  <div key={w.id} style={workRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{w.title}</div>
                      <div style={{ fontSize: '12px', color: '#636e72' }}>{w.genre || w.style || w.type || ''}</div>
                    </div>
                    {/* Singer: mini audio player */}
                    {user.role === 'Singer' && w.fileUrl && (
                      <audio controls src={w.fileUrl} style={{ height: '28px', maxWidth: '180px', flex: 1 }} />
                    )}
                    {/* Painter: protected badge */}
                    {user.role === 'Painter' && (
                      <span style={{ fontSize: '11px', color: '#e17055', background: '#FAECE7', padding: '3px 8px', borderRadius: '8px' }}>🔒 Protected</span>
                    )}
                    {/* Actor/Dancer: video badge */}
                    {(user.role === 'Actor' || user.role === 'Dancer') && (
                      <span style={{ fontSize: '11px', color: '#636e72', background: '#f1f2f6', padding: '3px 8px', borderRadius: '8px' }}>🎬 Video</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// ── Tiny sub-components ───────────────────────────────────────────────────────
const CardHeader = ({ title, onEdit, editing }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
    <h3 style={{ margin: 0, fontSize: '16px', color: '#2d3436' }}>{title}</h3>
    <button onClick={onEdit} style={{ padding: '5px 14px', background: '#f1f2f6', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
      {editing ? '✕ Cancel' : '✏️ Edit'}
    </button>
  </div>
);

const F = ({ label, children }) => (
  <div style={{ marginBottom: '12px' }}>
    <label style={{ fontSize: '11px', color: '#636e72', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{label}</label>
    {children}
  </div>
);

const IR = ({ icon, label, value, color }) => (
  <div style={iRow}>
    <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
    <div>
      <div style={iLabel}>{label}</div>
      <div style={{ fontSize: '14px', color: color || '#2d3436', fontWeight: color ? '700' : '400' }}>{value || '—'}</div>
    </div>
  </div>
);

const SaveBtn = ({ onClick, saving }) => (
  <button onClick={onClick} disabled={saving} style={{ width: '100%', padding: '12px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', marginTop: '8px', opacity: saving ? 0.7 : 1 }}>
    {saving ? 'Saving...' : '💾 Save Changes'}
  </button>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const containerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' };
const backBtn        = { background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: 0 };
const card           = { background: 'rgba(255,255,255,0.95)', padding: '22px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.07)', width: '100%', maxWidth: '600px', boxSizing: 'border-box' };
const cardTitle      = { margin: '0 0 14px', fontSize: '16px', color: '#2d3436' };
const imgWrapper     = { position: 'relative', width: '120px', height: '120px', margin: '0 auto' };
const imgStyle       = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
const camBtn         = { position: 'absolute', bottom: 0, right: 0, background: '#2d3436', color: '#fff', padding: '7px 9px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', border: '2px solid #fff' };
const inp            = { width: '100%', padding: '10px 12px', border: '1px solid #eee', borderRadius: '10px', boxSizing: 'border-box', fontSize: '14px', background: '#f9f9f9' };
const iRow           = { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: '1px solid #f5f5f5' };
const iLabel         = { fontSize: '10px', color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' };
const noticeBox      = { background: '#fff9db', border: '1px solid #f9ca24', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#636e72', marginBottom: '14px' };
const workRow        = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8f9fa', borderRadius: '10px', gap: '10px', flexWrap: 'wrap' };
const lockTag        = { fontSize: '10px', background: '#fff9db', color: '#f39c12', padding: '2px 7px', borderRadius: '8px', border: '1px solid #f9ca24' };
const emptyText      = { fontSize: '13px', color: '#b2bec3', textAlign: 'center', padding: '10px 0' };

export default ProfilePage;