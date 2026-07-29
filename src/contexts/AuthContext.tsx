import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { supabase } from '../services/supabase';

export type User = {
  id: string;
  nome: string;
  email: string;
  tipo_perfil: string;
  modalidade_principal?: string;
  foto_perfil?: string;
  expo_push_token?: string;
};

type AuthContextType = {
  user: User | null;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: async () => {},
  signOut: async () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const storedUser = await AsyncStorage.getItem('@user_session');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Busca os dados mais recentes do Supabase (para atualizar tipo_perfil, foto, etc)
          const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', parsedUser.id)
            .single();

          if (!error && data) {
            setUser(data);
            await AsyncStorage.setItem('@user_session', JSON.stringify(data));
          } else {
            setUser(parsedUser); // fallback caso esteja sem internet
          }
        }
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const signIn = async (newUser: User) => {
    setUser(newUser);
    await AsyncStorage.setItem('@user_session', JSON.stringify(newUser));
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@user_session');
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
