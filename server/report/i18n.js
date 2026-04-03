const de = require('../../src/locales/de/common.json');
const en = require('../../src/locales/en/common.json');

const resources = { de, en };

function getLanguage(language) {
  return language === 'en' ? 'en' : 'de';
}

function getLocale(language) {
  return getLanguage(language) === 'en' ? 'en-US' : 'de-CH';
}

function getResource(language) {
  return resources[getLanguage(language)];
}

function translate(language, key, vars = {}) {
  const resource = getResource(language);
  const parts = key.split('.');
  let value = resource;

  for (const part of parts) {
    value = value?.[part];
  }

  if (typeof value !== 'string') return key;

  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ''));
}

module.exports = {
  getLanguage,
  getLocale,
  translate,
};
