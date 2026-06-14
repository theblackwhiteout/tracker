import React, { useState, useEffect } from "react";
import { MessageSquare, ThumbsUp, Star, PenTool, CheckCircle, AlertCircle, HelpCircle, BookOpen, Film, Tv, Video, RefreshCw } from "lucide-react";
import { CommunityReview, WatchlistItem, MediaType } from "../types";
import { getReviews, postReview, likeReview } from "../firebase";

interface CommunityReviewsBlockProps {
  watchlist: WatchlistItem[];
  currentUser: { uid: string; displayName: string; photoURL: string } | null;
}

export default function CommunityReviewsBlock({ watchlist, currentUser }: CommunityReviewsBlockProps) {
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Submit Form State
  const [selectedWatchItem, setSelectedWatchItem] = useState<string>("");
  const [rating, setRating] = useState(10);
  const [content, setContent] = useState("");
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchAllReviews = async () => {
    setIsLoading(true);
    try {
      const data = await getReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReviews();
  }, [watchlist.length]);

  const handleLike = async (reviewId: string) => {
    try {
      await likeReview(reviewId);
      // Optimistic Update
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likesCount: r.likesCount + 1 } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage("Please sign in to write a review!");
      return;
    }
    if (!selectedWatchItem) {
      setMessage("Please select an item from your watchlist to review.");
      return;
    }
    if (content.trim().length < 10) {
      setMessage("Reviews must be at least 10 characters long.");
      return;
    }

    setIsSubmitLoading(true);
    setMessage("");

    const targetItem = watchlist.find(item => item.id === selectedWatchItem);
    if (!targetItem) {
      setMessage("Selected watchlist item not found.");
      setIsSubmitLoading(false);
      return;
    }

    const newReviewId = "rev_" + Math.random().toString(36).substr(2, 9);
    const newReview: CommunityReview = {
      id: newReviewId,
      userId: currentUser.uid,
      username: currentUser.displayName,
      userAvatar: currentUser.photoURL,
      mediaId: targetItem.mediaId,
      mediaType: targetItem.mediaType,
      mediaTitle: targetItem.title,
      rating: rating,
      content: content.trim(),
      likesCount: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      await postReview(newReview);
      setReviews(prev => [newReview, ...prev]);
      setContent("");
      setSelectedWatchItem("");
      setMessage("Your review has been shared with the community successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Failed to submit review. Review structure rules violated.");
    } finally {
      setIsSubmitLoading(false);
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="reviews-section">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Review Form column */}
        <div className="lg:col-span-1" id="review-submission-column">
          <div className="flex flex-col gap-1 mb-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1.5" id="write-review-title">
              <PenTool className="w-4.5 h-4.5 text-indigo-400" />
              Write a Review
            </h3>
            <p className="text-xs text-slate-400">
              Select any item from your list and share your honest ratings.
            </p>
          </div>

          {!currentUser ? (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl text-center" id="review-auth-gate">
              <p className="text-xs text-slate-400 mb-2">You must log in to submit a review.</p>
            </div>
          ) : watchlist.length === 0 ? (
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl text-center" id="review-empty-gate">
              <p className="text-xs text-slate-450">Reviews must link to tracked titles. Please add at least one item to your watchlist first.</p>
            </div>
          ) : (
            <form onSubmit={handlePostReview} className="space-y-4 bg-slate-950/45 p-4 border border-slate-850/80 rounded-xl" id="post-review-form">
              {/* Select target item */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Select Media</label>
                <select
                  value={selectedWatchItem}
                  onChange={(e) => setSelectedWatchItem(e.target.value)}
                  className="text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 w-full focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Tracked item --</option>
                  {watchlist.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.mediaType.toUpperCase()}] {item.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Set score */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Rating ({rating}/10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Review Text */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Your review</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What makes this special or terrible? Discuss action sequences, art design, plotting, characters..."
                  rows={6}
                  className="text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 w-full focus:outline-none focus:border-indigo-500 placeholder-slate-500 min-h-[140px]"
                ></textarea>
              </div>

              {message && (
                <div className="text-[11px] p-2 bg-slate-900 border border-indigo-950/50 rounded-lg text-slate-350" id="post-review-status">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitLoading}
                className="w-full bg-indigo-650 hover:bg-indigo-600 text-xs text-slate-100 font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                id="post-review-submit"
              >
                {isSubmitLoading ? "Submitting..." : "Post Review"}
              </button>
            </form>
          )}
        </div>

        {/* Global reviews column */}
        <div className="lg:col-span-2" id="reviews-feed-column">
          <div className="flex flex-col gap-1 mb-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1.5" id="feed-reviews-title">
              <MessageSquare className="w-4.5 h-4.5 text-indigo-400" />
              Community Critiques
            </h3>
            <p className="text-xs text-slate-400">
              Browse reviews from fellow Otakus, Cinephiles, and Casual Viewers alike.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4 py-10 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
              <span>Fetching global community logs...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 bg-slate-950/20 rounded-xl border border-dashed border-slate-800 text-slate-500 text-sm">
              Be the first to share your rating review list! No media logs posted yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800" id="reviews-feed">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col justify-between"
                  id={`review-feed-card-${rev.id}`}
                >
                  <div>
                    {/* Header profile info */}
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.userAvatar}
                          alt={rev.username}
                          className="w-8 h-8 rounded-full border border-indigo-900/30 bg-slate-900"
                        />
                        <div>
                          <h5 className="text-xs font-bold text-slate-200">{rev.username}</h5>
                          <span className="text-[9px] text-slate-500 font-medium">
                            {new Date(rev.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Display rated details */}
                      <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded">
                          {getMediaIcon(rev.mediaType)}
                          {rev.mediaTitle}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-slate-350">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold">{rev.rating}/10</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Text */}
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans mb-4">
                      {rev.content}
                    </p>
                  </div>

                  {/* Actions (helpful votes counter) */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-900/70">
                    <button
                      onClick={() => handleLike(rev.id)}
                      className="text-[11px] font-bold text-slate-450 hover:text-indigo-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                      id={`like-review-${rev.id}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Helpful ({rev.likesCount})
                    </button>
                    <span className="text-[9px] text-slate-650 font-medium uppercase tracking-wider">
                      Verified Sync
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
