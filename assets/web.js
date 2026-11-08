/* ============================================================================
   JÓNICA CONSTRUCTORA — comportamiento general de la página
   Menú, animaciones, contadores, formulario y arranque del cotizador.
   ========================================================================= */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     DATOS DE CONTACTO — se cambian aquí y cambian en toda la web
     ---------------------------------------------------------------------- */
  const TELEFONO_WA = "34684394567";          // WhatsApp: sin signos, con prefijo de país
  const TELEFONO    = "34630734941";          // llamadas: el que está publicado en la web
  const CORREO      = "informacion@jonica.es";

  /* Análisis del texto libre del cotizador con un modelo de lenguaje.
     Vacío = solo el detector local, que ya funciona y no cuesta nada.
     Para activarlo hay que desplegar la función del LEEME §6 y poner aquí su
     dirección. NUNCA se pone aquí la clave de la API: este archivo es público. */
  const ENDPOINT_IA = "";

  /* La dirección del panel de administración. NO se enlaza desde ninguna parte
     de la página: lo único que hace esta línea es que escribiendo
     jonica.es/#panel se abra el panel, para no tener que acordarse de la
     dirección larga. Aquí no hay contraseña ni nada aprovechable: la clave la
     pide el propio panel y vive en su servidor. */
  const PANEL = "https://panel.jonica.es";
  const RESENAS = "https://jonica-datos.jonica-constructora.workers.dev/resenas";

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ menú */
  const cabecera = $('.cabecera');
  const hamburguesa = $('.hamburguesa');
  const menu = $('#menu-principal');

  if (hamburguesa && menu) {
    hamburguesa.addEventListener('click', function () {
      const abierto = menu.classList.toggle('abierto');
      hamburguesa.setAttribute('aria-expanded', String(abierto));
      hamburguesa.setAttribute('aria-label', abierto ? 'Cerrar el menú' : 'Abrir el menú');
      /* con el cajón abierto, la página de detrás no se arrastra al deslizar */
      document.body.classList.toggle('menu-abierto', abierto);
    });
    $$('#menu-principal a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('abierto');
        hamburguesa.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-abierto');
      });
    });
  }

  /* cabecera que encoge y la foto de portada, que sube algo más despacio que el
     resto de la página. El botón de WhatsApp no depende del scroll: está
     siempre, desde que se abre la página. */
  const fotoPortada = $('.portada__foto img');
  let ultimo = -1;
  function alScroll() {
    const y = window.scrollY;
    if (y === ultimo) return;
    ultimo = y;
    if (cabecera) cabecera.classList.toggle('encogida', y > 40);
    if (fotoPortada && !reducido && y < 1200) {
      fotoPortada.style.transform = 'translate3d(0,' + (y * 0.07).toFixed(1) + 'px,0)';
    }
  }
  window.addEventListener('scroll', function () { window.requestAnimationFrame(alScroll); }, { passive:true });
  alScroll();

  /* ------------------------------------------------------- revelado al bajar */
  const revelables = $$('[data-revela]');
  if (revelables.length) {
    if (!('IntersectionObserver' in window) || reducido) {
      revelables.forEach(function (el) { el.classList.add('visto'); });
    } else {
      const vigia = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          const retraso = Number(en.target.dataset.retraso || 0);
          setTimeout(function () { en.target.classList.add('visto'); }, retraso);
          vigia.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      revelables.forEach(function (el) { vigia.observe(el); });
    }
  }

  /* escalonado automático dentro de cada rejilla */
  $$('[data-escalona]').forEach(function (cont) {
    $$('[data-revela]', cont).forEach(function (el, i) {
      if (!el.dataset.retraso) el.dataset.retraso = String(i * 110);
    });
  });

  /* ------------------------------------------------------------- contadores */
  const contadores = $$('[data-cuenta]');
  if (contadores.length && 'IntersectionObserver' in window && !reducido) {
    const vigiaNum = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        const el = en.target;
        const fin = Number(el.dataset.cuenta);
        const sufijo = el.dataset.sufijo || '';
        const inicio = performance.now();
        const dura = 1400;
        (function paso(ahora) {
          const t = Math.min((ahora - inicio) / dura, 1);
          const suave = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(fin * suave) + sufijo;
          if (t < 1) requestAnimationFrame(paso);
        })(inicio);
        vigiaNum.unobserve(el);
      });
    }, { threshold: 0.5 });
    contadores.forEach(function (el) { vigiaNum.observe(el); });
  } else {
    contadores.forEach(function (el) { el.textContent = el.dataset.cuenta + (el.dataset.sufijo || ''); });
  }

  /* ------------------------------------------ apartado activo en el menú */
  const apartados = $$('main section[id]');
  /* el botón de llamada a la acción queda fuera: no es un apartado del menú */
  const enlaces = $$('#menu-principal a[href^="#"]:not(.btn)');
  if (apartados.length && 'IntersectionObserver' in window) {
    const vigiaMenu = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        enlaces.forEach(function (a) {
          a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    apartados.forEach(function (s) { vigiaMenu.observe(s); });
  }

  /* ----------------------------------------------------------- cotizador */
  const cajaCot = $('#caja-cotizador');
  if (cajaCot && window.Cotizador) {
    new window.Cotizador(cajaCot, { telefono: TELEFONO_WA, correo: CORREO, endpointIA: ENDPOINT_IA });

    /* Cuántos LLEGAN a ver el cotizador, que no es lo mismo que cuántos lo
       usan: sin este escalón no se puede saber si el problema es que la gente
       no baja hasta él o que baja y no lo empieza. */
    const medir = window.JonicaMedir;
    if (medir && medir.activo() && 'IntersectionObserver' in window) {
      const vigiaCot = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          medir.ev('cotizador');
          vigiaCot.disconnect();
        });
      }, { threshold: 0.25 });
      vigiaCot.observe(cajaCot);
    }
  }

  /* --------------------------------------------------------- formulario */
  const formulario = $('#formulario-contacto');
  if (formulario) {
    const leer = function (id) { const el = $(id); return el ? (el.value || '').trim() : ''; };

    /* Solo nombre y teléfono son obligatorios: con eso ya se puede llamar.
       La obra y el mensaje ayudan, pero exigirlos echa para atrás. */
    const componer = function () {
      if (!leer('#f-nombre') || !leer('#f-telefono')) {
        alert('Déjanos tu nombre y tu teléfono, por favor.');
        (!leer('#f-nombre') ? $('#f-nombre') : $('#f-telefono')).focus();
        return null;
      }
      if (leer('#f-telefono').replace(/\D/g, '').length < 9) {
        alert('Revisa el teléfono: le faltan cifras.');
        $('#f-telefono').focus();
        return null;
      }
      if (!$('#f-consentimiento').checked) {
        alert('Para poder responderte necesitamos que aceptes la política de privacidad.');
        $('#f-consentimiento').focus();
        return null;
      }
      /* se filtran los null (líneas que no aplican), no las cadenas vacías:
         esas son los renglones en blanco que separan los bloques */
      return [
        'Hola, os escribo desde la web.',
        '',
        '· Nombre: ' + leer('#f-nombre'),
        '· Teléfono: ' + leer('#f-telefono'),
        leer('#f-obra')      ? '· Obra: ' + leer('#f-obra') : null,
        leer('#f-poblacion') ? '· Dónde está la obra: ' + leer('#f-poblacion') : null,
        leer('#f-mensaje')   ? '' : null,
        leer('#f-mensaje')   || null
      ].filter(function (l) { return l !== null; }).join('\n');
    };
    /* El panel no tiene columna para el tipo de obra: va delante del mensaje,
       que es donde se lee. */
    const mensaje = function () {
      return [leer('#f-obra') && 'Obra: ' + leer('#f-obra'), leer('#f-mensaje')]
        .filter(Boolean).join('. ');
    };

    /* Lo mismo que se manda por WhatsApp queda anotado en el panel. Es la
       diferencia entre saber quién te escribió y perder al que se arrepiente
       en la ventana de WhatsApp y cierra sin enviar. */
    const anotar = function (via) {
      const m = window.JonicaMedir;
      if (!m) return false;
      /* Este formulario sí es una solicitud de verdad: quien lo manda está
         pidiendo presupuesto. Se avisa a Google antes de la guarda de abajo,
         porque la conversión no depende de que la medición esté encendida. */
      m.solicitud();
      if (!m.activo()) return false;
      m.con({
        nombre: leer('#f-nombre'), telefono: leer('#f-telefono'),
        poblacion: leer('#f-poblacion'),
        mensaje: mensaje(),
        /* `llamada` distingue al que pide que le llamemos del que además
           escribe por WhatsApp. Es el que hay que atender antes: ha dejado el
           teléfono y se ha quedado esperando, no tiene ninguna conversación
           abierta por su lado. El panel y el correo de aviso lo dicen así. */
        via: via === 'llamada' ? 'llamada' : 'formulario',
        consentido: 1
      });
      m.ev('contacto', via);
      return true;
    };

    /* WHATSAPP, la segunda opción: abre la conversación con todo escrito y,
       aunque se arrepienta y no lo envíe, los datos ya están en el panel. */
    const botonWa = $('#f-whatsapp');
    if (botonWa) botonWa.addEventListener('click', function () {
      const texto = componer();
      if (texto) {
        anotar('whatsapp');
        window.open('https://wa.me/' + TELEFONO_WA + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
      }
    });

    /* QUE LLAMEMOS NOSOTROS, la acción principal y la del Intro. Los datos se
       guardan y sale el aviso a informacion@jonica.es. Como aquí no se abre
       ninguna aplicación, el visitante no tiene forma de saber que ha
       funcionado si no se le dice; de ahí el mensaje y los botones que
       desaparecen.

       Y si no se ha podido guardar —sin medición no hay dónde escribir— se
       dice la verdad y se le manda a WhatsApp, en vez de darle las gracias por
       un dato que no ha llegado a ninguna parte. */
    formulario.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!componer()) return;
      const hecho = $('#f-hecho');
      if (!anotar('llamada')) {
        if (hecho) {
          hecho.textContent = 'No hemos podido guardar tus datos. Escríbenos por WhatsApp y lo vemos al momento.';
          hecho.hidden = false;
        }
        return;
      }
      if (hecho) {
        hecho.textContent = 'Recibido, ' + leer('#f-nombre').split(' ')[0] + '. Te llamamos al ' +
          leer('#f-telefono') + ' lo antes posible.';
        hecho.hidden = false;
      }
      const botones = document.querySelector('.formulario__botones');
      if (botones) botones.hidden = true;
    });
  }

  /* ------------------------------------------------------------- reseñas
     Las trae el servidor del panel, no Google: ahí está la clave de la API y
     ahí se guardan, así que esta llamada es a casa y cuesta lo mismo tenga la
     web una visita o mil.

     No se pinta la foto de perfil de quien escribe, aunque Google la da. Es a
     propósito: cada foto sería una llamada del navegador del visitante a los
     servidores de Google antes de que nadie haya aceptado nada, y la inicial
     dentro de un círculo se lee igual de bien y carga al instante. */
  const seccionResenas = $('#resenas');
  if (seccionResenas) {
    const barras = function (n) {
      const llenas = Math.round(Math.max(Math.min(Number(n) || 0, 5), 0));
      return '★★★★★'.slice(0, llenas) + '☆☆☆☆☆'.slice(0, 5 - llenas);
    };
    const escapar = function (t) {
      return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    };

    fetch(RESENAS)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.resenas || !d.resenas.length) return;   // sin reseñas, sin sección

        $('#resenas-media').textContent = (Number(d.estrellas) || 0)
          .toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        $('#resenas-estrellas').textContent = barras(d.estrellas);
        $('#resenas-cuantas').textContent = d.cuantas === 1 ? '1 reseña' : d.cuantas + ' reseñas';
        if (d.enlace) $('#resenas-enlace').href = d.enlace;

        $('#resenas-lista').innerHTML = d.resenas.map(function (r) {
          const inicial = (r.autor || '?').trim().charAt(0).toUpperCase();
          return '<article class="resena">' +
            '<header class="resena__quien">' +
              '<span class="resena__inicial" aria-hidden="true">' + escapar(inicial) + '</span>' +
              '<span>' +
                '<b class="resena__autor">' + escapar(r.autor || 'Cliente') + '</b>' +
                '<span class="resena__meta">' +
                  '<span class="resena__barras" aria-label="' + barras(r.estrellas).length + '">' +
                    barras(r.estrellas) + '</span> · ' + escapar(r.cuando || '') +
                '</span>' +
              '</span>' +
            '</header>' +
            '<p class="resena__texto">' + escapar(r.texto) + '</p>' +
            (r.respuesta
              ? '<div class="resena__respuesta"><b>Respuesta de JÓNICA</b>' +
                '<p>' + escapar(r.respuesta) + '</p></div>'
              : '') +
          '</article>';
        }).join('');

        seccionResenas.hidden = false;
        /* La sección nace oculta, y lo que está oculto no se cruza nunca con
           el observador que va revelando los bloques al bajar: se quedaría
           transparente para siempre. Al destaparla se le da el visto a mano. */
        $$('[data-revela]', seccionResenas).forEach(function (el) { el.classList.add('visto'); });
      })
      .catch(function () { /* sin reseñas la web se queda como estaba */ });
  }

  /* ------------------------------------------------- enlaces de WhatsApp */
  const saludo = encodeURIComponent('Hola, me gustaría pedir presupuesto para una obra.');
  $$('[data-wa]').forEach(function (a) {
    a.href = 'https://wa.me/' + TELEFONO_WA + '?text=' + saludo;
  });
  $$('[data-tel]').forEach(function (a) { a.href = 'tel:+' + TELEFONO; });
  $$('[data-correo]').forEach(function (a) { a.href = 'mailto:' + CORREO; });

  /* El correo de las candidaturas. Va con asunto y con el cuerpo empezado para
     que llegue clasificado y no se mezcle con las peticiones de presupuesto.
     Cuando exista el alias empleo@jonica.es basta con cambiar esta constante. */
  const CORREO_CV = CORREO;
  const CUERPO_CV = [
    'Hola,',
    '',
    'Os escribo para trabajar con vosotros. Adjunto mi currículum.',
    '',
    '· Nombre:',
    '· Oficio:',
    '· Años de experiencia:',
    '· Dónde vivo:',
    '· Teléfono:',
    '',
    'ANTES DE ENVIAR: adjunta el currículum al correo.'
  ].join('\n');
  $$('[data-cv]').forEach(function (a) {
    a.href = 'mailto:' + CORREO_CV +
      '?subject=' + encodeURIComponent('Candidatura · Trabajar en JÓNICA') +
      '&body=' + encodeURIComponent(CUERPO_CV);
  });

  /* --------------------------------------------- la puerta del administrador
     Sin enlace, sin botón y sin nada que un cliente pueda encontrar: solo
     responde a la dirección escrita a mano. */
  const abrirPanel = function () {
    if (PANEL && location.hash.toLowerCase() === '#panel') {
      location.replace(PANEL);
    }
  };
  window.addEventListener('hashchange', abrirPanel);
  abrirPanel();

  /* ------------------------------------------------------------- año del pie */
  const anyo = $('#anyo');
  if (anyo) anyo.textContent = new Date().getFullYear();
})();
