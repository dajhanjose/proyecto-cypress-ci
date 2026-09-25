// Archivo de soporte que Cypress carga antes de cada archivo de prueba.

// XYZ Bank es una aplicación AngularJS antigua: a veces su propio JavaScript
// lanza errores internos que no afectan la funcionalidad. Sin esta línea,
// Cypress fallaría la prueba por esos errores ajenos. Las aserciones del
// test siguen siendo las que deciden si la prueba pasa o falla.
Cypress.on('uncaught:exception', () => false);
