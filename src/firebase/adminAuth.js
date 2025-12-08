import { auth, db } from './config';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Admin login
export const adminLogin = async (email, password) => {
  try {
    // First authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Then check if user has admin role in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      // Not an admin, sign them out
      await signOut(auth);
      throw new Error("Unauthorized access. Admin privileges required.");
    }
    
    return { user };
  } catch (error) {
    console.error("Admin login error:", error);
    throw error;
  }
};

// Admin logout
export const adminLogout = async () => {
  return signOut(auth);
};

// Admin auth state observer
export const onAdminAuthStateChanged = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Check if the authenticated user is an admin
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      
      if (userData && userData.role === 'admin') {
        callback({ user, isAdmin: true });
      } else {
        callback({ user, isAdmin: false });
      }
    } else {
      callback({ user: null, isAdmin: false });
    }
  });
}; 