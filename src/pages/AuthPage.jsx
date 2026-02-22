import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
// App.jsx থেকে db ইম্পোর্ট করো, আলাদা করে getDatabase লাগবে না
import { db } from '../App.jsx'; 
import { ref, set, get, child } from "firebase/database";

const AuthPage = () => { 
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('login'); 
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Writer', profession: '', pic: null });

  const handleAction = async () => {
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
        } else { alert("ভুল পাসওয়ার্ড!"); }
      } else { alert("অ্যাকাউন্ট পাওয়া যায়নি!"); }
    } else {
      if (!form.name || !emailInput || !passwordInput || !form.profession) {
        return alert("সব ঘর পূরণ কর!");
      }
      const newUser = { ...form, email: emailInput, password: passwordInput, id: Date.now() };
      await set(ref(db, `users/${emailKey}`), newUser);
      localStorage.setItem('activeUser', JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  // পাসওয়ার্ড রিসেট করার নতুন ফাংশন
  const handleResetPassword = async () => {
    const emailPrompt = prompt("আপনার ইমেলটি দিন:");
    if (!emailPrompt) return;
    
    const emailKey = emailPrompt.replace(/\s+/g, '').toLowerCase().replace(/\./g, ',');
    const snapshot = await get(child(ref(db), `users/${emailKey}`));
    
    if (snapshot.exists()) {
      const foundUser = snapshot.val();
      alert(`আপনার পাসওয়ার্ড হলো: ${foundUser.password}`);
    } else {
      alert("এই ইমেল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি!");
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
          <h2 style={{ marginBottom: '20px', color: '#2d3436' }}>
            {view === 'login' ? 'Login' : 'Create Account'}
          </h2>
          
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
          
          {/* পাসওয়ার্ড ভুলে গেলে রিসেট করার বাটন */}
          {view === 'login' && (
            <div style={{ textAlign: 'right', width: '100%' }}>
              <span onClick={handleResetPassword} style={{ fontSize: '12px', color: '#6c5ce7', cursor: 'pointer', fontWeight: '500' }}>
                Forgot Password?
              </span>
            </div>
          )}

          <button onClick={handleAction} style={actionBtn}>
            {view === 'login' ? 'Enter Dashboard' : 'Join Now'}
          </button>

          {view === 'login' && (
            <p style={{ marginTop: '20px', fontSize: '14px' }}>
              Don't have an account? <span onClick={() => setView('signup')} style={{ color: '#6c5ce7', cursor: 'pointer', fontWeight: 'bold' }}>Sign Up</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles (আগে যা ছিল তাই আছে)
const container = { 
  minHeight: '100vh', 
  display: 'flex', 
  flexDirection: 'column', 
  backgroundImage: "url('/auth background.png')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  fontFamily: "'Segoe UI', sans-serif" 
};
const content = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const authCard = { width: '100%', maxWidth: '400px', padding: '40px', borderRadius: '25px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 25px 50px rgba(0,0,0,0.1)', textAlign: 'center', position: 'relative' };
const inputStyle = { width: '100%', padding: '14px', margin: '10px 0', border: '1px solid #ddd', borderRadius: '12px', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '15px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' };
const backBtn = { position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', color: '#6c5ce7', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };

export default AuthPage;