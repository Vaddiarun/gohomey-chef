import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'userToken';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
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

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: UserProfile | null;
  login: (token?: string) => void;
  logout: () => void;
  fetchProfile: (authToken?: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  fetchProfile: async () => {},
  updateProfile: async () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}chefs/profile`;
      console.log('API Request: GET', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error (Profile):', response.status, errorText);
        return;
      }

      const result = await response.json();
      console.log('API Response (Profile):', JSON.stringify(result, null, 2));

      if (result.status === 'success') {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
    // Load token from secure storage on mount
    const loadToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
          setIsAuthenticated(true);
          await fetchProfile(storedToken);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const login = async (newToken?: string) => {
    if (newToken) {
      setToken(newToken);
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      await fetchProfile(newToken);
    }
    setIsAuthenticated(true);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        user,
        login,
        logout,
        fetchProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
