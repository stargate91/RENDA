const localeFiles = import.meta.glob('../locales/*.js', { eager: true });
const locales = {};
export const availableLocales = [];

for (const path in localeFiles) {
  const code = path.match(/\/([a-z]{2})\.js$/)[1];
  const dict = localeFiles[path].default;
  locales[code] = dict;
  availableLocales.push({
    value: code,
    label: dict._lang_name || code.toUpperCase()
  });
}

// Simple translation helper
export const T = (key, params = {}, currentLang = 'en') => {
  const keys = key.split('.');
  let value = locales[currentLang] || locales['en'];
  
  for (const k of keys) {
    if (value && value[k]) value = value[k];
    else {
      // Fallback to English if key missing
      value = locales['en'];
      for (const f of keys) {
        if (value && value[f]) value = value[f];
        else return key;
      }
      break;
    }
  }
  
  if (typeof value === 'string') {
    let result = value;
    for (const [p, val] of Object.entries(params)) {
      result = result.replace(`{{${p}}}`, val);
    }
    return result;
  }
  return value;
};
