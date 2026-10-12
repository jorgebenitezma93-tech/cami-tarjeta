/* Tarjeta impresa (tamaño tarjeta de crédito, 85.6 × 54 mm): frente con nombre y QR, reverso con 10 casillas. */
(function () {
  'use strict';
  const C = window.CAMI, CT = C.config, esc = C.esc;
  const $ = function (id) { return document.getElementById(id); };
  const codigo = C.codigoDe(new URLSearchParams(location.search).get('c') || '');

  function error(titulo, texto) { $('mensaje').innerHTML = '<div class="aviso mal"><strong>' + esc(titulo) + '</strong>' + esc(texto) + '</div>'; }

  async function iniciar() {
    if (!codigo) { error('Falta la tarjeta', 'Abre esta página desde el botón «Imprimir tarjeta» de la página de recepción.'); return; }
    const d = await C.API.tarjeta(codigo);
    if (!d.ok) { error('No se pudo preparar la tarjeta', d.mensaje); return; }

    $('frente').innerHTML =
      '<div class="banda"></div><img class="logo" src="../assets/cami-logo.png" alt="CAMI">' +
      '<div class="tipo">Tarjeta de cliente frecuente</div>' +
      '<div class="nombre">' + esc(d.nombre) + '</div>' +
      '<div class="qr">' + C.qrSvg(C.urlTarjeta(codigo), 'Código QR de la tarjeta') + '</div>' +
      '<div class="indica">Muestra este código en recepción</div>' +
      '<div class="pie-cara">camixochimilco.com.mx · WhatsApp ' + esc(CT.TELEFONO_TXT) + '</div>' +
      '<span class="etq">Frente</span>';

    const meta = d.meta || CT.META;
    let casillas = '';
    for (let i = 0; i < meta; i++) casillas += '<span class="' + (i < d.conteo ? 'on' : '') + '">' + (i < d.conteo ? '✓' : (i + 1)) + '</span>';
    $('reverso').innerHTML =
      '<h2>' + meta + ' sellos = ' + CT.DESCUENTO + '% de descuento</h2>' +
      '<div class="casillas-imp">' + casillas + '</div>' +
      '<p>' + esc(CT.TEXTO_REGLA) + '</p>' +
      '<span class="etq">Reverso</span>';

    $('hoja').hidden = false; $('instrucciones').hidden = false;
    document.title = 'Tarjeta CAMI · ' + d.nombre;
  }
  $('btn-imprimir').addEventListener('click', function () { window.print(); });
  iniciar();
})();
