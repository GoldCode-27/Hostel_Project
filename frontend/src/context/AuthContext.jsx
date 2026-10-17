import { createContext, useState } from "react";

export const AuthContext = createContext();

const getStoredUser = () => {
  try {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const authLoading = false;

  const login = (userData) => {
    setUser(userData.user);
    localStorage.setItem("token", userData.token);
    localStorage.setItem("user", JSON.stringify(userData.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, authLoading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
