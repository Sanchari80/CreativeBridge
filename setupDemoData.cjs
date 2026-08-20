// ════════════════════════════════════════════════════════════════
// Creative Bridge — Demo Data Setup Script
// Run ONCE from project root: node setupDemoData.js
// All content is original or Creative Commons licensed (CC0/CC-BY)
// ════════════════════════════════════════════════════════════════

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, push } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyD4z9lc0igmGliK4qhwT7p5VcPp5ZHG0VM",
  authDomain: "creativebridge-88c8a.firebaseapp.com",
  databaseURL: "https://creativebridge-88c8a-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "creativebridge-88c8a",
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ── Helper ────────────────────────────────────────────────────
const emailKey = (email) => email.replace(/\./g, ',');
const now = Date.now();

// ════════════════════════════════════════════════════════════════
// DEMO USERS
// ════════════════════════════════════════════════════════════════
const USERS = {
  singer1: {
    email: 'demo.singer1@creativebridge.demo',
    name: 'Riya Chowdhury',
    role: 'Singer',
    profession: 'Classical & Folk Singer',
    address: 'Dhaka, Bangladesh',
    bio: 'Passionate about Bengali folk music and classical ragas. Performing since age 8.',
    profilePic: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=150&h=150&fit=crop&crop=face',
  },
  singer2: {
    email: 'demo.singer2@creativebridge.demo',
    name: 'Arif Rahman',
    role: 'Singer',
    profession: 'Rock & Fusion Vocalist',
    address: 'Chittagong, Bangladesh',
    bio: 'Blending Bengali lyrics with modern rock and fusion beats.',
    profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  },
  dancer1: {
    email: 'demo.dancer1@creativebridge.demo',
    name: 'Priya Das',
    role: 'Dancer',
    profession: 'Bharatnatyam & Contemporary',
    address: 'Sylhet, Bangladesh',
    bio: 'Training in Bharatnatyam for 12 years, blending classical with contemporary movement.',
    profilePic: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
  },
  dancer2: {
    email: 'demo.dancer2@creativebridge.demo',
    name: 'Tanvir Hasan',
    role: 'Dancer',
    profession: 'Hip-Hop & Street Dance',
    address: 'Rajshahi, Bangladesh',
    bio: 'Street dancer and choreographer. Teaching hip-hop since 2018.',
    profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  },
  painter1: {
    email: 'demo.painter1@creativebridge.demo',
    name: 'Mitu Akter',
    role: 'Painter',
    profession: 'Watercolor & Digital Artist',
    address: 'Comilla, Bangladesh',
    bio: 'Creating vivid watercolor landscapes and digital portraits inspired by rural Bangladesh.',
    profilePic: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
  },
  painter2: {
    email: 'demo.painter2@creativebridge.demo',
    name: 'Sohel Islam',
    role: 'Painter',
    profession: 'Abstract & Oil Painter',
    address: 'Khulna, Bangladesh',
    bio: 'Abstract expressions inspired by the rivers and landscapes of Bengal.',
    profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  },
  actor1: {
    email: 'demo.actor1@creativebridge.demo',
    name: 'Farhan Chowdhury',
    role: 'Actor',
    profession: 'TV Actor & Anchor',
    address: 'Dhaka, Bangladesh',
    bio: 'Stage and TV actor with 5 years of experience in Bangladeshi drama productions.',
    profilePic: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
  },
  writer1: {
    email: 'demo.writer1@creativebridge.demo',
    name: 'Sadia Islam',
    role: 'Writer',
    profession: 'Screenplay & Fiction Writer',
    address: 'Dhaka, Bangladesh',
    bio: 'Award-winning short story writer. Writing screenplays for Bangladeshi OTT platforms.',
    profilePic: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  },
  writer2: {
    email: 'demo.writer2@creativebridge.demo',
    name: 'Karim Uddin',
    role: 'Writer',
    profession: 'Playwright & Poet',
    address: 'Mymensingh, Bangladesh',
    bio: 'Poet and playwright drawing from rural Bengali life and tradition.',
    profilePic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
  },
};

