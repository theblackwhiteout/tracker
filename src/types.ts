export interface ActiveUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export type MediaType = 'anime' | 'manga' | 'movie' | 'tv';

export type WatchStatus = 'planning' | 'current' | 'completed' | 'paused' | 'dropped';

export interface UserProfile {
  userId: string;
  username: string;
  avatarUrl: string;
  role: string;
  updatedAt: any; // Firestore Timestamp
}

export interface WatchlistItem {
  id: string; // userId_mediaType_mediaId
  userId: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  coverImage: string;
  status: WatchStatus;
  progress: number; // chapter read / episode watched
  totalUnits: number; // total units if known, else 0
  rating: number; // 0 (unrated) to 10
  notes: string;
  updatedAt: any; // Firestore Timestamp
}

export interface CommunityReview {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  mediaId: string;
  mediaType: MediaType;
  mediaTitle: string;
  rating: number;
  content: string;
  likesCount: number;
  updatedAt: any; // Firestore Timestamp
}

export interface MediaItem {
  mediaId: string;
  title: string;
  mediaType: MediaType;
  coverImage: string;
  bannerImage?: string;
  description: string;
  genres: string[];
  totalUnits: number;
  year: number;
  rating: number;
  rationale?: string; // For recommendations
}

export interface AiringScheduleItem {
  id: number;
  airingAt: number;
  episode: number;
  mediaId: number;
  media: {
    id: number;
    title: {
      romaji?: string;
      english?: string;
      native?: string;
    };
    coverImage: {
      large: string;
    };
    format: string;
    genres: string[];
    description?: string;
    episodes?: number;
  };
}
