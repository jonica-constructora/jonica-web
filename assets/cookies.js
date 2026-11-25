/* ============================================================================
   JÓNICA · COOKIES Y GOOGLE ADS

   El cartel de consentimiento y la etiqueta de Google Ads. La etiqueta NO se
   carga hasta que el visitante pulsa «Aceptar»: si rechaza o no contesta, a
   Google no le llega nada desde su navegador (la medición propia de medir.js
   sigue igual, sin cookies).

   Lo único que se guarda sin preguntar es la propia respuesta («si» o «no»)
   en localStorage, para no volver a preguntar en cada página. Es técnica y
   está exenta de consentimiento; se cambia desde «Configurar cookies» del pie.

   Qué cuenta como conversión en Google Ads:
     · solicitud() — alguien deja sus datos (formulario o cotizador). Lo llama
                     medir.js desde con(), por donde pasan todos los contactos.
     · contacto()  — clic en un enlace de WhatsApp o de teléfono.
   ========================================================================= */

(function (raiz) {
  "use strict";

  const ID = 'AW-18472050552';
  const ETIQUETAS = {
    solicitud: ID + '/84shCKGNh44dEPi-lOhE',   // Solicitud web (formulario)
    contacto:  ID + '/auSbCKSNh44dEPi-lOhE'    // Clic en WhatsApp o teléfono
  };
  const CLAVE = 'jonica_cookies';

  function leer()     { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) { /* sin memoria: se volverá a preguntar */ } }

  let cargada = false;
  function cargar() {
    if (cargada) return;
    cargada = true;
    raiz.dataLayer = raiz.dataLayer || [];
    raiz.gtag = function () { raiz.dataLayer.push(arguments); };
    /* Solo medición de anuncios: sin analítica y sin personalización
       (remarketing), que no usamos. */
    raiz.gtag('consent', 'default', {
      ad_storage: 'granted', ad_user_data: 'granted',
      ad_personalization: 'denied', analytics_storage: 'denied'
    });
    raiz.gtag('js', new Date());
    raiz.gtag('config', ID);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }

  function conversion(tipo) {
    if (!cargada) return;
    raiz.gtag('event', 'conversion', { send_to: ETIQUETAS[tipo], value: 1.0, currency: 'EUR' });
  }

  /* --------------------------------------------------------------- cartel */
  let cartel = null;
  function mostrar() {
    if (cartel) { cartel.hidden = false; return; }
    cartel = document.createElement('div');
    cartel.className = 'cookies';
    cartel.setAttribute('role', 'dialog');
    cartel.setAttribute('aria-label', 'Cookies');
    cartel.innerHTML =
      '<p>Usamos cookies de Google Ads solo para saber qué anuncios traen a quien pide ' +
      'presupuesto. Nada de analítica ni de publicidad personalizada. ' +
      '<a href="legal.html#cookies">Más información</a></p>' +
      '<div class="cookies__botones">' +
        '<button type="button" class="btn btn--peq" data-cookies-si>Aceptar</button>' +
        '<button type="button" class="btn btn--peq btn--claro" data-cookies-no>Rechazar</button>' +
      '</div>';
    cartel.querySelector('[data-cookies-si]').addEventListener('click', function () { decidir('si'); });
    cartel.querySelector('[data-cookies-no]').addEventListener('click', function () { decidir('no'); });
    document.body.appendChild(cartel);
  }

  function decidir(v) {
    const antes = leer();
    guardar(v);
    if (cartel) cartel.hidden = true;
    if (v === 'si') cargar();
    /* Retirar el consentimiento con la etiqueta ya cargada: se recarga la
       página para que deje de funcionar en el acto. */
    else if (antes === 'si' && cargada) location.reload();
  }

  /* ------------------------------------------------------------- arranque */
  function iniciar() {
    const v = leer();
    if (v === 'si') cargar();
    else if (v !== 'no') mostrar();

    /* «Configurar cookies» en el pie: vuelve a preguntar */
    document.addEventListener('click', function (ev) {
      const a = ev.target.closest && ev.target.closest('[data-cookies]');
      if (a) { ev.preventDefault(); mostrar(); return; }
      const c = ev.target.closest && ev.target.closest('a[href^="https://wa.me"], a[href^="tel:"]');
      if (c) conversion('contacto');
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  raiz.JonicaGoogle = {
    solicitud: function () { conversion('solicitud'); },
    contacto:  function () { conversion('contacto'); }
  };
})(window);
