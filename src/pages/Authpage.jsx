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
    
    // Sob jaygay SAME format thakar jonno toLowerCase() ar trim() must
    const emailInput = form.email ? form.email.trim().toLowerCase() : ""; 
    const passwordInput = form.password ? form.password.trim() : "";
    const emailKey = emailInput.replace(/\./g, ',');

    if (view === 'login') {
      const snapshot = await get(child(ref(db), `users/${emailKey}`));
      if (snapshot.exists()) {
        const foundUser = snapshot.val();
        // Database-e thaka user-er email-o lowercase hobe, tai milbe ekhon
        if (foundUser.password === passwordInput) {
          localStorage.setItem('activeUser', JSON.stringify(foundUser));
          setUser(foundUser);
          alert("Login Successful!");
        } else {
          alert("ভুল পাসওয়ার্ড!");
        }
      } else {
        alert("এই ইমেইলে কোনো অ্যাকাউন্ট নেই! স্পেলিং চেক করুন।");
      }
    } 
    
    else if (view === 'signup') {
      if (!form.name || !emailInput || !passwordInput) return alert("সব পূরণ কর!");
      
      const snapshot = await get(child(ref(db), `users/${emailKey}`));
      if (snapshot.exists()) return alert("এই ইমেইল দিয়ে অ্যাকাউন্ট আছে!");

      // Notun user save korar somoy-o same logic
      const newUser = { ...form, email: emailInput, password: passwordInput, id: Date.now() };
      await set(ref(db, `users/${emailKey}`), newUser);
      
      localStorage.setItem('activeUser', JSON.stringify(newUser));
      setUser(newUser);
      alert("Registration Successful!");
    } 

    else if (view === 'forgot') {
      const snapshot = await get(child(ref(db), `users/${emailKey}`));
      if (!snapshot.exists()) return alert("ইমেইলটি পাওয়া যায়নি!");

      if (step === 1) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setOtpCode(code);
        alert(`OTP কোড: ${code}`);
        setStep(2);
      } 
      else if (step === 2) {
        if (userOtpInput.trim() === otpCode) setStep(3);
        else alert("ভুল OTP!");
      } 
      else if (step === 3) {
        if (!newPassword) return alert("পাসওয়ার্ড দিন!");
        await set(ref(db, `users/${emailKey}/password`), newPassword.trim());
        alert("পাসওয়ার্ড আপডেট হয়েছে! এবার লগইন করুন।");
        setView('login');
        setStep(1);
      }
    }
  };

  // UI layout (Previous code follows...)
  return (
    <div style={containerStyle}>
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
            </>
          )}

          {view === 'forgot' && step === 2 ? (
            <input placeholder="Enter 6-digit OTP" style={inputStyle} onChange={e => setUserOtpInput(e.target.value)} />
          ) : view === 'forgot' && step === 3 ? (
            <input placeholder="Enter New Password" type="password" style={inputStyle} onChange={e => setNewPassword(e.target.value)} />
          ) : (
            <input 
              placeholder="Email Address" 
              type="email" 
              style={inputStyle} 
              autoCapitalize="none"
              onChange={e => setForm({...form, email: e.target.value})} 
            />
          )}
          
          {view === 'login' && (
            <input placeholder="Password" type="password" style={inputStyle} onChange={e => setForm({...form, password: e.target.value})} />
          )}

          <button onClick={handleAction} style={actionBtn}>
            {view === 'login' ? 'Login' : view === 'signup' ? 'Register' : step === 1 ? 'Get OTP' : step === 2 ? 'Verify OTP' : 'Update Password'}
          </button>

          {view === 'login' && (
            <p onClick={() => { setView('forgot'); setStep(1); }} style={{ fontSize: '13px', color: '#636e72', cursor: 'pointer', marginTop: '15px', textDecoration: 'underline' }}>
              Forgot Password?
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const containerStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundImage: "url('/auth background.png')", backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: "'Segoe UI', sans-serif" };
const glassCard = { background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', padding: '50px', borderRadius: '30px', textAlign: 'center', width: '380px' };
const authCard = { background: 'rgba(255, 255, 255, 0.95)', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '360px', position: 'relative' };
const logoStyle = { width: '90px', height: '90px', borderRadius: '20px', objectFit: 'cover' };
const btnPrimary = { width: '100%', padding: '14px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' };
const btnSecondary = { width: '100%', padding: '14px', background: 'transparent', color: '#2d3436', border: '2px solid #2d3436', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };
const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', border: '1px solid #ddd', borderRadius: '10px', boxSizing: 'border-box' };
const actionBtn = { ...btnPrimary, marginTop: '15px', background: '#4A4A4A' };
const backBtn = { position: 'absolute', top: '25px', left: '20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const footerBrand = { marginTop: '40px', fontSize: '11px', color: '#636e72', fontWeight: 'bold', letterSpacing: '2px' };

export default AuthPage;