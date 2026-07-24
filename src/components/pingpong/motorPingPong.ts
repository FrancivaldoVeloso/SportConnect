import type { PartidaVolei, PlacarSet } from './PingPongTypes';

export function checarFimDoSet(pontosA: number, pontosB: number, numeroDoSet: number) {
  const alvo = numeroDoSet === 5 ? 15 : 25;

  if (pontosA >= alvo && (pontosA - pontosB) >= 2) {
    return { acabou: true, vencedor: 'A' };
  }
  if (pontosB >= alvo && (pontosB - pontosA) >= 2) {
    return { acabou: true, vencedor: 'B' };
  }
  return { acabou: false, vencedor: null };
}

export function computarPonto(partidaAtual: PartidaVolei, timeQuePontuou: 'A' | 'B'): PartidaVolei {
  if (partidaAtual.status === 'FINALIZADO') return partidaAtual;

  const novaPartida = { ...partidaAtual };
  const placarDoSet = { ...partidaAtual.pontosSetAtual };

  if (timeQuePontuou === 'A') {
    placarDoSet.timeA += 1;
    novaPartida.timeServindo = 'A';
  } else {
    placarDoSet.timeB += 1;
    novaPartida.timeServindo = 'B';
  }

  novaPartida.pontosSetAtual = placarDoSet;
  const numeroDoSetAtual = novaPartida.historicoSets.length + 1;
  const resultadoSet = checarFimDoSet(placarDoSet.timeA, placarDoSet.timeB, numeroDoSetAtual);

  if (resultadoSet.acabou) {
    novaPartida.historicoSets.push(placarDoSet);

    if (resultadoSet.vencedor === 'A') {
      novaPartida.setsVencidosTimeA += 1;
    } else {
      novaPartida.setsVencidosTimeB += 1;
    }

    novaPartida.pontosSetAtual = { timeA: 0, timeB: 0 };

    if (novaPartida.setsVencidosTimeA === 3) {
      novaPartida.status = 'FINALIZADO';
      novaPartida.vencedor = novaPartida.nomeTimeA;
    } else if (novaPartida.setsVencidosTimeB === 3) {
      novaPartida.status = 'FINALIZADO';
      novaPartida.vencedor = novaPartida.nomeTimeB;
    }
  }

  return novaPartida;
}

export function subtrairPonto(partidaAtual: PartidaVolei, time: 'A' | 'B'): PartidaVolei {
  if (partidaAtual.status === 'FINALIZADO') return partidaAtual;

  const novaPartida = { ...partidaAtual };
  const placarDoSet = { ...partidaAtual.pontosSetAtual };

  if (time === 'A' && placarDoSet.timeA > 0) {
    placarDoSet.timeA -= 1;
  } else if (time === 'B' && placarDoSet.timeB > 0) {
    placarDoSet.timeB -= 1;
  }

  novaPartida.pontosSetAtual = placarDoSet;
  return novaPartida;
}

export function encerrarPartidaManualmente(partidaAtual: PartidaVolei): PartidaVolei {
  const novaPartida = { ...partidaAtual };
  novaPartida.status = 'FINALIZADO';
  
  if (novaPartida.setsVencidosTimeA > novaPartida.setsVencidosTimeB) {
    novaPartida.vencedor = novaPartida.nomeTimeA;
  } else if (novaPartida.setsVencidosTimeB > novaPartida.setsVencidosTimeA) {
    novaPartida.vencedor = novaPartida.nomeTimeB;
  } else {
    if (novaPartida.pontosSetAtual.timeA > novaPartida.pontosSetAtual.timeB) {
      novaPartida.vencedor = novaPartida.nomeTimeA;
    } else if (novaPartida.pontosSetAtual.timeB > novaPartida.pontosSetAtual.timeA) {
      novaPartida.vencedor = novaPartida.nomeTimeB;
    } else {
      novaPartida.vencedor = 'Empate';
    }
  }

  return novaPartida;
}