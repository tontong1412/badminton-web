import { Autocomplete, createFilterOptions, TextField } from '@mui/material'
import { initialPlayer, Player } from '.'

const filter = createFilterOptions<Player>()

interface Props {
  player: 'player1' | 'player2'
  playerList: Player[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlePlayerChange: (player: 'player1' | 'player2', field: keyof Player, value: any) => Promise<void>
  setPlayer: (player: Player) => void
  playerValue: Player
  label: string
  disabled: boolean
}
const AutocompletePlayer = ({ playerValue, playerList, handlePlayerChange, setPlayer, player, label, disabled }: Props) => {
  return (
    <Autocomplete
      id="autocomplete-player"
      options={playerList}
      disabled={disabled}
      value={playerValue || initialPlayer}
      renderInput={(params) => <TextField required {...params} fullWidth label={label} />}
      getOptionLabel={(option) => {
        // Value selected with enter, right from the input
        if (typeof option === 'string') {
          return option
        }
        // Add "xxx" option created dynamically
        if (option.inputValue) {
          return option.inputValue
        }
        // Regular option
        return option.officialName
      }}
      onChange={(event, newValue) => {
        if (typeof newValue === 'string') {
          handlePlayerChange(player, 'officialName', newValue)
        } else if (newValue && newValue.inputValue) {
          // Create a new value from the user input
          setPlayer({
            id: '',
            officialName: newValue.inputValue,
            officialNameEn: '',
            pronunciation: '',
            displayName: '',
            club: '',
            gender: 'female',
            photo: undefined,
            inputValue: '',
            level: 0,
          })
        } else {
          setPlayer(
            newValue
              ? {
                id: newValue.id || '',
                officialName: newValue.officialName || '',
                officialNameEn: newValue.officialNameEn || '',
                displayName: newValue.displayName || '',
                pronunciation: newValue.pronunciation || '',
                club: newValue.club || '',
                gender: newValue.gender || 'female',
                photo: undefined,
                inputValue: '',
                level: newValue.level || 0,
                photoPreview: newValue?.photo || ''
              }
              : initialPlayer
          )
        }
      }}
      renderOption={(props, option) => {
        // eslint-disable-next-line react/prop-types, @typescript-eslint/no-unused-vars
        const { key, ...optionProps } = props
        return (
          <li key={option.id} {...optionProps}>
            {option.officialName}
          </li>
        )
      }}
      filterOptions={(options, params) => {
        const filtered = filter(options, params)

        const { inputValue } = params
        // Suggest the creation of a new value
        const isExisting = options.some((option) => inputValue === option.officialName)
        if (inputValue !== '' && !isExisting) {
          filtered.push({
            inputValue,
            officialName: `Add "${inputValue}"`,
            officialNameEn: '',
            displayName: '',
            pronunciation: '',
            club: '',
            gender: 'female',
            photo: undefined,
            level: 0,
            id: 'none'
          })
        }

        return filtered
      }}
    />
  )
}

export default AutocompletePlayer