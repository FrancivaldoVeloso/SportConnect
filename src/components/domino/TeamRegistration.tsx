import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Team } from "../../types/domino";

interface TeamRegistrationProps {
  teams: Team[];
  onAddTeam: (name: string, p1: string, p2: string) => void;
  onImportTeams?: (importedTeams: Team[]) => void;
  onDeleteTeam: (id: string) => void;
  onGenerateBracket: () => void;
}

export function TeamRegistration({
  teams,
  onAddTeam,
  onImportTeams,
  onDeleteTeam,
  onGenerateBracket,
}: TeamRegistrationProps) {
  const [teamName, setTeamName] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");

  const handleSubmit = () => {
    if (!teamName.trim() || !player1.trim() || !player2.trim()) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }
    onAddTeam(teamName.trim(), player1.trim(), player2.trim());
    setTeamName("");
    setPlayer1("");
    setPlayer2("");
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.ms-excel", "text/comma-separated-values", ".csv", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      const lines = fileContent.split("\n");
      const importedTeams: Team[] = [];
      let importedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(",");
        if (columns.length >= 1) {
          const teamName = columns[0].trim();
          const player1 = columns.length > 1 ? columns[1].trim() : "Desconhecido";
          const player2 = columns.length > 2 ? columns[2].trim() : "Desconhecido";
          
          if (teamName.toLowerCase() === "nome da dupla" || teamName.toLowerCase() === "time") continue;

          if (teamName) {
            importedTeams.push({
              id: `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: teamName,
              players: [player1, player2],
              createdAt: new Date().toISOString(),
              source: "csv",
            });
            importedCount++;
          }
        }
      }
      
      if (importedTeams.length > 0 && onImportTeams) {
        onImportTeams(importedTeams);
        Alert.alert("Sucesso", `${importedCount} duplas importadas com sucesso do CSV!`);
      } else {
        Alert.alert("Aviso", "Nenhuma dupla válida encontrada no arquivo CSV.");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível importar o arquivo CSV.");
      console.error(error);
    }
  };

  return (
    <ScrollView className="flex-1 p-4 mb-10 space-y-6">
      
      {/* Importar CSV */}
      <TouchableOpacity
        onPress={handleImportCSV}
        className="bg-green-600 active:bg-green-700 rounded-2xl p-4 flex-row items-center justify-center gap-2 shadow-sm"
      >
        <Ionicons name="document-text" size={20} color="white" />
        <Text className="text-white font-bold text-sm tracking-wide">Importar de Arquivo CSV</Text>
      </TouchableOpacity>

      {/* Manual Form */}
      <View className="bg-[#e6ddca] dark:bg-[#1c1c1c] rounded-2xl p-5 border border-[#d8ccb4] dark:border-[#262626] mb-6">
        <View className="flex-row items-center gap-2 mb-4">
          <Ionicons name="person-add" size={20} color="#3B82F6" />
          <Text className="text-lg font-bold text-gray-900 dark:text-white">Nova Dupla (Manual)</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Nome da Dupla
            </Text>
            <TextInput
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Ex: Os Imbatíveis"
              placeholderTextColor="#9CA3AF"
              className="w-full px-4 py-3 rounded-xl bg-[#f2ece0] dark:bg-[#0a0a0a] border border-[#d8ccb4] dark:border-[#262626] text-sm text-[#3b342e] dark:text-white"
            />
          </View>

          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Jogador 1 (Capitão)
            </Text>
            <TextInput
              value={player1}
              onChangeText={setPlayer1}
              placeholder="Ex: Carlos Silva"
              placeholderTextColor="#9CA3AF"
              className="w-full px-4 py-3 rounded-xl bg-[#f2ece0] dark:bg-[#0a0a0a] border border-[#d8ccb4] dark:border-[#262626] text-sm text-[#3b342e] dark:text-white"
            />
          </View>

          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Jogador 2 (Parceiro)
            </Text>
            <TextInput
              value={player2}
              onChangeText={setPlayer2}
              placeholder="Ex: Roberto Souza"
              placeholderTextColor="#9CA3AF"
              className="w-full px-4 py-3 rounded-xl bg-[#f2ece0] dark:bg-[#0a0a0a] border border-[#d8ccb4] dark:border-[#262626] text-sm text-[#3b342e] dark:text-white"
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            className="w-full flex-row items-center justify-center gap-2 bg-[#2563EB] active:bg-[#1d4ed8] py-3.5 rounded-xl mt-2"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-bold text-sm tracking-wide">Adicionar Dupla</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Registered Teams Grid & Action */}
      <View className="bg-[#e6ddca] dark:bg-[#1c1c1c] rounded-2xl p-5 border border-[#d8ccb4] dark:border-[#262626]">
        <View className="flex-row items-center justify-between mb-4 flex-wrap gap-y-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="trophy" size={20} color="#F59E0B" />
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Inscritas ({teams.length})</Text>
          </View>
          {teams.length >= 2 && (
            <TouchableOpacity
              onPress={onGenerateBracket}
              className="flex-row items-center gap-2 bg-[#F59E0B] active:bg-[#d97706] px-4 py-2.5 rounded-xl"
            >
              <Ionicons name="sparkles" size={16} color="#000" />
              <Text className="text-black font-black text-xs uppercase tracking-wider">Gerar Chaves</Text>
            </TouchableOpacity>
          )}
        </View>

        {teams.length === 0 ? (
          <View className="items-center justify-center py-10 border border-dashed border-gray-300 dark:border-[#404040] rounded-xl bg-[#f2ece0] dark:bg-[#0a0a0a]">
            <Ionicons name="people" size={40} color="#9CA3AF" className="mb-2" />
            <Text className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Nenhuma dupla inscrita.</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {teams.map((team, idx) => (
              <View
                key={team.id}
                className="rounded-xl bg-[#f2ece0] dark:bg-[#0a0a0a] border border-[#d8ccb4] dark:border-[#262626] p-4 flex-col"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-[#3B82F6] tracking-widest uppercase mb-1">
                      DUPLA #{String(idx + 1).padStart(2, "0")}
                    </Text>
                    <Text className="font-bold text-lg text-[#3b342e] dark:text-white">
                      {team.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onDeleteTeam(team.id)}
                    className="p-1"
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row mt-2 pt-2 border-t border-[#d8ccb4] dark:border-[#262626]">
                  <View className="flex-1">
                    <Text className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Capitão</Text>
                    <Text className="font-medium text-gray-800 dark:text-gray-200">{team.players[0]}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Jogador 2</Text>
                    <Text className="font-medium text-gray-800 dark:text-gray-200">{team.players[1]}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {teams.length < 2 && (
          <View className="mt-4 flex-row items-start gap-2 p-3 rounded-xl bg-[#f2ece0] dark:bg-[#0a0a0a] border border-[#d8ccb4] dark:border-[#262626]">
            <Ionicons name="information-circle" size={16} color="#3B82F6" className="mt-0.5" />
            <Text className="flex-1 text-xs text-gray-600 dark:text-gray-400">
              <Text className="font-bold text-gray-800 dark:text-white block">Mínimo Requerido: </Text>
              Adicione pelo menos 2 duplas para habilitar a geração do chaveamento.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
