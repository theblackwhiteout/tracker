import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, query, where, updateDoc, increment } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { WatchlistItem, CommunityReview, ActiveUser } from "./types";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Guest Explorer profile fallback
export const GUEST_PROFILE: ActiveUser = {
  uid: "guest_user",
  displayName: "Guest Explorer",
  email: "guest@example.com",
  photoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=guest_user"
};

// Firestore error details catcher
enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Google Authentication Sign In
export async function loginWithGoogle(): Promise<ActiveUser> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    return {
      uid: user.uid,
      displayName: user.displayName || "Google User",
      email: user.email || "",
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`
    };
  } catch (err: any) {
    console.error("Google login failed:", err);
    throw err;
  }
}

// 2. Subscribe to Firebase Auth state
export function subscribeToAuth(onStateChange: (user: ActiveUser | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onStateChange({
        uid: user.uid,
        displayName: user.displayName || "Google User",
        email: user.email || "",
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`
      });
    } else {
      onStateChange(GUEST_PROFILE);
    }
  });
}

// 3. Google Sign Out
export async function logUserOut() {
  await signOut(auth);
}

// --- CLIENT-SIDE LOCAL STORAGE FALLBACK FOR OFFLINE GUEST MODE ---
const STORAGE_PREFIX = "unified_media_tracker_";
const getLocalWatchlist = (): WatchlistItem[] => {
  const data = localStorage.getItem(STORAGE_PREFIX + "watchlist");
  return data ? JSON.parse(data) : [];
};
const setLocalWatchlist = (list: WatchlistItem[]) => {
  localStorage.setItem(STORAGE_PREFIX + "watchlist", JSON.stringify(list));
};

// 4. Watchlist operations
export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  if (userId && userId !== "guest_user") {
    try {
      const q = query(collection(db, "watchlist"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const items: WatchlistItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push(doc.data() as WatchlistItem);
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "watchlist");
    }
  }
  // Local guest storage fallback
  return getLocalWatchlist().filter(item => item.userId === userId);
}

export async function saveWatchlistItem(item: WatchlistItem): Promise<void> {
  if (item.userId && item.userId !== "guest_user") {
    try {
      const docRef = doc(db, "watchlist", item.id);
      await setDoc(docRef, { ...item, updatedAt: new Date().toISOString() });
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `watchlist/${item.id}`);
    }
  }

  // Local guest fallback
  const list = getLocalWatchlist();
  const idx = list.findIndex(i => i.id === item.id);
  const updatedItem = { ...item, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    list[idx] = updatedItem;
  } else {
    list.push(updatedItem);
  }
  setLocalWatchlist(list);
}

export async function deleteWatchlistItem(id: string): Promise<void> {
  const isGuest = id.includes("guest_user_") || id.startsWith("guest_user");
  if (!isGuest) {
    try {
      await deleteDoc(doc(db, "watchlist", id));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `watchlist/${id}`);
    }
  }

  // Local guest fallback
  const list = getLocalWatchlist();
  const updated = list.filter(item => item.id !== id);
  setLocalWatchlist(updated);
}

// 5. Community Reviews operations
export async function getReviews(mediaId?: string): Promise<CommunityReview[]> {
  try {
    let q;
    if (mediaId) {
      q = query(collection(db, "reviews"), where("mediaId", "==", mediaId));
    } else {
      q = collection(db, "reviews");
    }
    const querySnapshot = await getDocs(q);
    const items: CommunityReview[] = [];
    querySnapshot.forEach((doc) => {
      items.push(doc.data() as CommunityReview);
    });
    return items.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "reviews");
    return [];
  }
}

export async function postReview(review: CommunityReview): Promise<void> {
  if (review.userId === "guest_user") {
    throw new Error("You must sign in with a Google account to post reviews!");
  }
  try {
    const docRef = doc(db, "reviews", review.id);
    await setDoc(docRef, { ...review, updatedAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reviews/${review.id}`);
  }
}

export async function likeReview(reviewId: string): Promise<void> {
  try {
    const docRef = doc(db, "reviews", reviewId);
    await updateDoc(docRef, {
      likesCount: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reviews/${reviewId}`);
  }
}
