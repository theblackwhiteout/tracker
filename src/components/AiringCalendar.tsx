import React, { useState, useEffect } from "react";
import { Calendar, Clock, AlertCircle, RefreshCw, Plus, Star, Check, Layers, Compass } from "lucide-react";
import { AiringScheduleItem, MediaItem } from "../types";

interface AiringCalendarProps {
  onAddToWatchlist: (item: MediaItem) => void;
  watchlistIds: string[];
  onOpenDetails: (item: MediaItem) => void; // Click to detail modal
  globalCategory: "all" | "otaku" | "western";
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SEASONS = [
  { value: "WINTER", label: "Winter ❄️" },
  { value: "SPRING", label: "Spring 🌸" },
  { value: "SUMMER", label: "Summer ☀️" },
  { value: "FALL", label: "Fall 🍁" }
];

// Generate years from 2027 down to 1995
const YEARS = Array.from({ length: 2027 - 1995 + 1 }, (_, i) => 2027 - i);

type ViewMode = "broadcast" | "seasonal";

export default function AiringCalendar({ onAddToWatchlist, watchlistIds, onOpenDetails, globalCategory }: AiringCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("broadcast");
  const [schedules, setSchedules] = useState<AiringScheduleItem[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<any[]>([]);
  
  // Seasonal selection states
  const [selectedSeason, setSelectedSeason] = useState<string>(() => {
    const month = new Date().getMonth();
    if (month >= 0 && month <= 2) return "WINTER";
    if (month >= 3 && month <= 5) return "SPRING";
    if (month >= 6 && month <= 8) return "SUMMER";
    return "FALL";
  });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay()); // Default to today

  // Fetch Live 7-day schedule
  const fetchSchedule = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/anilist/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysAhead: 7 }),
      });
      if (!response.ok) throw new Error("Could not contact server schedule proxy.");
      
      const data: AiringScheduleItem[] = await response.json();
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      setError("Unable to sync live anime airing times from AniList. Showing weekly lineup.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch seasonal archives
  const fetchSeasonalAnime = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/anilist/seasonal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: selectedSeason, year: selectedYear }),
      });
      if (!response.ok) throw new Error("Could not pull seasonal data.");
      
      const data = await response.json();
      setSeasonalAnime(data);
    } catch (err: any) {
      console.error(err);
      setError("Could not retrieve official seasonal database records. Try a different season.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (globalCategory !== "western") {
      if (viewMode === "broadcast") {
        fetchSchedule();
      } else {
        fetchSeasonalAnime();
      }
    }
  }, [globalCategory, viewMode, selectedSeason, selectedYear]);

  if (globalCategory === "western") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center" id="airing-calendar-section">
        <div className="max-w-md mx-auto py-10 space-y-4">
          <Calendar className="w-12 h-12 text-indigo-400 mx-auto opacity-50" />
          <h3 className="text-base font-bold text-slate-100">Anime Airing Calendar Limited</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The AniList Airing Calendar tracks live broadcast timetables for Japanese Anime series. Switch your global media category filter to <strong className="text-indigo-400 font-bold">"All"</strong> or <strong className="text-indigo-400 font-bold">"Otaku Only"</strong> in the main dashboard view to inspect upcoming releases!
          </p>
        </div>
      </div>
    );
  }

  // Time-relative helpers for broadcast list
  const getDayOfItem = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.getDay();
  };

  const getTimeString = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const getCountdownString = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = timestamp - now;
    if (diff <= 0) return "Aired recently";
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (days > 0) {
      return `Airing in ${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `Airing in ${hours}h ${minutes}m`;
    }
    return `Airing in ${minutes}m`;
  };

  // Convert broadcast schedule object to standard library format
  const convertScheduleToMediaItem = (item: AiringScheduleItem): MediaItem => {
    return {
      mediaId: String(item.media.id),
      title: item.media.title.english || item.media.title.romaji || "Unknown Anime",
      mediaType: "anime",
      coverImage: item.media.coverImage.large,
      description: item.media.description?.replace(/<[^>]*>/g, "") || "No description available.",
      genres: item.media.genres,
      totalUnits: item.media.episodes || 0,
      year: new Date(item.airingAt * 1000).getFullYear(),
      rating: 8.0,
    };
  };

  // Convert seasonal item to standard library format
  const convertSeasonalToMediaItem = (item: any): MediaItem => {
    return {
      mediaId: String(item.id),
      title: item.title.english || item.title.romaji || "Unknown Anime",
      mediaType: "anime",
      coverImage: item.coverImage.large || item.coverImage.extraLarge,
      description: item.description?.replace(/<[^>]*>/g, "") || "No description available.",
      genres: item.genres || [],
      totalUnits: item.episodes || 0,
      year: item.seasonYear || selectedYear,
      rating: item.averageScore ? item.averageScore / 10 : 7.5,
    };
  };

  const handleQuickAdd = (media: MediaItem) => {
    onAddToWatchlist(media);
  };

  // Filter broadcast schedule for current selected day
  const filteredSchedules = schedules.filter(item => getDayOfItem(item.airingAt) === selectedDay);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="airing-calendar-section">
      
      {/* SECTION HEADER BAR WITH TWIN VIEW SWITCHERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-800/60 pb-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2" id="calendar-title">
            <Layers className="w-5 h-5 text-indigo-400" />
            Otaku Scheduler & Seasons Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Real-time tracking of Japanese anime releases. Compare today's broadcast slots with complete seasonal charts.
          </p>
        </div>

        {/* MODE SWITCHER TABS */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto shrink-0" id="timetable-view-toggle">
          <button
            onClick={() => setViewMode("broadcast")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "broadcast"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Weekly Broadcast List
          </button>
          
          <button
            onClick={() => setViewMode("seasonal")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "seasonal"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Seasonal Anime Archive
          </button>
        </div>
      </div>

      {/* RENDER VIEW 1: BROADCAST SCHEDULE */}
      {viewMode === "broadcast" && (
        <div id="broadcast-subview">
          {/* Weekday Selection Bar */}
          <div className="flex justify-between items-center gap-2 mb-4">
            <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">
              Airing Timetable by Weekday (UTC/Local)
            </span>
            <button
              onClick={fetchSchedule}
              disabled={isLoading}
              className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-350 font-bold px-3 py-1.5 border border-slate-850 rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? "animate-spin" : ""}`} />
              Reload Weeks
            </button>
          </div>

          <div className="flex overflow-x-auto pb-3 mb-6 border-b border-slate-800/50 scrollbar-thin scrollbar-thumb-slate-800" id="calendar-tabs">
            <div className="flex gap-2 min-w-max">
              {WEEKDAYS.map((day, idx) => {
                const isToday = new Date().getDay() === idx;
                const isSelected = selectedDay === idx;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(idx)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-slate-100 shadow-md shadow-indigo-600/10"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/10"
                    }`}
                    id={`calendar-tab-${day.toLowerCase()}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {day}
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Today"></span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Airing Listings */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm font-semibold">Synchronizing with live broadcast feeds...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-950/25 border border-rose-900/30 text-rose-300 rounded-xl p-4 text-xs flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
              <p className="text-slate-400 leading-relaxed font-semibold">
                Please wait a moment or click Refresh to re-initialize.
              </p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-505 text-sm">
              No live broadcasts scheduled for {WEEKDAYS[selectedDay]} on AniList database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="calendar-grid">
              {filteredSchedules.map((item) => {
                const isAdded = watchlistIds.includes(`anime_${item.media.id}`);
                const mappedMediaItem = convertScheduleToMediaItem(item);
                return (
                  <div
                    key={item.id}
                    className="bg-slate-955 border border-slate-850 rounded-xl p-4 flex gap-4 hover:border-slate-755 transition-all duration-200"
                  >
                    <img
                      src={item.media.coverImage.large}
                      alt={item.media.title.english || item.media.title.romaji}
                      referrerPolicy="no-referrer"
                      className="w-16 h-24 object-cover rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onOpenDetails(mappedMediaItem)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=Anime`;
                      }}
                      title="Click to view full anime details"
                    />
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1">
                          <span>EPISODE {item.episode}</span>
                          <span>•</span>
                          <span>{item.media.format || "TV"}</span>
                        </div>
                        <h4 
                          className="font-bold text-sm text-slate-100 hover:text-indigo-400 cursor-pointer truncate transition-colors"
                          onClick={() => onOpenDetails(mappedMediaItem)}
                          title="Click to view full anime details"
                        >
                          {item.media.title.english || item.media.title.romaji}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-bold text-slate-300">{getTimeString(item.airingAt)}</span>
                          <span className="text-slate-850">|</span>
                          <span className="text-emerald-400 font-semibold">{getCountdownString(item.airingAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-900 mt-2">
                        <div className="flex flex-wrap gap-1 max-w-[50%]">
                          {item.media.genres.slice(0, 2).map(g => (
                            <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-850 font-bold">
                              {g}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenDetails(mappedMediaItem)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-350 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Open detailed guide card"
                          >
                            Info
                          </button>

                          {isAdded ? (
                            <span className="text-[10px] font-extrabold text-indigo-455 uppercase flex items-center gap-1 bg-indigo-950/20 px-2 py-1.5 rounded-lg border border-indigo-900/30">
                              Tracked
                            </span>
                          ) : (
                            <button
                              onClick={() => handleQuickAdd(mappedMediaItem)}
                              className="bg-indigo-650 hover:bg-indigo-600 text-[10px] font-bold text-slate-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Track
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW 2: SEASONAL ANIME ARCHIVE SELECTOR (LIKE MYANIMELIST) */}
      {viewMode === "seasonal" && (
        <div id="seasonal-subview" className="space-y-6">
          
          {/* FILTER CRITERIA PICKER */}
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Season Buttons */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Select Target Season</span>
                <div className="flex flex-wrap gap-1">
                  {SEASONS.map((season) => (
                    <button
                      key={season.value}
                      onClick={() => setSelectedSeason(season.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedSeason === season.value
                          ? "bg-indigo-600 border border-indigo-500 text-slate-100 font-extrabold"
                          : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {season.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Select dropdown */}
              <div className="flex flex-col gap-1 min-w-[120px]">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Target Year</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 text-slate-150 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-550"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y} Releases</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary stat badge */}
            <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4 text-xs">
              <p className="text-slate-500 font-medium">Viewing archives starting in:</p>
              <p className="text-slate-200 font-extrabold uppercase text-sm mt-0.5" id="season-stats-label">
                {selectedSeason.toLowerCase()} {selectedYear}
              </p>
            </div>
          </div>

          {/* Seasonal Listings Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-400">Loading seasonal release data from AniList...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-950/25 border border-rose-900/30 text-rose-300 rounded-xl p-4 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
              <p className="text-slate-400 font-medium">Please select a different combination.</p>
            </div>
          ) : seasonalAnime.length === 0 ? (
            <div className="text-center py-20 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-sm">
              We couldn't locate archives matching {selectedSeason} {selectedYear}. Select another year.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="seasonal-grid">
              {seasonalAnime.map((item) => {
                const isAdded = watchlistIds.includes(`anime_${item.id}`);
                const mappedMediaItem = convertSeasonalToMediaItem(item);
                
                return (
                  <div
                    key={item.id}
                    className="bg-slate-955 border border-slate-850 rounded-xl p-3 flex gap-3 hover:border-slate-755 hover:shadow-lg transition-all duration-200"
                    id={`seasonal-card-${item.id}`}
                  >
                    <img
                      src={item.coverImage.large}
                      alt={item.title.english || item.title.romaji}
                      referrerPolicy="no-referrer"
                      className="w-16 h-24 object-cover rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onOpenDetails(mappedMediaItem)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=Anime`;
                      }}
                      title="Click to view complete details"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-950/40 px-1.5 py-0.5 rounded border border-slate-850 self-start mb-1 max-w-max">
                          <span className="text-amber-400 text-[10px]">★</span>
                          <span>{item.averageScore ? `${item.averageScore}%` : "Not Rated"}</span>
                          <span className="text-slate-700 font-normal">|</span>
                          <span>{item.episodes ? `${item.episodes} Eps` : "Ongoing"}</span>
                        </div>
                        
                        <h4
                          className="font-bold text-xs text-slate-100 hover:text-indigo-400 cursor-pointer line-clamp-2 leading-tight"
                          onClick={() => onOpenDetails(mappedMediaItem)}
                          title="Click to view complete details"
                        >
                          {item.title.english || item.title.romaji}
                        </h4>

                        <span className="text-[10px] text-slate-500 font-bold block mt-0.5 uppercase tracking-wide">
                          {item.format || "TV Series"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 mt-2">
                        {/* Tags */}
                        <div className="flex gap-1 overflow-hidden max-w-[50%]">
                          {item.genres?.slice(0, 1).map((g: string) => (
                            <span key={g} className="text-[8px] bg-slate-900 border border-slate-850 px-1 py-0.5 rounded text-slate-400 truncate">
                              {g}
                            </span>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenDetails(mappedMediaItem)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-bold text-slate-350 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Info
                          </button>

                          {isAdded ? (
                            <span className="text-[9px] font-black text-indigo-400 bg-indigo-950/20 px-2 py-1 border border-indigo-900/30 rounded uppercase">
                              Tracked
                            </span>
                          ) : (
                            <button
                              onClick={() => handleQuickAdd(mappedMediaItem)}
                              className="bg-indigo-650 hover:bg-indigo-600 text-[9px] font-bold text-slate-100 px-2 py-1 rounded flex items-center gap-0.5 transition-all cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              Track
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
