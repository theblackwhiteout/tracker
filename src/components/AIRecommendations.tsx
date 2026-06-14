import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Plus, HelpCircle, Film, Tv, BookOpen, Video, Info } from "lucide-react";
import { MediaItem, WatchlistItem, MediaType } from "../types";

interface AIRecommendationsProps {
  watchlist: WatchlistItem[];
  onAddToWatchlist: (item: MediaItem) => void;
  watchlistIds: string[];
  onOpenDetails: (item: MediaItem) => void; // Trigger media detail modal
  globalCategory: "all" | "otaku" | "western";
}

export default function AIRecommendations({ watchlist, onAddToWatchlist, watchlistIds, onOpenDetails, globalCategory }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/gemini/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlist })
      });

      if (!response.ok) {
        throw new Error("Failed to get response from Express AI recommender.");
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err: any) {
      console.error(err);
      setError("AI was unable to formulate customized advice. Standard recommendations are loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [watchlist.length === 0]);

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "anime":
        return <Tv className="w-4 h-4 text-sky-400" id={`icon-anime-${type}`} />;
      case "manga":
        return <BookOpen className="w-4 h-4 text-emerald-400" id={`icon-manga-${type}`} />;
      case "movie":
        return <Video className="w-4 h-4 text-pink-400" id={`icon-movie-${type}`} />;
      case "tv":
        return <Film className="w-4 h-4 text-amber-400" id={`icon-tv-${type}`} />;
    }
  };

  // Filter recommendations based on global category constraints!
  const filteredRecommendations = recommendations.filter((item) => {
    if (globalCategory === "otaku") {
      return item.mediaType === "anime" || item.mediaType === "manga";
    }
    if (globalCategory === "western") {
      return item.mediaType === "movie" || item.mediaType === "tv";
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="ai-recs-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2" id="recs-title">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            Gemini Cohort Predictions
          </h2>
          <p className="text-xs text-slate-400">
            Intelligent predictive matches bridging Japanese anime lore with legendary Western cinematic features.
            {globalCategory !== "all" && (
              <span> Currently tailored to <strong className="text-indigo-400 uppercase">{globalCategory} media</strong>.</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={isLoading}
          className="text-xs bg-slate-950 hover:bg-slate-850 text-indigo-300 font-bold px-4 py-2.5 border border-slate-850 hover:border-slate-700 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          id="recs-reload"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Regenerate AI Match
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="recs-loading-shimmers">
          {[1, 2, 3, 4].map((id) => (
            <div key={id} className="bg-slate-950 border border-slate-850/60 rounded-xl p-4 animate-pulse h-[180px] flex flex-col justify-between">
              <div className="flex gap-3">
                <div className="w-16 h-24 bg-slate-900 rounded-md"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-3 bg-slate-900 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-900 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-900 rounded w-5/6"></div>
                </div>
              </div>
              <div className="h-8 bg-slate-900 rounded-lg w-full"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-amber-950/20 border border-amber-900/30 text-amber-350 text-xs rounded-xl flex items-center gap-2" id="recs-error-msg">
          <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="text-center py-10 bg-slate-955 rounded-xl border border-dashed border-slate-800 text-slate-550 font-medium text-xs">
          No predictive media recommendations found under the {globalCategory} category filter. Please add more titles to your watchlist so Gemini can align suggestions!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="recs-grid">
          {filteredRecommendations.map((item) => {
            const isAdded = watchlistIds.includes(`${item.mediaType}_${item.mediaId}`);
            return (
              <div
                key={`${item.mediaType}_${item.mediaId}`}
                className="bg-slate-950 border border-slate-850 hover:border-slate-750 rounded-xl p-4 flex flex-col justify-between hover:shadow-2xl transition-all duration-200"
                id={`rec-card-${item.mediaId}`}
              >
                <div>
                  <div className="flex gap-4">
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-24 object-cover rounded-md bg-slate-900 border border-slate-800 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onOpenDetails(item)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=${encodeURIComponent(item.title)}`;
                      }}
                      title="Click for full breakdown"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 col">
                        <span className="p-1 rounded bg-slate-905">
                          {getMediaIcon(item.mediaType)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          {item.mediaType}
                        </span>
                        <span className="text-slate-600 text-xs">•</span>
                        <span className="text-[11px] text-slate-450 font-medium">{item.year}</span>
                      </div>
                      <h4 
                        className="font-bold text-slate-100 text-sm truncate cursor-pointer hover:text-indigo-400 transition-colors" 
                        onClick={() => onOpenDetails(item)}
                        title="Click for full breakdown"
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-450 line-clamp-3 leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Why We Recommend Rationale Block */}
                  {item.rationale && (
                    <div className="bg-indigo-950/20 border border-indigo-950/40 rounded-lg p-2.5 mt-3 text-[11.5px] text-slate-300 leading-relaxed italic">
                      <span className="font-black text-[9px] uppercase text-indigo-400 not-italic block mb-0.5 tracking-wider">
                        Gemini AI Rationale
                      </span>
                      "{item.rationale}"
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-900 mt-4 h-9">
                  <div className="flex flex-wrap gap-1 max-w-[60%]">
                    {item.genres.slice(0, 2).map((g) => (
                      <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-850 font-bold">
                        {g}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Details Button */}
                    <button
                      onClick={() => onOpenDetails(item)}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 border border-slate-800 hover:border-slate-700 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="View encyclopedia details"
                    >
                      Details
                    </button>

                    {isAdded ? (
                      <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest bg-indigo-950/30 px-2 py-1 rounded-md border border-indigo-900/30" id={`rec-added-status-${item.mediaId}`}>
                        Tracked
                      </span>
                    ) : (
                      <button
                        onClick={() => onAddToWatchlist(item)}
                        className="bg-indigo-650 hover:bg-indigo-600 text-[10px] font-bold text-slate-100 px-3 py-1.5 border border-indigo-500/20 rounded-lg flex items-center gap-0.5 transition-all cursor-pointer"
                        id={`rec-add-btn-${item.mediaId}`}
                      >
                        <Plus className="w-3 h-3" />
                        Track
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
