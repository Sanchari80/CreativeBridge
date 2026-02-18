import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { getDatabase, ref, set, get, child } from "firebase/database";

const Authpage = () => {
  const { setUser } = useContext(AppContext);
  // Default view 'login' kore dilam jate blank screen na ashe
  const [view, setView] = useState('login'); 
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Writer', profession: '' });

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
        } else { alert("ভুল পাসওয়ার্ড!"); }
      } else { alert("এই ইমেইলে কোনো অ্যাকাউন্ট নেই!"); }
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
      <div style={authCard}>
        <img src="/SKT logo.jpg" alt="Logo" style={logoStyle} />
        <h2 style={{ marginBottom: '20px', color: '#2d3436' }}>
          {view === 'login' ? 'Welcome Back' : 'Create Account'}
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
        
        <input placeholder="Email" type="email" style={inputStyle} onChange={e => setForm({...form, email: e.target.value})} />
        <input placeholder="Password" type="password" style={inputStyle} onChange={e => setForm({...form, password: e.target.value})} />
        
        <button onClick={handleAction} style={actionBtn}>
          {view === 'login' ? 'Login' : 'Join Now'}
        </button>

        <p style={{ marginTop: '20px', fontSize: '13px' }}>
          {view === 'login' ? "New here?" : "Already have an account?"} 
          <span onClick={() => setView(view === 'login' ? 'signup' : 'login')} style={{ color: '#2d3436', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}>
            {view === 'login' ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

// Styles
const containerStyle = { 
  height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', 
  backgroundColor: '#f5f6fa', // Background image na thakle jate blank na dekhay
  position: 'fixed', top: 0, left: 0 
};
const authCard = { background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '350px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' };
const logoStyle = { width: '60px', height: '60px', borderRadius: '12px', marginBottom: '10px' };
const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', border: '1px solid #ddd', borderRadius: '10px', boxSizing: 'border-box' };
const actionBtn = { width: '100%', padding: '13px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };

export default Authpage;