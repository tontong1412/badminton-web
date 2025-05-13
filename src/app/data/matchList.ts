import { Match, MatchStatus } from '@/type'

const matchList: Match[] = [
  {
    id: 'a2a39040-fb92-11ef-9c6e-e3748db9c509',
    date: '2025-03-07T12:10:06.538Z',
    status: MatchStatus.Waiting,
    teamA: {
      team: {
        id: '976c2a20-fb92-11ef-9c6e-e3748db9c509',
        players: [
          {
            id: '307280c0-fb84-11ef-8bff-9f2a5b4ecedd',
            photo: 'https://pbs.twimg.com/profile_images/1775209451047596032/qE8DKoAF_400x400.jpg',
            officialName: 'Eren Yeager',
            displayName: 'Eren',
            level: 2,
          },
          {
            id: 'f57eafb0-fb84-11ef-8bff-9f2a5b4ecedd',
            photo: 'https://practicaltyping.com/wp-content/uploads/2022/04/leviacker.jpg',
            officialName: 'Levi Ackerman',
            displayName: 'Levi',
            level: 8,
          },
        ],
      }
    },
    teamB: {
      team: {
        id: '8c7a5880-fb92-11ef-9c6e-e3748db9c509',
        players: [
          {
            id: '843c8780-fb8b-11ef-8439-735b291a5bf0',
            photo: 'https://wallpapersok.com/images/hd/mikasa-ackerman-short-haired-m5cgaysqztmwgsq6.jpg',
            officialName: 'Mikasa Ackerman',
            displayName: 'Mikasa',
            level: 8,
          },
          {
            id: '738a5fa0-fb92-11ef-9c6e-e3748db9c509',
            photo: 'https://i.pinimg.com/736x/ee/4c/d6/ee4cd699956f8dcf3134e120656b6ddd.jpg',
            officialName: 'Armin Arlert',
            displayName: 'Armin',
            level: 8,
          }
        ],
      }
    },
    shuttlecockUsed: 0,
  },
  {
    id: '6279ee50-fb9d-11ef-97be-5b00e855d53b',
    court: '1',
    date: '2025-03-07T12:10:06.538Z',
    status: MatchStatus.Playing,
    teamA: {
      team: {
        id: '976c2a20-fb92-11ef-9c6e-e3748db9c509',
        players: [
          {
            id: '307280c0-fb84-11ef-8bff-9f2a5b4ecedd',
            photo: 'https://pbs.twimg.com/profile_images/1775209451047596032/qE8DKoAF_400x400.jpg',
            officialName: 'Eren Yeager',
            displayName: 'Eren',
            level: 2,
          },
          {
            id: 'f57eafb0-fb84-11ef-8bff-9f2a5b4ecedd',
            photo: 'https://practicaltyping.com/wp-content/uploads/2022/04/leviacker.jpg',
            officialName: 'Levi Ackerman',
            displayName: 'Levi',
            level: 8,
          },
        ],
      }
    },
    teamB: {
      team: {
        id: '8c7a5880-fb92-11ef-9c6e-e3748db9c509',
        players: [
          {
            id: '843c8780-fb8b-11ef-8439-735b291a5bf0',
            photo: 'https://wallpapersok.com/images/hd/mikasa-ackerman-short-haired-m5cgaysqztmwgsq6.jpg',
            officialName: 'Mikasa Ackerman',
            displayName: 'Mikasa',
            level: 8,
          },
          {
            id: '738a5fa0-fb92-11ef-9c6e-e3748db9c509',
            photo: 'https://i.pinimg.com/736x/ee/4c/d6/ee4cd699956f8dcf3134e120656b6ddd.jpg',
            officialName: 'Armin Arlert',
            displayName: 'Armin',
            level: 8,
          }
        ],
      }
    },
    shuttlecockUsed: 0,
  }

]
export default matchList