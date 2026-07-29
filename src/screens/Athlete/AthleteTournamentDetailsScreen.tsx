import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';

export function AthleteTournamentDetailsScreen({ route, navigation }: any) {
  const { torneio } = route.params;
  const { user } = React.useContext(AuthContext);
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jaInscrito, setJaInscrito] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  
  useEffect(() => {
    if (user && torneio.organizador_id === user.id) {
      setIsOrganizer(true);
    }
    fetchInscritos();
  }, [user]);

  const fetchInscritos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inscricoes')
        .select(`
          id,
          status,
          times (
            id,
            nome,
            categoria,
            capitao_id
          )
        `)
        .eq('torneio_id', torneio.id);
        
      if (!error && data) {
        // Filter approved for the list
        const approved = data.filter(insc => insc.status === 'aprovado' && insc.times != null);
        setInscritos(approved);

        // Check if user is already subscribed (any status)
        if (user) {
          const userSubscription = data.find(insc => (insc.times as any)?.capitao_id === user.id);
          if (userSubscription) {
            setJaInscrito(true);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao buscar inscritos", err);
    } finally {
      setLoading(false);
    }
  };

  const defaultImage = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop';
  const dataFormatada = torneio.data_inicio ? new Date(torneio.data_inicio).toLocaleDateString('pt-BR') : 'Data não definida';
  const horaFormatada = torneio.hora_inicio ? torneio.hora_inicio : 'Horário a definir';

  const isIndividual = torneio.modalidade === 'Ping Pong' || torneio.modalidade === 'Tênis';
  const labelInscricao = isIndividual ? 'Inscrever-se' : 'Inscrever Equipe';
  const labelVagas = isIndividual ? 'Vagas' : 'Times';
  const labelConfirmados = isIndividual ? 'Atletas Confirmados' : 'Equipes Confirmadas';
  const labelNenhumConfirmado = isIndividual ? 'Nenhum atleta confirmado ainda.' : 'Nenhuma equipe confirmada ainda.';

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg" edges={['top']}>
      <ScrollView className="flex-1" bounces={false}>
        
        {/* Capa e Header */}
        <View className="h-72 bg-gray-300 w-full" style={{ minHeight: 280 }}>
          <Image 
            source={{ uri: torneio.capa_url || defaultImage }} 
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/50" />
          
          <View className="flex-1 justify-between p-5 pt-8">
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="bg-black/50 p-2 rounded-full self-start"
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View className="mb-6">
              <View className="bg-brand-primary dark:bg-brand-electric-light px-3 py-1 rounded-full self-start mb-2">
                <Text className="text-white dark:text-[#0a0a0a] text-xs font-bold uppercase">{torneio.modalidade}</Text>
              </View>
              <Text className="text-white text-3xl font-black shadow-sm" numberOfLines={2}>{torneio.nome}</Text>
            </View>
          </View>
        </View>

        {/* Informações Principais */}
        <View className="p-6 bg-[#e6ddca] dark:bg-brand-surface mx-4 -mt-6 rounded-2xl shadow-sm border border-[#d8ccb4] dark:border-brand-border-focus z-10">
          
          <View className="flex-row justify-between mb-4 pb-4 border-b border-[#d8ccb4] dark:border-brand-border-focus">
            <View className="flex-row items-center">
              <View className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-3">
                <Ionicons name="calendar-outline" size={24} color="#2563EB" />
              </View>
              <View>
                <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold">DATA</Text>
                <Text className="text-gray-900 dark:text-white font-bold">{dataFormatada}</Text>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <View className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-3">
                <Ionicons name="time-outline" size={24} color="#D97706" />
              </View>
              <View>
                <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold">HORA</Text>
                <Text className="text-gray-900 dark:text-white font-bold">{horaFormatada}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center mb-4">
            <View className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-3">
              <Ionicons name="location-outline" size={24} color="#16A34A" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold">LOCAL</Text>
              <Text className="text-gray-900 dark:text-white font-bold">{torneio.local}</Text>
            </View>
          </View>

          <View className="bg-[#f2ece0] dark:bg-brand-bg rounded-xl p-4 flex-row justify-between items-center border border-[#d8ccb4] dark:border-brand-border-focus mb-2">
            <View>
              <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">INSCRIÇÃO</Text>
              <Text className="text-brand-primary dark:text-[#FFD700] text-xl font-black">
                R$ {Number(torneio.valor_inscricao).toFixed(2)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">VAGAS</Text>
              <Text className="text-gray-900 dark:text-white font-bold text-lg">{torneio.numero_max_times} {labelVagas}</Text>
            </View>
          </View>
        </View>

        {/* Descrição */}
        {torneio.descricao ? (
          <View className="px-6 mt-6">
            <Text className="text-gray-900 dark:text-white text-lg font-bold mb-2">Sobre o Torneio</Text>
            <Text className="text-gray-600 dark:text-gray-400 leading-6">{torneio.descricao}</Text>
          </View>
        ) : null}

        {/* Botão de Ação */}
        <View className="px-6 mt-6 mb-6">
          {isOrganizer ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate('TournamentManager', { torneio })}
              className="bg-green-600 dark:bg-green-700 py-4 rounded-xl items-center shadow-md flex-row justify-center"
            >
              <Ionicons name="settings" size={20} color="#fff" className="mr-2" />
              <Text className="text-white font-bold text-lg">Gerenciar Torneio</Text>
            </TouchableOpacity>
          ) : jaInscrito ? (
            <View className="bg-gray-400 dark:bg-gray-700 py-4 rounded-xl items-center shadow-md flex-row justify-center">
              <Ionicons name="checkmark-circle" size={20} color="#fff" className="mr-2" />
              <Text className="text-white font-bold text-lg">Você já está inscrito</Text>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={() => navigation.navigate('TeamRegistration', { torneioId: torneio.id, isIndividual })}
              className="bg-brand-primary dark:bg-brand-electric-light py-4 rounded-xl items-center shadow-md flex-row justify-center"
            >
              <Ionicons name="shield-checkmark" size={20} color="#fff" className="mr-2 dark:text-[#0a0a0a]" />
              <Text className="text-white dark:text-[#0a0a0a] font-bold text-lg">{labelInscricao}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de Inscritos */}
        <View className="px-6 mb-12">
          <Text className="text-gray-900 dark:text-white text-lg font-bold mb-4">{labelConfirmados}</Text>
          
          {loading ? (
            <ActivityIndicator color="#2563EB" />
          ) : inscritos.length > 0 ? (
            inscritos.map((insc, index) => {
              const time = insc.times;
              if (!time) return null;
              return (
                <View key={insc.id || index} className="flex-row items-center bg-[#e6ddca] dark:bg-brand-surface p-4 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus mb-3">
                  <View className="w-10 h-10 bg-gray-200 dark:bg-brand-border rounded-full items-center justify-center mr-4">
                    <Ionicons name="people" size={20} color="#888" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-base">{time.nome}</Text>
                    {time.categoria ? (
                      <Text className="text-gray-500 dark:text-gray-400 text-xs">{time.categoria}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                </View>
              );
            })
          ) : (
            <View className="bg-[#e6ddca] dark:bg-brand-surface p-6 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus items-center justify-center">
              <Ionicons name="people-outline" size={40} color="#888" />
              <Text className="text-gray-500 dark:text-gray-400 mt-2 font-medium">{labelNenhumConfirmado}</Text>
            </View>
          )}
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}
