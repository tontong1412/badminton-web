import { AppMenu, Language, TournamentMenu, User } from '@/type'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import i18n from '../../i18n'
import { DEFAULT_LANGUAGE, SUPPORTED_LANG } from '@/app/constants'

interface AppState {
  user: User | null;
  userReady: boolean;
  activeMenu: AppMenu | TournamentMenu;
  language: Language
}

const initialState: AppState = {
  user: null,
  userReady: false,
  activeMenu: AppMenu.Home,
  language: DEFAULT_LANGUAGE as Language
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    login(state, action: PayloadAction<User>) {
      state.user = { ...state.user, ...action.payload }
      state.userReady = true
    },
    logout(state) {
      state.user = null
      state.userReady = true
    },
    setUserReady(state) {
      state.userReady = true
    },
    setActiveMenu(state, action: PayloadAction<AppMenu | TournamentMenu>) {
      state.activeMenu = action.payload
    },
    changeLanguage: (state, action: PayloadAction<string>) => {
      const newLang = action.payload as Language
      if (SUPPORTED_LANG.includes(newLang)) {
        state.language = newLang
        // i18n is only available on client
        if (typeof window !== 'undefined') {
          i18n.changeLanguage(newLang)
          localStorage.setItem('lang', newLang)
        }
      }
    },
    initializeLanguage: (state) => {
      // Only run on client
      if (typeof window !== 'undefined') {
        const savedLang = localStorage.getItem('lang')
        const detectedLang = (savedLang && SUPPORTED_LANG.includes(savedLang) ? savedLang : DEFAULT_LANGUAGE) as Language
        state.language = detectedLang
        i18n.changeLanguage(detectedLang)
      }
    }
  }
})

export const { login, logout, setUserReady, setActiveMenu, changeLanguage, initializeLanguage } = appSlice.actions
export default appSlice.reducer
