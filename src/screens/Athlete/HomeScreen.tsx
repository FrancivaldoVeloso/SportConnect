import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Card } from '../../components/Card';
import { Tag } from '../../components/Tag';
import { Button } from '../../components/Button';
import { supabase } from '../../services/supabase';

// Helper for default images
const getDefaultImage = (modalidade: string) => {
  const mod = (modalidade || '').trim();
  switch (mod) {
    case 'Futebol': return require('../../../img/futebol-padrão.jpg');
    case 'Vôlei': return require('../../../img/volei-padrão.jpg');
    case 'Futsal': return require('../../../img/futsal-padrão.webp');
    case 'Ping Pong': return require('../../../img/pingpong-padrão.jpg');
    case 'Dominó': return require('../../../img/domino-padrão.jpg');
    default: return require('../../../img/logoSport.png');
  }
};

export function HomeScreen() {
  const [torneios, setTorneios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTorneios();
  }, []);

  const fetchTorneios = async () => {
    const { data, error } = await supabase
      .from('torneios')
      .select('*, usuarios(nome)')
      .order('data_inicio', { ascending: true });
      
    if (!error && data) {
      setTorneios(data);
    }
    setLoading(false);
  };

  return (
    <ScrollView className="flex-1 bg-brand-bg p-4">
      <Text className="text-white text-2xl font-bold mb-6">Explorar Torneios</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" />
      ) : torneios.length === 0 ? (
        <Text className="text-gray-400 text-center mt-10">Nenhum torneio encontrado.</Text>
      ) : (
        torneios.map(torneio => (
          <View key={torneio.id} className="bg-brand-surface rounded-xl shadow-sm border border-gray-800 overflow-hidden mb-4">
            {/* Cover Image */}
            <Image 
              source={torneio.capa_url ? { uri: torneio.capa_url } : getDefaultImage(torneio.modalidade)} 
              style={{ width: '100%', height: 150 }}
              resizeMode="cover"
            />
            
            <View className="p-4">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-lg">{torneio.nome}</Text>
                  <Text className="text-gray-400 text-sm">Organizado por {torneio.usuarios?.nome || 'Desconhecido'}</Text>
                </View>
                <Tag status="agendada" label="Inscrições Abertas" />
              </View>

              {torneio.descricao ? (
                <Text className="text-gray-300 text-sm mb-3" numberOfLines={2}>
                  {torneio.descricao}
                </Text>
              ) : null}

              <View className="flex-row items-center mb-4 space-x-2">
                <View className="bg-[#262626] px-2 py-1 rounded mr-2">
                  <Text className="text-[#FFD700] text-xs font-bold uppercase">{torneio.modalidade}</Text>
                </View>
                {torneio.categoria_genero ? (
                  <View className="bg-[#262626] px-2 py-1 rounded">
                    <Text className="text-brand-electric-light text-xs font-bold uppercase">{torneio.categoria_genero}</Text>
                  </View>
                ) : null}
              </View>
              
              <Button title="Inscrever Meu Time" variant="outline" />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
