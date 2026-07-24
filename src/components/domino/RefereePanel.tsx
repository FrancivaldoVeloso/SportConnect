import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Match, Round } from "../../types/domino";
import { supabase } from '../../services/supabase';

interface RefereePanelProps {
  matches: Match[];
  onUpdateScore: (matchId: string, teamAScore: number, teamBScore: number) => void;
  onSubtractPoint: (matchId: string, teamId: string) => void;
  onAddRound: (matchId: string, round: Round, limit: number) => void;
  onStartMatch: (matchId: string) => void;
  onFinishMatch: (matchId: string, winnerId: string) => void;
}

export function RefereePanel({
  matches,
  onSubtractPoint,
  onAddRound,
  onStartMatch,
  onFinishMatch,
}: RefereePanelProps) {
  const TARGET_SCORE = 4;
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [doublePoints, setDoublePoints] = useState<boolean>(false);

  const activeMatches = matches.filter((m) => m.status === "LIVE");
  const pendingMatches = matches.filter((m) => m.status === "SCHEDULED");
  const completedMatches = matches.filter((m) => m.status === "COMPLETED");

  useEffect(() => {
    if (!selectedMatchId) {
      if (activeMatches.length > 0) setSelectedMatchId(activeMatches[0].id);
      else if (pendingMatches.length > 0) setSelectedMatchId(pendingMatches[0].id);
      else if (completedMatches.length > 0) setSelectedMatchId(completedMatches[0].id);
    }
  }, [matches, activeMatches, pendingMatches, completedMatches, selectedMatchId]);

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  const isBestOf3 = selectedMatch ? selectedMatch.phase.toLowerCase() === "semifinal" : false;
  const scoreA = selectedMatch ? selectedMatch.scoreA : 0;
  const scoreB = selectedMatch ? selectedMatch.scoreB : 0;
  const setsA = selectedMatch ? selectedMatch.setsA || 0 : 0;
  const setsB = selectedMatch ? selectedMatch.setsB || 0 : 0;

  const isMatchFinished = selectedMatch
    ? isBestOf3
      ? setsA >= 2 || setsB >= 2
      : scoreA >= TARGET_SCORE || scoreB >= TARGET_SCORE
    : false;

  const matchWinnerName = selectedMatch
    ? isBestOf3
      ? setsA >= 2
        ? selectedMatch.teamA.name
        : selectedMatch.teamB.name
      : scoreA >= TARGET_SCORE
      ? selectedMatch.teamA.name
      : selectedMatch.teamB.name
    : "";

  const matchWinnerId = selectedMatch
    ? isBestOf3
      ? setsA >= 2
        ? selectedMatch.teamA.id
        : selectedMatch.teamB.id
      : scoreA >= TARGET_SCORE
      ? selectedMatch.teamA.id
      : selectedMatch.teamB.id
    : "";

  const handleAddPoints = (winnerTeamId: string, points: number, note?: string) => {
    if (!selectedMatch || isMatchFinished) return;
    const finalPoints = doublePoints ? points * 2 : points;
    const roundNum = (selectedMatch.detailedScore?.rounds?.length || 0) + 1;
    const noteText = doublePoints ? (note ? `${note} (Dobro)` : "Jogo Fechado (Dobro)") : note;

    const newRound: Round = {
      roundNumber: roundNum,
      winnerTeamId,
      pointsGenerated: finalPoints,
      note: noteText,
    };
    onAddRound(selectedMatch.id, newRound, TARGET_SCORE);
    setDoublePoints(false);
  };

  const handleCompleteMatch = () => {
    if (!selectedMatch || !isMatchFinished) return;
    onFinishMatch(selectedMatch.id, matchWinnerId);
  };

  const gerarHTMLSumulaDomino = (partida: Match) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    
    let roundsHtml = '';
    if (partida.detailedScore?.rounds && partida.detailedScore.rounds.length > 0) {
      roundsHtml = `
        <div class="section-title">DETALHES DAS BATIDAS</div>
        <table class="set-table">
          <tr><th>Rodada</th><th>Vencedor</th><th>Pontos</th><th>Nota</th></tr>
          ${partida.detailedScore.rounds.map((round) => {
            const teamName = round.winnerTeamId === partida.teamA.id ? partida.teamA.name : partida.teamB.name;
            return `
              <tr>
                <td>${round.roundNumber}</td>
                <td>${teamName}</td>
                <td>+${round.pointsGenerated}</td>
                <td>${round.note || '-'}</td>
              </tr>
            `;
          }).join('')}
        </table>
      `;
    }

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #F59E0B; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #1c1c1c; margin: 0; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
            .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #4b5563; }
            .score-container { display: flex; justify-content: space-around; text-align: center; margin: 40px 0; }
            .team-box { flex: 1; padding: 20px; }
            .team-name { font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 15px; }
            .sets-won { font-size: 64px; font-weight: 900; color: #F59E0B; line-height: 1; margin: 0; }
            .vs { font-size: 32px; font-weight: bold; color: #9ca3af; padding-top: 40px; }
            .winner-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 40px; }
            .winner-text { font-size: 20px; font-weight: bold; color: #b45309; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; color: #1f2937; }
            .set-table { border-collapse: collapse; margin-bottom: 30px; width: 100%; }
            .set-table th, .set-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: center; }
            .set-table th { background: #f3f4f6; color: #374151; font-weight: bold; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">SÚMULA DE DOMINÓ</h1>
            <div class="subtitle">SportConnect - Aplicativo Oficial de Gestão Esportiva</div>
          </div>
          
          <div class="info-box">
            <div class="info-row"><span class="info-label">Fase:</span> <span>${partida.phase} - Mesa ${partida.tableNumber}</span></div>
            <div class="info-row"><span class="info-label">Data e Hora:</span> <span>${dataHora}</span></div>
            <div class="info-row"><span class="info-label">Status:</span> <span>${partida.status}</span></div>
          </div>

          <div class="score-container">
            <div class="team-box">
              <div class="team-name">${partida.teamA.name}</div>
              <p class="sets-won">${partida.scoreA}</p>
              <p style="color: #6b7280; font-weight: bold; margin-top: 10px;">PONTOS</p>
            </div>
            <div class="vs">X</div>
            <div class="team-box">
              <div class="team-name">${partida.teamB.name}</div>
              <p class="sets-won">${partida.scoreB}</p>
              <p style="color: #6b7280; font-weight: bold; margin-top: 10px;">PONTOS</p>
            </div>
          </div>

          ${partida.status === 'COMPLETED' ? `
          <div class="winner-box">
            <span class="winner-text">🏆 VENCEDOR: ${partida.winnerId === partida.teamA.id ? partida.teamA.name : partida.teamB.name} 🏆</span>
          </div>
          ` : ''}

          ${roundsHtml}

          <div class="footer">
            Documento gerado automaticamente pelo sistema SportConnect em ${dataHora}.<br/>
            As informações contidas nesta súmula são de responsabilidade do árbitro e organizador do evento.
          </div>
        </body>
      </html>
    `;
  };

  const exportarSumulaPDF = async (partida: Match) => {
    try {
      const html = gerarHTMLSumulaDomino(partida);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartilhar Súmula' });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar ou compartilhar o PDF da súmula.');
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "LIVE") return <Text className="text-red-500 font-bold text-[10px]">AO VIVO</Text>;
    if (status === "SCHEDULED") return <Text className="text-gray-500 font-bold text-[10px]">AGENDADA</Text>;
    return <Text className="text-[#F59E0B] font-bold text-[10px]">FINALIZADA</Text>;
  };

  const handleSendPush = async () => {
    if (!selectedMatch) return;
    
    Alert.alert("Enviando Notificação", "Aguarde...");

    try {
      const capitaesIds = [selectedMatch.teamA.capitaoId, selectedMatch.teamB.capitaoId].filter(Boolean);
      
      if (capitaesIds.length === 0) {
        Alert.alert("Aviso", "Nenhum capitão registrado para os times desta partida.");
        return;
      }

      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('expo_push_token')
        .in('id', capitaesIds)
        .not('expo_push_token', 'is', null);

      if (error) throw error;

      if (!usuarios || usuarios.length === 0) {
        Alert.alert("Aviso", "Os capitães não possuem tokens de notificação registrados.");
        return;
      }

      for (const usuario of usuarios) {
        const message = {
          to: usuario.expo_push_token,
          sound: 'default',
          title: 'Sua Partida Vai Começar!',
          body: `Dirija-se à Mesa ${selectedMatch.tableNumber}. ${selectedMatch.teamA.name} vs ${selectedMatch.teamB.name}`,
          data: { matchId: selectedMatch.id },
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
      }

      Alert.alert("Sucesso", "Notificações enviadas aos capitães!");

    } catch (error) {
      console.error("Erro ao enviar push:", error);
      Alert.alert("Erro", "Não foi possível enviar a notificação.");
    }
  };

  return (
    <ScrollView className="flex-1 p-4 mb-10 space-y-6">
      <Text className="font-bold text-xl text-gray-900 dark:text-white uppercase">Arbitragem</Text>
      
      {/* Matches Selector */}
      <View className="h-48 border border-[#d8ccb4] dark:border-[#262626] rounded-xl bg-[#e6ddca] dark:bg-[#1c1c1c] p-2">
        <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-2">Confrontos</Text>
        <ScrollView>
          {matches.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => {
                setSelectedMatchId(m.id);
                setDoublePoints(false);
              }}
              className={`p-3 rounded-lg border mb-2 ${
                selectedMatchId === m.id
                  ? "bg-[#2563EB] border-[#2563EB]"
                  : "bg-[#e6ddca] dark:bg-[#0a0a0a] border-[#d8ccb4] dark:border-[#262626]"
              }`}
            >
              <View className="flex-row justify-between mb-1">
                <Text className={`text-[10px] font-bold ${selectedMatchId === m.id ? "text-blue-200" : "text-gray-500"}`}>
                  MESA {m.tableNumber} • {m.phase}
                </Text>
                {renderStatusBadge(m.status)}
              </View>
              <Text className={`font-bold ${selectedMatchId === m.id ? "text-white" : "text-gray-800 dark:text-white"}`}>
                {m.teamA.name} vs {m.teamB.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Selected Match Panel */}
      {selectedMatch ? (
        <View className="bg-[#e6ddca] dark:bg-[#1c1c1c] rounded-2xl p-5 border border-[#d8ccb4] dark:border-[#262626]">
          <View className="items-center mb-6">
            <Text className="text-xs font-bold text-[#3B82F6] uppercase tracking-widest mb-1">
              Mesa {selectedMatch.tableNumber} • {selectedMatch.phase}
            </Text>
            {renderStatusBadge(selectedMatch.status)}
          </View>

          {selectedMatch.status === "SCHEDULED" ? (
            <View className="items-center py-10">
              <Ionicons name="time" size={40} color="#9CA3AF" />
              <Text className="text-gray-800 dark:text-white font-bold text-lg mt-2 uppercase">Confronto Agendado</Text>
              <View className="flex-row items-center justify-center space-x-4 mt-6">
                <TouchableOpacity
                  onPress={() => onStartMatch(selectedMatch.id)}
                  className="bg-[#2563EB] active:bg-[#1d4ed8] px-6 py-3 rounded-xl flex-row items-center gap-2"
                >
                  <Ionicons name="play" size={18} color="white" />
                  <Text className="text-white font-bold uppercase">Iniciar Partida</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSendPush}
                  className="bg-[#10B981] active:bg-[#059669] px-4 py-3 rounded-xl flex-row items-center gap-2"
                >
                  <Ionicons name="notifications" size={18} color="white" />
                  <Text className="text-white font-bold uppercase">Notificar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-6">
                {/* Team A */}
                <View className="flex-1 items-center bg-[#e6ddca] dark:bg-[#0a0a0a] p-4 rounded-xl border border-[#d8ccb4] dark:border-[#262626]">
                  <Text className="text-xs font-bold text-[#3B82F6] mb-1">CASA</Text>
                  <Text className="font-bold text-gray-800 dark:text-white text-center h-10 mb-2">{selectedMatch.teamA.name}</Text>
                  <Text className="text-5xl font-black text-gray-800 dark:text-white">{scoreA}</Text>
                  {isBestOf3 && <Text className="text-xs mt-2 text-gray-500 font-bold">Sets: {setsA}</Text>}
                  
                  {selectedMatch.status === "LIVE" && (
                    <View className="w-full mt-4 space-y-2">
                      <TouchableOpacity onPress={() => handleAddPoints(selectedMatch.teamA.id, 1)} disabled={isMatchFinished} className="bg-gray-100 dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#262626] py-2 rounded-lg items-center">
                        <Text className="font-bold text-gray-800 dark:text-white text-xs">+1 Ponto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleAddPoints(selectedMatch.teamA.id, 2, "Lá e Lô")} disabled={isMatchFinished} className="bg-gray-100 dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#262626] py-2 rounded-lg items-center">
                        <Text className="font-bold text-[#3B82F6] text-xs">+2 Pontos</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onSubtractPoint(selectedMatch.id, selectedMatch.teamA.id)} disabled={isMatchFinished || scoreA <= 0} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 py-2 rounded-lg items-center">
                        <Text className="font-bold text-red-600 dark:text-red-400 text-xs">-1 Ponto</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View className="px-3 items-center">
                  <Text className="font-black text-gray-400 text-xl">VS</Text>
                  {selectedMatch.status === "LIVE" && !isMatchFinished && (
                    <TouchableOpacity onPress={() => setDoublePoints(!doublePoints)} className={`mt-4 p-2 rounded-lg border ${doublePoints ? 'bg-[#F59E0B]/20 border-[#F59E0B]' : 'bg-transparent border-gray-300 dark:border-[#262626]'}`}>
                      <Text className={`text-[9px] font-bold ${doublePoints ? 'text-[#F59E0B]' : 'text-gray-500'}`}>DOBRO</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Team B */}
                <View className="flex-1 items-center bg-[#e6ddca] dark:bg-[#0a0a0a] p-4 rounded-xl border border-[#d8ccb4] dark:border-[#262626]">
                  <Text className="text-xs font-bold text-[#F59E0B] mb-1">VISITANTE</Text>
                  <Text className="font-bold text-gray-800 dark:text-white text-center h-10 mb-2">{selectedMatch.teamB.name}</Text>
                  <Text className="text-5xl font-black text-gray-800 dark:text-white">{scoreB}</Text>
                  {isBestOf3 && <Text className="text-xs mt-2 text-gray-500 font-bold">Sets: {setsB}</Text>}

                  {selectedMatch.status === "LIVE" && (
                    <View className="w-full mt-4 space-y-2">
                      <TouchableOpacity onPress={() => handleAddPoints(selectedMatch.teamB.id, 1)} disabled={isMatchFinished} className="bg-gray-100 dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#262626] py-2 rounded-lg items-center">
                        <Text className="font-bold text-gray-800 dark:text-white text-xs">+1 Ponto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleAddPoints(selectedMatch.teamB.id, 2, "Lá e Lô")} disabled={isMatchFinished} className="bg-gray-100 dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#262626] py-2 rounded-lg items-center">
                        <Text className="font-bold text-[#F59E0B] text-xs">+2 Pontos</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onSubtractPoint(selectedMatch.id, selectedMatch.teamB.id)} disabled={isMatchFinished || scoreB <= 0} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 py-2 rounded-lg items-center">
                        <Text className="font-bold text-red-600 dark:text-red-400 text-xs">-1 Ponto</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {selectedMatch.status === "LIVE" && isMatchFinished && (
                <View className="bg-[#EA580C] py-4 rounded-xl items-center mb-4 shadow-lg shadow-orange-500/20">
                  <Text className="font-black text-white uppercase tracking-wider">🏆 VITÓRIA: {matchWinnerName}</Text>
                </View>
              )}

              {selectedMatch.status === "LIVE" && (
                <TouchableOpacity
                  onPress={handleCompleteMatch}
                  disabled={!isMatchFinished}
                  className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${isMatchFinished ? "bg-[#2563EB]" : "bg-gray-300 dark:bg-[#262626]"}`}
                >
                  <Ionicons name="checkmark-circle" size={20} color={isMatchFinished ? "white" : "#9CA3AF"} />
                  <Text className={`font-bold uppercase tracking-wider ${isMatchFinished ? "text-white" : "text-gray-500"}`}>
                    Encerrar e Enviar Resultado
                  </Text>
                </TouchableOpacity>
              )}

              {selectedMatch.status === "COMPLETED" && (
                <View>
                  <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 py-4 rounded-xl items-center mb-4">
                    <Text className="font-black text-green-700 dark:text-green-400 uppercase tracking-wider">✅ PARTIDA FINALIZADA</Text>
                    <Text className="text-green-600 dark:text-green-300 text-xs mt-1">Vencedor: {selectedMatch.winnerId === selectedMatch.teamA.id ? selectedMatch.teamA.name : selectedMatch.teamB.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => exportarSumulaPDF(selectedMatch)} className="bg-[#EA580C] py-4 rounded-xl items-center flex-row justify-center shadow-sm">
                    <Ionicons name="document-text" size={20} color="#fff" className="mr-2" />
                    <Text className="text-white font-bold ml-2">Exportar PDF da Súmula</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      ) : (
        <View className="items-center py-10 bg-[#e6ddca] dark:bg-[#1c1c1c] rounded-2xl border border-[#d8ccb4] dark:border-[#262626]">
          <Ionicons name="clipboard" size={40} color="#9CA3AF" />
          <Text className="text-gray-500 dark:text-gray-400 mt-2 font-bold">Nenhum confronto selecionado</Text>
        </View>
      )}
    </ScrollView>
  );
}
