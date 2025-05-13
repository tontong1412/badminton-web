import { Autocomplete, createFilterOptions, TextField } from '@mui/material'
import { initialPlayer } from '.'

const filter = createFilterOptions<Player>()

interface Player {
  id?: string;
  officialName: string;
  displayName: string;
  pronunciation?: string;
  level: number;
  club: string;
  gender: string;
  photo: File | null;
  inputValue?: string; // For dynamic option creation
}

interface Props {
  player: 'player1' | 'player2'
  playerList: Player[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlePlayerChange: (player: 'player1' | 'player2', field: keyof Player, value: any) => Promise<void>
  setPlayer: (player: Player) => void
  playerValue: Player
  label: string
}
const AutocompletePlayer = ({ playerValue, playerList, handlePlayerChange, setPlayer, player, label }: Props) => {
  return (
    <Autocomplete
      id="autocomplete-player"
      options={playerList}
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
            pronunciation: '',
            displayName: '',
            club: '',
            gender: 'female',
            photo: null,
            inputValue: '',
            level: 0,
          })
        } else {
          setPlayer(
            newValue
              ? {
                id: newValue.id || '',
                officialName: newValue.officialName || '',
                displayName: newValue.displayName || '',
                pronunciation: newValue.pronunciation || '',
                club: newValue.club || '',
                gender: newValue.gender || 'female',
                photo: null,
                inputValue: '',
                level: newValue.level || 0,
              }
              : initialPlayer
          )
        }
      }}
      renderOption={(props, option) => {
        // eslint-disable-next-line react/prop-types
        const { key, ...optionProps } = props
        return (
          <li key={key} {...optionProps}>
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
            displayName: '',
            pronunciation: '',
            club: '',
            gender: 'female',
            photo: null,
            level: 0,
          })
        }

        return filtered
      }}
    />
  )
}

export default AutocompletePlayer