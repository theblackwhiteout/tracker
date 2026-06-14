import React, { useState, useEffect } from "react";
import { List, Star, Plus, Minus, Trash2, Edit2, Check, BookOpen, Film, Tv, Video, ShieldAlert, Heart, Info } from "lucide-react";
import { WatchlistItem, MediaType, WatchStatus, MediaItem } from "../types";

interface UnifiedWatchlistProps {
  watchlist: WatchlistItem[];
  onUpdateItem: (item: WatchlistItem) => void;
  onDeleteItem: (id: string) => void;
  onOpenDetails: (item: MediaItem) => void; // Details overlay trigger
  globalCategory: "all" | "otaku" | "western";
}

const STATUS_FILTERS: { value: WatchStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status Checks" },
  { value: "current", label: "In Progress" },
  { value: "planning", label: "Plan to Track" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "On Hold" },
  { value: "dropped", label: "Dropped" }
];

const MEDIA_FILTERS: { value: MediaType | "all"; label: string; icon: any }[] = [
  { value: "all", label: "All Types", icon: List },
  { value: "anime", label: "Anime (Otaku)", icon: Tv },
  { value: "manga", label: "Manga (Otaku)", icon: BookOpen },
  { value: "movie", label: "Movies (Western)", icon: Video },
  { value: "tv", label: "TV Shows (Western)", icon: Film }
];

