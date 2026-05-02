import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export type SocialEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  end_date: string;
  location: string;
  price: number;
  slots_total: number;
  social_balance: boolean;
  image_url: string;
  creator_id: string;
};

export type DashboardStats = {
  total_events: number;
  upcoming_events: number;
  total_participants: number;
  active_events: number;
};

type SocialContextType = {
  events: SocialEvent[];
  stats: DashboardStats | null;
  isLoading: boolean;
  fetchEvents: (chefId?: string, date?: string) => Promise<void>;
  fetchEventDetails: (id: string) => Promise<SocialEvent | null>;
  fetchStats: () => Promise<void>;
  createEvent: (eventData: Partial<SocialEvent>) => Promise<boolean>;
  joinEvent: (eventId: string, gender: 'male' | 'female') => Promise<boolean>;
};

const SocialContext = createContext<SocialContextType>({
  events: [],
  stats: null,
  isLoading: false,
  fetchEvents: async () => {},
  fetchEventDetails: async () => null,
  fetchStats: async () => {},
  createEvent: async () => false,
  joinEvent: async () => false,
});

export const SocialProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${process.env.EXPO_PUBLIC_API_URL}${endpoint}`;
    console.log(`API Request: ${options.method || 'GET'}`, url);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`API Error (${endpoint}):`, response.status, errorText);
      throw new Error(errorText);
    }

    return response.json();
  }, [token]);

  const fetchEvents = async (chefId?: string, date?: string) => {
    setIsLoading(true);
    try {
      let query = '';
      if (chefId || date) {
        const params = new URLSearchParams();
        if (chefId) params.append('chefId', chefId);
        if (date) params.append('date', date);
        query = `?${params.toString()}`;
      }
      const result = await apiFetch(`social${query}`);
      console.log('GET SOCIAL API Response:', JSON.stringify(result, null, 2));
      
      let socialEvents: SocialEvent[] = [];
      if (Array.isArray(result)) {
        socialEvents = result;
      } else if (result.status === 'success') {
        socialEvents = result.data || [];
      } else if (result.data && Array.isArray(result.data)) {
        socialEvents = result.data;
      }

      console.log(`Fetched ${socialEvents.length} social events`);
      setEvents(socialEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventDetails = async (id: string) => {
    try {
      const result = await apiFetch(`social/${id}`);
      if (result.status === 'success') {
        return result.data;
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
    return null;
  };

  const fetchStats = async () => {
    try {
      const result = await apiFetch('social/dashboard');
      if (result.status === 'success') {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching social stats:', error);
    }
  };

  const createEvent = async (eventData: Partial<SocialEvent>) => {
    try {
      const result = await apiFetch('social', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      console.log('POST SOCIAL API Response:', JSON.stringify(result, null, 2));
      if (result.status === 'success') {
        await fetchEvents();
        return true;
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
    return false;
  };

  const joinEvent = async (eventId: string, gender: 'male' | 'female') => {
    try {
      // Assuming endpoint for joining exists based on requirements
      const result = await apiFetch(`social/${eventId}/join`, {
        method: 'POST',
        body: JSON.stringify({ gender }),
      });
      if (result.status === 'success') {
        await fetchEvents();
        return true;
      }
    } catch (error) {
      console.error('Error joining event:', error);
    }
    return false;
  };

  return (
    <SocialContext.Provider
      value={{
        events,
        stats,
        isLoading,
        fetchEvents,
        fetchEventDetails,
        fetchStats,
        createEvent,
        joinEvent,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => useContext(SocialContext);
