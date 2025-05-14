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

export enum GameType {
  Single = 'single',
  Double = 'double',
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

export interface User {
  id: string;
  email: string;
  player: {
    id: string;
    officialName: {
      th?: string;
      en?: string;
      pronunciation?: string;
    };
    gender?: string;
    level: number;
    displayName: {
      th?: string;
      en?: string;
      pronunciation?: string;
    }
    club?: string;
    photo?: string;
    contact?: {
      line: string;
      tel: string;
    }
  }
}

export enum AppMenu {
  Home = 'home',
  Tournament = 'tournament',
  Setting = 'setting'
  // Session = 'session',
  // Venue = 'venue'
}

export type MatchPlayer = Omit<Player, 'paymentStatus' | 'lastMatchEnd'>

export type NewPlayer = Omit<Player, 'id'>

export interface Team {
  id: string;
  players: MatchPlayer[];
}
export type NewTeam = Omit<Team, 'id'>

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
  note?: string;
}

export type NewMatch = Omit<Match, 'id'>

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

export enum TournamentQuery {
  Recent = 'recent',
  ThisWeek = 'thisWeek',
  RegistrationOpen = 'registrationOpen'
}

export type Language = 'th' | 'en';

export type ContactMethod = 'line' | 'tel' | 'tg' | 'whatsapp' | 'email' | 'wechat' | 'facebook';

export interface TournamentEvent {
  id: string;
  name: {
    th: string;
    en: string;
  }
  description: string;
  fee: {
    amount: number;
    currency: string;
  }
  prize?: string;
  type: string;
}
export interface Tournament {
  id: string;
  name: {
    th: string;
    en: string;
  }
  logo?: string;
  language: Language;
  events: TournamentEvent[];
  startDate: string;
  endDate: string;
  venue: {
    name: {
      th: string;
      en: string;
    }
  }
}
