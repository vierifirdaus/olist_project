import React, { createContext, useContext, useEffect, useState } from "react";
import { apiLogin, apiLogout, apiMe, apiRegister } from "../api/auth.api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    apiMe().then(setUser).catch(() => setUser(null)).finally(() => setBooting(false));
  }, []);

  const login = async ({ email, password }) => {
    await apiLogin({ email, password });
    const me = await apiMe();
    setUser(me);
    return me;
  };

  const register = async ({ email, name, password }) => {
    await apiRegister({ email, name, password });
    await login({ email, password });
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, booting, login, logout, register }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