export default function UnifiedWatchlist({ watchlist, onUpdateItem, onDeleteItem, onOpenDetails, globalCategory }: UnifiedWatchlistProps) {
  const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");
  const [mediaFilter, setMediaFilter] = useState<MediaType | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit Temp State
  const [tempProgress, setTempProgress] = useState(0);
  const [tempStatus, setTempStatus] = useState<WatchStatus>("current");
  const [tempRating, setTempRating] = useState(10);
  const [tempNotes, setTempNotes] = useState("");

  // Fix mediaFilter compatibility when globalCategory swaps
  useEffect(() => {
    if (globalCategory === "otaku") {
      if (mediaFilter !== "anime" && mediaFilter !== "manga") {
        setMediaFilter("all");
      }
    } else if (globalCategory === "western") {
      if (mediaFilter !== "movie" && mediaFilter !== "tv") {
        setMediaFilter("all");
      }
    } else {
      setMediaFilter("all");
    }
  }, [globalCategory]);

  const startEditing = (item: WatchlistItem) => {
    setEditingId(item.id);
    setTempProgress(item.progress);
    setTempStatus(item.status);
    setTempRating(item.rating);
    setTempNotes(item.notes);
  };

  const handleSaveEdit = (item: WatchlistItem) => {
    onUpdateItem({
      ...item,
      progress: tempProgress,
      status: tempStatus,
      rating: tempRating,
      notes: tempNotes
    });
    setEditingId(null);
  };

  const handleQuickIncrement = (item: WatchlistItem) => {
    const nextProgress = item.progress + 1;
    const isCompleted = item.totalUnits > 0 && nextProgress >= item.totalUnits;
    
    onUpdateItem({
      ...item,
      progress: nextProgress,
      status: isCompleted ? "completed" : item.status
    });
  };

  // Convert tracked watchlist item properties back to complete MediaItem format for details view
  const triggerDetailsForWatchlistItem = (item: WatchlistItem) => {
    onOpenDetails({
      mediaId: item.mediaId,
      title: item.title,
      mediaType: item.mediaType,
      coverImage: item.coverImage,
      description: item.notes || "Currently tracking this media in your Unified Watchlist.",
      genres: [],
      year: 0,
      rating: item.rating,
      totalUnits: item.totalUnits
    });
  };

  // Filter list with both manual filter selection AND global category!
  const filteredList = watchlist.filter(item => {
    // 1. Check status fit
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    
    // 2. Check global category constraints
    let categoryMatch = true;
    if (globalCategory === "otaku") {
      categoryMatch = item.mediaType === "anime" || item.mediaType === "manga";
    } else if (globalCategory === "western") {
      categoryMatch = item.mediaType === "movie" || item.mediaType === "tv";
    }

    // 3. Check manual media type fit
    let mediaTypeMatch = mediaFilter === "all" || item.mediaType === mediaFilter;

    return statusMatch && categoryMatch && mediaTypeMatch;
  });

  const getStatusBadgeClass = (status: WatchStatus) => {
    switch (status) {
      case "current":
        return "bg-sky-950 text-sky-400 border-sky-900/40";
      case "planning":
        return "bg-slate-950 text-slate-400 border-slate-905";
      case "completed":
        return "bg-emerald-950 text-emerald-400 border-emerald-900/40";
      case "paused":
        return "bg-amber-950 text-amber-400 border-amber-900/40";
      case "dropped":
        return "bg-rose-950/40 text-rose-400 border-rose-900/30";
    }
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "anime":
        return <Tv className="w-3.5 h-3.5 text-sky-400" id={`icon-anime-${type}`} />;
      case "manga":
        return <BookOpen className="w-3.5 h-3.5 text-emerald-400" id={`icon-manga-${type}`} />;
      case "movie":
        return <Video className="w-3.5 h-3.5 text-pink-400" id={`icon-movie-${type}`} />;
      case "tv":
        return <Film className="w-3.5 h-3.5 text-amber-400" id={`icon-tv-${type}`} />;
    }
  };

  // Dynamic filter options based on Category tabs
  const filteredMediaFilters = MEDIA_FILTERS.filter(tab => {
    if (globalCategory === "otaku") {
      return tab.value === "all" || tab.value === "anime" || tab.value === "manga";
    }
    if (globalCategory === "western") {
      return tab.value === "all" || tab.value === "movie" || tab.value === "tv";
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="watchlist-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2" id="watchlist-title">
            <List className="w-5 h-5 text-indigo-400" />
            Watchlist Database & Status Indexes
          </h2>
          <p className="text-xs text-slate-400">
            Synchronized logs matching your items against tracking presets. currently viewing{" "}
            <strong className="text-indigo-400 uppercase font-black">{globalCategory}</strong> filter space.
          </p>
        </div>
      </div>

      {/* Media Type Filter Tabs (Scoped dynamically!) */}
      <div className="flex flex-wrap gap-2 mb-4" id="media-filters">
        {filteredMediaFilters.map((tab) => {
          const Icon = tab.icon;
          const isSelected = mediaFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setMediaFilter(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 border-indigo-505 text-white font-black hover:bg-indigo-500 shadow-md shadow-indigo-650/10"
                  : "bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200"
              }`}
              id={`media-filter-${tab.value}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Watch Status Filter Tabs */}
      <div className="flex overflow-x-auto pb-3 mb-6 border-b border-slate-800 gap-1.5" id="status-filters">
        {STATUS_FILTERS.map((tab) => {
          const isSelected = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-950 text-indigo-400 border border-slate-800"
                  : "bg-slate-955 text-slate-450 hover:text-slate-305"
              }`}
              id={`status-filter-${tab.value}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Listing Content */}
      {filteredList.length === 0 ? (
        <div className="text-center py-16 bg-slate-950/30 rounded-xl border border-dashed border-slate-800 flex flex-col items-center gap-3" id="watchlist-empty">
          <ShieldAlert className="w-8 h-8 text-indigo-405/60" />
          <p className="text-sm text-slate-450 font-bold">Your tracking log is empty under these filters.</p>
          <p className="text-xs text-slate-500">Run searches or clear filter categories to retrieve active records.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" id="watchlist-items-list">
          {filteredList.map((item) => {
            const isEditing = editingId === item.id;
            const progressPercent = item.totalUnits > 0 ? (item.progress / item.totalUnits) * 100 : 0;
            
            return (
              <div
                key={item.id}
                className="bg-slate-955 border border-slate-850 hover:border-slate-755 rounded-xl p-4 transition-all duration-200"
                id={`watchlist-card-${item.id}`}
              >
                {!isEditing ? (
                  // --- DISPLAY LAYOUT ---
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-20 object-cover rounded-md bg-slate-900 border border-slate-800 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => triggerDetailsForWatchlistItem(item)}
                        title="Click to view encyclopedia guide"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=${encodeURIComponent(item.title)}`;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {getMediaIcon(item.mediaType)}
                            {item.mediaType}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${getStatusBadgeClass(item.status)}`}>
                            {item.status === "current" 
                              ? item.mediaType === "manga" ? "reading" : "watching"
                              : item.status}
                          </span>
                        </div>
                        <h4 
                          className="font-bold text-slate-100 text-sm truncate max-w-xs md:max-w-md cursor-pointer hover:text-indigo-400 transition-colors"
                          onClick={() => triggerDetailsForWatchlistItem(item)}
                          title="Click to view encyclopedia guide"
                        >
                          {item.title}
                        </h4>
                        
                        {/* Rating Display */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {item.rating > 0 ? (
                            <>
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-bold text-slate-350">{item.rating}/10</span>
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500 italic">Unrated</span>
                          )}
                          {item.notes && (
                            <>
                              <span className="text-slate-700 text-xs">•</span>
                              <span className="text-[11px] text-slate-450 truncate max-w-[150px] italic">
                                "{item.notes}"
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Controls */}
                    <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <div className="flex justify-between items-baseline text-xs font-bold">
                          <span className="text-slate-300">
                            Progress: {item.progress}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            / {item.totalUnits > 0 ? item.totalUnits : "∞"} {item.mediaType === "manga" ? "Chs" : "Eps"}
                          </span>
                        </div>
                        
                        {/* Progress Bar (Visible if totalUnits is present) */}
                        {item.totalUnits > 0 && (
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/40">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, progressPercent)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>

                      {/* Manual Quick Action Button */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuickIncrement(item)}
                          title={`Log +1 ${item.mediaType === "manga" ? "Chapter" : "Episode"}`}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg p-2 transition-colors cursor-pointer"
                          id={`quick-add-${item.id}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Details View Button */}
                        <button
                          onClick={() => triggerDetailsForWatchlistItem(item)}
                          title="Open encyclopedia details"
                          className="bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 rounded-lg p-2 transition-colors cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => startEditing(item)}
                          title="Detailed edit"
                          className="bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 rounded-lg p-2 transition-colors cursor-pointer"
                          id={`edit-item-${item.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          title="Remove item"
                          className="bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-900/30 rounded-lg p-2 transition-all cursor-pointer"
                          id={`delete-item-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // --- INLINE EDIT BLOCK LAYOUT ---
                  <div className="bg-slate-900/40 border border-indigo-900/10 rounded-lg p-3 flex flex-col gap-3" id={`editing-box-${item.id}`}>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                      <span className="text-xs font-bold text-slate-300 font-sans">Detailed Tracker Editor: {item.title}</span>
                      <span className="text-[10px] text-indigo-400 font-semibold uppercase">{item.mediaType}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. Status Selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Status</label>
                        <select
                          value={tempStatus}
                          onChange={(e) => setTempStatus(e.target.value as WatchStatus)}
                          className="text-xs bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-2.5 py-2 focus:border-indigo-500 focus:outline-none font-bold"
                        >
                          <option value="planning">Plan to Watch/Read</option>
                          <option value="current">Watching/Reading</option>
                          <option value="completed">Completed</option>
                          <option value="paused">On Hold</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </div>

                      {/* 2. Rating Editor */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">My Score ({tempRating}/10)</label>
                        <div className="flex gap-1 items-center bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={tempRating}
                            onChange={(e) => setTempRating(parseInt(e.target.value))}
                            className="w-full accent-indigo-500 h-1 rounded"
                          />
                        </div>
                      </div>

                      {/* 3. Units Read/Watched */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">
                          Items Completed / Total
                        </label>
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5">
                          <input
                            type="number"
                            min="0"
                            max={item.totalUnits > 0 ? item.totalUnits : 10000}
                            value={tempProgress}
                            onChange={(e) => setTempProgress(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-12 text-center text-xs bg-transparent border-none text-slate-100 focus:outline-none font-bold"
                          />
                          <span className="text-slate-600 text-xs">/</span>
                          <span className="text-xs text-slate-400 font-bold">{item.totalUnits > 0 ? item.totalUnits : "∞"}</span>
                          
                          {/* Steppers */}
                          <div className="flex gap-1 ml-auto">
                            <button
                              onClick={() => setTempProgress(prev => Math.max(0, prev - 1))}
                              className="p-1 rounded hover:bg-slate-900 text-slate-400"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setTempProgress(prev => item.totalUnits > 0 ? Math.min(item.totalUnits, prev + 1) : prev + 1)}
                              className="p-1 rounded hover:bg-slate-900 text-slate-400"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Mini Review Note */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Personal Notes & Reflections</label>
                      <input
                        type="text"
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Wow plot-twist on ep 8! / Favorite arc starts here."
                        className="text-xs bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-2.5 py-2 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-slate-905 hover:bg-slate-800 text-slate-400 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
                        id={`save-edit-${item.id}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
