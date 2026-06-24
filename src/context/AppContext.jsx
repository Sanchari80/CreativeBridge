// AppContext.jsx — full updated
import React, { createContext, useState, useEffect, useRef } from 'react';
import { ref, onValue, remove, push, set, update } from "firebase/database";

export const AppContext = createContext();

export const playSound = (type = 'notify') => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const presets = {
      notify:  [{ f: 1047, t: 0, d: 0.35 }, { f: 784, t: 0.18, d: 0.4 }],
      follow:  [{ f: 523, t: 0, d: 0.4 }, { f: 659, t: 0.13, d: 0.4 }, { f: 784, t: 0.26, d: 0.5 }],
      approve: [{ f: 659, t: 0, d: 0.45 }, { f: 988, t: 0.2, d: 0.5 }],
    };
    (presets[type] || presets.notify).forEach(({ f, t, d }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const s    = ctx.currentTime + t;
      osc.type   = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, s);
      gain.gain.linearRampToValueAtTime(0.22, s + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, s + d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(s);
      osc.stop(s + d + 0.05);
    });
  } catch(e) {}
};

export const AppProvider = ({ children, db }) => {

  const [user,                setUser]                = useState(() => {
    const s = localStorage.getItem('activeUser');
    return s ? JSON.parse(s) : null;
  });
  const [stories,             setStories]             = useState([]);
  const [requests,            setRequests]             = useState([]);
  const [talentRequests,      setTalentRequests]       = useState([]);
  const [follows,             setFollows]              = useState({});
  const [followNotifications, setFollowNotifications]  = useState([]);
  const [activeStoryId,       setActiveStoryId]        = useState(null);
  const [bids,                setBids]                 = useState([]);
  const [promotedWorks,       setPromotedWorks]        = useState({});
  // ── NEW ────────────────────────────────────────────────────────
  const [adminNotifications,  setAdminNotifications]   = useState([]);
  const [bidNotifications,    setBidNotifications]     = useState([]);

  const prevTalentReqCount    = useRef(0);
  const prevFollowNotiCount   = useRef(0);
  const prevAdminNotifCount   = useRef(0);
  const prevBidNotifCount     = useRef(0);

  // ── Admin detection (role-based OR isAdmin flag) ────────────────
  const isAdminUser = user?.isAdmin === true || user?.role === 'Admin';

  // ── User sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.email) { localStorage.removeItem('activeUser'); return; }
    localStorage.setItem('activeUser', JSON.stringify(user));
    const userKey = user.email.replace(/\./g, ',');
    const unsub = onValue(ref(db, `users/${userKey}`), snap => {
      const data = snap.val();
      if (data && JSON.stringify(data) !== JSON.stringify(user))
        setUser(prev => ({ ...prev, ...data }));
    });
    return () => unsub();
  }, [user?.email, db]);

  // ── Stories ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, 'stories'), snap => {
      const d = snap.val();
      setStories(d ? Object.keys(d).map(k => ({ id: k, ...d[k] })) : []);
    });
    return () => unsub();
  }, [db]);

  // ── Story requests ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, 'requests'), snap => {
      const d = snap.val();
      if (d) {
        let all = [];
        Object.entries(d).forEach(([ownerKey, folder]) => {
          if (typeof folder === 'object')
            Object.entries(folder).forEach(([k, v]) =>
              all.push({ ...v, firebaseKey: k, ownerPath: ownerKey })
            );
        });
        setRequests(all);
      } else setRequests([]);
    });
    return () => unsub();
  }, [user, db]);

  // ── Talent requests ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const emailKey     = user.email.replace(/\./g, ',');
    const TALENT_ROLES = ['Singer', 'Painter', 'Actor', 'Dancer', 'Writer'];
    const isTalent     = TALENT_ROLES.includes(user.role);
    const isHirer      = user.role === 'Hirer' || user.role === 'Looking for new stories';

    const unsub = onValue(ref(db, 'talentRequests'), snap => {
      const d = snap.val();
      if (d) {
        let all = [];
        Object.entries(d).forEach(([ownerKey, folder]) => {
          if (typeof folder === 'object')
            Object.entries(folder).forEach(([k, v]) =>
              all.push({ ...v, firebaseKey: k, ownerPath: ownerKey })
            );
        });
        setTalentRequests(all);

        const myPending = all.filter(r => r.ownerPath === emailKey && r.status === 'pending').length;
        if (isTalent && prevTalentReqCount.current !== 0 && myPending > prevTalentReqCount.current)
          playSound('notify');
        if (isTalent) prevTalentReqCount.current = myPending;

        if (isHirer) {
          const approved = all.filter(r => r.fromEmail === user.email && r.status === 'approved' && !r.read);
          if (approved.length > 0) playSound('approve');
        }
      } else setTalentRequests([]);
    });
    return () => unsub();
  }, [user, db]);

  // ── My follows ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const emailKey = user.email.replace(/\./g, ',');
    const unsub = onValue(ref(db, `follows/${emailKey}`), snap => {
      setFollows(snap.val() || {});
    });
    return () => unsub();
  }, [user, db]);

  // ── Follow notifications ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const emailKey = user.email.replace(/\./g, ',');
    const unsub = onValue(ref(db, `followNotifications/${emailKey}`), snap => {
      const d = snap.val();
      if (d) {
        const list = Object.entries(d).map(([k, v]) => ({ ...v, firebaseKey: k })).reverse();
        setFollowNotifications(list);
        const unread = list.filter(n => !n.read).length;
        if (prevFollowNotiCount.current !== 0 && unread > prevFollowNotiCount.current)
          playSound('follow');
        prevFollowNotiCount.current = unread;
      } else setFollowNotifications([]);
    });
    return () => unsub();
  }, [user, db]);

  // ── Bids ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, 'bids'), snap => {
      const d = snap.val();
      setBids(d ? Object.entries(d).map(([k, v]) => ({ ...v, id: k })) : []);
    });
    return () => unsub();
  }, [db]);

  // ── Promoted works ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, 'promotedWorks'), snap => {
      setPromotedWorks(snap.val() || {});
    });
    return () => unsub();
  }, [db]);

  // ── Admin bid notifications ────────────────────────────────────
  useEffect(() => {
    if (!isAdminUser) return;
    const unsub = onValue(ref(db, 'adminNotifications'), snap => {
      const d = snap.val();
      if (d) {
        const list = Object.entries(d)
          .map(([k, v]) => ({ ...v, firebaseKey: k }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setAdminNotifications(list);
        const unread = list.filter(n => !n.read).length;
        if (prevAdminNotifCount.current !== 0 && unread > prevAdminNotifCount.current)
          playSound('notify');
        prevAdminNotifCount.current = unread;
      } else setAdminNotifications([]);
    });
    return () => unsub();
  }, [isAdminUser, db]);

  // ── User bid notifications ─────────────────────────────────────
  useEffect(() => {
    if (!user?.email) return;
    const emailKey = user.email.replace(/\./g, ',');
    const unsub = onValue(ref(db, `bidNotifications/${emailKey}`), snap => {
      const d = snap.val();
      if (d) {
        const list = Object.entries(d)
          .map(([k, v]) => ({ ...v, firebaseKey: k }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setBidNotifications(list);
        const unread = list.filter(n => !n.read).length;
        if (prevBidNotifCount.current !== 0 && unread > prevBidNotifCount.current)
          playSound('approve');
        prevBidNotifCount.current = unread;
      } else setBidNotifications([]);
    });
    return () => unsub();
  }, [user?.email, db]);

  // ══ Functions ══════════════════════════════════════════════════

  const deleteStory = async (storyId) => {
    if (window.confirm("Are you sure you want to delete this story?"))
      try { await remove(ref(db, `stories/${storyId}`)); } catch(e) { console.error(e); }
  };

  const sendRequest = async (ownerEmail, storyTitle, storyId, type, note) => {
    if (!user) return alert("Please Login First!");
    if (requests.some(r =>
      r.storyId === storyId &&
      r.fromEmail?.toLowerCase() === user.email?.toLowerCase() &&
      r.requestType === type))
      return alert("Already Requested!");
    try {
      const ownerKey = (ownerEmail || "unknown@mail.com").replace(/\./g, ',');
      await set(push(ref(db, `requests/${ownerKey}`)), {
        fromEmail: user.email, fromName: user.name || user.email.split('@')[0],
        fromPic: user.profilePic || "/icon.png", storyId: storyId || "",
        requestType: type || "general", note: note || "",
        storyTitle: storyTitle || "Untitled", status: 'pending', timestamp: Date.now()
      });
      alert("Request Sent Successfully!");
    } catch(e) { alert("Request failed!"); }
  };

  const sendTalentRequest = async (talentEmail, talentName, message) => {
    if (!user) return alert("Please Login First!");
    if (talentRequests.some(r =>
      r.fromEmail?.toLowerCase() === user.email?.toLowerCase() &&
      r.talentEmail?.toLowerCase() === talentEmail?.toLowerCase() &&
      r.status === 'pending'))
      return alert("You already have a pending request with this talent!");
    try {
      const talentKey = talentEmail.replace(/\./g, ',');
      await set(push(ref(db, `talentRequests/${talentKey}`)), {
        fromEmail: user.email, fromName: user.name || "",
        fromPic: user.profilePic || "/icon.png", fromProfession: user.profession || "",
        talentEmail, talentName, message: message || "",
        status: 'pending', read: false, timestamp: Date.now()
      });
      alert("Contact Request Sent!");
    } catch(e) { alert("Failed: " + e.message); }
  };

  const updateTalentRequest = async (req, newStatus) => {
    try {
      const updates = {};
      updates[`/talentRequests/${req.ownerPath}/${req.firebaseKey}/status`] = newStatus;
      if (newStatus === 'approved') {
        updates[`/talentRequests/${req.ownerPath}/${req.firebaseKey}/revealedContact`] = {
          email: user.email, phone: user.phone || "", whatsapp: user.whatsapp || "",
          facebook: user.facebook || "", instagram: user.instagram || "",
        };
        updates[`/talentRequests/${req.ownerPath}/${req.firebaseKey}/talentPic`] = user.profilePic || "/icon.png";
        playSound('approve');
      }
      await update(ref(db), updates);
    } catch(e) { alert("Update failed: " + e.message); }
  };

  const deleteTalentWork = async (role, emailKey, workId) => {
    const folderMap = { Singer: 'songs', Painter: 'artworks', Actor: 'videos', Dancer: 'videos' };
    if (window.confirm("Delete this work?"))
      try { await remove(ref(db, `talents/${role.toLowerCase()}/${emailKey}/${folderMap[role]||'works'}/${workId}`)); }
      catch(e) { alert("Delete failed: " + e.message); }
  };

  // ── Follow ─────────────────────────────────────────────────────
  const followTalent = async (talentEmail, talentName, talentPic) => {
    if (!user) return;
    const myKey     = user.email.replace(/\./g, ',');
    const talentKey = talentEmail.replace(/\./g, ',');
    try {
      await set(ref(db, `follows/${myKey}/${talentKey}`), {
        talentEmail, talentName: talentName || '',
        talentPic: talentPic || '/icon.png', followedAt: Date.now()
      });
      await set(ref(db, `followers/${talentKey}/${myKey}`), {
        followerEmail:      user.email,
        followerName:       user.name || '',
        followerPic:        user.profilePic || '/icon.png',
        followerRole:       user.role || '',
        followerProfession: user.profession || '',
        followedAt:         Date.now()
      });
      await set(push(ref(db, `followNotifications/${talentKey}`)), {
        type: 'follow', followerEmail: user.email, followerName: user.name || '',
        followerPic: user.profilePic || '/icon.png',
        followerProfession: user.profession || user.role || '',
        read: false, timestamp: Date.now()
      });
      playSound('follow');
    } catch(e) { alert("Follow failed: " + e.message); }
  };

  // ── Unfollow ───────────────────────────────────────────────────
  const unfollowTalent = async (talentEmail) => {
    if (!user) return;
    const myKey     = user.email.replace(/\./g, ',');
    const talentKey = talentEmail.replace(/\./g, ',');
    try {
      await remove(ref(db, `follows/${myKey}/${talentKey}`));
      await remove(ref(db, `followers/${talentKey}/${myKey}`));
    } catch(e) { alert("Unfollow failed: " + e.message); }
  };

  const isFollowing = (talentEmail) => !!follows[talentEmail?.replace(/\./g, ',')];

  const markFollowNotifRead = async (notifId) => {
    const emailKey = user?.email?.replace(/\./g, ',');
    try { await update(ref(db, `followNotifications/${emailKey}/${notifId}`), { read: true }); }
    catch(e) {}
  };

  // ── Mark admin notification read ───────────────────────────────
  const markAdminNotifRead = async (notifId) => {
    try { await update(ref(db, `adminNotifications/${notifId}`), { read: true }); }
    catch(e) {}
  };

  // ── Mark bid notification read (user side) ─────────────────────
  const markBidNotifRead = async (notifId) => {
    const emailKey = user?.email?.replace(/\./g, ',');
    try { await update(ref(db, `bidNotifications/${emailKey}/${notifId}`), { read: true }); }
    catch(e) {}
  };

  // ── Bid submit ─────────────────────────────────────────────────
  const submitBid = async (category, workId, workTitle, tokens, paymentScreenshot, workLink) => {
    if (!user) return alert("Please Login!");
    const amount = tokens === 5 ? 500 : 200;
    try {
      // Save bid
      const bidRef = push(ref(db, 'bids'));
      await set(bidRef, {
        userEmail:         user.email,
        userEmailKey:      user.email.replace(/\./g, ','),
        userName:          user.name || '',
        userPic:           user.profilePic || '/icon.png',
        category, workId, workTitle, tokens, amount,
        paymentScreenshot: paymentScreenshot || '',
        workLink:          workLink || '',
        status:            'pending',
        timestamp:         Date.now()
      });

      // ── Notify admin ─────────────────────────────────────────
      await push(ref(db, 'adminNotifications'), {
        type:        'new_bid',
        bidId:       bidRef.key,
        userName:    user.name || '',
        userPic:     user.profilePic || '/icon.png',
        userEmail:   user.email,
        workTitle,
        category,
        tokens,
        amount,
        workLink:    workLink || '',
        paymentScreenshot: paymentScreenshot || '',
        read:        false,
        timestamp:   Date.now()
      });

      alert("Bid submitted! Admin will verify your payment and approve within 24 hours.");
    } catch(e) { alert("Bid failed: " + e.message); }
  };

  // ── Admin: approve bid ─────────────────────────────────────────
  const approveBid = async (bid) => {
    try {
      const now = Date.now();
      const updates = {};
      updates[`/bids/${bid.id}/status`]     = 'approved';
      updates[`/bids/${bid.id}/approvedAt`] = now;
      updates[`/promotedWorks/${bid.category}/${bid.userEmailKey}_${bid.workId}`] = {
        userEmailKey: bid.userEmailKey,
        workId:       bid.workId,
        tokens:       bid.tokens,
        approvedAt:   now
      };
      await update(ref(db), updates);

      // ── Notify the user whose bid was approved ───────────────
      await push(ref(db, `bidNotifications/${bid.userEmailKey}`), {
        type:      'bid_approved',
        workTitle: bid.workTitle,
        category:  bid.category,
        tokens:    bid.tokens,
        amount:    bid.amount,
        message:   `🎉 Your bid for "${bid.workTitle}" has been approved! It is now promoted to the top.`,
        read:      false,
        timestamp: now
      });

      // Mark related admin notification as read
      const relatedNotif = adminNotifications.find(n => n.bidId === bid.id);
      if (relatedNotif?.firebaseKey) {
        await update(ref(db, `adminNotifications/${relatedNotif.firebaseKey}`), { read: true });
      }
    } catch(e) { alert("Approve failed: " + e.message); }
  };

  // ── Admin: reject bid ──────────────────────────────────────────
  const rejectBid = async (bidId) => {
    try {
      const bid = bids.find(b => b.id === bidId);
      await update(ref(db, `bids/${bidId}`), { status: 'rejected' });

      // ── Notify the user whose bid was rejected ───────────────
      if (bid?.userEmailKey) {
        await push(ref(db, `bidNotifications/${bid.userEmailKey}`), {
          type:      'bid_rejected',
          workTitle: bid.workTitle || '',
          category:  bid.category  || '',
          tokens:    bid.tokens    || 0,
          amount:    bid.amount    || 0,
          message:   `❌ Your bid for "${bid.workTitle}" was not approved. Please contact admin for details.`,
          read:      false,
          timestamp: Date.now()
        });
      }

      // Mark related admin notification as read
      const relatedNotif = adminNotifications.find(n => n.bidId === bidId);
      if (relatedNotif?.firebaseKey) {
        await update(ref(db, `adminNotifications/${relatedNotif.firebaseKey}`), { read: true });
      }
    } catch(e) { alert("Reject failed: " + e.message); }
  };

  const logout = () => { localStorage.removeItem('activeUser'); setUser(null); };

  return (
    <AppContext.Provider value={{
      user, setUser,
      stories, setStories,
      requests, setRequests,
      talentRequests, setTalentRequests,
      follows, followNotifications,
      activeStoryId, setActiveStoryId,
      bids, promotedWorks,
      adminNotifications, bidNotifications,
      deleteStory, sendRequest,
      sendTalentRequest, updateTalentRequest, deleteTalentWork,
      followTalent, unfollowTalent, isFollowing, markFollowNotifRead,
      markAdminNotifRead, markBidNotifRead,
      submitBid, approveBid, rejectBid,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};