import { createContext, useContext, useEffect, useMemo, useState } from "react";
import LoginPage from "./LoginPage";

const AUTH_SESSION_KEY = "devmate_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  logout: () => {},
});

function readSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);
    if (!session?.email || !session?.createdAt) {
      return null;
    }

    if (Date.now() - Number(session.createdAt) > SESSION_TTL_MS) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return {
      email: String(session.email),
      createdAt: Number(session.createdAt),
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGate({ children }) {
  const [user, setUser] = useState(() => readSession());

  useEffect(() => {
    setUser(readSession());
  }, []);

  const authValue = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      user,
      logout: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_SESSION_KEY);
          window.location.reload();
        }
      },
    }),
    [user],
  );

  function handleLogin(payload) {
    const email = typeof payload === "string" ? payload : payload?.email;
    const nextUser = {
      email: String(email),
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextUser));
    }

    setUser(nextUser);
  }

  return (
    <AuthContext.Provider value={authValue}>
      {user ? children : <LoginPage onLogin={handleLogin} />}
    </AuthContext.Provider>
  );
}
