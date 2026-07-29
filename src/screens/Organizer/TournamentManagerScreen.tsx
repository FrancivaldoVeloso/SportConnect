import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TournamentContext } from '../../contexts/TournamentContext';
import { TeamRegistration } from '../../components/domino/TeamRegistration';
import { TournamentBracket } from '../../components/domino/TournamentBracket';
import { RefereePanel } from '../../components/domino/RefereePanel';
import { useColorScheme } from 'nativewind';

import { VoleiEngine } from '../../components/volei/VoleiEngine';
import { PingPongEngine } from '../../components/pingpong/PingPongEngine';

export function TournamentManagerScreen({ route, navigation }: any) {
  const { torneio } = route.params;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'teams' | 'bracket' | 'referee'>('teams');
  
  // Domino Context
  const dominoContext = useContext(TournamentContext);

  if (!torneio) {
    return (
      <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg justify-center items-center">
        <Text className="text-red-500">Torneio não encontrado.</Text>
      </SafeAreaView>
    );
  }

  const renderDominoEngine = () => {
    if (!dominoContext) return null;
    const {
      teams, matches, isAuthLoaded, handleAddTeam, handleDeleteTeam, handleGenerateBracket,
      handleUpdateScore, handleSubtractPoint, handleAddRound, handleStartMatch, handleFinishMatch
    } = dominoContext;

    if (!isAuthLoaded) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-500 mt-4">Carregando motor de dominó...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1">
        {/* Tabs internas do motor */}
        <View className="flex-row border-b border-[#d8ccb4] dark:border-brand-border bg-[#e6ddca] dark:bg-brand-surface">
          <TouchableOpacity 
            className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'teams' ? 'border-brand-primary dark:border-brand-electric-light' : 'border-transparent'}`}
            onPress={() => setActiveTab('teams')}
          >
            <Ionicons name="people" size={20} color={activeTab === 'teams' ? (isDark ? '#3B82F6' : '#2563EB') : '#9CA3AF'} />
            <Text className={`text-xs mt-1 font-bold ${activeTab === 'teams' ? 'text-brand-primary dark:text-brand-electric-light' : 'text-gray-500'}`}>Participantes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'bracket' ? 'border-[#F59E0B]' : 'border-transparent'}`}
            onPress={() => setActiveTab('bracket')}
          >
            <Ionicons name="git-network" size={20} color={activeTab === 'bracket' ? '#F59E0B' : '#9CA3AF'} />
            <Text className={`text-xs mt-1 font-bold ${activeTab === 'bracket' ? 'text-[#F59E0B]' : 'text-gray-500'}`}>Chaves</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'referee' ? 'border-[#EA580C]' : 'border-transparent'}`}
            onPress={() => setActiveTab('referee')}
          >
            <Ionicons name="clipboard" size={20} color={activeTab === 'referee' ? '#EA580C' : '#9CA3AF'} />
            <Text className={`text-xs mt-1 font-bold ${activeTab === 'referee' ? 'text-[#EA580C]' : 'text-gray-500'}`}>Súmula</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          {activeTab === 'teams' && (
            <TeamRegistration 
              teams={teams}
              onAddTeam={handleAddTeam}
              onDeleteTeam={handleDeleteTeam}
              onImportTeams={dominoContext.handleImportTeams}
              onGenerateBracket={() => {
                handleGenerateBracket();
                setActiveTab('bracket');
              }}
            />
          )}
          
          {activeTab === 'bracket' && (
            <TournamentBracket matches={matches} />
          )}

          {activeTab === 'referee' && (
            <RefereePanel 
              matches={matches}
              onUpdateScore={handleUpdateScore}
              onSubtractPoint={handleSubtractPoint}
              onAddRound={handleAddRound}
              onStartMatch={handleStartMatch}
              onFinishMatch={handleFinishMatch}
            />
          )}
        </View>
      </View>
    );
  };

  const renderEngine = () => {
    switch (torneio.modalidade) {
      case 'Vôlei': return <VoleiEngine torneio={torneio} />;
      case 'Ping Pong': return <PingPongEngine torneio={torneio} />;
      default: return renderDominoEngine();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg">
      {/* Header Fixo */}
      <View className="flex-row items-center px-6 py-4 border-b border-[#d8ccb4] dark:border-brand-border bg-[#e6ddca] dark:bg-brand-surface">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-gray-900 dark:text-white text-lg font-bold" numberOfLines={1}>{torneio.nome}</Text>
          <Text className="text-brand-primary dark:text-brand-electric-light text-xs font-bold uppercase">{torneio.modalidade}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('EditTournament', { torneio })}
          className="bg-brand-primary/10 dark:bg-brand-electric-light/10 p-2 rounded-full"
        >
          <Ionicons name="pencil" size={20} color={isDark ? '#3B82F6' : '#2563EB'} />
        </TouchableOpacity>
      </View>

      {/* Conteúdo Dinâmico Baseado na Modalidade */}
      {renderEngine()}
    </SafeAreaView>
  );
}
