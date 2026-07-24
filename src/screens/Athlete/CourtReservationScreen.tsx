import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';

const MOCK_QUADRAS = [
  { id: 'mock-1', nome: 'Arena Prime Sport', localizacao: 'Centro', valor_hora: 120.00 },
  { id: 'mock-2', nome: 'Quadra Poliesportiva Municipal', localizacao: 'Bairro São José', valor_hora: 80.00 },
  { id: 'mock-3', nome: 'Clube dos Atletas', localizacao: 'Zona Leste', valor_hora: 150.00 }
];

const HORARIOS_DISPONIVEIS = [
  '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', 
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

// Utilitário para gerar próximos dias
const getProximosDias = (quantidade: number) => {
  const dias = [];
  const hoje = new Date();
  
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  for (let i = 0; i < quantidade; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    dias.push({
      dataCompleta: data,
      diaSemana: i === 0 ? 'Hoje' : diasSemana[data.getDay()],
      diaMes: data.getDate().toString().padStart(2, '0'),
    });
  }
  return dias;
};

export function CourtReservationScreen() {
  const [quadras, setQuadras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pessoasDivisao, setPessoasDivisao] = useState('10');
  const [quadraSelecionada, setQuadraSelecionada] = useState<any>(null);
  
  // Novos estados para Data e Horário
  const [diasDisponiveis, setDiasDisponiveis] = useState<any[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);

  useEffect(() => {
    fetchQuadras();
    const dias = getProximosDias(14); // Carrega 2 semanas
    setDiasDisponiveis(dias);
    setDataSelecionada(dias[0].dataCompleta); // Seleciona hoje por padrão
  }, []);

  const fetchQuadras = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quadras')
        .select('*');

      if (error) throw error;
      
      // Fallback para MOCK se o banco estiver vazio
      if (!data || data.length === 0) {
        setQuadras(MOCK_QUADRAS);
      } else {
        setQuadras(data);
      }
    } catch (error) {
      console.error("Erro ao buscar quadras, usando mock:", error);
      setQuadras(MOCK_QUADRAS);
    } finally {
      setLoading(false);
    }
  };

  const handleReserva = async () => {
    if (!quadraSelecionada || !dataSelecionada || !horarioSelecionado) return;

    const dataFormatada = dataSelecionada.toLocaleDateString('pt-BR');

    Alert.alert(
      'Confirmar Reserva',
      `Deseja solicitar reserva da ${quadraSelecionada.nome} para ${dataFormatada} às ${horarioSelecionado}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => {
            Alert.alert('Sucesso', 'Solicitação de reserva enviada para aprovação do administrador do complexo esportivo.');
            setQuadraSelecionada(null);
            setHorarioSelecionado(null);
          }
        }
      ]
    );
  };

  const getValorPorPessoa = (valorHora: number) => {
    const num = parseInt(pessoasDivisao) || 1;
    return (valorHora / num).toFixed(2);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg">
      <View className="px-6 pt-6 pb-4 border-b border-[#d8ccb4] dark:border-brand-border">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Locação de Quadras</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm">Alugue os melhores espaços e já calcule a divisão (o famoso "rachão").</Text>
      </View>

      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Calculadora de Rachão Fixo */}
        <View className="bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-5 border border-[#d8ccb4] dark:border-brand-border-focus mb-8 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Ionicons name="calculator-outline" size={24} color="#2563EB" className="dark:text-brand-electric-light" />
            <Text className="text-gray-900 dark:text-white font-bold ml-2 text-lg">Calculadora de Divisão</Text>
          </View>
          <Text className="text-gray-500 dark:text-gray-400 mb-2">Quantas pessoas vão jogar?</Text>
          <View className="flex-row items-center bg-[#f2ece0] dark:bg-brand-bg rounded-lg border border-gray-300 dark:border-brand-border-focus px-4 py-2">
            <Ionicons name="people-outline" size={20} color="#888" className="mr-3" />
            <TextInput 
              value={pessoasDivisao}
              onChangeText={setPessoasDivisao}
              keyboardType="number-pad"
              className="flex-1 text-gray-900 dark:text-white text-lg font-bold"
              maxLength={2}
            />
          </View>
        </View>

        <Text className="text-gray-900 dark:text-white font-bold text-xl mb-4">Quadras Disponíveis</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
        ) : (
          quadras.map(quadra => {
            const isSelecionada = quadraSelecionada?.id === quadra.id;
            return (
              <View key={quadra.id} className="mb-4">
                <TouchableOpacity 
                  onPress={() => {
                    setQuadraSelecionada(isSelecionada ? null : quadra);
                    if (!isSelecionada) setHorarioSelecionado(null);
                  }}
                  className={`bg-[#e6ddca] dark:bg-brand-surface rounded-xl border ${isSelecionada ? 'border-brand-primary dark:border-[#FFD700]' : 'border-[#d8ccb4] dark:border-brand-border-focus'} p-4 shadow-sm`}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text className="text-gray-900 dark:text-white font-bold text-lg">{quadra.nome}</Text>
                      <Text className="text-gray-500 dark:text-gray-400 text-sm">{quadra.localizacao}</Text>
                    </View>
                    <View className="bg-gray-100 dark:bg-brand-border px-3 py-1 rounded-full">
                      <Text className="text-brand-primary dark:text-[#FFD700] font-black">R$ {quadra.valor_hora}/hr</Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-[#d8ccb4] dark:border-brand-border-focus">
                    <Text className="text-gray-500 text-xs uppercase font-bold">Valor p/ pessoa</Text>
                    <Text className="text-green-600 dark:text-[#4ADE80] font-black text-xl">
                      R$ {getValorPorPessoa(quadra.valor_hora)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Container de Seleção de Data e Hora (Aparece ao selecionar a quadra) */}
                {isSelecionada && (
                  <View className="bg-white dark:bg-brand-bg/50 border border-t-0 border-brand-primary dark:border-[#FFD700] rounded-b-xl p-4 mt-[-8px] pt-6 z-[-1]">
                    <Text className="text-gray-900 dark:text-white font-bold mb-3">Escolha a Data</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                      {diasDisponiveis.map((dia, idx) => {
                        const isDiaSelecionado = dataSelecionada?.getDate() === dia.dataCompleta.getDate() && 
                                                 dataSelecionada?.getMonth() === dia.dataCompleta.getMonth();
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setDataSelecionada(dia.dataCompleta)}
                            className={`items-center justify-center rounded-xl py-3 px-4 mr-3 border ${
                              isDiaSelecionado 
                                ? 'bg-brand-primary dark:bg-brand-electric-light border-brand-primary dark:border-brand-electric-light' 
                                : 'bg-[#f2ece0] dark:bg-brand-surface border-[#d8ccb4] dark:border-brand-border-focus'
                            }`}
                          >
                            <Text className={`text-xs mb-1 font-semibold ${isDiaSelecionado ? 'text-blue-100 dark:text-black/70' : 'text-gray-500'}`}>
                              {dia.diaSemana}
                            </Text>
                            <Text className={`text-lg font-black ${isDiaSelecionado ? 'text-white dark:text-[#0a0a0a]' : 'text-gray-900 dark:text-white'}`}>
                              {dia.diaMes}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <Text className="text-gray-900 dark:text-white font-bold mb-3">Horários Disponíveis</Text>
                    <View className="flex-row flex-wrap justify-between">
                      {HORARIOS_DISPONIVEIS.map((hora) => {
                        const isHoraSelecionada = horarioSelecionado === hora;
                        return (
                          <TouchableOpacity
                            key={hora}
                            onPress={() => setHorarioSelecionado(hora)}
                            className={`w-[30%] items-center justify-center rounded-lg py-3 mb-3 border ${
                              isHoraSelecionada
                                ? 'bg-[#FFD700] border-[#FFD700]'
                                : 'bg-[#f2ece0] dark:bg-brand-surface border-[#d8ccb4] dark:border-brand-border-focus'
                            }`}
                          >
                            <Text className={`font-bold ${isHoraSelecionada ? 'text-black' : 'text-gray-700 dark:text-gray-300'}`}>
                              {hora}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

      </ScrollView>

      {/* Barra fixa embaixo se tiver selecionado Quadra E Horário */}
      {quadraSelecionada && horarioSelecionado && dataSelecionada && (
        <View className="absolute bottom-0 w-full bg-[#e6ddca] dark:bg-brand-surface border-t border-[#d8ccb4] dark:border-brand-border-focus p-6 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-900 dark:text-white font-bold">{quadraSelecionada.nome}</Text>
              <Text className="text-gray-500 text-xs">
                {dataSelecionada.toLocaleDateString('pt-BR')} às {horarioSelecionado}
              </Text>
            </View>
            <Text className="text-brand-primary dark:text-[#FFD700] font-black text-xl">R$ {quadraSelecionada.valor_hora}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleReserva}
            className="bg-brand-primary dark:bg-brand-electric-light rounded-xl py-4 items-center">
            <Text className="text-white dark:text-[#0a0a0a] font-black text-lg">FINALIZAR RESERVA</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}
