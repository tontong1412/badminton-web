export enum PaymentStatus {
  Paid = 'paid',
  Pending = 'pending',
  Unpaid = 'unpaid',
}

export enum MatchStatus {
  Waiting = 'waiting',
  Playing = 'playing',
  Finished = 'finished',
}

export interface Player {
  id: string;
  officialName: string;
  displayName?: string;
  photo?: string;
  level: number;
  lastMatchEnd: string;
  paymentStatus: PaymentStatus;
}

export type MatchPlayer = Omit<Player, 'paymentStatus' | 'lastMatchEnd'>

export type NewPlayer = Omit<Player, 'id'>

export interface Team {
  id: string;
  players: MatchPlayer[];
}

export interface Match {
  id: string;
  court?: string;
  date: string;
  status: MatchStatus;
  teamA: {
    team: Team;
  },
  teamB: {
    team: Team;
  }
  shuttlecockUsed: number;
}

export interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
  maxParticipant: number;
  courtFee: {
    type: string;
    amount: number;
  };
  shuttlecockFee: number;
  players: Player[];
  queue: Match[]
}