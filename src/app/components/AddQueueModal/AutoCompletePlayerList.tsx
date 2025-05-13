'use client'
import { MAP_LEVEL_TO_LABEL } from '@/app/constants'
import { Player } from '@/type'
import { Avatar, Box } from '@mui/material'
import moment from 'moment'
import { HTMLAttributes } from 'react'
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom'

interface AutoCompletePlayerListProps {
  option: Player
  props: HTMLAttributes<HTMLLIElement>
}

const AutoCompletePlayerList = ({ props, option }: AutoCompletePlayerListProps) => {
  const { ...optionsProps } = props
  return (
    <Box
      key={option.id}
      component='li'
      {...optionsProps}
    >
      <div className='flex p-1 items-center justify-between w-full'>
        <div className='flex gap-1'>
          <Avatar src={option.photo || '/avatar.png'}/>
          <div >
            <div>{option.displayName || option.officialName}</div>
            <div className='text-xs'>{MAP_LEVEL_TO_LABEL[option.level]}</div>
          </div>
        </div>
        <div className='flex'>
          <HourglassBottomIcon/>
          <div>{moment().diff(moment(option.lastMatchEnd), 'minutes')}</div>
        </div>
      </div>
    </Box>
  )
}
export default AutoCompletePlayerList