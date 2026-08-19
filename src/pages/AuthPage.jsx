import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { db } from '../App.jsx';
import { ref, set, get, child } from "firebase/database";
import { getAuth, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const ROLE_OPTIONS = [
  { value:'Writer',  emoji:'✍️', label:'Writer',          desc:'Scripts & Stories',    color:'#8b5cf6' },
  { value:'Singer',  emoji:'🎤', label:'Singer',          desc:'Music & Performance',  color:'#06b6d4' },
  { value:'Painter', emoji:'🎨', label:'Painter/Designer',desc:'Visual Arts',           color:'#f59e0b' },
  { value:'Actor',   emoji:'🎬', label:'Actor/Anchor',    desc:'Film & Media',         color:'#ef4444' },
  { value:'Dancer',  emoji:'💃', label:'Dancer',          desc:'Stage Performance',    color:'#ec4899' },
  { value:'Hirer',   emoji:'🔍', label:'Hirer',           desc:'Find Talent',          color:'#94a3b8' },
];

const EMPTY_FORM = { name:'', email:'', password:'', role:'Writer', profession:'', phone:'', whatsapp:'', facebook:'', address:'' };

// ── Sound Synthesizer ─────────────────────────────────────────
const sounds = {
  shutter: () => {
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      // White noise burst = camera shutter
      const buf = ctx.createBuffer(1, ctx.sampleRate*0.06, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.06);
      src.connect(g); g.connect(ctx.destination); src.start();
      // Film advance click after
      setTimeout(()=>{
        const o=ctx.createOscillator(),g2=ctx.createGain();
        o.type='square';o.frequency.value=180;
        g2.gain.setValueAtTime(0.08,ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.04);
        o.connect(g2);g2.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.04);
      },60);
    }catch(e){}
  },
  note: (freq=523) => {
    try {
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine'; o.frequency.value=freq;
      g.gain.setValueAtTime(0,ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.12,ctx.currentTime+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.35);
      o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.4);
    }catch(e){}
  },
  success: () => {
    try {
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      [[523,0],[659,0.1],[784,0.2],[1047,0.3]].forEach(([f,t])=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(0,ctx.currentTime+t);
        g.gain.linearRampToValueAtTime(0.12,ctx.currentTime+t+0.02);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.3);
        o.connect(g);g.connect(ctx.destination);
        o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.35);
      });
    }catch(e){}
  },
  tick: () => {
    try {
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.value=800;
      g.gain.setValueAtTime(0.06,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.04);
      o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.04);
    }catch(e){}
  },
};

// ── Inject CSS animations once ────────────────────────────────
const injectAnims = () => {
  if (document.getElementById('auth-anims')) return;
  const s = document.createElement('style');
  s.id = 'auth-anims';
  s.textContent = `
    @keyframes openCase {
      0%  { transform:perspective(800px) rotateX(-55deg) scale(0.85); opacity:0; }
      60% { transform:perspective(800px) rotateX(6deg)  scale(1.02); opacity:1; }
      100%{ transform:perspective(800px) rotateX(0deg)  scale(1);    opacity:1; }
    }
    @keyframes filmSlide {
      from { transform:translateX(-30px); opacity:0; }
      to   { transform:translateX(0);    opacity:1; }
    }
    @keyframes caseOpen {
      0%  { clip-path:polygon(0 50%,100% 50%,100% 50%,0 50%); }
      100%{ clip-path:polygon(0 0,100% 0,100% 100%,0 100%);   }
    }
    @keyframes noteFloat {
      0%,100%{ transform:translateY(0)   rotate(-8deg); opacity:0.5; }
      50%    { transform:translateY(-6px) rotate(8deg);  opacity:0.9; }
    }
    @keyframes stripPulse {
      0%,100%{ background:rgba(6,182,212,0.08); }
      50%    { background:rgba(6,182,212,0.15); }
    }
    @keyframes ripple { to{transform:scale(2.5);opacity:0} }
    @keyframes shimmer {
      0%  { background-position:-400px 0; }
      100%{ background-position:400px 0;  }
    }
    .auth-btn:hover  { filter:brightness(1.15); transform:translateY(-1px) scale(1.02); }
    .auth-btn:active { transform:scale(0.97); }
    .role-card:hover { transform:translateY(-2px) scale(1.03); }
    .strip-input:focus { border-color:rgba(6,182,212,0.6)!important; box-shadow:0 0 0 3px rgba(6,182,212,0.12)!important; background:rgba(0,15,25,0.9)!important; }
  `;
  document.head?.appendChild(s);
};

