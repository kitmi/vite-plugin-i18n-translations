// vite-plugin-i18n-extract-translations.js
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

function extractTranslations(config) {
  return {
    name: 'vite-plugin-i18n-extract-translations',
    apply: 'build',
    async generateBundle(options, bundle) {
      const { ns: nsConfig, output: outputPath = 'locales' /* i.e. ./dist/locales */ } = config || {};
      const translations = {}; // { [lang]: { [namespace]: { [key]: value } } }

      for (const [namespace, nsPath] of Object.entries(nsConfig)) {
        // Use glob to find all translation files under nsPath
        const pattern = path.join(nsPath, '**', '*.i18n.json');
        const files = globSync(pattern);

        for (const file of files) {
          const { keyPrefix, lang } = parseFileName(path.basename(file));

          const fileContent = await fs.promises.readFile(file, 'utf-8');
          const jsonContent = JSON.parse(fileContent);

          // Prefix keys with keyPrefix
          const prefixedContent = {};
          for (const [key, value] of Object.entries(jsonContent)) {
            prefixedContent[`${keyPrefix}.${key}`] = value;
          }

          if (!translations[lang]) {
            translations[lang] = {};
          }

          if (!translations[lang][namespace]) {
            translations[lang][namespace] = {};
          }

          Object.assign(translations[lang][namespace], prefixedContent);
        }
      }

      // Write the files into the bundle
      for (const [lang, namespaces] of Object.entries(translations)) {
        for (const [namespace, content] of Object.entries(namespaces)) {
          const fileName = path.join(outputPath, lang, `${namespace}.json`);
          const fileContent = JSON.stringify(content, null, 2);

          // Add the file to the bundle
          bundle[fileName] = {
            fileName,
            type: 'asset',
            source: fileContent,
          };
        }
      }
    },
  };
}

function parseFileName(fileName) {
  // The pattern is: <key-prefix>.[<lang>].i18n.json
  const match = fileName.match(/^(.*)\.\[([^\]]+)\]\.i18n\.json$/);
  if (match) {
    const keyPrefix = match[1];
    const lang = match[2];
    return { keyPrefix, lang };
  } else {
    throw new Error(`Invalid translation file name: ${fileName}`);
  }
}

export default extractTranslations;