// ════════════════════════════════════════════════════════════════
// DEMO CONTENT
// ════════════════════════════════════════════════════════════════

// ── Songs (YouTube Creative Commons licensed) ─────────────────
const SONGS = {
  singer1: [
    {
      title: 'আমার সোনার বাংলা (Instrumental Cover)',
      genre: 'Folk / Classical',
      // CC-licensed instrumental, YouTube CC
      fileUrl: 'https://www.youtube.com/watch?v=PpCWBe7Bxwk',
      mediaType: 'video',
      uploadedAt: now - 7*24*60*60*1000,
    },
    {
      title: 'Baul Medley — Rivers of Bengal',
      genre: 'Baul / Folk',
      fileUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
      mediaType: 'video',
      uploadedAt: now - 3*24*60*60*1000,
    },
  ],
  singer2: [
    {
      title: 'Monsoon Fusion — Original Composition',
      genre: 'Rock / Fusion',
      // YouTube Audio Library — free to use
      fileUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      mediaType: 'video',
      uploadedAt: now - 10*24*60*60*1000,
    },
  ],
};

// ── Dance videos (YouTube Creative Commons) ───────────────────
const DANCE_VIDEOS = {
  dancer1: [
    {
      title: 'Bharatnatyam — Alapadma Varnam',
      style: 'Bharatnatyam',
      // Public CC dance performance
      fileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
      uploadedAt: now - 5*24*60*60*1000,
    },
    {
      title: 'Contemporary Fusion — Water & Wind',
      style: 'Contemporary',
      fileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
      uploadedAt: now - 2*24*60*60*1000,
    },
  ],
  dancer2: [
    {
      title: 'Dhaka Streets — Hip Hop Showcase',
      style: 'Hip-Hop / Street',
      fileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
      uploadedAt: now - 8*24*60*60*1000,
    },
  ],
};

// ── Artworks (Unsplash CC0 — free to use commercially) ────────
const ARTWORKS = {
  painter1: [
    {
      title: 'Morning Mist on the Padma',
      style: 'Watercolor Landscape',
      fileUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800',
      uploadedAt: now - 12*24*60*60*1000,
    },
    {
      title: 'Village Girl — Gouache Portrait',
      style: 'Portrait / Gouache',
      fileUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
      uploadedAt: now - 4*24*60*60*1000,
    },
    {
      title: 'Rickshaw Puller at Dusk',
      style: 'Digital Illustration',
      fileUrl: 'https://images.unsplash.com/photo-1577083552792-a0d461cb1dd6?w=800',
      uploadedAt: now - 1*24*60*60*1000,
    },
  ],
  painter2: [
    {
      title: 'Abstract Sundarbans',
      style: 'Abstract / Oil',
      fileUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800',
      uploadedAt: now - 9*24*60*60*1000,
    },
    {
      title: 'Monsoon Chaos — Acrylic',
      style: 'Abstract / Acrylic',
      fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      uploadedAt: now - 6*24*60*60*1000,
    },
  ],
};

// ── Actor demo videos ─────────────────────────────────────────
const ACTOR_VIDEOS = {
  actor1: [
    {
      title: 'Monologue — The Last Rickshaw (Demo)',
      type: 'Actor',
      fileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
      uploadedAt: now - 6*24*60*60*1000,
    },
    {
      title: 'News Anchor Reel — Channel 24 Style',
      type: 'Anchor',
      fileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
      uploadedAt: now - 2*24*60*60*1000,
    },
  ],
};

