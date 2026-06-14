import React, { useState, useEffect } from "react";
import { Search, Plus, Star, BookOpen, Film, Tv, Video, Heart, AlertCircle, Loader2, Info } from "lucide-react";
import { MediaItem, MediaType, WatchStatus } from "../types";

interface SearchBlockProps {
  onAddToWatchlist: (item: MediaItem, status: WatchStatus) => void;
  onOpenReview: (item: MediaItem) => void;
  watchlistIds: string[]; // Already added ids (format: mediaType_mediaId)
  onOpenDetails: (item: MediaItem) => void; // Click to details view
  globalCategory: "all" | "otaku" | "western";
}

export default function SearchBlock({ onAddToWatchlist, onOpenReview, watchlistIds, onOpenDetails, globalCategory }: SearchBlockProps) {
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState<MediaType | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);

  // Reset or adjust mediaType selection when globalCategory shifts
  useEffect(() => {
    if (globalCategory === "otaku") {
      setMediaType("anime"); // Default to anime when switching to Otaku Category
    } else if (globalCategory === "western") {
      setMediaType("movie"); // Default to movies when switching to Western Category
    } else {
      setMediaType("");
    }
  }, [globalCategory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError("");

    // Calculate restricted mediaType based on global filters
    let activeTypeInput = mediaType;
    if (globalCategory === "otaku" && (mediaType !== "anime" && mediaType !== "manga")) {
      activeTypeInput = "anime";
    } else if (globalCategory === "western" && (mediaType !== "movie" && mediaType !== "tv")) {
      activeTypeInput = "movie";
    }

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: query.trim(), 
          mediaType: activeTypeInput || undefined 
        })
      });

      if (!response.ok) {
        throw new Error("Failed to search. Server error.");
      }

      const data = await response.json();
      
      // Post-filter to double-ensure safety based on the tabs option
      let filtered = data;
      if (globalCategory === "otaku") {
        filtered = data.filter((item: any) => item.mediaType === "anime" || item.mediaType === "manga");
      } else if (globalCategory === "western") {
        filtered = data.filter((item: any) => item.mediaType === "movie" || item.mediaType === "tv");
      }

      setResults(filtered);
      if (filtered.length === 0) {
        setError("No titles found that match this query under the current category filter.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch matching media. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="search-section">
      <div className="flex flex-col gap-1 mb-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2" id="search-title">
          <Search className="w-5 h-5 text-indigo-400" />
          Catalog Search & Advanced Retrieval
        </h2>
        <p className="text-xs text-slate-400">
          Search for Anime, Manga, Movies, or TV Shows. Currently filtering by{" "}
          <strong className="text-indigo-400 font-bold uppercase underline">
            {globalCategory === "all" ? "All media" : globalCategory === "otaku" ? "Otaku Realm Only" : "Western Cinema Only"}
          </strong>{" "}
          category context.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 mb-6" id="search-form">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              globalCategory === "otaku" 
                ? "Type anime or manga like 'One Piece', 'Frieren', 'Naruto'..."
                : globalCategory === "western"
                ? "Type movie or tv show like 'Interstellar', 'Breaking Bad', 'Inception'..."
                : "Type 'One Piece', 'Interstellar', 'Breaking Bad'..."
            }
            className="w-full text-sm bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition-colors"
            id="search-input"
          />
          <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-500" />
        </div>

        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as MediaType | "")}
          className="text-sm bg-slate-950 border border-slate-700 text-slate-350 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
          id="search-type"
        >
          {globalCategory === "all" && (
            <>
              <option value="">Any Type</option>
              <option value="anime">Anime (Otaku)</option>
              <option value="manga">Manga (Otaku)</option>
              <option value="movie">Movies (Western)</option>
              <option value="tv">TV Shows (Western)</option>
            </>
          )}

          {globalCategory === "otaku" && (
            <>
              <option value="anime">Anime Only</option>
              <option value="manga">Manga Only</option>
            </>
          )}

          {globalCategory === "western" && (
            <>
              <option value="movie">Movies Only</option>
              <option value="tv">TV Shows Only</option>
            </>
          )}
        </select>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-sm text-slate-100 font-extrabold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
          id="search-submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching
            </>
          ) : (
            <>Search Catalog</>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-slate-1000 border border-rose-950 text-rose-400 text-xs rounded-xl mb-4" id="search-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="search-results">
          {results.map((item) => {
            const isAdded = watchlistIds.includes(`${item.mediaType}_${item.mediaId}`);
            return (
              <div
                key={`${item.mediaType}_${item.mediaId}`}
                className="bg-slate-950 border border-slate-850 hover:border-slate-750 rounded-xl p-4 flex flex-col justify-between hover:shadow-2xl transition-all duration-200"
                id={`result-card-${item.mediaId}`}
              >
                <div>
                  <div className="flex gap-3 mb-3">
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-24 object-cover rounded-md flex-shrink-0 bg-slate-900 border border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onOpenDetails(item)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=${encodeURIComponent(item.title)}`;
                      }}
                      title="Click for details"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="p-1 rounded bg-slate-905">
                          {getMediaIcon(item.mediaType)}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
                          {item.mediaType}
                        </span>
                      </div>
                      <h4 
                        className="font-bold text-sm text-slate-100 truncate cursor-pointer hover:text-indigo-400 transition-colors" 
                        onClick={() => onOpenDetails(item)}
                        title="Click for details"
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-450 mt-0.5">
                        {item.year ? `${item.year}` : "N/A"} • {item.totalUnits ? `${item.totalUnits} ${item.mediaType === "manga" ? "Chs" : item.mediaType === "movie" ? "Mins" : "Eps"}` : "Ongoing"}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-slate-350">{item.rating?.toFixed(1) || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-450 line-clamp-2 leading-relaxed mb-4">
                    {item.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.genres.slice(0, 3).map((genre) => (
                      <span key={genre} className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-bold border border-slate-850">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-1.5 pt-2 border-t border-slate-900" id={`result-actions-${item.mediaId}`}>
                  {isAdded ? (
                    <div className="flex-1 bg-slate-900/40 text-slate-500 border border-slate-850 font-bold text-center py-2 text-xs rounded-lg flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3 fill-rose-500/35 text-rose-500/70" />
                      Tracked
                    </div>
                  ) : (
                    <button
                      onClick={() => onAddToWatchlist(item, "planning")}
                      className="flex-1 bg-indigo-650 hover:bg-indigo-600 text-slate-100 font-extrabold py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 border border-indigo-500/10 cursor-pointer shadow-md shadow-indigo-650/5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to List
                    </button>
                  )}
                  
                  {/* Dedicated View Details Trigger */}
                  <button
                    onClick={() => onOpenDetails(item)}
                    className="bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-indigo-400 hover:text-indigo-300 font-bold px-2.5 py-2 text-xs rounded-lg border border-slate-850 transition-colors cursor-pointer flex items-center gap-1"
                    title="Read complete encyclopedia card"
                  >
                    Details
                  </button>
                  
                  <button
                    onClick={() => onOpenReview(item)}
                    className="bg-slate-950 hover:bg-slate-855 text-slate-400 hover:text-slate-200 font-extrabold px-2 py-2 text-xs rounded-lg border border-slate-850 transition-colors cursor-pointer"
                  >
                    Post Log
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
