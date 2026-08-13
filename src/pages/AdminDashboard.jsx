import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

const AdminDashboard = () => {
  const {
    user, bids, approveBid, rejectBid,
    adminNotifications, markAdminNotifRead,
    approveRelease, rejectRelease,
  } = useContext(AppContext);

  const [activeTab,      setActiveTab]      = useState('bids');
  const [showNotifs,     setShowNotifs]     = useState(false);
  const [releases,       setReleases]       = useState([]);
  const [relTab,         setRelTab]         = useState('all');

  // ── Load all releases ────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, 'releases'), snap => {
      const d = snap.val();
      if (d) {
        const list = Object.entries(d)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setReleases(list);
      } else setReleases([]);
    });
    return () => unsub();
  }, []);

  const pendingBids     = bids.filter(b => b.status === 'pending');
  const approvedBids    = bids.filter(b => b.status === 'approved');
  const rejectedBids    = bids.filter(b => b.status === 'rejected');
  const totalRevenue    = approvedBids.reduce((s, b) => s + (b.amount || 0), 0);
  const unreadNotifs    = adminNotifications.filter(n => !n.read).length;

  const pendingReleases  = releases.filter(r => r.status === 'pending');
  const approvedReleases = releases.filter(r => r.status === 'approved');
  const rejectedReleases = releases.filter(r => r.status === 'rejected');
  const releaseRevenue   = approvedReleases.reduce((s, r) => s + (r.paymentAmount || 0), 0);

  const filteredReleases = relTab === 'all'      ? releases
    : relTab === 'pending'   ? pendingReleases
    : relTab === 'approved'  ? approvedReleases
    : rejectedReleases;

  const handleOpenNotifs = () => {
    setShowNotifs(v => !v);
    adminNotifications.filter(n => !n.read).forEach(n => markAdminNotifRead(n.firebaseKey));
  };

  const handleApproveBid = (bid) => {
    if (window.confirm(`Approve bid for "${bid.workTitle}"?`)) approveBid(bid);
  };
  const handleRejectBid = (bid) => {
    if (window.confirm(`Reject bid for "${bid.workTitle}"?`)) rejectBid(bid.id);
  };

  const handleApproveRelease = (r) => {
    if (window.confirm(`Approve "${r.title}"?`)) approveRelease(r.id);
  };
  const handleRejectRelease = (r) => {
    if (window.confirm(`Reject "${r.title}"?`)) rejectRelease(r.id);
  };

  const statusColor = s => s==='approved'?'#2ecc71':s==='rejected'?'#e74c3c':'#f39c12';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, color:'#2d3436' }}>🛡️ Admin Dashboard</h2>
          <p style={{ margin:'3px 0 0', fontSize:13, color:'#636e72' }}>Welcome, {user?.name}</p>
        </div>
        <button onClick={handleOpenNotifs} style={{ ...notifBtn, background: unreadNotifs>0 ? '#fff9db' : '#f8f9fa', borderColor: unreadNotifs>0 ? '#f9ca24' : '#eee' }}>
          🔔 New Bids
          {unreadNotifs > 0 && <span style={badge}>{unreadNotifs}</span>}
        </button>
      </div>

      {/* ── Notification Panel ── */}
      {showNotifs && (
        <div style={notifPanel}>
          <p style={panelTitle}>Recent Notifications</p>
          {adminNotifications.length === 0
            ? <p style={{ fontSize:13, color:'#b2bec3' }}>No notifications yet.</p>
            : adminNotifications.slice(0, 10).map((n, i) => (
              <div key={i} style={{ ...notifItem, background: n.read ? '#f9f9f9' : '#fffbee', borderLeft: `3px solid ${n.read?'#eee':'#f9ca24'}` }}>
                <div style={{ fontSize:13, fontWeight:600 }}>
                  {n.type === 'new_release' ? '🎬' : '💰'} {n.title || n.workTitle}
                </div>
                <div style={{ fontSize:12, color:'#636e72' }}>
                  {n.userName} · ${n.paymentAmount || n.amount}
                  {n.type === 'new_release' && ` · ${n.releaseType === 'drama' ? 'Drama' : 'Ad'}`}
                </div>
                {n.paymentScreenshot && (
                  <a href={n.paymentScreenshot} target="_blank" rel="noreferrer" style={ssLink}>📸 View Screenshot →</a>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { label:'Pending Bids',     value:pendingBids.length,     color:'#f39c12', icon:'⏳' },
          { label:'Approved Bids',    value:approvedBids.length,    color:'#2ecc71', icon:'✅' },
          { label:'Rejected Bids',    value:rejectedBids.length,    color:'#e74c3c', icon:'❌' },
          { label:'Bid Revenue',      value:`$${totalRevenue}`,     color:'#6c5ce7', icon:'💰' },
          { label:'Pending Releases', value:pendingReleases.length, color:'#f39c12', icon:'🎬' },
          { label:'Release Revenue',  value:`$${releaseRevenue}`,   color:'#00b894', icon:'📢' },
        ].map((s, i) => (
          <div key={i} style={{ background:'rgba(255,255,255,0.95)', padding:'14px 16px', borderRadius:14, boxShadow:'0 3px 10px rgba(0,0,0,0.06)', borderLeft:`4px solid ${s.color}` }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:'#636e72', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main Tabs ── */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[
          { id:'bids',     label:`💰 Bid Promotions (${pendingBids.length} pending)` },
          { id:'releases', label:`🎭 Releases & Ads (${pendingReleases.length} pending)` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex:1, padding:'10px', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:13,
            border:`2px solid ${activeTab===t.id?'#2d3436':'#eee'}`,
            background: activeTab===t.id ? '#2d3436' : '#fff',
            color:      activeTab===t.id ? '#fff'    : '#2d3436',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          BIDS TAB
      ══════════════════════════════════════════════ */}
      {activeTab === 'bids' && (
        <div>
          {pendingBids.length === 0 ? (
            <div style={emptyBox}>
              <p style={{ fontSize:32, margin:0 }}>💰</p>
              <p style={{ color:'#b2bec3' }}>No pending bids.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[...pendingBids].sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)).map((bid, i) => (
                <div key={bid.id} style={reviewCard}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                    <img src={bid.userPic||'/icon.png'} alt="" style={av}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{bid.userName}</div>
                      <div style={{ fontSize:12, color:'#636e72' }}>{bid.userEmail}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:800, fontSize:16, color:'#6c5ce7' }}>${bid.amount}</div>
                      <div style={{ fontSize:11, color:'#f39c12' }}>{bid.tokens===5?'🥇 Top Priority':'🥈 2nd Priority'}</div>
                    </div>
                  </div>
                  <div style={infoRow}>
                    <span style={infoLabel}>Work</span>
                    <span style={infoValue}>{bid.workTitle}</span>
                  </div>
                  <div style={infoRow}>
                    <span style={infoLabel}>Category</span>
                    <span style={{ ...infoValue, textTransform:'capitalize' }}>{bid.category}</span>
                  </div>
                  <div style={infoRow}>
                    <span style={infoLabel}>Submitted</span>
                    <span style={infoValue}>{bid.timestamp ? new Date(bid.timestamp).toLocaleString() : '-'}</span>
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
                    {bid.workLink && (
                      <a href={bid.workLink} target="_blank" rel="noreferrer" style={linkBtn}>🔗 View Work</a>
                    )}
                    {bid.paymentScreenshot && (
                      <a href={bid.paymentScreenshot} target="_blank" rel="noreferrer" style={linkBtn}>📸 View Screenshot →</a>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:10 }}>
                    <button onClick={() => handleApproveBid(bid)} style={approveBtn}>✅ Approve</button>
                    <button onClick={() => handleRejectBid(bid)} style={rejectBtn}>❌ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved/Rejected history */}
          {(approvedBids.length > 0 || rejectedBids.length > 0) && (
            <div style={{ marginTop:24 }}>
              <p style={{ fontSize:12, color:'#adb5bd', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>History</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[...approvedBids, ...rejectedBids].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).map((bid,i) => (
                  <div key={i} style={{ ...reviewCard, borderLeft:`4px solid ${statusColor(bid.status)}`, opacity:0.85 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{bid.workTitle}</div>
                        <div style={{ fontSize:12, color:'#636e72' }}>{bid.userName} · {bid.category} · ${bid.amount}</div>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:statusColor(bid.status), textTransform:'capitalize', background:bid.status==='approved'?'#d4edda':'#fdecea', padding:'3px 10px', borderRadius:20 }}>
                        {bid.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          RELEASES & ADS TAB
      ══════════════════════════════════════════════ */}
      {activeTab === 'releases' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto' }}>
            {[
              { id:'all',      label:`All (${releases.length})` },
              { id:'pending',  label:`⏳ Pending (${pendingReleases.length})`, color:'#f39c12' },
              { id:'approved', label:`✅ Approved (${approvedReleases.length})`, color:'#2ecc71' },
              { id:'rejected', label:`❌ Rejected (${rejectedReleases.length})`, color:'#e74c3c' },
            ].map(t => (
              <button key={t.id} onClick={() => setRelTab(t.id)} style={{
                padding:'7px 14px', borderRadius:20, cursor:'pointer', fontWeight:700, fontSize:12, whiteSpace:'nowrap',
                border:`1.5px solid ${relTab===t.id?(t.color||'#2d3436'):'#eee'}`,
                background: relTab===t.id ? (t.color||'#2d3436') : '#fff',
                color:      relTab===t.id ? '#fff' : '#2d3436',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {filteredReleases.length === 0 ? (
            <div style={emptyBox}>
              <p style={{ fontSize:32, margin:0 }}>🎭</p>
              <p style={{ color:'#b2bec3' }}>No releases found.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {filteredReleases.map((r, i) => (
                <div key={r.id} style={{ ...reviewCard, borderLeft:`4px solid ${r.type==='drama'?'#f9ca24':'#00b894'}` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                    {r.thumbnail && (
                      <img src={r.thumbnail} alt={r.title} style={{ width:70, height:50, borderRadius:8, objectFit:'cover', flexShrink:0 }}/>
                    )}
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:12, background:r.type==='drama'?'#fff9db':'#d4edda', color:r.type==='drama'?'#f39c12':'#2ecc71', textTransform:'uppercase', letterSpacing:1 }}>
                          {r.type === 'drama' ? '🎬 Drama' : '📢 Ad'}
                        </span>
                        {r.adCategory && <span style={{ fontSize:11, color:'#636e72' }}>{r.adCategory}</span>}
                      </div>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{r.title}</div>
                      <div style={{ fontSize:12, color:'#636e72' }}>{r.submitterName} · {r.submitterEmail}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontWeight:800, fontSize:16, color:'#6c5ce7' }}>{r.paymentAmount}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:statusColor(r.status), textTransform:'capitalize', marginTop:4 }}>
                        {r.status}
                      </div>
                    </div>
                  </div>

                  {r.description && (
                    <div style={{ fontSize:12, color:'#636e72', background:'#f8f9fa', padding:'8px 10px', borderRadius:8, marginBottom:8 }}>
                      {r.description}
                    </div>
                  )}

                  <div style={infoRow}>
                    <span style={infoLabel}>Submitted</span>
                    <span style={infoValue}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</span>
                  </div>

                  {r.youtubeLink && (
                    <div style={infoRow}>
                      <span style={infoLabel}>YouTube</span>
                      <a href={r.youtubeLink} target="_blank" rel="noreferrer" style={{ ...infoValue, color:'#e74c3c', fontWeight:600 }}>🎬 {r.youtubeLink.slice(0,40)}...</a>
                    </div>
                  )}
                  {r.adContact && (
                    <div style={infoRow}>
                      <span style={infoLabel}>Contact</span>
                      <span style={infoValue}>{r.adContact}</span>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
                    {r.paymentScreenshot && (
                      <a href={r.paymentScreenshot} target="_blank" rel="noreferrer" style={linkBtn}>📸 View Screenshot →</a>
                    )}
                    {r.youtubeLink && (
                      <a href={r.youtubeLink} target="_blank" rel="noreferrer" style={{ ...linkBtn, background:'#fdecea', color:'#e74c3c', borderColor:'#fdecea' }}>▶ Watch →</a>
                    )}
                  </div>

                  {r.status === 'pending' && (
                    <div style={{ display:'flex', gap:10, marginTop:10 }}>
                      <button onClick={() => handleApproveRelease(r)} style={approveBtn}>✅ Approve — Publish</button>
                      <button onClick={() => handleRejectRelease(r)} style={rejectBtn}>❌ Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Styles ── */
const notifBtn  = { padding:'9px 16px', border:'1.5px solid', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:13, position:'relative' };
const badge     = { position:'absolute', top:-6, right:-6, background:'#ff4757', color:'#fff', borderRadius:'50%', padding:'1px 5px', fontSize:10, fontWeight:800, border:'2px solid #fff' };
const notifPanel= { background:'rgba(255,255,255,0.97)', borderRadius:16, padding:16, marginBottom:20, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', border:'1px solid #f0f0f0' };
const panelTitle= { margin:'0 0 12px', fontSize:12, fontWeight:700, color:'#636e72', textTransform:'uppercase', letterSpacing:1 };
const notifItem = { padding:'10px 12px', borderRadius:10, marginBottom:8 };
const ssLink    = { display:'inline-block', marginTop:5, fontSize:11, color:'#6c5ce7', fontWeight:600, textDecoration:'none' };
const emptyBox  = { textAlign:'center', padding:'50px 20px', background:'rgba(255,255,255,0.9)', borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', gap:10 };
const reviewCard= { background:'rgba(255,255,255,0.97)', padding:16, borderRadius:14, boxShadow:'0 3px 12px rgba(0,0,0,0.06)', border:'1px solid #f0f0f0' };
const av        = { width:42, height:42, borderRadius:'50%', objectFit:'cover', border:'2px solid #eee', flexShrink:0 };
const infoRow   = { display:'flex', gap:10, alignItems:'flex-start', marginBottom:5 };
const infoLabel = { fontSize:11, color:'#adb5bd', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, flexShrink:0, width:70 };
const infoValue = { fontSize:12, color:'#2d3436', flex:1, wordBreak:'break-all' };
const linkBtn   = { padding:'6px 12px', background:'#f0f0ff', color:'#6c5ce7', border:'1px solid #d4d0ff', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center' };
const approveBtn= { flex:1, padding:'9px', background:'#2ecc71', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:12 };
const rejectBtn = { flex:1, padding:'9px', background:'#e74c3c', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:12 };

export default AdminDashboard;