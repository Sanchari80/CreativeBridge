import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ref, onValue } from "firebase/database";
import { db } from '../App.jsx';

const TABS = [
  { id:'following', label:'⭐ Following',  color:'#fdcb6e' },
  { id:'writer',    label:'✍️ Writers',    color:'#4834d4' },
  { id:'singer',    label:'🎤 Music',      color:'#00b894' },
  { id:'painter',   label:'🎨 Art',        color:'#e17055' },
  { id:'actor',     label:'🎬 Actors',     color:'#f39c12' },
  { id:'dancer',    label:'💃 Dancers',    color:'#fd79a8' },
  { id:'requests',  label:'📋 Requests',   color:'#6c5ce7' },
];
const GENRES = ["All","Thriller","Romance","Drama","Action","Comedy","Horror","Sci-Fi","Saved"];

export default function CommonDashboard() {
  const {
    user, stories, setStories, requests,
    activeStoryId, setActiveStoryId, deleteStory, sendRequest,
    talentRequests, sendTalentRequest,
    follows, followTalent, unfollowTalent, isFollowing,
    promotedWorks, submitBid, bids,
  } = useContext(AppContext);

  const [activeTab,       setActiveTab]       = useState('writer');
  const [talents,         setTalents]         = useState({singer:[],painter:[],actor:[],dancer:[]});
  const [expandedStory,   setExpandedStory]   = useState(null);
  const [storyModal,      setStoryModal]      = useState(null);
  const [directorNote,    setDirectorNote]    = useState('');
  const [selectedGenre,   setSelectedGenre]   = useState('All');
  const [savedStories,    setSavedStories]    = useState(()=>{
    const s=localStorage.getItem('savedStories'); return s?JSON.parse(s):[];
  });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [contactModal,    setContactModal]    = useState(null);
  const [contactMsg,      setContactMsg]      = useState('');
  const [bidModal,        setBidModal]        = useState(null);

  const isOwnProfile = e => e?.toLowerCase()===user?.email?.toLowerCase();
  const followedKeys   = Object.keys(follows||{});
  const followedEmails = followedKeys.map(k=>k.replace(/,/g,'.'));

  useEffect(()=>{
    const u=onValue(ref(db,'stories'),snap=>{
      const d=snap.val();
      setStories(d?Object.entries(d).map(([k,v])=>({...v,id:k})).reverse():[]);
    });
    return()=>u();
  },[setStories]);

  useEffect(()=>{
    const cats=['singer','painter','actor','dancer'];
    const subs=[];
    cats.forEach(cat=>{
      const u=onValue(ref(db,`talents/${cat}`),snap=>{
        const d=snap.val();
        setTalents(prev=>({...prev,[cat]:d?Object.entries(d).map(([ek,p])=>({
          ...p,emailKey:ek,email:ek.replace(/,/g,'.'),category:cat
        })):[]}));
      });
      subs.push(u);
    });
    return()=>subs.forEach(u=>u());
  },[]);

  useEffect(()=>{
    if(activeStoryId){
      setActiveTab('writer');setSelectedGenre('All');
      setExpandedStory(activeStoryId);setActiveStoryId(null);
    }
  },[activeStoryId,setActiveStoryId]);

  // Writer profiles from stories
  const writerProfiles = React.useMemo(()=>{
    const map={};
    stories.forEach(s=>{
      const key=(s.writerEmail||s.email||'').toLowerCase();
      if(!key) return;
      if(!map[key]){
        map[key]={
          email:key, emailKey:key.replace(/\./g,','),
          name:s.writerName||'Unknown',
          profilePic:s.writerPic||'/icon.png',
          profession:s.writerProfession||'Writer',
          category:'writer', storyCount:0, genres:[],
        };
      }
      map[key].storyCount++;
      if(s.genre&&!map[key].genres.includes(s.genre)) map[key].genres.push(s.genre);
    });
    return Object.values(map);
  },[stories]);

  // Helpers
  const toggleSave=id=>{
    const n=savedStories.includes(id)?savedStories.filter(i=>i!==id):[...savedStories,id];
    setSavedStories(n); localStorage.setItem('savedStories',JSON.stringify(n));
  };

  const handleStoryRequest=()=>{
    if(!directorNote.trim()) return alert("Please send your portfolio link or identity for verification!");
    if(!storyModal||!user) return;
    const {story,type}=storyModal;
    sendRequest(story.writerEmail||story.email,story.Name||story.title,story.id,type,directorNote);
    setStoryModal(null); setDirectorNote('');
  };

  const getReqStatus=email=>{
    if(!email) return null;
    return talentRequests?.find(r=>
      r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()&&
      r.talentEmail?.toLowerCase()===email?.toLowerCase()
    )?.status||null;
  };

  const getRevealedContact=email=>{
    if(!email) return null;
    return talentRequests?.find(r=>
      r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()&&
      r.talentEmail?.toLowerCase()===email?.toLowerCase()&&
      r.status==='approved'
    )?.revealedContact||null;
  };

  // ── FIXED: handleSendContact with proper error handling ──
  const handleSendContact=async()=>{
    if(!contactMsg.trim()) return alert("Please write your identity and purpose!");
    if(!contactModal) return;

    const talentEmail = contactModal.email || contactModal.profile?.email;
    const talentName  = contactModal.profile?.name || contactModal.name || 'Unknown';

    if(!talentEmail){
      return alert("Talent's email could not be found. Please try again.");
    }

    try {
      await sendTalentRequest(talentEmail, talentName, contactMsg);
      setContactMsg('');
      setContactModal(null);
    } catch(e) {
      alert("Request failed: " + (e?.message || 'Unknown error'));
    }
  };

  const openContactModal = (p) => {
    if(!p) return;
    setContactModal(p);
  };

  const getPromoTokens=(category,workId,emailKey)=>{
    const key=`${emailKey}_${workId}`;
    return promotedWorks?.[category]?.[key]?.tokens||0;
  };

  const sortWithPromo=(list,category)=>[...list].sort((a,b)=>{
    const aP=getPromoTokens(category,a.id,a.emailKey||a.uploaderEmail?.replace(/\./g,','));
    const bP=getPromoTokens(category,b.id,b.emailKey||b.uploaderEmail?.replace(/\./g,','));
    if(bP!==aP) return bP-aP;
    const aF=followedEmails.includes((a.uploaderEmail||a.email||'').toLowerCase())?1:0;
    const bF=followedEmails.includes((b.uploaderEmail||b.email||'').toLowerCase())?1:0;
    if(bF!==aF) return bF-aF;
    return (b.uploadedAt||b.timestamp||0)-(a.uploadedAt||a.timestamp||0);
  });

  const getFlatWorks=(cat)=>{
    const list=[];
    (talents[cat]||[]).forEach(t=>{
      const folder=cat==='painter'?'artworks':cat==='singer'?'songs':'videos';
      Object.entries(t[folder]||{}).forEach(([wid,w])=>{
        list.push({
          ...w, id:wid, emailKey:t.emailKey,
          uploaderEmail:t.email,
          uploaderName:t.profile?.name||t.name||'Unknown',
          uploaderPic:t.profile?.profilePic||t.profilePic||'/icon.png',
          category:cat, talentProfile:t
        });
      });
    });
    return sortWithPromo(list,cat);
  };

  const filteredStories=sortWithPromo(
    stories.filter(s=>selectedGenre==='Saved'?savedStories.includes(s.id):selectedGenre==='All'?true:s.genre===selectedGenre),
    'writer'
  );

  const myRequestedWorks=talentRequests?.filter(r=>
    r.fromEmail?.toLowerCase()===user?.email?.toLowerCase()
  )||[];

  const followingStories=stories.filter(s=>followedEmails.includes((s.writerEmail||s.email||'').toLowerCase()));
  const followingTalents=[...talents.singer,...talents.painter,...talents.actor,...talents.dancer]
    .filter(t=>followedEmails.includes(t.email));

  // ═══════════════════════════════════════════════════
  // STORY DETAIL VIEW
  // ═══════════════════════════════════════════════════
  if(expandedStory){
    const s=stories.find(i=>i.id===expandedStory);
    if(!s){setExpandedStory(null);return null;}
    const isOwner=s.writerEmail===user?.email||s.email===user?.email;
    const chk=type=>requests?.find(r=>r.storyId===s.id&&r.fromEmail===user?.email&&r.status==='approved'&&r.requestType===type);
    const hasSyn=!s.isSynopsisLocked||chk('synopsis')||isOwner;
    const hasFull=!s.isFullStoryLocked||chk('fullStory')||isOwner;
    const hasCon=!s.isContactLocked||chk('contact')||isOwner;
    const writerEmail=(s.writerEmail||s.email||'').toLowerCase();
    const iFollow=isFollowing(writerEmail);
    const promoT=getPromoTokens('writer',s.id,writerEmail.replace(/\./g,','));
    // Writer profile for "View Profile" button
    const wProfile=writerProfiles.find(p=>p.email===writerEmail);

    return(
      <div style={{padding:16,maxWidth:800,margin:'0 auto'}}>
        {storyModal&&<StoryModal modal={storyModal} note={directorNote} setNote={setDirectorNote} onSend={handleStoryRequest} onClose={()=>{setStoryModal(null);setDirectorNote('');}}/>}

        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
          <button onClick={()=>setExpandedStory(null)} style={backBtn}>← Back</button>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {promoT>0&&<span style={promoT===5?goldBadge:silverBadge}>{promoT===5?'🥇 Top':'🥈'}</span>}
            {!isOwner&&wProfile&&(
              <button onClick={()=>{setExpandedStory(null);setSelectedProfile(wProfile);}} style={{...followBtn,background:'#4834d4',color:'#fff'}}>
                👤 View Profile
              </button>
            )}
            {!isOwner&&<button onClick={()=>iFollow?unfollowTalent(writerEmail):followTalent(writerEmail,s.writerName,s.writerPic||'/icon.png')} style={{...followBtn,background:iFollow?'#f1f2f6':'#fdcb6e'}}>{iFollow?'✓ Following':'+ Follow'}</button>}
            {isOwner&&<button onClick={()=>setBidModal({work:{...s},category:'writer'})} style={{...followBtn,background:'#a29bfe',color:'#fff'}}>💰 Bid</button>}
            {isOwner&&<button onClick={()=>{deleteStory(s.id);setExpandedStory(null);}} style={{...followBtn,background:'#ff4757',color:'#fff'}}>Delete</button>}
          </div>
        </div>

        <div style={card}>
          <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
            <img src={isOwner?(user?.profilePic||'/icon.png'):(s.writerPic||'/icon.png')} alt="" style={av45}/>
            <div style={{marginLeft:12,flex:1}}>
              <strong style={{cursor:wProfile&&!isOwner?'pointer':'default',color:wProfile&&!isOwner?'#4834d4':'#2d3436'}}
                onClick={()=>{if(wProfile&&!isOwner){setExpandedStory(null);setSelectedProfile(wProfile);}}}>
                {s.writerName||'Unknown Writer'}
              </strong>
              <div style={chip}>{s.genre}</div>
            </div>
            <button onClick={()=>toggleSave(s.id)} style={iconBtn}>{savedStories.includes(s.id)?'❤️':'🤍'}</button>
          </div>
          <h2 style={{color:'#4834d4',margin:'0 0 6px'}}>{s.Name}</h2>
          <p style={{fontWeight:600,color:'#2d3436',marginBottom:12}}>{s.logline}</p>
          <div style={{marginTop:16,padding:14,background:'#f8f9fa',borderRadius:12}}>
            <LS label="Synopsis / Outline" locked={!hasSyn} onReq={()=>setStoryModal({story:s,type:'synopsis'})} reqLabel="Request Access">
              <p style={{fontSize:14,whiteSpace:'pre-wrap',margin:0}}>{s.synopsis||'No synopsis provided.'}</p>
            </LS>
            <LS label="Full Story / Script" locked={!hasFull} onReq={()=>setStoryModal({story:s,type:'fullStory'})} reqLabel="Request Script" div>
              {s.fullStoryFile?<a href={s.fullStoryFile.startsWith('http')?s.fullStoryFile:`https://${s.fullStoryFile}`} target="_blank" rel="noreferrer" style={linkS}>🔗 View Full Story</a>:<span style={{color:'#aaa',fontSize:13}}>No link provided</span>}
            </LS>
            <LS label="Writer's Info & Portfolio" locked={!hasCon} onReq={()=>setStoryModal({story:s,type:'contact'})} reqLabel="Request Contact" div>
              <div style={{fontSize:13,display:'flex',flexDirection:'column',gap:4}}>
                <p style={{margin:0}}>📧 {s.contactEmail||s.writerEmail||s.email}</p>
                {s.contactPhone&&<p style={{margin:0}}>📞 {s.contactPhone}</p>}
                {s.portfolio&&<p style={{margin:0}}>🌐 <a href={s.portfolio.startsWith('http')?s.portfolio:`https://${s.portfolio}`} target="_blank" rel="noreferrer" style={{color:'#6c5ce7'}}>{s.portfolio}</a></p>}
              </div>
            </LS>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // TALENT / WRITER PROFILE DETAIL
  // ═══════════════════════════════════════════════════
  if(selectedProfile){
    const p=selectedProfile;
    const tabObj=TABS.find(t=>t.id===p.category);
    const status=getReqStatus(p.email);
    const contact=getRevealedContact(p.email);
    const isMe=isOwnProfile(p.email);
    const iFollow=isFollowing(p.email);
    const name=p.profile?.name||p.name||'Unknown';
    const pic=p.profile?.profilePic||p.profilePic||'/icon.png';
    const writerStories=p.category==='writer'?stories.filter(s=>(s.writerEmail||s.email||'').toLowerCase()===p.email):[];

    return(
      <div style={{maxWidth:720,margin:'0 auto',padding:16}}>
        {/* Contact Modal — must be here for selectedProfile view */}
        {contactModal&&(
          <ContactModal
            talent={contactModal}
            msg={contactMsg}
            setMsg={setContactMsg}
            onSend={handleSendContact}
            onClose={()=>{setContactModal(null);setContactMsg('');}}
          />
        )}

        <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <button onClick={()=>setSelectedProfile(null)} style={backBtn}>← Back</button>
          {!isMe&&(
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>iFollow?unfollowTalent(p.email):followTalent(p.email,name,pic)}
                style={{...followBtn,background:iFollow?'#f1f2f6':'#fdcb6e'}}>
                {iFollow?'✓ Following':'+ Follow'}
              </button>
            </div>
          )}
        </div>

        <div style={card}>
          {/* Profile Header */}
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16,flexWrap:'wrap'}}>
            <img src={pic} alt="" style={{width:76,height:76,borderRadius:'50%',objectFit:'cover',border:'3px solid #eee',flexShrink:0}}/>
            <div style={{flex:1}}>
              <h2 style={{margin:'0 0 4px',color:'#2d3436'}}>{name}</h2>
              <span style={{...chip,background:(tabObj?.color||'#eee')+'22',color:tabObj?.color,fontSize:12}}>{tabObj?.label}</span>
              {(p.profile?.address||p.address)&&<p style={{margin:'4px 0 0',fontSize:13,color:'#636e72'}}>📍 {p.profile?.address||p.address}</p>}
              {(p.profile?.profession||p.profession)&&<p style={{margin:'2px 0 0',fontSize:13,color:'#636e72'}}>💼 {p.profile?.profession||p.profession}</p>}
            </div>
            {/* Contact Request Button */}
            {!isMe&&(
              <div>
                {status===null&&(
                  <button
                    onClick={()=>openContactModal(p)}
                    style={reqBtn}
                  >
                    📩 Send Contact Request
                  </button>
                )}
                {status==='pending'&&<div style={pChip}>⏳ Request Pending</div>}
                {status==='approved'&&<div style={aChip}>✅ Accepted</div>}
                {status==='declined'&&<div style={dChip}>❌ Declined</div>}
              </div>
            )}
            {isMe&&<span style={{fontSize:12,color:'#636e72',background:'#f1f2f6',padding:'5px 12px',borderRadius:20}}>👤 Your Profile</span>}
          </div>

          {p.profile?.bio&&<p style={{fontSize:14,background:'#f8f9fa',padding:12,borderRadius:10,margin:'0 0 14px'}}>{p.profile.bio}</p>}

          {/* Contact Info Section */}
          <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #eee'}}>
            <p style={secLbl}>Contact Information</p>
            {(isMe||contact)?(
              <div style={{fontSize:13,display:'flex',flexDirection:'column',gap:5}}>
                {(contact?.email||(isMe&&user?.email))&&<p style={{margin:0}}>📧 {contact?.email||user?.email}</p>}
                {(contact?.phone||(isMe&&user?.phone))&&<p style={{margin:0}}>📞 {contact?.phone||user?.phone}</p>}
                {(contact?.whatsapp||(isMe&&user?.whatsapp))&&<p style={{margin:0}}>💬 {contact?.whatsapp||user?.whatsapp}</p>}
                {(contact?.facebook||(isMe&&user?.facebook))&&<p style={{margin:0}}>👤 <a href={contact?.facebook||user?.facebook} target="_blank" rel="noreferrer" style={{color:'#4834d4'}}>{contact?.facebook||user?.facebook}</a></p>}
              </div>
            ):(
              <div style={lockedRow}>
                <span style={{fontSize:13,color:'#636e72'}}>🔒 Contact info locked</span>
                {status===null&&(
                  <button onClick={()=>openContactModal(p)} style={smallReq}>
                    Request Access
                  </button>
                )}
                {status==='pending'&&<span style={{fontSize:12,color:'#f39c12'}}>⏳ Waiting for approval...</span>}
              </div>
            )}
          </div>

          {/* Writer: Stories */}
          {p.category==='writer'&&writerStories.length>0&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #eee'}}>
              <p style={secLbl}>Stories ({writerStories.length})</p>
              {writerStories.map(s=>(
                <div key={s.id} style={{padding:'10px 12px',background:'#f8f9fa',borderRadius:10,marginBottom:8,cursor:'pointer'}}
                  onClick={()=>{setSelectedProfile(null);setExpandedStory(s.id);}}>
                  <div style={{fontWeight:700,color:'#4834d4',fontSize:14}}>{s.Name}</div>
                  <div style={{fontSize:12,color:'#636e72'}}>{s.genre} · {s.logline?.slice(0,60)}...</div>
                </div>
              ))}
            </div>
          )}

          {/* Singer: Songs */}
          {p.category==='singer'&&p.songs&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #eee'}}>
              <p style={secLbl}>Songs ({Object.keys(p.songs).length})</p>
              {Object.values(p.songs).map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'#f8f9fa',padding:10,borderRadius:10,marginBottom:8}}>
                  <div style={{flex:'0 0 auto'}}>
                    <div style={{fontWeight:600,fontSize:13}}>{s.title}</div>
                    <div style={{fontSize:11,color:'#636e72'}}>{s.genre}</div>
                  </div>
                  <audio controls src={s.fileUrl} style={{flex:1,height:32,minWidth:0}}/>
                </div>
              ))}
            </div>
          )}

          {/* Painter: Artworks */}
          {p.category==='painter'&&p.artworks&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #eee'}}>
              <p style={secLbl}>Artworks 🔒 ({Object.keys(p.artworks).length})</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
                {Object.values(p.artworks).map((a,i)=><ProtImg key={i} src={a.fileUrl} title={a.title}/>)}
              </div>
            </div>
          )}

          {/* Actor/Dancer: Videos */}
          {(p.category==='actor'||p.category==='dancer')&&p.videos&&(
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #eee'}}>
              <p style={secLbl}>{p.category==='actor'?'Videos':'Dance Videos'} ({Object.keys(p.videos).length})</p>
              {Object.values(p.videos).map((v,i)=>(
                <div key={i} style={{marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:5}}>{v.title}</div>
                  <video controls src={v.fileUrl} style={{width:'100%',borderRadius:10,maxHeight:220}}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // BID MODAL
  // ═══════════════════════════════════════════════════
  const BidModal=({work,category,onClose})=>{
    const [tokens,setTokens]=useState(5);
    const myBid=bids?.find(b=>b.workId===work.id&&b.userEmail===user?.email&&b.status!=='rejected');
    if(myBid) return(
      <div style={moOverlay} onClick={onClose}>
        <div style={moBox} onClick={e=>e.stopPropagation()}>
          <h3 style={{marginTop:0}}>💰 Bid Status</h3>
          <p style={{fontSize:14}}>Status: <strong style={{color:myBid.status==='approved'?'#2ecc71':'#f39c12',textTransform:'capitalize'}}>{myBid.status}</strong></p>
          {myBid.status==='approved'&&<p style={{fontSize:13,color:'#2ecc71'}}>✅ Your work is promoted!</p>}
          {myBid.status==='pending'&&<p style={{fontSize:13,color:'#636e72'}}>⏳ Awaiting admin approval.</p>}
          <button onClick={onClose} style={{...submitBtn,marginTop:8}}>Close</button>
        </div>
      </div>
    );
    return(
      <div style={moOverlay} onClick={onClose}>
        <div style={moBox} onClick={e=>e.stopPropagation()}>
          <h3 style={{marginTop:0}}>💰 Promote Your Work</h3>
          <p style={{fontSize:13,color:'#636e72',marginBottom:14}}>"{work.title||work.Name}" — Will be displayed at the top of the dashboard.</p>
          <div style={{display:'flex',gap:10,marginBottom:16}}>
            {[{t:5,price:'$5',label:'First priority',emoji:'🥇',active:'#fdcb6e'},{t:2,price:'$2',label:'Second priority',emoji:'🥈',active:'#b2bec3'}].map(opt=>(
              <div key={opt.t} onClick={()=>setTokens(opt.t)} style={{flex:1,padding:14,borderRadius:12,border:`2px solid ${tokens===opt.t?opt.active:'#eee'}`,cursor:'pointer',textAlign:'center',background:tokens===opt.t?'#fffbee':'#fff'}}>
                <div style={{fontSize:20}}>{opt.emoji}</div>
                <div style={{fontWeight:700,fontSize:14}}>{opt.t} Tokens</div>
                <div style={{fontSize:12,color:'#636e72'}}>{opt.price}</div>
                <div style={{fontSize:11,color:'#00b894',marginTop:4}}>{opt.label}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff9db',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#636e72',marginBottom:14}}>
            ℹ️ Your bid will be reviewed by the admin. If approved, your work will be promoted on the dashboard for more visibility. You can only have one active bid per work.
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:10,borderRadius:10,border:'1px solid #eee',cursor:'pointer',background:'#f8f9fa'}}>Cancel</button>
            <button onClick={()=>{submitBid(category,work.id||work.Name,work.title||work.Name,tokens);onClose();}} style={{flex:1,padding:10,borderRadius:10,border:'none',background:'#2d3436',color:'#fff',cursor:'pointer',fontWeight:'bold'}}>
              Submit ({tokens===5?'5$':'2$'})
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════
  // MAIN BROWSE
  // ═══════════════════════════════════════════════════
  const tabCount={requests:myRequestedWorks.length,following:followedKeys.length};

  return(
    <div>
      {bidModal&&<BidModal work={bidModal.work} category={bidModal.category} onClose={()=>setBidModal(null)}/>}
      {contactModal&&(
        <ContactModal
          talent={contactModal}
          msg={contactMsg}
          setMsg={setContactMsg}
          onSend={handleSendContact}
          onClose={()=>{setContactModal(null);setContactMsg('');}}
        />
      )}
      {storyModal&&<StoryModal modal={storyModal} note={directorNote} setNote={setDirectorNote} onSend={handleStoryRequest} onClose={()=>{setStoryModal(null);setDirectorNote('');}}/>}

      {/* Tab Bar */}
      <div style={{display:'flex',gap:6,overflowX:'auto',padding:'14px 14px 0',background:'rgba(255,255,255,0.85)'}}>
        {TABS.map(t=>{
          const cnt=tabCount[t.id];
          const isAct=activeTab===t.id;
          return(
            <button key={t.id}
              onClick={()=>{setActiveTab(t.id);setSelectedProfile(null);setExpandedStory(null);}}
              style={{padding:'9px 15px',borderRadius:20,border:`2px solid ${isAct?t.color:t.color+'55'}`,cursor:'pointer',fontWeight:700,fontSize:12,whiteSpace:'nowrap',background:isAct?t.color:'#fff',color:isAct?'#fff':t.color,position:'relative',transition:'all 0.15s'}}>
              {t.label}
              {cnt>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#ff4757',color:'#fff',borderRadius:'50%',padding:'1px 5px',fontSize:9,fontWeight:800,border:'1.5px solid #fff'}}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* FOLLOWING TAB */}
      {activeTab==='following'&&(
        <div style={{padding:16}}>
          {followedKeys.length===0?<Empty emoji="⭐" text="No one followed yet"/>:(
            <div>
              {followingStories.length>0&&(
                <div style={{marginBottom:20}}>
                  <h4 style={{color:'#4834d4',margin:'0 0 12px',fontSize:14}}>✍️ Writers' Stories</h4>
                  <div style={grid}>
                    {followingStories.map(s=>{
                      const wE=(s.writerEmail||s.email||'').toLowerCase();
                      const wP=writerProfiles.find(p=>p.email===wE);
                      return <SCard key={s.id} s={s} user={user} saved={savedStories} toggleSave={toggleSave}
                        onView={()=>setExpandedStory(s.id)} onDelete={deleteStory}
                        isFollowing={isFollowing}
                        onFollow={()=>isFollowing(wE)?unfollowTalent(wE):followTalent(wE,s.writerName,s.writerPic||'/icon.png')}
                        onViewProfile={wP&&!isOwnProfile(wE)?()=>setSelectedProfile(wP):null}
                        promoTokens={getPromoTokens('writer',s.id,wE.replace(/\./g,','))}
                        onBid={isOwnProfile(wE)?()=>setBidModal({work:{...s},category:'writer'}):null}/>;
                    })}
                  </div>
                </div>
              )}
              {followingTalents.length>0&&(
                <div>
                  <h4 style={{color:'#2d3436',margin:'0 0 12px',fontSize:14}}>🎭 Talents</h4>
                  <div style={grid}>
                    {followingTalents.map((p,i)=>(
                      <TCard key={i} p={p} user={user} TABS={TABS} getReqStatus={getReqStatus}
                        isFollowing={isFollowing} onView={()=>setSelectedProfile(p)}
                        onContact={()=>openContactModal(p)}
                        onFollow={()=>followTalent(p.email,p.profile?.name||p.name,p.profile?.profilePic||p.profilePic||'/icon.png')}
                        onUnfollow={()=>unfollowTalent(p.email)}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* WRITER TAB */}
      {activeTab==='writer'&&(
        <div>
          <div style={{display:'flex',gap:8,padding:'10px 14px',overflowX:'auto',background:'rgba(255,255,255,0.7)'}}>
            {GENRES.map(g=><button key={g} onClick={()=>setSelectedGenre(g)} style={{padding:'6px 14px',borderRadius:20,border:'1px solid #eee',cursor:'pointer',whiteSpace:'nowrap',fontSize:12,fontWeight:500,background:selectedGenre===g?'#2d3436':'#fff',color:selectedGenre===g?'#fff':'#2d3436'}}>{g}</button>)}
          </div>
          {filteredStories.length===0?<Empty emoji="📝" text={selectedGenre==='Saved'?'No saved stories.':'No stories in this category.'}/>:(
            <div style={grid}>
              {filteredStories.map(s=>{
                const wE=(s.writerEmail||s.email||'').toLowerCase();
                const wP=writerProfiles.find(p=>p.email===wE);
                const isOwner=isOwnProfile(wE);
                return <SCard key={s.id} s={s} user={user} saved={savedStories} toggleSave={toggleSave}
                  onView={()=>setExpandedStory(s.id)} onDelete={deleteStory}
                  isFollowing={isFollowing}
                  onFollow={()=>isFollowing(wE)?unfollowTalent(wE):followTalent(wE,s.writerName,s.writerPic||'/icon.png')}
                  onViewProfile={wP&&!isOwner?()=>setSelectedProfile(wP):null}
                  promoTokens={getPromoTokens('writer',s.id,wE.replace(/\./g,','))}
                  onBid={isOwner?()=>setBidModal({work:{...s},category:'writer'}):null}/>;
              })}
            </div>
          )}
        </div>
      )}

      {/* SINGER / PAINTER / ACTOR / DANCER TABS */}
      {['singer','painter','actor','dancer'].includes(activeTab)&&(()=>{
        const works=getFlatWorks(activeTab);
        if(works.length===0) return <Empty emoji={TABS.find(t=>t.id===activeTab)?.label?.split(' ')[0]||'🎭'} text="No content found yet."/>;
        return(
          <div style={grid}>
            {works.map((w,i)=>{
              const isOwner=isOwnProfile(w.uploaderEmail);
              const promoT=getPromoTokens(activeTab,w.id,w.emailKey);
              const reqSt=getReqStatus(w.uploaderEmail);
              return(
                <div key={i} style={{...card,position:'relative'}}>
                  {promoT>0&&<span style={{position:'absolute',top:10,right:10,...(promoT===5?goldBadge:silverBadge)}}>{promoT===5?'🥇':'🥈'}</span>}
                  {/* Profile row — click → profile */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,cursor:'pointer'}}
                    onClick={()=>w.talentProfile&&setSelectedProfile(w.talentProfile)}>
                    <img src={w.uploaderPic||'/icon.png'} alt="" style={av45}/>
                    <div style={{flex:1}}>
                      <strong style={{fontSize:14,color:'#2d3436'}}>{w.uploaderName}</strong>
                      {w.talentProfile?.profile?.address&&<p style={{margin:'2px 0 0',fontSize:11,color:'#636e72'}}>📍 {w.talentProfile.profile.address.split(',')[0]}</p>}
                    </div>
                  </div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{w.title}</div>
                  <div style={{fontSize:12,color:'#636e72',marginBottom:8}}>{w.genre||w.style||w.type||''}</div>
                  {activeTab==='singer'&&w.fileUrl&&<audio controls src={w.fileUrl} style={{width:'100%',height:32,marginBottom:8}}/>}
                  {activeTab==='painter'&&w.fileUrl&&<ProtImg src={w.fileUrl} title={w.title} height={90}/>}
                  {(activeTab==='actor'||activeTab==='dancer')&&w.fileUrl&&(
                    <div style={{background:'#f8f9fa',borderRadius:10,padding:'8px 12px',fontSize:12,color:'#636e72',marginBottom:8,cursor:'pointer'}}
                      onClick={()=>w.talentProfile&&setSelectedProfile(w.talentProfile)}>
                      🎬 Click to view full video in profile
                    </div>
                  )}
                  <div style={{display:'flex',gap:6,alignItems:'center',marginTop:6,flexWrap:'wrap'}}>
                    <button onClick={()=>w.talentProfile&&setSelectedProfile(w.talentProfile)} style={{...actionBtn,flex:1,fontSize:12,padding:'7px'}}>
                      View Profile
                    </button>
                    {!isOwner&&(
                      <>
                        {reqSt===null&&<button onClick={()=>w.talentProfile&&openContactModal(w.talentProfile)} style={smallReq}>📩</button>}
                        {reqSt==='pending'&&<span style={pChip}>⏳</span>}
                        {reqSt==='approved'&&<span style={aChip}>✅</span>}
                        <button
                          onClick={()=>isFollowing(w.uploaderEmail)?unfollowTalent(w.uploaderEmail):followTalent(w.uploaderEmail,w.uploaderName,w.uploaderPic)}
                          style={{...followBtn,padding:'6px 10px',fontSize:11,background:isFollowing(w.uploaderEmail)?'#f1f2f6':'#fdcb6e'}}>
                          {isFollowing(w.uploaderEmail)?'✓':'+ Follow'}
                        </button>
                      </>
                    )}
                    {isOwner&&<button onClick={()=>setBidModal({work:w,category:activeTab})} style={{...followBtn,padding:'6px 10px',fontSize:11,background:'#a29bfe',color:'#fff'}}>💰 Bid</button>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* REQUESTS TAB */}
      {activeTab==='requests'&&(
        <div style={{padding:16}}>
          {myRequestedWorks.length===0?<Empty emoji="📋" text="No requests found"/>:(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {myRequestedWorks.map((r,i)=>(
                <div key={i} style={{...card,borderLeft:`4px solid ${r.status==='approved'?'#2ecc71':r.status==='declined'?'#e74c3c':'#f39c12'}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <img src={r.talentPic||'/icon.png'} alt="" style={av45}/>
                    <div style={{flex:1}}>
                      <strong>{r.talentName}</strong>
                      <div style={{fontSize:12,color:'#636e72'}}>{r.message?.slice(0,60)}</div>
                    </div>
                    <span style={{...(r.status==='approved'?aChip:r.status==='declined'?dChip:pChip),fontSize:11}}>
                      {r.status==='approved'?'✅ Accepted':r.status==='declined'?'❌ Declined':'⏳ Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub Components ── */
const SCard=({s,user,saved,toggleSave,onView,onDelete,isFollowing,onFollow,onViewProfile,promoTokens,onBid})=>{
  const isOwner=s.writerEmail===user?.email||s.email===user?.email;
  const wEmail=(s.writerEmail||s.email||'').toLowerCase();
  const iF=isFollowing?isFollowing(wEmail):false;
  return(
    <div style={{...card,position:'relative'}}>
      {promoTokens>0&&<span style={{position:'absolute',top:10,right:10,...(promoTokens===5?goldBadge:silverBadge)}}>{promoTokens===5?'🥇':'🥈'}</span>}
      <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
        {/* Avatar — click → writer profile */}
        <img src={isOwner?(user?.profilePic||'/icon.png'):(s.writerPic||'/icon.png')} alt=""
          style={{...av45,cursor:onViewProfile?'pointer':'default'}}
          onClick={onViewProfile||undefined}/>
        <div style={{marginLeft:10,flex:1}}>
          <strong style={{fontSize:14,cursor:onViewProfile?'pointer':'default',color:onViewProfile?'#4834d4':'#2d3436'}}
            onClick={onViewProfile||undefined}>
            {s.writerName}
          </strong>
          <div style={chip}>{s.genre}</div>
        </div>
        <div style={{display:'flex',gap:4}}>
          {!isOwner&&onFollow&&<button onClick={onFollow} style={{...followBtn,padding:'3px 8px',fontSize:10,background:iF?'#f1f2f6':'#fdcb6e'}}>{iF?'✓':'+ Follow'}</button>}
          <button onClick={()=>toggleSave(s.id)} style={iconBtn}>{saved.includes(s.id)?'❤️':'🤍'}</button>
        </div>
      </div>
      <h4 style={{color:'#4834d4',margin:'0 0 5px'}}>{s.Name}</h4>
      <p style={{color:'#636e72',fontSize:13,height:36,overflow:'hidden',margin:'0 0 8px',lineHeight:1.4}}>{s.logline}</p>
      <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
        {s.isSynopsisLocked&&<span style={lockChip}>🔒 Synopsis</span>}
        {s.isFullStoryLocked&&<span style={lockChip}>🔒 Script</span>}
        {s.isContactLocked&&<span style={lockChip}>🔒 Contact</span>}
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={onView} style={{...actionBtn,flex:2}}>View Details</button>
        {!isOwner&&onViewProfile&&<button onClick={onViewProfile} style={{...actionBtn,flex:1,background:'#4834d4'}}>Profile</button>}
        {isOwner&&onBid&&<button onClick={onBid} style={{...actionBtn,flex:1,background:'#a29bfe'}}>💰</button>}
        {isOwner&&<button onClick={()=>{if(window.confirm("Delete?"))onDelete(s.id);}} style={{...actionBtn,flex:1,background:'#ff4757'}}>Del</button>}
      </div>
    </div>
  );
};

const TCard=({p,user,TABS,getReqStatus,isFollowing,onView,onContact,onFollow,onUnfollow})=>{
  const isMe=p.email?.toLowerCase()===user?.email?.toLowerCase();
  const catObj=TABS.find(t=>t.id===p.category);
  const status=getReqStatus(p.email);
  const iF=isFollowing(p.email);
  const name=p.profile?.name||p.name||'Unknown';
  const pic=p.profile?.profilePic||p.profilePic||'/icon.png';
  const addr=(p.profile?.address||p.address||'').split(',')[0];
  return(
    <div style={card}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10,cursor:'pointer'}} onClick={onView}>
        <img src={pic} alt="" style={{...av45,width:50,height:50}}/>
        <div style={{flex:1}}>
          <strong style={{fontSize:15,color:'#2d3436'}}>{name}</strong>
          {addr&&<p style={{margin:'2px 0 0',fontSize:12,color:'#636e72'}}>📍 {addr}</p>}
        </div>
        <span style={{...chip,background:(catObj?.color||'#eee')+'22',color:catObj?.color,fontSize:10}}>{catObj?.label?.split(' ')[0]}</span>
      </div>
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={onView} style={{...actionBtn,flex:1,fontSize:12,padding:7}}>View Profile →</button>
        {!isMe&&(
          <>
            {status===null&&<button onClick={onContact} style={smallReq}>📩</button>}
            {status==='pending'&&<span style={pChip}>⏳</span>}
            {status==='approved'&&<span style={aChip}>✅</span>}
            <button onClick={iF?onUnfollow:onFollow} style={{...followBtn,padding:'6px 10px',fontSize:11,background:iF?'#f1f2f6':'#fdcb6e'}}>{iF?'✓':'+ Follow'}</button>
          </>
        )}
        {isMe&&<span style={{fontSize:11,color:'#b2bec3'}}>You</span>}
      </div>
    </div>
  );
};

const LS=({label,locked,onReq,reqLabel,children,div})=>(
  <div style={{...(div?{borderTop:'1px solid #eee',paddingTop:14,marginTop:14}:{}),marginBottom:14}}>
    <h5 style={{margin:'0 0 8px',fontSize:10,color:'#adb5bd',textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</h5>
    {locked?<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fff',padding:10,borderRadius:8,border:'1px solid #eee'}}>
      <span style={{fontSize:13,color:'#636e72'}}>🔒 Locked</span>
      <button onClick={onReq} style={smallReq}>{reqLabel}</button>
    </div>:children}
  </div>
);

const StoryModal=({modal,note,setNote,onSend,onClose})=>(
  <div style={moOverlay}><div style={moBox}>
    <h3 style={{marginTop:0}}>Request {modal.type==='fullStory'?'Script':modal.type==='synopsis'?'Synopsis':'Contact'} Access</h3>
    <textarea style={ta} placeholder="Send your portfolio link or identity for verification (Required)..." value={note} onChange={e=>setNote(e.target.value)}/>
    <div style={{display:'flex',gap:10}}><button onClick={onClose} style={cancelB}>Cancel</button><button onClick={onSend} style={confirmB}>Send Request</button></div>
  </div></div>
);

const ContactModal=({talent,msg,setMsg,onSend,onClose})=>(
  <div style={moOverlay}><div style={moBox}>
    <h3 style={{marginTop:0}}>📩 Contact Request</h3>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
      <img src={talent.profile?.profilePic||talent.profilePic||'/icon.png'} alt="" style={{width:44,height:44,borderRadius:'50%',objectFit:'cover'}}/>
      <div>
        <div style={{fontWeight:700}}>{talent.profile?.name||talent.name||'Unknown'}</div>
        <div style={{fontSize:12,color:'#636e72'}}>{talent.profile?.profession||talent.profession||talent.category}</div>
      </div>
    </div>
    <p style={{fontSize:12,color:'#636e72',margin:'0 0 8px'}}>Write your message (Required):</p>
    <textarea style={ta} placeholder="Write your message here..." value={msg} onChange={e=>setMsg(e.target.value)}/>
    <div style={{display:'flex',gap:10}}>
      <button onClick={onClose} style={cancelB}>Cancel</button>
      <button onClick={onSend} style={confirmB}>Send Request</button>
    </div>
  </div></div>
);

const ProtImg=({src,title,height=130})=>{
  const [blob,setBlob]=React.useState(null);
  React.useEffect(()=>{
    if(!src)return;
    fetch(src).then(r=>r.blob()).then(b=>setBlob(URL.createObjectURL(b))).catch(()=>setBlob(src));
  },[src]);
  return(
    <div style={{position:'relative',borderRadius:10,overflow:'hidden',userSelect:'none'}} onContextMenu={e=>e.preventDefault()}>
      {blob?<img src={blob} alt={title} draggable={false} style={{width:'100%',height,objectFit:'cover',pointerEvents:'none'}}/>
           :<div style={{height,background:'#f1f2f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#aaa'}}>Loading...</div>}
      <div style={{position:'absolute',inset:0,zIndex:1}} onContextMenu={e=>e.preventDefault()}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.55)',color:'#fff',padding:'4px 8px',fontSize:11,zIndex:2}}>🔒 {title}</div>
    </div>
  );
};

const Empty=({emoji,text})=>(
  <div style={{textAlign:'center',padding:'50px 20px',color:'#b2bec3'}}>
    <p style={{fontSize:40,margin:'0 0 10px'}}>{emoji}</p>
    <p style={{fontSize:14}}>{text}</p>
  </div>
);

const grid=      {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(265px,1fr))',gap:14,padding:16};
const card=      {background:'rgba(255,255,255,0.95)',padding:16,borderRadius:18,boxShadow:'0 4px 14px rgba(0,0,0,0.06)',border:'1px solid #f0f0f0'};
const av45=      {width:44,height:44,borderRadius:'50%',objectFit:'cover',flexShrink:0};
const chip=      {display:'inline-block',fontSize:11,color:'#636e72',background:'#f1f2f6',padding:'2px 8px',borderRadius:10,marginTop:3};
const lockChip=  {fontSize:10,background:'#fff9db',color:'#f39c12',padding:'2px 8px',borderRadius:10,border:'1px solid #f9ca24'};
const iconBtn=   {background:'none',border:'none',cursor:'pointer',fontSize:16,padding:2};
const actionBtn= {padding:'9px 14px',background:'#2d3436',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:600,fontSize:13};
const followBtn= {padding:'7px 14px',background:'#fdcb6e',color:'#2d3436',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:12};
const smallReq=  {background:'#6c5ce7',color:'#fff',border:'none',padding:'5px 12px',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:11};
const reqBtn=    {padding:'9px 16px',background:'#6c5ce7',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:13};
const pChip=     {background:'#fff9db',color:'#f39c12',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700};
const aChip=     {background:'#d4edda',color:'#2ecc71',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700};
const dChip=     {background:'#fdecea',color:'#e74c3c',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700};
const secLbl=    {margin:'0 0 10px',fontSize:11,color:'#adb5bd',textTransform:'uppercase',letterSpacing:'0.5px'};
const lockedRow= {display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8f9fa',padding:'10px',borderRadius:10,gap:10,flexWrap:'wrap'};
const backBtn=   {background:'none',border:'none',color:'#2d3436',cursor:'pointer',fontWeight:'bold',fontSize:14,padding:0};
const linkS=     {color:'#4834d4',fontWeight:'bold',textDecoration:'none',fontSize:14};
const goldBadge= {background:'#fdcb6e',color:'#2d3436',padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:700};
const silverBadge={background:'#b2bec3',color:'#fff',padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:700};
const moOverlay= {position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.7)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:9999,backdropFilter:'blur(5px)'};
const moBox=     {background:'#fff',padding:26,borderRadius:20,width:'90%',maxWidth:420};
const ta=        {width:'100%',height:90,padding:10,borderRadius:10,border:'1px solid #ddd',marginBottom:14,boxSizing:'border-box',fontSize:13,resize:'none'};
const cancelB=   {flex:1,padding:10,borderRadius:10,border:'1px solid #eee',cursor:'pointer',background:'#f8f9fa'};
const confirmB=  {flex:1,padding:10,borderRadius:10,border:'none',background:'#2d3436',color:'#fff',cursor:'pointer',fontWeight:'bold'};
const submitBtn= {width:'100%',padding:13,background:'#2d3436',color:'#fff',border:'none',borderRadius:12,cursor:'pointer',fontWeight:'bold',fontSize:15};