import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { db } from '../App.jsx';
import { ref, set, get, child } from "firebase/database";
import { getAuth, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const ROLE_OPTIONS = [
  { value: 'Writer',  emoji: '✍️', label: 'Writer',           desc: 'Script ও story লিখি' },
  { value: 'Singer',  emoji: '🎤', label: 'Singer',           desc: 'গান গাই ও রেকর্ড করি' },
  { value: 'Painter', emoji: '🎨', label: 'Painter/Designer', desc: 'ছবি আঁকি ও ডিজাইন করি' },
  { value: 'Actor',   emoji: '🎬', label: 'Actor/Anchor',     desc: 'অভিনয় বা উপস্থাপনা করি' },
  { value: 'Dancer',  emoji: '💃', label: 'Dancer',           desc: 'নৃত্য পরিবেশন করি' },
  { value: 'Hirer',   emoji: '🔍', label: 'Hirer',            desc: 'Talent hire করতে চাই' },
];

const AuthPage = () => {
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('login');
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'Writer',
    profession: '', phone: '', whatsapp: '', facebook: '', address: '',
  });

  const set_ = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleAction = async () => {
    const auth = getAuth();
    const emailInput = form.email.replace(/\s+/g, '').toLowerCase();
    const passwordInput = form.password.trim();
    const emailKey = emailInput.replace(/\./g, ',');

    if (view === 'login') {
      try {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        const snapshot = await get(child(ref(db), `users/${emailKey}`));
        if (snapshot.exists()) {
          const foundUser = snapshot.val();
          localStorage.setItem('activeUser', JSON.stringify(foundUser));
          setUser(foundUser);
        } else {
          alert("Account not found in database");
        }
      } catch (error) {
        alert("Login failed: " + error.message);
      }

    } else {
      if (!form.name || !emailInput || !passwordInput || !form.profession) return alert("সব required field পূরণ করুন!");
      if (passwordInput.length < 6) return alert("Password কমপক্ষে 6 character হতে হবে!");
      if (!form.phone)   return alert("Phone number দিন!");
      if (!form.address) return alert("Address দিন!");

      try {
        await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        const newUser = { ...form, email: emailInput, password: passwordInput, id: Date.now(), profilePic: "/icon.png" };
        await set(ref(db, `users/${emailKey}`), newUser);
        localStorage.setItem('activeUser', JSON.stringify(newUser));
        setUser(newUser);
        alert("Account created successfully!");
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          alert("এই email দিয়ে আগেই account আছে!");
        } else {
          alert("Sign-up failed: " + error.message);
        }
      }
    }
  };

  const handleResetPassword = async () => {
    const emailPrompt = prompt("Password reset এর জন্য email দিন:");
    if (!emailPrompt) return;
    try {
      await sendPasswordResetEmail(getAuth(), emailPrompt.trim().toLowerCase());
      alert("Password reset link পাঠানো হয়েছে!");
    } catch (error) {
      alert("Email পাঠানো যায়নি। Email টি চেক করুন।");
    }
  };

  return (
    <div style={container}>
      <div style={content}>
        <div style={authCard}>

          {view === 'signup' && (
            <button onClick={() => setView('login')} style={backBtn}>← Back to Login</button>
          )}

          <img src="/icon.png" alt="Icon" style={{ width: '50px', marginBottom: '15px' }} />
          <h2 style={{ marginBottom: '5px', color: '#2d3436' }}>
            {view === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          {/* ── SIGNUP ONLY ── */}
          {view === 'signup' && (
            <>
              {/* Role cards */}
              <p style={{ fontSize: '12px', color: '#636e72', marginBottom: '10px', fontWeight: '600', textAlign: 'left' }}>
                আপনি কী হিসেবে যোগ দিচ্ছেন? *
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '15px' }}>
                {ROLE_OPTIONS.map(r => (
                  <div
                    key={r.value}
                    onClick={() => set_('role', r.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '9px 11px', borderRadius: '12px', cursor: 'pointer',
                      background: form.role === r.value ? '#2d3436' : '#f8f9fa',
                      color:      form.role === r.value ? '#fff'    : '#2d3436',
                      border: `2px solid ${form.role === r.value ? '#2d3436' : '#eee'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{r.emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '700', fontSize: '12px' }}>{r.label}</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <input placeholder="Full Name *"   style={inp} onChange={e => set_('name', e.target.value)} />
              <input
                placeholder={form.role === 'Hirer' ? 'Profession / Company Name *' : 'Profession / Expertise *'}
                style={inp}
                onChange={e => set_('profession', e.target.value)}
              />
              <input placeholder="Full Address (Road, Area, District) *" style={inp} onChange={e => set_('address', e.target.value)} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Phone Number *" style={{ ...inp, margin: 0 }} onChange={e => set_('phone', e.target.value)} />
                <input placeholder="WhatsApp"       style={{ ...inp, margin: 0 }} onChange={e => set_('whatsapp', e.target.value)} />
              </div>
              <input placeholder="Facebook Profile Link" style={inp} onChange={e => set_('facebook', e.target.value)} />
            </>
          )}

          {/* ── COMMON ── */}
          <input placeholder="Email *"    type="email"    style={inp} onChange={e => set_('email', e.target.value)} />
          <input placeholder="Password *" type="password" style={inp} onChange={e => set_('password', e.target.value)} />

          {view === 'login' && (
            <div style={{ textAlign: 'right', width: '100%', marginBottom: '10px' }}>
              <span onClick={handleResetPassword} style={{ fontSize: '12px', color: '#6c5ce7', cursor: 'pointer', fontWeight: '500' }}>
                Forgot Password?
              </span>
            </div>
          )}

          <button onClick={handleAction} style={actionBtn}>
            {view === 'login' ? 'Enter Dashboard' : 'Join Now →'}
          </button>

          {view === 'login' && (
            <p style={{ marginTop: '20px', fontSize: '14px' }}>
              Don't have an account?{' '}
              <span onClick={() => setView('signup')} style={{ color: '#6c5ce7', cursor: 'pointer', fontWeight: 'bold' }}>Sign Up</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const container = { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundImage: "url('/auth background.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', fontFamily: "'Segoe UI', sans-serif" };
const content   = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const authCard  = { width: '100%', maxWidth: '440px', padding: '35px', borderRadius: '25px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', boxShadow: '0 25px 50px rgba(0,0,0,0.1)', textAlign: 'center', position: 'relative', maxHeight: '92vh', overflowY: 'auto' };
const inp       = { width: '100%', padding: '12px', margin: '8px 0', border: '1px solid #ddd', borderRadius: '12px', boxSizing: 'border-box', fontSize: '14px', background: '#f9f9f9' };
const actionBtn = { width: '100%', padding: '14px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: '10px' };
const backBtn   = { position: 'absolute', top: '18px', left: '18px', background: 'none', border: 'none', color: '#6c5ce7', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };

export default AuthPage;