import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const AuthPage = () => {
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('landing');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Writer', profession: '' });
  const [newPassword, setNewPassword] = useState('');

  const handleAction = () => {
    const users = JSON.parse(localStorage.getItem('allUsers') || '[]');
    
    const emailInput = form.email ? form.email.trim().toLowerCase() : "";
    const passwordInput = form.password ? form.password.trim() : "";

    if (view === 'login') {
      const foundUser = users.find(u => 
        u.email.trim().toLowerCase() === emailInput && 
        u.password.trim() === passwordInput
      );

      if (foundUser) {
        localStorage.setItem('activeUser', JSON.stringify(foundUser));
        setUser(foundUser);
      } else {
        alert("Invalid Email or Password!");
      }
    } else if (view === 'signup') {
      if (!form.name || !form.email || !form.password) return alert("Please fill all fields!");
      
      if (users.find(u => u.email.trim().toLowerCase() === emailInput)) return alert("Email already exists!");

      // নতুন ইউজার তৈরির সময় আগের প্রোফাইল পিকচার (যদি থাকে) বজায় রাখা হচ্ছে
      const newUser = { 
        ...form, 
        email: emailInput, 
        password: passwordInput, 
        profilePic: form.ProfilePic || "/icon.png", // যদি ছবি না থাকে তবেই ডিফল্ট
        id: Date.now() 
      };
      
      users.push(newUser);
      localStorage.setItem('allUsers', JSON.stringify(users));
      localStorage.setItem('activeUser', JSON.stringify(newUser));
      setUser(newUser);

    } else if (view === 'forgot') {
      const userIndex = users.findIndex(u => u.email.trim().toLowerCase() === emailInput);
      
      if (userIndex === -1) {
        return alert("Email not found! Please check your spelling.");
      }
      
      if (!newPassword) return alert("Please enter a new password!");

      // পাসওয়ার্ড আপডেট করার সময় প্রোফাইল পিকচার বা অন্য ডেটা যেন নষ্ট না হয়
      users[userIndex].password = newPassword.trim();
      
      localStorage.setItem('allUsers', JSON.stringify(users));
      alert("Password updated successfully! Now Login.");
      setView('login');
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
          <button onClick={() => setView('landing')} style={backBtn}>← Back</button>
          <img src="/icon.png" alt="Icon" style={{ width: '45px', marginBottom: '10px' }} />
          <h2 style={{ marginBottom: '20px', color: '#2d3436' }}>
            {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Join the Bridge' : 'Reset Password'}
          </h2>

          {view === 'signup' && (
            <>
              <input placeholder="Full Name" style={inputStyle} onChange={e => setForm({...form, name: e.target.value})} />
              <input placeholder="Profession" style={inputStyle} onChange={e => setForm({...form, profession: e.target.value})} />
              <select style={inputStyle} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="Writer">I am a Writer</option>
                <option value="Director">I am a Director</option>
              </select>
            </>
          )}

          <input 
            placeholder="Registered Email Address" 
            type="email" 
            style={inputStyle} 
            onChange={e => setForm({...form, email: e.target.value})} 
          />
          
          {view === 'forgot' ? (
            <input 
              placeholder="New Password" 
              type="password" 
              style={inputStyle} 
              onChange={e => setNewPassword(e.target.value)} 
            />
          ) : (
            <input 
              placeholder="Password" 
              type="password" 
              style={inputStyle} 
              onChange={e => setForm({...form, password: e.target.value})} 
            />
          )}

          <button onClick={handleAction} style={actionBtn}>
            {view === 'login' ? 'Login' : view === 'signup' ? 'Register Now' : 'Update Password'}
          </button>

          {view === 'login' && (
            <p 
              onClick={() => setView('forgot')} 
              style={{ fontSize: '13px', color: '#636e72', cursor: 'pointer', marginTop: '15px', textDecoration: 'underline' }}
            >
              Forgot Password?
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// --- STYLES ---
const containerStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundImage: "url('/auth background.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', fontFamily: "'Segoe UI', sans-serif" };
const glassCard = { background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', padding: '50px', borderRadius: '30px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', textAlign: 'center', width: '380px', border: '1px solid rgba(255, 255, 255, 0.3)' };
const authCard = { background: 'rgba(255, 255, 255, 0.95)', padding: '40px', borderRadius: '24px', boxShadow: '0 15px 45px rgba(0,0,0,0.2)', textAlign: 'center', width: '360px', position: 'relative', backdropFilter: 'blur(10px)' };
const logoStyle = { width: '90px', height: '90px', borderRadius: '20px', objectFit: 'cover', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' };
const btnPrimary = { width: '100%', padding: '14px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', margin: '10px 0', transition: '0.3s' };
const btnSecondary = { width: '100%', padding: '14px', background: 'transparent', color: '#2d3436', border: '2px solid #2d3436', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' };
const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', border: '1px solid #ddd', borderRadius: '10px', background: '#fff', boxSizing: 'border-box', outline: 'none' };
const actionBtn = { ...btnPrimary, marginTop: '15px', background: '#4A4A4A' };
const backBtn = { position: 'absolute', top: '25px', left: '20px', background: 'none', border: 'none', color: '#4A4A4A', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const footerBrand = { marginTop: '40px', fontSize: '11px', color: '#636e72', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' };

export default AuthPage;