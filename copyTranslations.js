// vite-plugin-i18n-copy-translations.js
import fs from "fs";
import path from "path";
import { globSync } from "glob";

function copyTranslations(config) {
  return {
    name: "vite-plugin-i18n-copy-translations",
    async buildStart() {
      const { from, to: publicDir = "public" } = config || {};

      if (!from || !Array.isArray(from)) {
        throw new Error(
          'The "from" configuration must be an array of source directories.'
        );
      }

      for (const srcDir of from) {
        const localesPattern = path.resolve(srcDir, "locales", "*", "*.json");

        const files = globSync(localesPattern);

        for (const file of files) {
          const relativePath = path.relative(
            path.join(srcDir, "locales"),
            file
          );
          const destPath = path.resolve(publicDir, "locales", relativePath);

          // 确保目标目录存在
          await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

          // 复制文件
          await fs.promises.copyFile(file, destPath);
          console.log(`Copied "${destPath}"`);
        }
      }
    },
  };
}

export default copyTranslations;
