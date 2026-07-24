import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { Card } from '../../components/Card';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

export function DashboardScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [torneios, setTorneios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Metricas
  const [arrecadacao, setArrecadacao] = useState(0);
  const [vagasPreenchidas, setVagasPreenchidas] = useState(0);
  const [vagasTotais, setVagasTotais] = useState(0);
  const [pendencias, setPendencias] = useState(0);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Busca os torneios do organizador e as inscricoes relacionadas
      const { data, error } = await supabase
        .from('torneios')
        .select(`
          *,
          inscricoes (*)
        `)
        .eq('organizador_id', user.id)
        .order('data_inicio', { ascending: false });
        
      if (!error && data) {
        setTorneios(data);
        
        // Calcular Metricas
        let calcArrecadacao = 0;
        let calcVagasPreenchidas = 0;
        let calcVagasTotais = 0;
        let calcPendencias = 0;

        data.forEach(torneio => {
          calcVagasTotais += torneio.numero_max_times || 0;
          
          if (torneio.inscricoes && torneio.inscricoes.length > 0) {
            torneio.inscricoes.forEach((insc: any) => {
              if (insc.status === 'aprovado') {
                calcArrecadacao += Number(torneio.valor_inscricao);
                calcVagasPreenchidas += 1;
              } else if (insc.status === 'pendente') {
                calcPendencias += 1;
              }
            });
          }
        });

        setArrecadacao(calcArrecadacao);
        setVagasPreenchidas(calcVagasPreenchidas);
        setVagasTotais(calcVagasTotais);
        setPendencias(calcPendencias);
      }
    } catch (e) {
      console.error("Erro ao buscar métricas", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteTournament = (id: string, nome: string) => {
    Alert.alert(
      "Excluir Torneio",
      `Tem certeza que deseja excluir "${nome}"? Isso apagará todas as inscrições e partidas relacionadas.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from('torneios').delete().eq('id', id);
            if (error) {
              Alert.alert("Erro", "Não foi possível excluir o torneio.");
            } else {
              fetchDashboardData();
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchDashboardData();
    });
    return unsubscribe;
  }, [navigation, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg">
      {/* Header Fixo */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#d8ccb4] dark:border-brand-border">
        <View className="flex-row items-center">
          <Image source={require('../../../assets/logoSport.png')} style={{ width: 32, height: 32, marginRight: 8 }} resizeMode="contain" />
          <Text className="text-brand-primary dark:text-brand-electric-light text-xl font-bold tracking-wider">Dashboard</Text>
        </View>
        <Ionicons name="notifications-outline" size={24} color={isDark ? '#fff' : '#000'} />
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#3B82F6' : '#2563EB'} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
        ) : (
          <>
            {/* MINI-DASHBOARD (MÉTRICAS) */}
            <View className="mb-6 space-y-4">
              
              {/* Card de Pendências */}
              <TouchableOpacity 
                onPress={() => navigation.navigate('Inscrições')}
                className="bg-amber-100 dark:bg-amber-900/40 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center">
                  <View className="bg-amber-500 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <Ionicons name="document-text" size={20} color="#fff" />
                  </View>
                  <View>
                    <Text className="text-amber-800 dark:text-amber-400 font-bold text-lg">
                      {pendencias} {pendencias === 1 ? 'Pendência' : 'Pendências'}
                    </Text>
                    <Text className="text-amber-700 dark:text-amber-500 text-xs">Inscrições aguardando validação</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? '#F59E0B' : '#B45309'} />
              </TouchableOpacity>

              <View className="flex-row space-x-4">
                {/* Card de Arrecadação */}
                <View className="flex-1 bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-4 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="cash-outline" size={18} color={isDark ? '#3B82F6' : '#2563EB'} />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold ml-1 tracking-wider">Arrecadação</Text>
                  </View>
                  <Text className="text-gray-900 dark:text-white text-2xl font-black">
                    R$ {arrecadacao.toFixed(2)}
                  </Text>
                  <Text className="text-gray-400 text-[10px] mt-1">Ref. inscrições aprovadas</Text>
                </View>

                {/* Card de Ocupação */}
                <View className="flex-1 bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-4 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="people-outline" size={18} color={isDark ? '#3B82F6' : '#2563EB'} />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold ml-1 tracking-wider">Ocupação</Text>
                  </View>
                  <Text className="text-gray-900 dark:text-white text-2xl font-black">
                    {vagasPreenchidas} <Text className="text-gray-400 text-lg">/ {vagasTotais}</Text>
                  </Text>
                  <Text className="text-gray-400 text-[10px] mt-1">Times confirmados</Text>
                </View>
              </View>

            </View>

            <Text className="text-gray-900 dark:text-white text-xl font-bold mb-4 ml-1">Meus Torneios</Text>
            
            {torneios.length === 0 ? (
              <View className="items-center mt-4 bg-[#e6ddca] dark:bg-brand-surface p-6 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
                <Ionicons name="trophy-outline" size={48} color="#888" />
                <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">Você ainda não criou nenhum torneio.</Text>
              </View>
            ) : (
              torneios.map(torneio => (
                <View key={torneio.id} className="bg-[#e6ddca] dark:bg-brand-surface mb-4 rounded-xl p-5 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg flex-1">{torneio.nome}</Text>
                    <View className="bg-gray-100 dark:bg-brand-border px-2 py-1 rounded-md ml-2">
                      <Text className="text-brand-primary dark:text-brand-electric-light text-xs font-bold uppercase">{torneio.modalidade}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="calendar-outline" size={14} color="#888" />
                    <Text className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                      {new Date(torneio.data_inicio).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mt-2 pt-4 border-t border-gray-100 dark:border-brand-border-focus">
                    <View>
                      <Text className="text-gray-400 text-xs uppercase">Valor</Text>
                      <Text className="text-green-600 dark:text-[#4ADE80] font-bold">R$ {torneio.valor_inscricao}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-gray-400 text-xs uppercase">Vagas</Text>
                      <Text className="text-gray-800 dark:text-white font-bold">Max {torneio.numero_max_times}</Text>
                    </View>
                  </View>

                  <View className="flex-row justify-end mt-4 pt-4 border-t border-gray-100 dark:border-brand-border-focus space-x-2">
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('TournamentManager', { torneio })}
                      className="flex-row items-center bg-brand-primary dark:bg-brand-electric-light px-3 py-1.5 rounded-lg"
                    >
                      <Ionicons name="settings" size={14} color={isDark ? "#0a0a0a" : "#fff"} />
                      <Text className="ml-1 text-white dark:text-[#0a0a0a] text-xs font-bold uppercase">Gerenciar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('EditTournament', { torneio })}
                      className="flex-row items-center bg-gray-100 dark:bg-[#333] px-3 py-1.5 rounded-lg"
                    >
                      <Ionicons name="pencil" size={14} color={isDark ? "#3B82F6" : "#2563EB"} />
                      <Text className="ml-1 text-brand-primary dark:text-brand-electric-light text-xs font-bold uppercase">Editar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => handleDeleteTournament(torneio.id, torneio.nome)}
                      className="flex-row items-center bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg"
                    >
                      <Ionicons name="trash" size={14} color="#EF4444" />
                      <Text className="ml-1 text-red-500 text-xs font-bold uppercase">Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            
            {/* Espaço para o botão flutuante não sobrepor nada */}
            <View className="h-24" />
          </>
        )}
      </ScrollView>

      {/* Botão Flutuante */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 bg-brand-primary dark:bg-brand-electric-light w-16 h-16 rounded-full items-center justify-center shadow-[0_4px_10px_rgba(0,91,187,0.4)]"
        onPress={() => navigation.navigate('CreateTournament')}
      >
        <Ionicons name="add" size={32} color={isDark ? "#0a0a0a" : "#fff"} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
