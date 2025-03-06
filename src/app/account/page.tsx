import Image from 'next/image'

const PlayerPage = () => {
  const player = {
    photo: '/avatar.png',
    name: 'John Doe',
    team: 'Aalto Badminton Club',
    level: 'Intermediate'
  }

  return (
    <div className='flex flex-col items-center p-8 bg-gradient-to-r w-full max-w-md mx-auto'>
      <div className='relative w-32 h-32'>
        <Image
          src={player.photo}
          alt={player.name}
          fill
          className='rounded-full shadow-md object-cover'
        />
      </div>
      <h2 className='text-2xl font-bold text-blue-700 mb-2'>{player.name}</h2>
      <p className='text-md text-gray-700 mb-1'>{player.team}</p>
      <p className='text-md text-gray-700'>Level: <span className='font-medium text-blue-500'>{player.level}</span></p>
    </div>
  )
}

export default PlayerPage