import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

// ── YouTube helpers ────────────────────────────────────────────
const extractYouTubeId = (url) => {
  const m = (url || '').match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/
  );
  return m ? m[1] : null;
};
const ytThumb = (url) => {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};
const ytEmbed = (url) => {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

const AD_CATS = [
  'Music Academy', 'Dance Academy', 'Art / Design Academy',
  'Acting Academy', 'Music Brand', 'Creative Agency',
  'Event Management', 'Photography / Videography', 'Other',
];

const DRAMA_PRICE = '$500';
const AD_PRICE    = '$300';

const ReleasePage = () => {
  const { user, submitRelease } = useContext(AppContext);
  const [releases,    setReleases]    = useState([]);
  const [tab,         setTab]         = useState('drama');
  const [showForm,    setShowForm]    = useState(false);
  const [formType,    setFormType]    = useState('drama');
  const [watching,    setWatching]    = useState(null); // release to watch in modal
  const [step,        setStep]        = useState(1);    // form steps

  // form fields
  const [title,       setTitle]       = useState('');
  const [ytLink,      setYtLink]      = useState('');
  const [desc,        setDesc]        = useState('');
  const [adCat,       setAdCat]       = useState(AD_CATS[0]);
  const [adContact,   setAdContact]   = useState('');
  const [adImage,     setAdImage]     = useState('');
  const [screenshot,  setScreenshot]  = useState('');

  // Thumbnail preview while typing YouTube link
  const previewThumb = ytThumb(ytLink);

  useEffect(() => {
    const unsub = onValue(ref(db, 'releases'), snap => {
      const d = snap.val();
      if (d) {
        const list = Object.entries(d)
          .map(([id, v]) => ({ ...v, id }))
          .filter(r => r.status === 'approved')
          .sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));
        setReleases(list);
      } else setReleases([]);
    });
    return () => unsub();
  }, []);

  const dramas = releases.filter(r => r.type === 'drama');
  const ads    = releases.filter(r => r.type === 'ad');

  const resetForm = () => {
    setTitle(''); setYtLink(''); setDesc(''); setAdCat(AD_CATS[0]);
    setAdContact(''); setAdImage(''); setScreenshot(''); setStep(1);
  };

  const handleSubmit = async () => {
    if (!screenshot.trim()) return alert('Please paste your payment screenshot link!');
    const price = formType === 'drama' ? DRAMA_PRICE : AD_PRICE;
    await submitRelease({
      type: formType, title, description: desc,
      youtubeLink: formType === 'drama' ? ytLink : '',
      thumbnail:   formType === 'drama' ? (ytThumb(ytLink) || '') : adImage,
      adCategory:  formType === 'ad'    ? adCat : '',
      adContact:   formType === 'ad'    ? adContact : '',
      paymentAmount: price,
      paymentScreenshot: screenshot.trim(),
    });
    resetForm();
    setShowForm(false);
    alert('Submitted! Admin will review and approve within 24 hours.');
  };

  const canNext1 = formType === 'drama'
    ? (title.trim() && ytLink.trim() && extractYouTubeId(ytLink))
    : (title.trim() && adCat && adContact.trim());

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Watch Modal ── */}
      {watching && (
        <div style={overlay} onClick={() => setWatching(null)}>
          <div style={watchBox} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0, color:'#2d3436', fontSize:16 }}>{watching.title}</h3>
              <button onClick={() => setWatching(null)} style={closeBtn}>✕</button>
            </div>
            {watching.type === 'drama' && watching.youtubeLink ? (
              <iframe src={ytEmbed(watching.youtubeLink)} title={watching.title}
                style={{ width:'100%', height:300, border:'none', borderRadius:12 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen/>
            ) : (
              watching.thumbnail && <img src={watching.thumbnail} alt={watching.title} style={{ width:'100%', borderRadius:12, marginBottom:10 }}/>
            )}
            {watching.description && <p style={{ margin:'12px 0 0', fontSize:13, color:'#636e72' }}>{watching.description}</p>}
            {watching.adContact && <p style={{ margin:'8px 0 0', fontSize:13, fontWeight:600 }}>📞 Contact: {watching.adContact}</p>}
          </div>
        </div>
      )}

      {/* ── Submit Form Modal ── */}
      {showForm && (
        <div style={overlay} onClick={() => { setShowForm(false); resetForm(); }}>
          <div style={{ ...formBox }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ margin:0, color:'#2d3436' }}>
                {formType === 'drama' ? '🎬 Submit Drama Release' : '📢 Post Creative Ad'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={closeBtn}>✕</button>
            </div>

            {/* Type toggle */}
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[{t:'drama',label:'🎬 Drama Release',price:`${DRAMA_PRICE}`},{t:'ad',label:'📢 Creative Ad',price:`${AD_PRICE}`}].map(o=>(
                <div key={o.t} onClick={()=>{setFormType(o.t);setStep(1);}} style={{ flex:1, padding:12, borderRadius:12, border:`2px solid ${formType===o.t?'#6c5ce7':'#eee'}`, cursor:'pointer', textAlign:'center', background:formType===o.t?'#f0f0ff':'#fff' }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{o.label}</div>
                  <div style={{ fontSize:12, color:'#6c5ce7', marginTop:4 }}>{o.price} / post</div>
                </div>
              ))}
            </div>

            {/* Step 1 — Content Info */}
            {step === 1 && (
              <>
                <input style={inp} placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)}/>
                {formType === 'drama' && (
                  <>
                    <input style={inp} placeholder="YouTube Link * (e.g. https://youtu.be/xxxxx)" value={ytLink} onChange={e=>setYtLink(e.target.value)}/>
                    {previewThumb && (
                      <div style={{ marginBottom:12, borderRadius:10, overflow:'hidden' }}>
                        <img src={previewThumb} alt="thumbnail preview" style={{ width:'100%', borderRadius:10, maxHeight:160, objectFit:'cover' }}/>
                        <div style={{ fontSize:11, color:'#2ecc71', marginTop:4 }}>✅ Thumbnail auto-detected</div>
                      </div>
                    )}
                    {ytLink && !extractYouTubeId(ytLink) && (
                      <div style={{ fontSize:11, color:'#e74c3c', marginBottom:8 }}>⚠️ Invalid YouTube link</div>
                    )}
                  </>
                )}
                {formType === 'ad' && (
                  <>
                    <select style={inp} value={adCat} onChange={e=>setAdCat(e.target.value)}>
                      {AD_CATS.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <input style={inp} placeholder="Contact Number / Link *" value={adContact} onChange={e=>setAdContact(e.target.value)}/>
                    <input style={inp} placeholder="Banner Image URL (optional)" value={adImage} onChange={e=>setAdImage(e.target.value)}/>
                  </>
                )}
                <textarea style={{ ...inp, height:75, resize:'none' }} placeholder="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)}/>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>{setShowForm(false);resetForm();}} style={cancelB}>Cancel</button>
                  <button onClick={()=>setStep(2)} disabled={!canNext1} style={{ ...confirmB, opacity:canNext1?1:0.5 }}>Next → Payment</button>
                </div>
              </>
            )}

            {/* Step 2 — Payment */}
            {step === 2 && (
              <>
                <div style={{ background:'linear-gradient(135deg,#141e30,#243b55)', borderRadius:14, padding:16, marginBottom:14, color:'#fff' }}>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Payment Required</div>
                  <div style={{ fontSize:24, fontWeight:900, color:'#fdcb6e', marginBottom:4 }}>
                    {formType==='drama'?DRAMA_PRICE:AD_PRICE}
                  </div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>for "{title}"</div>
                </div>
                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  <div style={{ flex:1, background:'linear-gradient(135deg,#e91e8c,#c2185b)', borderRadius:12, padding:'12px', color:'#fff', textAlign:'center' }}>
                    <div style={{ fontWeight:800, fontSize:13 }}>bKash</div>
                    <div style={{ fontSize:15, fontWeight:700, margin:'4px 0', letterSpacing:2 }}>01XXXXXXXXX</div>
                    <div style={{ fontSize:10, opacity:0.85 }}>Send Money → Personal</div>
                  </div>
                  <div style={{ flex:1, background:'linear-gradient(135deg,#f97316,#ea580c)', borderRadius:12, padding:'12px', color:'#fff', textAlign:'center' }}>
                    <div style={{ fontWeight:800, fontSize:13 }}>Nagad</div>
                    <div style={{ fontSize:15, fontWeight:700, margin:'4px 0', letterSpacing:2 }}>01XXXXXXXXX</div>
                    <div style={{ fontSize:10, opacity:0.85 }}>Send Money → Personal</div>
                  </div>
                </div>
                <label style={{ fontSize:12, fontWeight:700, color:'#636e72', display:'block', marginBottom:6 }}>📸 Payment Screenshot Link *</label>
                <input style={inp} type="url" placeholder="Upload to Google Drive → Share → Paste link here..." value={screenshot} onChange={e=>setScreenshot(e.target.value)}/>
                <div style={{ background:'#fff9db', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#636e72', marginBottom:14 }}>
                  <strong style={{ color:'#f39c12' }}>⚠️</strong> Admin will verify your payment and approve within 24 hours.
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>setStep(1)} style={cancelB}>← Back</button>
                  <button onClick={handleSubmit} disabled={!screenshot.trim()} style={{ ...confirmB, opacity:screenshot.trim()?1:0.5 }}>
                    ✅ I've Paid — Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ background:'linear-gradient(135deg,#141e30,#243b55,#0f3460)', borderRadius:20, padding:'28px 24px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-20, right:-20, fontSize:120, opacity:0.06, pointerEvents:'none' }}>🎬</div>
        <h1 style={{ margin:'0 0 6px', color:'#fff', fontFamily:"'Playfair Display',serif", fontSize:24 }}>
          🎭 Releases & Creative Ads
        </h1>
        <p style={{ margin:'0 0 16px', color:'rgba(255,255,255,0.6)', fontSize:13 }}>
          Watch short dramas • Discover music academies, dance studios & more
        </p>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button onClick={()=>{setFormType('drama');setShowForm(true);}} style={heroBtnDark}>🎬 Submit Drama Release — {DRAMA_PRICE}</button>
          <button onClick={()=>{setFormType('ad');setShowForm(true);}} style={heroBtnLight}>📢 Post Creative Ad — {AD_PRICE}</button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[{id:'drama',label:`🎬 Short Dramas (${dramas.length})`,color:'#f9ca24'},{id:'ad',label:`📢 Creative Ads (${ads.length})`,color:'#00b894'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:'10px', borderRadius:14, border:`2px solid ${tab===t.id?t.color:t.color+'44'}`, cursor:'pointer', fontWeight:700, fontSize:13, background:tab===t.id?t.color:'rgba(255,255,255,0.06)', color:tab===t.id?(t.id==='drama'?'#2d3436':'#fff'):'rgba(255,255,255,0.7)', backdropFilter:'blur(8px)', boxShadow:tab===t.id?`0 0 16px ${t.color}66`:'none', transition:'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Drama Grid ── */}
      {tab === 'drama' && (
        dramas.length === 0 ? (
          <Empty icon="🎬" text="No drama releases yet. Be the first to submit!"/>
        ) : (
          <div style={grid}>
            {dramas.map(r => (
              <div key={r.id} style={releaseCard}>
                {/* Thumbnail */}
                <div style={{ position:'relative', borderRadius:'14px 14px 0 0', overflow:'hidden', background:'#1a1a2e' }}>
                  {r.thumbnail
                    ? <img src={r.thumbnail} alt={r.title} style={{ width:'100%', height:175, objectFit:'cover', display:'block' }}/>
                    : <div style={{ height:175, display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>🎬</div>}
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(0deg,rgba(0,0,0,0.6) 0%,transparent 50%)', pointerEvents:'none' }}/>
                  <div style={{ position:'absolute', bottom:10, left:12, right:12 }}>
                    <div style={{ color:'#fdcb6e', fontSize:9, fontWeight:800, letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>🎬 SHORT DRAMA</div>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:14, lineHeight:1.3 }}>{r.title}</div>
                  </div>
                  {/* Play button overlay */}
                  <button onClick={()=>setWatching(r)}
                    style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'rgba(255,255,255,0.2)', backdropFilter:'blur(8px)', border:'2px solid rgba(255,255,255,0.5)', borderRadius:'50%', width:54, height:54, fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                    ▶
                  </button>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  {r.description && <p style={{ margin:'0 0 10px', fontSize:12, color:'#636e72', lineHeight:1.5 }}>{r.description.slice(0,90)}{r.description.length>90?'...':''}</p>}
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>setWatching(r)} style={{ ...watchBtn, flex:1 }}>▶ Watch Now</button>
                    {r.youtubeLink && (
                      <a href={r.youtubeLink} target="_blank" rel="noreferrer" style={{ ...ytBtn }}>YT ↗</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Creative Ads Grid ── */}
      {tab === 'ad' && (
        ads.length === 0 ? (
          <Empty icon="📢" text="No creative ads yet. Post yours!"/>
        ) : (
          <div style={grid}>
            {ads.map(r => (
              <div key={r.id} style={adCard}>
                {r.thumbnail && <img src={r.thumbnail} alt={r.title} style={{ width:'100%', height:140, objectFit:'cover', borderRadius:'14px 14px 0 0', display:'block' }}/>}
                <div style={{ padding:'14px' }}>
                  <span style={{ background:'#00b89422', color:'#00b894', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, display:'inline-block', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>
                    {r.adCategory}
                  </span>
                  <div style={{ fontWeight:700, fontSize:15, color:'#2d3436', marginBottom:6 }}>{r.title}</div>
                  {r.description && <p style={{ margin:'0 0 10px', fontSize:12, color:'#636e72', lineHeight:1.5 }}>{r.description.slice(0,100)}{r.description.length>100?'...':''}</p>}
                  <button onClick={()=>setWatching(r)} style={{ ...watchBtn, width:'100%', background:'linear-gradient(135deg,#00b894,#00cec9)', boxShadow:'0 4px 14px rgba(0,184,148,0.3)' }}>
                    Learn More →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

/* ── Sub Components ── */
const Empty = ({ icon, text }) => (
  <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.05)', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)' }}>
    <div style={{ fontSize:52, marginBottom:12 }}>{icon}</div>
    <p style={{ fontSize:14 }}>{text}</p>
  </div>
);

/* ── Styles ── */
const overlay    = { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'flex-start', zIndex:9999, backdropFilter:'blur(8px)', overflowY:'auto', paddingTop:24, paddingBottom:24 };
const watchBox   = { background:'#fff', padding:20, borderRadius:20, width:'90%', maxWidth:640, flexShrink:0 };
const formBox    = { background:'#fff', padding:24, borderRadius:20, width:'90%', maxWidth:460, flexShrink:0, marginBottom:20 };
const closeBtn   = { background:'#f1f2f6', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:14, fontWeight:700, color:'#636e72', display:'flex', alignItems:'center', justifyContent:'center' };
const inp        = { width:'100%', padding:'11px 12px', border:'1px solid #eee', borderRadius:10, boxSizing:'border-box', fontSize:14, background:'#f9f9f9', marginBottom:10, fontFamily:'inherit' };
const cancelB    = { flex:1, padding:10, borderRadius:10, border:'1px solid #eee', cursor:'pointer', background:'#f8f9fa', fontWeight:600 };
const confirmB   = { flex:2, padding:10, borderRadius:10, border:'none', background:'linear-gradient(135deg,#2d3436,#1a2025)', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:13 };
const heroBtnDark = { padding:'10px 18px', background:'rgba(255,255,255,0.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:13, backdropFilter:'blur(8px)' };
const heroBtnLight = { padding:'10px 18px', background:'#00b894', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:13, boxShadow:'0 4px 14px rgba(0,184,148,0.4)' };
const grid       = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 };
const releaseCard = { background:'rgba(255,255,255,0.96)', borderRadius:16, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.15)', border:'1px solid rgba(255,255,255,0.1)' };
const adCard     = { background:'rgba(255,255,255,0.96)', borderRadius:16, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', border:'1px solid rgba(0,184,148,0.2)' };
const watchBtn   = { padding:'9px 16px', background:'linear-gradient(135deg,#f9ca24,#f0932b)', color:'#2d3436', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13, boxShadow:'0 4px 14px rgba(249,202,36,0.4)' };
const ytBtn      = { padding:'9px 14px', background:'#ff0000', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:12, textDecoration:'none', display:'flex', alignItems:'center' };

export default ReleasePage;