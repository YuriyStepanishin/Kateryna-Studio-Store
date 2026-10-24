import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loginUser, registerUser } from '../api/storeApi';
import type { AuthPayload, UserProfile } from '../types/store';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  register: (payload: AuthPayload) => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'kss_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw) as UserProfile);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const register = async (payload: AuthPayload) => {
    setLoading(true);
    try {
      const nextUser = await registerUser(payload);
      setUser(nextUser);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string) => {
    setLoading(true);
    try {
      const nextUser = await loginUser({ email });
      setUser(nextUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({ user, loading, register, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
