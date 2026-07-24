import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

  async function registerForPushNotificationsAsync(userId: string) {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId: 'sportconnect-mvp' })).data;
      console.log('Expo Push Token:', token);

      // Save token to Supabase
      if (token) {
        await supabase
          .from('usuarios')
          .update({ expo_push_token: token })
          .eq('id', userId);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    return token;
  }

  const signIn = async (newUser: User) => {
    setUser(newUser);
    await AsyncStorage.setItem('@user_session', JSON.stringify(newUser));
    // Registra push token após o login
    registerForPushNotificationsAsync(newUser.id);
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
