import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

// Generic type for Firestore documents
type FirestoreDoc<T> = T & { id: string };

// Helper function to convert document snapshots to typed objects
const convertDoc = <T>(doc: any): FirestoreDoc<T> => {
  return { id: doc.id, ...doc.data() } as FirestoreDoc<T>;
};

// Collection references
export const getCollection = (collectionName: string) =>
  collection(db, collectionName);

// Create new document with auto-generated ID
export const createDocument = async <T>(
  collectionName: string,
  data: Omit<T, "id">
) => {
  const collectionRef = getCollection(collectionName);
  const docWithTimestamps = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collectionRef, docWithTimestamps);
  return { id: docRef.id, ...data } as FirestoreDoc<T>;
};

// Add document with auto-generated ID (alias for createDocument)
export const addDocument = async <T>(
  collectionName: string,
  data: Omit<T, "id">
) => {
  return createDocument<T>(collectionName, data);
};

// Create document with custom ID
export const createDocumentWithId = async <T>(
  collectionName: string,
  id: string,
  data: Omit<T, "id">
) => {
  const docRef = doc(db, collectionName, id);
  const docWithTimestamps = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, docWithTimestamps);
  return { id, ...data } as FirestoreDoc<T>;
};

// Get document by ID
export const getDocumentById = async <T>(
  collectionName: string,
  id: string
): Promise<FirestoreDoc<T> | null> => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return convertDoc<T>(docSnap);
  } else {
    return null;
  }
};

// Update document
export const updateDocument = async <T>(
  collectionName: string,
  id: string,
  data: Partial<T>
) => {
  const docRef = doc(db, collectionName, id);
  const updateData = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updateData);
  return { id, ...data } as Partial<FirestoreDoc<T>>;
};

// Delete document
export const deleteDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
  return true;
};

// Get all documents from a collection
export const getAllDocuments = async <T>(
  collectionName: string
): Promise<FirestoreDoc<T>[]> => {
  const collectionRef = getCollection(collectionName);
  const querySnapshot = await getDocs(collectionRef);

  return querySnapshot.docs.map((doc) => convertDoc<T>(doc));
};

// Query documents with filters
export const queryDocuments = async <T>(
  collectionName: string,
  filters: {
    field: string;
    operator: "==" | ">" | "<" | ">=" | "<=";
    value: any;
  }[],
  sortBy?: { field: string; direction: "asc" | "desc" },
  limitTo?: number
): Promise<FirestoreDoc<T>[]> => {
  const collectionRef = getCollection(collectionName);

  let queryRef = query(
    collectionRef,
    ...filters.map((filter) =>
      where(filter.field, filter.operator, filter.value)
    )
  );

  if (sortBy) {
    queryRef = query(queryRef, orderBy(sortBy.field, sortBy.direction));
  }

  if (limitTo) {
    queryRef = query(queryRef, limit(limitTo));
  }

  const querySnapshot = await getDocs(queryRef);
  return querySnapshot.docs.map((doc) => convertDoc<T>(doc));
};
