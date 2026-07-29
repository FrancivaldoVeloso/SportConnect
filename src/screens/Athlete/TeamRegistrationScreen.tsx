import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';

export function TeamRegistrationScreen({ route, navigation }: any) {
  const { torneioId, isIndividual, modalidade, valorInscricao } = route.params;
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [nomeTime, setNomeTime] = useState(modalidade === 'SOLO' && user ? user.nome : '');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [jogadoresExtras, setJogadoresExtras] = useState<string[]>([]);
  const [novoJogador, setNovoJogador] = useState('');
  const [loading, setLoading] = useState(false);

  const adicionarJogador = () => {
    if (novoJogador.trim() === '') return;
    setJogadoresExtras([...jogadoresExtras, novoJogador.trim()]);
    setNovoJogador('');
  };

  const removerJogador = (index: number) => {
    const novos = [...jogadoresExtras];
    novos.splice(index, 1);
    setJogadoresExtras(novos);
  };

  const handleProximo = async () => {
    if (!nomeTime) {
      Alert.alert('Erro', 'Preencha o nome do participante ou equipe.');
      return;
    }

    if (modalidade === 'DUPLA' && (!player1 || !player2)) {
      Alert.alert('Erro', 'Preencha o nome dos dois jogadores da dupla.');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado.');
      return;
    }

    try {
      setLoading(true);

      if (isIndividual) {
        // Verificar se já existe inscrição deste usuário neste torneio
        const { data: existingInsc, error: checkError } = await supabase
          .from('inscricoes')
          .select('id, times!inner(capitao_id)')
          .eq('torneio_id', torneioId)
          .eq('times.capitao_id', user.id);
          
        if (existingInsc && existingInsc.length > 0) {
          Alert.alert('Aviso', 'Você já está inscrito neste torneio individual! Apenas uma inscrição por login é permitida.');
          setLoading(false);
          return;
        }
      }
      
      // Criar o time no banco
      const { data: time, error: timeError } = await supabase
        .from('times')
        .insert([
          { 
            capitao_id: user.id, 
            nome: nomeTime, 
            categoria: 'Geral',
            player1: modalidade === 'DUPLA' ? player1 : null,
            player2: modalidade === 'DUPLA' ? player2 : null,
            jogadores_extras: modalidade === 'TIME' ? jogadoresExtras : []
          }
        ])
        .select()
        .single();

      if (timeError) throw timeError;

      // Criar a inscrição
      const { data: inscricao, error: inscError } = await supabase
        .from('inscricoes')
        .insert([
          { time_id: time.id, torneio_id: torneioId, status: valorInscricao === 0 ? 'aprovado' : 'pendente' }
        ])
        .select()
        .single();

      if (inscError) throw inscError;

      if (valorInscricao === 0) {
        Alert.alert('Sucesso!', 'Sua inscrição foi confirmada com sucesso.', [
          { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'AthleteApp' }] }) }
        ]);
      } else {
        // Navegar para a tela de Pagamento
        navigation.navigate('Payment', { inscricaoId: inscricao.id, torneioId: torneioId });
      }

    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível registrar o time: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#0a0a0a]">
      {/* Header Fixo */}
      <View className="flex-row items-center px-6 py-4 border-b border-[#1c1c1c]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#888" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {modalidade === 'SOLO' ? 'Inscrição de Atleta' : (modalidade === 'DUPLA' ? 'Inscrição de Dupla' : 'Inscrição de Equipe')}
        </Text>
      </View>

      <ScrollView 
        className="flex-1 p-6" 
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="bg-[#1c1c1c] rounded-xl border border-[#262626] p-6 mb-6">
          <Text className="text-brand-electric-light font-bold text-sm mb-4 uppercase tracking-wider">Dados da Inscrição</Text>
          
          <View className="mb-4">
            <Text className="text-gray-400 mb-2 font-semibold">
              {modalidade === 'SOLO' ? 'Nome do Atleta' : (modalidade === 'DUPLA' ? 'Nome da Dupla' : 'Nome do Time')}
            </Text>
            <View className="bg-[#0a0a0a] rounded-lg border border-[#333] px-4 py-3">
              <TextInput
                placeholder={modalidade === 'SOLO' ? "Seu nome completo" : "Ex: L.A. Strikers FC"}
                placeholderTextColor="#666"
                className="text-white text-base"
                value={nomeTime}
                onChangeText={setNomeTime}
              />
            </View>
          </View>

          {modalidade === 'DUPLA' && (
            <>
              <View className="mb-4">
                <Text className="text-gray-400 mb-2 font-semibold">Jogador 1</Text>
                <View className="bg-[#0a0a0a] rounded-lg border border-[#333] px-4 py-3">
                  <TextInput
                    placeholder="Nome do Jogador 1"
                    placeholderTextColor="#666"
                    className="text-white text-base"
                    value={player1}
                    onChangeText={setPlayer1}
                  />
                </View>
              </View>
              <View className="mb-4">
                <Text className="text-gray-400 mb-2 font-semibold">Jogador 2</Text>
                <View className="bg-[#0a0a0a] rounded-lg border border-[#333] px-4 py-3">
                  <TextInput
                    placeholder="Nome do Jogador 2"
                    placeholderTextColor="#666"
                    className="text-white text-base"
                    value={player2}
                    onChangeText={setPlayer2}
                  />
                </View>
              </View>
            </>
          )}

          {modalidade === 'TIME' && (
            <View className="mb-4 mt-2">
              <Text className="text-gray-400 mb-2 font-semibold">Jogadores do Time</Text>
              
              <View className="flex-row items-center mb-3">
                <View className="bg-[#0a0a0a] rounded-lg border border-[#333] px-4 py-3 flex-1 mr-2">
                  <TextInput
                    placeholder="Nome do jogador"
                    placeholderTextColor="#666"
                    className="text-white text-base"
                    value={novoJogador}
                    onChangeText={setNovoJogador}
                  />
                </View>
                <TouchableOpacity 
                  onPress={adicionarJogador}
                  className="bg-brand-primary dark:bg-brand-electric-light w-12 h-12 rounded-lg items-center justify-center"
                >
                  <Ionicons name="add" size={24} color="#0a0a0a" />
                </TouchableOpacity>
              </View>

              {jogadoresExtras.map((jog, index) => (
                <View key={index} className="flex-row items-center justify-between bg-[#1c1c1c] border border-[#333] p-3 rounded-lg mb-2">
                  <Text className="text-white flex-1">{jog}</Text>
                  <TouchableOpacity onPress={() => removerJogador(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
              <Text className="text-[#0a0a0a] font-black text-lg mr-2">
                {valorInscricao === 0 ? 'CONFIRMAR INSCRIÇÃO' : 'AVANÇAR PARA PAGAMENTO'}
              </Text>
              <Ionicons name={valorInscricao === 0 ? "checkmark-circle" : "arrow-forward"} size={20} color="#0a0a0a" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
