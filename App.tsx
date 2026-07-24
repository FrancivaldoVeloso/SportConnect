import './global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { TournamentProvider } from './src/contexts/TournamentContext';

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </TournamentProvider>
    </AuthProvider>
  );
}
