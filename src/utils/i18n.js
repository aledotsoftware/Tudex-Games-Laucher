import enMessages from '../locales/en.json';
import esMessages from '../locales/es.json';
import ptMessages from '../locales/pt.json';
import twMessages from '../locales/tw.json';

const messages = {
  en: enMessages,
  es: esMessages,
  pt: ptMessages,
  tw: twMessages,
};

export const getMessages = (locale) => {
  return messages[locale] || messages.en;
};

export const getLocale = () => {
  // Try to get from localStorage first, then default to 'es'
  return localStorage.getItem('locale') || 'es';
};

export const setLocale = (locale) => {
  localStorage.setItem('locale', locale);
};
