import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';
import { DashboardScreen } from '../screens/Organizer/DashboardScreen';
import { InscriptionsScreen } from '../screens/Organizer/InscriptionsScreen';
import { TournamentManagerScreen } from '../screens/Organizer/TournamentManagerScreen';
import { EditTournamentScreen } from '../screens/Organizer/EditTournamentScreen';
import { HomeScreen } from '../screens/Athlete/HomeScreen';

import { HubScreen } from '../screens/Main/HubScreen';
import { ProfileScreen } from '../screens/Athlete/ProfileScreen';
import { TeamRegistrationScreen } from '../screens/Athlete/TeamRegistrationScreen';
import { PaymentScreen } from '../screens/Athlete/PaymentScreen';
import { BracketScreen } from '../screens/Athlete/BracketScreen';
import { RankingScreen } from '../screens/Athlete/RankingScreen';
import { CourtReservationScreen } from '../screens/Athlete/CourtReservationScreen';
import { AthleteTournamentsScreen } from '../screens/Athlete/AthleteTournamentsScreen';
import { CreateTournamentScreen } from '../screens/Organizer/CreateTournamentScreen';
import { AthleteTournamentDetailsScreen } from '../screens/Athlete/AthleteTournamentDetailsScreen';
import { supabase } from '../services/supabase';
import { AuthContext } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function OrganizerTabs() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <Tab.Navigator screenOptions={{ 
      headerShown: false,
      tabBarStyle: { 
        backgroundColor: isDark ? '#1A1A1A' : '#ffffff', 
        borderTopColor: isDark ? '#2A2A2A' : '#E5E7EB', 
        height: 60, 
        paddingBottom: 10, 
        paddingTop: 5 
      },
      tabBarActiveTintColor: isDark ? '#005BBB' : '#005BBB', 
      tabBarInactiveTintColor: isDark ? '#888' : '#9CA3AF',
    }}>
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Inscrições" 
        component={InscriptionsScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="documents" size={size} color={color} /> }}
      />

      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

function AthleteTabs() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tab.Navigator screenOptions={{ 
      headerShown: false,
      tabBarStyle: { 
        backgroundColor: isDark ? '#1A1A1A' : '#ffffff', 
        borderTopColor: isDark ? '#2A2A2A' : '#E5E7EB', 
        height: 60, 
        paddingBottom: 10, 
        paddingTop: 5 
      },
      tabBarActiveTintColor: isDark ? '#FFD700' : '#005BBB', 
      tabBarInactiveTintColor: isDark ? '#888' : '#9CA3AF',
    }}>
      <Tab.Screen 
        name="Feed" 
        component={HubScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Meus Torneios" 
        component={AthleteTournamentsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Ranking" 
        component={RankingScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="podium" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Quadras" 
        component={CourtReservationScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="tennisball" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading } = React.useContext(AuthContext);
  const { setColorScheme } = useColorScheme();

  React.useEffect(() => {
    setColorScheme('system');
  }, []);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen 
              name={user.tipo_perfil === 'organizador' ? "OrganizerApp" : "AthleteApp"} 
              component={user.tipo_perfil === 'organizador' ? OrganizerTabs : AthleteTabs} 
            />
            <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
            <Stack.Screen name="EditTournament" component={EditTournamentScreen} />
            <Stack.Screen name="TournamentManager" component={TournamentManagerScreen} />
            <Stack.Screen name="TeamRegistration" component={TeamRegistrationScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="Bracket" component={BracketScreen} />
            <Stack.Screen name="AthleteTournamentDetails" component={AthleteTournamentDetailsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
