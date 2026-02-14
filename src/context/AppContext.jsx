import React, { createContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const auth = getAuth();
  const db = getDatabase(undefined, "https://creativebridge-88c8a-default-rtdb.asia-southeast1.firebasedatabase.app/");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('activeUser');
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

  const [activeStoryId, setActiveStoryId] = useState(null);

  // ১. Firebase Auth State Sync (Mobile login fix korar jonno)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User profile data (Name/Pic) jodi database e thake ota fetch kora dorkar
        // Tobe আপাততো auth user set kora hocche
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || "Anonymous",
          profilePic: firebaseUser.photoURL || "/icon.png"
        };
        setUser(userData);
        localStorage.setItem('activeUser', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('activeUser');
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // ২. Database theke Stories Fetch kora (Real-time updates)
  useEffect(() => {
    const storiesRef = ref(db, 'stories');
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedStories = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setStories(formattedStories);
        localStorage.setItem('stories', JSON.stringify(formattedStories));
      }
    });
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    localStorage.setItem('requests', JSON.stringify(requests));
  }, [requests]);

  const logout = () => {
    auth.signOut().then(() => {
      localStorage.clear();
      setUser(null);
    });
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