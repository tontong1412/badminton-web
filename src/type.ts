export enum PaymentStatus {
  Paid = 'paid',
  Pending = 'pending',
  Unpaid = 'unpaid',
  Refunded = 'refunded'
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

export enum TeamStatus {
  Idle = 'idle',
  Reject = 'reject',
  Approved = 'approved',
  withdraw = 'withdraw',
}

export enum Gender {
  Male = 'male',
  Female = 'female'
}

export interface Player {
  id: string;
  officialName: {
    th?: string;
    en?: string;
    pronunciation: string;
  }
  displayName?: {
    th?: string;
    en?: string;
  }
  photo?: string;
  level: number;
  lastMatchEnd?: string;
  paymentStatus?: PaymentStatus;
  club: string;
  gender?: Gender;
  contact?: {
    tel: string;
    line: string;
  }
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

export enum TournamentMenu {
  Info = 'info',
  Participants = 'participants',
  Draw = 'draw',
  Matches = 'matches',
  Organize = 'organize',
  Me = 'me'
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

export type SimplePlayer = Pick<Player, 'id' | 'officialName' | 'displayName' | 'photo'>;
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
  managers: SimplePlayer[];
  venue: {
    name: {
      th: string;
      en: string;
    }
  };
  shuttlecockFee: number;
  payment: {
    code: string,
    name: string,
    bank: string
  },
}

export interface displayData {
  th: string;
  en: string;
  color: MuiColor;
}

export type TeamStatusDisplay = {
  [K in (typeof TeamStatus)[keyof typeof TeamStatus]]: displayData
}

export type PaymentStatusDisplay = {
  [K in (typeof PaymentStatus)[keyof typeof PaymentStatus]]: displayData
}

export interface EventTeam {
  id: string;
  players: Player[];
  contactPerson: Player;
  status: TeamStatus;
  paymentStatus: PaymentStatus;
  date: Date;
  shuttlecockCredit: number;
  slip?: string;
  note?: string;
}

export interface Event {
  id: string;
  description: string;
  tournament: Tournament;
  name: {
    th?: string;
    en?: string;
  };
  level?: number;
  fee: {
    amount: number;
    currency: string;
  };
  prize: string;
  format: EventFormat;
  limit: number;
  type: EventType;
  status: EventStatus;
  teams: [EventTeam];
}

export enum EventFormat {
  Group = 'group',
  GroupPlayoff = 'groupPlayoff',
  GroupPlayoffConsolation = 'groupPlayoffConsolation',
  SingleElimination = 'singleElim'
}

export enum EventType {
  Single = 'single',
  Double = 'double'
}

export enum EventStatus {
  Group = 'group',
  Playoff = 'playoff',
  Finished = 'finished'
}

export type MuiColor =
| 'default'
| 'primary'
| 'secondary'
| 'error'
| 'info'
| 'success'
| 'warning';