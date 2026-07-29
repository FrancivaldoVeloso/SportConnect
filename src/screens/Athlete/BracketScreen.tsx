import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Svg, { Path } from 'react-native-svg';

const CARD_WIDTH = 180;
const CARD_HEIGHT = 70;
const H_SPACING = 60;
const V_SPACING = 40;

export function BracketScreen({ route, navigation }: any) {
  const { torneioId } = route.params;
  const [partidas, setPartidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartidas();

    const subscription = supabase
      .channel('partidas_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partidas',
          filter: `torneio_id=eq.${torneioId}`
        },
        () => {
          fetchPartidas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchPartidas = async () => {
    try {
      const { data, error } = await supabase
        .from('partidas')
        .select(`
          *,
          timeA:time_a_id(nome),
          timeB:time_b_id(nome)
        `)
        .eq('torneio_id', torneioId)
        .order('fase_torneio', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPartidas(data || []);
    } catch (error) {
      console.error("Erro ao buscar partidas:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBracketLayout = () => {
    const phaseOrder = ['Dezesseis-avos de Final', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];
    const sortedMatches = [...partidas];
    
    let startingPhaseIndex = 4;
    partidas.forEach(m => {
       const idx = phaseOrder.indexOf(m.fase_torneio);
       if (idx !== -1 && idx < startingPhaseIndex) startingPhaseIndex = idx;
    });
    
    const numPhases = 5 - startingPhaseIndex; 
    
    const nodes: any[] = [];
    const lines: any[] = [];
    
    const Y_STEP = CARD_HEIGHT + V_SPACING;
    
    const buildSide = (side: 'left' | 'right', dbMatches: any[]) => {
       const sideNodes: any[][] = [];
       const matchesCopy = [...dbMatches];
       
       for (let p = 0; p < numPhases - 1; p++) {
          const phaseName = phaseOrder[startingPhaseIndex + p];
          const matchesInPhase = Math.pow(2, numPhases - 2 - p);
          
          const phaseNodes = [];
          for (let r = 0; r < matchesInPhase; r++) {
             const matchPhaseList = matchesCopy.filter(m => m.fase_torneio === phaseName);
             const match = matchPhaseList.length > 0 ? matchPhaseList[0] : null;
             if (match) {
                const idx = matchesCopy.indexOf(match);
                matchesCopy.splice(idx, 1);
             }
             
             let x = side === 'left' ? p * (CARD_WIDTH + H_SPACING) : (2 * (numPhases - 1) - p) * (CARD_WIDTH + H_SPACING);
             let y = 0;
             
             if (p === 0) {
                y = r * Y_STEP;
             } else {
                if (sideNodes[p-1] && sideNodes[p-1].length > r*2 + 1) {
                   const child1 = sideNodes[p-1][r*2];
                   const child2 = sideNodes[p-1][r*2 + 1];
                   y = (child1.y + child2.y) / 2;
                   
                   const startX1 = side === 'left' ? child1.x + CARD_WIDTH : child1.x;
                   const startX2 = side === 'left' ? child2.x + CARD_WIDTH : child2.x;
                   const endX = side === 'left' ? x : x + CARD_WIDTH;
                   const midX = (startX1 + endX) / 2;
                   
                   lines.push({
                      d: `M ${startX1} ${child1.y + CARD_HEIGHT/2} L ${midX} ${child1.y + CARD_HEIGHT/2} L ${midX} ${y + CARD_HEIGHT/2} L ${endX} ${y + CARD_HEIGHT/2}`,
                      key: `line_${side}_${p}_${r}_1`
                   });
                   lines.push({
                      d: `M ${startX2} ${child2.y + CARD_HEIGHT/2} L ${midX} ${child2.y + CARD_HEIGHT/2} L ${midX} ${y + CARD_HEIGHT/2} L ${endX} ${y + CARD_HEIGHT/2}`,
                      key: `line_${side}_${p}_${r}_2`
                   });
                } else {
                   y = r * Y_STEP * Math.pow(2, p);
                }
             }
             
             const node = { x, y, match, side, phase: phaseName, row: r };
             phaseNodes.push(node);
             nodes.push(node);
          }
          sideNodes.push(phaseNodes);
       }
       return sideNodes;
    };
    
    if (numPhases <= 1) {
       const finalMatch = sortedMatches.length > 0 ? sortedMatches[0] : null;
       nodes.push({ x: 0, y: 0, match: finalMatch, side: 'center', phase: 'Final', row: 0 });
       return { nodes, lines, width: CARD_WIDTH + 40, height: CARD_HEIGHT + 40 };
    }
    
    const leftMatches: any[] = [];
    const rightMatches: any[] = [];
    
    for (let p = 0; p < numPhases - 1; p++) {
       const phaseName = phaseOrder[startingPhaseIndex + p];
       const phaseMatches = sortedMatches.filter(m => m.fase_torneio === phaseName);
       const half = Math.pow(2, numPhases - 2 - p);
       leftMatches.push(...phaseMatches.slice(0, half));
       rightMatches.push(...phaseMatches.slice(half));
    }
    
    const leftSideNodes = buildSide('left', leftMatches);
    const rightSideNodes = buildSide('right', rightMatches);
    
    const finalMatches = sortedMatches.filter(m => m.fase_torneio === 'Final');
    const finalMatch = finalMatches.length > 0 ? finalMatches[0] : null;
    
    let finalX = (numPhases - 1) * (CARD_WIDTH + H_SPACING);
    let finalY = 0;
    
    if (leftSideNodes.length > 0 && leftSideNodes[numPhases-2].length > 0) {
       finalY = leftSideNodes[numPhases-2][0].y;
    }
    
    const finalNode = { x: finalX, y: finalY, match: finalMatch, side: 'center', phase: 'Final', row: 0 };
    nodes.push(finalNode);
    
    if (leftSideNodes.length > 0 && rightSideNodes.length > 0 && leftSideNodes[numPhases-2].length > 0 && rightSideNodes[numPhases-2].length > 0) {
       const lNode = leftSideNodes[numPhases-2][0];
       const rNode = rightSideNodes[numPhases-2][0];
       
       lines.push({
          d: `M ${lNode.x + CARD_WIDTH} ${lNode.y + CARD_HEIGHT/2} L ${finalX} ${finalY + CARD_HEIGHT/2}`,
          key: `line_final_left`
       });
       lines.push({
          d: `M ${rNode.x} ${rNode.y + CARD_HEIGHT/2} L ${finalX + CARD_WIDTH} ${finalY + CARD_HEIGHT/2}`,
          key: `line_final_right`
       });
    }
    
    let maxX = 0;
    let maxY = 0;
    nodes.forEach(n => {
       if (n.x > maxX) maxX = n.x;
       if (n.y > maxY) maxY = n.y;
    });
    
    return { nodes, lines, width: maxX + CARD_WIDTH + 40, height: Math.max(maxY + CARD_HEIGHT + 40, Dimensions.get('window').height) };
  };

  const renderMatchCard = (node: any, index: number) => {
    const { x, y, match, phase } = node;
    
    const isFinished = match?.status === 'encerrada' || match?.status === 'finalizada';
    const isLive = match?.status === 'em_andamento';
    const isBye = (match?.status === 'encerrada' || match?.status === 'finalizada') && !match?.time_b_id && match?.time_a_id;

    return (
      <View 
        key={`node_${index}`}
        style={{
          position: 'absolute',
          left: x + 20,
          top: y + 20,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        }}
        className="bg-[#1c1c1c] rounded-xl border border-[#262626] overflow-hidden"
      >
        <View className={`px-2 py-1 flex-row justify-between items-center ${isLive ? 'bg-[#FF7A00]/20' : 'bg-[#0a0a0a]'}`}>
          <Text className={`text-[9px] font-bold ${isLive ? 'text-[#FF7A00]' : 'text-gray-500'}`}>
            {match ? (isBye ? 'BYE' : (isLive ? 'AO VIVO' : isFinished ? 'ENCERRADO' : 'AGENDADO')) : phase.toUpperCase()}
          </Text>
          {match && <Text className="text-gray-600 text-[9px]">{match.id.substring(0, 5)}</Text>}
        </View>

        <View className="p-2 flex-1 justify-center">
          <View className="flex-row justify-between items-center">
            <Text className="text-white text-xs font-semibold flex-1" numberOfLines={1}>
              {match ? (match.timeA?.nome || 'A Definir') : 'A Definir'}
            </Text>
            {match && !isBye && (
              <Text className={`text-sm font-black ml-1 ${match.placar_a > match.placar_b && isFinished ? 'text-[#FFD700]' : 'text-gray-400'}`}>
                {match.placar_a}
              </Text>
            )}
          </View>
          
          <View className="flex-row justify-between items-center mt-1">
            <Text className={`text-xs font-semibold flex-1 ${isBye ? 'text-gray-600 italic' : 'text-white'}`} numberOfLines={1}>
              {match ? (isBye ? '' : (match.timeB?.nome || 'A Definir')) : 'A Definir'}
            </Text>
            {match && !isBye && (
              <Text className={`text-sm font-black ml-1 ${match.placar_b > match.placar_a && isFinished ? 'text-[#FFD700]' : 'text-gray-400'}`}>
                {match.placar_b}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const exportBracketPDF = () => {
    Alert.alert('Aviso', 'A exportação em PDF do chaveamento em árvore será disponibilizada em breve.');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0a0a0a] justify-center items-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </SafeAreaView>
    );
  }

  const { nodes, lines, width, height } = calculateBracketLayout();

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]">
      {/* Header Fixo */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#1c1c1c] z-10 bg-[#0a0a0a]">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#888" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Chaveamento</Text>
        </View>
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity onPress={exportBracketPDF} className="bg-[#262626] p-2 rounded-full border border-[#333]">
             <Ionicons name="document-text" size={18} color="#FFD700" />
          </TouchableOpacity>
          <View className="flex-row items-center ml-2">
            <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            <Text className="text-green-500 text-xs font-bold">CONECTADO</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal className="flex-1 bg-[#121212]" bounces={false}>
        <ScrollView className="flex-1" bounces={false}>
          <View style={{ width, height, position: 'relative', padding: 20 }}>
            <Svg style={{ position: 'absolute', top: 20, left: 20 }} width={width} height={height}>
              {lines.map(line => (
                <Path
                  key={line.key}
                  d={line.d}
                  stroke="#333333"
                  strokeWidth="2"
                  fill="none"
                />
              ))}
            </Svg>
            {nodes.map((node, index) => renderMatchCard(node, index))}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
