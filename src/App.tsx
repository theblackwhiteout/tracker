import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Tv, 
  BookOpen, 
  Video, 
  Film, 
  List, 
  Search, 
  Calendar, 
  Sparkles, 
  MessageSquare, 
  LogIn, 
  LogOut, 
  User, 
  Heart,
  Loader2,
  BookmarkCheck,
  Globe,
  Flame,
  Clapperboard,
  Gamepad2,
  ShieldCheck,
  Home
} from "lucide-react";

import { 
  subscribeToAuth, 
  loginWithGoogle, 
  logUserOut, 
  getWatchlist, 
  saveWatchlistItem, 
  deleteWatchlistItem,
  clearAllUserData
} from "./firebase";
import { ActiveUser, MediaItem, WatchlistItem, WatchStatus, MediaType } from "./types";

import SearchBlock from "./components/SearchBlock";
import AiringCalendar from "./components/AiringCalendar";
import UnifiedWatchlist from "./components/UnifiedWatchlist";
import AIRecommendations from "./components/AIRecommendations";
import CommunityReviewsBlock from "./components/CommunityReviewsBlock";
import MediaDetailsView from "./components/MediaDetailsView";
import HomeBlock from "./components/HomeBlock";
import UserProfileBlock from "./components/UserProfileBlock";

type ActiveTab = "home" | "watchlist" | "discover" | "calendar" | "reviews" | "profile";
type GlobalCategory = "all" | "otaku" | "western";

