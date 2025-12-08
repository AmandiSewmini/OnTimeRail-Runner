import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAdminAuthStateChanged, adminLogin, adminLogout } from '../firebase/adminAuth';

const AdminContext = createContext();

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }) {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChanged(({ user, isAdmin }) => {
      setCurrentAdmin(isAdmin ? user : null);
      setAdminLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login function
  const login = async (email, password) => {
    setAdminError('');
    try {
      return await adminLogin(email, password);
    } catch (error) {
      setAdminError(error.message);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    setAdminError('');
    try {
      await adminLogout();
    } catch (error) {
      setAdminError(error.message);
      throw error;
    }
  };

  const value = {
    currentAdmin,
    adminLoading,
    adminError,
    login,
    logout
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
} 