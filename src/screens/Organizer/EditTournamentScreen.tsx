import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/Input';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

export function EditTournamentScreen({ route, navigation }: any) {
  const { torneio } = route.params;
  const { user } = React.useContext(AuthContext);
  
  const [nome, setNome] = useState(torneio.nome);
  const [modalidade, setModalidade] = useState(torneio.modalidade);
  const [dataInicio, setDataInicio] = useState(new Date(torneio.data_inicio + 'T12:00:00Z'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [local, setLocal] = useState(torneio.local);
  const [numeroMaxTimes, setNumeroMaxTimes] = useState(torneio.numero_max_times.toString());
  const [valorInscricao, setValorInscricao] = useState(torneio.valor_inscricao.toString());
  const [descricao, setDescricao] = useState(torneio.descricao || '');
  const [capaUrl, setCapaUrl] = useState<string | null>(torneio.capa_url || null);
  const [categoriaGenero, setCategoriaGenero] = useState(torneio.categoria_genero || 'Masculino');
  const [loading, setLoading] = useState(false);

  const MODALIDADES = ['Dominó', 'Futebol', 'Futsal', 'Vôlei', 'Ping Pong'];
  const CATEGORIAS_GENERO = ['Masculino', 'Feminino', 'Misto'];
  const requiresGender = ['Vôlei', 'Futsal', 'Futebol'].includes(modalidade);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setCapaUrl(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
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

    const { error } = await supabase.from('torneios').update({
      nome,
      modalidade,
      data_inicio: dataInicio.toISOString().split('T')[0],
      local,
      numero_max_times: parseInt(numeroMaxTimes, 10),
      valor_inscricao: parseFloat(valorInscricao),
      descricao,
    }).eq('id', torneio.id);

    setLoading(false);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', 'Torneio atualizado com sucesso!');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg p-4">
      <View className="flex-row items-center px-6 py-4 border-b border-[#d8ccb4] dark:border-brand-border-focus">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-brand-primary dark:text-brand-electric-light text-xl font-bold tracking-wider">Editar Torneio</Text>
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
          placeholder="Ex: Taça Picos de Dominó" 
          value={nome}
          onChangeText={setNome}
        />

        <View className="mb-4">
          <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1 text-sm uppercase tracking-wider">Descrição</Text>
          <Input 
            placeholder="Ex: O maior torneio da região..." 
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
        
        <View className="mb-4">
          <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 ml-1 text-sm uppercase tracking-wider">Data de Início</Text>
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            className="bg-[#e6ddca] dark:bg-brand-surface border border-[#d8ccb4] dark:border-brand-border-focus rounded-xl px-4 py-4 flex-row items-center"
          >
            <Text className="text-gray-900 dark:text-white font-bold flex-1">
              {dataInicio.toLocaleDateString('pt-BR')}
            </Text>
            <Text className="text-brand-primary dark:text-brand-electric-light text-xs font-bold uppercase">Alterar</Text>
          </TouchableOpacity>
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
        
        <Input 
          label="Local" 
          placeholder="Ex: Quadra Poliesportiva" 
          value={local}
          onChangeText={setLocal}
        />
        
        <Input 
          label="Número de Vagas (Times/Duplas)" 
          placeholder="Ex: 16" 
          keyboardType="numeric"
          value={numeroMaxTimes}
          onChangeText={setNumeroMaxTimes}
        />
        
        <Input 
          label="Valor da Inscrição (R$)" 
          placeholder="Ex: 50.00" 
          keyboardType="numeric"
          value={valorInscricao}
          onChangeText={setValorInscricao}
        />

        <TouchableOpacity 
          className="bg-brand-primary dark:bg-brand-electric-light rounded-xl py-4 items-center shadow-sm"
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white dark:text-[#0a0a0a] font-bold text-lg">Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
