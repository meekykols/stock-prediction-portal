import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// Add a language: create locales/<code>.json and register it in `resources`.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: (() => { try { return localStorage.getItem('pw-lang') || 'en'; } catch { return 'en'; } })(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
