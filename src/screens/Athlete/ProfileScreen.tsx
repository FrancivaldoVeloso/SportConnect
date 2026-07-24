import React, { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'nativewind';
import { AuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

export function ProfileScreen() {
  const { user, signIn, signOut } = useContext(AuthContext);
  const { colorScheme, toggleColorScheme } = useColorScheme();
  
  const [uploading, setUploading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [senhaModalVisible, setSenhaModalVisible] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');

  // Editar Perfil States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editModalidade, setEditModalidade] = useState('');
  
  // Dados do Dashboard
  const [meusTorneios, setMeusTorneios] = useState<any[]>([]);
  const [minhasInscricoes, setMinhasInscricoes] = useState<any[]>([]);
  const [meuTime, setMeuTime] = useState<any>(null);
  const [receitaTotal, setReceitaTotal] = useState(0);

  const userName = user?.nome || 'Usuário';
  const profileImage = user?.foto_perfil || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop';
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    fetchDashboardData();
    if (user) {
      setEditNome(user.nome || '');
      setEditModalidade(user.modalidade_principal || '');
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      if (user.tipo_perfil === 'organizador') {
        const { data: torneios, error } = await supabase
          .from('torneios')
          .select('*')
          .eq('organizador_id', user.id);
        
        if (!error && torneios) {
          setMeusTorneios(torneios);
          // Calcular receita mockada
          const receita = torneios.reduce((acc, t) => acc + (Number(t.valor_inscricao) * 10), 0);
          setReceitaTotal(receita);
        }
      } else if (user.tipo_perfil === 'capitao' || user.tipo_perfil === 'atleta') {
        if (user.tipo_perfil === 'capitao') {
          const { data: times, error: timeError } = await supabase
            .from('times')
            .select('*')
            .eq('capitao_id', user.id)
            .limit(1);
          
          if (!timeError && times && times.length > 0) {
            setMeuTime(times[0]);
            const { data: inscricoes, error: inscError } = await supabase
              .from('inscricoes')
              .select('*, torneios(nome)')
              .eq('time_id', times[0].id)
              .order('created_at', { ascending: false });
              
            if (!inscError && inscricoes) {
              setMinhasInscricoes(inscricoes);
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard", error);
    } finally {
      setLoadingData(false);
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && user) {
        setUploading(true);
        const newUri = result.assets[0].uri;
        const { error } = await supabase
          .from('usuarios')
          .update({ foto_perfil: newUri })
          .eq('id', user.id);

        if (error) throw error;
        await signIn({ ...user, foto_perfil: newUri });
        Alert.alert("Sucesso", "Foto de perfil atualizada!");
      }
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível atualizar a foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSalvarSenha = async () => {
    if (!novaSenha || novaSenha.length < 4) {
      Alert.alert("Erro", "A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ senha: novaSenha })
        .eq('id', user?.id);
      if (error) throw error;
      Alert.alert("Sucesso", "Senha atualizada com sucesso!");
      setSenhaModalVisible(false);
      setNovaSenha('');
    } catch(e) {
      Alert.alert("Erro", "Não foi possível atualizar a senha.");
    }
  };

  const handleSalvarPerfil = async () => {
    if (!editNome.trim()) {
      Alert.alert("Erro", "O nome não pode estar vazio.");
      return;
    }
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nome: editNome, modalidade_principal: editModalidade })
        .eq('id', user?.id);
      if (error) throw error;
      
      if (user) {
        await signIn({ ...user, nome: editNome, modalidade_principal: editModalidade });
      }
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
      setEditModalVisible(false);
    } catch(e) {
      Alert.alert("Erro", "Não foi possível atualizar o perfil.");
    }
  };

  const getBadgeColors = (perfil: string) => {
    switch(perfil) {
      case 'organizador': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
      case 'capitao': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
      case 'juiz': return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' };
      default: return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' };
    }
  };

  const renderAthleteDashboard = () => (
    <View className="mx-6 mt-6 space-y-6">
      {/* Card do Time */}
      <View className="bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-5 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 dark:text-white font-bold text-lg">Meu Time</Text>
          <Ionicons name="shield" size={24} color={isDark ? '#FFD700' : '#EAB308'} />
        </View>
        {meuTime ? (
          <View>
            <Text className="text-brand-primary dark:text-brand-electric-light font-black text-xl mb-1">{meuTime.nome}</Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm">{meuTime.categoria}</Text>
            {user?.tipo_perfil === 'capitao' && (
              <TouchableOpacity className="mt-4 bg-gray-100 dark:bg-brand-border py-2 rounded-lg items-center">
                <Text className="text-gray-700 dark:text-white font-semibold text-sm">Gerenciar Atletas</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text className="text-gray-500 dark:text-gray-400 text-sm italic">Nenhum time vinculado no momento.</Text>
        )}
      </View>

      {/* Histórico de Inscrições */}
      <View className="bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-5 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
        <Text className="text-gray-900 dark:text-white font-bold text-lg mb-4">Histórico de Inscrições</Text>
        {minhasInscricoes.length > 0 ? (
          minhasInscricoes.map(insc => (
            <View key={insc.id} className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-brand-border-focus">
              <View className="flex-1 mr-2">
                <Text className="text-gray-800 dark:text-gray-200 font-semibold" numberOfLines={1}>{insc.torneios?.nome || 'Torneio Desconhecido'}</Text>
              </View>
              <View className={`px-2 py-1 rounded-md ${insc.status === 'aprovado' ? 'bg-green-100 dark:bg-green-900/40' : insc.status === 'rejeitado' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                <Text className={`text-xs font-bold uppercase ${insc.status === 'aprovado' ? 'text-green-700 dark:text-green-400' : insc.status === 'rejeitado' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {insc.status}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-gray-500 dark:text-gray-400 text-sm">Sem inscrições recentes.</Text>
        )}
      </View>
    </View>
  );

  const renderOrganizerDashboard = () => (
    <View className="mx-6 mt-6 space-y-6">
      {/* Resumo Financeiro */}
      <View className="bg-brand-primary dark:bg-[#1E293B] rounded-xl p-6 shadow-sm relative overflow-hidden">
        <View className="absolute right-[-20] top-[-20] opacity-10">
          <Ionicons name="cash" size={120} color="#fff" />
        </View>
        <Text className="text-blue-100 dark:text-slate-300 text-xs font-bold tracking-widest uppercase mb-1">Receita Estimada (MVP)</Text>
        <Text className="text-white text-4xl font-black mb-1">R$ {receitaTotal.toFixed(2)}</Text>
        <Text className="text-blue-200 dark:text-slate-400 text-xs">Total arrecadado em inscrições</Text>
      </View>

      {/* Meus Torneios */}
      <View className="bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-5 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 dark:text-white font-bold text-lg">Meus Torneios</Text>
          <Ionicons name="trophy-outline" size={20} color={isDark ? '#888' : '#555'} />
        </View>
        {meusTorneios.length > 0 ? (
          meusTorneios.map(t => (
            <TouchableOpacity key={t.id} className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-brand-border-focus">
              <View>
                <Text className="text-gray-800 dark:text-gray-200 font-semibold text-base">{t.nome}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-xs mt-1">{t.modalidade}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#555' : '#CCC'} />
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-gray-500 dark:text-gray-400 text-sm italic">Você ainda não criou torneios.</Text>
        )}
      </View>
    </View>
  );

  const renderRefereeDashboard = () => (
    <View className="mx-6 mt-6 space-y-6">
      {/* Partidas Alocadas (Mock) */}
      <View className="bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-5 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 dark:text-white font-bold text-lg">Partidas Alocadas</Text>
          <Ionicons name="flag-outline" size={20} color={isDark ? '#3B82F6' : '#2563EB'} />
        </View>
        <View className="bg-[#f2ece0] dark:bg-brand-bg p-4 rounded-lg border border-[#d8ccb4] dark:border-brand-border-focus">
          <Text className="text-gray-800 dark:text-white font-bold text-center mb-2">Final - Dominó em Duplas</Text>
          <View className="flex-row justify-center items-center">
            <Text className="text-gray-600 dark:text-gray-400 font-semibold">Time A</Text>
            <Text className="text-gray-400 mx-3">X</Text>
            <Text className="text-gray-600 dark:text-gray-400 font-semibold">Time B</Text>
          </View>
          <Text className="text-brand-primary dark:text-brand-electric-light text-xs text-center mt-3 font-bold">HOJE - 19:00</Text>
        </View>
      </View>
    </View>
  );

  const renderDashboardByRole = () => {
    if (loadingData) return <ActivityIndicator size="large" color="#2563EB" className="mt-10" />;
    
    switch(user?.tipo_perfil) {
      case 'organizador': return renderOrganizerDashboard();
      case 'juiz': return renderRefereeDashboard();
      default: return renderAthleteDashboard(); // capitao ou atleta
    }
  };

  const badgeTheme = getBadgeColors(user?.tipo_perfil || 'atleta');

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg">
      {/* Header Fixo */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#d8ccb4] dark:border-brand-border">
        <View className="flex-row items-center">
          <Image source={require('../../../assets/logoSport.png')} style={{ width: 32, height: 32, marginRight: 8 }} resizeMode="contain" />
          <Text className="text-brand-primary dark:text-brand-electric-light text-xl font-bold tracking-wider">SportConnect</Text>
        </View>
        <TouchableOpacity onPress={toggleColorScheme} className="p-1 rounded-full bg-[#f2ece0] dark:bg-brand-surface border border-[#d8ccb4] dark:border-brand-border-focus">
          <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={isDark ? "#F59E0B" : "#2563EB"} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Info Principal do Usuário */}
        <View className="mx-6 mt-6 bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-6 border border-[#d8ccb4] dark:border-brand-border-focus items-center relative shadow-sm">
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            <View className="w-24 h-24 rounded-full bg-gray-100 dark:bg-brand-border mb-4 border-4 border-brand-primary dark:border-brand-electric-light overflow-hidden justify-center items-center shadow-md">
              {uploading ? (
                <ActivityIndicator color={isDark ? '#3B82F6' : '#2563EB'} />
              ) : (
                <Image source={{ uri: profileImage }} className="w-full h-full" />
              )}
              <View className="absolute bottom-0 w-full bg-black/60 py-1 items-center">
                <Ionicons name="camera" size={10} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
          
          <View className={`px-3 py-1 rounded-full mb-3 border ${badgeTheme.border} ${badgeTheme.bg}`}>
            <Text className={`text-[10px] font-black tracking-widest uppercase ${badgeTheme.text}`}>
              {user?.tipo_perfil || 'Atleta'}
            </Text>
          </View>

          <Text className="text-gray-900 dark:text-white text-3xl font-black text-center mb-1">
            {userName}
          </Text>
          {user?.modalidade_principal && (
            <Text className="text-gray-500 dark:text-gray-400 font-semibold mb-1">
              Esporte: <Text className="text-gray-700 dark:text-gray-300">{user.modalidade_principal}</Text>
            </Text>
          )}
          <Text className="text-gray-400 dark:text-gray-500 text-sm mb-4">
            {user?.email}
          </Text>

          <View className="flex-row items-center bg-green-50 dark:bg-[#1A2E1A] border border-green-200 dark:border-[#2E5C2E] px-3 py-1 rounded-full">
            <Ionicons name="shield-checkmark" size={14} color="#4ADE80" className="mr-1" />
            <Text className="text-green-700 dark:text-[#4ADE80] text-xs font-bold ml-1">CONTA VERIFICADA</Text>
          </View>
        </View>

        {/* Dashboards Dinâmicos */}
        {renderDashboardByRole()}

        {/* Configurações & Segurança */}
        <View className="mx-6 mt-6 bg-[#e6ddca] dark:bg-brand-surface rounded-xl p-4 border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm mb-6">
          <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold tracking-widest uppercase mb-2 px-2 mt-2">Segurança & App</Text>
          
          <TouchableOpacity 
            onPress={() => setEditModalVisible(true)}
            className="flex-row items-center justify-between px-2 py-4 border-b border-gray-100 dark:border-brand-border-focus"
          >
            <View className="flex-row items-center">
              <View className="bg-gray-100 dark:bg-brand-border p-2 rounded-full mr-3">
                <Ionicons name="person-outline" size={20} color={isDark ? "#3B82F6" : "#2563EB"} />
              </View>
              <Text className="text-gray-800 dark:text-white font-semibold text-base">Editar Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? "#555" : "#CCC"} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSenhaModalVisible(true)}
            className="flex-row items-center justify-between px-2 py-4 border-b border-gray-100 dark:border-brand-border-focus"
          >
            <View className="flex-row items-center">
              <View className="bg-gray-100 dark:bg-brand-border p-2 rounded-full mr-3">
                <Ionicons name="lock-closed-outline" size={20} color={isDark ? "#3B82F6" : "#2563EB"} />
              </View>
              <Text className="text-gray-800 dark:text-white font-semibold text-base">Alterar Senha</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? "#555" : "#CCC"} />
          </TouchableOpacity>

          <View className="flex-row items-center justify-between px-2 py-4 border-b border-gray-100 dark:border-brand-border-focus">
            <View className="flex-row items-center">
              <View className="bg-gray-100 dark:bg-brand-border p-2 rounded-full mr-3">
                <Ionicons name="notifications-outline" size={20} color={isDark ? "#3B82F6" : "#2563EB"} />
              </View>
              <Text className="text-gray-800 dark:text-white font-semibold text-base">Notificações Push</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
              thumbColor="#fff"
            />
          </View>

        </View>

        {/* Botão de Logout */}
        <TouchableOpacity 
          onPress={signOut}
          className="mx-6 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl py-4 flex-row justify-center items-center shadow-sm"
        >
          <Ionicons name="log-out-outline" size={22} color={isDark ? "#F87171" : "#DC2626"} className="mr-2" />
          <Text className="text-red-600 dark:text-red-400 font-bold text-lg">Sair da Conta</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal Alterar Senha */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={senhaModalVisible}
        onRequestClose={() => setSenhaModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-[#e6ddca] dark:bg-brand-surface w-full rounded-2xl p-6 border border-[#d8ccb4] dark:border-brand-border-focus shadow-xl">
            <Text className="text-gray-900 dark:text-white text-xl font-bold mb-4">Nova Senha</Text>
            <TextInput
              className="bg-[#f2ece0] dark:bg-brand-bg text-gray-900 dark:text-white p-4 rounded-xl border border-gray-300 dark:border-brand-border-focus mb-6"
              placeholder="Digite a nova senha..."
              placeholderTextColor="#888"
              secureTextEntry
              value={novaSenha}
              onChangeText={setNovaSenha}
            />
            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity 
                onPress={() => setSenhaModalVisible(false)}
                className="px-5 py-3 rounded-lg"
              >
                <Text className="text-gray-500 dark:text-gray-400 font-bold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSalvarSenha}
                className="bg-brand-primary dark:bg-brand-electric-light px-5 py-3 rounded-lg"
              >
                <Text className="text-white dark:text-[#0a0a0a] font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Perfil */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-[#e6ddca] dark:bg-brand-surface w-full rounded-2xl p-6 border border-[#d8ccb4] dark:border-brand-border-focus shadow-xl">
            <Text className="text-gray-900 dark:text-white text-xl font-bold mb-4">Editar Perfil</Text>
            
            <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase mb-1">Nome Completo</Text>
            <TextInput
              className="bg-[#f2ece0] dark:bg-brand-bg text-gray-900 dark:text-white p-4 rounded-xl border border-gray-300 dark:border-brand-border-focus mb-4"
              placeholder="Seu nome..."
              placeholderTextColor="#888"
              value={editNome}
              onChangeText={setEditNome}
            />

            <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase mb-1">Esporte Principal</Text>
            <TextInput
              className="bg-[#f2ece0] dark:bg-brand-bg text-gray-900 dark:text-white p-4 rounded-xl border border-gray-300 dark:border-brand-border-focus mb-6"
              placeholder="Ex: Dominó"
              placeholderTextColor="#888"
              value={editModalidade}
              onChangeText={setEditModalidade}
            />

            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)}
                className="px-5 py-3 rounded-lg"
              >
                <Text className="text-gray-500 dark:text-gray-400 font-bold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSalvarPerfil}
                className="bg-brand-primary dark:bg-brand-electric-light px-5 py-3 rounded-lg"
              >
                <Text className="text-white dark:text-[#0a0a0a] font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
