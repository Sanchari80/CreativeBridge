import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // --- LOCALSTORAGE THEKE DATA LOAD ---
  // আপনার App.jsx এ 'activeUser' ব্যবহার করা হয়েছে, তাই এখানেও 'activeUser' থাকতে হবে
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('activeUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // ফায়ারবেস থেকে ডাটা আসবে, তাই শুরুতে খালি অ্যারে রাখা ভালো
  const [stories, setStories] = useState([]);

  const [requests, setRequests] = useState(() => {
    const savedRequests = localStorage.getItem('requests');
    return savedRequests ? JSON.parse(savedRequests) : [];
  });

  // নোটিফিকেশন থেকে স্টোরি ওপেন করার স্টেট
  const [activeStoryId, setActiveStoryId] = useState(null);

  // --- DATA SAVE KORA ---
  useEffect(() => {
    if (user) {
      localStorage.setItem('activeUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('activeUser');
    }
  }, [user]);

  useEffect(() => {
    if (requests.length > 0) {
      localStorage.setItem('requests', JSON.stringify(requests));
    }
  }, [requests]);

  const logout = () => {
    localStorage.removeItem('activeUser');
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ 
      user, setUser, 
      stories, setStories, 
      requests, setRequests,
      activeStoryId, setActiveStoryId,
      logout 
    }}>
      {children}
    </AppContext.Provider>
  );
};