export default function App() {
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [lastSearchTab, setLastSearchTab] = useState<"discover" | "watchlist" | "calendar" | "reviews">("discover");

  // Keep lastSearchTab in sync with any active non-home, non-profile tab
  useEffect(() => {
    if (activeTab !== "home" && activeTab !== "profile") {
      setLastSearchTab(activeTab as any);
    }
  }, [activeTab]);
  
  // Overarching separation filter for Otaku vs Western
  const [globalCategory, setGlobalCategory] = useState<GlobalCategory>("all");

  // Detailed Media Modal State
  const [selectedMediaDetail, setSelectedMediaDetail] = useState<MediaItem | null>(null);

  // Watchlist Core State
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);

  // Sync Watchlist when Auth completes
  useEffect(() => {
    setIsAuthLoading(true);
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // Fallback to unified local guest session so user can track immediately
        setCurrentUser({
          uid: "guest_user",
          displayName: "Guest Explorer",
          email: "guest@example.com",
          photoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=guest_user"
        });
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Watchlist whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchWatchlistData(currentUser.uid);
    } else {
      setWatchlist([]);
    }
  }, [currentUser]);

  const fetchWatchlistData = async (uid: string) => {
    setIsWatchlistLoading(true);
    try {
      const items = await getWatchlist(uid);
      setWatchlist(items);
    } catch (err) {
      console.error("Watchlist fetch fail:", err);
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  const [authLoading, setAuthLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setAuthLoading(true);
      const user = await loginWithGoogle();

      // Auto-migrate any accumulated guest items to the newly registered/logged-in Google account
      const guestItems = watchlist.filter(item => item.userId === "guest_user");
      if (guestItems.length > 0) {
        console.log(`Merging ${guestItems.length} items from offline guest session into authenticated Firebase account...`);
        const migratedItems: WatchlistItem[] = guestItems.map(item => ({
          ...item,
          id: `${user.uid}_${item.mediaType}_${item.mediaId}`,
          userId: user.uid,
          updatedAt: new Date().toISOString()
        }));
        
        for (const item of migratedItems) {
          try {
            await saveWatchlistItem(item);
          } catch (e) {
            console.error("Failed to migrate guest item:", e);
          }
        }
        
        // Fetch user's synchronized backend watchlist
        const userCloudWatch = await getWatchlist(user.uid);
        setWatchlist(userCloudWatch);
        
        // Clean out guest items from local localStorage
        const rawLocal = localStorage.getItem("unified_media_tracker_watchlist");
        if (rawLocal) {
          try {
            const list: WatchlistItem[] = JSON.parse(rawLocal);
            const remainder = list.filter(item => item.userId !== "guest_user");
            localStorage.setItem("unified_media_tracker_watchlist", JSON.stringify(remainder));
          } catch (err) {
            // ignore
          }
        }
      } else {
        setCurrentUser(user);
        const userWatch = await getWatchlist(user.uid);
        setWatchlist(userWatch);
      }
    } catch (err: any) {
      console.error("Google Auth execution failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logUserOut();
      setCurrentUser({
        uid: "guest_user",
        displayName: "Guest Explorer",
        email: "guest@example.com",
        photoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=guest_user"
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleClearAllUserData = async () => {
    if (!currentUser) return;
    try {
      await clearAllUserData(currentUser.uid);
      setWatchlist([]);
      // Synchronously sign out the user to complete session and cookie purging (NIST CSF / MITRE D3FEND D3-SFP)
      await handleLogout();
    } catch (err) {
      console.error("Purging all data failed:", err);
      throw err;
    }
  };

  // Watchlist manipulation callbacks
  const handleAddToWatchlist = async (media: MediaItem, customStatus: WatchStatus = "planning") => {
    const activeUser = currentUser || {
      uid: "guest_user",
      displayName: "Guest Explorer",
      email: "guest@example.com",
      photoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=guest_user"
    };

    const itemId = `${activeUser.uid}_${media.mediaType}_${media.mediaId}`;
    
    // Check duplication
    const duplicate = watchlist.find(item => item.id === itemId);
    if (duplicate) return;

    const newItem: WatchlistItem = {
      id: itemId,
      userId: activeUser.uid,
      mediaId: media.mediaId,
      mediaType: media.mediaType,
      title: media.title,
      coverImage: media.coverImage,
      status: customStatus,
      progress: 0,
      totalUnits: media.totalUnits || 0,
      rating: 0,
      notes: "",
      updatedAt: new Date().toISOString()
    };

    // Optimistic Save
    setWatchlist(prev => [newItem, ...prev]);

    try {
      await saveWatchlistItem(newItem);
    } catch (err) {
      console.error("Failed storing item:", err);
      // Rollback on issues
      setWatchlist(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleUpdateWatchItem = async (updatedItem: WatchlistItem) => {
    setWatchlist(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    try {
      await saveWatchlistItem(updatedItem);
    } catch (err) {
      console.error("Save error during update sync:", err);
    }
  };

  const handleDeleteWatchItem = async (id: string) => {
    setWatchlist(prev => prev.filter(item => item.id !== id));
    try {
      await deleteWatchlistItem(id);
    } catch (err) {
      console.error("Delete sync error:", err);
    }
  };

  const handleImportWatchlist = async (importedItems: any[]) => {
    if (!currentUser) return;

    const formattedItems: WatchlistItem[] = importedItems.map((item, index) => {
      const mediaId = item.mediaId || `import_${Date.now()}_${index}`;
      const itemId = `${currentUser.uid}_${item.mediaType || "anime"}_${mediaId}`;
      const defaultCover = `https://placehold.co/300x450/0f172a/3b82f6?text=${encodeURIComponent(item.title)}`;
      return {
        id: itemId,
        userId: currentUser.uid,
        mediaId: mediaId,
        mediaType: item.mediaType || "anime",
        title: item.title,
        coverImage: item.coverImage || defaultCover,
        status: item.status || "planning",
        progress: Number(item.progress) || 0,
        totalUnits: Number(item.totalUnits) || 0,
        rating: Number(item.rating) || 0,
        notes: item.notes || "",
        updatedAt: new Date().toISOString()
      };
    });

    setWatchlist(prev => {
      const merged = [...prev];
      for (const newItem of formattedItems) {
        const dupIdx = merged.findIndex(i => i.mediaId === newItem.mediaId && i.mediaType === newItem.mediaType);
        if (dupIdx >= 0) {
          merged[dupIdx] = {
            ...merged[dupIdx],
            status: newItem.status,
            progress: Math.max(merged[dupIdx].progress, newItem.progress),
            rating: newItem.rating || merged[dupIdx].rating,
            notes: newItem.notes || merged[dupIdx].notes,
            updatedAt: new Date().toISOString()
          };
        } else {
          merged.unshift(newItem);
        }
      }
      return merged;
    });

    // Save sequentially to make sure everything persists in Firestore
    for (const item of formattedItems) {
      try {
        await saveWatchlistItem(item);
      } catch (err) {
        console.error("Failed saving imported watchlist item:", err);
      }
    }
  };

  const addedMediaIds = watchlist.map(i => `${i.mediaType}_${i.mediaId}`);

  // Dynamic filter lists for bento indicators
  const otakuWatchcount = watchlist.filter(item => item.mediaType === "anime" || item.mediaType === "manga").length;
  const westernWatchcount = watchlist.filter(item => item.mediaType === "movie" || item.mediaType === "tv").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white" id="root-app">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900" id="header-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 md:py-0 md:h-18 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("discover")} id="brand-logo">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Globe className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-100">
                Unified Media Tracker
              </h1>
              <span className="text-[10px] font-semibold text-indigo-400 block -mt-0.5 uppercase tracking-widest">
                Otaku & Cinephile Sync
              </span>
            </div>
          </div>

          {/* --- TOP BAR ALIGNMENT SPACE SWITCHER (INTEGRAL PARADIGM SHIFT) --- */}
          <div className="flex bg-slate-900/90 border border-slate-800 p-0.5 rounded-xl gap-0.5 shadow-inner" id="global-category-switcher">
            <button
              onClick={() => setGlobalCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                globalCategory === "all" 
                  ? "bg-slate-950 text-indigo-400 border border-indigo-900/30 shadow-md" 
                  : "text-slate-450 hover:text-indigo-200"
              }`}
              id="cat-all"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>All Unified</span>
            </button>
            
            <button
              onClick={() => setGlobalCategory("otaku")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                globalCategory === "otaku" 
                  ? "bg-slate-950 text-emerald-400 border border-emerald-900/30 shadow-md" 
                  : "text-slate-450 hover:text-emerald-200"
              }`}
              id="cat-otaku"
            >
              <Tv className="w-3.5 h-3.5 text-emerald-400" />
              <span>Otaku Mode</span>
            </button>

            <button
              onClick={() => setGlobalCategory("western")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                globalCategory === "western" 
                  ? "bg-slate-950 text-pink-400 border border-pink-900/30 shadow-md" 
                  : "text-slate-450 hover:text-pink-200"
              }`}
              id="cat-western"
            >
              <Film className="w-3.5 h-3.5 text-pink-400" />
              <span>Western Cine</span>
            </button>
          </div>

          {/* User Auth Info block */}
          <div className="flex items-center justify-between md:justify-end gap-3" id="auth-controls">
            {isAuthLoading ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            ) : currentUser ? (
              <div className="flex items-center gap-3">
                <div 
                  className="hidden md:flex flex-col items-end cursor-pointer group" 
                  onClick={() => setActiveTab("profile")}
                  title="View Profile Stats"
                >
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[9px] uppercase font-semibold text-emerald-450 flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Synchronized
                  </span>
                </div>
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  onClick={() => setActiveTab("profile")}
                  className="w-9 h-9 rounded-full border border-indigo-500/25 bg-slate-900 shadow-md shadow-indigo-500/5 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                  title="View Profile Stats"
                />
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 border border-slate-900 hover:border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  id="btn-logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-slate-100 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                id="btn-login"
              >
                <LogIn className="w-4 h-4" />
                Sign In / Register
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Hero Intro Section */}
      <section className="bg-gradient-to-b from-indigo-950/20 via-slate-950 to-slate-950 py-10 border-b border-slate-900/40 animate-fade-in" id="hero-banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-900/35 text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3 animate-pulse text-amber-400" />
              MyAnimeList & IMDb AI Encyclopedia
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight leading-tight">
              One Library. Every Universe.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed font-medium">
              A master tracking hub separating Eastern Japanese <span className="text-indigo-400">Otaku lore</span> from cinematic global <span className="text-indigo-400">Western masterpieces</span> with complete cloud synchronization.
            </p>
          </div>
          
          {currentUser ? (
            <div className="flex gap-4" id="stats-holder">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex items-center gap-3 shadow-xl" id="stat-otaku">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-emerald-400">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-450 block font-bold uppercase">Otaku Media</span>
                  <span className="text-base font-black text-slate-100">{otakuWatchcount}</span>
                  <span className="text-slate-500 text-[9px] block">Logged Items</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex items-center gap-3 shadow-xl" id="stat-western">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-indigo-300">
                  <Clapperboard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-450 block font-bold uppercase">Western Cine</span>
                  <span className="text-base font-black text-slate-100">{westernWatchcount}</span>
                  <span className="text-slate-500 text-[9px] block">Logged Items</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-805 p-4 rounded-2xl max-w-sm text-slate-500 text-xs italic font-medium leading-relaxed">
              * Note: Unauthenticated. Feel free to search and explore using temporary context, but please sign in above to persist your tracking data permanently!
            </div>
          )}
        </div>
      </section>

      {/* --- MASTER TOP NAVIGATION BAR (Separating Home from everything else) --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex justify-center" id="master-nav-wrapper">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-sm" id="master-nav-bar">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "home"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
            }`}
            id="master-btn-home"
          >
            <Home className="w-4 h-4 text-indigo-400" />
            Home
          </button>
          
          <button
            onClick={() => setActiveTab(lastSearchTab)}
            className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab !== "home"
                ? "bg-indigo-650 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
            }`}
            id="master-btn-search"
          >
            <Search className="w-4 h-4 text-pink-400" />
            Search
          </button>
        </div>
      </div>



      {/* DETAILED CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 flex flex-col gap-8">
        
        {/* If on Search Hub, render the four core sub-tabs at the top of the search context page */}
        {activeTab !== "home" && (
          <div className="flex flex-wrap bg-slate-900 p-1.5 rounded-2xl self-center border border-slate-800 justify-center gap-1 shadow-lg" id="search-sub-tabs">
            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "discover" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-805/30"
              }`}
              id="tab-btn-discover"
            >
              <Search className="w-4 h-4" />
              Discover & Search
            </button>
            <button
              onClick={() => setActiveTab("watchlist")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "watchlist" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-805/30"
              }`}
              id="tab-btn-watchlist"
            >
              <List className="w-4 h-4" />
              My Watchlist
              {watchlist.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-slate-950 border border-slate-800 text-indigo-300 font-extrabold rounded-full">
                  {watchlist.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "calendar" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-805/30"
              }`}
              id="tab-btn-calendar"
            >
              <Calendar className="w-4 h-4" />
              Airing Calendar
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "reviews" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-805/30"
              }`}
              id="tab-btn-reviews"
            >
              <MessageSquare className="w-4 h-4" />
              Community Logs
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "profile" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-805/30"
              }`}
              id="tab-btn-profile"
            >
              <User className="w-4 h-4" />
              My Profile
            </button>
          </div>
        )}

        {/* TAB CORRESPONDING VIEWS WITH TRANSLATIONAL TRANSITIONS */}
        <main className="flex-1 pb-16">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <HomeBlock
                  onAddToWatchlist={(item) => handleAddToWatchlist(item, "planning")}
                  watchlistIds={addedMediaIds}
                  onOpenDetails={(item) => setSelectedMediaDetail(item)}
                  globalCategory={globalCategory}
                  setActiveTab={setActiveTab}
                />
              </motion.div>
            )}

            {activeTab === "discover" && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Search Block supporting clicking options, Details trigger and Separation */}
                <SearchBlock
                  onAddToWatchlist={(item, status) => handleAddToWatchlist(item, status)}
                  onOpenReview={(item) => {
                    handleAddToWatchlist(item);
                    setActiveTab("reviews");
                  }}
                  watchlistIds={addedMediaIds}
                  onOpenDetails={(item) => setSelectedMediaDetail(item)}
                  globalCategory={globalCategory}
                />

                {/* AI recommendations bento section */}
                <AIRecommendations
                  watchlist={watchlist}
                  onAddToWatchlist={(item) => handleAddToWatchlist(item, "planning")}
                  watchlistIds={addedMediaIds}
                  onOpenDetails={(item) => setSelectedMediaDetail(item)}
                  globalCategory={globalCategory}
                />
              </motion.div>
            )}

            {activeTab === "watchlist" && (
              <motion.div
                key="watchlist"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                {isWatchlistLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-sm font-medium">Retrieving private watchlist indices...</p>
                  </div>
                ) : (
                  <UnifiedWatchlist
                    watchlist={watchlist}
                    onUpdateItem={handleUpdateWatchItem}
                    onDeleteItem={handleDeleteWatchItem}
                    onOpenDetails={(item) => setSelectedMediaDetail(item)}
                    globalCategory={globalCategory}
                  />
                )}
              </motion.div>
            )}

            {activeTab === "calendar" && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <AiringCalendar
                  onAddToWatchlist={(item) => handleAddToWatchlist(item, "planning")}
                  watchlistIds={addedMediaIds}
                  onOpenDetails={(item) => setSelectedMediaDetail(item)}
                  globalCategory={globalCategory}
                />
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <CommunityReviewsBlock
                  watchlist={watchlist}
                  currentUser={currentUser}
                />
              </motion.div>
            )}

            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <UserProfileBlock
                  watchlist={watchlist}
                  currentUser={currentUser}
                  onOpenDetails={(item) => setSelectedMediaDetail(item)}
                  onLoginRequest={handleLogin}
                  onImportItems={handleImportWatchlist}
                  onClearAllData={handleClearAllUserData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* --- FLOATING DETAILED MODERN DIALOG MODAL (ENCYCLOPEDIA) --- */}
      <AnimatePresence>
        {selectedMediaDetail && (
          <MediaDetailsView
            media={selectedMediaDetail}
            onClose={() => setSelectedMediaDetail(null)}
            onAddToWatchlist={(item, status) => {
              handleAddToWatchlist(item, status);
            }}
            isInWatchlist={watchlist.some(
              (item) => item.mediaId === selectedMediaDetail.mediaId && item.mediaType === selectedMediaDetail.mediaType
            )}
            onOpenDetails={(item) => setSelectedMediaDetail(item)}
            watchlist={watchlist}
            onUpdateWatchItem={handleUpdateWatchItem}
            onDeleteWatchItem={handleDeleteWatchItem}
          />
        )}
      </AnimatePresence>



      {/* FOOTER BAR */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8" id="footer-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="text-xs text-slate-500">
            <p className="font-bold text-slate-450 mb-1">Unified East & West Media Tracker</p>
            <p>© 2026. Powered by AniList GraphQL & Recommendation Models.</p>
          </div>
          
          <div className="flex gap-4 text-xs text-slate-450 font-bold" id="footer-links">
            <span className="hover:text-amber-400 cursor-pointer" onClick={() => { setGlobalCategory("all"); setActiveTab("discover"); }}>Search Matrix</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer" onClick={() => { setGlobalCategory("otaku"); setActiveTab("calendar"); }}>AniList Airing</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer" onClick={() => setActiveTab("reviews")}>Community Posts</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
