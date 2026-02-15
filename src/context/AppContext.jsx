import React, { createContext, useState, useEffect } from 'react';
import { getDatabase, ref, onValue, remove, push, set } from "firebase/database";

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
      } else {
        setStories([]);
      }
    });
    return () => unsubscribe();
  }, [db]);

  // --- DELETE STORY FUNCTION ---
  const deleteStory = async (storyId) => {
    if (window.confirm("Are you sure you want to delete this story?")) {
      try {
        await remove(ref(db, `stories/${storyId}`));
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  // --- SEND REQUEST FUNCTION ---
  const sendRequest = async (ownerEmail, storyTitle) => {
    if (!user) return alert("Please Login First!");
    try {
      const ownerKey = ownerEmail.replace(/\./g, ',');
      const newRequestRef = push(ref(db, `requests/${ownerKey}`));
      await set(newRequestRef, {
        fromEmail: user.email,
        fromName: user.name,
        storyTitle: storyTitle,
        status: 'pending',
        timestamp: Date.now()
      });
      alert("Request Sent Successfully!");
    } catch (error) {
      alert("Request failed!");
    }
  };

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
      deleteStory, sendRequest, // Functions added here
      logout 
    }}>
      {children}
    </AppContext.Provider>
  );
};