import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

const ROLE_CFG = {
  Writer:  { emoji:'✍️', color:'#8b5cf6' },
  Singer:  { emoji:'🎤', color:'#06b6d4' },
  Painter: { emoji:'🎨', color:'#f59e0b' },
  Actor:   { emoji:'🎬', color:'#ef4444' },
  Dancer:  { emoji:'💃', color:'#ec4899' },
  Hirer:   { emoji:'🔍', color:'#94a3b8' },
  'Looking for new stories': { emoji:'🔍', color:'#94a3b8' },
};

const playTick = () => {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=660;
    g.gain.setValueAtTime(0.06,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.06);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.06);
  }catch(e){}
};

const SearchPage = ({ onViewProfile }) => {
  const { user } = useContext(AppContext);
  const [allUsers, setAllUsers] = useState({});
  const [query,    setQuery]    = useState('');
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    const unsub = onValue(ref(db,'users'), snap => { setAllUsers(snap.val()||{}); });
    return () => unsub();
  }, []);

  const userList = Object.entries(allUsers)
    .map(([emailKey,u])=>({...u,emailKey,email:u.email||emailKey.replace(/,/g,'.')}))
    .filter(u=>u.email?.toLowerCase()!==user?.email?.toLowerCase());

  const q = query.trim().toLowerCase();
  const filtered = userList
    .filter(u => filter==='all' ? true : u.role?.toLowerCase()===filter)
    .filter(u => !q ? true :
      u.name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)  ||
      u.profession?.toLowerCase().includes(q)
    )
    .sort((a,b)=>(a.name||'').localeCompare(b.name||''));

  const glass = {
    background:'rgba(5,8,35,0.75)',
    backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:'1px solid rgba(147,197,253,0.12)',
    borderRadius:16,
  };

  return (
    <div style={{ maxWidth:640, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ margin:'0 0 4px', color:'rgba(255,255,255,0.92)', fontFamily:'Georgia,serif', fontSize:22 }}>
          🔭 Discover Talent
        </h2>
        <p style={{ margin:0, fontSize:11, color:'rgba(147,197,253,0.4)', letterSpacing:2, textTransform:'uppercase' }}>
          ♪ Search the Creative Bridge ♪
        </p>
      </div>

      {/* Search box — film strip style */}
      <div style={{ position:'relative', marginBottom:14 }}>
        {/* Left perforations */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:20, background:'rgba(4,6,20,0.9)', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'6px 0', borderRadius:'14px 0 0 14px', zIndex:1 }}>
          {[...Array(4)].map((_,i)=><div key={i} style={{ width:8,height:8,borderRadius:2,background:'rgba(147,197,253,0.12)',margin:'0 auto' }}/>)}
        </div>
        <div style={{ ...glass, display:'flex', alignItems:'center', gap:10, padding:'12px 20px 12px 28px', borderRadius:14 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>🔍</span>
          <input type="text" placeholder="Search by name, role or profession..."
            value={query} onChange={e=>setQuery(e.target.value)}
            autoFocus
            style={{ border:'none', outline:'none', flex:1, fontSize:14, background:'transparent', color:'rgba(255,255,255,0.9)', fontFamily:'inherit' }}/>
          {query && (
            <button onClick={()=>setQuery('')}
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'50%', width:24, height:24, cursor:'pointer', fontSize:11, color:'rgba(147,197,253,0.6)', flexShrink:0 }}>
              ✕
            </button>
          )}
        </div>
        {/* Right perforations */}
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:20, background:'rgba(4,6,20,0.9)', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'6px 0', borderRadius:'0 14px 14px 0', zIndex:1 }}>
          {[...Array(4)].map((_,i)=><div key={i} style={{ width:8,height:8,borderRadius:2,background:'rgba(147,197,253,0.12)',margin:'0 auto' }}/>)}
        </div>
      </div>

      {/* Role filter pills */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:14, paddingBottom:4, scrollbarWidth:'none' }}>
        {[{id:'all',emoji:'⭐',label:'All'},...Object.entries(ROLE_CFG).slice(0,6).map(([role,cfg])=>({id:role.toLowerCase(),emoji:cfg.emoji,label:role,color:cfg.color}))].map(f=>(
          <button key={f.id}
            onClick={()=>{ playTick(); setFilter(f.id); }}
            style={{
              padding:'6px 14px', borderRadius:20, cursor:'pointer', whiteSpace:'nowrap',
              fontWeight:700, fontSize:11, transition:'all 0.18s',
              background: filter===f.id ? (f.color?`${f.color}33`:'rgba(147,197,253,0.15)') : 'rgba(255,255,255,0.04)',
              color: filter===f.id ? (f.color||'rgba(147,197,253,0.8)') : 'rgba(255,255,255,0.4)',
              border: filter===f.id ? `1.5px solid ${f.color||'rgba(147,197,253,0.4)'}66` : '1.5px solid rgba(255,255,255,0.08)',
              boxShadow: filter===f.id ? `0 0 14px ${f.color||'rgba(147,197,253,0.3)'}44` : 'none',
            }}>
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p style={{ fontSize:12, color:'rgba(147,197,253,0.4)', margin:'0 0 12px', letterSpacing:0.5 }}>
        {filtered.length} {filtered.length===1?'person':'people'} found
      </p>

      {/* Results */}
      {filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'55px 20px', ...glass }}>
          <p style={{ fontSize:44, margin:'0 0 12px' }}>🔭</p>
          <p style={{ fontSize:14, color:'rgba(147,197,253,0.5)' }}>
            No one found{q?` matching "${query}"`:''}.
          </p>
          <p style={{ fontSize:11, color:'rgba(147,197,253,0.25)', marginTop:6 }}>♪ The stage is waiting ♪</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map((u,i)=>{
            const cfg = ROLE_CFG[u.role]||{emoji:'👤',color:'#94a3b8'};
            return (
              <div key={i}
                onClick={()=>{ playTick(); onViewProfile?.({email:u.email,name:u.name,pic:u.profilePic,role:u.role}); }}
                style={{
                  ...glass, display:'flex', alignItems:'center', gap:12,
                  padding:'12px 14px', cursor:'pointer',
                  borderLeft:`3px solid ${cfg.color}55`,
                  transition:'all 0.18s',
                  animation:`filmSlide 0.25s ease ${i*0.03}s both`,
                }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.transform='translateX(4px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(5,8,35,0.75)'; e.currentTarget.style.transform='translateX(0)'; }}>

                {/* Avatar */}
                <img src={u.profilePic||'/icon.png'} alt=""
                  style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`2px solid ${cfg.color}44`, boxShadow:`0 0 10px ${cfg.color}22` }}/>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'rgba(255,255,255,0.9)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name||'Unknown'}</div>
                  {u.profession && <div style={{ fontSize:11, color:'rgba(147,197,253,0.45)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:2 }}>{u.profession}</div>}
                  {u.address && <div style={{ fontSize:10, color:'rgba(147,197,253,0.3)', marginTop:2 }}>📍 {u.address.split(',')[0]}</div>}
                </div>

                {/* Role chip */}
                <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}33`, whiteSpace:'nowrap' }}>
                    {cfg.emoji} {u.role||'User'}
                  </span>
                  <span style={{ fontSize:9, color:'rgba(147,197,253,0.25)' }}>View →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchPage;