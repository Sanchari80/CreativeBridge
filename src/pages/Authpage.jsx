import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const AuthPage = () => {
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('landing');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Writer', profession: '' });
  
  // Forgot Password এর জন্য নতুন স্টেট
  const [step, setStep] = useState(1); // ১: ইমেইল দেওয়া, ২: OTP কোড, ৩: নতুন পাসওয়ার্ড
  const [otpCode, setOtpCode] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleAction = () => {
    const users = JSON.parse(localStorage.getItem('allUsers') || '[]');
    
    // মোবাইল কিবোর্ডের অদৃশ্য স্পেস বা ফরম্যাটিং একদম মুছে ফেলার জন্য Regex
    const emailInput = form.email ? form.email.replace(/\s+/g, '').toLowerCase() : "";
    const passwordInput = form.password ? form.password.trim() : "";

    if (view === 'login') {
      const foundUser = users.find(u => 
        u.email.replace(/\s+/g, '').toLowerCase() === emailInput && 
        u.password.trim() === passwordInput
      );

      if (foundUser) {
        localStorage.setItem('activeUser', JSON.stringify(foundUser));
        setUser(foundUser);
      } else {
        alert("ভুল ইমেইল বা পাসওয়ার্ড! আবার চেক কর।");
      }
    } 
    
    else if (view === 'signup') {
      if (!form.name || !form.email || !form.password) return alert("সবগুলো ঘর পূরণ কর!");
      if (users.find(u => u.email.toLowerCase() === emailInput)) return alert("এই ইমেইল দিয়ে অলরেডি আইডি আছে!");

      const newUser = { ...form, email: emailInput, password: passwordInput, id: Date.now() };
      users.push(newUser);
      localStorage.setItem('allUsers', JSON.stringify(users));
      localStorage.setItem('activeUser', JSON.stringify(newUser));
      setUser(newUser);
    } 

    else if (view === 'forgot') {
      const userIndex = users.findIndex(u => u.email.toLowerCase() === emailInput);
      if (userIndex === -1) return alert("এই ইমেইলটি পাওয়া যায়নি!");

      if (step === 1) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setOtpCode(code);
        alert(`আপনার OTP কোড হলো: ${code}`); // পপ-আপে কোড দেখাবে
        setStep(2);
      } 
      else if (step === 2) {
        if (userOtpInput === otpCode) {
          setStep(3);
        } else {
          alert("ভুল OTP! আবার টাইপ কর।");
        }
      } 
      else if (step === 3) {
        if (!newPassword) return alert("নতুন পাসওয়ার্ড দে!");
        users[userIndex].password = newPassword.trim();
        localStorage.setItem('allUsers', JSON.stringify(users));
        alert("পাসওয়ার্ড আপডেট হয়েছে! লগইন কর এখন।");
        setView('login');
        setStep(1);
      }
    }
  };

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
                <option value="Director">Director</option>
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
              autoComplete="off"
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

// স্টাইলগুলো তোর আগেরটাই রাখা হয়েছে
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