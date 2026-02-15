import React, { createContext, useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const db = getDatabase(undefined, "https://creativebridge-88c8a-default-rtdb.asia-southeast1.firebasedatabase.app/");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('activeUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [stories, setStories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeStoryId, setActiveStoryId] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('activeUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('activeUser');
    }
  }, [user]);

  useEffect(() => {
    const storiesRef = ref(db, 'stories');
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formatted = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setStories(formatted);
      }
    });
    return () => unsubscribe();
  }, [db]);

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