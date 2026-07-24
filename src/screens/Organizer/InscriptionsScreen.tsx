import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';

export function InscriptionsScreen() {
  const { user } = useContext(AuthContext);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingInscriptions = async () => {
    if (!user) return;
    try {
      // 1. Descobrir os torneios deste organizador
      const { data: torneiosData } = await supabase
        .from('torneios')
        .select('id')
        .eq('organizador_id', user.id);
      
      if (torneiosData && torneiosData.length > 0) {
        const torneioIds = torneiosData.map(t => t.id);

        // 2. Buscar inscricoes pendentes desses torneios
        const { data, error } = await supabase
          .from('inscricoes')
          .select(`
            *,
            times (
              nome,
              categoria,
              capitao_id
            ),
            torneios (
              nome
            )
          `)
          .in('torneio_id', torneioIds)
          .eq('status', 'pendente')
          .order('created_at', { ascending: true });

        if (!error && data) {
          // 3. (Opcional no MVP) Buscar os nomes dos capitães
          // Aqui fazemos um loop rapido para pegar o nome do capitao para cada time
          const enrichedData = await Promise.all(data.map(async (insc: any) => {
            if (insc.times?.capitao_id) {
              const { data: cap } = await supabase.from('usuarios').select('nome, email').eq('id', insc.times.capitao_id).single();
              return { ...insc, capitao: cap };
            }
            return insc;
          }));

          setInscriptions(enrichedData);
        }
      } else {
        setInscriptions([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPendingInscriptions();

    // Supabase Realtime Subscription (Escutando mudanças na tabela inscricoes)
    const subscription = supabase
      .channel('inscricoes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscricoes' }, (payload) => {
        // Recarrega a lista se houver alguma inserção ou alteração nas inscrições
        fetchPendingInscriptions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleApprove = async (id: string, timeNome: string) => {
    Alert.alert(
      "Aprovar Inscrição",
      `Confirma o pagamento e a inscrição do time ${timeNome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Aprovar", 
          onPress: async () => {
            const { error } = await supabase.from('inscricoes').update({ status: 'aprovado' }).eq('id', id);
            if (!error) {
              fetchPendingInscriptions();
            } else {
              Alert.alert("Erro", "Não foi possível aprovar a inscrição.");
            }
          }
        }
      ]
    );
  };

  const handleReject = async (id: string, timeNome: string) => {
    Alert.alert(
      "Rejeitar Inscrição",
      `O comprovante do time ${timeNome} é inválido?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Rejeitar", 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('inscricoes').update({ status: 'rejeitado' }).eq('id', id);
            if (!error) {
              fetchPendingInscriptions();
            } else {
              Alert.alert("Erro", "Não foi possível rejeitar a inscrição.");
            }
          }
        }
      ]
    );
  };

  const openReceipt = (url?: string) => {
    if (!url) {
      Alert.alert("Aviso", "Este time não enviou o comprovante ainda.");
      return;
    }
    // No MVP, tentamos abrir a URL (Supabase Storage) no navegador
    Linking.openURL(url).catch(() => Alert.alert("Erro", "Não foi possível abrir o comprovante."));
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f2ece0] dark:bg-brand-bg">
      <View className="flex-row items-center px-6 py-4 border-b border-[#d8ccb4] dark:border-brand-border">
        <Text className="text-brand-primary dark:text-brand-electric-light text-xl font-bold tracking-wider">Gestão de Inscrições</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" className="mt-10" />
        ) : inscriptions.length === 0 ? (
          <View className="items-center mt-10 bg-[#e6ddca] dark:bg-brand-surface p-6 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#4ADE80" />
            <Text className="text-gray-900 dark:text-white font-bold text-lg mt-2">Tudo limpo!</Text>
            <Text className="text-gray-500 dark:text-gray-400 mt-2 text-center">Nenhuma inscrição pendente de validação de Pix no momento.</Text>
          </View>
        ) : (
          inscriptions.map((insc) => (
            <View key={insc.id} className="bg-[#e6ddca] dark:bg-brand-surface rounded-xl border-l-4 border-l-amber-500 p-4 mb-4 border-y border-r border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-black text-xl">{insc.times?.nome}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{insc.torneios?.nome}</Text>
                </View>
                <View className="bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-md">
                  <Text className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase">Pendente</Text>
                </View>
              </View>

              <View className="flex-row items-center mb-4 mt-2">
                <Ionicons name="person-outline" size={16} color={isDark ? "#888" : "#555"} />
                <Text className="text-gray-600 dark:text-gray-400 text-sm ml-2">Capitão: {insc.capitao?.nome || 'Desconhecido'}</Text>
              </View>

              <TouchableOpacity 
                onPress={() => openReceipt(insc.comprovante_pix_url)}
                className="bg-gray-100 dark:bg-brand-border rounded-lg py-3 flex-row justify-center items-center mb-4 border border-[#d8ccb4] dark:border-brand-border-focus"
              >
                <Ionicons name="receipt-outline" size={18} color={isDark ? "#3B82F6" : "#2563EB"} />
                <Text className="text-gray-800 dark:text-white font-bold ml-2">Ver Comprovante PIX</Text>
              </TouchableOpacity>

              <View className="flex-row justify-between space-x-3">
                <TouchableOpacity 
                  onPress={() => handleReject(insc.id, insc.times?.nome)}
                  className="flex-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-900/50 py-3 rounded-lg items-center"
                >
                  <Text className="text-red-700 dark:text-red-400 font-bold">REJEITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleApprove(insc.id, insc.times?.nome)}
                  className="flex-1 bg-green-500 dark:bg-green-600 py-3 rounded-lg items-center shadow-sm"
                >
                  <Text className="text-white font-bold">APROVAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
