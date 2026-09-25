/// <reference types="cypress" />

/**
 * Caso de prueba E2E de UI - XYZ Bank (GlobalSQA)
 * https://www.globalsqa.com/angularJs-protractor/BankingProject
 *
 * Flujo completo de una cuenta bancaria:
 *   1. Página de inicio                 -> aserciones de carga
 *   2. Gerente: crear cliente           -> .type() en formulario + validación de la alerta
 *   3. Gerente: abrir cuenta            -> .select() + captura del número de cuenta
 *   4. Gerente: buscar cliente          -> .type() en buscador + validación de la tabla
 *   5. Cliente: iniciar sesión          -> navegación + validación de datos de la cuenta
 *   6. Cliente: depositar               -> .type() + .click() + validación del saldo
 *   7. Cliente: retirar                 -> .type() + .click() + validación del saldo
 *   8. Cliente: retiro mayor al saldo   -> prueba negativa, el saldo no debe cambiar
 *   9. Cerrar sesión                    -> aserción final obligatoria
 */
describe('Pruebas de Interfaz - XYZ Bank (GlobalSQA)', function () {
  const URL_BANCO = 'https://www.globalsqa.com/angularJs-protractor/BankingProject/#/login';

  // Datos de prueba centralizados
  const cliente = {
    nombre: 'Laura',
    apellido: 'Gomez',
    codigoPostal: 'E12345',
    moneda: 'Dollar',
  };
  const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;

  const montos = {
    deposito: 5000,
    retiro: 1500,
    retiroExcesivo: 10000,
  };
  const saldoEsperado = montos.deposito - montos.retiro; // 3500

  // Selectores reutilizados
  const saldo = () => cy.get('div.center strong.ng-binding').eq(1);
  const mensaje = () => cy.get('span[ng-show="message"]');

  it('Validación de flujo de navegación e interacción en cuenta bancaria', function () {
    // Las alertas del navegador (window.alert) se capturan para poder validarlas
    const alerta = cy.stub().as('alerta');
    cy.on('window:alert', alerta);

    // ─────────────────────────────────────────────────────────────
    // 1. Navegación inicial y validación de la página de inicio
    // ─────────────────────────────────────────────────────────────
    cy.visit(URL_BANCO);
    cy.title().should('include', 'XYZ Bank');
    cy.get('strong.mainHeading').should('be.visible').and('contain', 'XYZ Bank');
    cy.get('button[ng-click="customer()"]').should('be.visible').and('contain', 'Customer Login');
    cy.get('button[ng-click="manager()"]').should('be.visible').and('contain', 'Bank Manager Login');

    // ─────────────────────────────────────────────────────────────
    // 2. Gerente del banco: registrar un cliente nuevo
    // ─────────────────────────────────────────────────────────────
    cy.get('button[ng-click="manager()"]').click();
    cy.url().should('include', '/manager');

    cy.get('button[ng-click="addCust()"]').click();
    cy.get('form[ng-submit="addCustomer()"]').should('be.visible');

    cy.get('input[ng-model="fName"]').type(cliente.nombre).should('have.value', cliente.nombre);
    cy.get('input[ng-model="lName"]').type(cliente.apellido).should('have.value', cliente.apellido);
    cy.get('input[ng-model="postCd"]').type(cliente.codigoPostal).should('have.value', cliente.codigoPostal);
    cy.get('form[ng-submit="addCustomer()"] button[type="submit"]').click();

    cy.get('@alerta').should('have.been.calledWithMatch', /Customer added successfully/);

    // ─────────────────────────────────────────────────────────────
    // 3. Gerente del banco: abrir una cuenta en dólares al cliente
    // ─────────────────────────────────────────────────────────────
    cy.get('button[ng-click="openAccount()"]').click();
    cy.get('form[ng-submit="process()"]').should('be.visible');

    cy.get('#userSelect').select(nombreCompleto);
    cy.get('#userSelect option:selected').should('contain', nombreCompleto);
    cy.get('#currency').select(cliente.moneda).should('have.value', cliente.moneda);
    cy.get('form[ng-submit="process()"] button[type="submit"]').click();

    cy.get('@alerta')
      .should('have.been.calledWithMatch', /Account created successfully/)
      .then((stub) => {
        // Texto de la alerta: "Account created successfully with account Number :1016"
        const numeroCuenta = stub.lastCall.args[0].split(':')[1].trim();
        expect(numeroCuenta, 'número de cuenta generado').to.match(/^\d+$/);
        cy.wrap(numeroCuenta).as('numeroCuenta');
      });

    // ─────────────────────────────────────────────────────────────
    // 4. Gerente del banco: buscar al cliente en el listado
    // ─────────────────────────────────────────────────────────────
    cy.get('button[ng-click="showCust()"]').click();
    cy.get('input[ng-model="searchCustomer"]').type(cliente.apellido);

    cy.get('table.table-bordered tbody tr').should('have.length', 1);
    cy.get('@numeroCuenta').then((numeroCuenta) => {
      cy.get('table.table-bordered tbody tr')
        .first()
        .should('contain', cliente.nombre)
        .and('contain', cliente.apellido)
        .and('contain', cliente.codigoPostal)
        .and('contain', numeroCuenta);
    });

    // ─────────────────────────────────────────────────────────────
    // 5. Cliente: iniciar sesión con el cliente recién creado
    // ─────────────────────────────────────────────────────────────
    cy.visit(URL_BANCO); // volver a la página de inicio del banco
    cy.get('button[ng-click="customer()"]').click();
    cy.url().should('include', '/customer');
    cy.contains('label', 'Your Name').should('be.visible');

    cy.get('#userSelect').select(nombreCompleto);
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Login').click();

    cy.url().should('include', '/account');
    cy.get('span.fontBig').should('have.text', nombreCompleto);
    cy.get('@numeroCuenta').then((numeroCuenta) => {
      cy.get('div.center strong.ng-binding').eq(0).should('contain', numeroCuenta);
    });
    saldo().should(($el) => {
      expect(Number($el.text().trim()), 'saldo inicial de la cuenta nueva').to.eq(0);
    });
    cy.get('div.center strong.ng-binding').eq(2).should('contain', cliente.moneda);

    // ─────────────────────────────────────────────────────────────
    // 6. Cliente: depositar dinero
    // ─────────────────────────────────────────────────────────────
    cy.get('button[ng-click="deposit()"]').click();
    cy.get('form[ng-submit="deposit()"]').should('be.visible');
    cy.contains('label', 'Amount to be Deposited').should('be.visible');

    cy.get('form[ng-submit="deposit()"] input')
      .type(`${montos.deposito}`)
      .should('have.value', `${montos.deposito}`);
    cy.get('form[ng-submit="deposit()"] button').click();

    mensaje().should('be.visible').and('contain', 'Deposit Successful');
    saldo().should(($el) => {
      expect(Number($el.text().trim()), 'saldo después del depósito').to.eq(montos.deposito);
    });

    // ─────────────────────────────────────────────────────────────
    // 7. Cliente: retirar dinero
    // ─────────────────────────────────────────────────────────────
    cy.get('button[ng-click="withdrawl()"]').click();
    cy.get('form[ng-submit="withdrawl()"]').should('be.visible');
    cy.contains('label', 'Amount to be Withdrawn').should('be.visible');

    cy.get('form[ng-submit="withdrawl()"] input')
      .type(`${montos.retiro}`)
      .should('have.value', `${montos.retiro}`);
    cy.get('form[ng-submit="withdrawl()"] button').click();

    mensaje().should('be.visible').and('contain', 'Transaction successful');
    saldo().should(($el) => {
      expect(Number($el.text().trim()), 'saldo después del retiro').to.eq(saldoEsperado);
    });

    // ─────────────────────────────────────────────────────────────
    // 8. Cliente: intentar retirar más dinero del disponible
    // ─────────────────────────────────────────────────────────────
    cy.get('form[ng-submit="withdrawl()"] input')
      .clear()
      .type(`${montos.retiroExcesivo}`)
      .should('have.value', `${montos.retiroExcesivo}`);
    cy.get('form[ng-submit="withdrawl()"] button').click();

    mensaje().should('be.visible').and('contain', 'Transaction Failed');
    saldo().should(($el) => {
      expect(Number($el.text().trim()), 'el saldo no cambia si el retiro es rechazado').to.eq(saldoEsperado);
    });

    // ─────────────────────────────────────────────────────────────
    // 9. Cerrar sesión
    // ─────────────────────────────────────────────────────────────
    cy.get('button[ng-click="byebye()"]').should('be.visible').click();

    // ── Aserción final obligatoria ──
    // Tras cerrar sesión, el usuario vuelve a la pantalla de selección de cliente.
    cy.contains('label', 'Your Name').should('be.visible');
    cy.get('#userSelect').should('be.visible');
  });
});
