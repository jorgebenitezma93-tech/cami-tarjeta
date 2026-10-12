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

  VIGENCIA_MESES: 12,
  INACTIVIDAD_MIN: 15,   // minutos sin tocar la pantalla de recepción para cerrar la sesión (igual en el .gs)

  // Dos tipos de tarjeta (regla de CAMI, 12 de octubre de 2026). Los sellos necesarios y el descuento de cada tipo
  // se definen en TIPOS dentro de apps-script/tarjeta-apps-script.gs; si cambian allá, cambiar aquí los textos.
  // La sexta sesión (la del premio) no suma sello. Los textos para el paciente están pendientes del visto bueno del doctor.
  TIPOS: {
    "Terapias": {
      etiqueta: "Terapias",
      sesion: "sesión de terapia",
      sesiones: "sesiones de terapia",
      premio: "20% de descuento",
      tituloImpreso: "5 sellos = 20% de descuento",
      avisoRecompensa: "Tu sexta sesión de terapia tiene 20% de descuento. Avisa en recepción al llegar.",
      botonCanje: "Canjear promoción · 20% de descuento",
      notaCanje: "Aplica solo a la sexta sesión individual de terapia, en una visita distinta a la del quinto sello. No se combina con meses sin intereses ni con el paquete de 5 terapias. Esa sesión no suma sello: la tarjeta vuelve a cero y el primer sello nuevo es en la siguiente visita.",
      regla: "Por cada sesión de terapia recibes un sello. Al juntar 5, tu sexta sesión de terapia tiene 20% de descuento. Esa sexta sesión no suma sello y tu tarjeta vuelve a cero. Los sellos son válidos por 12 meses. No acumulable con otras promociones."
    },
    "Alineación Osteopática": {
      etiqueta: "Alineación Osteopática",
      sesion: "sesión de alineación osteopática",
      sesiones: "sesiones de alineación osteopática",
      premio: "sesión gratis",
      tituloImpreso: "5 sellos = sexta sesión gratis",
      avisoRecompensa: "Tu sexta sesión de alineación osteopática es gratis. Avisa en recepción al llegar.",
      botonCanje: "Canjear sesión gratis",
      notaCanje: "Aplica solo a la sexta sesión de alineación osteopática, en una visita distinta a la del quinto sello. No se combina con otras promociones. Esa sesión no suma sello: la tarjeta vuelve a cero y el primer sello nuevo es en la siguiente visita.",
      regla: "Por cada sesión de alineación osteopática recibes un sello. Al juntar 5, tu sexta sesión es gratis. Esa sexta sesión no suma sello y tu tarjeta vuelve a cero. Los sellos son válidos por 12 meses. No acumulable con otras promociones."
    }
  }
};
