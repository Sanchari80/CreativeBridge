import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, set, get, child } from "firebase/database";

const AuthPage = () => {
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('landing');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Writer', profession: '' });
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const dbUrl = "https://creativebridge-88c8a-default-rtdb.asia-southeast1.firebasedatabase.app/";

  const handleAction = async () => {
    const db = getDatabase(undefined, dbUrl);
    const emailInput = form.email ? form.email.trim().toLowerCase() : ""; 
    const passwordInput = form.password ? form.password.trim() : "";
    const emailKey = emailInput.replace(/\./g, ',');

    if (view === 'login') {
      const snapshot = await get(child(ref(db), `users/${emailKey}`));
      if (snapshot.exists()) {
        const foundUser = snapshot.val();
        if (foundUser.password === passwordInput) {
          localStorage.setItem('activeUser', JSON.stringify(foundUser));
          setUser(foundUser);
          alert("Login Successful!");
        } else {
          alert("ভুল পাসওয়ার্ড!");
        }
      } else {
        alert("এই ইমেইলে কোনো অ্যাকাউন্ট নেই!");
      }
    } 
    else if (view === 'signup') {
      if (!form.name || !emailInput || !passwordInput || !form.profession) {
        return alert("সব পূরণ কর!");
      }
      const snapshot = await get(child(ref(db), `users/${emailKey}`));
      if (snapshot.exists()) return alert("এই ইমেইল দিয়ে অ্যাকাউন্ট আছে!");
      const newUser = { ...form, email: emailInput, password: passwordInput, id: Date.now() };
      await set(ref(db, `users/${emailKey}`), newUser);
      localStorage.setItem('activeUser', JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Container-er bhetore card thakbe */}
      <div style={{ position: 'relative', zIndex: 10 }}> 
        {view === 'landing' ? (
          <div style={glassCard}>
            <img src="/SKT logo.jpg" alt="Logo" style={logoStyle} />
            <h1 style={{ color: '#2d3436', margin: '15px 0', fontSize: '28px' }}>Creative Bridge</h1>
            <p style={{ color: '#444', marginBottom: '30px', fontWeight: '500' }}>Connecting Writers & Directors</p>
            <button onClick={() => setView('login')} style={btnPrimary}>Login</button>
            <button onClick={() => setView('signup')} style={btnSecondary}>Sign Up</button>
            <p style={footerBrand}>CreativeBridge.SKT</p>
          </div>
        ) : (
          <div style={authCard}>
            <button onClick={() => { setView('landing'); setStep(1); }} style={backBtn}>← Back</button>
            <img src="/icon.png" alt="Icon" style={{ width: '45px', marginBottom: '10px' }} />
            <h2 style={{ marginBottom: '20px', color: '#2d3436' }}>
              {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Join Us' : 'Reset Password'}
            </h2>
            {view === 'signup' && (
              <>
                <input placeholder="Full Name" style={inputStyle} onChange={e => setForm({...form, name: e.target.value})} />
                <input placeholder="Profession" style={inputStyle} onChange={e => setForm({...form, profession: e.target.value})} />
                <select style={inputStyle} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="Writer">Writer</option>
                  <option value="Looking for new stories">Looking for new stories</option>
                </select>
                <input placeholder="Create Password" type="password" style={inputStyle} onChange={e => setForm({...form, password: e.target.value})} />
              </>
            )}
            <input placeholder="Email Address" type="email" style={inputStyle} onChange={e => setForm({...form, email: e.target.value})} />
            {view === 'login' && <input placeholder="Password" type="password" style={inputStyle} onChange={e => setForm({...form, password: e.target.value})} />}
            <button onClick={handleAction} style={actionBtn}>
              {view === 'login' ? 'Login' : 'Register'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Styles
const containerStyle = { 
  height: '100vh', 
  width: '100%',
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  backgroundImage: "url('/auth background.png')", 
  backgroundSize: 'cover', 
  backgroundPosition: 'center', 
  backgroundRepeat: 'no-repeat',
  position: 'fixed', // Jate pura screen cover kore
  top: 0,
  left: 0
};

const glassCard = { 
  background: 'rgba(255, 255, 255, 0.9)', // Opacity baralam jate thikmoto dekha jay
  backdropFilter: 'blur(10px)', 
  padding: '40px', 
  borderRadius: '24px', 
  textAlign: 'center', 
  width: '350px',
  boxShadow: '0 15px 35px rgba(0,0,0,0.2)' // Shadow dilam jate background theke alada hoy
};

const authCard = { ...glassCard, position: 'relative' };
const logoStyle = { width: '80px', height: '80px', borderRadius: '15px', objectFit: 'cover', marginBottom: '10px' };
const btnPrimary = { width: '100%', padding: '12px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const btnSecondary = { ...btnPrimary, background: 'transparent', color: '#2d3436', border: '2px solid #2d3436', marginTop: '10px' };
const inputStyle = { width: '100%', padding: '11px', margin: '6px 0', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' };
const actionBtn = { ...btnPrimary, marginTop: '15px', background: '#4A4A4A' };
const backBtn = { position: 'absolute', top: '20px', left: '15px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const footerBrand = { marginTop: '30px', fontSize: '10px', color: '#636e72', fontWeight: 'bold', letterSpacing: '1px' };

export default AuthPage;