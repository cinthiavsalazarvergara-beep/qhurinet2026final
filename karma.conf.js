// Configuración de Karma (base: `ng generate config karma`).
// Corre las pruebas en un navegador Chromium sin ventana. Si la máquina no tiene
// Google Chrome pero sí Microsoft Edge (también Chromium), se usa Edge.
const fs = require('fs');

if (!process.env.CHROME_BIN) {
  const candidatos = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ];
  const encontrado = candidatos.find((ruta) => fs.existsSync(ruta));
  if (encontrado) {
    process.env.CHROME_BIN = encontrado;
  }
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/qhurinet-angular'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadless'],
    restartOnFileChange: true,
  });
};
