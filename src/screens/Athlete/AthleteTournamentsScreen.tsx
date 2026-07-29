import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

export function AthleteTournamentsScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [torneios, setTorneios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTorneios = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('torneios')
        .select('*')
        .eq('organizador_id', user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setTorneios(data);
      }
    } catch (e) {
      console.error("Erro ao buscar torneios criados", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchTorneios();
    });
    return unsubscribe;
  }, [navigation, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTorneios();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg">
      <View className="px-6 py-4 border-b border-[#d8ccb4] dark:border-brand-border-focus">
        <Text className="text-brand-primary dark:text-brand-electric-light text-xl font-bold tracking-wider">Meus Torneios</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie os torneios que você organizou</Text>
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#3B82F6' : '#2563EB'} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
        ) : torneios.length === 0 ? (
          <View className="items-center mt-4 bg-[#e6ddca] dark:bg-brand-surface p-6 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
            <Ionicons name="trophy-outline" size={48} color="#888" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">Você ainda não criou nenhum torneio.</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('CreateTournament')}
              className="mt-6 bg-brand-primary dark:bg-brand-electric-light px-6 py-3 rounded-full"
            >
              <Text className="text-white dark:text-[#0a0a0a] font-bold">Criar Meu Primeiro Torneio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          torneios.map(torneio => (
            <TouchableOpacity 
              key={torneio.id} 
              className="bg-[#e6ddca] dark:bg-brand-surface mb-6 rounded-xl overflow-hidden border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm"
              onPress={() => navigation.navigate('TournamentManager', { torneio })}
            >
              <View className="h-32 bg-gray-200 dark:bg-gray-800 relative">
                <Image 
                  source={{ uri: torneio.capa_url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop' }} 
                  className="w-full h-full opacity-80" 
                  resizeMode="cover"
                />
                <View className="absolute top-2 left-2 bg-black/70 dark:bg-brand-border px-2 py-1 rounded-md">
                  <Text className="text-white text-[10px] font-bold uppercase">{torneio.modalidade}</Text>
                </View>
              </View>

              <View className="p-4">
                <Text className="text-gray-900 dark:text-white font-bold text-lg mb-2">{torneio.nome}</Text>
                
                <View className="flex-row items-center mb-3">
                  <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                  <Text className="text-gray-600 dark:text-gray-400 text-sm ml-1 font-semibold">
                    {torneio.data_inicio ? new Date(torneio.data_inicio + (torneio.data_inicio.includes('T') ? '' : 'T12:00:00Z')).toLocaleDateString('pt-BR') : 'Sem data'}
                  </Text>
                </View>

                <View className="flex-row justify-between mt-1 pt-3 border-t border-[#d8ccb4] dark:border-brand-border-focus">
                  <View>
                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">Inscrição</Text>
                    <Text className="text-brand-primary dark:text-[#FFD700] font-black text-base">R$ {Number(torneio.valor_inscricao).toFixed(2)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">Vagas</Text>
                    <Text className="text-gray-900 dark:text-white font-bold">{torneio.numero_max_times}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View className="h-24" />
      </ScrollView>

      {torneios.length > 0 && (
        <TouchableOpacity 
          className="absolute bottom-6 right-6 bg-brand-primary dark:bg-brand-electric-light w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() => navigation.navigate('CreateTournament')}
        >
          <Ionicons name="add" size={28} color={isDark ? "#0a0a0a" : "#fff"} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
