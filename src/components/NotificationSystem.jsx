import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext, playSound } from '../context/AppContext';
import { ref, update, remove } from "firebase/database";
import { db } from '../App.jsx';

// ── Sound + Ripple ────────────────────────────────────────────
const playChime = () => {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [[523,0],[659,0.08],[784,0.16]].forEach(([f,t])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.frequency.value=f;o.type='sine';
      g.gain.setValueAtTime(0,ctx.currentTime+t);
      g.gain.linearRampToValueAtTime(0.1,ctx.currentTime+t+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.3);
      o.connect(g);g.connect(ctx.destination);
      o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.35);
    });
  }catch(e){}
};
const playPop = () => {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(400,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(200,ctx.currentTime+0.1);
    g.gain.setValueAtTime(0.12,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.15);
  }catch(e){}
};
const withRipple=(e,fn)=>{
  const btn=e.currentTarget,r=document.createElement('span');
  const rect=btn.getBoundingClientRect(),sz=Math.max(rect.width,rect.height);
  r.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,0.18);transform:scale(0);animation:ns-ripple 0.5s linear;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px;pointer-events:none`;
  btn.style.overflow='hidden';btn.style.position=btn.style.position||'relative';
  btn.appendChild(r);setTimeout(()=>r.remove(),600);fn&&fn();
};

// ── Design tokens ─────────────────────────────────────────────
const N = {
  glass:   'rgba(5,8,35,0.75)',
  border:  'rgba(147,197,253,0.12)',
  text:    'rgba(255,255,255,0.9)',
  muted:   'rgba(147,197,253,0.45)',
  green:   { bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.25)', text:'#10b981' },
  red:     { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.25)',  text:'#ef4444' },
  yellow:  { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)', text:'#f59e0b' },
  purple:  { bg:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.25)', text:'#a78bfa' },
  pink:    { bg:'rgba(236,72,153,0.12)', border:'rgba(236,72,153,0.25)', text:'#f472b6' },
  blue:    { bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.25)', text:'#60a5fa' },
};

const sColor = s =>
  s==='approved' ? N.green.text :
  s==='declined' ? N.red.text   : N.yellow.text;
const sScheme = s =>
  s==='approved' ? N.green :
  s==='declined' ? N.red   : N.yellow;

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT — all logic preserved
// ══════════════════════════════════════════════════════════════
const NotificationSystem = ({ onBack, onViewProfile }) => {
  const {
    user, requests, talentRequests, followNotifications,
    bidNotifications, markBidNotifRead,
    updateTalentRequest, markFollowNotifRead, setActiveStoryId,
  } = useContext(AppContext);

  const [fullImg,   setFullImg]   = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const prevApprovedCount = useRef(0);

  const emailKey = user?.email?.toLowerCase().replace(/\./g, ',');
  const isWriter = user?.role === 'Writer';
  const isTalent = ['Singer','Painter','Actor','Dancer','Writer'].includes(user?.role);
  const isHirer  = user?.role === 'Hirer' || user?.role === 'Looking for new stories';

  useEffect(() => {
    if (!document.getElementById('ns-anims')) {
      const s=document.createElement('style');s.id='ns-anims';
      s.textContent=`@keyframes ns-ripple{to{transform:scale(2.5);opacity:0}} @keyframes ns-slide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
      document.head?.appendChild(s);
    }
  },[]);

  useEffect(() => {
    const approved = requests.filter(r => r.fromEmail === user?.email && r.status === 'approved' && !r.read);
    if (prevApprovedCount.current !== 0 && approved.length > prevApprovedCount.current) { playSound('approve'); playChime(); }
    prevApprovedCount.current = approved.length;
  }, [requests, user?.email]);

  const updateStoryStatus = (req, newStatus) => {
    const updates = {};
    updates[`/requests/${req.ownerPath}/${req.firebaseKey}/status`] = newStatus;
    if (newStatus === 'approved') { updates[`/requests/${req.ownerPath}/${req.firebaseKey}/writerPic`] = user.profilePic||'/icon.png'; playSound('approve'); playChime(); }
    update(ref(db), updates).then(()=>alert(`Request ${newStatus}!`)).catch(e=>alert("Error: "+e.message));
  };

  const deleteNotif = async (req, type='story') => {
    if (!window.confirm("Delete this notification?")) return;
    const path = type==='story' ? `requests/${req.ownerPath}/${req.firebaseKey}` : `talentRequests/${req.ownerPath}/${req.firebaseKey}`;
    await remove(ref(db, path)).catch(e=>alert("Error: "+e.message));
  };

  const markTalentNotifRead = async (item) => {
    if (item.read) return;
    try { await update(ref(db,`talentRequests/${item.ownerPath}/${item.firebaseKey}`),{read:true}); } catch(e){}
  };

  const goToProfile = (email, name, pic, role) => {
    if (!email || !onViewProfile) return;
    onBack();
    onViewProfile({ email, name, pic, role });
  };

  const myStoryNotifs  = requests.filter(r =>
    isWriter ? r.ownerPath?.toLowerCase()===emailKey : r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()
  );
  const myTalentNotifs = talentRequests.filter(r =>
    r.ownerPath===emailKey || r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()
  );
  const myFollowNotifs = followNotifications || [];
  const myBidNotifs    = bidNotifications    || [];

  const allNotifs = [
    ...myStoryNotifs.map(n=>({...n,_type:'story'})),
    ...myTalentNotifs.map(n=>({...n,_type:'talent'})),
    ...myFollowNotifs.map(n=>({...n,_type:'follow'})),
    ...myBidNotifs.map(n=>({...n,_type:'bid'})),
  ].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));

  const display = activeTab==='all'     ? allNotifs
                : activeTab==='story'   ? myStoryNotifs.map(n=>({...n,_type:'story'}))
                : activeTab==='contact' ? myTalentNotifs.map(n=>({...n,_type:'talent'}))
                : activeTab==='follow'  ? myFollowNotifs.map(n=>({...n,_type:'follow'}))
                : activeTab==='bid'     ? myBidNotifs.map(n=>({...n,_type:'bid'}))
                : allNotifs;

  const unreadFollow              = myFollowNotifs.filter(n=>!n.read).length;
  const incomingPending           = myTalentNotifs.filter(n=>n.ownerPath===emailKey&&n.status==='pending').length;
  const outgoingApprovedUnread    = myTalentNotifs.filter(n=>n.fromEmail?.toLowerCase()===user?.email?.toLowerCase()&&n.status==='approved'&&!n.read).length;
  const unreadContact             = incomingPending+outgoingApprovedUnread;
  const unreadStory               = isWriter ? myStoryNotifs.filter(n=>n.status==='pending').length : myStoryNotifs.filter(n=>n.status==='approved'&&!n.read).length;
  const unreadBids                = myBidNotifs.filter(n=>!n.read).length;

  const getTypeText = req => req.requestType==='fullStory'?'Full Script':req.requestType==='synopsis'?'Synopsis':'Contact Details';

  const TABS_DEF = [
    { id:'all',     label:'All',        icon:'🔔', count:unreadStory+unreadContact+unreadFollow+unreadBids },
    { id:'story',   label:'Stories',    icon:'📜', count:unreadStory,   show:isWriter||isHirer },
    { id:'contact', label:'Contact',    icon:'📩', count:unreadContact, show:true },
    { id:'follow',  label:'Follows',    icon:'❤️', count:unreadFollow,  show:isTalent },
    { id:'bid',     label:'Bids',       icon:'💰', count:unreadBids,    show:true },
  ].filter(t=>t.show!==false);

  // ── Glass card wrapper ─────────────────────────────────────
  const Card = ({children, accentColor, unread, style:extra, onClick}) => (
    <div onClick={onClick}
      style={{
        background: unread ? `linear-gradient(135deg,${accentColor}12,rgba(5,8,35,0.8))` : 'rgba(5,8,35,0.6)',
        backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',
        border:`1px solid ${unread?accentColor+'33':N.border}`,
        borderLeft:`3px solid ${accentColor}`,
        borderRadius:16, padding:'14px 14px 12px',
        position:'relative',
        boxShadow: unread ? `0 4px 24px ${accentColor}22` : '0 2px 12px rgba(0,0,0,0.3)',
        animation:'ns-slide 0.25s ease',
        cursor:onClick?'pointer':'default',
        ...extra,
      }}>
      {children}
    </div>
  );

  // ── Clear note/message box ─────────────────────────────────
  const MsgBox = ({text}) => (
    <div style={{
      background:'rgba(147,197,253,0.05)',
      border:'1px solid rgba(147,197,253,0.1)',
      borderRadius:10,padding:'8px 12px',
      fontSize:12,fontStyle:'italic',
      color:'rgba(147,197,253,0.6)',
      margin:'10px 0 4px',lineHeight:1.5,
    }}>
      💬 "{text}"
    </div>
  );

  // ── Time formatter ──────────────────────────────────────────
  const fTime = ts => ts ? new Date(ts).toLocaleString('en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';

  // ── Action buttons ──────────────────────────────────────────
  const AccBtn = ({onClick,color,bg,border,children}) => (
    <button onClick={onClick}
      style={{flex:1,padding:'8px 12px',background:bg,color,border:`1px solid ${border}`,borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:700,position:'relative',backdropFilter:'blur(8px)',transition:'all 0.15s'}}>
      {children}
    </button>
  );

  const ProfileBtn = ({onClick,name,color}) => (
    <button onClick={onClick}
      style={{marginTop:10,padding:'7px 14px',background:`rgba(${color||'139,92,246'},0.15)`,color:`rgba(${color||'139,92,246'},1)`,border:`1px solid rgba(${color||'139,92,246'},0.3)`,borderRadius:10,cursor:'pointer',fontSize:11,fontWeight:700,position:'relative'}}>
      👤 {name?`View ${name}'s Profile`:'View Profile'}
    </button>
  );

  const UnreadDot = ({color}) => (
    <span style={{width:7,height:7,background:color,borderRadius:'50%',flexShrink:0,boxShadow:`0 0 6px ${color}`,alignSelf:'center'}}/>
  );

  return (
    <div style={{minHeight:100}}>
      {/* Full image overlay */}
      {fullImg && (
        <div onClick={()=>setFullImg(null)}
          style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.92)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:9999,cursor:'zoom-out',backdropFilter:'blur(16px)'}}>
          <img src={fullImg} alt="" style={{maxWidth:'90%',maxHeight:'90%',borderRadius:12}}/>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <button onClick={e=>withRipple(e,()=>onBack())}
          style={{background:'none',border:'none',color:N.muted,cursor:'pointer',fontWeight:700,fontSize:13,padding:0,position:'relative'}}>
          ← Back
        </button>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:10,color:N.muted,letterSpacing:1,textTransform:'uppercase'}}>{allNotifs.length} notifications</span>
          {allNotifs.length>0 && <div style={{width:5,height:5,borderRadius:'50%',background:'rgba(147,197,253,0.4)'}}/>}
        </div>
      </div>

      {/* ── Cinematic Tab Bar ── */}
      <div style={{
        display:'flex',gap:4,marginBottom:16,
        background:'rgba(4,6,28,0.7)',
        backdropFilter:'blur(16px)',
        borderRadius:14,padding:4,
        border:'1px solid rgba(147,197,253,0.08)',
        overflowX:'auto',scrollbarWidth:'none',
      }}>
        {TABS_DEF.map(t=>(
          <button key={t.id} onClick={e=>withRipple(e,()=>{playPop();setActiveTab(t.id);})}
            style={{
              flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1,
              padding:'8px 4px',borderRadius:12,cursor:'pointer',
              fontWeight:700,fontSize:10,whiteSpace:'nowrap',position:'relative',transition:'all 0.18s',
              background:activeTab===t.id?'linear-gradient(135deg,rgba(139,92,246,0.4),rgba(59,130,246,0.3))':'transparent',
              color:activeTab===t.id?N.text:N.muted,
              boxShadow:activeTab===t.id?'0 0 14px rgba(139,92,246,0.3)':'none',
              border:activeTab===t.id?'1px solid rgba(139,92,246,0.3)':'1px solid transparent',
            }}>
            <span style={{fontSize:14,filter:activeTab===t.id?'drop-shadow(0 0 4px rgba(139,92,246,0.8))':''}}>{t.icon}</span>
            <span style={{textTransform:'uppercase',letterSpacing:0.5,fontSize:9}}>{t.label}</span>
            {t.count>0 && (
              <span style={{position:'absolute',top:-3,right:-2,background:'#ef4444',color:'#fff',borderRadius:'50%',padding:'1px 4px',fontSize:8,fontWeight:800,border:'1.5px solid rgba(4,6,28,0.9)',lineHeight:1.4}}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Notification list ── */}
      <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:440,overflowY:'auto',paddingRight:2,scrollbarWidth:'thin',scrollbarColor:'rgba(139,92,246,0.3) transparent'}}>

        {display.length===0 ? (
          <div style={{textAlign:'center',padding:'50px 20px',background:'rgba(5,8,35,0.4)',backdropFilter:'blur(12px)',borderRadius:20,border:'1px solid rgba(147,197,253,0.08)'}}>
            <p style={{fontSize:44,margin:'0 0 10px'}}>🔔</p>
            <p style={{fontSize:14,color:N.muted}}>No notifications yet.</p>
            <p style={{fontSize:11,color:'rgba(147,197,253,0.25)',marginTop:4}}>♪ Your creative journey begins here ♪</p>
          </div>
        ) : display.map((item,idx) => {

          /* ══ BID NOTIFICATION ══ */
          if (item._type==='bid') {
            const ok = item.type==='bid_approved';
            const scheme = ok ? N.green : N.red;
            return (
              <Card key={item.firebaseKey||idx} accentColor={ok?'#10b981':'#ef4444'} unread={!item.read}
                onClick={()=>{ if(!item.read&&item.firebaseKey){playChime();markBidNotifRead(item.firebaseKey);} }}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <span style={{fontSize:28,flexShrink:0,filter:`drop-shadow(0 0 6px ${scheme.text})`}}>{ok?'🎉':'❌'}</span>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:14,fontWeight:800,color:scheme.text,fontFamily:'Georgia,serif'}}>
                      {ok?'🥳 Bid Approved!':'❌ Bid Not Approved'}
                    </p>
                    <p style={{margin:'5px 0 0',fontSize:12,color:N.muted,lineHeight:1.5}}>{item.message}</p>
                    <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,background:scheme.bg,color:scheme.text,padding:'3px 10px',borderRadius:20,fontWeight:700,border:`1px solid ${scheme.border}`}}>{item.category}</span>
                      <span style={{fontSize:10,background:N.purple.bg,color:N.purple.text,padding:'3px 10px',borderRadius:20,fontWeight:700,border:`1px solid ${N.purple.border}`}}>
                        {item.tokens===5?'🥇 Top':'🥈 2nd'} · ${item.amount}
                      </span>
                    </div>
                    <div style={{fontSize:9,color:'rgba(147,197,253,0.3)',marginTop:6,letterSpacing:0.5}}>{fTime(item.timestamp)}</div>
                  </div>
                  {!item.read && <UnreadDot color={scheme.text}/>}
                </div>
              </Card>
            );
          }

          /* ══ FOLLOW ══ */
          if (item._type==='follow') return (
            <Card key={item.firebaseKey||idx} accentColor='#f472b6' unread={!item.read}
              onClick={()=>{ if(!item.read&&item.firebaseKey){playChime();markFollowNotifRead(item.firebaseKey);} }}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <img src={item.followerPic||'/icon.png'} alt=""
                  style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(244,114,182,0.4)',flexShrink:0,cursor:'pointer'}}
                  onClick={e=>{e.stopPropagation();goToProfile(item.followerEmail,item.followerName,item.followerPic,item.followerRole||'');}}/>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:13,color:N.text,lineHeight:1.4}}>
                    <strong style={{color:'#f472b6',cursor:'pointer'}}
                      onClick={e=>{e.stopPropagation();goToProfile(item.followerEmail,item.followerName,item.followerPic,item.followerRole||'');}}>
                      {item.followerName}
                    </strong>
                    {item.followerProfession&&<span style={{color:N.muted,fontStyle:'italic'}}> · {item.followerProfession}</span>}
                    <span style={{color:N.muted}}> started following you! ❤️</span>
                  </p>
                  <div style={{fontSize:9,color:'rgba(147,197,253,0.3)',marginTop:4,letterSpacing:0.5}}>{fTime(item.timestamp)}</div>
                </div>
                {!item.read && <UnreadDot color='#f472b6'/>}
              </div>
              <ProfileBtn onClick={e=>{e.stopPropagation();goToProfile(item.followerEmail,item.followerName,item.followerPic,item.followerRole||'');}} color='236,72,153'/>
            </Card>
          );

          /* ══ TALENT CONTACT ══ */
          if (item._type==='talent') {
            const isIncoming = item.ownerPath===emailKey;
            const isOutgoingApprovedUnread = !isIncoming&&item.status==='approved'&&!item.read;
            const scheme = sScheme(item.status);

            return (
              <Card key={item.firebaseKey||idx} accentColor={scheme.text} unread={item.status==='pending'||isOutgoingApprovedUnread}
                onClick={()=>{ if(isOutgoingApprovedUnread){playChime();markTalentNotifRead(item);} }}>

                {/* Delete button */}
                <button onClick={e=>{e.stopPropagation();deleteNotif(item,'talent');}}
                  style={{position:'absolute',top:10,right:10,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'rgba(239,68,68,0.5)',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  ✕
                </button>

                <div style={{display:'flex',alignItems:'flex-start',gap:12,paddingRight:28}}>
                  <img
                    src={isIncoming?(item.fromPic||'/icon.png'):(item.talentPic||'/icon.png')} alt=""
                    style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:`2px solid ${scheme.text}44`,flexShrink:0,cursor:'pointer'}}
                    onClick={e=>{e.stopPropagation();isIncoming?goToProfile(item.fromEmail,item.fromName,item.fromPic,item.fromProfession||''):goToProfile(item.talentEmail,item.talentName,item.talentPic,'');}}/>
                  <div style={{flex:1}}>
                    {isIncoming ? (
                      <p style={{margin:0,fontSize:13,color:N.text,lineHeight:1.4}}>
                        <strong style={{color:'#60a5fa',cursor:'pointer'}}
                          onClick={e=>{e.stopPropagation();goToProfile(item.fromEmail,item.fromName,item.fromPic,item.fromProfession||'');}}>
                          {item.fromName}
                        </strong>
                        {item.fromProfession&&<span style={{color:N.muted}}> · {item.fromProfession}</span>}
                        <span style={{color:N.muted}}> wants to contact you 📩</span>
                        <span style={{display:'block',fontSize:10,fontWeight:700,color:scheme.text,textTransform:'capitalize',marginTop:3}}>{item.status}</span>
                      </p>
                    ) : (
                      <p style={{margin:0,fontSize:13,color:N.text,lineHeight:1.4}}>
                        Your contact request to{' '}
                        <strong style={{color:'#60a5fa',cursor:'pointer'}}
                          onClick={e=>{e.stopPropagation();goToProfile(item.talentEmail,item.talentName,item.talentPic,'');}}>
                          {item.talentName}
                        </strong>{' '}
                        is <strong style={{color:scheme.text}}>{item.status}</strong>!
                      </p>
                    )}
                    <div style={{fontSize:9,color:'rgba(147,197,253,0.3)',marginTop:4,letterSpacing:0.5}}>{fTime(item.timestamp)}</div>
                  </div>
                  {isOutgoingApprovedUnread && <UnreadDot color={N.green.text}/>}
                </div>

                {/* Clear message box */}
                {item.message && <MsgBox text={item.message}/>}

                {isIncoming && (
                  <ProfileBtn onClick={e=>{e.stopPropagation();goToProfile(item.fromEmail,item.fromName,item.fromPic,item.fromProfession||'');}} color='99,102,241'/>
                )}
                {isIncoming && item.status==='pending' && (
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <AccBtn onClick={e=>{e.stopPropagation();updateTalentRequest(item,'approved');}} color={N.green.text} bg={N.green.bg} border={N.green.border}>✅ Accept</AccBtn>
                    <AccBtn onClick={e=>{e.stopPropagation();updateTalentRequest(item,'declined');}} color={N.red.text}   bg={N.red.bg}   border={N.red.border}>❌ Decline</AccBtn>
                  </div>
                )}
                {isIncoming && item.status==='approved' && <p style={{fontSize:12,color:N.green.text,margin:'8px 0 0'}}>✅ Your contact info has been shared.</p>}

                {!isIncoming && item.status==='pending' && <p style={{fontSize:12,color:N.yellow.text,margin:'8px 0 0'}}>⏳ Waiting for approval...</p>}
                {!isIncoming && item.status==='declined' && <p style={{fontSize:12,color:N.red.text,margin:'8px 0 0'}}>❌ Your request was declined.</p>}
                {!isIncoming && (
                  <ProfileBtn onClick={e=>{e.stopPropagation();goToProfile(item.talentEmail,item.talentName,item.talentPic,'');}} name={item.talentName} color='16,185,129'/>
                )}
              </Card>
            );
          }

          /* ══ STORY ══ */
          if (item._type==='story') {
            const scheme = sScheme(item.status);
            return (
              <Card key={item.firebaseKey||idx} accentColor={scheme.text} unread={item.status==='pending'}>
                <button onClick={()=>deleteNotif(item,'story')}
                  style={{position:'absolute',top:10,right:10,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'rgba(239,68,68,0.5)',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  ✕
                </button>

                <div style={{display:'flex',alignItems:'flex-start',gap:12,paddingRight:28}}>
                  <img src={isWriter?(item.fromPic||'/icon.png'):(item.writerPic||'/icon.png')} alt=""
                    style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',border:`2px solid ${scheme.text}44`,flexShrink:0,cursor:isWriter?'pointer':'default'}}
                    onClick={()=>{ if(isWriter) goToProfile(item.fromEmail,item.fromName,item.fromPic,''); }}/>
                  <div style={{flex:1}}>
                    {isWriter ? (
                      <p style={{margin:0,fontSize:13,color:N.text,lineHeight:1.4}}>
                        <strong style={{color:'#a78bfa',cursor:'pointer',fontFamily:'Georgia,serif'}}
                          onClick={()=>goToProfile(item.fromEmail,item.fromName,item.fromPic,'')}>
                          {item.fromName}
                        </strong>
                        <span style={{color:N.muted}}> requested </span>
                        <strong style={{color:N.text}}>{getTypeText(item)}</strong>
                        <span style={{color:N.muted}}> of </span>
                        <strong style={{color:'#a78bfa',fontStyle:'italic',fontFamily:'Georgia,serif'}}>"{item.storyTitle}"</strong>
                        <span style={{display:'block',fontSize:10,fontWeight:700,color:scheme.text,textTransform:'capitalize',marginTop:3}}>{item.status}</span>
                      </p>
                    ) : (
                      <p style={{margin:0,fontSize:13,color:N.text,lineHeight:1.4}}>
                        <strong style={{color:'#a78bfa',fontStyle:'italic',fontFamily:'Georgia,serif'}}>"{item.storyTitle}"</strong>
                        <span style={{color:N.muted}}> — </span>
                        <strong style={{color:N.text}}>{getTypeText(item)}</strong>
                        <span style={{color:N.muted}}> is </span>
                        <strong style={{color:scheme.text}}>{item.status}</strong>!
                      </p>
                    )}
                    <div style={{fontSize:9,color:'rgba(147,197,253,0.3)',marginTop:4,letterSpacing:0.5}}>{fTime(item.timestamp)}</div>
                  </div>
                </div>

                {/* Clear note box */}
                {item.note && <MsgBox text={item.note}/>}

                {isWriter && item.status==='pending' && (
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <AccBtn onClick={()=>{playChime();updateStoryStatus(item,'approved');}} color={N.green.text} bg={N.green.bg} border={N.green.border}>✅ Approve</AccBtn>
                    <AccBtn onClick={()=>updateStoryStatus(item,'declined')} color={N.red.text} bg={N.red.bg} border={N.red.border}>❌ Decline</AccBtn>
                  </div>
                )}
                {isWriter && (
                  <ProfileBtn onClick={()=>goToProfile(item.fromEmail,item.fromName,item.fromPic,'')} color='139,92,246'/>
                )}
                {!isWriter && item.status==='approved' && (
                  <button onClick={()=>{playChime();setActiveStoryId(item.storyId);update(ref(db,`requests/${item.ownerPath}/${item.firebaseKey}`),{read:true});onBack();}}
                    style={{marginTop:10,padding:'8px 14px',background:N.purple.bg,color:N.purple.text,border:`1px solid ${N.purple.border}`,borderRadius:10,cursor:'pointer',fontSize:11,fontWeight:700}}>
                    📜 View Story
                  </button>
                )}
              </Card>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default NotificationSystem;