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

    const T = C.tipo(d.tipo), clase = C.claseTipo(d.tipo);
    $('frente').className = 'cara frente ' + clase; $('reverso').className = 'cara reverso ' + clase;
    $('frente').innerHTML =
      '<div class="banda"></div><img class="logo" src="../assets/cami-logo.png" alt="CAMI">' +
      '<div class="tipo">Cliente frecuente<br>' + esc(T.etiqueta) + '</div>' +
      '<div class="nombre">' + esc(d.nombre) + '</div>' +
      '<div class="qr">' + C.qrSvg(C.urlTarjeta(codigo), 'Código QR de la tarjeta') + '</div>' +
      '<div class="indica">Muestra este código en recepción</div>' +
      '<div class="pie-cara">camixochimilco.com.mx · WhatsApp ' + esc(CT.TELEFONO_TXT) + '</div>' +
      '<span class="etq">Frente</span>';

    const meta = d.meta || 5;
    let casillas = '';
    for (let i = 0; i < meta; i++) {
      const s = d.sellos[i];   // un sello puesto muestra el día y el mes en que se puso
      const f = s ? C.fechaCorta(s.fecha).split(' ') : null;
      casillas += s ? '<span class="on"><b>' + esc(f[0]) + '</b><i>' + esc(f[1]) + '</i></span>' : '<span>' + (i + 1) + '</span>';
    }
    casillas += '<span class="premio">' + (d.descuento >= 100 ? 'GRATIS' : d.descuento + '%') + '</span>';
    $('reverso').innerHTML =
      '<h2>' + esc(T.tituloImpreso) + '</h2>' +
      '<div class="casillas-imp">' + casillas + '</div>' +
      '<p>' + esc(T.regla) + '</p>' +
      '<span class="etq">Reverso</span>';

    $('hoja').hidden = false; $('instrucciones').hidden = false;
    document.title = 'Tarjeta CAMI · ' + d.nombre;
  }
  $('btn-imprimir').addEventListener('click', function () { window.print(); });
  iniciar();
})();
