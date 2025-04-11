import { AppMenu, User } from '@/type'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  user: User | null;
  activeMenu: AppMenu;
}

const initialState: AppState = {
  user: null,
  activeMenu: AppMenu.Home,
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    login(state, action: PayloadAction<User>) {
      state.user = { ...state.user, ...action.payload }
    },
    logout(state) {
      state.user = null
    },
    setActiveMenu(state, action: PayloadAction<AppMenu>) {
      state.activeMenu = action.payload
    },
  },
})

export const { login, logout, setActiveMenu } = appSlice.actions
export default appSlice.reducer
