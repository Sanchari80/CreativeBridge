import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

// Role → emoji/color map (matches the styling used across the rest of the app)
const ROLE_CFG = {
  Writer:  { emoji:'✍️', color:'#4834d4' },
  Singer:  { emoji:'🎤', color:'#00b894' },
  Painter: { emoji:'🎨', color:'#e17055' },
  Actor:   { emoji:'🎬', color:'#f39c12' },
  Dancer:  { emoji:'💃', color:'#fd79a8' },
  Hirer:   { emoji:'🔍', color:'#636e72' },
  'Looking for new stories': { emoji:'🔍', color:'#636e72' },
};

const SearchPage = ({ onViewProfile }) => {
  const { user } = useContext(AppContext);
  const [allUsers, setAllUsers] = useState({});
  const [query,    setQuery]    = useState('');

  // ── Load every registered user (any role) ──────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, 'users'), snap => {
      setAllUsers(snap.val() || {});
    });
    return () => unsub();
  }, []);

  const userList = Object.entries(allUsers)
    .map(([emailKey, u]) => ({ ...u, emailKey, email: u.email || emailKey.replace(/,/g, '.') }))
    .filter(u => u.email?.toLowerCase() !== user?.email?.toLowerCase()); // hide my own profile from results

  const q = query.trim().toLowerCase();
  const filtered = (q
    ? userList.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.profession?.toLowerCase().includes(q)
      )
    : userList
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ color:'#fff', marginBottom:14, fontFamily:"'Playfair Display',serif", textShadow:'0 2px 10px rgba(0,0,0,0.25)' }}>
        🔍 Search Everyone
      </h2>

      {/* Search box */}
      <div style={searchBox}>
        <span>🔍</span>
        <input
          type="text"
          placeholder="Search by name or role (Writer, Singer, Painter...)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ border:'none', outline:'none', flex:1, fontSize:14, background:'transparent' }}
          autoFocus
        />
        {query && <button onClick={() => setQuery('')} style={clearBtn}>✕</button>}
      </div>

      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:'0 0 14px' }}>
        {filtered.length} {filtered.length === 1 ? 'person' : 'people'} found
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ fontSize:40, margin:'0 0 8px' }}>🔍</p>
          <p>No one found{q ? ` matching "${query}"` : ''}.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map((u, i) => {
            const cfg = ROLE_CFG[u.role] || { emoji:'👤', color:'#636e72' };
            return (
              <div key={i} style={resultCard}
                onClick={() => onViewProfile?.({ email: u.email, name: u.name, pic: u.profilePic, role: u.role })}
              >
                <img src={u.profilePic || '/icon.png'} alt="" style={avatar} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'#2d3436', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {u.name || 'Unknown'}
                  </div>
                  {u.profession && (
                    <div style={{ fontSize:12, color:'#636e72', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {u.profession}
                    </div>
                  )}
                </div>
                <span style={{ ...roleChip, background: cfg.color + '22', color: cfg.color }}>
                  {cfg.emoji} {u.role || 'User'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const searchBox  = { display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.95)', padding:'12px 16px', borderRadius:14, border:'1px solid #eee', marginBottom:6, boxShadow:'0 3px 10px rgba(0,0,0,0.05)' };
const clearBtn   = { background:'#f1f2f6', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', fontSize:11, color:'#636e72', flexShrink:0 };
const emptyBox   = { textAlign:'center', padding:'50px 20px', color:'#fff', background:'rgba(255,255,255,0.12)', borderRadius:16 };
const resultCard = { display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.95)', padding:'12px 14px', borderRadius:14, boxShadow:'0 3px 10px rgba(0,0,0,0.06)', cursor:'pointer', border:'1px solid #f0f0f0', transition:'transform 0.15s' };
const avatar     = { width:46, height:46, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1.5px solid #eee' };
const roleChip   = { fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 };

export default SearchPage;