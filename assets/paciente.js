/* Tarjeta del paciente: muestra sus sellos y su QR. Solo lee; nunca escribe. */
(function () {
  'use strict';
  const C = window.CAMI, CT = C.config, esc = C.esc;
  const vista = document.getElementById('vista');
  const CLAVE_CODIGO = 'cami_tarjeta_codigo';
  const CLAVE_CACHE = 'cami_tarjeta_cache_';

  document.getElementById('enlace-wa').href = 'https://wa.me/52' + CT.WHATSAPP;
  document.getElementById('enlace-sitio').href = CT.SITIO;
  document.getElementById('enlace-aviso').href = CT.AVISO_URL;

  function guardado(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* modo privado */ } }

  const codigoUrl = C.codigoDe(new URLSearchParams(location.search).get('c') || '');
  const codigo = codigoUrl || C.codigoDe(guardado(CLAVE_CODIGO) || '');
  let conteoPrevio = -1;

  function mensaje(titulo, texto, tipo) {
    vista.innerHTML = '<div class="aviso ' + (tipo || '') + '"><strong>' + esc(titulo) + '</strong>' + esc(texto) + '</div>';
  }

  function pintar(d, opciones) {
    opciones = opciones || {};
    const meta = d.meta || 5;
    const T = C.tipo(d.tipo);
    let casillas = '';
    for (let i = 0; i < meta; i++) {
      const s = d.sellos[i];
      const nuevo = s && conteoPrevio >= 0 && i >= conteoPrevio ? ' nuevo' : '';
      casillas += s
        ? '<li class="sello puesto' + nuevo + '"><span class="circulo" role="img" aria-label="Sello ' + (i + 1) + ', ' + esc(C.fechaLarga(s.fecha)) + '">' + C.selloImg() + '</span><span class="fecha">' + esc(C.fechaCorta(s.fecha)) + '</span></li>'
        : '<li class="sello"><span class="circulo" aria-label="Sello ' + (i + 1) + ', vacío">' + (i + 1) + '</span><span class="fecha"></span></li>';
    }
    const premioTxt = d.descuento >= 100 ? 'GRATIS' : d.descuento + '%';
    casillas += '<li class="sello premio' + (d.recompensa ? ' listo' : '') + '"><span class="circulo" role="img" aria-label="Sexta sesión: ' + esc(T.premio) + '">' + premioTxt + '</span><span class="fecha">Sexta sesión</span></li>';
    let nota = '';
    if (d.recompensa) nota = 'Completaste tus ' + meta + ' sellos.';
    else if (d.proximoVence) nota = 'Tu sello más antiguo vence el ' + C.fechaLarga(d.proximoVence) + '.';
    else if (d.canjes) nota = 'Ya canjeaste ' + d.canjes + (d.canjes === 1 ? ' recompensa. ¡Gracias!' : ' recompensas. ¡Gracias!');
    else nota = 'Pide tu primer sello en tu próxima ' + T.sesion + '.';

    const avance = d.recompensa ? '¡Tarjeta completa!' : d.conteo + ' de ' + meta + ' sellos';
    let html = '';
    if (opciones.sinConexion) {
      html += '<div class="aviso alerta"><strong>Sin conexión</strong>Mostrando lo último que guardamos en este celular (' + esc(opciones.sinConexion) + '). Tus sellos pueden haber cambiado.</div>';
    }
    html += '<section class="carta ' + C.claseTipo(d.tipo) + '" aria-label="Tarjeta de cliente frecuente, ' + esc(T.etiqueta) + '"><span class="tipo">Cliente frecuente · ' + esc(T.etiqueta) + '</span>' +
      '<h1>' + esc(d.nombre) + '</h1><p class="avance">' + esc(avance) + '</p>' +
      '<ol class="sellos">' + casillas + '</ol><p class="nota">' + esc(nota) + '</p></section>';
    if (d.recompensa) {
      html += '<section class="recompensa"><h2>' + (d.descuento >= 100 ? '¡Tienes una sesión gratis!' : '¡Tienes una promoción!') + '</h2><p>' + esc(T.avisoRecompensa) + '</p></section>';
    }
    if (d.ganadas > 0) {   // al completar el sello 5 aparece «Promociones» con su cuenta
      html += '<section class="panel promos"><h2 style="font-size:1.05rem">Promociones</h2><div class="cifras">' +
        '<div><b>' + d.ganadas + '</b><span>ganadas</span></div>' +
        '<div><b>' + d.canjes + '</b><span>canjeadas</span></div>' +
        '<div class="disp"><b>' + (d.recompensa ? 1 : 0) + '</b><span>disponible</span></div></div></section>';
    }
    html += '<section class="panel codigo-qr"><h2>Tu código</h2><p class="muted pequeno">Muéstralo en recepción en cada ' + esc(T.sesion) + '. Sube el brillo de tu pantalla si no lo lee.</p>' +
      '<div class="qr">' + C.qrSvg(C.urlTarjeta(codigoActual()), 'Código QR de tu tarjeta CAMI') + '</div></section>';
    html += '<section class="panel"><h2 style="font-size:1.05rem;margin-bottom:6px">Cómo funciona</h2><p class="regla">' + esc(T.regla) + '</p></section>';
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const guiaPrevia = vista.querySelector('details.guia');
    html += '<details class="guia"' + (opciones.guiaAbierta || (guiaPrevia && guiaPrevia.open) ? ' open' : '') + '><summary>Guarda esta tarjeta en tu celular</summary><div class="cuerpo">' +
      (ios
        ? '<p><strong>iPhone (Safari):</strong></p><ol><li>Toca el botón <em>Compartir</em> (el cuadro con una flecha hacia arriba).</li><li>Elige <em>Agregar a pantalla de inicio</em>.</li><li>Toca <em>Agregar</em>.</li></ol><p style="margin-top:10px"><strong>Android (Chrome):</strong> toca ⋮ y elige <em>Agregar a pantalla de inicio</em>.</p>'
        : '<p><strong>Android (Chrome):</strong></p><ol><li>Toca los tres puntos ⋮ de arriba a la derecha.</li><li>Elige <em>Agregar a pantalla de inicio</em>.</li><li>Toca <em>Agregar</em>.</li></ol><p style="margin-top:10px"><strong>iPhone (Safari):</strong> toca <em>Compartir</em> y elige <em>Agregar a pantalla de inicio</em>.</p>') +
      '<p style="margin-top:10px">Así la abres con un toque, como una app.</p></div></details>';
    html += '<p class="pequeno muted" style="text-align:center">Actualizada: ' + esc(d.actualizado ? C.fechaLarga(d.actualizado.slice(0, 10)) + ', ' + d.actualizado.slice(11) + ' h' : '') + '</p>' +
      '<div class="acciones"><button class="btn" id="actualizar" type="button">Actualizar mis sellos</button></div>';
    vista.innerHTML = html;
    document.getElementById('actualizar').addEventListener('click', function () { cargar(true); });
    document.title = d.nombre ? 'Tarjeta CAMI · ' + C.primerNombre(d.nombre) : 'Mi tarjeta CAMI';
  }

  function codigoActual() { return codigo; }

  async function cargar(manual) {
    const boton = document.getElementById('actualizar');
    if (boton) { boton.disabled = true; boton.textContent = 'Actualizando…'; }
    const d = await C.API.tarjeta(codigo);
    if (d.ok) {
      guardar(CLAVE_CODIGO, codigo);
      const previo = guardado(CLAVE_CACHE + codigo);
      try { conteoPrevio = previo ? JSON.parse(previo).conteo : -1; } catch (e) { conteoPrevio = -1; }
      guardar(CLAVE_CACHE + codigo, JSON.stringify(d));
      pintar(d, { guiaAbierta: conteoPrevio < 0 });
      conteoPrevio = d.conteo;
      return;
    }
    if (d.error === 'red' || d.error === 'sin_config' || d.error === 'interno') {
      const cache = guardado(CLAVE_CACHE + codigo);
      if (cache) {
        try {
          const c = JSON.parse(cache);
          conteoPrevio = -1;
          pintar(c, { sinConexion: c.actualizado ? C.fechaCorta(c.actualizado.slice(0, 10)) + ', ' + c.actualizado.slice(11) + ' h' : 'sin fecha' });
          return;
        } catch (e) { /* caché dañada */ }
      }
      mensaje('No pudimos abrir tu tarjeta', d.mensaje, 'alerta');
      vista.insertAdjacentHTML('beforeend', '<div class="acciones"><button class="btn" id="reintentar" type="button">Intentar de nuevo</button></div>');
      document.getElementById('reintentar').addEventListener('click', function () { cargar(true); });
      return;
    }
    mensaje(d.error === 'desactivada' ? 'Tarjeta desactivada' : 'No encontramos tu tarjeta', d.mensaje || 'Pide ayuda en recepción.', 'mal');
  }

  if (!codigo) {
    mensaje('Abre el enlace de tu tarjeta', 'Para ver tus sellos, abre el enlace que te enviamos por WhatsApp o escanea el código de tu tarjeta impresa. Si no lo tienes, pídelo en recepción.', '');
    return;
  }
  /* Si hay una copia guardada, se muestra de inmediato mientras llega la información nueva. */
  const previo = guardado(CLAVE_CACHE + codigo);
  if (previo) { try { const p = JSON.parse(previo); conteoPrevio = p.conteo; pintar(p, {}); } catch (e) { /* ignorar */ } }
  cargar(false);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) cargar(false); });
})();