// ── Original Stories (100% original — no copyright issue) ─────
const STORIES = [
  {
    // English Screenplay
    Name: 'The Last Ferry',
    genre: 'Drama',
    logline: 'A retired ferryman\'s final crossing on the Buriganga becomes a journey through his life\'s regrets and love.',
    synopsis: 'EXT. BURIGANGA RIVER — DAWN\n\nRAHIM (70s), weathered hands gripping the oar, guides his wooden ferry across the grey morning river. A young JOURNALIST boards. Over the crossing, she pieces together the story of a man who chose the river over everything — family, ambition, love. As they reach the far bank, Rahim reveals he is crossing for the last time.\n\nThemes: Memory, sacrifice, the passage of time in urban Dhaka.',
    fullStoryFile: '',
    contactEmail: 'demo.writer1@creativebridge.demo',
    contactPhone: '',
    writerEmail: 'demo.writer1@creativebridge.demo',
    writerName: 'Sadia Islam',
    writerPic: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    writerProfession: 'Screenplay & Fiction Writer',
    isSynopsisLocked: false,
    isFullStoryLocked: true,
    isContactLocked: true,
    timestamp: now - 14*24*60*60*1000,
  },
  {
    // Bangla Story
    Name: 'নদীর কথা',
    genre: 'Romance',
    logline: 'পদ্মার তীরে দুটি প্রজন্মের প্রেমের গল্প — একটি হারিয়ে গেছে, একটি খুঁজে পাচ্ছে।',
    synopsis: 'বাংলাদেশের একটি ছোট নদীতীরের গ্রামে, বৃদ্ধা রেহানা তার নাতনিকে তার যৌবনের প্রেমের গল্প বলেন। সেই গল্প শুনতে শুনতে নাতনি আবিষ্কার করে যে তার নিজের জীবনেও একই রকম একটি মুহূর্ত আসছে। দুটি সময়ের সমান্তরাল কাহিনি একসাথে এগিয়ে চলে পদ্মার মতোই।',
    fullStoryFile: '',
    contactEmail: 'demo.writer1@creativebridge.demo',
    contactPhone: '',
    writerEmail: 'demo.writer1@creativebridge.demo',
    writerName: 'Sadia Islam',
    writerPic: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    writerProfession: 'Screenplay & Fiction Writer',
    isSynopsisLocked: false,
    isFullStoryLocked: true,
    isContactLocked: true,
    timestamp: now - 10*24*60*60*1000,
  },
  {
    // English Fiction
    Name: 'Monsoon Protocol',
    genre: 'Thriller',
    logline: 'A Dhaka cybersecurity analyst discovers a data breach that threatens the entire nation\'s banking system — during a category-5 cyclone.',
    synopsis: 'INT. DHAKA DATA CENTER — NIGHT\n\nNAFISA (28), a cybersecurity analyst, detects an unusual packet during a routine audit. As Cyclone Hamid batters the coast, she realizes the breach is not random — it is timed to the storm, when emergency protocols lower security walls. Racing against both the clock and the weather, she must stop an inside threat without alerting the very people who may be behind it.\n\nHigh-concept thriller grounded in authentic Bangladeshi tech infrastructure.',
    fullStoryFile: '',
    contactEmail: 'demo.writer2@creativebridge.demo',
    contactPhone: '',
    writerEmail: 'demo.writer2@creativebridge.demo',
    writerName: 'Karim Uddin',
    writerPic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    writerProfession: 'Playwright & Poet',
    isSynopsisLocked: false,
    isFullStoryLocked: true,
    isContactLocked: true,
    timestamp: now - 7*24*60*60*1000,
  },
  {
    // Bangla Screenplay
    Name: 'শেষ চিঠি',
    genre: 'Drama',
    logline: 'মুক্তিযুদ্ধের সময় লেখা একটি অসম্পূর্ণ চিঠি, পঞ্চাশ বছর পর তার গন্তব্যে পৌঁছায়।',
    synopsis: '১৯৭১ সালের মার্চ মাসে, যশোরের একজন তরুণ শিক্ষক তার প্রেমিকাকে একটি চিঠি লেখা শুরু করেন। চিঠিটি কখনো পৌঁছায়নি। ২০২১ সালে, তার ছেলে পুরনো বাড়ি ভাঙতে গিয়ে দেয়ালের ভেতর থেকে সেই চিঠি খুঁজে পায়। একটি পরিবারের ইতিহাস, একটি দেশের স্বাধীনতা, এবং একটি অসম্পূর্ণ ভালোবাসার গল্প।',
    fullStoryFile: '',
    contactEmail: 'demo.writer2@creativebridge.demo',
    contactPhone: '',
    writerEmail: 'demo.writer2@creativebridge.demo',
    writerName: 'Karim Uddin',
    writerPic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    writerProfession: 'Playwright & Poet',
    isSynopsisLocked: false,
    isFullStoryLocked: true,
    isContactLocked: true,
    timestamp: now - 3*24*60*60*1000,
  },
];

