import {
  initializeApp,
  getApps,
  FirebaseApp,
  FirebaseOptions,
} from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  console.log("Initializing Firebase app");

  // Configure and initialize the app
  firebaseApp = initializeApp(firebaseConfig);

  // Configure Auth with longer timeouts
  auth = getAuth(firebaseApp);
  auth.settings.appVerificationDisabledForTesting = false;

  // Configure Firestore with more reliable settings
  db = initializeFirestore(firebaseApp, {
    // Use local cache for better offline support and faster loads
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    // More reliable connection for network issues
    experimentalForceLongPolling: true,
  });
} else {
  console.log("Using existing Firebase app");
  firebaseApp = getApps()[0];
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
}

// Initialize storage
const storage = getStorage(firebaseApp);

// Check and log Firestore connection status
if (typeof window !== "undefined") {
  // Only run in browser
  console.log(`Firebase initialized with project: ${firebaseConfig.projectId}`);

  // Pre-warm Firestore connection - using type assertion for terminate method
  (db as any)
    .terminate?.()
    .then(() => {
      console.log(
        "Terminated and reconnecting to Firestore for fresh connection"
      );
      db = getFirestore(firebaseApp);
    })
    .catch((err: Error) => {
      console.error("Error pre-warming Firestore:", err);
    });

  // Setup a periodic connectivity check
  setInterval(() => {
    const connectionState = (db as any)._offline ? "offline" : "online";
    console.log(`Firestore connection status: ${connectionState}`);
  }, 30000); // Check every 30 seconds

  // Network status monitoring
  window.addEventListener("online", () => {
    console.log("Browser online, refreshing Firestore connection");
    (db as any)
      .terminate?.()
      .then(() => {
        db = getFirestore(firebaseApp);
      })
      .catch((err: Error) => {
        console.error("Error refreshing Firestore connection:", err);
      });
  });
}

export { db, auth, storage };
