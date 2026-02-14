import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('activeUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // লোকাল স্টোরেজ থেকে রিড করার লজিক ফিরিয়ে আনা হলো যাতে Firebase লোড হওয়ার আগে পুরনো ডাটা দেখা যায়
  const [stories, setStories] = useState(() => {
    const savedStories = localStorage.getItem('stories');
    return savedStories ? JSON.parse(savedStories) : [];
  });

  const [requests, setRequests] = useState(() => {
    const savedRequests = localStorage.getItem('requests');
    return savedRequests ? JSON.parse(savedRequests) : [];
  });

  const [activeStoryId, setActiveStoryId] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('activeUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('activeUser');
    }
  }, [user]);

  // স্টোরি আপডেট হলে লোকাল স্টোরেজেও রাখা হচ্ছে
  useEffect(() => {
    localStorage.setItem('stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('requests', JSON.stringify(requests));
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