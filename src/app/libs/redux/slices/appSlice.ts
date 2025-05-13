import { AppMenu, Language, User } from '@/type'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import i18n from '../../i18n'
import { DEFAULT_LANGUAGE, SUPPORTED_LANG } from '@/app/constants'

interface AppState {
  user: User | null;
  activeMenu: AppMenu;
  language: Language
}

const initialState: AppState = {
  user: null,
  activeMenu: AppMenu.Home,
  language: DEFAULT_LANGUAGE as Language
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
    changeLanguage: (state, action: PayloadAction<string>) => {
      const newLang = action.payload as Language
      if (SUPPORTED_LANG.includes(newLang)) {
        state.language = newLang
        // i18n is only available on client
        if (typeof window !== 'undefined') {
          i18n.changeLanguage(newLang)
          // TODO: figure out how to set i18n language on server
          // localStorage.setItem('i18nextLng', newLang)
        }
      }
    },
    initializeLanguage: (state) => {
      // Only run on client
      if (typeof window !== 'undefined') {
        // TODO: figure out how to set i18n language on server
        // const savedLang = localStorage.getItem('i18nextLng')
        // const browserLang = navigator.language.split('-')[0]

        const detectedLang = DEFAULT_LANGUAGE // Default fallbac'

        // if (savedLang && SUPPORTED_LANG.includes(savedLang)) {
        //   detectedLang = savedLang
        // } else if (browserLang && SUPPORTED_LANG.includes(browserLang)) {
        //   detectedLang = browserLang
        // }

        state.language = detectedLang as Language
        i18n.changeLanguage(detectedLang)
      }
    }
  }
})

export const { login, logout, setActiveMenu, changeLanguage, initializeLanguage } = appSlice.actions
export default appSlice.reducer
