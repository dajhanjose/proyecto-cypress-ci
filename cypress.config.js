const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Tamaño de pantalla de escritorio para que todos los botones sean visibles
    viewportWidth: 1280,
    viewportHeight: 800,
    // El sitio es externo y a veces responde lento: más tiempo de espera
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    // En el servidor de CI (cypress run) se reintenta hasta 2 veces si falla
    // por un problema de red del sitio externo. En modo GUI no se reintenta.
    retries: {
      runMode: 2,
      openMode: 0,
    },
    video: false,
    setupNodeEvents(on, config) {
      // Sin plugins adicionales
    },
  },
});