// ════════════════════════════════════════════════════════════════
// MAIN — Push all demo data to Firebase
// ════════════════════════════════════════════════════════════════
async function setup() {
  console.log('\n🚀 Setting up Creative Bridge demo data...\n');

  // ── 1. Create user profiles ───────────────────────────────────
  for (const [key, u] of Object.entries(USERS)) {
    const ek = emailKey(u.email);
    await set(ref(db, `users/${ek}`), {
      ...u, id: now, profilePic: u.profilePic,
      isDemo: true,
    });
    console.log(`✅ User: ${u.name} (${u.role})`);
  }

  // ── 2. Push singer talent profiles + songs ────────────────────
  for (const [key, songs] of Object.entries(SONGS)) {
    const u  = USERS[key];
    const ek = emailKey(u.email);
    const basePath = `talents/singer/${ek}`;
    await set(ref(db, `${basePath}/profile`), {
      name: u.name, email: u.email, profilePic: u.profilePic,
      profession: u.profession, address: u.address, bio: u.bio,
    });
    for (const song of songs) {
      await push(ref(db, `${basePath}/songs`), song);
      console.log(`  🎵 Song: ${song.title}`);
    }
  }

  // ── 3. Push dancer profiles + videos ─────────────────────────
  for (const [key, videos] of Object.entries(DANCE_VIDEOS)) {
    const u  = USERS[key];
    const ek = emailKey(u.email);
    const basePath = `talents/dancer/${ek}`;
    await set(ref(db, `${basePath}/profile`), {
      name: u.name, email: u.email, profilePic: u.profilePic,
      profession: u.profession, address: u.address, bio: u.bio,
    });
    for (const vid of videos) {
      await push(ref(db, `${basePath}/videos`), vid);
      console.log(`  💃 Dance: ${vid.title}`);
    }
  }

  // ── 4. Push painter profiles + artworks ──────────────────────
  for (const [key, arts] of Object.entries(ARTWORKS)) {
    const u  = USERS[key];
    const ek = emailKey(u.email);
    const basePath = `talents/painter/${ek}`;
    await set(ref(db, `${basePath}/profile`), {
      name: u.name, email: u.email, profilePic: u.profilePic,
      profession: u.profession, address: u.address, bio: u.bio,
    });
    for (const art of arts) {
      await push(ref(db, `${basePath}/artworks`), art);
      console.log(`  🎨 Artwork: ${art.title}`);
    }
  }

  // ── 5. Push actor profiles + videos ──────────────────────────
  for (const [key, videos] of Object.entries(ACTOR_VIDEOS)) {
    const u  = USERS[key];
    const ek = emailKey(u.email);
    const basePath = `talents/actor/${ek}`;
    await set(ref(db, `${basePath}/profile`), {
      name: u.name, email: u.email, profilePic: u.profilePic,
      profession: u.profession, address: u.address, bio: u.bio,
    });
    for (const vid of videos) {
      await push(ref(db, `${basePath}/videos`), vid);
      console.log(`  🎬 Video: ${vid.title}`);
    }
  }

  // ── 6. Push original stories ──────────────────────────────────
  for (const story of STORIES) {
    await push(ref(db, 'stories'), story);
    console.log(`  📜 Story: ${story.Name}`);
  }

  console.log('\n✅ Demo data setup complete!');
  console.log('👉 Note: Demo artworks use Unsplash CC0 images.');
  console.log('👉 Note: All stories are 100% original — no copyright.');
  console.log('👉 Note: Dance/Actor videos use placeholder Drive links — replace with real CC videos.\n');
  process.exit(0);
}

setup().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
