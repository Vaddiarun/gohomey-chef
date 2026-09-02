import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiError, refreshSession, readAuthPayload } from '../services/api';

// Full chef session token (role: CHEF). Only written once registration is done.
const SESSION_KEY = 'userToken';
// In-progress signup: JSON { token, step, phoneNumber }. The token here is a
// short-lived registration token (role: USER + isRegistrationPending) — it is
// EXPECTED to 403 on chef routes, so it must never be sent to them.
const PENDING_KEY = 'pendingRegistration';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  /** Review state of the chef application. API field is `application_status`. */
  status?: string;
  application_status?: string;
  kitchen_name?: string;
  kitchen_address?: string;
  kitchen_photo_url?: string;
  bio?: string;
  expertise?: string[];
  bank_holder_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
};

/**
 * A signup that hasn't reached step-3 yet. The auth stack uses this to drop the
 * user back on the right RegisterStep — the registration token lasts 24h, so an
 * abandoned signup can be finished within a day without re-OTP.
 */
type PendingRegistration = {
  token: string;
  step: number;
  phoneNumber?: string;
} | null;

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: UserProfile | null;
  sessionMessage: string | null;
  pendingRegistration: PendingRegistration;
  login: (token?: string, user?: UserProfile | null) => Promise<void>;
  logout: () => void;
  /** Persist a registration token and enter the signup flow (not the app). */
  beginRegistration: (reg: { token: string; step: number; phoneNumber?: string }) => Promise<void>;
  /** Record signup progress so a relaunch resumes on the right step. */
  updateRegistrationStep: (step: number) => Promise<void>;
  /** Session rejected by the backend (expired / wrong role) — clear it and show `reason` on login. */
  handleUnauthorized: (error?: ApiError | { code?: string } | null) => void;
  clearSessionMessage: () => void;
  fetchProfile: (authToken?: string) => Promise<'ok' | 'unauthorized' | 'error'>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  user: null,
  sessionMessage: null,
  pendingRegistration: null,
  login: async () => {},
  logout: () => {},
  beginRegistration: async () => {},
  updateRegistrationStep: async () => {},
  handleUnauthorized: () => {},
  clearSessionMessage: () => {},
  fetchProfile: async () => 'error',
  updateProfile: async () => false,
});

const messageForCode = (code?: string) =>
  code === 'TOKEN_EXPIRED'
    ? 'Your session has expired. Please sign in again.'
    : 'Your session is no longer valid. Please sign in again.';

