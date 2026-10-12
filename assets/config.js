/* Configuración de la tarjeta de cliente frecuente de CAMI.
 * Lo único que se cambia al instalar es API_URL (ver guias/GUIA-INSTALACION.md, paso 7). */
window.CAMI_TARJETA = {
  // Dirección de la aplicación web de Apps Script; termina en /exec. Mientras esté vacía, las páginas avisan que falta configurarla.
  API_URL: "https://script.google.com/macros/s/AKfycbyNdr6qvdwlRDk4bX9ZnlJWtFq2_vZOtc4HnF7Ppv0PakTKwX3Hvvgyw7CV9v2VwR_FrQ/exec",

  URL_TARJETA: "https://tarjeta.camixochimilco.com.mx/",   // enlace base de la tarjeta del paciente (va dentro del QR)
  SITIO: "https://camixochimilco.com.mx/",
  AVISO_URL: "https://camixochimilco.com.mx/aviso-de-privacidad.html",
  WHATSAPP: "5560229681",                                   // WhatsApp de CAMI (mensajes)
  TELEFONO_TXT: "55 6022 9681",

  // Regla (definida por CAMI el 11 de octubre de 2026). Si cambia, cambiar también CONFIG en apps-script/tarjeta-apps-script.gs.
  META: 10,
  DESCUENTO: 20,
  VIGENCIA_MESES: 12,

  // Texto para el paciente (pendiente del visto bueno del doctor).
  TEXTO_REGLA: "Por cada sesión de rehabilitación recibes un sello. Al juntar 10, tu siguiente sesión de rehabilitación tiene 20% de descuento. Los sellos son válidos por 12 meses. No acumulable con otras promociones."
};
