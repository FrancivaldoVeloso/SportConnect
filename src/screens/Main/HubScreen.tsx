import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';

export function HubScreen({ navigation }: any) {
  const { user } = React.useContext(AuthContext);
  const [torneios, setTorneios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTorneios();
  }, []);

  const fetchTorneios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('torneios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTorneios(data || []);
    } catch (error) {
      console.error("Erro ao buscar torneios:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
        
        <View className="px-6 pt-6 pb-4 flex-row justify-between items-center">
          <View className="flex-1 pr-4">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Encontre Sua Arena</Text>
            <Text className="text-gray-500 dark:text-gray-400 text-base">
              Participe de competições de elite e acompanhe sua ascensão.
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('CreateTournament')}
            className="bg-brand-primary dark:bg-brand-electric-light px-3 py-3 rounded-full flex-row items-center shadow-md justify-center"
          >
            <Ionicons name="add" size={24} color="#fff" className="dark:text-[#0a0a0a]" />
          </TouchableOpacity>
        </View>

        {/* Chips de Categorias */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 mb-6">
          <TouchableOpacity className="bg-brand-primary dark:bg-brand-electric-light px-4 py-2 rounded-full mr-3">
            <Text className="text-white dark:text-[#0a0a0a] font-bold">Todos os Esportes</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#e6ddca] dark:bg-brand-border border border-[#d8ccb4] dark:border-transparent px-4 py-2 rounded-full mr-3 shadow-sm">
            <Text className="text-gray-600 dark:text-gray-300 font-semibold">Futebol</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#e6ddca] dark:bg-brand-border border border-[#d8ccb4] dark:border-transparent px-4 py-2 rounded-full mr-6 shadow-sm">
            <Text className="text-gray-600 dark:text-gray-300 font-semibold">Basquete</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Filtros */}
        <View className="px-6 mb-8 space-y-3">
          <View className="flex-row items-center bg-[#e6ddca] dark:bg-brand-surface rounded-lg px-4 py-3 border border-[#d8ccb4] dark:border-brand-border-focus mb-3 shadow-sm">
            <Ionicons name="location-outline" size={20} color="#888" className="mr-3" />
            <TextInput 
              placeholder="Localização" 
              placeholderTextColor="#888" 
              className="flex-1 text-gray-900 dark:text-white ml-2"
            />
          </View>
        </View>

        {/* Lista de Torneios */}
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
        ) : torneios.length === 0 ? (
          <View className="items-center mt-10">
            <Ionicons name="sad-outline" size={48} color="#888" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4">Nenhum torneio encontrado.</Text>
          </View>
        ) : (
          torneios.map((torneio) => {
            const dataFormatada = torneio.data_inicio ? new Date(torneio.data_inicio).toLocaleDateString('pt-BR') : 'Data Indefinida';
            const horaFormatada = torneio.hora_inicio || 'Horário Indefinido';
            return (
              <TouchableOpacity 
                key={torneio.id} 
                onPress={() => navigation.navigate('AthleteTournamentDetails', { torneio })}
                className="mx-6 bg-[#e6ddca] dark:bg-brand-surface rounded-xl overflow-hidden border border-[#d8ccb4] dark:border-brand-border-focus mb-6 shadow-sm"
              >
                <View className="h-40 bg-gray-200 dark:bg-gray-800 relative">
                  <Image 
                    source={{ uri: torneio.capa_url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop' }} 
                    className="w-full h-full opacity-80" 
                  />
                  <View className="absolute top-3 left-3 flex-row space-x-2">
                    <View className="bg-black/70 dark:bg-brand-border px-3 py-1 rounded-full">
                      <Text className="text-white text-xs font-bold uppercase">{torneio.modalidade}</Text>
                    </View>
                    {user && torneio.organizador_id === user.id && (
                      <View className="bg-green-600 px-3 py-1 rounded-full ml-2">
                        <Text className="text-white text-xs font-bold uppercase">Meu Torneio</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="p-5">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">{torneio.nome}</Text>
                  
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs font-semibold ml-2">{dataFormatada} às {horaFormatada}</Text>
                  </View>
                  
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="location-outline" size={14} color="#16A34A" />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs font-semibold ml-2">{torneio.local}</Text>
                  </View>
                  
                  <View className="flex-row justify-between bg-[#f2ece0] dark:bg-brand-bg p-3 rounded-lg border border-[#d8ccb4] dark:border-brand-border-focus">
                    <View>
                      <Text className="text-gray-500 text-[10px] mb-1 font-bold">VALOR INSCRIÇÃO</Text>
                      <Text className="text-brand-primary dark:text-[#FFD700] font-bold text-lg">R$ {torneio.valor_inscricao}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-gray-500 text-[10px] mb-1 font-bold">VAGAS TOTAIS</Text>
                      <Text className="text-gray-900 dark:text-white font-bold text-sm mt-1">{torneio.numero_max_times}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
