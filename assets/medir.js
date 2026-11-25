/* ============================================================================
   JÓNICA · MEDICIÓN

   Manda al panel lo que va pasando en la web. Este archivo SÍ es público, así
   que aquí no hay contraseñas ni nada que valga: solo la dirección a la que
   se escribe. Todo lo demás —los datos, el panel y la clave— vive en el
   servidor.

   SIN COOKIES, A PROPÓSITO
   ------------------------
   La visita se identifica con un número al azar que vive en una variable de
   este archivo: existe mientras la pestaña esté abierta y desaparece al
   cerrarla. No se guarda nada en el ordenador del visitante —ni cookie, ni
   localStorage, ni sessionStorage—, y por eso la web NO necesita el cartel de
   aceptar cookies. Tampoco se guarda la IP de nadie.

   Lo que se paga por esto: si alguien recarga la página, cuenta como visita
   nueva. Es el precio de no tener que pedir permiso, y para lo que hace falta
   —saber cuánta gente llega, qué piden y dónde se caen— compensa de sobra.

   SI ESTO NO ESTÁ CONFIGURADO NO PASA NADA. Con ENDPOINT vacío, todas las
   funciones existen y no hacen nada. La web funciona exactamente igual.
   ========================================================================= */

(function (raiz) {
  "use strict";

  /* ------------------------------------------------------------------------
     LA DIRECCIÓN DEL PANEL — se pone aquí y ya está
     Vacío = medición apagada.
     Con dominio propio:  "https://datos.jonica.es"
     Sin dominio todavía: "https://jonica-datos.TU-CUENTA.workers.dev"
     ---------------------------------------------------------------------- */
  const ENDPOINT = "https://jonica-datos.jonica-constructora.workers.dev"; // workers.dev: datos.jonica.es cae con los bloqueos de LaLiga

  const apagado = !ENDPOINT;

  /* Identificador de esta pestaña. No sale de la memoria del navegador. */
  const VISITA = (function () {
    if (raiz.crypto && raiz.crypto.randomUUID) return raiz.crypto.randomUUID().slice(0, 32);
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  })();

  /* La marca que Meta pone en la dirección cuando alguien llega desde uno de
     sus anuncios (?fbclid=...). Sin ella Meta no sabe qué anuncio trajo al que
     luego pide presupuesto. Se lee de la URL al cargar y vive en esta
     variable: no es una cookie, no se guarda en el dispositivo y desaparece al
     cerrar la pestaña, igual que todo lo demás de este archivo. */
  const FBC = (function () {
    try {
      const id = new URLSearchParams(location.search).get('fbclid');
      return id ? 'fb.1.' + Date.now() + '.' + id : null;
    } catch (e) { return null; }
  })();

  /* Lo mismo para Google Ads: el `gclid` que pone en la dirección al llegar
     desde un anuncio (gbraid/wbraid en iPhone). Con él, el panel saca el
     archivo que se sube a Google para decirle qué clics acabaron en cliente.
     Vive en esta variable y nada más, igual que el de Meta: sin cookie. */
  const GCLID = (function () {
    try {
      const p = new URLSearchParams(location.search);
      return p.get('gclid') || p.get('gbraid') || p.get('wbraid') || null;
    } catch (e) { return null; }
  })();

  /* ------------------------------------------------------------ de dónde */
  function deDonde() {
    let ref = '';
    try { ref = document.referrer || ''; } catch (e) { ref = ''; }
    if (!ref) return 'Directo';
    let host;
    try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return 'Directo'; }
    if (host === location.hostname.replace(/^www\./, '')) return null;   // navegación interna
    if (/google\./.test(host))                 return 'Google';
    if (/bing\./.test(host))                   return 'Bing';
    if (/duckduckgo/.test(host))               return 'DuckDuckGo';
    if (/instagram/.test(host))                return 'Instagram';
    if (/facebook|fb\.com|fb\.me/.test(host))  return 'Facebook';
    if (/tiktok/.test(host))                   return 'TikTok';
    if (/whatsapp|wa\.me/.test(host))          return 'WhatsApp';
    if (/youtube|youtu\.be/.test(host))        return 'YouTube';
    if (/linkedin|lnkd\.in/.test(host))        return 'LinkedIn';
    if (/paginasamarillas|habitissimo|milanuncios/.test(host)) return 'Directorios';
    return host;
  }

  function campana() {
    try {
      const p = new URLSearchParams(location.search);
      const partes = ['utm_source', 'utm_medium', 'utm_campaign']
        .map(function (k) { return p.get(k); })
        .filter(Boolean);
      return partes.length ? partes.join(' / ') : null;
    } catch (e) { return null; }
  }

  function aparato() {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tableta';
    if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'movil';
    return 'ordenador';
  }

  function navegador() {
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua))                    return 'Edge';
    if (/SamsungBrowser/.test(ua))           return 'Samsung';
    if (/OPR\/|Opera/.test(ua))              return 'Opera';
    if (/Firefox\//.test(ua))                return 'Firefox';
    if (/Chrome\//.test(ua))                 return 'Chrome';
    if (/Safari\//.test(ua))                 return 'Safari';
    return 'Otro';
  }

  /* Tiempo con la página delante. No cuenta los ratos en que la pestaña está
     en segundo plano: si no, una pestaña olvidada toda la tarde diría que el
     visitante estuvo cuatro horas leyendo. */
  let segundos = 0, desde = Date.now(), mirando = !document.hidden;
  function contar() {
    if (mirando) segundos += Math.round((Date.now() - desde) / 1000);
    desde = Date.now();
  }

  /* ------------------------------------------------------------- el envío */
  let cola = [];
  let cotPendiente = null;
  let temporizador = null;
  let primero = true;

  function paquete(forzarMeta) {
    contar();
    const p = { v: VISITA };
    if (forzarMeta || primero) {
      p.meta = {
        origen: deDonde(),
        campana: campana(),
        dispositivo: aparato(),
        navegador: navegador(),
        idioma: (navigator.language || '').slice(0, 12),
        segundos: segundos
      };
      primero = false;
    } else {
      p.meta = { segundos: segundos };
    }
    if (cola.length) { p.ev = cola; cola = []; }
    if (cotPendiente) { p.cot = cotPendiente; cotPendiente = null; }
    /* va en todos los paquetes, no solo en el primero: el servidor lo necesita
       en el que trae la conversión, que llega mucho después */
    if (FBC) p.fbc = FBC;
    if (GCLID) p.gclid = GCLID;
    return p;
  }

  function mandar(cuerpo, alCerrar) {
    const texto = JSON.stringify(cuerpo);
    /* Al cerrar la pestaña, un fetch normal se cancela a medio camino.
       sendBeacon se lo queda el navegador y lo manda igualmente. */
    if (alCerrar && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(ENDPOINT + '/e', new Blob([texto], { type: 'text/plain;charset=UTF-8' }));
        return;
      } catch (e) { /* si falla, sigue por fetch */ }
    }
    try {
      fetch(ENDPOINT + '/e', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: texto,
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      }).catch(function () {});
    } catch (e) { /* la web no se entera de nada si esto falla */ }
  }

  /* Se agrupa lo que pasa en un segundo y medio y se manda de una vez. Nadie
     necesita una petición por clic. */
  function programar(urgente) {
    if (apagado) return;
    clearTimeout(temporizador);
    if (urgente) { mandar(paquete()); return; }
    temporizador = setTimeout(function () { mandar(paquete()); }, 1500);
  }

  /* ---------------------------------------------------------- lo público */
  const M = {
    activo: function () { return !apagado; },

    /* un hecho suelto: 'cotizador', 'cot_inicio', 'cot_paso', 'cot_precio'… */
    ev: function (tipo, detalle, valor) {
      if (apagado || !tipo) return;
      cola.push({ t: tipo, d: detalle || null, n: (valor === undefined ? null : valor) });
      if (cola.length > 15) programar(true); else programar();
    },

    /* El estado de la cotización, que se va reescribiendo según avanza.

       `sinPrisa` deja la cotización esperando en vez de mandarla al momento.
       Sirve para un caso concreto: cuando alguien deja su teléfono, interesa
       que la obra y la persona viajen en el MISMO envío, porque el servidor
       escribe la obra antes que la persona y el correo de aviso lee el precio
       justo al escribir a la persona. En dos envíos sueltos puede llegar antes
       el segundo, y entonces el aviso sale sin la cifra. */
    cot: function (datos, sinPrisa) {
      if (apagado || !datos || !datos.id) return;
      cotPendiente = Object.assign(cotPendiente || {}, datos);
      programar(!sinPrisa && !!datos.completa);
    },

    /* datos personales: van solos y sin esperar.

       AQUÍ YA NO SE AVISA A GOOGLE. Antes sí, y era un error caro: `con()` se
       llama cada vez que alguien escribe su teléfono, y desde que el precio del
       cotizador está detrás de ese formulario, eso incluye a todo el que solo
       quería ver un número. Google aprende de las conversiones que le mandas:
       si le cuentas como «solicitud» a cada curioso, la campaña empieza a
       comprar clics de curiosos. La conversión se manda ahora desde `solicitud()`
       y solo cuando alguien pide una obra de verdad. */
    con: function (datos) {
      if (apagado || !datos) return;
      const p = paquete();
      p.con = datos;
      mandar(p);
    },

    /* «Esta persona quiere una obra»: el botón de WhatsApp, el de correo o el
       de que le llamen. Va aparte de la medición a propósito —no mira
       `apagado`— porque la conversión de Google depende de que el visitante
       aceptara cookies (lo decide cookies.js), no de que el panel esté vivo. */
    solicitud: function () {
      if (raiz.JonicaGoogle) raiz.JonicaGoogle.solicitud();
    }
  };

  if (!apagado) {
    document.addEventListener('visibilitychange', function () {
      contar();
      mirando = !document.hidden;
      desde = Date.now();
      if (document.hidden) mandar(paquete(), true);
    });
    /* pagehide cubre el cierre y el «atrás» del móvil, donde unload no salta */
    window.addEventListener('pagehide', function () { mandar(paquete(), true); });

    M.ev('visita', location.pathname + location.hash);
    programar(true);
  }

  raiz.JonicaMedir = M;
})(window);
