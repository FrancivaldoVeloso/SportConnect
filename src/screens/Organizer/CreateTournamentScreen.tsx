import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export function CreateTournamentScreen({ navigation }: any) {
  const { user } = React.useContext(AuthContext);
  const [nome, setNome] = useState('');
  const [modalidade, setModalidade] = useState('Dominó');
  const [dataInicio, setDataInicio] = useState(new Date());
  const [horaInicio, setHoraInicio] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [local, setLocal] = useState('');
  const [numeroMaxTimes, setNumeroMaxTimes] = useState('');
  const [valorInscricao, setValorInscricao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [capaUrl, setCapaUrl] = useState<string | null>(null);
  const [categoriaGenero, setCategoriaGenero] = useState('Masculino');
  const [loading, setLoading] = useState(false);

  const MODALIDADES = ['Dominó', 'Futebol', 'Futsal', 'Vôlei', 'Ping Pong'];
  const CATEGORIAS_GENERO = ['Masculino', 'Feminino', 'Misto'];
  const requiresGender = ['Vôlei', 'Futsal', 'Futebol'].includes(modalidade);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCapaUrl(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!nome || !modalidade || !dataInicio || !local || !numeroMaxTimes || !valorInscricao) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    if (!user) {
      Alert.alert('Erro', 'Sessão inválida. Faça login novamente.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('torneios').insert({
      organizador_id: user.id,
      nome,
      modalidade,
      data_inicio: dataInicio.toISOString().split('T')[0],
      hora_inicio: horaInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      local,
      numero_max_times: parseInt(numeroMaxTimes, 10),
      valor_inscricao: parseFloat(valorInscricao),
      descricao,
      capa_url: capaUrl,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Erro ao criar torneio', error.message);
    } else {
      Alert.alert('Sucesso', 'Torneio criado com sucesso!');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg p-4">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-brand-primary dark:text-brand-electric-light text-lg font-semibold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-gray-900 dark:text-white text-2xl font-bold">Novo Torneio</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          onPress={pickImage}
          className={`border-2 border-dashed ${capaUrl ? 'border-brand-primary dark:border-brand-electric-light' : 'border-gray-300 dark:border-brand-border-focus'} rounded-xl items-center justify-center mb-6 h-48 overflow-hidden bg-[#e6ddca] dark:bg-brand-surface`}
        >
          {capaUrl ? (
            <Image source={{ uri: capaUrl }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <>
              <Ionicons name="image-outline" size={40} color="#888" />
              <Text className="text-gray-400 mt-2 font-bold">Adicionar Capa do Torneio</Text>
            </>
          )}
        </TouchableOpacity>

        <Input 
          label="Nome do Torneio" 
          placeholder="Taça Picos de Dominó" 
          value={nome}
          onChangeText={setNome}
        />

        <View className="mb-4">
          <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1 text-sm uppercase tracking-wider">Descrição</Text>
          <Input 
            placeholder="O maior torneio da região..." 
            value={descricao}
            onChangeText={setDescricao}
          />
        </View>
        
        <View className="mb-4">
          <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1 text-sm uppercase tracking-wider">Modalidade</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {MODALIDADES.map((mod) => (
              <TouchableOpacity
                key={mod}
                onPress={() => setModalidade(mod)}
                className={`mr-3 px-5 py-2.5 rounded-full border ${
                  modalidade === mod 
                    ? 'bg-brand-primary dark:bg-brand-electric-light border-brand-primary dark:border-brand-electric-light' 
                    : 'bg-[#e6ddca] dark:bg-brand-surface border-[#d8ccb4] dark:border-brand-border-focus'
                }`}
              >
                <Text className={`font-bold ${modalidade === mod ? 'text-white dark:text-[#0a0a0a]' : 'text-gray-700 dark:text-gray-300'}`}>
                  {mod}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {requiresGender && (
          <View className="mb-4">
            <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1 text-sm uppercase tracking-wider">Categoria (Gênero)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {CATEGORIAS_GENERO.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategoriaGenero(cat)}
                  className={`mr-3 px-5 py-2.5 rounded-full border ${
                    categoriaGenero === cat 
                      ? 'bg-brand-primary dark:bg-brand-electric-light border-brand-primary dark:border-brand-electric-light' 
                      : 'bg-[#e6ddca] dark:bg-brand-surface border-[#d8ccb4] dark:border-brand-border-focus'
                  }`}
                >
                  <Text className={`font-bold ${categoriaGenero === cat ? 'text-white dark:text-[#0a0a0a]' : 'text-gray-700 dark:text-gray-300'}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        <View className="flex-row space-x-4 mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1 text-sm uppercase tracking-wider">Data de Início</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="bg-[#e6ddca] dark:bg-brand-surface border border-[#d8ccb4] dark:border-brand-border-focus rounded-xl px-4 py-4 flex-row items-center"
            >
              <Text className="text-gray-900 dark:text-white font-bold flex-1">
                {dataInicio.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1 text-sm uppercase tracking-wider">Horário</Text>
            <TouchableOpacity 
              onPress={() => setShowTimePicker(true)}
              className="bg-[#e6ddca] dark:bg-brand-surface border border-[#d8ccb4] dark:border-brand-border-focus rounded-xl px-4 py-4 flex-row items-center"
            >
              <Text className="text-gray-900 dark:text-white font-bold flex-1">
                {horaInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={dataInicio}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDataInicio(selectedDate);
              }
            }}
          />
        )}
        
        {showTimePicker && (
          <DateTimePicker
            value={horaInicio}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowTimePicker(false);
              if (selectedDate) {
                setHoraInicio(selectedDate);
              }
            }}
          />
        )}
        
        <Input 
          label="Local" 
          placeholder="Quadra Poliesportiva" 
          value={local}
          onChangeText={setLocal}
        />
        
        <Input 
          label="Número de Vagas (Times/Duplas)" 
          placeholder="16" 
          keyboardType="numeric"
          value={numeroMaxTimes}
          onChangeText={setNumeroMaxTimes}
        />
        
        <Input 
          label="Valor da Inscrição (R$)" 
          placeholder="50.00" 
          keyboardType="numeric"
          value={valorInscricao}
          onChangeText={setValorInscricao}
        />

        <TouchableOpacity 
          className="bg-brand-primary dark:bg-brand-electric-light p-4 rounded-xl items-center mt-6 mb-8 shadow-sm"
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white dark:text-[#0a0a0a] font-bold text-lg">Cadastrar Torneio</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
