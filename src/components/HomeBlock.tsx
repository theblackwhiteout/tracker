import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Award, 
  Calendar, 
  BookOpen, 
  Tv, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Clock, 
  Film,
  Sparkles,
  ArrowRight,
  Compass
} from "lucide-react";
import { MediaItem } from "../types";

interface HomeBlockProps {
  onAddToWatchlist: (item: MediaItem) => void;
  watchlistIds: string[];
  onOpenDetails: (item: MediaItem) => void;
  globalCategory: "all" | "otaku" | "western";
  setActiveTab: (tab: "home" | "watchlist" | "discover" | "calendar" | "reviews") => void;
}

export default function HomeBlock({ 
  onAddToWatchlist, 
  watchlistIds, 
  onOpenDetails, 
  globalCategory,
  setActiveTab
}: HomeBlockProps) {
  // Data State
  const [anilistData, setAnilistData] = useState<any>(null);
  const [westernData, setWesternData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Hero Backdrop Slider Index
  const [heroIndex, setHeroIndex] = useState(0);

  // Sidebar ranking sub-tab
  const [rankTab, setRankTab] = useState<"airing" | "rated" | "popular">("airing");

  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Fetch Home blocks
  useEffect(() => {
    const fetchHomeDatasets = async () => {
      setIsLoading(true);
      setError("");
      try {
        if (globalCategory !== "western") {
          const res = await fetch("/api/anilist/home");
          if (!res.ok) throw new Error("Could not load premium Otaku homepage layout.");
          const data = await res.json();
          setAnilistData(data);
        }

        if (globalCategory !== "otaku") {
          const res = await fetch("/api/western/home");
          if (!res.ok) throw new Error("Could not load premium Western homepage layout.");
          const data = await res.json();
          setWesternData(data);
        }
      } catch (err: any) {
        console.error(err);
        setError("Unable to build homepage rankings. Try reloading or bypass via search.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeDatasets();
  }, [globalCategory]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4" id="home-loader">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-extrabold text-slate-250">Assembling Modern MyAnimeList Grid...</p>
          <p className="text-xs text-slate-500 mt-1">Sipping live GraphQL records & movie directories</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-955/25 border border-rose-900/40 text-rose-300 rounded-2xl p-6 text-sm text-center max-w-xl mx-auto space-y-4" id="home-error">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-extrabold text-base text-slate-200">Homepage Synchronizer Offline</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-slate-100 px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Helpers to convert format
  const mapAniListToMedia = (item: any, customType?: "anime" | "manga"): MediaItem => {
    return {
      mediaId: String(item.id),
      title: item.title.english || item.title.romaji || item.title.native,
      mediaType: customType || (item.format === "MANGA" || item.chapters ? "manga" : "anime"),
      coverImage: item.coverImage.extraLarge || item.coverImage.large,
      bannerImage: item.bannerImage || item.coverImage.extraLarge || item.coverImage.large,
      description: item.description?.replace(/<[^>]*>/g, "") || "No synopsis available.",
      genres: item.genres || [],
      totalUnits: item.episodes || item.chapters || 0,
      year: item.seasonYear || new Date().getFullYear(),
      rating: item.averageScore ? item.averageScore / 10 : 7.2,
    };
  };

  const mapWesternToMedia = (item: any): MediaItem => {
    let banner = item.coverImage;
    if (banner && banner.includes("unsplash.com")) {
      banner = banner
        .replace(/w=\d+/, "w=1200")
        .replace(/h=\d+/, "h=600")
        .replace(/fit=crop/, "fit=crop&crop=entropy");
    }
    return {
      mediaId: item.id,
      title: item.title,
      mediaType: item.format?.toLowerCase() === "tv" ? "tv" : "movie",
      coverImage: item.coverImage,
      bannerImage: banner,
      description: item.description || "No description available.",
      genres: item.genres || [],
      totalUnits: item.totalUnits || 0,
      year: item.year || new Date().getFullYear(),
      rating: item.averageScore ? item.averageScore / 10 : 8.0,
    };
  };

  // Determine carousel list
  let heroList: MediaItem[] = [];
  if (globalCategory === "western" && westernData?.trendingMovies) {
    heroList = westernData.trendingMovies.map(mapWesternToMedia);
  } else if (anilistData?.topAiring?.media) {
    heroList = anilistData.topAiring.media.slice(0, 5).map((x: any) => mapAniListToMedia(x, "anime"));
  }

  const activeHero = heroList[heroIndex];

  // Sidebar List
  let rankList: any[] = [];
  if (globalCategory !== "western" && anilistData) {
    if (rankTab === "airing" && anilistData.topAiring?.media) {
      rankList = anilistData.topAiring.media.slice(0, 10);
    } else if (rankTab === "rated" && anilistData.highestRated?.media) {
      rankList = anilistData.highestRated.media.slice(0, 10);
    } else if (rankTab === "popular" && anilistData.trending?.media) {
      rankList = anilistData.trending.media.slice(0, 10);
    }
  }

  const handleHeroNext = () => {
    setHeroIndex((prev) => (prev + 1) % heroList.length);
  };

  const handleHeroPrev = () => {
    setHeroIndex((prev) => (prev - 1 + heroList.length) % heroList.length);
  };

  return (
    <div className="space-y-10" id="modern-homepage-block">
      
      {/* 1. GORGEOUS FEATURED HERO CAROUSEL */}
      {activeHero && (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800/80 aspect-video md:aspect-[3/1] min-h-[300px] shadow-2xl transition-all" id="hero-slider">
          {/* Backdrop Image - Aligned nicely to prevent low-quality zoom-in effects */}
          <div className="absolute inset-0 md:left-[25%] select-none pointer-events-none opacity-65 transition-all duration-700">
            <img 
              src={activeHero.bannerImage || activeHero.coverImage} 
              alt="" 
              className="w-full h-full object-cover object-[center_25%]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Progressive blur: gets more blurry as it gets closer to the left side (text) and stays crisp on the right */}
          <div 
            className="absolute inset-y-0 left-0 w-full md:w-[65%] backdrop-blur-[6px] pointer-events-none select-none transition-all duration-700" 
            style={{
              maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)'
            }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent flex items-center">
            <div className="px-6 md:px-12 py-8 max-w-2xl flex flex-col justify-center h-full space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400 border border-indigo-500/20 max-w-max uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                Featured Hot Series
              </span>

              <h2 className="text-xl md:text-3xl font-black text-slate-100 tracking-tight leading-tight line-clamp-2">
                {activeHero.title}
              </h2>

              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed max-w-lg font-medium">
                {activeHero.description}
              </p>

              {/* Genres + Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {activeHero.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-350 font-bold">
                    {g}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={() => onOpenDetails(activeHero)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-extrabold text-slate-100 px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
                >
                  <Compass className="w-4 h-4" />
                  View Chronicles
                </button>

                {watchlistIds.includes(`${activeHero.mediaType}_${activeHero.mediaId}`) ? (
                  <span className="text-xs font-extrabold text-emerald-400 uppercase bg-emerald-950/20 border border-emerald-900/30 px-4 py-2.5 rounded-xl">
                    ✓ Tracked
                  </span>
                ) : (
                  <button
                    onClick={() => onAddToWatchlist(activeHero)}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Quick Track
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Carousel Arrows */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              onClick={handleHeroPrev}
              className="p-2 bg-slate-950/80 hover:bg-indigo-600 border border-slate-800 rounded-lg text-slate-200 transition-colors cursor-pointer"
              title="Previous Spotlight"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-950/60 px-2 py-1 rounded border border-slate-850">
              {heroIndex + 1} / {heroList.length}
            </span>
            <button
              onClick={handleHeroNext}
              className="p-2 bg-slate-950/80 hover:bg-indigo-600 border border-slate-800 rounded-lg text-slate-200 transition-colors cursor-pointer"
              title="Next Spotlight"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* 2. TWO-COLUMN BENTO GRID: LEFT MAJOR CARDS & RIGHT SIDEBAR LISTINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* === LEFT CONTENT ZONE (8 COLS) === */}
        <div className="lg:col-span-8 space-y-10">

          {/* SECTION A: TOP AIRING ANIME (or TRENDING MOVIES for Western only) */}
          {globalCategory !== "western" && anilistData?.topAiring?.media && (
            <div className="space-y-4" id="section-top-airing">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 rounded bg-emerald-400"></div>
                  <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-emerald-400" />
                    Top Airing Broadcasts
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  View Airing Matrix
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {anilistData.topAiring.media.slice(0, 8).map((raw: any) => {
                  const media = mapAniListToMedia(raw, "anime");
                  const isTracked = watchlistIds.includes(`anime_${media.mediaId}`);
                  return (
                    <div 
                      key={media.mediaId}
                      className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between transition-all group"
                      onMouseEnter={() => setHoveredCardId(media.mediaId)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      id={`home-anime-${media.mediaId}`}
                    >
                      <div className="space-y-2.5">
                        {/* Hover Overlay containing small summary */}
                        <div className="relative overflow-hidden aspect-[2/3] rounded-lg bg-slate-950 border border-slate-800">
                          <img
                            src={media.coverImage}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=Anime`;
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider text-emerald-400 border border-emerald-900/30 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {media.rating.toFixed(1)}
                          </div>
                        </div>

                        <div>
                          <h4 
                            onClick={() => onOpenDetails(media)}
                            className="font-bold text-xs text-slate-200 line-clamp-2 leading-snug hover:text-indigo-400 cursor-pointer transition-colors"
                            title={media.title}
                          >
                            {media.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold mt-1 block">
                            {raw.format || "TV Series"} • {raw.episodes ? `${raw.episodes} Eps` : "Ongoing"}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-2 mt-2 flex items-center justify-between">
                        <button
                          onClick={() => onOpenDetails(media)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-black"
                        >
                          Details
                        </button>

                        {isTracked ? (
                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-950/10 px-1.5 py-0.5 rounded border border-indigo-900/20">
                            Tracked
                          </span>
                        ) : (
                          <button
                            onClick={() => onAddToWatchlist(media)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Track
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WESTERN SPECIFIC HOME SECTION: TRENDING MOVIES */}
          {globalCategory === "western" && westernData?.trendingMovies && (
            <div className="space-y-4" id="section-western-movies">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 rounded bg-pink-500"></div>
                  <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-pink-500" />
                    Trending Western Blockbusters
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {westernData.trendingMovies.map((raw: any) => {
                  const media = mapWesternToMedia(raw);
                  const isTracked = watchlistIds.includes(`movie_${media.mediaId}`);
                  return (
                    <div 
                      key={media.mediaId}
                      className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-950 border border-slate-800">
                          <img
                            src={media.coverImage}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=Movie`;
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider text-amber-400 border border-amber-900/30 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {media.rating.toFixed(1)}
                          </div>
                        </div>

                        <div>
                          <h4 
                            onClick={() => onOpenDetails(media)}
                            className="font-bold text-xs text-slate-200 line-clamp-2 leading-snug hover:text-pink-400 cursor-pointer transition-colors"
                          >
                            {media.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold mt-1 block">
                            {raw.format} • {raw.year}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-2 mt-2 flex items-center justify-between">
                        <button
                          onClick={() => onOpenDetails(media)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-black"
                        >
                          Guides
                        </button>

                        {isTracked ? (
                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-950/10 px-1.5 py-0.5 rounded border border-indigo-900/20">
                            Tracked
                          </span>
                        ) : (
                          <button
                            onClick={() => onAddToWatchlist(media)}
                            className="text-[10px] text-pink-450 hover:text-pink-300 font-bold flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Track
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* SECTION B: TRENDING / POPULAR THIS WEEK */}
          {globalCategory !== "western" && anilistData?.trending?.media && (
            <div className="space-y-4" id="section-trending">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded bg-indigo-500"></div>
                <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Trending This Week
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {anilistData.trending.media.slice(0, 8).map((raw: any) => {
                  const media = mapAniListToMedia(raw, "anime");
                  const isTracked = watchlistIds.includes(`anime_${media.mediaId}`);
                  return (
                    <div 
                      key={media.mediaId}
                      className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-950 border border-slate-800">
                          <img
                            src={media.coverImage}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=Anime`;
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider text-amber-400 border border-amber-900/30 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {media.rating.toFixed(1)}
                          </div>
                        </div>

                        <div>
                          <h4 
                            onClick={() => onOpenDetails(media)}
                            className="font-bold text-xs text-slate-200 line-clamp-2 leading-snug hover:text-indigo-400 cursor-pointer transition-colors"
                          >
                            {media.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold mt-1 block">
                            {raw.format || "TV Series"} • {raw.episodes ? `${raw.episodes} Eps` : "?"}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-2 mt-2 flex items-center justify-between">
                        <button
                          onClick={() => onOpenDetails(media)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-black"
                        >
                          Details
                        </button>

                        {isTracked ? (
                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-950/10 px-1.5 py-0.5 rounded border border-indigo-900/20">
                            Tracked
                          </span>
                        ) : (
                          <button
                            onClick={() => onAddToWatchlist(media)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Track
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WESTERN SPECIFIC: TRENDING TELEVISION */}
          {globalCategory === "western" && westernData?.trendingTV && (
            <div className="space-y-4" id="section-western-tv">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded bg-indigo-400"></div>
                <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-indigo-455" />
                  Top Trending Shows
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {westernData.trendingTV.map((raw: any) => {
                  const media = mapWesternToMedia(raw);
                  const isTracked = watchlistIds.includes(`tv_${media.mediaId}`);
                  return (
                    <div 
                      key={media.mediaId}
                      className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-950 border border-slate-800">
                          <img
                            src={media.coverImage}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=TV秀`;
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider text-amber-400 border border-amber-900/30 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {media.rating.toFixed(1)}
                          </div>
                        </div>

                        <div>
                          <h4 
                            onClick={() => onOpenDetails(media)}
                            className="font-bold text-xs text-slate-200 line-clamp-2 leading-snug hover:text-indigo-400 cursor-pointer transition-colors"
                          >
                            {media.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold mt-1 block">
                            {raw.format} • {raw.year}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-2 mt-2 flex items-center justify-between">
                        <button
                          onClick={() => onOpenDetails(media)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-black"
                        >
                          Guides
                        </button>

                        {isTracked ? (
                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-950/10 px-1.5 py-0.5 rounded border border-indigo-900/20">
                            Tracked
                          </span>
                        ) : (
                          <button
                            onClick={() => onAddToWatchlist(media)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Track
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* SECTION C: POPULAR MANGA SELECTION (ONLY OTACU / ALL) */}
          {globalCategory !== "western" && anilistData?.topManga?.media && (
            <div className="space-y-4 font-sans" id="section-manga-home">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded bg-amber-400"></div>
                <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Top Popular Manga
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {anilistData.topManga.media.slice(0, 4).map((raw: any) => {
                  const media = mapAniListToMedia(raw, "manga");
                  const isTracked = watchlistIds.includes(`manga_${media.mediaId}`);
                  return (
                    <div 
                      key={media.mediaId}
                      className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-950 border border-slate-800">
                          <img
                            src={media.coverImage}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=Manga`;
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider text-amber-400 border border-amber-900/30 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {media.rating.toFixed(1)}
                          </div>
                        </div>

                        <div>
                          <h4 
                            onClick={() => onOpenDetails(media)}
                            className="font-bold text-xs text-slate-200 line-clamp-2 leading-snug hover:text-amber-400 cursor-pointer transition-colors"
                          >
                            {media.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold mt-1 block">
                            Manga {raw.chapters ? `• ${raw.chapters} Chs` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-2 mt-2 flex items-center justify-between">
                        <button
                          onClick={() => onOpenDetails(media)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-black"
                        >
                          Read Bio
                        </button>

                        {isTracked ? (
                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-950/10 px-1.5 py-0.5 rounded border border-indigo-900/20">
                            Tracked
                          </span>
                        ) : (
                          <button
                            onClick={() => onAddToWatchlist(media)}
                            className="text-[10px] text-amber-450 hover:text-amber-300 font-bold flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Track
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* SECTION D: TOP UPCOMING RELEASES */}
          {((globalCategory !== "western" && anilistData?.topUpcoming?.media) || (globalCategory === "western" && westernData?.topUpcoming)) && (
            <div className="bg-slate-900/50 border border-slate-850/65 rounded-2xl p-5 space-y-4" id="section-upcoming">
              <div className="flex items-center gap-2">
                <SpinnerBadge />
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Anticipated Future Releases
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {((globalCategory === "western" ? westernData?.topUpcoming : anilistData?.topUpcoming?.media) || []).slice(0, 6).map((raw: any) => {
                  const media = globalCategory === "western" ? mapWesternToMedia(raw) : mapAniListToMedia(raw, "anime");
                  const isTracked = watchlistIds.includes(`${media.mediaType}_${media.mediaId}`);
                  return (
                    <div 
                      key={media.mediaId}
                      className="bg-slate-950/60 border border-slate-850/60 hover:border-slate-800 rounded-xl p-3 flex gap-4 transition-all"
                    >
                      <img
                        src={media.coverImage}
                        alt=""
                        className="w-12 h-18 object-cover rounded bg-slate-900 border border-slate-850 flex-shrink-0 cursor-pointer"
                        onClick={() => onOpenDetails(media)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/100x150/111827/ffffff?text=Upcoming`;
                        }}
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 
                            onClick={() => onOpenDetails(media)}
                            className="text-xs font-black text-slate-200 hover:text-indigo-400 cursor-pointer truncate"
                          >
                            {media.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                            {raw.format || "TV Series"} • Coming in {media.year || "?"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider">
                            Highly Expected
                          </span>
                          {isTracked ? (
                            <span className="text-[9px] font-bold text-slate-450">Tracked</span>
                          ) : (
                            <button
                              onClick={() => onAddToWatchlist(media)}
                              className="text-[9px] bg-slate-900 hover:bg-indigo-650 border border-slate-800 text-slate-200 hover:text-white px-2 py-0.5 rounded transition-all cursor-pointer font-bold"
                            >
                              + Track
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* === RIGHT SIDEBAR Rank MATRIX (4 COLS) === */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* MAL-STYLE MODERN RANK CHART PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden" id="mal-ranking-sidebar">
            <div className="bg-slate-950 p-4 border-b border-slate-850">
              <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Master Ranking Charts
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">MAL community curated leaders</p>
            </div>

            {/* Sidebar Tab Triggers */}
            <div className="flex bg-slate-950/40 p-1 border-b border-slate-850" id="sidebar-tabs">
              <button
                onClick={() => setRankTab("airing")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  rankTab === "airing"
                    ? "bg-slate-900 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Top Airing
              </button>
              <button
                onClick={() => setRankTab("rated")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  rankTab === "rated"
                    ? "bg-slate-900 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Legendary
              </button>
              <button
                onClick={() => setRankTab("popular")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  rankTab === "popular"
                    ? "bg-slate-900 text-indigo-400 border border-slate-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Trending
              </button>
            </div>

            {/* Rankings List */}
            {globalCategory === "western" ? (
              <div className="p-4 text-center text-xs text-slate-400 space-y-4">
                <Film className="w-8 h-8 text-pink-400 mx-auto opacity-50" />
                <p className="font-medium">Rankings sidebar customized for anime broadcasts & otaku lore databases.</p>
                <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">
                  Switch back to <span className="text-pink-400 font-bold">"All"</span> or <span className="text-pink-400 font-bold">"Otaku Only"</span> filters to utilize complete rankings!
                </p>
              </div>
            ) : rankList.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">No official rankings cached.</div>
            ) : (
              <div className="divide-y divide-slate-850/60 max-h-[520px] overflow-y-auto scrollbar-thin overflow-x-hidden">
                {rankList.map((item, idx) => {
                  const media = mapAniListToMedia(item, "anime");
                  const rankNum = idx + 1;
                  
                  return (
                    <div 
                      key={media.mediaId}
                      className="p-3.5 flex items-center gap-3 hover:bg-slate-950/40 transition-colors"
                      id={`sidebar-rank-${rankNum}`}
                    >
                      {/* Place Indicator */}
                      <span className={`w-6 text-center font-mono text-xs font-black ${
                        rankNum === 1 ? "text-amber-400 text-sm" : 
                        rankNum === 2 ? "text-slate-350" : 
                        rankNum === 3 ? "text-amber-600" : "text-slate-500"
                      }`}>
                        {rankNum}
                      </span>

                      {/* Small Poster */}
                      <img
                        src={media.coverImage}
                        alt=""
                        className="w-9 h-13 object-cover rounded bg-slate-900 border border-slate-850 flex-shrink-0 cursor-pointer"
                        onClick={() => onOpenDetails(media)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/50x70/111827/ffffff?text=Poster`;
                        }}
                      />

                      {/* Info snippet */}
                      <div className="flex-1 min-w-0">
                        <h4 
                          onClick={() => onOpenDetails(media)}
                          className="font-bold text-xs text-slate-205 truncate hover:text-indigo-400 cursor-pointer transition-colors"
                          title={media.title}
                        >
                          {media.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 block mt-0.5">
                          {item.format || "TV"} • {item.episodes ? `${item.episodes} episodes` : "Ongoing"}
                        </p>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right">
                        <div className="text-[10.5px] font-bold text-slate-200 flex items-center justify-end gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-current" />
                          <span>{media.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-[8.5px] text-slate-500 uppercase font-bold tracking-wide">MAL Score</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK LINKS BENTO DECORATOR */}
          <div className="bg-gradient-to-tr from-indigo-950/40 via-slate-900 to-slate-900 border border-slate-850 rounded-2xl p-4 space-y-3" id="quick-links-panel">
            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-extrabold uppercase">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Anime Season Tools
            </div>
            <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
              Compare current rankings with complete years of history! Our calendar tab maps live airings and lists comprehensive archives from 1995 to 2027.
            </p>
            <button 
              onClick={() => setActiveTab("calendar")}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl transition-all text-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Configure Year & Seasons
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

function SpinnerBadge() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
    </span>
  );
}
