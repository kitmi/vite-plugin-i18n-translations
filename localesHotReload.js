export default function I18nHotReload() {
  return {
    name: 'vite-plugin-i18n-locales-hot-reload',
    handleHotUpdate({ file, server }) {        
      if (file.endsWith('.i18n.json')) {
        server.ws.send({
          type: "custom",
          event: "locales-update",
        });
      }
    },
  }
}