const withRipple=(e,fn)=>{
  const btn=e.currentTarget,r=document.createElement('span');
  const rect=btn.getBoundingClientRect(),sz=Math.max(rect.width,rect.height);
  r.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,0.2);transform:scale(0);animation:ripple 0.5s linear;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px;pointer-events:none`;
  btn.style.overflow='hidden';btn.style.position=btn.style.position||'relative';
  btn.appendChild(r);setTimeout(()=>r.remove(),600);fn&&fn();
};

// ── Film Strip Input ──────────────────────────────────────────
const StripInput = ({ placeholder, type='text', value, onChange, onKeyDown, autoFocus }) => (
  <div style={{ position:'relative', marginBottom:10 }}>
    {/* Left perforations */}
    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:22, background:'#060c18', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'5px 0', borderRadius:'10px 0 0 10px', zIndex:1 }}>
      {[...Array(4)].map((_,i)=>(
        <div key={i} style={{ width:9, height:9, borderRadius:2, background:'rgba(147,197,253,0.15)', margin:'0 auto', border:'1px solid rgba(147,197,253,0.1)' }}/>
      ))}
    </div>
    {/* Right perforations */}
    <div style={{ position:'absolute', right:0, top:0, bottom:0, width:22, background:'#060c18', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'5px 0', borderRadius:'0 10px 10px 0', zIndex:1 }}>
      {[...Array(4)].map((_,i)=>(
        <div key={i} style={{ width:9, height:9, borderRadius:2, background:'rgba(147,197,253,0.15)', margin:'0 auto', border:'1px solid rgba(147,197,253,0.1)' }}/>
      ))}
    </div>
    <input
      className="strip-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      style={{
        width:'100%', padding:'12px 28px',
        background:'rgba(4,8,28,0.85)',
        border:'1px solid rgba(147,197,253,0.15)',
        borderRadius:10, boxSizing:'border-box',
        fontSize:14, color:'rgba(255,255,255,0.9)',
        outline:'none', transition:'all 0.2s',
        fontFamily:'inherit', letterSpacing:0.3,
      }}
    />
  </div>
);

// ── Musical Letter Button ─────────────────────────────────────
const MusicalBtn = ({ onClick, children, gradient, glow, loading }) => {
  // Split text into styled letters
  const text = String(children);
  const colors = ['#e2e8f0','#93c5fd','#c4b5fd','#6ee7b7','#fde68a','#fca5a5'];
  return (
    <button onClick={onClick} disabled={loading}
      className="auth-btn"
      style={{
        width:'100%', padding:'15px 20px',
        background: gradient || 'linear-gradient(135deg,#1e1b4b,#312e81,#1e3a5f)',
        border:'1px solid rgba(147,197,253,0.25)',
        borderRadius:14, cursor:loading?'not-allowed':'pointer',
        position:'relative', transition:'all 0.2s',
        boxShadow: glow || '0 4px 24px rgba(0,0,0,0.4)',
        letterSpacing:4, overflow:'hidden',
        opacity:loading?0.7:1,
      }}>
      {/* Shimmer effect */}
      {!loading && <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)', backgroundSize:'400px 100%', animation:'shimmer 2.5s infinite', pointerEvents:'none' }}/>}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:2, position:'relative', zIndex:1 }}>
        <span style={{ fontSize:14, marginRight:6, opacity:0.7 }}>♪</span>
        {loading ? (
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:800 }}>Loading...</span>
        ) : (
          text.split('').map((ch,i)=>(
            <span key={i} style={{ fontSize:15, fontWeight:900, color:colors[i%colors.length], fontFamily:'Georgia,serif', textShadow:`0 0 8px ${colors[i%colors.length]}88`, transition:'all 0.1s' }}>
              {ch}
            </span>
          ))
        )}
        <span style={{ fontSize:14, marginLeft:6, opacity:0.7 }}>♫</span>
      </div>
    </button>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const AuthPage = () => {
  const { setUser } = useContext(AppContext);
  const [view,    setView]    = useState('login');
  const [form,    setForm]    = useState({...EMPTY_FORM});
  const [loading, setLoading] = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set_ = (key, val) => setForm(f=>({...f,[key]:val}));

  useEffect(() => {
    injectAnims();
    setTimeout(()=>setMounted(true), 50);
  }, []);

  const handleAction = async () => {
    const auth         = getAuth();
    const emailInput   = form.email.replace(/\s+/g,'').toLowerCase();
    const passwordInput= form.password.trim();
    const emailKey     = emailInput.replace(/\./g,',');

    if (view==='login') {
      setLoading(true);
      try {
        sounds.shutter();
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        const snapshot = await get(child(ref(db),`users/${emailKey}`));
        if (snapshot.exists()) {
          sounds.success();
          const foundUser = snapshot.val();
          localStorage.setItem('activeUser', JSON.stringify(foundUser));
          setUser(foundUser);
          setForm({...EMPTY_FORM});
        } else { alert("Account not found in database."); }
      } catch(error) { alert("Login failed: "+error.message); }
      finally { setLoading(false); }
    } else {
      if (!form.name||!emailInput||!passwordInput||!form.profession) return alert("All required fields must be filled!");
      if (passwordInput.length<6) return alert("Password must be at least 6 characters!");
      if (!form.phone)   return alert("Phone number required!");
      if (!form.address) return alert("Address required!");
      setLoading(true);
      try {
        sounds.shutter();
        await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        const newUser = {...form, email:emailInput, password:passwordInput, id:Date.now(), profilePic:"/icon.png"};
        await set(ref(db,`users/${emailKey}`), newUser);
        localStorage.setItem('activeUser', JSON.stringify(newUser));
        sounds.success();
        setUser(newUser);
        setForm({...EMPTY_FORM});
        alert("Account created successfully!");
      } catch(error) {
        if (error.code==='auth/email-already-in-use') alert("Email already registered. Please login.");
        else alert("Sign-up failed: "+error.message);
      }
      finally { setLoading(false); }
    }
  };

  const handleKeyDown = e => { if(e.key==='Enter') handleAction(); };

  const handleResetPassword = async () => {
    const emailPrompt = prompt("Enter your registered email:");
    if (!emailPrompt) return;
    try {
      await sendPasswordResetEmail(getAuth(), emailPrompt.trim().toLowerCase());
      alert("Password reset link sent! Check your email (also spam folder).");
    } catch(error) { alert("Reset failed: "+error.message); }
  };

  const switchView = (v) => {
    sounds.note(v==='signup'?523:784);
    setView(v);
    setForm({...EMPTY_FORM});
    setMounted(false);
    setTimeout(()=>setMounted(true),50);
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      backgroundImage:"url('/auth background.png')",
      backgroundSize:'cover', backgroundPosition:'center', backgroundRepeat:'no-repeat',
      fontFamily:"'DM Sans','Segoe UI',sans-serif",
      position:'relative',
    }}>
      {/* Dark cinematic overlay */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(2,8,24,0.82),rgba(4,10,40,0.78))', backdropFilter:'blur(1px)', zIndex:0 }}/>

      {/* Floating musical notes */}
      {['♪','♫','🎬','♩','♪'].map((n,i)=>(
        <div key={i} style={{ position:'fixed', fontSize:14+i*3, opacity:0.12, zIndex:1, pointerEvents:'none',
          left:`${8+i*20}%`, top:`${5+i*12}%`,
          animation:`noteFloat ${2.5+i*0.4}s ease-in-out ${i*0.3}s infinite`,
          color:['#93c5fd','#c4b5fd','#fde68a','#86efac','#fca5a5'][i],
        }}>{n}</div>
      ))}

      <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', padding:'20px', position:'relative', zIndex:2 }}>

        {/* ── Camera Case Card ── */}
        <div style={{
          width:'100%', maxWidth:460, padding: view==='signup'?'28px 26px':'32px 28px',
          borderRadius:24,
          background:'linear-gradient(145deg,rgba(4,8,30,0.95),rgba(6,10,40,0.92))',
          backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          border:'1px solid rgba(147,197,253,0.14)',
          boxShadow:'0 30px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(147,197,253,0.05)',
          textAlign:'center', position:'relative',
          maxHeight:'94vh', overflowY:'auto',
          transformOrigin:'top center',
          animation: mounted ? 'openCase 0.55s cubic-bezier(0.22,1,0.36,1) both' : 'none',
          scrollbarWidth:'thin', scrollbarColor:'rgba(147,197,253,0.15) transparent',
        }}>

          {/* Camera strap top decoration */}
          <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:0 }}>
            <div style={{ width:60, height:6, background:'linear-gradient(90deg,rgba(147,197,253,0.1),rgba(147,197,253,0.25),rgba(147,197,253,0.1))', borderRadius:'0 0 4px 4px' }}/>
            <div style={{ width:12, height:14, background:'rgba(147,197,253,0.2)', borderRadius:'0 0 4px 4px', border:'1px solid rgba(147,197,253,0.15)' }}/>
            <div style={{ width:60, height:6, background:'linear-gradient(90deg,rgba(147,197,253,0.1),rgba(147,197,253,0.25),rgba(147,197,253,0.1))', borderRadius:'0 0 4px 4px' }}/>
          </div>

          {/* Back button for signup */}
          {view==='signup' && (
            <button onClick={()=>switchView('login')}
              style={{ position:'absolute', top:18, left:18, background:'rgba(147,197,253,0.06)', border:'1px solid rgba(147,197,253,0.15)', color:'rgba(147,197,253,0.7)', cursor:'pointer', fontWeight:700, fontSize:11, borderRadius:8, padding:'5px 10px' }}>
              ← Back
            </button>
          )}

          {/* Logo + title */}
          <div style={{ marginBottom:20, animation:'filmSlide 0.4s ease 0.2s both' }}>
            {/* Film reel logo */}
            <div style={{ position:'relative', display:'inline-block', marginBottom:12 }}>
              <div style={{ width:62, height:62, borderRadius:'50%', background:'rgba(6,182,212,0.1)', border:'2px solid rgba(6,182,212,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', boxShadow:'0 0 20px rgba(6,182,212,0.15)' }}>
                <img src="/icon.png" alt="" style={{ width:44, borderRadius:'50%' }}/>
              </div>
              {/* Film strip decoration */}
              <div style={{ position:'absolute', top:'50%', left:-24, transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:3 }}>
                {[...Array(3)].map((_,i)=><div key={i} style={{ width:10, height:10, borderRadius:2, background:'rgba(147,197,253,0.12)', border:'1px solid rgba(147,197,253,0.08)' }}/>)}
              </div>
              <div style={{ position:'absolute', top:'50%', right:-24, transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:3 }}>
                {[...Array(3)].map((_,i)=><div key={i} style={{ width:10, height:10, borderRadius:2, background:'rgba(147,197,253,0.12)', border:'1px solid rgba(147,197,253,0.08)' }}/>)}
              </div>
            </div>

            <h2 style={{ margin:'0 0 4px', color:'rgba(255,255,255,0.92)', fontSize:22, fontFamily:'Georgia,serif', letterSpacing:0.5 }}>
              {view==='login' ? 'Welcome Back' : 'Join the Stage'}
            </h2>
            <div style={{ height:2, background:'linear-gradient(90deg,transparent,rgba(6,182,212,0.5),transparent)', borderRadius:1, margin:'8px auto', width:80 }}/>
            <p style={{ fontSize:11, color:'rgba(147,197,253,0.4)', letterSpacing:2, textTransform:'uppercase', marginTop:6 }}>
              ♪ Creative Bridge ♪
            </p>
          </div>

          {/* ── SIGNUP FIELDS ── */}
          {view==='signup' && (
            <>
              {/* Role selector */}
              <p style={{ fontSize:10, color:'rgba(147,197,253,0.5)', textTransform:'uppercase', letterSpacing:2, marginBottom:10, fontWeight:700, textAlign:'left' }}>
                Select Your Creative Role *
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:16 }}>
                {ROLE_OPTIONS.map(r=>(
                  <div key={r.value} className="role-card"
                    onClick={()=>{ sounds.note({Writer:523,Singer:659,Painter:784,Actor:880,Dancer:1047,Hirer:440}[r.value]||523); set_('role',r.value); }}
                    style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'9px 10px', borderRadius:12, cursor:'pointer',
                      background: form.role===r.value ? `${r.color}22` : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${form.role===r.value ? r.color+'66' : 'rgba(147,197,253,0.1)'}`,
                      boxShadow: form.role===r.value ? `0 0 14px ${r.color}33` : 'none',
                      transition:'all 0.18s',
                    }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{r.emoji}</span>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontWeight:700, fontSize:12, color: form.role===r.value ? '#fff' : 'rgba(255,255,255,0.7)' }}>{r.label}</div>
                      <div style={{ fontSize:9, color:'rgba(147,197,253,0.35)' }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <StripInput placeholder="Full Name *"                                    value={form.name}       onChange={e=>set_('name',e.target.value)}       onKeyDown={handleKeyDown}/>
              <StripInput placeholder={form.role==='Hirer'?'Profession / Company *':'Profession / Expertise *'} value={form.profession} onChange={e=>set_('profession',e.target.value)} onKeyDown={handleKeyDown}/>
              <StripInput placeholder="Full Address (Area, District) *"                value={form.address}    onChange={e=>set_('address',e.target.value)}     onKeyDown={handleKeyDown}/>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:0 }}>
                <div style={{ position:'relative', marginBottom:10 }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:22, background:'#060c18', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'5px 0', borderRadius:'10px 0 0 10px', zIndex:1 }}>
                    {[...Array(4)].map((_,i)=><div key={i} style={{ width:9, height:9, borderRadius:2, background:'rgba(147,197,253,0.15)', margin:'0 auto' }}/>)}
                  </div>
                  <div style={{ position:'absolute', right:0, top:0, bottom:0, width:22, background:'#060c18', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'5px 0', borderRadius:'0 10px 10px 0', zIndex:1 }}>
                    {[...Array(4)].map((_,i)=><div key={i} style={{ width:9, height:9, borderRadius:2, background:'rgba(147,197,253,0.15)', margin:'0 auto' }}/>)}
                  </div>
                  <input className="strip-input" placeholder="Phone Number *" value={form.phone} onChange={e=>set_('phone',e.target.value)} onKeyDown={handleKeyDown}
                    style={{ width:'100%', padding:'12px 28px', background:'rgba(4,8,28,0.85)', border:'1px solid rgba(147,197,253,0.15)', borderRadius:10, boxSizing:'border-box', fontSize:14, color:'rgba(255,255,255,0.9)', outline:'none', transition:'all 0.2s', fontFamily:'inherit' }}/>
                </div>
                <div style={{ position:'relative', marginBottom:10 }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:22, background:'#060c18', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'5px 0', borderRadius:'10px 0 0 10px', zIndex:1 }}>
                    {[...Array(4)].map((_,i)=><div key={i} style={{ width:9, height:9, borderRadius:2, background:'rgba(147,197,253,0.15)', margin:'0 auto' }}/>)}
                  </div>
                  <div style={{ position:'absolute', right:0, top:0, bottom:0, width:22, background:'#060c18', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'5px 0', borderRadius:'0 10px 10px 0', zIndex:1 }}>
                    {[...Array(4)].map((_,i)=><div key={i} style={{ width:9, height:9, borderRadius:2, background:'rgba(147,197,253,0.15)', margin:'0 auto' }}/>)}
                  </div>
                  <input className="strip-input" placeholder="WhatsApp" value={form.whatsapp} onChange={e=>set_('whatsapp',e.target.value)} onKeyDown={handleKeyDown}
                    style={{ width:'100%', padding:'12px 28px', background:'rgba(4,8,28,0.85)', border:'1px solid rgba(147,197,253,0.15)', borderRadius:10, boxSizing:'border-box', fontSize:14, color:'rgba(255,255,255,0.9)', outline:'none', transition:'all 0.2s', fontFamily:'inherit' }}/>
                </div>
              </div>

              <StripInput placeholder="Facebook Profile Link" value={form.facebook} onChange={e=>set_('facebook',e.target.value)} onKeyDown={handleKeyDown}/>
            </>
          )}

          {/* ── COMMON FIELDS ── */}
          <StripInput placeholder="Email *" type="email"    value={form.email}    onChange={e=>set_('email',e.target.value)}    onKeyDown={handleKeyDown} autoFocus={view==='login'}/>
          {/* Password field with show/hide */}
          <div style={{position:'relative',marginBottom:10}}>
            {/* Left perforations */}
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:22,background:'#060c18',display:'flex',flexDirection:'column',justifyContent:'space-around',padding:'5px 0',borderRadius:'10px 0 0 10px',zIndex:1}}>
              {[...Array(4)].map((_,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:'rgba(147,197,253,0.15)',margin:'0 auto',border:'1px solid rgba(147,197,253,0.1)'}}/>)}
            </div>
            {/* Right perforations */}
            <div style={{position:'absolute',right:0,top:0,bottom:0,width:22,background:'#060c18',display:'flex',flexDirection:'column',justifyContent:'space-around',padding:'5px 0',borderRadius:'0 10px 10px 0',zIndex:1}}>
              {[...Array(4)].map((_,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:'rgba(147,197,253,0.15)',margin:'0 auto',border:'1px solid rgba(147,197,253,0.1)'}}/>)}
            </div>
            <input
              className="strip-input"
              type={showPass?'text':'password'}
              placeholder="Password *"
              value={form.password}
              onChange={e=>set_('password',e.target.value)}
              onKeyDown={handleKeyDown}
              style={{width:'100%',padding:'12px 52px 12px 28px',background:'rgba(4,8,28,0.85)',border:'1px solid rgba(147,197,253,0.15)',borderRadius:10,boxSizing:'border-box',fontSize:14,color:'rgba(255,255,255,0.9)',outline:'none',transition:'all 0.2s',fontFamily:'inherit',letterSpacing:showPass?0:2}}
            />
            {/* Eye toggle button */}
            <button
              type="button"
              onClick={()=>setShowPass(v=>!v)}
              style={{position:'absolute',right:28,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'rgba(147,197,253,0.5)',zIndex:2,padding:4,lineHeight:1,transition:'color 0.2s'}}
              title={showPass?'Hide password':'Show password'}>
              {showPass?'🙈':'👁'}
            </button>
          </div>

          {/* Forgot password */}
          {view==='login' && (
            <div style={{ textAlign:'right', marginBottom:12, marginTop:-4 }}>
              <span onClick={()=>{sounds.tick();handleResetPassword();}}
                style={{ fontSize:12, color:'rgba(147,197,253,0.5)', cursor:'pointer', fontWeight:500, transition:'color 0.2s' }}>
                Forgot Password?
              </span>
            </div>
          )}

          {/* ── ACTION BUTTON ── */}
          <div style={{ marginTop:4 }}>
            <MusicalBtn onClick={e=>withRipple(e,()=>handleAction())} loading={loading}
              gradient="linear-gradient(135deg,rgba(4,12,40,0.9),rgba(8,20,60,0.9))"
              glow="0 0 30px rgba(6,182,212,0.2),0 8px 32px rgba(0,0,0,0.5)">
              {view==='login' ? 'ENTER DASHBOARD' : 'JOIN NOW'}
            </MusicalBtn>
          </div>

          {/* Switch view */}
          <div style={{ marginTop:20, fontSize:13, color:'rgba(147,197,253,0.4)' }}>
            {view==='login' ? (
              <>Don't have an account?{' '}
                <span onClick={()=>switchView('signup')}
                  style={{ color:'rgba(6,182,212,0.8)', cursor:'pointer', fontWeight:700, transition:'color 0.2s' }}>
                  Sign Up ♪
                </span>
              </>
            ) : (
              <>Already on stage?{' '}
                <span onClick={()=>switchView('login')}
                  style={{ color:'rgba(6,182,212,0.8)', cursor:'pointer', fontWeight:700 }}>
                  Login ♫
                </span>
              </>
            )}
          </div>

          {/* Bottom film strip decoration */}
          <div style={{ display:'flex', justifyContent:'center', gap:4, marginTop:18, opacity:0.2 }}>
            {[...Array(8)].map((_,i)=><div key={i} style={{ width:10, height:7, borderRadius:1, background:'rgba(147,197,253,0.5)', border:'1px solid rgba(147,197,253,0.3)' }}/>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;