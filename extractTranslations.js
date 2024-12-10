// vite-plugin-i18n-extract-translations.js
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

function extractTranslations(config) {
  let outputDir;
  let namespaceMapping = {};

  return {
    name: 'vite-plugin-i18n-extract-translations',
    async buildStart() {
      const { ns: nsConfig, output: outputPath = 'locales' /* i.e. ./dist/locales */ } = config || {};

      outputDir = path.resolve(__dirname, 'public', outputPath);

      for (const [namespace, nsPath] of Object.entries(nsConfig)) {
        // Use glob to find all translation files under nsPath
        const pattern = path.join(nsPath, '**', '*.i18n.json');
        const files = globSync(pattern);

        for (const file of files) {
          await extractLocaleFile(outputDir, file, namespace);
          const id = path.resolve(file);
          namespaceMapping[id] = namespace;
        }
      }
    },
    async watchChange(id) {      
      const namespace = namespaceMapping[id];
      if (namespace != null) {
        await extractLocaleFile(outputDir, id, namespace);
      }
    },
  };
}

function parseFileName(fileName) {
  // The pattern is: <key-prefix>.[<lang>].i18n.json
  const match = fileName.match(/^(.*\.)?\[([^\]]+)\]\.i18n\.json$/);

  if (match) {
    const keyPrefix = match[1];
    const lang = match[2];
    return { keyPrefix, lang };
  } else {
    throw new Error(`Invalid translation file name: ${fileName}`);
  }
}

async function extractLocaleFile(outputDir, file, namespace) {
  let { keyPrefix, lang } = parseFileName(path.basename(file));
  if (keyPrefix == null) {
    keyPrefix = '';
  }

  let fileContent = await fs.promises.readFile(file, 'utf-8');
  try {
    const jsonContent = JSON.parse(fileContent);

    // Prefix keys with keyPrefix
    let prefixedContent = {};
    for (const [key, value] of Object.entries(jsonContent)) {
      prefixedContent[`${keyPrefix}${key}`] = value;
    }

    const dir = path.join(outputDir, lang);
    const fileName = path.join(dir, `${namespace}.json`);
    if (fs.existsSync(fileName)) {
      const originalContent = JSON.parse(await fs.promises.readFile(fileName, 'utf-8'));
      prefixedContent = Object.assign(originalContent, prefixedContent);
    } else if (!fs.existsSync(dir)) {
      // Write file to public

      fs.mkdirSync(dir, { recursive: true });
    }

    fileContent = JSON.stringify(prefixedContent, null, 2);

    await fs.promises.writeFile(fileName, fileContent);
    console.log(`Extracted i18n resource file: ${fileName}`);
  } catch (e) {
  }
}

export default extractTranslations;
