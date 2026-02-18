import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, set, get, child } from "firebase/database";

const LandingPage = () => {
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('landing');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Writer', profession: '', pic: null });

  const dbUrl = "https://creativebridge-88c8a-default-rtdb.asia-southeast1.firebasedatabase.app/";

  useEffect(() => {
    const activeSession = localStorage.getItem('activeUser');
    if (activeSession) setUser(JSON.parse(activeSession));
  }, [setUser]);

  const handleAction = async () => {
    const db = getDatabase(undefined, dbUrl);
    
    // Data Cleanup
    const emailInput = form.email ? form.email.replace(/\s+/g, '').toLowerCase() : "";
    const passwordInput = form.password ? form.password.trim() : "";
    const emailKey = emailInput.replace(/\./g, ',');

    if (view === 'login') {
      const snapshot = await get(child(ref(db), `users/${emailKey}`));
      
      if (snapshot.exists()) {
        const foundUser = snapshot.val();
        if (foundUser.password === passwordInput) {
          localStorage.setItem('activeUser', JSON.stringify(foundUser));
          setUser(foundUser);
        } else {
          alert("ভুল পাসওয়ার্ড!");
        }
      } else {
        alert("অ্যাকাউন্ট পাওয়া যায়নি!");
      }
    } else {
      // Signup Logic - Required field validation
      if (!form.name || !emailInput || !passwordInput || !form.profession) {
        return alert("সব ঘর পূরণ কর!");
      }
      
      const newUser = { ...form, email: emailInput, password: passwordInput, id: Date.now() };
      await set(ref(db, `users/${emailKey}`), newUser);
      
      localStorage.setItem('activeUser', JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  return (
    <div style={container}>
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setView('landing')}>
          <img src="/SKT logo.jpg" alt="Logo" style={logoStyle} />
          <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#2d3436' }}>Creative Bridge</span>
        </div>
      </nav>

      <div style={content}>
        {view === 'landing' ? (
          <div style={glassCard}>
            <img src="/icon.png" alt="Icon" style={{ width: '80px', marginBottom: '20px' }} />
            <h1 style={{ fontSize: '36px', color: '#2d3436', marginBottom: '10px', fontWeight: '800' }}>Welcome to Creative Bridge</h1>
            <p style={{ color: '#444', marginBottom: '35px', fontSize: '18px', fontWeight: '500' }}>The ultimate bridge between Writers and Directors.</p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={() => setView('login')} style={btnPrimary}>Login</button>
              <button onClick={() => setView('signup')} style={btnSecondary}>Sign Up</button>
            </div>
          </div>
        ) : (
          <div style={authCard}>
            <button onClick={() => setView('landing')} style={backBtn}>← Back</button>
            <img src="/icon.png" alt="Icon" style={{ width: '45px', marginBottom: '15px' }} />
            <h2 style={{ marginBottom: '20px', color: '#2d3436' }}>{view === 'login' ? 'Login' : 'Create Account'}</h2>
            
            {view === 'signup' && (
              <>
                <input placeholder="Full Name" style={inputStyle} onChange={e => setForm({...form, name: e.target.value})} />
                <input placeholder="Profession" style={inputStyle} onChange={e => setForm({...form, profession: e.target.value})} />
                <select style={inputStyle} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="Writer">I am a Writer</option>
                  <option value="Looking for new stories">Looking for new stories</option>
                </select>
              </>
            )}
            <input placeholder="Email" type="email" style={inputStyle} onChange={e => setForm({...form, email: e.target.value})} />
            <input placeholder="Password" type="password" style={inputStyle} onChange={e => setForm({...form, password: e.target.value})} />
            
            <button onClick={handleAction} style={actionBtn}>{view === 'login' ? 'Enter Dashboard' : 'Join Now'}</button>
          </div>
        )}
      </div>

      <footer style={footerStyle}>
        <p style={{ margin: 0, fontWeight: '600', letterSpacing: '1px' }}>CreativeBridge.SKT</p>
      </footer>
    </div>
  );
};

// --- STYLES (Fixed Opacity for Visibility) ---
const container = { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5', backgroundImage: "url('/background.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', fontFamily: "'Segoe UI', sans-serif" };
const navStyle = { padding: '15px 5%', display: 'flex', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const logoStyle = { width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' };
const content = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' };
const glassCard = { textAlign: 'center', padding: '60px 40px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', borderRadius: '35px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '600px' };
const authCard = { width: '100%', maxWidth: '400px', padding: '40px', borderRadius: '25px', background: 'white', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', textAlign: 'center', position: 'relative' };
const btnPrimary = { padding: '14px 45px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '35px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };
const btnSecondary = { ...btnPrimary, background: 'transparent', color: '#2d3436', border: '2px solid #2d3436' };
const backBtn = { position: 'absolute', top: '25px', left: '25px', background: 'none', border: 'none', color: '#2d3436', cursor: 'pointer', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '14px', margin: '10px 0', border: '1px solid #ddd', borderRadius: '12px', boxSizing: 'border-box' };
const actionBtn = { ...btnPrimary, width: '100%', marginTop: '15px' };
const footerStyle = { textAlign: 'center', padding: '25px', background: 'rgba(255, 255, 255, 0.95)' };

export default LandingPage;