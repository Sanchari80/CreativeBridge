import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // --- LOCALSTORAGE THEKE DATA LOAD ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [stories, setStories] = useState(() => {
    const savedStories = localStorage.getItem('stories');
    return savedStories ? JSON.parse(savedStories) : [];
  });

  const [requests, setRequests] = useState(() => {
    const savedRequests = localStorage.getItem('requests');
    return savedRequests ? JSON.parse(savedRequests) : [];
  });

  // নোটিফিকেশন থেকে স্টোরি ওপেন করার জন্য নতুন স্টেট
  const [activeStoryId, setActiveStoryId] = useState(null);

  // --- DATA SAVE KORA ---
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('requests', JSON.stringify(requests));
  }, [requests]);

  const logout = () => {
    setUser(null);
    localStorage.clear(); // সব ডেটা ক্লিয়ার করবে
  };

  return (
    <AppContext.Provider value={{ 
      user, setUser, 
      stories, setStories, 
      requests, setRequests,
      activeStoryId, setActiveStoryId, // এগুলো শেয়ার করা হলো
      logout 
    }}>
      {children}
    </AppContext.Provider>
  );
};