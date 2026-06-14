import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, collection, getDocs, getDoc, setDoc, deleteDoc, query, where, orderBy, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { WatchlistItem, CommunityReview, UserProfile, MediaType, ActiveUser } from "./types";

// Check if credentials are real or placeholder
const isRealFirebase = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes("demo-api-key") &&
  firebaseConfig.projectId !== "demo-project";

let dbInstance: any = null;
let authInstance: any = null;

if (isRealFirebase) {
  try {
    const app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    authInstance = getAuth(app);
    
    // Validate connection to Firestore as requested by the skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(dbInstance, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. Client appears to be offline.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.warn("Firebase initialization failed; falling back to simulated engine.", err);
    isRealFirebase; 
  }
}

export const db = dbInstance;
export const auth = authInstance;

// --- ERROR HANDLING CONTRACT MANDATED BY SKILL ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- LOCAL STORAGE SIMULATOR ENGINE ---
const STORAGE_PREFIX = "unified_media_tracker_";

const getLocalUser = (): UserProfile | null => {
  const data = localStorage.getItem(STORAGE_PREFIX + "user");
  return data ? JSON.parse(data) : null;
};

const setLocalUser = (user: UserProfile | null) => {
  if (user) {
    localStorage.setItem(STORAGE_PREFIX + "user", JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_PREFIX + "user");
  }
};

const getLocalWatchlist = (): WatchlistItem[] => {
  const data = localStorage.getItem(STORAGE_PREFIX + "watchlist");
  return data ? JSON.parse(data) : [];
};

const setLocalWatchlist = (list: WatchlistItem[]) => {
  localStorage.setItem(STORAGE_PREFIX + "watchlist", JSON.stringify(list));
};

const getLocalReviews = (): CommunityReview[] => {
  const data = localStorage.getItem(STORAGE_PREFIX + "reviews");
  if (data) return JSON.parse(data);
  
  // Seed with highly detailed reviews matching mal-style
  const seed: CommunityReview[] = [
    {
      id: "seed_rev_1",
      userId: "101",
      username: "AnimeAlchemist",
      userAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=AnimeAlchemist",
      mediaId: "frieren",
      mediaType: "anime",
      mediaTitle: "Frieren: Beyond Journey's End",
      rating: 10,
      content: "This is easily one of the best anime of the decade. The pacing is deliberate and beautiful, capturing a sense of nostalgia, time, and grief that standard action anime completely bypass. The dynamic between Frieren and Fern is masterfully written. A golden reminder that the adventure doesn't end when the demon king dies—it's just when the real reflection begins. Must watch!",
      likesCount: 142,
      updatedAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString()
    },
    {
      id: "seed_rev_2",
      userId: "102",
      username: "CinephileX",
      userAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=CinephileX",
      mediaId: "interstellar",
      mediaType: "movie",
      mediaTitle: "Interstellar",
      rating: 9,
      content: "Hans Zimmer's pipe organ score paired with Nolan's sprawling cosmos creates a spectacular existential journey. What strikes me most, however, is that for all its high science (wormholes, time dilation, black holes), it is ultimately a very grounded, emotional story about a father keeping a promise to his daughter. Extremely polished visuals and sound design.",
      likesCount: 88,
      updatedAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString()
    },
    {
      id: "seed_rev_3",
      userId: "103",
      username: "MangaSensei",
      userAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=MangaSensei",
      mediaId: "one-piece",
      mediaType: "manga",
      mediaTitle: "One Piece",
      rating: 10,
      content: "Oda's worldbuilding is simply peerless. After more than 1000 chapters, the narrative threads, foreshadowing, and emotional climaxes still lands with tremendous impact. No chapter feels wasted. The journey of the Straw Hats is a testament to the power of dreams and freedom. If you haven't read the manga, you are missing out on an absolute modern epic.",
      likesCount: 204,
      updatedAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString()
    }
  ];
  localStorage.setItem(STORAGE_PREFIX + "reviews", JSON.stringify(seed));
  return seed;
};

const setLocalReviews = (reviews: CommunityReview[]) => {
  localStorage.setItem(STORAGE_PREFIX + "reviews", JSON.stringify(reviews));
};

// --- MULTI-PROVIDER BRIDGE API ---

