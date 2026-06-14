import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  X, 
  Tv, 
  BookOpen, 
  Film, 
  Video, 
  Star, 
  ExternalLink, 
  Loader2, 
  Plus, 
  Check, 
  Info, 
  Users, 
  Sparkles, 
  MessageCircle,
  Clock,
  Flame
} from "lucide-react";
import { MediaType, MediaItem, WatchStatus } from "../types";

export interface DetailedMedia {
  mediaId: string;
  title: string;
  mediaType: string;
  tagline: string;
  fullSynopsis: string;
  ageRating: string;
  studios: string[];
  directors: string[];
  mainCharacters: {
    name: string;
    role: string;
    voiceActor: string;
  }[];
  malUrlOrImdbUrl: string;
  criticReviewSummary: string;
  funFacts: string[];
  recommendedSimilars: {
    title: string;
    description: string;
  }[];
}

interface MediaDetailsViewProps {
  media: {
    mediaId: string;
    title: string;
    mediaType: MediaType;
    coverImage: string;
    year?: number;
    rating?: number;
    genres?: string[];
    description?: string;
  };
  onClose: () => void;
  onAddToWatchlist: (item: MediaItem, status: WatchStatus) => void;
  isInWatchlist: boolean;
}

export default function MediaDetailsView({ media, onClose, onAddToWatchlist, isInWatchlist }: MediaDetailsViewProps) {
  const [details, setDetails] = useState<DetailedMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "cast" | "trivia">("overview");

  useEffect(() => {
    async function loadDetails() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/media/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            mediaId: media.mediaId, 
            title: media.title, 
            mediaType: media.mediaType 
          })
        });

        if (!response.ok) {
          throw new Error("Failed to load details from database.");
        }

        const data = await response.json();
        setDetails(data);
      } catch (err: any) {
        console.error(err);
        setError("Unable to reach AI encyclopedia. Displaying basic local cached results.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDetails();
  }, [media.mediaId]);

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "anime":
        return <Tv className="w-5 h-5 text-sky-400" />;
      case "manga":
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case "movie":
        return <Video className="w-5 h-5 text-pink-400" />;
      case "tv":
        return <Film className="w-5 h-5 text-amber-400" />;
    }
  };

  const isOtaku = media.mediaType === "anime" || media.mediaType === "manga";

  // Synthesize direct search URLs in case response malUrlOrImdbUrl is missing
  const directUrl = details?.malUrlOrImdbUrl || (isOtaku 
    ? `https://myanimelist.net/search/all?q=${encodeURIComponent(media.title)}`
    : `https://www.imdb.com/find?q=${encodeURIComponent(media.title)}`);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      id="media-details-modal"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
        id="details-card-container"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-2 rounded-full text-slate-400 hover:text-slate-100 transition-all z-10 cursor-pointer"
          id="close-details-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4" id="details-loading">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-200">Consulting AI Knowledge Graphs...</p>
              <p className="text-xs text-slate-500 mt-1">Retrieving trivia, synopsis, cast directories and rating profiles.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-y-auto" id="details-content-body">
            
            {/* 1. HERO TITLE BANNER */}
            <div className="relative p-6 sm:p-8 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800/80 flex flex-col md:flex-row gap-6 items-start md:items-center">
              
              <img 
                src={media.coverImage} 
                alt={media.title}
                referrerPolicy="no-referrer"
                className="w-24 h-36 object-cover rounded-xl border border-slate-800 bg-slate-950 shadow-md shadow-slate-950/50 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/150x225/111827/ffffff?text=${encodeURIComponent(media.title)}`;
                }}
                id="details-hero-cover"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                    {getMediaIcon(media.mediaType)}
                    {media.mediaType}
                  </span>
                  
                  {details?.ageRating && (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded-md">
                      {details.ageRating}
                    </span>
                  )}
                  
                  {media.year && (
                    <span className="text-[10px] font-semibold text-slate-450">
                      Released {media.year}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight" id="details-hero-title">
                  {media.title}
                </h3>

                {details?.tagline && (
                  <p className="text-xs sm:text-sm text-indigo-300 font-medium italic mt-1 leading-relaxed">
                    "{details.tagline}"
                  </p>
                )}

                {/* Directors / Studios details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-450 mt-3 font-semibold">
                  {details?.directors && details.directors.length > 0 && (
                    <span>Director/Creator: <strong className="text-slate-300">{details.directors.join(", ")}</strong></span>
                  )}
                  {details?.studios && details.studios.length > 0 && (
                    <span>Studio/Producer: <strong className="text-slate-300">{details.studios.join(", ")}</strong></span>
                  )}
                </div>
              </div>

              {/* Action Side-Block ( MAL/IMDb Link & Watchlist status ) */}
              <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[180px] pt-4 md:pt-0 border-t border-slate-800/40 md:border-t-0 flex-shrink-0">
                
                {/* Outbound Link Button based on platform category */}
                <a 
                  href={directUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
                    isOtaku 
                      ? "bg-blue-650 hover:bg-blue-600 text-slate-100" 
                      : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                  }`}
                  id="target-external-link"
                >
                  {isOtaku ? (
                    <>
                      <span>View on MyAnimeList</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Open in IMDb Database</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </a>

                {/* Tracker Quick Action */}
                {isInWatchlist ? (
                  <div className="bg-slate-950/50 text-slate-500 border border-slate-850 py-2.5 px-4 text-xs font-bold text-center rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Currently Tracking
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onAddToWatchlist({
                        mediaId: media.mediaId,
                        title: media.title,
                        mediaType: media.mediaType,
                        coverImage: media.coverImage,
                        description: media.description || "",
                        genres: media.genres || [],
                        totalUnits: 0,
                        year: media.year || 0,
                        rating: media.rating || 0
                      }, "planning");
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 py-2.5 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-indigo-650/10"
                    id="add-from-details-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Watchlist
                  </button>
                )}
              </div>
            </div>

            {/* ERROR WARNING IF GEMINI FAILED */}
            {error && (
              <div className="bg-amber-950/20 text-amber-350 px-6 py-3 text-xs border-b border-amber-900/40 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 2. TAB TOGGLES FOR INTERACTIVE EXPLORATION */}
            <div className="flex bg-slate-950/40 border-b border-slate-800 px-6 sm:px-8 py-2 gap-1" id="details-subtabs">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "overview" 
                    ? "border-indigo-500 text-slate-100" 
                    : "border-transparent text-slate-450 hover:text-slate-200"
                }`}
                id="btn-details-overview"
              >
                <Info className="w-3.5 h-3.5" />
                Story & Synopsis
              </button>
              
              <button
                onClick={() => setActiveTab("cast")}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "cast" 
                    ? "border-indigo-500 text-slate-100" 
                    : "border-transparent text-slate-450 hover:text-slate-200"
                }`}
                id="btn-details-cast"
              >
                <Users className="w-3.5 h-3.5" />
                Characters & Cast
              </button>

              <button
                onClick={() => setActiveTab("trivia")}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "trivia" 
                    ? "border-indigo-500 text-slate-100" 
                    : "border-transparent text-slate-450 hover:text-slate-200"
                }`}
                id="btn-details-trivia"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Anime/Movie Facts
              </button>
            </div>

            {/* 3. SCROLLABLE PANELS */}
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6" id="details-panels-host">
              
              {activeTab === "overview" && (
                <div className="space-y-6" id="panel-overview">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Main Story Text */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-xs font-black text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        Comprehensive Synopsis
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {details?.fullSynopsis || media.description}
                      </p>
                    </div>

                    {/* Metadata Specs Sidebar Card */}
                    <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-2xl h-fit space-y-4">
                      <h4 className="text-xs font-black text-slate-300 tracking-wider uppercase">
                        Unified Stats & Info
                      </h4>
                      
                      <div className="space-y-2.5 text-xs text-slate-300">
                        {media.rating && (
                          <div className="flex justify-between border-b border-slate-900 pb-1.5 items-center">
                            <span className="text-slate-450">Global Rating</span>
                            <span className="font-bold flex items-center gap-1 text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {media.rating.toFixed(1)} / 10
                            </span>
                          </div>
                        )}
                        {media.genres && media.genres.length > 0 && (
                          <div className="flex flex-col gap-1 border-b border-slate-900 pb-2">
                            <span className="text-slate-450">Genres Included</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {media.genres.map((g) => (
                                <span key={g} className="text-[9px] px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-400 font-semibold">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center pb-1.5">
                          <span className="text-slate-450">Platform Route</span>
                          <span className="font-bold uppercase text-indigo-400 text-[10px]">
                            {isOtaku ? "MyAnimeList API" : "IMDb Index"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Critic Summary Section */}
                  {details?.criticReviewSummary && (
                    <div className="bg-slate-950/20 border border-slate-850 p-5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-black text-slate-350 tracking-wider uppercase flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                        Critical Consensus & Community Pitch
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                        "{details.criticReviewSummary}"
                      </p>
                    </div>
                  )}

                  {/* Recommended Similars Box */}
                  {details?.recommendedSimilars && details.recommendedSimilars.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-indigo-400 tracking-wider uppercase">
                        What Fans Also Like & Recommend
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {details.recommendedSimilars.map((sim, index) => (
                          <div key={index} className="bg-slate-950/40 hover:bg-slate-950/60 transition-colors border border-slate-850 rounded-xl p-4 space-y-1">
                            <span className="text-xs font-black text-slate-200 block">{sim.title}</span>
                            <p className="text-[11px] text-slate-450 leading-relaxed">{sim.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "cast" && (
                <div className="space-y-6" id="panel-cast">
                  <h4 className="text-xs font-black text-indigo-400 tracking-wider uppercase">
                    Major Characters & Voice Actors (Casting)
                  </h4>

                  {details?.mainCharacters && details.mainCharacters.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {details.mainCharacters.map((char, index) => (
                        <div key={index} className="bg-slate-950/30 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-sm font-black text-slate-100 block">{char.name}</span>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{char.role}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-300 block font-semibold">{char.voiceActor}</span>
                            <span className="text-[9px] text-slate-500 italic block">Perf. Artist</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No character listings mapped for this query yet.</p>
                  )}
                </div>
              )}

              {activeTab === "trivia" && (
                <div className="space-y-6" id="panel-trivia">
                  <h4 className="text-xs font-black text-indigo-400 tracking-wider uppercase">
                    Production trivia, Fun Facts & Easter Eggs
                  </h4>

                  {details?.funFacts && details.funFacts.length > 0 ? (
                    <div className="space-y-3">
                      {details.funFacts.map((fact, index) => (
                        <div key={index} className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl flex gap-3 items-start">
                          <span className="w-5 h-5 rounded-full bg-indigo-950/80 border border-indigo-900/35 flex items-center justify-center text-[10px] font-bold text-indigo-400 flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            {fact}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No historical trivia registered for this title currently.</p>
                  )}
                </div>
              )}

            </div>

          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
