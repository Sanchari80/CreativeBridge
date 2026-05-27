import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext, playSound } from '../context/AppContext';
import { ref, update, remove } from "firebase/database";
import { db } from '../App.jsx';

const NotificationSystem = ({ onBack }) => {
  const {
    user, requests, talentRequests, followNotifications,
    updateTalentRequest, markFollowNotifRead, setActiveStoryId,
  } = useContext(AppContext);

  const [fullImg,   setFullImg]   = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const prevApprovedCount = useRef(0);

  const emailKey   = user?.email?.toLowerCase().replace(/\./g, ',');
  const isWriter   = user?.role === 'Writer';
  const isTalent   = ['Singer','Painter','Actor','Dancer','Writer'].includes(user?.role);
  const isHirer    = user?.role === 'Hirer' || user?.role === 'Looking for new stories';

  useEffect(() => {
    const approved = requests.filter(r => r.fromEmail === user?.email && r.status === 'approved' && !r.read);
    if (prevApprovedCount.current !== 0 && approved.length > prevApprovedCount.current) playSound('approve');
    prevApprovedCount.current = approved.length;
  }, [requests, user?.email]);

  const updateStoryStatus = (req, newStatus) => {
    const updates = {};
    updates[`/requests/${req.ownerPath}/${req.firebaseKey}/status`] = newStatus;
    if (newStatus === 'approved') {
      updates[`/requests/${req.ownerPath}/${req.firebaseKey}/writerPic`] = user.profilePic || '/icon.png';
      playSound('approve');
    }
    update(ref(db), updates).then(() => alert(`Request ${newStatus}!`)).catch(e => alert("Error: " + e.message));
  };

  const deleteNotif = async (req, type = 'story') => {
    if (!window.confirm("Delete this notification?")) return;
    const path = type === 'story'
      ? `requests/${req.ownerPath}/${req.firebaseKey}`
      : `talentRequests/${req.ownerPath}/${req.firebaseKey}`;
    await remove(ref(db, path)).catch(e => alert("Error: " + e.message));
  };

  const myStoryNotifs  = requests.filter(r =>
    isWriter ? r.ownerPath?.toLowerCase() === emailKey
             : r.fromEmail?.toLowerCase() === user?.email?.toLowerCase()
  );
  const myTalentNotifs = talentRequests.filter(r =>
    isTalent ? r.ownerPath === emailKey
             : r.fromEmail?.toLowerCase() === user?.email?.toLowerCase()
  );
  const myFollowNotifs = followNotifications || [];

  const allNotifs = [
    ...myStoryNotifs.map(n  => ({ ...n, _type: 'story'  })),
    ...myTalentNotifs.map(n => ({ ...n, _type: 'talent' })),
    ...myFollowNotifs.map(n => ({ ...n, _type: 'follow' })),
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const display = activeTab === 'all'    ? allNotifs
                : activeTab === 'story'  ? myStoryNotifs.map(n => ({ ...n, _type: 'story' }))
                : activeTab === 'contact'? myTalentNotifs.map(n => ({ ...n, _type: 'talent' }))
                : myFollowNotifs.map(n => ({ ...n, _type: 'follow' }));

  const unreadFollow  = myFollowNotifs.filter(n => !n.read).length;
  const unreadContact = isTalent
    ? myTalentNotifs.filter(n => n.status === 'pending').length
    : myTalentNotifs.filter(n => n.status === 'approved' && !n.read).length;
  const unreadStory   = isWriter
    ? myStoryNotifs.filter(n => n.status === 'pending').length
    : myStoryNotifs.filter(n => n.status === 'approved' && !n.read).length;

  const getTypeText = (req) =>
    req.requestType === 'fullStory' ? 'Full Script' :
    req.requestType === 'synopsis'  ? 'Synopsis'    : 'Contact Details';

  const sColor = s => s==='approved'?'#2ecc71': s==='declined'?'#e74c3c':'#f39c12';
  const sBg    = s => s==='approved'?'#d4edda': s==='declined'?'#fdecea':'#fff9db';

  const TABS_DEF = [
    { id: 'all',     label: 'All',        count: unreadStory + unreadContact + unreadFollow },
    { id: 'story',   label: '📝 Stories',  count: unreadStory,   show: isWriter || isHirer },
    { id: 'contact', label: '📩 Contact',  count: unreadContact, show: true },
    { id: 'follow',  label: '❤️ Follows',  count: unreadFollow,  show: isTalent },
  ].filter(t => t.show !== false);

  return (
    <div>
      {fullImg && (
        <div style={overlay} onClick={() => setFullImg(null)}>
          <img src={fullImg} alt="" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '10px' }} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        <span style={{ fontSize: '12px', color: '#b2bec3' }}>{allNotifs.length} total</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: '#f1f2f6', borderRadius: '10px', padding: '3px' }}>
        {TABS_DEF.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '7px 4px', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: '600', fontSize: '11px', position: 'relative',
            background: activeTab === t.id ? '#fff' : 'transparent',
            boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            color: activeTab === t.id ? '#2d3436' : '#636e72',
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-2px', background: '#ff4757', color: '#fff', borderRadius: '50%', padding: '1px 5px', fontSize: '9px', fontWeight: '800', border: '1.5px solid #fff' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '460px', overflowY: 'auto' }}>
        {display.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#b2bec3' }}>
            <p style={{ fontSize: '28px', margin: '0 0 8px' }}>🔔</p>
            <p style={{ fontSize: '13px' }}>No notifications yet.</p>
          </div>
        ) : display.map((item, idx) => {

          /* ── FOLLOW ── */
          if (item._type === 'follow') return (
            <div key={item.firebaseKey || idx}
              style={{ ...nCard, borderLeft: '4px solid #fd79a8', background: item.read ? '#f9f9f9' : '#fff0f7', cursor: 'pointer' }}
              onClick={() => { if (!item.read && item.firebaseKey) markFollowNotifRead(item.firebaseKey); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={item.followerPic || '/icon.png'} alt="" style={avSmall} onClick={e => { e.stopPropagation(); setFullImg(item.followerPic); }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px' }}>❤️ <strong>{item.followerName}</strong>{item.followerProfession ? ` (${item.followerProfession})` : ''} আপনাকে follow করেছে!</span>
                  <div style={{ fontSize: '10px', color: '#b2bec3', marginTop: '3px' }}>{new Date(item.timestamp).toLocaleString('bn-BD')}</div>
                </div>
                {!item.read && <span style={{ width: '8px', height: '8px', background: '#fd79a8', borderRadius: '50%', flexShrink: 0 }} />}
              </div>
            </div>
          );

          /* ── TALENT CONTACT ── */
          if (item._type === 'talent') return (
            <div key={item.firebaseKey || idx} style={{ ...nCard, borderLeft: `4px solid ${sColor(item.status)}`, background: item.status === 'pending' ? '#fff9db' : '#f9f9f9' }}>
              <button onClick={() => deleteNotif(item, 'talent')} style={delBtn}>🗑️</button>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <img src={item.fromPic || '/icon.png'} alt="" style={avSmall} onClick={() => setFullImg(item.fromPic)} />
                <div style={{ flex: 1, fontSize: '13px' }}>
                  {isTalent ? (
                    <><strong>{item.fromName}</strong>{item.fromProfession ? ` (${item.fromProfession})` : ''} আপনার সাথে contact করতে চায়।
                      <div style={{ fontSize: '11px', color: sColor(item.status), marginTop: '3px', fontWeight: '700', textTransform: 'capitalize' }}>{item.status}</div>
                    </>
                  ) : (
                    <><strong>{item.talentName}</strong> এর contact request <strong style={{ color: sColor(item.status) }}>{item.status}</strong>!</>
                  )}
                </div>
              </div>
              {item.message && <div style={noteBox}>"{item.message}"</div>}
              {isTalent && item.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => updateTalentRequest(item, 'approved')} style={appBtn}>✅ Accept</button>
                  <button onClick={() => updateTalentRequest(item, 'declined')} style={decBtn}>❌ Decline</button>
                </div>
              )}
              {isTalent && item.status === 'approved' && <p style={{ fontSize: '12px', color: '#2ecc71', margin: '6px 0 0' }}>✅ Contact info share হয়েছে।</p>}
            </div>
          );

          /* ── STORY ── */
          if (item._type === 'story') return (
            <div key={item.firebaseKey || idx} style={{ ...nCard, borderLeft: `4px solid ${sColor(item.status)}`, background: item.status === 'pending' ? '#fff9db' : '#f9f9f9' }}>
              <button onClick={() => deleteNotif(item, 'story')} style={delBtn}>🗑️</button>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <img src={isWriter ? (item.fromPic||'/icon.png') : (item.writerPic||'/icon.png')} alt="" style={avSmall}
                  onClick={() => setFullImg(isWriter ? item.fromPic : item.writerPic)} />
                <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5 }}>
                  {isWriter ? (
                    <><strong>{item.fromName}</strong> requested <strong>{getTypeText(item)}</strong> of <strong>"{item.storyTitle}"</strong>.
                      <div style={{ fontSize: '11px', color: sColor(item.status), marginTop: '3px', fontWeight: '700', textTransform: 'capitalize' }}>{item.status}</div>
                    </>
                  ) : (
                    <><strong>"{item.storyTitle}"</strong> এর <strong>{getTypeText(item)}</strong> request <strong style={{ color: sColor(item.status) }}>{item.status}</strong>!</>
                  )}
                </div>
              </div>
              {item.note && <div style={noteBox}>"{item.note}"</div>}
              {isWriter && item.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => updateStoryStatus(item, 'approved')} style={appBtn}>✅ Approve</button>
                  <button onClick={() => updateStoryStatus(item, 'declined')} style={decBtn}>❌ Decline</button>
                </div>
              )}
              {!isWriter && item.status === 'approved' && (
                <button onClick={() => { setActiveStoryId(item.storyId); update(ref(db, `requests/${item.ownerPath}/${item.firebaseKey}`), { read: true }); onBack(); }}
                  style={{ ...appBtn, background: '#2d3436', marginTop: '8px', fontSize: '11px' }}>📖 View Story</button>
              )}
            </div>
          );

          return null;
        })}
      </div>
    </div>
  );
};

const overlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, cursor: 'zoom-out' };
const backBtn  = { background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', padding: 0 };
const nCard    = { padding: '12px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative' };
const avSmall  = { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', cursor: 'zoom-in', flexShrink: 0 };
const delBtn   = { position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 };
const noteBox  = { fontSize: '12px', fontStyle: 'italic', color: '#636e72', background: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #eee', margin: '8px 0' };
const appBtn   = { flex: 1, padding: '7px 12px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' };
const decBtn   = { flex: 1, padding: '7px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' };

export default NotificationSystem;