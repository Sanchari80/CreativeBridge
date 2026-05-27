import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

const AdminDashboard = () => {
  const { bids, approveBid, rejectBid, user } = useContext(AppContext);
  const [filter, setFilter] = useState('pending');

  const displayed = (bids||[]).filter(b => filter==='all' ? true : b.status===filter)
    .sort((a,b)=>b.timestamp-a.timestamp);

  const stats = {
    pending:  (bids||[]).filter(b=>b.status==='pending').length,
    approved: (bids||[]).filter(b=>b.status==='approved').length,
    rejected: (bids||[]).filter(b=>b.status==='rejected').length,
    revenue:  (bids||[]).filter(b=>b.status==='approved').reduce((s,b)=>s+(b.amount||0),0),
  };

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:20 }}>
      <h2 style={{ color:'#2d3436', margin:'0 0 20px' }}>🛡️ Admin — Bid Management</h2>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Pending',  val:stats.pending,  bg:'#fff9db', c:'#f39c12' },
          { label:'Approved', val:stats.approved, bg:'#d4edda', c:'#2ecc71' },
          { label:'Rejected', val:stats.rejected, bg:'#fdecea', c:'#e74c3c' },
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

      {/* Bid list */}
      {displayed.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#b2bec3' }}>
          <p style={{ fontSize:32, margin:'0 0 10px' }}>📋</p>
          <p>No bids in this category.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {displayed.map(bid=>(
            <div key={bid.id} style={{
              background:'rgba(255,255,255,0.95)', padding:16, borderRadius:16,
              boxShadow:'0 3px 12px rgba(0,0,0,0.06)',
              borderLeft:`4px solid ${bid.status==='approved'?'#2ecc71':bid.status==='rejected'?'#e74c3c':'#f39c12'}`
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <img src={bid.userPic||'/icon.png'} alt="" style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover' }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{bid.userName}</div>
                  <div style={{ fontSize:12, color:'#636e72' }}>{bid.userEmail}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:16, color:bid.tokens===5?'#f39c12':'#636e72' }}>
                    {bid.tokens===5?'🥇 5 Tokens':'🥈 2 Tokens'}
                  </div>
                  <div style={{ fontSize:12, color:'#2ecc71', fontWeight:600 }}>৳{bid.amount}</div>
                </div>
              </div>

              <div style={{ background:'#f8f9fa', padding:'8px 12px', borderRadius:10, marginBottom:10 }}>
                <div style={{ fontSize:12, color:'#636e72' }}>Work Title</div>
                <div style={{ fontWeight:600 }}>{bid.workTitle}</div>
                <div style={{ fontSize:11, color:'#636e72', marginTop:2 }}>Category: {bid.category} · ID: {bid.workId?.slice(0,12)}...</div>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'#b2bec3' }}>{new Date(bid.timestamp).toLocaleString('bn-BD')}</span>
                {bid.status==='pending' && (
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      onClick={()=>{ if(window.confirm(`Approve bid for "${bid.workTitle}"?`)) approveBid(bid); }}
                      style={{ padding:'7px 16px', background:'#2ecc71', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12 }}
                    >✅ Approve</button>
                    <button
                      onClick={()=>{ if(window.confirm("Reject this bid?")) rejectBid(bid.id); }}
                      style={{ padding:'7px 16px', background:'#e74c3c', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12 }}
                    >❌ Reject</button>
                  </div>
                )}
                {bid.status!=='pending' && (
                  <span style={{
                    padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700,
                    background:bid.status==='approved'?'#d4edda':'#fdecea',
                    color:bid.status==='approved'?'#2ecc71':'#e74c3c',
                    textTransform:'capitalize'
                  }}>{bid.status==='approved'?'✅ Approved':'❌ Rejected'}</span>
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