import { createContext, useContext, useState } from 'react'
import { t as translate } from '../lib/i18n'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('crm_lang') || 'es')

  function cambiarIdioma(code) {
    setLang(code)
    localStorage.setItem('crm_lang', code)
  }

  function t(key) {
    return translate(key, lang)
  }

  return (
    <LangContext.Provider value={{ lang, cambiarIdioma, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
