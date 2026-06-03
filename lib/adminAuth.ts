import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

export async function adminLogin(email: string, password: string): Promise<void> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();
  // Cookie persists for 1 hour; middleware reads this to gate /admin routes
  document.cookie = `admin_session=${token}; path=/; max-age=3600; SameSite=Strict`;
}

export async function adminLogout(): Promise<void> {
  await signOut(auth);
  document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function subscribeAdminAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