// 1. Unified Authentication State Listener
export function subscribeToAuth(onStateChange: (user: ActiveUser | null) => void) {
  if (isRealFirebase && auth) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const uProfile: ActiveUser = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
          email: fbUser.email || "",
          photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fbUser.uid}`
        };
        
        // Save user profile state
        try {
          const uDoc = {
            userId: uProfile.uid,
            username: uProfile.displayName,
            avatarUrl: uProfile.photoURL,
            role: "standard",
            updatedAt: new Date()
          };
          await setDoc(doc(db, "users", fbUser.uid), uDoc);
        } catch (e) {
          console.warn("Failed to write profile record, security rules may prevent or not signed in completely", e);
        }
        
        onStateChange(uProfile);
      } else {
        onStateChange(null);
      }
    });
  } else {
    // Local memory tracking
    const local = getLocalUser();
    if (local) {
      onStateChange({
        uid: local.userId,
        displayName: local.username,
        email: "guest@example.com",
        photoURL: local.avatarUrl
      });
    } else {
      onStateChange(null);
    }
    // Return empty unsubscribe callback
    return () => {};
  }
}

// 2. Google Sign-In with popup
export async function loginWithGoogle(): Promise<ActiveUser> {
  if (isRealFirebase && auth) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    return {
      uid: fbUser.uid,
      displayName: fbUser.displayName || "User",
      email: fbUser.email || "",
      photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fbUser.uid}`
    };
  } else {
    // Generate a beautiful mock user in local memory
    const mockUid = "simulated_" + Math.random().toString(36).substr(2, 9);
    const mockUser: UserProfile = {
      userId: mockUid,
      username: "MediaAdmirer_" + Math.floor(Math.random() * 900 + 100),
      avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${mockUid}`,
      role: "standard",
      updatedAt: new Date().toISOString()
    };
    setLocalUser(mockUser);
    return {
      uid: mockUser.userId,
      displayName: mockUser.username,
      email: "guest@example.com",
      photoURL: mockUser.avatarUrl
    };
  }
}

// 3. User Sign Out
export async function logUserOut() {
  if (isRealFirebase && auth) {
    await signOut(auth);
  } else {
    setLocalUser(null);
  }
}

// 4. Unified Watchlist operations
export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  if (isRealFirebase && db) {
    const colName = "watchlist";
    try {
      const q = query(collection(db, colName), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const items: WatchlistItem[] = [];
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        items.push({
          ...d,
          updatedAt: d.updatedAt?.toMillis ? d.updatedAt.toMillis() : d.updatedAt
        } as WatchlistItem);
      });
      return items;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${colName}/userId=${userId}`);
    }
  } else {
    return getLocalWatchlist().filter(item => item.userId === userId);
  }
}

export async function saveWatchlistItem(item: WatchlistItem): Promise<void> {
  const timestamp = new Date();
  const dbItemRef = {
    ...item,
    updatedAt: isRealFirebase ? timestamp : timestamp.toISOString()
  };

  if (isRealFirebase && db) {
    const colName = "watchlist";
    try {
      await setDoc(doc(db, colName, item.id), dbItemRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${colName}/${item.id}`);
    }
  } else {
    const list = getLocalWatchlist();
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...dbItemRef, updatedAt: timestamp.toISOString() };
    } else {
      list.push({ ...dbItemRef, updatedAt: timestamp.toISOString() });
    }
    setLocalWatchlist(list);
  }
}

export async function deleteWatchlistItem(id: string): Promise<void> {
  if (isRealFirebase && db) {
    const colName = "watchlist";
    try {
      await deleteDoc(doc(db, colName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${colName}/${id}`);
    }
  } else {
    const list = getLocalWatchlist();
    const updated = list.filter(item => item.id !== id);
    setLocalWatchlist(updated);
  }
}

// 5. Community Reviews operations
export async function getReviews(mediaId?: string): Promise<CommunityReview[]> {
  if (isRealFirebase && db) {
    const colName = "reviews";
    try {
      let q = query(collection(db, colName));
      if (mediaId) {
        q = query(collection(db, colName), where("mediaId", "==", mediaId));
      }
      const snapshot = await getDocs(q);
      const reviews: CommunityReview[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        reviews.push({
          ...d,
          updatedAt: d.updatedAt?.toMillis ? d.updatedAt.toMillis() : d.updatedAt
        } as CommunityReview);
      });
      // Sort client side or server query
      return reviews.sort((a, b) => b.likesCount - a.likesCount);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, colName);
    }
  } else {
    const reviews = getLocalReviews();
    if (mediaId) {
      return reviews.filter(r => r.mediaId === mediaId).sort((a, b) => b.likesCount - a.likesCount);
    }
    return reviews.sort((a, b) => b.likesCount - a.likesCount);
  }
}

export async function postReview(review: CommunityReview): Promise<void> {
  const timestamp = new Date();
  const dbReviewRef = {
    ...review,
    updatedAt: isRealFirebase ? timestamp : timestamp.toISOString()
  };

  if (isRealFirebase && db) {
    const colName = "reviews";
    try {
      await setDoc(doc(db, colName, review.id), dbReviewRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${colName}/${review.id}`);
    }
  } else {
    const reviews = getLocalReviews();
    reviews.push({ ...dbReviewRef, updatedAt: timestamp.toISOString() });
    setLocalReviews(reviews);
  }
}

export async function likeReview(reviewId: string): Promise<void> {
  if (isRealFirebase && db) {
    const colName = "reviews";
    try {
      const snap = await getDoc(doc(db, colName, reviewId));
      if (snap.exists()) {
        const currentLikes = snap.data().likesCount || 0;
        await setDoc(doc(db, colName, reviewId), { likesCount: currentLikes + 1 }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${colName}/${reviewId}/like`);
    }
  } else {
    const reviews = getLocalReviews();
    const idx = reviews.findIndex(r => r.id === reviewId);
    if (idx >= 0) {
      reviews[idx].likesCount += 1;
      setLocalReviews(reviews);
    }
  }
}
