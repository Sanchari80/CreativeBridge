import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { db } from '../App.jsx'; 
import { ref, set, get, child } from "firebase/database";
import { getAuth, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const AuthPage = () => { 
  const { setUser } = useContext(AppContext);
  const [view, setView] = useState('login'); 
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Writer', profession: '', pic: null });

  const handleAction = async () => {
    const auth = getAuth();
    const emailInput = form.email ? form.email.replace(/\s+/g, '').toLowerCase() : "";
    const passwordInput = form.password ? form.password.trim() : "";
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
          alert("The account is not found in database");
        }
      } catch (error) {
        console.error(error);
        alert("Login failed: " + error.message);
      }
    } else {
      // SIGN UP লজিক - এখানে শর্ত যোগ করা হয়েছে
      if (!form.name || !emailInput || !passwordInput || !form.profession) {
        return alert("Please fill all the fields!");
      }

      // পাসওয়ার্ডের দৈর্ঘ্য চেক করার শর্ত
      if (passwordInput.length < 6) {
        return alert("For security, password must be at least 6 characters long!");
      }

      try {
        await createUserWithEmailAndPassword(auth, emailInput, passwordInput);

        const newUser = { ...form, email: emailInput, password: passwordInput, id: Date.now() };
        await set(ref(db, `users/${emailKey}`), newUser);
        
        localStorage.setItem('activeUser', JSON.stringify(newUser));
        setUser(newUser);
        alert("Account created successfully!");
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          alert("An account with this email already exists!");
        } else {
          alert("Sign-up failed: " + error.message);
        }
      }
    }
  };

  const handleResetPassword = async () => {
    const emailPrompt = prompt("Please send your email to reset your password");
    if (!emailPrompt) return;
    
    const auth = getAuth();
    const emailInput = emailPrompt.replace(/\s+/g, '').toLowerCase();

    try {
      await sendPasswordResetEmail(auth, emailInput);
      alert("We have sent a password reset link to your email!");
    } catch (error) {
      console.error(error);
      alert("We couldn't send the reset email. Please check the email address and try again.");
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
          
          {view === 'login' && (
            <div style={{ textAlign: 'right', width: '100%', marginBottom: '10px' }}>
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