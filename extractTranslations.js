// vite-plugin-i18n-extract-translations.js
import fs from "fs";
import path from "path";
import { globSync } from "glob";

function _set(object, prefix, key, value) {
  const parts = prefix.split(".");

  const lastKey = key;
  let node = object;
  let _key;
  for (let i = 0; i < parts.length; i++) {
    _key = parts[i];
    if (node[_key] == null) {
      node[_key] = {};
    }
    node = node[_key];
  }

  node[lastKey] = value;
}

function extractTranslations(config) {
  let outputDir;
  let namespaceMapping = {};

  const {
    ns: nsConfig,
    output: outputPath = "./dist/locales" /* i.e. ./dist/locales */,
    flatKey = false,
  } = config || {};

  return {
    name: "vite-plugin-i18n-extract-translations",
    async buildStart() {
      outputDir = path.resolve(outputPath);

      for (const [namespace, nsPath] of Object.entries(nsConfig)) {
        // Use glob to find all translation files under nsPath
        const pattern = path.join(nsPath, "**", "*.i18n.json");
        const files = globSync(
          pattern,
          process.platform === "win32"
            ? { windowsPathsNoEscape: true }
            : undefined
        );

        for (const file of files) {
          await extractLocaleFile(outputDir, file, namespace, flatKey);
          const id = path.resolve(file);
          namespaceMapping[id] = namespace;
        }
      }
    },
    async watchChange(id) {
      const namespace = namespaceMapping[id];
      if (namespace != null) {
        await extractLocaleFile(outputDir, id, namespace, flatKey);
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

async function extractLocaleFile(outputDir, file, namespace, flatKey) {
  let { keyPrefix, lang } = parseFileName(path.basename(file));
  if (keyPrefix == null) {
    keyPrefix = "";
  }

  let fileContent = await fs.promises.readFile(file, "utf-8");
  try {
    const jsonContent = JSON.parse(fileContent);

    // Prefix keys with keyPrefix
    let prefixedContent;
    if (keyPrefix) {
      prefixedContent = {};
      if (flatKey) {
        for (const [key, value] of Object.entries(jsonContent)) {
          prefixedContent[`${keyPrefix}${key}`] = value;
        }
      } else {
        keyPrefix = keyPrefix.slice(0, -1);
        for (const [key, value] of Object.entries(jsonContent)) {
          _set(prefixedContent, keyPrefix, key, value);
        }
      }
    } else {
      prefixedContent = jsonContent;
    }

    const dir = path.join(outputDir, lang);
    const fileName = path.join(dir, `${namespace}.json`);
    if (fs.existsSync(fileName)) {
      const originalContent = JSON.parse(
        await fs.promises.readFile(fileName, "utf-8")
      );
      prefixedContent = Object.assign(originalContent, prefixedContent);
    } else if (!fs.existsSync(dir)) {
      // Write file to public

      fs.mkdirSync(dir, { recursive: true });
    }

    fileContent = JSON.stringify(prefixedContent, null, 2);

    await fs.promises.writeFile(fileName, fileContent);
    console.log(`Extracted i18n resource file: ${file} -> ${fileName}`);
  } catch (e) {}
}

export default extractTranslations;
