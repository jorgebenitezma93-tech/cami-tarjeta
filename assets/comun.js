/* Utilidades compartidas por la tarjeta del paciente, la página de la recepción y la tarjeta impresa. */
(function () {
  'use strict';
  const CT = window.CAMI_TARJETA || {};
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const FORMATO_CODIGO = /^[A-HJ-NP-Z2-9]{12}$/;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function partes(f) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function fechaCorta(f) { const p = partes(f); return p ? p.d + ' ' + MESES[p.m - 1] : ''; }
  function fechaLarga(f) { const p = partes(f); return p ? p.d + ' de ' + MESES_LARGO[p.m - 1] + ' de ' + p.y : ''; }
  function celularBonito(c) { const d = String(c || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 2) + ' ' + d.slice(2, 6) + ' ' + d.slice(6) : d; }
  function primerNombre(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }

  function urlTarjeta(codigo) { return (CT.URL_TARJETA || (location.origin + '/')) + '?c=' + encodeURIComponent(codigo); }

  /** Extrae el código de lo que leyó la cámara: la dirección de la tarjeta (…/?c=CÓDIGO) o el código solo. */
  function codigoDe(texto) {
    const t = String(texto || '').trim();
    let c = t;
    try { const u = new URL(t); c = u.searchParams.get('c') || ''; } catch (e) { /* no era una dirección */ }
    c = c.toUpperCase();
    return FORMATO_CODIGO.test(c) ? c : '';
  }

  /** QR como SVG (módulos nítidos, con zona blanca de 4 módulos alrededor). */
  function qrSvg(texto, etiqueta) {
    const qr = window.qrcode(0, 'M');
    qr.addData(texto); qr.make();
    const n = qr.getModuleCount(), q = 4;
    let ruta = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ruta += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    const t = n + q * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + ' ' + t + '" shape-rendering="crispEdges" role="img" aria-label="' + esc(etiqueta || 'Código QR') + '">' +
      '<rect width="' + t + '" height="' + t + '" fill="#fff"/><path d="' + ruta + '" fill="#000"/></svg>';
  }

  /* ---------- Comunicación con la aplicación web de Apps Script ---------- */
  const SIN_RED = { ok: false, error: 'red', mensaje: 'No hay conexión con el sistema. Revisa tu internet e inténtalo de nuevo.' };

  async function llamar(url, opciones) {
    if (!CT.API_URL) return { ok: false, error: 'sin_config', mensaje: 'Falta configurar la dirección del sistema (API_URL en assets/config.js).' };
    const ctrl = new AbortController();
    const reloj = setTimeout(function () { ctrl.abort(); }, 25000);
    try {
      const r = await fetch(url, Object.assign({ signal: ctrl.signal, cache: 'no-store' }, opciones));
      return await r.json();
    } catch (e) {
      return SIN_RED;
    } finally {
      clearTimeout(reloj);
    }
  }

  const API = {
    /** Tarjeta del paciente: solo lectura, sin PIN. */
    tarjeta: function (codigo) {
      return llamar(CT.API_URL + (CT.API_URL.indexOf('?') < 0 ? '?' : '&') + 'accion=tarjeta&c=' + encodeURIComponent(codigo));
    },
    /** Acciones de la recepción: siempre con PIN. Se envía como texto simple para evitar la verificación previa (CORS) del navegador. */
    recepcion: function (accion, datos) {
      return llamar(CT.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ accion: accion }, datos))
      });
    }
  };

  window.CAMI = { config: CT, esc: esc, fechaCorta: fechaCorta, fechaLarga: fechaLarga, celularBonito: celularBonito, primerNombre: primerNombre,
    urlTarjeta: urlTarjeta, codigoDe: codigoDe, qrSvg: qrSvg, API: API, FORMATO_CODIGO: FORMATO_CODIGO };
})();
