/* Página de la recepción: escanear QR o buscar por teléfono, poner sello, canjear, dar de alta.
 * Se entra con una clave personal; el sistema devuelve un código de sesión (no se guarda la clave en el celular) y
 * la sesión se cierra sola tras CT.INACTIVIDAD_MIN minutos sin tocar la pantalla. */
(function () {
  'use strict';
  const C = window.CAMI, CT = C.config, esc = C.esc, API = C.API;
  const $ = function (id) { return document.getElementById(id); };
  const ERRORES_DE_SESION = ['clave_incorrecta', 'bloqueado', 'sin_clave', 'sesion'];
  const K = { token: 'cami_r_sesion' };          // se guarda solo en esta pestaña (sessionStorage): al cerrarla se pierde
  const INACTIVIDAD_MS = (CT.INACTIVIDAD_MIN || 15) * 60000;

  let sesion = null;           // { token, nombre }
  let tarjetaActual = null;    // última tarjeta mostrada
  let ultimaActividad = Date.now();

  /* ---------- almacenamiento (puede fallar en modo privado) ---------- */
  function leer(almacen, clave) { try { return window[almacen].getItem(clave); } catch (e) { return null; } }
  function escribir(almacen, clave, valor) { try { window[almacen].setItem(clave, valor); } catch (e) { /* ignorar */ } }
  function borrar(almacen, clave) { try { window[almacen].removeItem(clave); } catch (e) { /* ignorar */ } }

  /* ---------- utilidades de interfaz ---------- */
  function aviso(tipo, titulo, texto) { return '<div class="aviso ' + tipo + '" role="' + (tipo === 'mal' ? 'alert' : 'status') + '"><strong>' + esc(titulo) + '</strong>' + esc(texto || '') + '</div>'; }
  /** Desactiva los botones mientras espera al sistema para evitar toques repetidos. */
  async function conCarga(boton, tarea) {
    const textoOriginal = boton ? boton.innerHTML : '';
    const todos = document.querySelectorAll('button, .btn');
    todos.forEach(function (b) { b.setAttribute('data-estaba', b.disabled ? '1' : '0'); b.disabled = true; });
    if (boton) boton.innerHTML = '<span class="girar" aria-hidden="true"></span><span>Un momento…</span>';
    try { return await tarea(); }
    finally {
      todos.forEach(function (b) { if (b.getAttribute('data-estaba') === '0') b.disabled = false; b.removeAttribute('data-estaba'); });
      if (boton && boton.isConnected) boton.innerHTML = textoOriginal;
    }
  }

  /* ---------- sesión ---------- */
  function mostrarLogin(texto, tipo) {
    detenerCamara();
    sesion = null; tarjetaActual = null;
    $('trabajo').hidden = true; $('login').hidden = false;
    $('login-aviso').innerHTML = texto ? aviso(tipo || 'mal', texto) : (CT.API_URL ? '' : aviso('alerta', 'Falta configurar el sistema', 'Escribe la dirección de Apps Script en assets/config.js (API_URL).'));
    $('clave').value = '';
    $('clave').focus();
  }
  function mostrarTrabajo() {
    $('login').hidden = true; $('trabajo').hidden = false;
    $('saludo').textContent = 'Hola, ' + sesion.nombre;
    $('resultado').innerHTML = '';
    ultimaActividad = Date.now();
    irA('escanear');
  }
  /** Cierra la sesión aquí y avisa al sistema (sin esperar su respuesta). Borra de la pantalla los datos de pacientes. */
  function cerrarSesion(mensaje, tipo) {
    const token = sesion && sesion.token;
    borrar('sessionStorage', K.token);
    $('resultado').innerHTML = '';
    if (token) API.recepcion('salir', { token: token });
    mostrarLogin(mensaje, tipo);
  }
  async function entrar(clave, boton) {
    const r = await conCarga(boton, function () { return API.recepcion('entrar', { clave: clave }); });
    if (!r.ok) { mostrarLogin(r.mensaje || 'No se pudo entrar.', r.error === 'red' ? 'alerta' : 'mal'); return; }
    sesion = { token: r.token, nombre: r.nombre };
    escribir('sessionStorage', K.token, r.token);
    mostrarTrabajo();
  }
  /** Retoma una sesión que sigue abierta (por ejemplo, tras recargar la página). */
  async function retomar(token) {
    const r = await API.recepcion('validar', { token: token });
    if (!r.ok) { borrar('sessionStorage', K.token); mostrarLogin(r.error === 'red' ? r.mensaje : '', 'alerta'); return; }
    sesion = { token: token, nombre: r.nombre };
    mostrarTrabajo();
  }
  /** Llama al sistema con el código de sesión. Si la sesión venció o la quitaron, regresa a la pantalla de entrada. */
  async function accion(nombre, datos) {
    const r = await API.recepcion(nombre, Object.assign({ token: sesion.token }, datos));
    if (ERRORES_DE_SESION.indexOf(r.error) >= 0) cerrarSesion(r.mensaje, 'alerta');
    return r;
  }

  /* ---------- cierre automático por inactividad ---------- */
  ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input'].forEach(function (ev) {
    document.addEventListener(ev, function () { ultimaActividad = Date.now(); }, { passive: true, capture: true });
  });
  function revisarInactividad() {
    if (sesion && Date.now() - ultimaActividad > INACTIVIDAD_MS) {
      cerrarSesion('Cerramos tu sesión por inactividad. Escribe tu clave para continuar.', 'alerta');
    }
  }
  setInterval(revisarInactividad, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) revisarInactividad(); });

  /* ---------- pestañas ---------- */
  const PESTANAS = ['escanear', 'telefono', 'nueva'];
  function irA(nombre) {
    PESTANAS.forEach(function (p) {
      $('tab-' + p).setAttribute('aria-selected', String(p === nombre));
      $('p-' + p).hidden = p !== nombre;
    });
    if (nombre !== 'escanear') detenerCamara();
    if (nombre === 'telefono') $('tel').focus();
    if (nombre === 'nueva') $('alta-nombre').focus();
  }
  PESTANAS.forEach(function (p) { $('tab-' + p).addEventListener('click', function () { irA(p); $('resultado').innerHTML = ''; }); });

  /* ---------- resultado: tarjeta del paciente ---------- */
  function casillasHtml(t) {
    let s = '';
    for (let i = 0; i < t.meta; i++) {
      const sello = t.sellos[i];   // cada sello puesto muestra debajo la fecha en que se puso
      s += '<div class="cas"><span class="' + (sello ? 'on' : '') + '">' + (sello ? C.selloImg() : (i + 1)) + '</span><small>' + (sello ? esc(C.fechaCorta(sello.fecha)) : '') + '</small></div>';
    }
    return '<div class="casillas ' + C.claseTipo(t.tipo) + (t.recompensa ? ' completa' : '') + '" role="img" aria-label="' + t.conteo + ' de ' + t.meta + ' sellos">' + s + '</div>';
  }
  function mensajeWhatsapp(t) {
    const texto = 'Hola ' + C.primerNombre(t.nombre) + ', esta es tu tarjeta de cliente frecuente de CAMI Xochimilco: ' + C.urlTarjeta(t.codigo) +
      '\n\nGuárdala en la pantalla de inicio de tu celular. ' + C.tipo(t.tipo).regla;
    return 'https://wa.me/52' + t.celular + '?text=' + encodeURIComponent(texto);
  }

  /**
   * opciones: { exito: 'texto grande', detalle: 'texto', alerta: {tipo, titulo, texto}, entrega: true }
   */
  function pintarTarjeta(t, opciones) {
    opciones = opciones || {};
    tarjetaActual = t;
    let h = '';
    if (opciones.exito) h += '<div class="exito" role="status"><span class="grande">' + esc(opciones.exito) + '</span>' + esc(opciones.detalle || '') + '</div>';
    if (opciones.alerta) h += aviso(opciones.alerta.tipo, opciones.alerta.titulo, opciones.alerta.texto);

    const T = C.tipo(t.tipo);
    const chips = ['<span class="chip ' + (C.claseTipo(t.tipo) === 'tipo-traccion' ? 't-traccion' : '') + '">' + esc(T.etiqueta) + '</span>'];
    if (!t.activa) chips.push('<span class="chip mal">Desactivada</span>');
    if (t.activa && t.selloHoy) chips.push('<span class="chip ok">Sello de hoy ✓</span>');
    if (t.activa && t.canjeHoy) chips.push('<span class="chip ok">Promoción canjeada hoy ✓</span>');
    if (t.activa && t.recompensa) chips.push('<span class="chip ok">Promoción disponible</span>');
    if (t.canjes) chips.push('<span class="chip">' + t.canjes + (t.canjes === 1 ? ' promoción canjeada' : ' promociones canjeadas') + '</span>');

    h += '<article class="panel ' + C.claseTipo(t.tipo) + '" aria-label="Tarjeta de ' + esc(t.nombre) + ', ' + esc(T.etiqueta) + '"><div class="res-cabeza"><h2>' + esc(t.nombre) + '</h2>' +
      '<p class="muted">Cel. ' + esc(C.celularBonito(t.celular)) + '</p><div class="chips">' + chips.join('') + '</div></div>' +
      casillasHtml(t) + '<p class="avance-txt">' + t.conteo + ' de ' + t.meta + ' sellos</p>';
    if (t.proximoVence) h += '<p class="pequeno muted">El sello más antiguo vence el ' + esc(C.fechaLarga(t.proximoVence)) + '.</p>';

    h += '<div class="acciones">';
    if (!t.activa) {
      h += '<button class="btn primario" data-accion="activar" data-activa="1" type="button">Reactivar tarjeta</button>';
    } else if (t.recompensa && t.selloHoy) {
      h += '<button class="btn" type="button" disabled>La promoción se canjea en la próxima visita</button>' +
        '<p class="pequeno muted">El quinto sello es de hoy: la promoción aplica en la sexta sesión, en otra visita.</p>';
    } else if (t.recompensa) {
      h += '<button class="btn ok" data-accion="canjear" type="button">' + esc(T.botonCanje) + '</button>' +
        '<p class="pequeno muted">' + esc(T.notaCanje) + '</p>';
    } else if (t.canjeHoy) {
      h += '<button class="btn" type="button" disabled>Hoy no suma sello</button>' +
        '<p class="pequeno muted">La sesión con promoción no suma sello. El primer sello del ciclo nuevo es en la próxima visita.</p>';
    } else if (t.selloHoy) {
      h += '<button class="btn" type="button" disabled>Ya tiene sello de hoy</button>';
    } else {
      h += '<button class="btn primario" data-accion="sellar" type="button">Poner sello</button>' +
        '<p class="pequeno muted">Solo para ' + esc(T.sesiones) + '. Consultas y otros servicios no suman sellos.</p>';
    }
    h += '</div>';

    if (opciones.entrega) {
      h += '<div class="acciones"><a class="btn whatsapp" target="_blank" rel="noopener" href="' + esc(mensajeWhatsapp(t)) + '">Enviar tarjeta por WhatsApp</a>' +
        '<a class="btn" target="_blank" rel="noopener" href="../imprimir/?c=' + encodeURIComponent(t.codigo) + '">Imprimir tarjeta (sin celular)</a>' +
        '<button class="btn" data-accion="copiar" type="button">Copiar enlace de la tarjeta</button></div>';
    }

    h += '<details class="mas"><summary>Más opciones</summary><div class="acciones" id="mas-acciones">';
    if (!opciones.entrega) {
      h += '<a class="btn whatsapp" target="_blank" rel="noopener" href="' + esc(mensajeWhatsapp(t)) + '">Enviar tarjeta por WhatsApp</a>' +
        '<a class="btn" target="_blank" rel="noopener" href="../imprimir/?c=' + encodeURIComponent(t.codigo) + '">Imprimir tarjeta</a>' +
        '<button class="btn" data-accion="copiar" type="button">Copiar enlace de la tarjeta</button>';
    }
    if (t.ultimoSello && !t.ultimoSello.canjeado) h += '<button class="btn peligro" data-accion="pedir-anular" type="button">Anular el último sello (' + esc(C.fechaCorta(t.ultimoSello.fecha)) + ')</button>';
    if (t.activa) h += '<button class="btn peligro" data-accion="pedir-desactivar" type="button">Desactivar tarjeta</button>';
    h += '</div><div id="confirmacion"></div></details>';
    h += '<div class="acciones"><button class="btn" data-accion="otra" type="button">Buscar otra tarjeta</button></div></article>';

    $('resultado').innerHTML = h;
    $('resultado').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function pintarLista(tarjetas) {
    let h = '<div class="panel"><h2 style="font-size:1.1rem;margin-bottom:10px">Hay ' + tarjetas.length + ' tarjetas con ese celular</h2><div class="lista-tarjetas">';
    tarjetas.forEach(function (t, i) {
      h += '<button class="btn" data-accion="elegir" data-i="' + i + '" type="button"><span>' + esc(t.nombre) + ' · ' + esc(C.tipo(t.tipo).etiqueta) + '</span><span class="muted pequeno">' + t.conteo + '/' + t.meta + (t.activa ? '' : ' · desactivada') + '</span></button>';
    });
    $('resultado').innerHTML = h + '</div></div>';
    $('resultado')._lista = tarjetas;
  }

  /* ---------- búsquedas ---------- */
  async function buscar(datos, boton) {
    $('resultado').innerHTML = '';
    const r = await conCarga(boton, function () { return accion('buscar', datos); });
    if (!sesion) return;
    if (!r.ok) { $('resultado').innerHTML = aviso(r.error === 'red' ? 'alerta' : 'mal', r.mensaje); return; }
    if (!r.tarjetas.length) {
      $('resultado').innerHTML = aviso('alerta', 'No se encontró ninguna tarjeta', datos.celular ? 'Revisa el número o crea una tarjeta nueva en la pestaña «Nueva tarjeta».' : 'Busca por teléfono o crea una tarjeta nueva.');
      return;
    }
    if (r.tarjetas.length === 1) pintarTarjeta(r.tarjetas[0]); else pintarLista(r.tarjetas);
  }

  $('form-telefono').addEventListener('submit', function (e) {
    e.preventDefault();
    buscar({ celular: $('tel').value }, e.submitter || e.target.querySelector('button[type=submit]'));
  });

  $('form-alta').addEventListener('submit', async function (e) {
    e.preventDefault();
    const boton = $('btn-alta');
    const r = await conCarga(boton, function () {
      return accion('alta', { tipo: (document.querySelector('input[name=alta-tipo]:checked') || {}).value, nombre: $('alta-nombre').value, celular: $('alta-cel').value, aviso: $('alta-aviso').checked });
    });
    if (!sesion) return;
    if (r.ok) {
      $('form-alta').reset();
      pintarTarjeta(r.tarjeta, { exito: 'Tarjeta creada', detalle: 'Ahora entrégala al paciente: por WhatsApp o impresa.', entrega: true });
    } else if (r.error === 'duplicada') {
      pintarTarjeta(r.tarjeta, { alerta: { tipo: 'alerta', titulo: 'Ya existía una tarjeta con ese nombre y celular', texto: 'Se muestra la que ya tiene. No se creó otra.' } });
    } else {
      $('resultado').innerHTML = aviso(r.error === 'red' ? 'alerta' : 'mal', r.mensaje);
    }
  });

  /* ---------- acciones sobre la tarjeta mostrada ---------- */
  async function ejecutar(nombre, datos, boton, textoExito) {
    const t = tarjetaActual;
    const r = await conCarga(boton, function () { return accion(nombre, Object.assign({ codigo: t.codigo }, datos)); });
    if (!sesion) return;
    if (r.ok) { textoExito(r); return; }
    if (r.error === 'red') {
      pintarTarjeta(t, { alerta: { tipo: 'alerta', titulo: 'No se pudo confirmar', texto: 'Sin conexión: no sabemos si se guardó. Toca «Verificar» antes de repetirlo.' } });
      $('resultado').querySelector('.acciones').insertAdjacentHTML('afterbegin', '<button class="btn primario" data-accion="verificar" type="button">Verificar tarjeta</button>');
      return;
    }
    pintarTarjeta(r.tarjeta || t, { alerta: { tipo: 'mal', titulo: 'No se pudo', texto: r.mensaje } });
  }

  $('resultado').addEventListener('click', async function (e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const a = b.getAttribute('data-accion'), t = tarjetaActual;
    if (a === 'elegir') { pintarTarjeta($('resultado')._lista[+b.getAttribute('data-i')]); return; }
    if (a === 'otra') { $('resultado').innerHTML = ''; irA('escanear'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (!t) return;
    if (a === 'verificar') { buscar({ codigo: t.codigo }, b); return; }
    if (a === 'copiar') {
      const url = C.urlTarjeta(t.codigo);
      try { await navigator.clipboard.writeText(url); b.textContent = 'Enlace copiado ✓'; }
      catch (err) { window.prompt('Copia este enlace:', url); }
      return;
    }
    if (a === 'sellar') {
      ejecutar('sellar', {}, b, function (r) {
        const t2 = r.tarjeta;
        pintarTarjeta(t2, r.ganoRecompensa
          ? { exito: '¡Sello ' + t2.conteo + ' de ' + t2.meta + '!', detalle: 'Completó su tarjeta. Gana una promoción: ' + C.tipo(t2.tipo).avisoRecompensa.replace(' Avisa en recepción al llegar.', '') }
          : { exito: 'Sello puesto · ' + t2.conteo + ' de ' + t2.meta, detalle: 'Listo para el siguiente paciente.' });
      });
    } else if (a === 'canjear') {
      ejecutar('canjear', {}, b, function (r) {
        pintarTarjeta(r.tarjeta, { exito: 'Promoción canjeada', detalle: (r.tarjeta.descuento >= 100 ? 'La sesión de hoy es gratis.' : 'Aplica ' + r.tarjeta.descuento + '% a la sesión de hoy.') + ' Hoy no suma sello: la tarjeta volvió a cero y el primer sello es en la próxima visita.' });
      });
    } else if (a === 'activar') {
      ejecutar('activar', { activa: b.getAttribute('data-activa') === '1' }, b, function (r) {
        pintarTarjeta(r.tarjeta, { exito: r.tarjeta.activa ? 'Tarjeta reactivada' : 'Tarjeta desactivada' });
      });
    } else if (a === 'pedir-anular') {
      $('confirmacion').innerHTML = '<div class="confirmar"><p>¿Anular el sello del ' + esc(C.fechaLarga(t.ultimoSello.fecha)) + '? Úsalo solo si se puso por error.</p><div class="fila"><button class="btn peligro" data-accion="anular" type="button">Sí, anular</button><button class="btn" data-accion="cancelar" type="button">No</button></div></div>';
    } else if (a === 'pedir-desactivar') {
      $('confirmacion').innerHTML = '<div class="confirmar"><p>¿Desactivar la tarjeta de ' + esc(t.nombre) + '? Dejará de sumar sellos y de abrirse para el paciente.</p><div class="fila"><button class="btn peligro" data-accion="desactivar" type="button">Sí, desactivar</button><button class="btn" data-accion="cancelar" type="button">No</button></div></div>';
    } else if (a === 'cancelar') {
      $('confirmacion').innerHTML = '';
    } else if (a === 'anular') {
      ejecutar('anular', { motivo: 'Error de captura' }, b, function (r) { pintarTarjeta(r.tarjeta, { exito: 'Sello anulado', detalle: 'La tarjeta quedó con ' + r.tarjeta.conteo + ' de ' + r.tarjeta.meta + '.' }); });
    } else if (a === 'desactivar') {
      ejecutar('activar', { activa: false }, b, function (r) { pintarTarjeta(r.tarjeta, { exito: 'Tarjeta desactivada' }); });
    }
  });

  /* ---------- cámara y lectura del QR ---------- */
  const video = $('video'), lienzo = document.createElement('canvas'), ctx2d = lienzo.getContext('2d', { willReadFrequently: true });
  let flujo = null, temporizador = null, detector = null, ultimoInvalido = { texto: '', hasta: 0 };

  function estadoCamara(texto) { $('estado-camara').textContent = texto; }
  async function abrirCamara() {
    if (flujo) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      estadoCamara('Este navegador no permite usar la cámara. Busca a la paciente por teléfono.'); return;
    }
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (err) {
      flujo = null;
      estadoCamara(err && err.name === 'NotAllowedError'
        ? 'La cámara está bloqueada. Permite el acceso en el navegador o busca por teléfono.'
        : 'No se pudo abrir la cámara. Busca por teléfono.');
      return;
    }
    video.srcObject = flujo;
    try { await video.play(); } catch (err) { /* se reintenta al recibir datos */ }
    $('visor').hidden = false; $('btn-camara').hidden = true;
    estadoCamara('Apunta la cámara al código QR del paciente.');
    if (!detector && 'BarcodeDetector' in window) { try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (err) { detector = null; } }
    ciclo();
  }
  function detenerCamara() {
    clearTimeout(temporizador); temporizador = null;
    if (flujo) { flujo.getTracks().forEach(function (t) { t.stop(); }); flujo = null; }
    video.srcObject = null;
    $('visor').hidden = true; $('btn-camara').hidden = false;
  }
  async function ciclo() {
    if (!flujo) return;
    if (video.readyState >= 2 && video.videoWidth) {
      let texto = '';
      try {
        if (detector) {
          const r = await detector.detect(video);
          if (r.length) texto = r[0].rawValue;
        } else {
          const w = Math.min(640, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth);
          lienzo.width = w; lienzo.height = h; ctx2d.drawImage(video, 0, 0, w, h);
          const q = window.jsQR(ctx2d.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (q) texto = q.data;
        }
      } catch (err) { detector = null; }   // si el detector del navegador falla, se usa jsQR
      if (texto) { alLeer(texto); if (!flujo) return; }
    }
    temporizador = setTimeout(ciclo, 150);
  }
  function alLeer(texto) {
    const codigo = C.codigoDe(texto);
    if (!codigo) {
      if (ultimoInvalido.texto !== texto || Date.now() > ultimoInvalido.hasta) estadoCamara('Ese código no es de una tarjeta CAMI.');
      ultimoInvalido = { texto: texto, hasta: Date.now() + 2500 };
      return;
    }
    if (navigator.vibrate) navigator.vibrate(80);
    detenerCamara();
    estadoCamara('Código leído. Buscando la tarjeta…');
    buscar({ codigo: codigo }, null).then(function () { estadoCamara('Apunta la cámara al código QR del paciente.'); });
  }
  $('btn-camara').addEventListener('click', function () { $('resultado').innerHTML = ''; abrirCamara(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) detenerCamara(); });

  /* ---------- entrada ---------- */
  $('form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    const clave = $('clave').value;
    if (!clave) { $('login-aviso').innerHTML = aviso('mal', 'Escribe tu clave.'); return; }
    entrar(clave, $('btn-entrar'));
  });
  $('btn-salir').addEventListener('click', function () { cerrarSesion('Cerraste la sesión.', ''); });
  $('enlace-aviso').href = CT.AVISO_URL;

  const tokenGuardado = leer('sessionStorage', K.token);
  if (tokenGuardado && CT.API_URL) {
    $('login').hidden = false; $('login-aviso').innerHTML = aviso('', 'Retomando tu sesión…');
    retomar(tokenGuardado);
  } else {
    mostrarLogin('', '');
  }
})();
