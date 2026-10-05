import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Conversation, ChatMessage, AIMemory, CreatorArtifact, UploadedFileItem } from './types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling complying with skill requirements
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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice: Local caching active');
    }
    return false;
  }
}

// Auth operations
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Sync user profile to Firestore
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          uid: result.user.uid,
          email: result.user.email || 'user@zeegrok.ai',
          displayName: result.user.displayName || 'Grok Creator',
          photoURL: result.user.photoURL || '',
          defaultModel: 'gemini-3.8-flash',
          defaultProvider: 'gemini',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    return result.user;
  } catch (err) {
    console.error('Sign-in error:', err);
    throw err;
  }
}

export async function signOutUser() {
  return await fbSignOut(auth);
}

// ==========================================
// Firestore Data Access Methods with Error Handlers
// ==========================================

export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  // If user is not authenticated with Firebase, use local storage to prevent permission errors
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const local = localStorage.getItem('zeegrok_conversations');
    return local ? JSON.parse(local) : [];
  }

  const path = 'conversations';
  try {
    const q = query(collection(db, path), where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Conversation);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveConversation(conv: Conversation): Promise<void> {
  // Always update local cache
  try {
    const local = localStorage.getItem('zeegrok_conversations');
    const list: Conversation[] = local ? JSON.parse(local) : [];
    const idx = list.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      list[idx] = conv;
    } else {
      list.unshift(conv);
    }
    localStorage.setItem('zeegrok_conversations', JSON.stringify(list));
  } catch {}

  // If not authenticated, do not make unauthenticated Firestore calls
  if (!auth.currentUser || auth.currentUser.uid !== conv.userId) {
    return;
  }

  const path = `conversations/${conv.id}`;
  try {
    await setDoc(doc(db, 'conversations', conv.id), conv, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteConversation(convId: string): Promise<void> {
  // Update local cache
  try {
    const local = localStorage.getItem('zeegrok_conversations');
    if (local) {
      const list: Conversation[] = JSON.parse(local);
      const remaining = list.filter((c) => c.id !== convId);
      localStorage.setItem('zeegrok_conversations', JSON.stringify(remaining));
    }
    localStorage.removeItem(`zeegrok_msgs_${convId}`);
  } catch {}

  if (!auth.currentUser) return;

  const path = `conversations/${convId}`;
  try {
    await deleteDoc(doc(db, 'conversations', convId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchConversationMessages(convId: string, userId: string): Promise<ChatMessage[]> {
  // If not authenticated, load from local storage
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const local = localStorage.getItem(`zeegrok_msgs_${convId}`);
    return local ? JSON.parse(local) : [];
  }

  const path = `conversations/${convId}/messages`;
  try {
    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ChatMessage);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  // Save to local cache
  try {
    const key = `zeegrok_msgs_${msg.conversationId}`;
    const local = localStorage.getItem(key);
    const list: ChatMessage[] = local ? JSON.parse(local) : [];
    list.push(msg);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}

  if (!auth.currentUser || auth.currentUser.uid !== msg.userId) {
    return;
  }

  const path = `conversations/${msg.conversationId}/messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'conversations', msg.conversationId, 'messages', msg.id), msg);
    await updateDoc(doc(db, 'conversations', msg.conversationId), {
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// User Memories
export async function fetchUserMemories(userId: string): Promise<AIMemory[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const local = localStorage.getItem('zeegrok_memories');
    return local ? JSON.parse(local) : [];
  }

  const path = 'memories';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AIMemory);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveMemory(mem: AIMemory): Promise<void> {
  try {
    const local = localStorage.getItem('zeegrok_memories');
    const list: AIMemory[] = local ? JSON.parse(local) : [];
    const idx = list.findIndex((m) => m.id === mem.id);
    if (idx >= 0) list[idx] = mem;
    else list.unshift(mem);
    localStorage.setItem('zeegrok_memories', JSON.stringify(list));
  } catch {}

  if (!auth.currentUser || auth.currentUser.uid !== mem.userId) return;

  const path = `memories/${mem.id}`;
  try {
    await setDoc(doc(db, 'memories', mem.id), mem, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMemory(memId: string): Promise<void> {
  try {
    const local = localStorage.getItem('zeegrok_memories');
    if (local) {
      const list: AIMemory[] = JSON.parse(local);
      localStorage.setItem('zeegrok_memories', JSON.stringify(list.filter((m) => m.id !== memId)));
    }
  } catch {}

  if (!auth.currentUser) return;

  const path = `memories/${memId}`;
  try {
    await deleteDoc(doc(db, 'memories', memId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Creator Studio Artifacts
export async function fetchCreatorArtifacts(userId: string): Promise<CreatorArtifact[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const local = localStorage.getItem('zeegrok_artifacts');
    return local ? JSON.parse(local) : [];
  }

  const path = 'creatorArtifacts';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CreatorArtifact);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveCreatorArtifact(artifact: CreatorArtifact): Promise<void> {
  try {
    const local = localStorage.getItem('zeegrok_artifacts');
    const list: CreatorArtifact[] = local ? JSON.parse(local) : [];
    list.unshift(artifact);
    localStorage.setItem('zeegrok_artifacts', JSON.stringify(list.slice(0, 50)));
  } catch {}

  if (!auth.currentUser || auth.currentUser.uid !== artifact.userId) return;

  const path = `creatorArtifacts/${artifact.id}`;
  try {
    await setDoc(doc(db, 'creatorArtifacts', artifact.id), artifact, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Files Metadata
export async function fetchUserFiles(userId: string): Promise<UploadedFileItem[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const local = localStorage.getItem('zeegrok_files');
    return local ? JSON.parse(local) : [];
  }

  const path = 'files';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UploadedFileItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveFileMetadata(fileItem: UploadedFileItem): Promise<void> {
  try {
    const local = localStorage.getItem('zeegrok_files');
    const list: UploadedFileItem[] = local ? JSON.parse(local) : [];
    list.unshift(fileItem);
    localStorage.setItem('zeegrok_files', JSON.stringify(list.slice(0, 30)));
  } catch {}

  if (!auth.currentUser || auth.currentUser.uid !== fileItem.userId) return;

  const path = `files/${fileItem.id}`;
  try {
    await setDoc(doc(db, 'files', fileItem.id), fileItem, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
