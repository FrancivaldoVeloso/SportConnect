export interface PlacarSet {
  timeA: number;
  timeB: number;
}

export interface PartidaVolei {
  id: string;
  nomeTimeA: string;
  nomeTimeB: string;
  pontosSetAtual: PlacarSet;       
  historicoSets: PlacarSet[];      
  setsVencidosTimeA: number;       
  setsVencidosTimeB: number;       
  timeServindo: 'A' | 'B';         
  status: 'EM_ANDAMENTO' | 'FINALIZADO';
  vencedor?: string;
  timeAObj?: any;
  timeBObj?: any;
}

export interface JogoChaveamento {
  id: string;
  fase: string;
  timeA: string;
  timeB: string;
  setsA: number;
  setsB: number;
  concluido: boolean;
  vencedor?: string;
  timeAObj?: any;
  timeBObj?: any;
}