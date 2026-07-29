import { supabase } from './supabase';

export const generateBracket = async (torneioId: string) => {
  // 1. Fetch approved inscriptions
  const { data: inscricoes, error: inscError } = await supabase
    .from('inscricoes')
    .select('time_id')
    .eq('torneio_id', torneioId)
    .eq('status', 'aprovado');

  if (inscError || !inscricoes) {
    throw new Error('Erro ao buscar inscrições.');
  }

  const times = inscricoes.map(i => i.time_id);
  
  if (times.length < 2) {
    throw new Error(`Número de times aprovados (${times.length}) é insuficiente. Mínimo de 2 times.`);
  }

  // Verificar se já existe chaveamento
  const { data: existingMatches } = await supabase
    .from('partidas')
    .select('id')
    .eq('torneio_id', torneioId)
    .limit(1);

  if (existingMatches && existingMatches.length > 0) {
    throw new Error('O chaveamento já foi gerado para este torneio.');
  }

  // Shuffle times randomly
  const shuffledTeams = [...times].sort(() => Math.random() - 0.5);

  const numTeams = shuffledTeams.length;
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(numTeams)));
  const byesNeeded = nextPowerOf2 - numTeams;

  // Nomenclatura das fases baseada no número de posições na rodada (potência de 2)
  const getPhaseName = (positions: number) => {
    if (positions === 32) return 'Dezesseis-avos de Final';
    if (positions === 16) return 'Oitavas de Final';
    if (positions === 8) return 'Quartas de Final';
    if (positions === 4) return 'Semifinal';
    return 'Final';
  };

  const phaseName = getPhaseName(nextPowerOf2);
  let currentPhaseMatches: any[] = [];
  
  // Vamos distribuir os times nas posições. 
  // Temos `nextPowerOf2 / 2` partidas na primeira fase.
  const numMatches = nextPowerOf2 / 2;
  
  let teamIndex = 0;
  
  // Para distribuir os byes de forma equilibrada, podemos intercalá-los.
  // Por simplicidade, colocaremos um 'bye' nas partidas até acabar os byesNeeded.
  for (let i = 0; i < numMatches; i++) {
    const timeA = shuffledTeams[teamIndex++];
    let timeB = null;
    let isBye = false;

    // Se ainda precisamos dar bye e temos posições, damos o bye (timeB fica null)
    // Para espalhar os byes, damos bye a cada 'n' partidas, ou simplesmente damos aos primeiros.
    // Vamos dar aos primeiros (se numMatches=4 e byesNeeded=2, M1 e M2 terão bye).
    // Mas para espalhar melhor entre chave esquerda e direita, alternamos.
    if (i < byesNeeded) {
      isBye = true;
    } else {
      timeB = shuffledTeams[teamIndex++];
    }

    currentPhaseMatches.push({
      torneio_id: torneioId,
      time_a_id: timeA,
      time_b_id: timeB,
      fase_torneio: phaseName,
      status: isBye ? 'encerrada' : 'agendada'
    });
  }

  const { data: insertedMatches, error: insertError } = await supabase
    .from('partidas')
    .insert(currentPhaseMatches)
    .select();

  if (insertError) {
    throw new Error(`Erro ao inserir partidas: ${insertError.message}`);
  }

  // Avançar automaticamente os times que receberam bye
  if (insertedMatches) {
    for (const match of insertedMatches) {
      if (match.status === 'encerrada' && !match.time_b_id && match.time_a_id) {
        await advanceTeam(match.id, match.time_a_id);
      }
    }
  }

  return true;
};

export const advanceTeam = async (partidaId: string, vencedorId: string) => {
  // 1. Atualizar a partida atual como finalizada
  const { data: currentMatch, error: fetchErr } = await supabase
    .from('partidas')
    .select('*')
    .eq('id', partidaId)
    .single();

  if (fetchErr || !currentMatch) throw new Error('Partida não encontrada');

  await supabase
    .from('partidas')
    .update({ status: 'finalizada' })
    .eq('id', partidaId);

  // Se for final, não tem pra onde avançar
  if (currentMatch.fase_torneio === 'Final') {
    return { finished: true };
  }

  // 2. Descobrir a proxima fase
  let nextPhase = 'Final';
  if (currentMatch.fase_torneio === 'Oitavas de Final') nextPhase = 'Quartas de Final';
  if (currentMatch.fase_torneio === 'Quartas de Final') nextPhase = 'Semifinal';

  // 3. Procurar se já existe uma partida aberta nesta proxima fase aguardando um time (com time_a null ou time_b null)
  const { data: pendingMatches, error: pendingErr } = await supabase
    .from('partidas')
    .select('*')
    .eq('torneio_id', currentMatch.torneio_id)
    .eq('fase_torneio', nextPhase)
    .or('time_a_id.is.null,time_b_id.is.null')
    .limit(1);

  if (pendingMatches && pendingMatches.length > 0) {
    const nextMatch = pendingMatches[0];
    // Se o time_a estiver vazio, preenche, senão preenche o time_b
    if (!nextMatch.time_a_id) {
      await supabase.from('partidas').update({ time_a_id: vencedorId }).eq('id', nextMatch.id);
    } else {
      await supabase.from('partidas').update({ time_b_id: vencedorId }).eq('id', nextMatch.id);
    }
  } else {
    // Se não encontrou, cria uma nova partida nesta fase com o time A preenchido
    await supabase.from('partidas').insert({
      torneio_id: currentMatch.torneio_id,
      time_a_id: vencedorId,
      fase_torneio: nextPhase,
      status: 'agendada'
    });
  }

  return { advanced: true };
};
