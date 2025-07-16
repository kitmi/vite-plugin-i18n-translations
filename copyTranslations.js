// vite-plugin-i18n-copy-translations.js
import fs from "fs";
import path from "path";
import { globSync } from "glob";

const isDir = (path) => fs.statSync(path).isDirectory();

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

      const destRoot = path.resolve(publicDir, "locales");

      for (const srcDir of from) {
        const localesRoot = path.resolve(srcDir, "locales");
        if (!fs.existsSync(localesRoot)) {
          continue;
        }
        const localesPattern = path.join(localesRoot, "*", "*.json");

        const files = globSync(
          localesPattern,
          process.platform === "win32" ? { windowsPathsNoEscape: true } : undefined
        );

        for (const file of files) {
          const relativePath = path.relative(
            path.join(srcDir, "locales"),
            file
          );
          const destPath = path.join(destRoot, relativePath);

          // 确保目标目录存在
          await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

          // 复制文件
          await fs.promises.copyFile(file, destPath);
          console.log(`Copied "${destPath}"`);
        }

        (async () => {
          const watcher = fs.promises.watch(localesRoot, { recursive: true });
          for await (const event of watcher) {
            if (event.filename === 'locales') { // the root folder will be emitted first, bug?
              continue;
            }         

            const fullPath = path.resolve(localesRoot, event.filename);
            if (!isDir(fullPath)) {
              const destPath = path.join(destRoot, event.filename);
              if (!fs.existsSync(fullPath)) {
                await fs.promises.unlink(destPath);
                console.log(`Removed locale ${destPath}`);
                return;
              }

              await fs.promises.copyFile(fullPath, destPath);
              console.log(`Updated "${destPath}"`);
            }
          }
        })();
      }
    },
  };
}

export default copyTranslations;