// A registration token that 403s / expires isn't a "logout" — the user just
// needs a fresh code to keep registering.
const REG_EXPIRED_MESSAGE =
  'Your registration session expired. Please verify your number again.';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration>(null);

  const clearSessionMessage = () => setSessionMessage(null);

  const persistSessionToken = async (newToken: string) => {
    setToken(newToken);
    await SecureStore.setItemAsync(SESSION_KEY, newToken);
  };

  const persistPending = async (reg: NonNullable<PendingRegistration>) => {
    setPendingRegistration(reg);
    await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(reg));
  };

  const clearAll = async () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setPendingRegistration(null);
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(PENDING_KEY);
  };

  const handleUnauthorized = (error?: ApiError | { code?: string } | null) => {
    setSessionMessage(messageForCode(error?.code));
    clearAll();
  };

  /**
   * 401 always means re-auth. 403 means re-auth *only* for a full session token
   * — for a registration token a 403 on a chef route is expected and handled by
   * keeping the user in the signup flow, never here.
   */
  const isRejectedSession = (status: number) => status === 401 || status === 403;

  type ProfileResult = 'ok' | 'unauthorized' | 'error';

  const fetchProfile = async (authToken?: string): Promise<ProfileResult> => {
    const activeToken = authToken || token;
    if (!activeToken) return 'error';

    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}chefs/profile`;
      console.log('API Request: GET', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (isRejectedSession(response.status)) {
        const data = await response.json().catch(() => ({}));
        console.log('API Error (Profile):', response.status, data?.message || data?.code);
        handleUnauthorized(data);
        return 'unauthorized';
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error (Profile):', response.status, errorText);
        return 'error';
      }

      const result = await response.json();
      console.log('API Response (Profile):', JSON.stringify(result, null, 2));

      if (result.status === 'success') {
        // Normalise: expose the review state as both `application_status` (API
        // name) and `status` so every consumer can read it either way.
        const profile = result.data ?? {};
        setUser({
          ...profile,
          status: profile.application_status ?? profile.status,
        });
        return 'ok';
      }
      return 'error';
    } catch (error) {
      console.error('Error fetching profile:', error);
      return 'error';
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!token) return false;
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}chefs/profile`;
      console.log('API Request: PATCH', url);
      console.log('API Request Body (Update Profile):', JSON.stringify(data, null, 2));
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (isRejectedSession(response.status)) {
        const errData = await response.json().catch(() => ({}));
        handleUnauthorized(errData);
        return false;
      }
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error (Update Profile):', response.status, errorText);
        return false;
      }
      const result = await response.json();
      console.log('API Response (Update Profile):', JSON.stringify(result, null, 2));
      if (result.status === 'success') {
        await fetchProfile(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // 1. A signup in progress takes priority — never touch chef routes with
        //    a registration token.
        const pendingRaw = await SecureStore.getItemAsync(PENDING_KEY);
        if (pendingRaw) {
          let pending: NonNullable<PendingRegistration>;
          try {
            pending = JSON.parse(pendingRaw);
          } catch {
            await SecureStore.deleteItemAsync(PENDING_KEY);
            return;
          }

          try {
            const p = readAuthPayload(await refreshSession(pending.token));
            const nextToken = p.token || pending.token;

            if (!p.isNewUser && p.applicationStatus && p.applicationStatus !== 'DRAFT') {
              // Signup was actually completed elsewhere — promote to a session.
              await SecureStore.deleteItemAsync(PENDING_KEY);
              setPendingRegistration(null);
              await login(nextToken, p.user);
            } else {
              await persistPending({
                token: nextToken,
                step: p.registrationStep || pending.step || 1,
                phoneNumber: pending.phoneNumber,
              });
              setIsAuthenticated(false);
            }
          } catch (error) {
            if (error instanceof ApiError && error.isAuthError) {
              await clearAll();
              setSessionMessage(REG_EXPIRED_MESSAGE);
            } else {
              // /auth/refresh unavailable or offline: trust the stored record.
              console.log('Registration refresh failed, resuming from stored step:', (error as Error)?.message);
              setPendingRegistration(pending);
              setIsAuthenticated(false);
            }
          }
          return;
        }

        // 2. Normal case: a full session token.
        const storedToken = await SecureStore.getItemAsync(SESSION_KEY);
        if (!storedToken) return;

        try {
          const p = readAuthPayload(await refreshSession(storedToken));
          const nextToken = p.token || storedToken;

          if (p.isNewUser) {
            // Legacy: a registration token was stored under the session key.
            await SecureStore.deleteItemAsync(SESSION_KEY);
            await beginRegistration({ token: nextToken, step: p.registrationStep || 1 });
          } else {
            await persistSessionToken(nextToken);
            setIsAuthenticated(true);
            if (p.user) setUser(p.user);
            else await fetchProfile(nextToken);
          }
        } catch (error) {
          if (error instanceof ApiError && error.isAuthError) {
            handleUnauthorized(error);
          } else {
            // Offline / refresh endpoint down: use the stored token. If it turns
            // out to be a stale/registration token, fetchProfile's 403 handling
            // will clear it and route to login.
            console.log('Token refresh failed, using stored token:', (error as Error)?.message);
            setToken(storedToken);
            setIsAuthenticated(true);
            await fetchProfile(storedToken);
          }
        }
      } catch (error) {
        console.error('Error during auth bootstrap:', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (newToken?: string, nextUser?: UserProfile | null) => {
    setSessionMessage(null);
    setPendingRegistration(null);
    await SecureStore.deleteItemAsync(PENDING_KEY);
    if (newToken) {
      await persistSessionToken(newToken);
      // Need the full profile (esp. `status`) to route dashboard vs. review
      // screen, so only skip the fetch when we already have a status.
      if (nextUser && nextUser.status) {
        setUser(nextUser);
      } else {
        const result = await fetchProfile(newToken);
        // The token was rejected as a chef session (e.g. role:USER) — don't
        // flip into the authenticated app; handleUnauthorized already routed out.
        if (result === 'unauthorized') return;
      }
    }
    setIsAuthenticated(true);
  };

  const beginRegistration = async (reg: { token: string; step: number; phoneNumber?: string }) => {
    setSessionMessage(null);
    setIsAuthenticated(false);
    setUser(null);
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await persistPending(reg);
  };

  const updateRegistrationStep = async (step: number) => {
    const current =
      pendingRegistration ??
      (await (async () => {
        const raw = await SecureStore.getItemAsync(PENDING_KEY);
        return raw ? (JSON.parse(raw) as NonNullable<PendingRegistration>) : null;
      })());
    if (!current) return;
    await persistPending({ ...current, step });
  };

  const logout = async () => {
    setSessionMessage(null);
    await clearAll();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        user,
        sessionMessage,
        pendingRegistration,
        login,
        logout,
        beginRegistration,
        updateRegistrationStep,
        handleUnauthorized,
        clearSessionMessage,
        fetchProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
