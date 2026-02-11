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

  // --- DATA SAVE KORA (JOKHON-I CHANGE HOBE) ---
  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('requests', JSON.stringify(requests));
  }, [requests]);

  // Logout function (Dorkar hole)
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AppContext.Provider value={{ 
      user, setUser, 
      stories, setStories, 
      requests, setRequests,
      logout 
    }}>
      {children}
    </AppContext.Provider>
  );
};