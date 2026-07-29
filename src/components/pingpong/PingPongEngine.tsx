import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StyleSheet, Modal, Share, useColorScheme, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { PartidaVolei as PartidaPingPong, JogoChaveamento } from './PingPongTypes';
import { computarPonto, subtrairPonto, encerrarPartidaManualmente } from './motorPingPong';
import { supabase } from '../../services/supabase';

interface TimeDB {
  id: string;
  nome: string;
  capitao_id?: string;
}

interface InscricaoDB {
  id: string;
  status: string;
  comprovante_pix_url?: string;
  times: TimeDB;
}

export function PingPongEngine({ torneio }: { torneio: any }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- ESTADOS DE CONFIGURAÇÃO DE TIMES ---
  const [inscricoes, setInscricoes] = React.useState<InscricaoDB[]>([]);
  const [timesSelecionados, setTimesSelecionados] = useState<TimeDB[]>([]);
  const [campeonatoIniciado, setCampeonatoIniciado] = useState<boolean>(false);
  const [idJogoSelecionado, setIdJogoSelecionado] = useState<string | null>(null);

  React.useEffect(() => {
    carregarTimes();
  }, []);

  const carregarTimes = async () => {
    if (!torneio?.id) return;
    try {
      const { data, error } = await supabase
        .from('inscricoes')
        .select(`
          id,
          status,
          comprovante_pix_url,
          times (
            id,
            nome,
            capitao_id
          )
        `)
        .eq('torneio_id', torneio.id)
        .in('status', ['pendente', 'aprovado'])
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        setInscricoes(data as any[]);
        
        // Auto-adicionar todos os aprovados para a área de sorteio para agilizar
        const timesAprovados = (data as any[]).filter(i => i.status === 'aprovado').map(i => (Array.isArray(i.times) ? i.times[0] : i.times) as TimeDB);
        setTimesSelecionados(timesAprovados);
      }
    } catch (err) {
      console.error("Erro ao carregar inscritos:", err);
    }
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      const importedNames: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && line.toLowerCase().includes('nome')) continue; 
        
        let nome = line.split(',')[0].trim();
        if (nome) importedNames.push(nome);
      }

      if (importedNames.length === 0) {
        Alert.alert('Aviso', 'Nenhum nome válido encontrado no arquivo.');
        return;
      }

      Alert.alert(
        'Importar Participantes',
        `Foram encontrados ${importedNames.length} participantes. Deseja importá-los para o banco de dados e inscrevê-los neste torneio?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            onPress: async () => {
              try {
                // Para não complicar, vamos criar os "times" sem capitão (já que é importação em massa) e inscrevê-los
                // Note: O ideal no sistema final seria ter usuários reais, mas para o MVP importado, criamos dummy teams.
                
                // Em um sistema real, precisamos do capitao_id (NOT NULL originalmente, mas relaxamos isso).
                // Assumindo que a RLS está desativada ou permite inserts anônimos/organizador.
                
                // Vamos inserir em lote
                const teamsToInsert = importedNames.map(nome => ({ nome, categoria: 'Geral' }));
                const { data: insertedTeams, error: insertError } = await supabase.from('times').insert(teamsToInsert).select();
                
                if (insertError) throw insertError;

                if (insertedTeams) {
                  const inscricoesToInsert = insertedTeams.map(t => ({
                    torneio_id: torneio.id,
                    time_id: t.id,
                    status: 'aprovado'
                  }));
                  
                  const { error: inscError } = await supabase.from('inscricoes').insert(inscricoesToInsert);
                  if (inscError) throw inscError;
                }
                
                Alert.alert('Sucesso', 'Participantes importados com sucesso!');
                carregarTimes();
              } catch (e) {
                Alert.alert('Erro', 'Falha ao importar: ' + (e as any).message);
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível ler o arquivo CSV.');
    }
  };
  
  // --- ESTADOS DO PLACAR E TORNEIO ---
  const [chaves, setChaves] = useState<JogoChaveamento[]>([]);
  const [partidaAtiva, setPartidaAtiva] = useState<PartidaPingPong | null>(null);
  const [sumulaGerada, setSumulaGerada] = useState<string | null>(null);
  const [mostrarSumula, setMostrarSumula] = useState<boolean>(false);

  // --- ADICIONAR / REMOVER TIMES ---
  const adicionarTime = (time: TimeDB) => {
    if (timesSelecionados.find(t => t.id === time.id)) {
      Alert.alert("Aviso", "Este participante já está selecionado para o chaveamento!");
      return;
    }
    setTimesSelecionados([...timesSelecionados, time]);
  };

  const removerTime = (id: string) => {
    setTimesSelecionados(timesSelecionados.filter(t => t.id !== id));
  };

  const aprovarInscricao = async (insc: InscricaoDB) => {
    Alert.alert("Aprovar Inscrição", `Deseja aprovar a inscrição de ${insc.times.nome}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Aprovar", onPress: async () => {
        const { error } = await supabase.from('inscricoes').update({ status: 'aprovado' }).eq('id', insc.id);
        if (!error) {
          carregarTimes();
        }
      }}
    ]);
  };

  const rejeitarInscricao = async (insc: InscricaoDB) => {
    Alert.alert("Remover Inscrição", `Deseja remover a inscrição de ${insc.times.nome}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        const { error } = await supabase.from('inscricoes').update({ status: 'rejeitado' }).eq('id', insc.id);
        if (!error) {
          removerTime(insc.times.id);
          carregarTimes();
        }
      }}
    ]);
  };

  const verComprovante = (url?: string) => {
    if (!url) {
      Alert.alert("Aviso", "Comprovante não enviado.");
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert("Erro", "Não foi possível abrir o comprovante."));
  };

  // --- GERADOR DINÂMICO DE CHAVEAMENTO ---
  const iniciarCampeonato = async () => {
    if (timesSelecionados.length < 4) {
      Alert.alert("Aviso", "Selecione pelo menos 4 jogadores/times para estruturar o torneio!");
      return;
    }

    const n = timesSelecionados.length;
    let proximaPotencia = 4;
    while (proximaPotencia < n) {
      proximaPotencia *= 2;
    }

    const numeroDeByes = proximaPotencia - n; 
    let novasChaves: JogoChaveamento[] = [];
    let timesEmbaralhados = [...timesSelecionados].sort(() => Math.random() - 0.5);

    if (numeroDeByes === 0) {
      if (n === 4) {
        novasChaves = [
          { id: 'semi1', fase: 'Semifinal 1', timeA: timesEmbaralhados[0].nome, timeB: timesEmbaralhados[1].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[0], timeBObj: timesEmbaralhados[1] },
          { id: 'semi2', fase: 'Semifinal 2', timeA: timesEmbaralhados[2].nome, timeB: timesEmbaralhados[3].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[2], timeBObj: timesEmbaralhados[3] },
          { id: 'final', fase: 'Grande Final', timeA: 'Vencedor Semi 1', timeB: 'Vencedor Semi 2', setsA: 0, setsB: 0, concluido: false }
        ];
      } else if (n === 8) {
        novasChaves = [
          { id: 'quartas1', fase: 'Quartas 1', timeA: timesEmbaralhados[0].nome, timeB: timesEmbaralhados[1].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[0], timeBObj: timesEmbaralhados[1] },
          { id: 'quartas2', fase: 'Quartas 2', timeA: timesEmbaralhados[2].nome, timeB: timesEmbaralhados[3].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[2], timeBObj: timesEmbaralhados[3] },
          { id: 'quartas3', fase: 'Quartas 3', timeA: timesEmbaralhados[4].nome, timeB: timesEmbaralhados[5].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[4], timeBObj: timesEmbaralhados[5] },
          { id: 'quartas4', fase: 'Quartas 4', timeA: timesEmbaralhados[6].nome, timeB: timesEmbaralhados[7].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[6], timeBObj: timesEmbaralhados[7] },
          { id: 'semi1', fase: 'Semifinal 1', timeA: 'Vencedor Q1', timeB: 'Vencedor Q2', setsA: 0, setsB: 0, concluido: false },
          { id: 'semi2', fase: 'Semifinal 2', timeA: 'Vencedor Q3', timeB: 'Vencedor Q4', setsA: 0, setsB: 0, concluido: false },
          { id: 'final', fase: 'Grande Final', timeA: 'Vencedor Semi 1', timeB: 'Vencedor Semi 2', setsA: 0, setsB: 0, concluido: false }
        ];
      }
    } else {
      if (n > 4 && n < 8) {
        novasChaves = [
          { id: 'preliminar1', fase: 'Preliminar 1', timeA: timesEmbaralhados[0].nome, timeB: timesEmbaralhados[1].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[0], timeBObj: timesEmbaralhados[1] },
          { id: 'preliminar2', fase: 'Preliminar 2', timeA: timesEmbaralhados[2].nome, timeB: timesEmbaralhados[3].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[2], timeBObj: timesEmbaralhados[3] },
          { id: 'semi1', fase: 'Semifinal 1', timeA: timesEmbaralhados[4] ? timesEmbaralhados[4].nome : 'Vencedor P1', timeB: 'Vencedor P1', setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[4] },
          { id: 'semi2', fase: 'Semifinal 2', timeA: timesEmbaralhados[5] ? timesEmbaralhados[5].nome : 'Vencedor P2', timeB: 'Vencedor P2', setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[5] },
          { id: 'final', fase: 'Grande Final', timeA: 'Vencedor Semi 1', timeB: 'Vencedor Semi 2', setsA: 0, setsB: 0, concluido: false }
        ];
      } else {
        novasChaves = [
          { id: 'preliminar1', fase: 'Rodada Preliminar 1', timeA: timesEmbaralhados[0].nome, timeB: timesEmbaralhados[1].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[0], timeBObj: timesEmbaralhados[1] },
          { id: 'preliminar2', fase: 'Rodada Preliminar 2', timeA: timesEmbaralhados[2].nome, timeB: timesEmbaralhados[3].nome, setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[2], timeBObj: timesEmbaralhados[3] },
          { id: 'quartas1', fase: 'Quartas 1', timeA: timesEmbaralhados[4] ? timesEmbaralhados[4].nome : 'Vencedor P1', timeB: 'Vencedor P1', setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[4] },
          { id: 'quartas2', fase: 'Quartas 2', timeA: timesEmbaralhados[5] ? timesEmbaralhados[5].nome : 'Vencedor P2', timeB: 'Time Bye', setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[5] },
          { id: 'quartas3', fase: 'Quartas 3', timeA: timesEmbaralhados[6] ? timesEmbaralhados[6].nome : 'Time Bye', timeB: timesEmbaralhados[7] ? timesEmbaralhados[7].nome : 'Time Bye', setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[6], timeBObj: timesEmbaralhados[7] },
          { id: 'quartas4', fase: 'Quartas 4', timeA: timesEmbaralhados[8] ? timesEmbaralhados[8].nome : 'Time Bye', timeB: timesEmbaralhados[9] ? timesEmbaralhados[9].nome : 'Time Bye', setsA: 0, setsB: 0, concluido: false, timeAObj: timesEmbaralhados[8], timeBObj: timesEmbaralhados[9] },
          { id: 'semi1', fase: 'Semifinal 1', timeA: 'Vencedor Q1', timeB: 'Vencedor Q2', setsA: 0, setsB: 0, concluido: false },
          { id: 'semi2', fase: 'Semifinal 2', timeA: 'Vencedor Q3', timeB: 'Vencedor Q4', setsA: 0, setsB: 0, concluido: false },
          { id: 'final', fase: 'Grande Final', timeA: 'Vencedor Semi 1', timeB: 'Vencedor Semi 2', setsA: 0, setsB: 0, concluido: false }
        ];
      }
    }

    setChaves(novasChaves);
    setCampeonatoIniciado(true);

    const primeiroJogoValido = novasChaves.find(j => !j.timeA.includes("Vencedor") && !j.timeB.includes("Vencedor"));
    
    if (primeiroJogoValido) {
      setPartidaAtiva({
        id: primeiroJogoValido.id,
        nomeTimeA: primeiroJogoValido.timeA,
        nomeTimeB: primeiroJogoValido.timeB,
        pontosSetAtual: { timeA: 0, timeB: 0 },
        historicoSets: [],
        setsVencidosTimeA: 0,
        setsVencidosTimeB: 0,
        timeServindo: 'A',
        status: 'EM_ANDAMENTO',
        timeAObj: primeiroJogoValido.timeAObj,
        timeBObj: primeiroJogoValido.timeBObj,
      });

      // Salva no banco de dados
      salvarChavesNoSupabase(novasChaves);
    }
  };

  const salvarChavesNoSupabase = async (chaves: JogoChaveamento[]) => {
    try {
      const dbMatches = chaves.map(c => ({
        id: c.id, // Supondo UUIDs ou gerando no banco, mas aqui estamos usando IDs como 'semi1'
        // Como o Supabase usa UUID, o ideal seria não usar strings fixas como ID primária, mas como não temos migrações, vamos salvar os status das partidas e quem ganhou
        // O MVP diz "Gravar no Supabase, permitindo que as chaves sejam acessadas".
        fase_torneio: c.fase,
        team_a_id: c.timeAObj?.id || null,
        team_b_id: c.timeBObj?.id || null,
        placar_a: 0,
        placar_b: 0,
        sets_a: c.setsA,
        sets_b: c.setsB,
        status: c.concluido ? 'encerrada' : 'agendada'
      })).filter(m => m.team_a_id && m.team_b_id); // Só salvamos as partidas que já tem 2 times reais no Supabase
      
      if(dbMatches.length > 0) {
        await supabase.from('partidas').upsert(dbMatches);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reiniciarCampeonato = () => {
    Alert.alert(
      "Resetar Torneio",
      "Deseja mesmo resetar o campeonato atual? Todos os placares serão perdidos.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Resetar", style: "destructive", onPress: () => {
            setCampeonatoIniciado(false);
            setPartidaAtiva(null);
            setChaves([]);
            setSumulaGerada(null); 
            setMostrarSumula(false);
          }
        }
      ]
    );
  };

  const darPontoPara = (time: 'A' | 'B') => {
    if (!partidaAtiva) return;
    const estadoAtualizado = computarPonto(partidaAtiva, time);
    setPartidaAtiva(estadoAtualizado);
    atualizarPlacarChaveamento(estadoAtualizado);
  };

  const removerPontoDe = (time: 'A' | 'B') => {
    if (!partidaAtiva) return;
    const estadoAtualizado = subtrairPonto(partidaAtiva, time);
    setPartidaAtiva(estadoAtualizado);
    atualizarPlacarChaveamento(estadoAtualizado);
  };

  const finalizarJogo = () => {
    if (!partidaAtiva) return;

    Alert.alert(
      "Encerrar Partida",
      "Tem certeza que deseja encerrar a partida?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Encerrar", style: "default", onPress: () => {
            const estadoAtualizado = encerrarPartidaManualmente(partidaAtiva);
            let vencedorDefinido = estadoAtualizado.vencedor;

            if (estadoAtualizado.setsVencidosTimeA === estadoAtualizado.setsVencidosTimeB) {
              Alert.alert(
                "Desempate",
                "O jogo terminou empatado. Selecione o vencedor:",
                [
                  { text: estadoAtualizado.nomeTimeA, onPress: () => processarEncerramento(estadoAtualizado, estadoAtualizado.nomeTimeA) },
                  { text: estadoAtualizado.nomeTimeB, onPress: () => processarEncerramento(estadoAtualizado, estadoAtualizado.nomeTimeB) }
                ]
              );
            } else {
              vencedorDefinido = estadoAtualizado.setsVencidosTimeA > estadoAtualizado.setsVencidosTimeB 
                ? estadoAtualizado.nomeTimeA 
                : estadoAtualizado.nomeTimeB;
              processarEncerramento(estadoAtualizado, vencedorDefinido);
            }
          }
        }
      ]
    );
  };

  const processarEncerramento = (estadoAtualizado: PartidaPingPong, vencedorDefinido?: string) => {
    const estadoComVencedorReal: PartidaPingPong = {
      ...estadoAtualizado,
      status: 'FINALIZADO',
      vencedor: vencedorDefinido
    };
    
    setPartidaAtiva(estadoComVencedorReal);
    const sumula = gerarSumula(estadoComVencedorReal);
    setSumulaGerada(sumula);
    setMostrarSumula(true);
    
    const novasChaves = chaves.map(jogo => {
      if (jogo.id === partidaAtiva?.id) {
        return {
          ...jogo,
          timeA: partidaAtiva.nomeTimeA,
          timeB: partidaAtiva.nomeTimeB,
          setsA: estadoComVencedorReal.setsVencidosTimeA,
          setsB: estadoComVencedorReal.setsVencidosTimeB,
          concluido: true,
          vencedor: estadoComVencedorReal.vencedor
        };
      }
      return jogo;
    });

    const p1 = novasChaves.find(j => j.id === 'preliminar1');
    const p2 = novasChaves.find(j => j.id === 'preliminar2');
    const q1 = novasChaves.find(j => j.id === 'quartas1');
    const q2 = novasChaves.find(j => j.id === 'quartas2');
    const q3 = novasChaves.find(j => j.id === 'quartas3');
    const q4 = novasChaves.find(j => j.id === 'quartas4');
    const s1 = novasChaves.find(j => j.id === 'semi1');
    const s2 = novasChaves.find(j => j.id === 'semi2');
    const jogoFinal = novasChaves.find(j => j.id === 'final');

    if (p1?.concluido) {
      if (q1) q1.timeB = p1.vencedor || 'Vencedor P1';
      if (s1 && !q1) s1.timeB = p1.vencedor || 'Vencedor P1';
    }
    if (p2?.concluido) {
      if (q2) q2.timeB = p2.vencedor || 'Vencedor P2';
      if (s2 && !q2) s2.timeB = p2.vencedor || 'Vencedor P2';
    }
    if (s1) {
      if (q1?.concluido) s1.timeA = q1.vencedor || 'Vencedor Q1';
      if (q2?.concluido) s1.timeB = q2.vencedor || 'Vencedor Q2';
    }
    if (s2) {
      if (q3?.concluido) s2.timeA = q3.vencedor || 'Vencedor Q3';
      if (q4?.concluido) s2.timeB = q4.vencedor || 'Vencedor Q4';
    }
    if (jogoFinal) {
      if (s1?.concluido) jogoFinal.timeA = s1.vencedor || 'Vencedor Semi 1';
      if (s2?.concluido) jogoFinal.timeB = s2.vencedor || 'Vencedor Semi 2';
    }
    setChaves(novasChaves);
    
    // Atualiza a partida finalizada no Supabase
    if (estadoAtualizado.timeAObj && estadoAtualizado.timeBObj) {
      supabase.from('partidas').upsert({
        id: estadoAtualizado.id,
        fase_torneio: novasChaves.find(j => j.id === estadoAtualizado.id)?.fase,
        team_a_id: estadoAtualizado.timeAObj.id,
        team_b_id: estadoAtualizado.timeBObj.id,
        sets_a: estadoComVencedorReal.setsVencidosTimeA,
        sets_b: estadoComVencedorReal.setsVencidosTimeB,
        status: 'encerrada'
      }).then(() => console.log('Partida atualizada no Supabase.'));
    }
  };

  const atualizarPlacarChaveamento = (partidaAtualizada: PartidaPingPong) => {
    setChaves(prev => prev.map(jogo => {
      if (jogo.id === partidaAtualizada.id) {
        return {
          ...jogo,
          setsA: partidaAtualizada.setsVencidosTimeA,
          setsB: partidaAtualizada.setsVencidosTimeB
        };
      }
      return jogo;
    }));
  };

  const gerarHTMLSumula = (partida: PartidaPingPong) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    
    let historicoHtml = '';
    if (partida.historicoSets.length > 0) {
      historicoHtml = `
        <div class="section-title">DETALHES DOS SETS</div>
        <table class="set-table">
          <tr><th>Set</th><th>${partida.nomeTimeA}</th><th>${partida.nomeTimeB}</th></tr>
          ${partida.historicoSets.map((set, index) => {
            const numeroSet = index + 1;
            const tipoSet = numeroSet === 5 ? 'Tie-break' : 'Set ' + numeroSet;
            return `
              <tr>
                <td>${tipoSet}</td>
                <td>${set.timeA}</td>
                <td>${set.timeB}</td>
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
            .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #1c1c1c; margin: 0; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
            .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #4b5563; }
            .score-container { display: flex; justify-content: space-around; text-align: center; margin: 40px 0; }
            .team-box { flex: 1; padding: 20px; }
            .team-name { font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 15px; }
            .sets-won { font-size: 64px; font-weight: 900; color: #ef4444; line-height: 1; margin: 0; }
            .vs { font-size: 32px; font-weight: bold; color: #9ca3af; padding-top: 40px; }
            .winner-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 40px; }
            .winner-text { font-size: 20px; font-weight: bold; color: #b91c1c; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; color: #1f2937; }
            .set-table { border-collapse: collapse; margin-bottom: 30px; width: 100%; }
            .set-table th, .set-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: center; }
            .set-table th { background: #f3f4f6; color: #374151; font-weight: bold; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">SÚMULA DE PING PONG</h1>
            <div class="subtitle">SportConnect - Aplicativo Oficial de Gestão Esportiva</div>
          </div>
          
          <div class="info-box">
            <div class="info-row"><span class="info-label">Fase:</span> <span>${partida.id}</span></div>
            <div class="info-row"><span class="info-label">Data e Hora:</span> <span>${dataHora}</span></div>
            <div class="info-row"><span class="info-label">Status:</span> <span>${partida.status}</span></div>
          </div>

          <div class="score-container">
            <div class="team-box">
              <div class="team-name">${partida.nomeTimeA}</div>
              <p class="sets-won">${partida.setsVencidosTimeA}</p>
              <p style="color: #6b7280; font-weight: bold; margin-top: 10px;">SETS</p>
            </div>
            <div class="vs">X</div>
            <div class="team-box">
              <div class="team-name">${partida.nomeTimeB}</div>
              <p class="sets-won">${partida.setsVencidosTimeB}</p>
              <p style="color: #6b7280; font-weight: bold; margin-top: 10px;">SETS</p>
            </div>
          </div>

          ${partida.vencedor ? `
          <div class="winner-box">
            <span class="winner-text">🏆 VENCEDOR: ${partida.vencedor} 🏆</span>
          </div>
          ` : ''}

          ${historicoHtml}

          <div class="footer">
            Documento gerado automaticamente pelo sistema SportConnect em ${dataHora}.<br/>
            As informações contidas nesta súmula são de responsabilidade do árbitro e organizador do evento.
          </div>
        </body>
      </html>
    `;
  };

  const gerarSumula = (partida: PartidaPingPong) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    let sumula = '═══════════════════════════════════════════════════════\n';
    sumula += '                    SÚMULA DE PING PONG\n';
    sumula += '═══════════════════════════════════════════════════════\n\n';
    sumula += `📅 Data: ${dataHora}\n`;
    sumula += `🏓 Fase: ${partida.id}\n\n`;
    sumula += '───────────────────────────────────────────────────────\n';
    sumula += '                    JOGADORES / TIMES\n';
    sumula += '───────────────────────────────────────────────────────\n';
    sumula += `  ${partida.nomeTimeA}  vs  ${partida.nomeTimeB}\n`;
    sumula += `  Sets: ${partida.setsVencidosTimeA}          Sets: ${partida.setsVencidosTimeB}\n`;
    sumula += `  Vencedor: ${partida.vencedor || 'Em andamento'}\n\n`;
    
    if (partida.historicoSets.length > 0) {
      sumula += '───────────────────────────────────────────────────────\n';
      sumula += '                 DETALHES DOS SETS\n';
      sumula += '───────────────────────────────────────────────────────\n';
      partida.historicoSets.forEach((set, index) => {
        const numeroSet = index + 1;
        const tipoSet = numeroSet === 5 ? 'Tie-break' : `Set ${numeroSet}`;
        sumula += `  ${tipoSet}: ${set.timeA} x ${set.timeB}\n`;
      });
      sumula += '\n';
    }

    if (partida.status === 'EM_ANDAMENTO') {
      sumula += '───────────────────────────────────────────────────────\n';
      sumula += '                PLACAR ATUAL (Set em andamento)\n';
      sumula += '───────────────────────────────────────────────────────\n';
      sumula += `  ${partida.nomeTimeA}: ${partida.pontosSetAtual.timeA}\n`;
      sumula += `  ${partida.nomeTimeB}: ${partida.pontosSetAtual.timeB}\n`;
      sumula += `  Sacando: ${partida.timeServindo === 'A' ? partida.nomeTimeA : partida.nomeTimeB}\n\n`;
    }

    return sumula;
  };

  const exportarSumulaPDF = async () => {
    if (!partidaAtiva) return;
    try {
      const html = gerarHTMLSumula(partidaAtiva);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartilhar Súmula' });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar ou compartilhar o PDF da súmula.');
    }
  };

  const carregarJogoNoPlacar = (jogo: JogoChaveamento) => {
    setIdJogoSelecionado(jogo.id);
    if (jogo.concluido) {
      const partidaFinalizada: PartidaPingPong = {
        id: jogo.id,
        nomeTimeA: jogo.timeA,
        nomeTimeB: jogo.timeB,
        setsVencidosTimeA: jogo.setsA,
        setsVencidosTimeB: jogo.setsB,
        vencedor: jogo.vencedor,
        status: 'FINALIZADO',
        historicoSets: [],
        pontosSetAtual: { timeA: 0, timeB: 0 },
        timeServindo: 'A'
      };
      setSumulaGerada(gerarSumula(partidaFinalizada));
      setMostrarSumula(true);
      return;
    }
    if (jogo.timeA.includes("Vencedor") || jogo.timeB.includes("Vencedor") || jogo.timeA.includes("Bye") || jogo.timeB.includes("Bye")) {
      Alert.alert("Aviso", "Aguarde as fases anteriores serem concluídas para definir os jogadores!");
      return;
    }
    setSumulaGerada(null);
    setMostrarSumula(false);

    setPartidaAtiva({
      id: jogo.id,
      nomeTimeA: jogo.timeA,
      nomeTimeB: jogo.timeB,
      pontosSetAtual: { timeA: 0, timeB: 0 },
      historicoSets: [],
      setsVencidosTimeA: 0,
      setsVencidosTimeB: 0,
      timeServindo: 'A',
      status: 'EM_ANDAMENTO',
      timeAObj: jogo.timeAObj,
      timeBObj: jogo.timeBObj
    });
  };

  const handleSendPush = async () => {
    if (!partidaAtiva) return;
    
    Alert.alert("Enviando Notificação", "Aguarde...");

    try {
      const capitaesIds = [partidaAtiva.timeAObj?.capitao_id, partidaAtiva.timeBObj?.capitao_id].filter(Boolean);
      
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
          title: 'Partida de Ping Pong Iniciando!',
          body: `Sua partida: ${partidaAtiva.nomeTimeA} vs ${partidaAtiva.nomeTimeB} vai começar.`,
          data: { matchId: partidaAtiva.id },
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

      Alert.alert("Sucesso", "Notificações enviadas aos jogadores!");
    } catch (error) {
      console.error("Erro ao enviar push:", error);
      Alert.alert("Erro", "Não foi possível enviar a notificação.");
    }
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 p-4 bg-[#f2ece0] dark:bg-brand-bg">
        {!campeonatoIniciado ? (
          <View className="mb-10">
            {/* NOVO QUADRO DE INSCRIÇÕES BONITO */}
            <View className="bg-[#e6ddca] dark:bg-brand-surface rounded-2xl border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm overflow-hidden mb-6">
              
              <View className="bg-brand-primary dark:bg-brand-electric-light p-5 flex-row justify-between items-center">
                <View>
                  <Text className="text-white dark:text-[#0a0a0a] text-xl font-black tracking-wide">Quadro de Inscrições</Text>
                  <Text className="text-blue-100 dark:text-gray-800 text-xs font-semibold mt-1">Gerencie e valide participantes</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleImportCSV}
                  className="bg-white/20 dark:bg-black/10 px-3 py-2 rounded-lg flex-row items-center border border-white/30 dark:border-black/20"
                >
                  <Ionicons name="document-text" size={16} color={isDark ? "#0a0a0a" : "#fff"} />
                  <Text className="text-white dark:text-[#0a0a0a] font-bold text-xs ml-1">Importar CSV</Text>
                </TouchableOpacity>
              </View>

              <View className="p-4 bg-[#f2ece0] dark:bg-brand-bg">
                {inscricoes.filter(i => i.status === 'pendente').length === 0 ? (
                  <View className="py-8 items-center justify-center">
                    <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
                    <Text className="text-gray-500 font-medium mt-3">Nenhuma inscrição aguardando aprovação.</Text>
                  </View>
                ) : (
                  inscricoes.filter(i => i.status === 'pendente').map(insc => (
                    <View key={insc.id} className="flex-row items-center justify-between p-4 mb-3 rounded-xl border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 border-l-4 border-l-amber-500 shadow-sm">
                      <View className="flex-1 pr-2">
                        <Text className="text-gray-900 dark:text-white font-bold text-lg" numberOfLines={1}>{insc.times?.nome}</Text>
                        
                        <View className="flex-row items-center mt-2 space-x-3">
                          <View className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded"><Text className="text-amber-700 dark:text-amber-500 font-bold text-[10px] uppercase">Pendente</Text></View>
                          <TouchableOpacity onPress={() => verComprovante(insc.comprovante_pix_url)} className="flex-row items-center">
                            <Ionicons name="receipt" size={14} color={isDark ? "#3B82F6" : "#2563EB"} />
                            <Text className="text-brand-primary dark:text-brand-electric-light text-xs font-semibold ml-1">Comprovante</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View className="flex-row items-center space-x-2">
                        <TouchableOpacity onPress={() => aprovarInscricao(insc)} className="bg-green-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
                          <Ionicons name="checkmark" size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => rejeitarInscricao(insc)} className="bg-red-100 dark:bg-red-900/30 w-10 h-10 rounded-full items-center justify-center border border-red-200 dark:border-red-900/50">
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* AREA DO SORTEIO E SELEÇÃO */}
            <View className="bg-[#e6ddca] dark:bg-brand-surface p-5 rounded-2xl border border-[#d8ccb4] dark:border-brand-border-focus shadow-sm">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-900 dark:text-white text-lg font-bold">Participantes do Sorteio</Text>
                <View className="bg-gray-200 dark:bg-brand-border px-3 py-1 rounded-full">
                  <Text className="text-gray-600 dark:text-gray-300 text-xs font-bold">{timesSelecionados.length} selecionados</Text>
                </View>
              </View>
              
              {timesSelecionados.length === 0 ? (
                <Text className="text-gray-500 text-sm text-center py-4">Adicione os participantes aprovados ao sorteio clicando no botão "+" no quadro acima.</Text>
              ) : (
                <View className="flex-row flex-wrap mb-4">
                  {timesSelecionados.map((time, idx) => (
                    <View key={idx} className="flex-row items-center bg-[#f2ece0] dark:bg-brand-bg border border-[#d8ccb4] dark:border-brand-border-focus rounded-full px-3 py-1.5 mr-2 mb-2 shadow-sm">
                      <Text className="text-gray-800 dark:text-gray-200 text-sm font-semibold mr-2">{time.nome}</Text>
                      <TouchableOpacity onPress={() => removerTime(time.id)}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity 
                className={`py-4 rounded-xl items-center flex-row justify-center shadow-sm ${timesSelecionados.length >= 4 ? 'bg-brand-primary dark:bg-brand-electric-light' : 'bg-gray-300 dark:bg-gray-800'}`}
                onPress={iniciarCampeonato}
                disabled={timesSelecionados.length < 4}
              >
                <Ionicons name="git-network" size={20} color={timesSelecionados.length >= 4 ? (isDark ? '#0a0a0a' : '#fff') : '#888'} className="mr-2" />
                <Text className={`${timesSelecionados.length >= 4 ? 'text-white dark:text-[#0a0a0a]' : 'text-gray-500'} font-black text-base uppercase tracking-wider`}>Gerar Chaves do Torneio</Text>
              </TouchableOpacity>
              
              {timesSelecionados.length < 4 && (
                <Text className="text-amber-600 dark:text-amber-500 text-xs text-center mt-3 font-semibold">
                  * É necessário pelo menos 4 participantes selecionados.
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View>
            <View className="flex-row justify-between items-center bg-[#e6ddca] dark:bg-brand-surface p-4 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus mb-6">
              <Text className="text-gray-800 dark:text-white font-bold">Chaveamento Ping Pong</Text>
              <TouchableOpacity onPress={reiniciarCampeonato} className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-md border border-red-200 dark:border-red-800">
                <Text className="text-red-600 dark:text-red-400 font-bold text-xs">Resetar Torneio</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Chaves (Bracket Tree Horizontal Profissional) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 mb-6">
              <View className="flex-row items-stretch min-w-full px-2">
                {Array.from(new Set(chaves.map(c => c.fase))).map((faseName, idx, arr) => {
                  const jogosDaFase = chaves.filter(c => c.fase === faseName);
                  return (
                    <View key={faseName} className="mr-4 flex-col min-h-[400px]">
                      <Text className="text-center text-gray-800 dark:text-white font-bold mb-6 uppercase tracking-widest bg-[#d8ccb4] dark:bg-brand-border-focus py-2 rounded-lg w-64">{faseName}</Text>
                      
                      <View className="flex-col flex-1">
                        {Array.from({ length: Math.ceil(jogosDaFase.length / 2) }).map((_, pairIdx) => {
                          const jogo1 = jogosDaFase[pairIdx * 2];
                          const jogo2 = jogosDaFase[pairIdx * 2 + 1];
                          
                          return (
                            <View key={pairIdx} className="flex-row items-center flex-1 my-2">
                              {/* Coluna dos Cards */}
                              <View className="flex-col justify-around flex-1 w-64">
                                {jogo1 && (
                                  <TouchableOpacity 
                                    onPress={() => carregarJogoNoPlacar(jogo1)}
                                    className={`p-3 rounded-xl border ${idJogoSelecionado === jogo1.id ? 'border-brand-primary dark:border-brand-electric-light border-2 bg-brand-primary/10 dark:bg-brand-electric-light/10' : 'border-[#d8ccb4] dark:border-brand-border-focus bg-[#e6ddca] dark:bg-brand-surface'} shadow-sm my-1 z-10`}
                                  >
                                    <View className="flex-row justify-between mb-2">
                                      <Text className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">{jogo1.fase}</Text>
                                      {jogo1.concluido && <View className="bg-green-100 dark:bg-green-900/40 px-2 rounded"><Text className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase">Concluído</Text></View>}
                                    </View>
                                    <View className="flex-row justify-between border-b border-black/10 dark:border-white/10 pb-1 mb-1">
                                      <Text className={`text-xs ${jogo1.vencedor === jogo1.timeA ? 'text-brand-primary dark:text-brand-electric-light font-black' : 'text-gray-800 dark:text-gray-200 font-semibold'}`} numberOfLines={1} style={{ flex: 1 }}>{jogo1.timeA}</Text>
                                      <Text className={`text-xs font-black ml-2 ${jogo1.vencedor === jogo1.timeA ? 'text-brand-primary dark:text-brand-electric-light' : 'text-gray-800 dark:text-white'}`}>{jogo1.setsA}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                      <Text className={`text-xs ${jogo1.vencedor === jogo1.timeB ? 'text-brand-primary dark:text-brand-electric-light font-black' : 'text-gray-800 dark:text-gray-200 font-semibold'}`} numberOfLines={1} style={{ flex: 1 }}>{jogo1.timeB}</Text>
                                      <Text className={`text-xs font-black ml-2 ${jogo1.vencedor === jogo1.timeB ? 'text-brand-primary dark:text-brand-electric-light' : 'text-gray-800 dark:text-white'}`}>{jogo1.setsB}</Text>
                                    </View>
                                  </TouchableOpacity>
                                )}
                                
                                {jogo2 && (
                                  <TouchableOpacity 
                                    onPress={() => carregarJogoNoPlacar(jogo2)}
                                    className={`p-3 rounded-xl border ${idJogoSelecionado === jogo2.id ? 'border-brand-primary dark:border-brand-electric-light border-2 bg-brand-primary/10 dark:bg-brand-electric-light/10' : 'border-[#d8ccb4] dark:border-brand-border-focus bg-[#e6ddca] dark:bg-brand-surface'} shadow-sm my-1 z-10`}
                                  >
                                    <View className="flex-row justify-between mb-2">
                                      <Text className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">{jogo2.fase}</Text>
                                      {jogo2.concluido && <View className="bg-green-100 dark:bg-green-900/40 px-2 rounded"><Text className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase">Concluído</Text></View>}
                                    </View>
                                    <View className="flex-row justify-between border-b border-black/10 dark:border-white/10 pb-1 mb-1">
                                      <Text className={`text-xs ${jogo2.vencedor === jogo2.timeA ? 'text-brand-primary dark:text-brand-electric-light font-black' : 'text-gray-800 dark:text-gray-200 font-semibold'}`} numberOfLines={1} style={{ flex: 1 }}>{jogo2.timeA}</Text>
                                      <Text className={`text-xs font-black ml-2 ${jogo2.vencedor === jogo2.timeA ? 'text-brand-primary dark:text-brand-electric-light' : 'text-gray-800 dark:text-white'}`}>{jogo2.setsA}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                      <Text className={`text-xs ${jogo2.vencedor === jogo2.timeB ? 'text-brand-primary dark:text-brand-electric-light font-black' : 'text-gray-800 dark:text-gray-200 font-semibold'}`} numberOfLines={1} style={{ flex: 1 }}>{jogo2.timeB}</Text>
                                      <Text className={`text-xs font-black ml-2 ${jogo2.vencedor === jogo2.timeB ? 'text-brand-primary dark:text-brand-electric-light' : 'text-gray-800 dark:text-white'}`}>{jogo2.setsB}</Text>
                                    </View>
                                  </TouchableOpacity>
                                )}
                              </View>
                              
                              {/* Coluna dos Conectores Visuais ┫ */}
                              {idx < arr.length - 1 && (
                                <View className="flex-row items-center h-full w-8">
                                  {jogo2 ? (
                                    <>
                                      <View className="w-4 h-[50%] border-r-2 border-y-2 border-[#d8ccb4] dark:border-brand-border-focus rounded-r-lg" />
                                      <View className="w-4 h-[2px] bg-[#d8ccb4] dark:bg-brand-border-focus" />
                                    </>
                                  ) : (
                                    <>
                                      <View className="w-8 h-[2px] bg-[#d8ccb4] dark:bg-brand-border-focus" />
                                    </>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Placar Ativo */}
            {partidaAtiva && !mostrarSumula && (
              <View className="bg-[#e6ddca] dark:bg-brand-surface p-5 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus mt-4">
                <Text className="text-center font-bold text-brand-primary dark:text-brand-electric-light uppercase tracking-widest mb-4">Em Andamento</Text>
                
                <View className="flex-row justify-between mb-6">
                  <View className="flex-1 items-center bg-[#f2ece0] dark:bg-brand-bg p-4 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus mr-2">
                    <Text className="text-xs font-bold text-gray-500 uppercase mb-2 text-center h-8">{partidaAtiva.nomeTimeA} {partidaAtiva.timeServindo === 'A' && '🏓'}</Text>
                    <Text className="text-5xl font-black text-gray-900 dark:text-white mb-4">{partidaAtiva.pontosSetAtual.timeA}</Text>
                    <View className="flex-row w-full space-x-2">
                      <TouchableOpacity onPress={() => removerPontoDe('A')} className="flex-1 bg-red-500 py-2 rounded-lg items-center">
                        <Text className="text-white font-bold">-1</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => darPontoPara('A')} className="flex-1 bg-brand-primary dark:bg-brand-electric-light py-2 rounded-lg items-center">
                        <Text className="text-white font-bold">+1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-1 items-center bg-[#f2ece0] dark:bg-brand-bg p-4 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus ml-2">
                    <Text className="text-xs font-bold text-gray-500 uppercase mb-2 text-center h-8">{partidaAtiva.nomeTimeB} {partidaAtiva.timeServindo === 'B' && '🏓'}</Text>
                    <Text className="text-5xl font-black text-gray-900 dark:text-white mb-4">{partidaAtiva.pontosSetAtual.timeB}</Text>
                    <View className="flex-row w-full space-x-2">
                      <TouchableOpacity onPress={() => removerPontoDe('B')} className="flex-1 bg-red-500 py-2 rounded-lg items-center">
                        <Text className="text-white font-bold">-1</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => darPontoPara('B')} className="flex-1 bg-brand-primary dark:bg-brand-electric-light py-2 rounded-lg items-center">
                        <Text className="text-white font-bold">+1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {partidaAtiva.historicoSets.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] text-gray-500 uppercase font-bold mb-2">Histórico de Sets</Text>
                    {partidaAtiva.historicoSets.map((set, idx) => (
                      <Text key={idx} className="text-xs text-gray-600 dark:text-gray-400 bg-[#f2ece0] dark:bg-brand-bg p-2 rounded-md mb-1 border border-[#d8ccb4] dark:border-brand-border-focus">
                        <Text className="font-bold text-brand-primary dark:text-brand-electric-light">{idx + 1}º Set:</Text> {set.timeA} x {set.timeB}
                      </Text>
                    ))}
                  </View>
                )}

                <View className="flex-row justify-between space-x-2">
                  <TouchableOpacity 
                    onPress={handleSendPush}
                    className="flex-1 bg-green-100 dark:bg-green-900/20 py-4 rounded-xl border border-green-200 dark:border-green-900 items-center"
                  >
                    <Text className="text-green-600 dark:text-green-400 font-bold uppercase tracking-widest">Notificar (Push)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={finalizarJogo}
                    className="flex-1 bg-red-100 dark:bg-red-900/20 py-4 rounded-xl border border-red-200 dark:border-red-900 items-center"
                  >
                    <Text className="text-red-600 dark:text-red-400 font-bold uppercase tracking-widest">Encerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {mostrarSumula && sumulaGerada && (
              <View className="bg-[#e6ddca] dark:bg-brand-surface p-5 rounded-xl border border-[#d8ccb4] dark:border-brand-border-focus mt-4 mb-10 items-center">
                <Text className="text-brand-primary dark:text-brand-electric-light font-bold text-lg mb-4">Súmula da Partida</Text>
                <View className="bg-black/5 dark:bg-black/30 p-4 rounded-xl w-full">
                  <Text className="font-mono text-xs text-gray-800 dark:text-gray-300 leading-5">{sumulaGerada}</Text>
                </View>
                <TouchableOpacity onPress={exportarSumulaPDF} className="mt-4 bg-red-600 dark:bg-red-700 px-6 py-3 rounded-xl w-full items-center flex-row justify-center shadow-sm">
                  <Ionicons name="document-text" size={20} color="#fff" className="mr-2" />
                  <Text className="text-white font-bold ml-2">Exportar PDF da Súmula</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
