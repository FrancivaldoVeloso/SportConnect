import React from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Match, Team } from "../../types/domino";
import Svg, { Path } from 'react-native-svg';

const CARD_WIDTH = 180;
const CARD_HEIGHT = 70;
const H_SPACING = 60;
const V_SPACING = 40;

interface TournamentBracketProps {
  matches: Match[];
}

export function TournamentBracket({ matches }: TournamentBracketProps) {
  if (!matches || matches.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20 bg-[#e6ddca] dark:bg-[#1c1c1c] rounded-2xl border border-[#d8ccb4] dark:border-[#262626] m-4">
        <Text className="text-gray-500 dark:text-gray-400 font-bold">Chaveamento ainda não gerado.</Text>
      </View>
    );
  }

  const exportBracketPDF = async () => {
    Alert.alert('Aviso', 'A exportação em PDF desta versão está sendo reformulada.');
  };

  const calculateBracketLayout = () => {
    const phaseOrder = [
      "Dezesseis-avos de Final",
      "Oitavas de Final",
      "Quartas de Final",
      "Semifinal",
      "Final"
    ];

    const sortedMatches = [...matches];
    let startingPhaseIndex = 4;
    matches.forEach(m => {
       const idx = phaseOrder.indexOf(m.phase);
       if (idx !== -1 && idx < startingPhaseIndex) startingPhaseIndex = idx;
    });
    
    const numPhases = 5 - startingPhaseIndex; 
    const nodes: any[] = [];
    const lines: any[] = [];
    const Y_STEP = CARD_HEIGHT + V_SPACING;
    
    const buildSide = (side: 'left' | 'right', dbMatches: Match[]) => {
       const sideNodes: any[][] = [];
       const matchesCopy = [...dbMatches];
       
       for (let p = 0; p < numPhases - 1; p++) {
          const phaseName = phaseOrder[startingPhaseIndex + p];
          const matchesInPhase = Math.pow(2, numPhases - 2 - p);
          
          const phaseNodes = [];
          for (let r = 0; r < matchesInPhase; r++) {
             const matchPhaseList = matchesCopy.filter(m => m.phase === phaseName);
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
    
    const leftMatches: Match[] = [];
    const rightMatches: Match[] = [];
    
    for (let p = 0; p < numPhases - 1; p++) {
       const phaseName = phaseOrder[startingPhaseIndex + p];
       const phaseMatches = sortedMatches.filter(m => m.phase === phaseName);
       const half = Math.pow(2, numPhases - 2 - p);
       leftMatches.push(...phaseMatches.slice(0, half));
       rightMatches.push(...phaseMatches.slice(half));
    }
    
    const leftSideNodes = buildSide('left', leftMatches);
    const rightSideNodes = buildSide('right', rightMatches);
    
    const finalMatches = sortedMatches.filter(m => m.phase === 'Final');
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

  const renderTeam = (team: Team, score: number, winnerId?: string, isPlaceholder?: boolean) => {
    const isWinner = winnerId === team.id;
    return (
      <View className={`flex-row justify-between items-center mt-1`}>
        <Text 
          className={`text-xs font-semibold flex-1 ${isPlaceholder ? 'text-gray-600 italic' : 'text-gray-900 dark:text-white'} ${isWinner ? 'font-bold' : ''}`} 
          numberOfLines={1}
        >
          {isPlaceholder ? 'A Definir' : team.name}
        </Text>
        {!isPlaceholder && (
          <Text className={`text-sm font-black ml-1 ${isWinner ? 'text-brand-primary dark:text-brand-electric-light' : 'text-gray-500'}`}>
            {score}
          </Text>
        )}
      </View>
    );
  };

  const renderMatchCard = (node: any, index: number) => {
    const { x, y, match, phase } = node;
    const isFinished = match?.status === 'COMPLETED';
    const isLive = match?.status === 'LIVE';

    const teamA = match?.teamA;
    const teamB = match?.teamB;
    const isPlaceholderA = teamA?.id?.startsWith("placeholder-") || teamA?.id === "bye";
    const isPlaceholderB = teamB?.id?.startsWith("placeholder-") || teamB?.id === "bye";
    const isByeMatch = isFinished && isPlaceholderB; 

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
        className="bg-[#e6ddca] dark:bg-[#1c1c1c] rounded-xl border border-[#d8ccb4] dark:border-[#262626] overflow-hidden"
      >
        <View className={`px-2 py-1 flex-row justify-between items-center ${isLive ? 'bg-red-500/20' : 'bg-gray-200 dark:bg-[#0a0a0a]'}`}>
          <Text className={`text-[9px] font-bold ${isLive ? 'text-red-500' : 'text-gray-600 dark:text-gray-500'}`}>
            {match ? (isByeMatch ? 'BYE' : (isLive ? 'AO VIVO' : isFinished ? 'ENCERRADO' : 'AGENDADO')) : phase.toUpperCase()}
          </Text>
          {match && <Text className="text-gray-500 text-[9px]">Mesa {match.tableNumber}</Text>}
        </View>

        <View className="p-2 flex-1 justify-center">
          {match ? (
            <>
              {renderTeam(teamA, match.scoreA, match.winnerId, isPlaceholderA)}
              {!isByeMatch && renderTeam(teamB, match.scoreB, match.winnerId, isPlaceholderB)}
            </>
          ) : (
            <>
              <Text className="text-gray-500 text-xs font-semibold">A Definir</Text>
              <Text className="text-gray-500 text-xs font-semibold mt-1">A Definir</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const { nodes, lines, width, height } = calculateBracketLayout();

  return (
    <View className="flex-1">
      <View className="px-4 py-3 bg-[#e6ddca] dark:bg-[#1c1c1c] border-b border-[#d8ccb4] dark:border-brand-border-focus flex-row justify-between items-center">
        <Text className="text-gray-900 dark:text-white font-bold">Chaveamento do Torneio</Text>
        <TouchableOpacity onPress={exportBracketPDF} className="flex-row items-center bg-brand-primary dark:bg-brand-electric-light px-4 py-2 rounded-lg">
          <Ionicons name="document-text" size={16} color="white" />
          <Text className="text-white font-bold text-xs ml-2 uppercase">PDF</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal className="flex-1 bg-[#f2ece0] dark:bg-[#121212]" bounces={false}>
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
    </View>
  );
}
