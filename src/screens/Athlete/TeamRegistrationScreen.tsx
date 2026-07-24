import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';

export function TeamRegistrationScreen({ route, navigation }: any) {
  const { torneioId } = route.params;
  const { user } = useContext(AuthContext);
  
  const [nomeTime, setNomeTime] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProximo = async () => {
    if (!nomeTime || !categoria) {
      Alert.alert('Erro', 'Preencha todos os campos do time.');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado.');
      return;
    }

    try {
      setLoading(true);
      
      // Criar o time no banco
      const { data: time, error: timeError } = await supabase
        .from('times')
        .insert([
          { capitao_id: user.id, nome: nomeTime, categoria: categoria }
        ])
        .select()
        .single();

      if (timeError) throw timeError;

      // Criar a inscrição inicial pendente (sem comprovante ainda)
      const { data: inscricao, error: inscError } = await supabase
        .from('inscricoes')
        .insert([
          { time_id: time.id, torneio_id: torneioId, status: 'pendente' }
        ])
        .select()
        .single();

      if (inscError) throw inscError;

      // Navegar para a tela de Pagamento
      navigation.navigate('Payment', { inscricaoId: inscricao.id, torneioId: torneioId });

    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível registrar o time: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]">
      {/* Header Fixo */}
      <View className="flex-row items-center px-6 py-4 border-b border-[#1c1c1c]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#888" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Inscrição de Equipe</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="bg-[#1c1c1c] rounded-xl border border-[#262626] p-6 mb-6">
          <Text className="text-brand-electric-light font-bold text-sm mb-4 uppercase tracking-wider">Dados do Time</Text>
          
          <View className="mb-4">
            <Text className="text-gray-400 mb-2 font-semibold">Nome da Equipe</Text>
            <View className="bg-[#0a0a0a] rounded-lg border border-[#333] px-4 py-3">
              <TextInput
                placeholder="Ex: L.A. Strikers FC"
                placeholderTextColor="#666"
                className="text-white text-base"
                value={nomeTime}
                onChangeText={setNomeTime}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-400 mb-2 font-semibold">Categoria / Divisão</Text>
            <View className="bg-[#0a0a0a] rounded-lg border border-[#333] px-4 py-3">
              <TextInput
                placeholder="Ex: Amador, Profissional, Sub-20"
                placeholderTextColor="#666"
                className="text-white text-base"
                value={categoria}
                onChangeText={setCategoria}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleProximo}
          disabled={loading}
          className="bg-[#FFD700] rounded-xl py-4 items-center flex-row justify-center"
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <>
              <Text className="text-[#0a0a0a] font-black text-lg mr-2">AVANÇAR PARA PAGAMENTO</Text>
              <Ionicons name="arrow-forward" size={20} color="#0a0a0a" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
