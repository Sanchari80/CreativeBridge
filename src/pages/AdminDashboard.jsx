import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

const AdminDashboard = () => {
  const { bids, approveBid, rejectBid } = useContext(AppContext);
  const [filter, setFilter] = useState('pending');

  // Queue: oldest first (FIFO) for pending, newest first for others
  const displayed = (bids||[])
    .filter(b => filter==='all' ? true : b.status===filter)
    .sort((a,b) =>
      filter==='pending'
        ? a.timestamp - b.timestamp   // oldest bid first (queue order)
        : b.timestamp - a.timestamp   // newest first for approved/rejected
    );

  const stats = {
    pending:  (bids||[]).filter(b=>b.status==='pending').length,
    approved: (bids||[]).filter(b=>b.status==='approved').length,
    rejected: (bids||[]).filter(b=>b.status==='rejected').length,
    revenue:  (bids||[]).filter(b=>b.status==='approved').reduce((s,b)=>s+(b.amount||0),0),
  };

  return (
    <div style={{ maxWidth:750, margin:'0 auto', padding:20 }}>
      <h2 style={{ color:'#2d3436', margin:'0 0 6px' }}>🛡️ Admin — Bid Management</h2>
      <p style={{ color:'#636e72', fontSize:13, marginBottom:20 }}>
        Pending bids are shown oldest first (queue order). Approve to immediately promote the work.
      </p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Pending',  val:stats.pending,       bg:'#fff9db', c:'#f39c12' },
          { label:'Approved', val:stats.approved,      bg:'#d4edda', c:'#2ecc71' },
          { label:'Rejected', val:stats.rejected,      bg:'#fdecea', c:'#e74c3c' },
          { label:'Revenue',  val:`৳${stats.revenue}`, bg:'#e8f5e9', c:'#00b894' },
        ].map(s=>(
          <div key={s.label} style={{ background:s.bg, padding:'12px', borderRadius:14, textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:s.c }}>{s.val}</div>
            <div style={{ fontSize:11, color:'#636e72', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, background:'#f1f2f6', borderRadius:10, padding:3 }}>
        {['pending','approved','rejected','all'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            flex:1, padding:'8px', border:'none', borderRadius:8, cursor:'pointer',
            fontWeight:600, fontSize:12, textTransform:'capitalize',
            background:filter===f?'#fff':'transparent',
            boxShadow:filter===f?'0 1px 4px rgba(0,0,0,0.1)':'none',
            color:filter===f?'#2d3436':'#636e72'
          }}>{f}</button>
        ))}
      </div>

      {/* Queue label for pending */}
      {filter==='pending' && displayed.length>0 && (
        <div style={{ background:'#f0f4ff', borderRadius:10, padding:'8px 14px', fontSize:12, color:'#4834d4', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          📋 <strong>{displayed.length} bid{displayed.length>1?'s':''} in queue</strong> — shown oldest first. Approve in order for fair promotion.
        </div>
      )}

      {/* Bid list */}
      {displayed.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#b2bec3' }}>
          <p style={{ fontSize:32, margin:'0 0 10px' }}>📋</p>
          <p>No bids in this category.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {displayed.map((bid, queueIndex)=>(
            <div key={bid.id} style={{
              background:'rgba(255,255,255,0.97)', padding:18, borderRadius:16,
              boxShadow:'0 3px 12px rgba(0,0,0,0.07)',
              borderLeft:`4px solid ${bid.status==='approved'?'#2ecc71':bid.status==='rejected'?'#e74c3c':'#f39c12'}`
            }}>
              {/* Queue position badge */}
              {filter==='pending' && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center' }}>
                  <span style={{ background:'#f39c12', color:'#fff', fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20 }}>
                    Queue #{queueIndex+1}
                  </span>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>
                    {new Date(bid.timestamp).toLocaleString()}
                  </span>
                </div>
              )}

              {/* User info */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <img src={bid.userPic||'/icon.png'} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', border:'2px solid #eee' }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{bid.userName}</div>
                  <div style={{ fontSize:12, color:'#636e72' }}>{bid.userEmail}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:16, color:bid.tokens===5?'#f39c12':'#636e72' }}>
                    {bid.tokens===5?'🥇 5 Tokens':'🥈 2 Tokens'}
                  </div>
                  <div style={{ fontSize:13, color:'#2ecc71', fontWeight:700 }}>৳{bid.amount}</div>
                </div>
              </div>

              {/* Work info */}
              <div style={{ background:'#f8f9fa', padding:'10px 14px', borderRadius:12, marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>Work Details</div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{bid.workTitle}</div>
                <div style={{ fontSize:11, color:'#636e72', marginBottom:8 }}>
                  Category: <strong>{bid.category}</strong>
                </div>
                {/* Work link */}
                {bid.workLink && (
                  <a href={bid.workLink} target="_blank" rel="noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'#6c5ce7', fontWeight:600, textDecoration:'none', background:'#f0f0ff', padding:'4px 10px', borderRadius:8, marginBottom:6 }}>
                    🔗 View Work
                  </a>
                )}
              </div>

              {/* Payment screenshot */}
              {bid.paymentScreenshot && (
                <div style={{ background:'#fff9db', borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'#636e72' }}>📸 Payment Screenshot:</span>
                  <a href={bid.paymentScreenshot} target="_blank" rel="noreferrer"
                    style={{ fontSize:12, color:'#f39c12', fontWeight:700, textDecoration:'none' }}>
                    View Screenshot →
                  </a>
                </div>
              )}

              {/* Status / Actions */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                {bid.status!=='pending' && (
                  <span style={{ fontSize:11, color:'#94a3b8' }}>
                    {new Date(bid.timestamp).toLocaleString()}
                  </span>
                )}
                {bid.status==='pending' && (
                  <div style={{ display:'flex', gap:8, width:'100%' }}>
                    <button
                      onClick={()=>{ if(window.confirm(`Approve bid for "${bid.workTitle}"?\n\nThis will immediately promote it to the top of the dashboard.`)) approveBid(bid); }}
                      style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#2ecc71,#27ae60)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13 }}>
                      ✅ Approve — Promote Now
                    </button>
                    <button
                      onClick={()=>{ if(window.confirm("Reject this bid?")) rejectBid(bid.id); }}
                      style={{ padding:'10px 18px', background:'linear-gradient(135deg,#e74c3c,#c0392b)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13 }}>
                      ❌ Reject
                    </button>
                  </div>
                )}
                {bid.status!=='pending' && (
                  <span style={{
                    padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                    background:bid.status==='approved'?'#d4edda':'#fdecea',
                    color:bid.status==='approved'?'#2ecc71':'#e74c3c',
                  }}>
                    {bid.status==='approved'?'✅ Approved — Live':'❌ Rejected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;