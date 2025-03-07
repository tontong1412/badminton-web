import { Player } from '@/type'
import { PaymentStatus } from '@/type'

const mockPlayers: Player[] = [
  {
    id: '307280c0-fb84-11ef-8bff-9f2a5b4ecedd',
    photo: 'https://pbs.twimg.com/profile_images/1775209451047596032/qE8DKoAF_400x400.jpg',
    officialName: 'Eren Yeager',
    displayName: 'Eren',
    level: 2,
    lastMatchEnd: '2025-03-07T12:10:06.538Z',
    paymentStatus: PaymentStatus.Unpaid
  },
  {
    id: 'f57eafb0-fb84-11ef-8bff-9f2a5b4ecedd',
    photo: 'https://practicaltyping.com/wp-content/uploads/2022/04/leviacker.jpg',
    officialName: 'Levi Ackerman',
    displayName: 'Levi',
    level: 8,
    lastMatchEnd: '2025-03-07T12:10:06.538Z',
    paymentStatus: PaymentStatus.Unpaid
  },
  {
    id: '843c8780-fb8b-11ef-8439-735b291a5bf0',
    photo: 'https://wallpapersok.com/images/hd/mikasa-ackerman-short-haired-m5cgaysqztmwgsq6.jpg',
    officialName: 'Mikasa Ackerman',
    displayName: 'Mikasa',
    level: 8,
    lastMatchEnd: '2025-03-07T12:10:06.538Z',
    paymentStatus: PaymentStatus.Unpaid
  },
  {
    id: '738a5fa0-fb92-11ef-9c6e-e3748db9c509',
    photo: 'https://i.pinimg.com/736x/ee/4c/d6/ee4cd699956f8dcf3134e120656b6ddd.jpg',
    officialName: 'Armin Arlert',
    displayName: 'Armin',
    level: 8,
    lastMatchEnd: '2025-03-07T12:10:06.538Z',
    paymentStatus: PaymentStatus.Unpaid
  }
]

export default mockPlayers