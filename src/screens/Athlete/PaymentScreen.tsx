import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/supabase';

export function PaymentScreen({ route, navigation }: any) {
  const { inscricaoId, torneioId } = route.params;
  
  const [torneio, setTorneio] = useState<any>(null);
  const [comprovanteUri, setComprovanteUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchTorneioDetails();
  }, []);

  const fetchTorneioDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('torneios')
        .select('*')
        .eq('id', torneioId)
        .single();
      
      if (error) throw error;
      setTorneio(data);
    } catch (error) {
      console.error("Erro ao buscar torneio:", error);
    } finally {
      setFetching(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setComprovanteUri(result.assets[0].uri);
    }
  };

  const handleFinalizar = async () => {
    if (!comprovanteUri) {
      Alert.alert('Atenção', 'Anexe o comprovante do Pix para concluir a inscrição.');
      return;
    }

    try {
      setLoading(true);

      // Simular upload para o Supabase Storage (já que o bucket pode não existir ainda no ambiente do usuário)
      // O código real de upload seria:
      // const response = await fetch(comprovanteUri);
      // const blob = await response.blob();
      // await supabase.storage.from('comprovantes').upload(`pix_${inscricaoId}.jpg`, blob);

      const fakeUploadedUrl = `https://supabase.com/storage/v1/object/public/comprovantes/pix_${inscricaoId}.jpg`;

      // Atualizar a inscrição no banco
      const { error } = await supabase
        .from('inscricoes')
        .update({ comprovante_pix_url: fakeUploadedUrl, status: 'pendente' })
        .eq('id', inscricaoId);

      if (error) throw error;

      Alert.alert('Sucesso!', 'Sua inscrição foi enviada e está aguardando aprovação do organizador.', [
        { text: 'OK', onPress: () => navigation.navigate('Feed') }
      ]);

    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível finalizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-[#0a0a0a] justify-center items-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]">
      {/* Header Fixo */}
      <View className="flex-row items-center px-6 py-4 border-b border-[#1c1c1c]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#888" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Pagamento</Text>
      </View>

      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Resumo Financeiro */}
        <View className="bg-[#1c1c1c] rounded-xl border border-[#262626] p-6 items-center mb-6">
          <Text className="text-gray-400 font-semibold mb-2">Valor da Inscrição</Text>
          <Text className="text-[#FFD700] text-4xl font-black mb-1">
            R$ {torneio?.valor_inscricao || '0.00'}
          </Text>
          <Text className="text-white font-bold">{torneio?.nome}</Text>
        </View>

        {/* QR Code Section */}
        <View className="bg-[#1c1c1c] rounded-xl border border-[#262626] p-6 items-center mb-6">
          <Text className="text-brand-electric-light font-bold text-sm mb-4 uppercase tracking-wider">Escaneie o QR Code Pix</Text>
          <View className="w-48 h-48 bg-[#e6ddca] p-2 rounded-lg mb-4 justify-center items-center">
            {/* Simulando um QR Code Genérico */}
            <Ionicons name="qr-code-outline" size={160} color="#000" />
          </View>
          <TouchableOpacity className="flex-row items-center bg-[#262626] px-4 py-2 rounded-full border border-[#333]">
            <Ionicons name="copy-outline" size={16} color="#888" className="mr-2" />
            <Text className="text-gray-300 font-semibold text-xs">Copiar Chave Pix</Text>
          </TouchableOpacity>
        </View>

        {/* Upload de Comprovante */}
        <Text className="text-white text-lg font-bold mb-3">Comprovante</Text>
        <TouchableOpacity 
          onPress={pickImage}
          className={`border-2 border-dashed ${comprovanteUri ? 'border-[#4ADE80] bg-[#1A2E1A]' : 'border-[#333] bg-[#1c1c1c]'} rounded-xl p-6 items-center justify-center mb-8 h-40`}
        >
          {comprovanteUri ? (
            <>
              <Ionicons name="checkmark-circle" size={40} color="#4ADE80" mb-2 />
              <Text className="text-[#4ADE80] font-bold">Comprovante Anexado</Text>
              <Text className="text-gray-400 text-xs mt-2 text-center">Toque para trocar a imagem</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={40} color="#888" mb-2 />
              <Text className="text-gray-400 font-bold text-center">Toque para anexar o{'\n'}comprovante de pagamento</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botão Finalizar */}
        <TouchableOpacity 
          onPress={handleFinalizar}
          disabled={loading || !comprovanteUri}
          className={`${!comprovanteUri ? 'bg-[#333]' : 'bg-[#FFD700]'} rounded-xl py-4 items-center flex-row justify-center mb-10`}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={24} color={!comprovanteUri ? '#666' : '#0a0a0a'} className="mr-2" />
              <Text className={`${!comprovanteUri ? 'text-[#666]' : 'text-[#0a0a0a]'} font-black text-lg`}>FINALIZAR INSCRIÇÃO</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
