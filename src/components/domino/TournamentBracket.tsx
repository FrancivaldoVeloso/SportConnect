import React from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Match, Team } from "../../types/domino";

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

  // Group matches by phase (Round code approximation)
  // To keep things ordered: 
  // We can group by phase string and render columns
  
  const matchesByPhase = matches.reduce((acc, match) => {
    if (!acc[match.phase]) {
      acc[match.phase] = [];
    }
    acc[match.phase].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Approximate order: Quarter-finals -> Semi-finals -> Final
  // Better yet, just use the built-in id comparison logic from domino context.
  const phaseOrder = [
    "Dezesseis-avos de Final",
    "Oitavas de Final",
    "Quartas de Final",
    "Semifinal",
    "Final"
  ];
  
  const phases = Object.keys(matchesByPhase).sort((a, b) => {
    let indexA = phaseOrder.indexOf(a);
    let indexB = phaseOrder.indexOf(b);
    if(indexA === -1) indexA = 0;
    if(indexB === -1) indexB = 0;
    return indexA - indexB;
  });

  const exportBracketPDF = async () => {
    try {
      let html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
              .title { font-size: 28px; font-weight: bold; color: #1c1c1c; margin: 0; }
              .bracket-container { display: flex; flex-direction: row; gap: 40px; overflow-x: auto; }
              .phase-column { width: 250px; display: flex; flex-direction: column; gap: 20px; }
              .phase-title { background: #2563EB; color: white; padding: 10px; text-align: center; font-weight: bold; border-radius: 8px 8px 0 0; text-transform: uppercase; font-size: 12px; }
              .match-box { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }
              .match-header { background: #f3f4f6; padding: 5px 10px; font-size: 10px; font-weight: bold; color: #6b7280; text-transform: uppercase; display: flex; justify-content: space-between; }
              .team-row { display: flex; justify-content: space-between; padding: 10px; border-top: 1px solid #e5e7eb; }
              .winner { font-weight: bold; color: #2563EB; background: #eff6ff; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">CHAVEAMENTO DO TORNEIO</h1>
              <p>SportConnect - Tabela de Jogos Oficial</p>
            </div>
            <div class="bracket-container">
      `;

      phases.forEach(phase => {
        html += `<div class="phase-column">`;
        html += `<div class="phase-title">${phase}</div>`;
        matchesByPhase[phase].forEach(match => {
          const teamA = match.teamA;
          const teamB = match.teamB;
          const isWinnerA = match.winnerId === teamA.id;
          const isWinnerB = match.winnerId === teamB.id;
          const nameA = teamA.id.startsWith("placeholder-") || teamA.id === "bye" ? "A Definir" : teamA.name;
          const nameB = teamB.id.startsWith("placeholder-") || teamB.id === "bye" ? "A Definir" : teamB.name;
          
          html += `
            <div class="match-box">
              <div class="match-header"><span>Mesa ${match.tableNumber}</span><span>${match.status === 'COMPLETED' ? 'Fim' : match.status === 'LIVE' ? 'Ao Vivo' : ''}</span></div>
              <div class="team-row ${isWinnerA ? 'winner' : ''}"><span>${nameA}</span><span>${match.scoreA}</span></div>
              <div class="team-row ${isWinnerB ? 'winner' : ''}"><span>${nameB}</span><span>${match.scoreB}</span></div>
            </div>
          `;
        });
        html += `</div>`;
      });

      html += `
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartilhar Chaveamento' });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o PDF do chaveamento.");
    }
  };

  const renderTeam = (team: Team, score: number, winnerId?: string, isPlaceholder?: boolean) => {
    const isWinner = winnerId === team.id;
    return (
      <View className={`flex-row justify-between items-center p-2 border-b border-[#d8ccb4] dark:border-[#262626] ${isWinner ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
        <Text 
          className={`text-xs ${isPlaceholder ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'} ${isWinner ? 'font-bold text-[#2563EB]' : ''}`} 
          numberOfLines={1}
        >
          {team.name}
        </Text>
        <Text className={`text-xs font-bold ${isWinner ? 'text-[#2563EB]' : 'text-gray-500'}`}>
          {score}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <View className="px-4 py-3 bg-[#e6ddca] dark:bg-[#1c1c1c] border-b border-[#d8ccb4] dark:border-brand-border-focus flex-row justify-between items-center">
        <Text className="text-gray-900 dark:text-white font-bold">Chaveamento do Torneio</Text>
        <TouchableOpacity onPress={exportBracketPDF} className="flex-row items-center bg-[#2563EB] px-4 py-2 rounded-lg">
          <Ionicons name="document-text" size={16} color="white" />
          <Text className="text-white font-bold text-xs ml-2 uppercase">Exportar PDF</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal className="flex-1 bg-[#f2ece0] dark:bg-[#0a0a0a] p-4">
        <View className="flex-row items-start space-x-6">
        {phases.map((phase) => (
          <View key={phase} className="w-64 space-y-4">
            <View className="bg-[#2563EB] py-2 rounded-t-xl mb-2 items-center">
              <Text className="text-white font-bold uppercase text-xs tracking-widest">{phase}</Text>
            </View>
            
            <View className="flex-col justify-around h-full space-y-6">
              {matchesByPhase[phase].map((match) => (
                <View 
                  key={match.id} 
                  className="bg-[#e6ddca] dark:bg-[#1c1c1c] border border-[#d8ccb4] dark:border-brand-border-focus rounded-lg overflow-hidden shadow-sm"
                >
                  <View className="bg-gray-100 dark:bg-[#262626] px-2 py-1 flex-row justify-between items-center">
                    <Text className="text-[10px] text-gray-500 uppercase font-bold">Mesa {match.tableNumber}</Text>
                    {match.status === "LIVE" && (
                      <Text className="text-[10px] text-red-500 font-bold uppercase">Ao Vivo</Text>
                    )}
                    {match.status === "COMPLETED" && (
                      <Text className="text-[10px] text-green-500 font-bold uppercase">Fim</Text>
                    )}
                  </View>
                  
                  <View>
                    {renderTeam(match.teamA, match.scoreA, match.winnerId, match.teamA.id.startsWith("placeholder-") || match.teamA.id === "bye")}
                    {renderTeam(match.teamB, match.scoreB, match.winnerId, match.teamB.id.startsWith("placeholder-") || match.teamB.id === "bye")}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
      </ScrollView>
    </View>
  );
}
