/* ============================================================================
   COTIZADOR — JÓNICA CONSTRUCTORA

   IMPORTANTE PARA QUIEN EDITE ESTO
   --------------------------------
   Todas las cifras de este archivo son EUROS DE VENTA, sin IVA. Aquí no hay
   PEM, ni coeficiente, ni margen, ni beneficio: se calcularon aparte con el
   modelo interno de la empresa y a la web solo llega el resultado. Un cliente
   que abra el código fuente no puede deducir lo que gana la empresa.

   TARIFA[tipo][nivel] = [euros fijos de la obra, euros por unidad]
   Los suplementos de cada respuesta van en `mas` (euros) o `masUd` (euros por
   unidad de medida). Los multiplicadores van en `factor`.

   Para cambiar precios, ver LEEME.md §5.
   ========================================================================= */

(function (raiz) {
  "use strict";

  /* ---------------------------------------------------------------- tarifas */
  /* La base es la obra DESNUDA: todo lo que se pregunta aparte (quitar la
     bañera, el segundo baño, la carpintería exterior, el andamio, el porche…)
     se suma como suplemento y por eso no puede estar aquí dentro. Calibrado
     de modo que base + suplementos reproduce los presupuestos ya emitidos. */
  const TARIFA = {
    /* `bano` y `vivienda` subidos el 23-8-2026: desde esa fecha se alicata siempre con
       porcelánico 30×60 (partida 01.11.01.01.03.01.03, antes cerámica 31×45). Delta medido
       recalculando los presupuestos de calibración con el método real: +770 € sin IVA en el
       baño de referencia y +1.430 € en la vivienda (los alicatados de sus baños y cocina).
       Se aplica a la base fija de cada gama; el €/m² no se toca (un solo punto de
       calibración por tipo: si algún día hay dos tamaños de baño reales, repartir entre
       base y €/m²). Cocina y parcial no se tocan: nunca estuvieron contrastados. */
    bano:        { esencial:[4000, 378], media:[4980, 468], alta:[6570,  542] },
    cocina:      { esencial:[2380, 450], media:[3500, 600], alta:[4750,  812] },
    vivienda:    { esencial:[5610, 217], media:[6490, 280], alta:[7490,  346] },
    parcial:     { esencial:[3040, 204], media:[4050, 269], alta:[5310,  347] },
    /* `suelo` reajustado el 12-8-2026. Las cifras anteriores —[1420,38],
       [1890,53], [2670,79]— nunca se contrastaron: los tres presupuestos de
       calibración son un baño, unos exteriores y una vivienda integral, y
       ninguno es un cambio de suelo. Quedaban entre un 20 y un 35 % por debajo
       del precio del método, y el error crecía con los metros porque la base
       fija era demasiado grande y el precio por m² demasiado pequeño. Solar es
       trabajo repetitivo: el precio unitario casi no baja con el tamaño.
       Ajuste por mínimos cuadrados contra `presupuesto-obra` (40–250 m²) sobre
       la partida 01.10.04.02.10.02.07 —doble encolado sobre el pavimento
       existente, que es la ejecución correcta cuando no se levanta—, variando
       solo el precio de la baldosa.

       Reanclado el 12-8-2026 sobre el dato del promotor: **su compra media de
       baldosa es 18 €/m²**, no los 31,12 que trae la partida de la base. Con la
       escalera anterior (17,79 / 23,68 / 31,12) su cliente corriente caía en
       `alta` y se le cobraba de más. Ahora la escalera es 12 / 18 / 30 €/m² de
       baldosa, con `media` clavada en su precio real de compra. Si esa media
       cambia, se cambian estos tres pares y nada más. */
    suelo:       { esencial:[ 790,  52], media:[ 790,  60], alta:[ 790,   76] },
    pintura:     { esencial:[1310,  15], media:[1610,  22], alta:[2310,   31] },
    instalacion: { esencial:[1630,  43], media:[2250,  71], alta:[2990,   97] },
    carpinteria: { esencial:[1990, 494], media:[2060, 747], alta:[2220, 1114] },
    fachada:     { esencial:[2700,  36], media:[4030,  63], alta:[5550,  102] },
    local:       { esencial:[2920, 246], media:[3600, 320], alta:[4560,  413] },
    obranueva:   { esencial:[2520, 768], media:[2620, 930], alta:[2510, 1161] },
    exterior:    { esencial:[2440,  22], media:[3360,  33], alta:[4730,   44] }
  };

  /* Multiplicadores generales */
  const F_HABITADA = { no: 1.00, si: 1.05 };
  const F_ACCESO   = { facil: 1.00, sin_ascensor: 1.04, dificil: 1.07 };
  const F_ESTADO   = { bien: 1.00, regular: 1.06, malo: 1.14 };

  /* ----------------------------------------------- tratamiento de humedades
     LEER ANTES DE TOCAR NADA DE AQUÍ

     Estas cinco cifras son las ÚNICAS de todo el archivo que NO salen de los
     presupuestos ya emitidos: cuando se calibró el cotizador no había ninguna
     obra de humedades con la que contrastar. Son precios de venta de mercado,
     sin IVA, del orden de magnitud de la Base de Precios de la Construcción de
     Extremadura. Sustitúyelas por las tuyas en cuanto tengas una obra de
     saneamiento cerrada: se cambian aquí y cambian en todo el cotizador.

     La humedad no se cobra a tanto alzado porque no es una partida: es un
     diagnóstico. Picar y sanear un paño de salón no se parece en nada a cortar
     la capilaridad de un muro de tapial de sesenta centímetros. Por eso el
     cotizador estima la SUPERFICIE afectada y le aplica el tratamiento que
     reconoce en el texto, y por eso siempre acompaña el aviso de que la cifra
     definitiva sale de la visita. */
  const HUMEDAD = {
    saneado:    64,   // €/m² de paramento: picar, secar, mortero de saneamiento y acabado
    camara:     98,   // €/m² de trasdosado ventilado con lámina nodular (muro enterrado)
    inyeccion:  92,   // €/ml de muro: barrera química por inyección contra la capilaridad
    drenaje:   140,   // €/ml de drenaje perimetral ejecutado por el exterior
    /* Tope de lo que el cotizador se atreve a poner sin haber visto la obra.
       Por encima de esta cifra el problema deja de ser una partida y pasa a ser
       el motivo de la visita, así que se corta aquí y se dice por qué. */
    tope:     9000
  };

  /* Qué parte de los metros de la obra se supone afectada según cómo lo cuente
     el cliente. Es una estimación declarada, no una medición: sirve para que
     «muchas humedades en la planta baja» y «una mancha en el baño» no valgan
     lo mismo, que es exactamente lo que pasaba antes. */
  const HUM_ALCANCE = { leve: 0.08, media: 0.20, grave: 0.38 };

  /* ------------------------------------------------------------------ iconos */
  const IC = {
    bano:'<path d="M8 24h32v10a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z"/><path d="M14 24V12a4 4 0 0 1 8 0v2"/>',
    cocina:'<rect x="7" y="8" width="34" height="32" rx="2"/><path d="M7 22h34M15 8v14M27 30h8"/>',
    vivienda:'<path d="M6 22L24 8l18 14"/><path d="M11 20v20h26V20"/><path d="M20 40V28h8v12"/>',
    parcial:'<rect x="6" y="10" width="36" height="28" rx="2"/><path d="M24 10v28M6 24h18"/>',
    suelo:'<path d="M4 32h40M4 40h40"/><path d="M10 32v8M20 32v8M30 32v8M40 32v8"/><path d="M8 8h32v16H8z"/>',
    pintura:'<path d="M12 6h24v10H12z"/><path d="M24 16v8"/><path d="M18 24h12v8H18z"/><path d="M24 32v10"/>',
    instalacion:'<path d="M26 4L12 26h10l-2 18 16-24H26z"/>',
    carpinteria:'<rect x="8" y="6" width="32" height="36" rx="1"/><path d="M24 6v36M8 24h32"/>',
    fachada:'<rect x="10" y="6" width="28" height="36"/><path d="M17 14h6M25 14h6M17 24h6M25 24h6M17 34h14"/>',
    local:'<path d="M7 18l3-10h28l3 10"/><path d="M9 18v24h30V18"/><path d="M19 42V28h10v14"/>',
    obranueva:'<path d="M10 42V6l24 10"/><path d="M10 16l24 10M34 16v10M4 42h40"/><path d="M28 42V30h12v12"/>',
    exterior:'<path d="M6 30h36"/><path d="M10 30V16h28v14"/><path d="M6 16l18-8 18 8"/><path d="M14 42h20"/>'
  };

  /* ------------------------------------------------------- definición de obras
     `preguntas`: cada una es una pantalla. Con `junto:true` se dibuja en la
     misma pantalla que la anterior. `multi:true` permite marcar varias.

     `si(e)` en una pregunta o en una opción decide si tiene sentido con lo ya
     contestado. Lo que no se ve no se pinta, no bloquea el botón y no suma en
     el cálculo. Sirve para no preguntar tonterías: la potencia contratada en
     una obra de solo fontanería, o el suelo radiante «aprovechando que está
     levantado» cuando el cliente ha dicho que el suelo no se levanta.

     `sit` dice cuáles de las preguntas generales de la pantalla «Situación»
     tienen sentido en esta obra. Se declara en las doce a propósito, aunque
     muchas coincidan: es la lista de comprobación de que se ha mirado una por
     una. Ver `vistaSituacion`.
       · conserva → «¿en qué estado está lo que hay?»   (no vale si no hay nada)
       · acceso   → 'piso' | 'calle' | false            (false si ya se pregunta aparte)
       · hab      → «¿se va a vivir allí durante la obra?» */
  const OBRA = {

    bano: {
      nombre:'Reforma de baño', icono:'bano', iva:10, vivienda:true,
      sit:{ conserva:true, acceso:'piso', hab:true },
      unidad:'m²', pregMedida:'¿Cuánto mide el baño?',
      ayudaMedida:'Los metros del suelo. Un baño normal tiene entre 4 y 8 m². Si no lo sabes, cruza el baño andando y cuenta los pasos: cada paso es medio metro largo.',
      min:2, max:20, ini:6, paso:1,
      gamaAyuda:'Aquí eliges lo caro que es el material: el azulejo de las paredes y del suelo, y la calidad del inodoro, el lavabo y los grifos. Es lo que más mueve el precio.',
      gama:{
        esencial:{ t:'Sencillo', d:'Paredes con porcelánico 30×60, el azulejo que ponemos siempre. Inodoro y lavabo de los de siempre, marca conocida. Queda bien y dura.' },
        media:   { t:'El más pedido', d:'Paredes con porcelánico 30×60 y azulejo a tu gusto hasta 30 € el metro. Grifos de buena marca, mueble de lavabo con cajones y mampara de cristal.' },
        alta:    { t:'De diseño', d:'Azulejo de más de 30 € el metro o gran formato. Ducha de lluvia, mueble hecho a medida y detalles cuidados.' }
      },
      preguntas:[
        { id:'estado', titulo:'¿Qué hay ahora mismo en el baño?', ayuda:'Quitar una bañera da más trabajo que cambiar una ducha que ya está puesta.', ops:[
          { v:'banera',  t:'Una bañera, y quiero quitarla', d:'La sacamos y ponemos ducha', mas:860 },
          { v:'ducha',   t:'Ya hay ducha',            d:'Cambiamos el plato y la mampara',  mas:0 },
          { v:'completo',t:'No hay nada, está vacío', d:'El baño se hace entero desde cero',     factor:1.04 }
        ]},
        { id:'mover', junto:true, titulo:'¿Quieres cambiar las cosas de sitio?', ayuda:'Que el váter o la ducha se queden donde están o cambien de pared no es lo mismo: mover uno obliga a romper el suelo para llevar las tuberías hasta el sitio nuevo. Es lo que más encarece un baño sin que luego se vea.', ops:[
          { v:'no', t:'No, cada cosa en su sitio', d:'Solo cambiamos lo que hay por lo nuevo', mas:0 },
          { v:'si', t:'Sí, quiero moverlo',      d:'Hay que romper el suelo y llevar las tuberías', mas:660 }
        ]},
        { id:'alicatado', titulo:'¿Hasta qué altura quieres el azulejo en las paredes?', ayuda:'Lo normal, y lo que llevan estos precios, es azulejo desde el suelo hasta el techo. Dejarlo a media pared y pintar el resto sale más barato. Las piezas grandes se pagan más porque hacen falta dos personas para colocar cada una.', ops:[
          { v:'techo',  t:'Del suelo al techo',        d:'Azulejo en toda la pared', masUd:0 },
          { v:'medio',  t:'Hasta media pared',    d:'De ahí para arriba, pintado', masUd:-55 },
          { v:'grande', t:'Del suelo al techo, con piezas grandes', d:'Se ven muchas menos juntas', masUd:48 }
        ]},
        { id:'techo', junto:true, titulo:'¿Quieres bajar el techo y poner focos?', ayuda:'Es un techo nuevo por debajo del que hay, hecho con placa de yeso —lo que la gente llama pladur—. Sirve para esconder tubos y para dejar los focos empotrados, sin lámpara colgando.', ops:[
          { v:'no', t:'No, así está bien', d:'Se queda el techo de ahora', mas:0 },
          { v:'si', t:'Sí, con focos', d:'Techo nuevo de placa de yeso y focos', mas:310 }
        ]},
        { id:'ventilacion', titulo:'¿El baño tiene ventana que dé a la calle o a un patio?', ayuda:'Si no la tiene, hay que poner un extractor y llevar un tubo hasta el hueco de ventilación del edificio o hasta el tejado, porque si no se queda la humedad dentro.', ops:[
          { v:'ventana', t:'Sí, tiene ventana', d:'Se ventila solo abriéndola', mas:0 },
          { v:'forzada', t:'No, no tiene',   d:'Ponemos extractor y su tubo de salida', mas:210 }
        ]},
        { id:'puerta', junto:true, titulo:'¿Quieres cambiar la puerta del baño?', ayuda:'', ops:[
          { v:'no', t:'No, la de ahora vale', d:'La tapamos durante la obra y la volvemos a colgar', mas:0 },
          { v:'si', t:'Sí, quiero una nueva', d:'Puerta, marco y las molduras que la rematan', mas:320 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'Marca todo lo que te interese. También puedes no marcar nada.', ops:[
          { v:'radiante',  t:'Suelo que da calor',        d:'Una malla eléctrica bajo el suelo, para no pisar frío', mas:1190 },
          { v:'mueble',    t:'Mueble de lavabo hecho a medida',       d:'En vez de uno de tienda, con las medidas exactas de tu baño', mas:640 },
          { v:'hornacina', t:'Hueco en la pared de la ducha', d:'Una repisa metida en la pared, alicatada, para el gel y el champú', mas:290 },
          { v:'toallero',  t:'Radiador toallero',     d:'El radiador con barras donde se secan y se calientan las toallas', mas:290 },
          { v:'bide',      t:'Bidé',                  d:'Con su grifo y su desagüe', mas:260 },
          { v:'columna',   t:'Ducha de lluvia',  d:'La barra alta con el plato grande arriba, y el agua siempre a la misma temperatura', mas:340 },
          /* no se ofrece cambiar la ventana de un baño que acaba de decir que
             no tiene ventana */
          { v:'ventana_n', t:'Cambiar la ventana',    d:'Ventana nueva y arreglar el hueco', mas:480,
            si:function (e) { return e.ventilacion !== 'forzada'; } }
        ]}
      ]
    },

    cocina: {
      nombre:'Reforma de cocina', icono:'cocina', iva:10, vivienda:true,
      sit:{ conserva:true, acceso:'piso', hab:true },
      unidad:'m²', pregMedida:'¿Cuánto mide la cocina?',
      ayudaMedida:'Los metros del suelo de la cocina. Los muebles y la encimera ya van dentro del precio.',
      min:4, max:40, ini:10, paso:1,
      gamaAyuda:'Aquí eliges lo caro que es el material: el azulejo de la pared y del suelo, y la calidad de los muebles y de los grifos.',
      gama:{
        esencial:{ t:'Sencillo', d:'Azulejo de 10 a 14 € el metro. Muebles de melamina, que es lo que lleva la mayoría de las cocinas, y bien montados.' },
        media:   { t:'El más pedido', d:'Azulejo de 15 a 22 € el metro. Muebles con cajones que cierran solos y herrajes de marca.' },
        alta:    { t:'De diseño', d:'Azulejo de 25 € el metro para arriba. Muebles sin tiradores, hechos a medida, y acabados especiales.' }
      },
      preguntas:[
        { id:'abrir', titulo:'¿Quieres tirar la pared y unir la cocina con el salón?', ayuda:'Antes de tirar una pared hay que mirar si aguanta el edificio, porque entonces no se puede tocar sin más. Y al quitarla queda una franja de suelo y de techo sin terminar que hay que rehacer.', ops:[
          { v:'no',   t:'No, la cocina se queda cerrada', d:'Todo se queda donde está', mas:0 },
          { v:'si',   t:'Sí, quiero abrirla al salón',   d:'Tiramos la pared y rematamos suelo y techo', mas:930 },
          { v:'isla', t:'Abrirla y poner una isla en medio', d:'La encimera exenta, en el centro de la cocina', mas:3110 }
        ]},
        { id:'electro', junto:true, titulo:'¿Ponemos nosotros los electrodomésticos?', ayuda:'Horno, vitrocerámica, campana, nevera y lavavajillas, encajados dentro de los muebles.', ops:[
          { v:'no', t:'No, los compro yo',   d:'Dejamos los enchufes y las tomas listos', mas:0 },
          { v:'si', t:'Sí, ponedlos vosotros',      d:'De marca conocida, montados y probados', mas:3900 }
        ]},
        { id:'encimera', titulo:'¿Qué encimera quieres?', ayuda:'Es la tabla sobre la que cocinas. Junto con los muebles, es lo que más mueve el precio de una cocina.', ops:[
          { v:'laminado', t:'Laminado',           d:'La más común. Buen resultado por poco dinero', mas:0 },
          { v:'compacto', t:'Cuarzo tipo Silestone',  d:'Mucho más dura, y no se le notan las uniones', mas:1350 },
          { v:'porcelanico', t:'Porcelánica tipo Dekton', d:'Puedes dejar la sartén caliente encima y cortar sin tabla', mas:2400 }
        ]},
        { id:'frente', junto:true, titulo:'¿Qué ponemos en la pared, entre la encimera y los muebles de arriba?', ayuda:'Es la franja que queda a la vista justo detrás de los fuegos y del fregadero. Es lo que más se ensucia y lo que más se limpia de la cocina.', ops:[
          { v:'azulejo',  t:'Azulejo',            d:'Lo de siempre, con la junta muy fina', mas:0 },
          { v:'cristal',  t:'Un cristal de una pieza',   d:'Sin ninguna junta, se limpia de una pasada', mas:380 },
          { v:'compacto', t:'El mismo material que la encimera', d:'La encimera sube por la pared y no se corta', mas:660 }
        ]},
        { id:'instalaciones', titulo:'¿Cambiamos las tuberías y los cables?', ayuda:'En cocinas de más de 20 años casi siempre hace falta: los enchufes de entonces no aguantan un horno y un lavavajillas a la vez.', ops:[
          { v:'completa', t:'Sí, todo nuevo', d:'Tuberías, desagües y cables desde cero', factor:1.00 },
          { v:'parcial',  t:'Solo lo que haga falta',    d:'Se cambian los puntos que estén peor', factor:0.91 },
          { v:'ninguna',  t:'No, están bien',      d:'Son recientes y se aprovechan', factor:0.83 }
        ]},
        { id:'humos', junto:true, titulo:'¿La campana tiene por dónde sacar el humo fuera?', ayuda:'Es un tubo que sube por dentro del edificio. Si tu cocina no lo tiene, o llevamos el tubo hasta él, o la campana tiene que ser de las que filtran el aire y lo devuelven a la cocina.', ops:[
          { v:'si', t:'Sí, ya hay tubo',      d:'Aprovechamos el que hay', mas:0 },
          { v:'no', t:'No, o no lo sé', d:'Hacemos el tubo o ponemos campana con filtro', mas:540 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'columna',   t:'Un mueble alto de despensa o para el horno', d:'De los que llegan del suelo al techo', mas:520 },
          { v:'fregadero', t:'Fregadero enrasado con la encimera',     d:'Sin el borde metálico que sobresale, se barre hacia dentro', mas:240 },
          { v:'luz',       t:'Luz bajo los muebles de arriba', d:'Una tira de led que ilumina la encimera', mas:180 },
          { v:'ventana',   t:'Cambiar la ventana',           d:'Ventana nueva y arreglar el hueco', mas:480 },
          { v:'office',    t:'Una barra o rincón para desayunar',       d:'Con su encimera y sus enchufes', mas:890 }
        ]}
      ]
    },

    vivienda: {
      nombre:'Reforma integral de vivienda', icono:'vivienda', iva:10, vivienda:true,
      sit:{ conserva:true, acceso:'piso', hab:true },
      unidad:'m²', pregMedida:'¿Cuántos metros útiles tiene la vivienda?',
      ayudaMedida:'Los metros que se pisan por dentro, no los de la escritura. Si solo tienes los de la escritura, quítales un 10 % y te quedas cerca.',
      min:35, max:400, ini:100, paso:5,
      gamaAyuda:'Aquí eliges lo caro que es el material en toda la casa: el suelo, el azulejo de baños y cocina, las puertas y los grifos.',
      gama:{
        esencial:{ t:'Sencillo', d:'Suelo y azulejo de 10 a 14 € el metro. Todo nuevo y bien puesto, sin florituras.' },
        media:   { t:'El más pedido', d:'Suelo y azulejo de 15 a 22 € el metro. Puertas lacadas en blanco y grifos de marca.' },
        alta:    { t:'De diseño', d:'Suelo y azulejo de 25 € el metro para arriba, en piezas grandes. Armarios y muebles hechos a medida.' }
      },
      preguntas:[
        { id:'banos', titulo:'¿Cuántos baños hay que reformar?', ayuda:'Los baños y la cocina son las habitaciones más caras de una casa: en pocos metros se junta todo el trabajo de fontanería, azulejo y aparatos.', ops:[
          { v:'1', t:'Uno',      d:'Un baño entero', mas:0 },
          { v:'2', t:'Dos',      d:'El baño grande y un aseo', mas:6780 },
          { v:'3', t:'Tres o más', d:'Casa grande', mas:13560 }
        ]},
        { id:'cocina', junto:true, titulo:'¿La cocina entra también?', ayuda:'Con los muebles, la encimera y los electrodomésticos encajados dentro.', ops:[
          { v:'si', t:'Sí, cocina nueva', d:'Muebles, encimera y electrodomésticos', mas:0 },
          { v:'no', t:'No, la dejamos como está',  d:'No se toca', mas:-7200 }
        ]},
        { id:'tabiques', titulo:'¿Quieres cambiar dónde están las habitaciones?', ayuda:'Tirar paredes obliga a rehacer la franja de suelo y de techo que queda debajo, y a mover los cables y las tuberías que van por dentro. Además hay que comprobar cuáles aguantan el edificio, porque esas no se pueden tocar.', ops:[
          { v:'no',    t:'No, todo se queda igual', d:'Las mismas habitaciones donde están', mas:0 },
          { v:'algo',  t:'Alguna pared',  d:'Abrir la cocina, juntar dos habitaciones', mas:2800 },
          { v:'mucho', t:'Bastantes',       d:'La casa cambia de reparto entera', mas:6300 }
        ]},
        { id:'instalaciones', junto:true, titulo:'¿Cambiamos las tuberías y los cables de toda la casa?', ayuda:'En casas de más de 30 años la instalación eléctrica casi nunca cumple lo que se pide hoy: hay pocos enchufes, no hay toma de tierra y salta la luz al enchufar dos cosas.', ops:[
          { v:'completa', t:'Sí, todo nuevo',  d:'Con cuadro de luz nuevo y el papel que pide la compañía', factor:1.00 },
          { v:'parcial',  t:'Solo lo necesario', d:'Baños, cocina y poco más', factor:0.90 },
          { v:'ninguna',  t:'No, están bien',     d:'Son recientes', factor:0.80 }
        ]},
        /* Suelo y paredes van dentro de la base de una reforma integral. Por
           eso la respuesta habitual vale 0 y las que quitan trabajo restan:
           así se puede preguntar sin cobrar dos veces lo mismo. */
        { id:'suelo', titulo:'¿Se cambia el suelo?', ayuda:'En una reforma completa lo normal es poner suelo nuevo en toda la casa, y eso es lo que llevan estos precios. Si conservas parte, baja.', ops:[
          { v:'todo',  t:'Sí, toda la casa',  d:'Suelo nuevo de punta a punta', masUd:0 },
          { v:'parte', t:'Solo en algunas habitaciones',     d:'En el resto se deja el que hay', masUd:-22 },
          { v:'no',    t:'No, el que hay está bien',   d:'No se toca', masUd:-44 }
        ]},
        { id:'pintura', junto:true, titulo:'¿Cómo están las paredes?', ayuda:'El gotelé es esa pintura rugosa, con grumos, que se puso en casi todas las casas de los años setenta y ochenta. Quitarlo y dejar la pared lisa es la mitad del trabajo de pintar, y es lo que más cambia el aspecto de una casa.', ops:[
          { v:'gotele', t:'Tienen gotelé y quiero quitarlo', d:'Se raspa, se tapa y se deja lisa', masUd:0 },
          { v:'tapar',  t:'Tienen gotelé, pero píntalo encima',   d:'Más barato, aunque se sigue viendo el relieve', masUd:-14 },
          { v:'lisas',  t:'Ya están lisas',               d:'Solo hay que pintar', masUd:-14 }
        ]},
        { id:'ventanas', titulo:'¿Se cambian las ventanas?', ayuda:'Es la partida cara que más se olvida al pedir precio, y la que más se nota en la factura de la luz y en el ruido de la calle.', ops:[
          { v:'no',    t:'No', d:'Se quedan las de ahora', mas:0 },
          { v:'pocas', t:'Algunas, entre 3 y 5', d:'Las que estén peor', mas:2830 },
          { v:'todas', t:'Todas', d:'Ventanas nuevas en toda la casa', mas:6360 }
        ]},
        { id:'techos', junto:true, titulo:'¿Quieres bajar los techos y poner focos?', ayuda:'Es un techo nuevo por debajo del que hay, hecho con placa de yeso —lo que la gente llama pladur—. Sirve para esconder tubos y cables y para dejar los focos empotrados.', ops:[
          { v:'no',    t:'No, así están bien',     d:'Se quedan los techos de ahora', mas:0 },
          { v:'zonas', t:'Solo en baños y cocina', d:'Que es por donde pasan los tubos', mas:1180 },
          { v:'todo',  t:'En toda la casa',   d:'Con los focos empotrados', mas:3400 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'Marca todo lo que te interese.', ops:[
          { v:'aire',     t:'Aire acondicionado',     d:'Aparatos en la pared o por el techo, instalados', mas:5010 },
          { v:'puertas',  t:'Puertas nuevas por dentro de la casa', d:'Todas las de las habitaciones', mas:2060 },
          { v:'armarios', t:'Armarios empotrados',    d:'Hechos a medida, para dos dormitorios', mas:3400 },
          { v:'calefaccion', t:'Calefacción',         d:'Caldera y radiadores', mas:4200 },
          { v:'entrada',  t:'Puerta de entrada blindada', d:'Con cerradura de seguridad', mas:1750 },
          { v:'terraza',  t:'Arreglar la terraza', d:'Suelo, paredes y un enchufe', mas:3900 }
        ]}
      ]
    },

    parcial: {
      nombre:'Reforma parcial', icono:'parcial', iva:10, vivienda:true,
      sit:{ conserva:true, acceso:'piso', hab:true },
      unidad:'m²', pregMedida:'¿Cuántos metros se van a reformar?',
      ayudaMedida:'Solo los metros de las habitaciones que entran en obra, no los de la casa entera.',
      min:10, max:200, ini:40, paso:5,
      gamaAyuda:'Aquí eliges lo caro que es el material: el suelo, el azulejo si entra un baño o la cocina, y los grifos.',
      gama:{
        esencial:{ t:'Sencillo', d:'Suelo y azulejo de 10 a 14 € el metro. Todo nuevo y bien puesto.' },
        media:   { t:'El más pedido', d:'Suelo y azulejo de 15 a 22 € el metro, con grifos de marca.' },
        alta:    { t:'De diseño', d:'Suelo y azulejo de 25 € el metro para arriba, en piezas grandes.' }
      },
      preguntas:[
        { id:'estancias', multi:true, titulo:'¿Qué habitaciones entran en la obra?', ayuda:'Marca todas las que quieras reformar.', ops:[
          { v:'salon',      t:'El salón',       d:'Suelo, paredes y techo', mas:0 },
          { v:'dormitorio', t:'Dormitorios', d:'Uno o varios', mas:0 },
          { v:'bano',       t:'Un baño',     d:'El baño entero, de arriba abajo', mas:6780 },
          { v:'cocina',     t:'La cocina',   d:'Con muebles y encimera', mas:7200 },
          { v:'pasillo',    t:'El pasillo y la entrada', d:'Suelo y pintura', mas:0 }
        ]},
        { id:'instalaciones', titulo:'¿Hay que tocar las tuberías o los cables?', ayuda:'Es lo que decide si la obra se queda en lo que se ve —suelo, pintura, azulejo— o hay que abrir las paredes.', ops:[
          { v:'completa', t:'Sí, en todo lo que se reforma', d:'Tuberías y cables nuevos en esa zona', factor:1.00 },
          { v:'parcial',  t:'Solo algún punto suelto',   d:'Un par de enchufes, un desagüe', factor:0.90 },
          { v:'ninguna',  t:'No, solo lo que se ve',  d:'Suelo, pintura y poco más', factor:0.78 }
        ]},
        { id:'tabiques', junto:true, titulo:'¿Hay que tirar o mover alguna pared?', ayuda:'', ops:[
          { v:'no', t:'No', d:'Todo se queda donde está', mas:0 },
          { v:'si', t:'Sí', d:'Se quita alguna o se abre un hueco', mas:2800 }
        ]},
        { id:'suelo', titulo:'¿Se cambia el suelo de esas habitaciones?', ayuda:'', ops:[
          { v:'si', t:'Sí, suelo nuevo',  d:'En toda la zona que se reforma', masUd:0 },
          { v:'no', t:'No, se queda el que hay',  d:'Lo tapamos para que no se estropee', masUd:-40 }
        ]},
        { id:'pintura', junto:true, titulo:'¿Cómo están las paredes?', ayuda:'El gotelé es esa pintura rugosa, con grumos, de las casas de los setenta y ochenta.', ops:[
          { v:'gotele', t:'Tienen gotelé y quiero quitarlo', d:'Se raspa, se tapa y se deja lisa', masUd:0 },
          { v:'tapar',  t:'Tienen gotelé, píntalo encima',               d:'Se sigue viendo el relieve', masUd:-13 },
          { v:'lisas',  t:'Ya están lisas',               d:'Solo hay que pintar', masUd:-13 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más en esa zona?', ayuda:'', ops:[
          { v:'techo',    t:'Bajar el techo y poner focos',  d:'Techo nuevo de placa de yeso, con los focos empotrados', mas:980 },
          { v:'puertas',  t:'Puertas nuevas', d:'Las de las habitaciones que se reforman', mas:1180 },
          { v:'armario',  t:'Armario empotrado',      d:'Hecho a medida', mas:1700 },
          { v:'aire',     t:'Aire acondicionado',     d:'Un aparato por habitación', mas:2600 },
          { v:'ventanas', t:'Cambiar las ventanas',   d:'Las de esas habitaciones', mas:2830 }
        ]}
      ]
    },

    suelo: {
      nombre:'Cambio de suelo', icono:'suelo', iva:10, vivienda:true,
      /* `hab` no: esta obra ya pregunta si la casa está amueblada, que es lo
         mismo dicho mejor y además se cobra por metro, no con un porcentaje */
      sit:{ conserva:true, acceso:'piso', hab:false },
      unidad:'m²', pregMedida:'¿Cuántos metros de suelo hay que cambiar?',
      ayudaMedida:'Los metros que se pisan en la zona donde va el suelo nuevo. Si es la casa entera, pon los metros de la casa (los que se pisan, no los de la escritura).',
      min:10, max:400, ini:70, paso:5,
      gamaAyuda:'Aquí eliges lo caro que es la baldosa. Es, con diferencia, lo que más mueve el precio de un cambio de suelo.',
      gama:{
        esencial:{ t:'Sencillo', d:'Baldosa de 10 a 14 € el metro. Formatos normales, colores lisos. Aguanta igual de bien, se nota en el acabado.' },
        media:   { t:'El más pedido', d:'Baldosa de 15 a 22 € el metro. Es lo que elige la mayoría: buen dibujo, buena pieza y mucho donde escoger.' },
        alta:    { t:'De diseño', d:'Baldosa de 25 € el metro para arriba. Piezas grandes, imitación madera o mármol, con juntas casi invisibles.' }
      },
      preguntas:[
        { id:'material', titulo:'¿Qué tipo de suelo quieres poner?', ayuda:'El precio exacto de la baldosa lo eliges en la pantalla siguiente. Aquí solo el tipo de material.', ops:[
          { v:'laminado',    t:'Laminado o vinílico', d:'Se pone rápido y sin obra. Imita madera', factor:0.86 },
          { v:'porcelanico', t:'Baldosa de gres porcelánico',    d:'La de toda la vida. La más dura y la que más se pone', factor:1.00 },
          { v:'gran_formato',t:'Baldosa grande de porcelánico', d:'Piezas de un metro o más: se ven muchas menos juntas', factor:1.28 },
          { v:'madera',      t:'Madera de verdad',    d:'Tarima natural. Más cálida al pisar, pide más cuidado', factor:1.34 }
        ]},
        { id:'levantar', junto:true, titulo:'¿Hay que quitar el suelo que tienes ahora?', ayuda:'Sobre un suelo de baldosa que esté firme y llano se puede pegar el nuevo encima, y sale bastante más barato: te ahorras romperlo, sacar los escombros y pagar el vertedero. La pega es que el suelo sube un dedo y hay que recortar las puertas por abajo.', ops:[
          { v:'no', t:'No, ponedlo encima del que hay', d:'Si está llano y no suena hueco al pisarlo', masUd:0 },
          { v:'si', t:'Sí, quitad el viejo',     d:'Se rompe, se saca y se lleva al vertedero', masUd:28 }
        ]},
        { id:'amueblada', titulo:'¿Hay muebles dentro de la casa?', ayuda:'Con los muebles puestos hay que ir por zonas: sacar lo de una habitación, taparlo, poner el suelo, esperar y devolverlo. Se tarda casi el doble que en una casa vacía.', ops:[
          { v:'vacia',     t:'No, está vacía',    d:'Se trabaja del tirón', masUd:0 },
          /* 18, no 8: son dos partidas, no una. Traslado de mobiliario
             (11.12.02.01, 17,70 €/h) más cubrición (11.12.02.02, 17,18 €/m²).
             Sacar y devolver los muebles de una casa entera se come una
             jornada por cada tres metros de suelo. */
          { v:'amueblada', t:'Sí, con los muebles', d:'Los sacamos, los tapamos y los volvemos a colocar', masUd:18 }
        ]},
        { id:'escalera', junto:true, titulo:'¿Hay alguna escalera a la que también haya que poner suelo?', ayuda:'', ops:[
          { v:'no', t:'No, todo está en la misma planta', d:'', mas:0 },
          { v:'si', t:'Sí, un tramo de escalera', d:'El peldaño donde se pisa, el frente y la pieza del lateral', mas:1450 }
        ]},
        /* Los dos primeros extras dependen de la respuesta anterior y son
           excluyentes: si el suelo se pone encima, sube el nivel y hay que
           recortar las puertas; si se levanta, no sube nada pero es el momento
           de meter el radiante debajo. */
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          /* 18, no 10: el rodapié nuevo obliga a levantar antes el viejo
             (01.01.02.09.01.13) y se mide en metros lineales, que en una
             vivienda corriente son 1,1 por cada m² de suelo. Es un valor de
             compromiso entre los tres niveles: con rodapié rectificado de gama
             alta se queda corto, y ahí está el peor desvío del cotizador
             (−11 %). */
          { v:'rodapie',  t:'Rodapié nuevo',        d:'La tira de abajo, donde la pared se junta con el suelo, a juego con la baldosa nueva', masUd:17 },
          /* 450, no 290: son ocho o diez hojas, y cada una es desmontar,
             recortar, cantear y volver a colgar. */
          { v:'puertas',  t:'Recortar las puertas por abajo', d:'Al poner el suelo encima del viejo, sube un dedo y las puertas ya no abren', mas:450,
            si:function (e) { return e.levantar !== 'si'; } },
          { v:'nivelar',  t:'Igualar el suelo antes',  d:'Si el de ahora está hundido o hace pendiente, se echa una capa que lo deja llano', masUd:19 },
          { v:'radiante', t:'Calefacción por el suelo', d:'Ya que se levanta, es el momento de meterla debajo', masUd:38,
            si:function (e) { return e.levantar === 'si'; } },
          { v:'aislante', t:'Manta contra el ruido',      d:'Una lámina debajo, para que no se oigan las pisadas en el piso de abajo', masUd:7 }
        ]}
      ]
    },

    pintura: {
      nombre:'Pintura y alisado', icono:'pintura', iva:10, vivienda:true,
      /* `hab` no: ya se pregunta si hay muebles dentro, que es lo que de
         verdad cuesta en una pintura */
      sit:{ conserva:true, acceso:'piso', hab:false },
      unidad:'m²', pregMedida:'¿Cuántos metros tiene la zona que hay que pintar?',
      ayudaMedida:'Los metros del suelo de la casa o de las habitaciones que se pintan. Los metros de pared los calculamos nosotros: no hace falta que midas nada de las paredes.',
      min:15, max:400, ini:80, paso:5,
      gamaAyuda:'Aquí eliges la calidad de la pintura y cuántas manos se dan.',
      gama:{
        esencial:{ t:'Sencillo', d:'Pintura plástica blanca de buena marca, dos manos. Lo normal en una casa.' },
        media:   { t:'El más pedido', d:'Pintura lavable, que aguanta que le pases un paño sin que se borre. Colores a elegir.' },
        alta:    { t:'De diseño', d:'Pintura de alta gama, mate profundo, y acabados especiales tipo veladura o microcemento en alguna pared.' }
      },
      preguntas:[
        { id:'gotele', titulo:'¿Las paredes tienen gotelé?', ayuda:'El gotelé es esa pintura rugosa, llena de grumos, que se puso en casi todas las casas de los setenta y ochenta. Quitarlo y dejar la pared lisa es la mitad del trabajo de pintar, y es lo que más cambia el aspecto de la casa.', ops:[
          { v:'no',    t:'No, están lisas', d:'Solo hay que pintar', masUd:0 },
          { v:'si',    t:'Sí, y quiero quitarlo',  d:'Se raspa, se tapa y se deja lisa', masUd:16 },
          { v:'tapar', t:'Sí, pero píntalo encima', d:'Más barato, aunque se sigue viendo el relieve', masUd:0 }
        ]},
        { id:'techos', junto:true, titulo:'¿Pintamos también los techos?', ayuda:'', ops:[
          { v:'si', t:'Sí', d:'Techos y paredes', masUd:13 },
          { v:'no', t:'No, solo las paredes', d:'', masUd:0 }
        ]},
        { id:'amueblada', titulo:'¿Hay muebles dentro?', ayuda:'Con la casa amueblada hay que apartarlo todo, taparlo con plástico y devolverlo a su sitio al terminar cada día, para que se pueda seguir viviendo allí.', ops:[
          { v:'vacia',     t:'No, está vacía',   d:'Se trabaja del tirón', masUd:0 },
          { v:'amueblada', t:'Sí, se vive en la casa', d:'Tapamos todo y recogemos cada día', masUd:6 }
        ]},
        { id:'altura', junto:true, titulo:'¿Los techos son altos?', ayuda:'Por encima de tres metros no se llega con una escalera de mano: hay que montar una plataforma dentro de casa y se tarda bastante más.', ops:[
          { v:'normal', t:'Normales',           d:'Hasta unos 2,70 m, que es lo corriente', masUd:0 },
          { v:'altos',  t:'Altos, más de 3 m',  d:'Casa antigua o techo en forma de bóveda', masUd:9 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'humedad',     t:'Hay manchas de humedad',   d:'Hay que arreglarlas antes, o vuelven a salir', mas:640 },
          { v:'carpinteria', t:'Pintar las puertas y los rodapiés', d:'En blanco, con esmalte', mas:980 },
          { v:'color',       t:'Alguna pared de color',    d:'Dos o tres tonos distintos', mas:210 },
          { v:'armarios',    t:'Pintar los armarios por dentro', d:'', mas:320 },
          { v:'papel',       t:'Quitar papel pintado',      d:'Se arranca, se sella la pared y se deja lisa', masUd:11 }
        ]}
      ]
    },

    instalacion: {
      nombre:'Electricidad y fontanería', icono:'instalacion', iva:10, vivienda:true,
      sit:{ conserva:true, acceso:'piso', hab:true },
      unidad:'m²', pregMedida:'¿Cuántos metros tiene la vivienda?',
      ayudaMedida:'Los metros que se pisan de la casa o del local donde hay que cambiar la instalación.',
      min:20, max:300, ini:80, paso:5,
      gamaAyuda:'Aquí eliges la calidad de lo que se ve y se toca: los enchufes, los interruptores y los grifos.',
      gama:{
        esencial:{ t:'Sencillo', d:'Enchufes e interruptores blancos de marca conocida. Cable y tubo con todas las garantías.' },
        media:   { t:'El más pedido', d:'Serie buena de enchufes, con marcos a elegir, y grifos de marca.' },
        alta:    { t:'De diseño', d:'Enchufes de aluminio o cristal, tomas USB y preparado para manejarlo desde el móvil.' }
      },
      preguntas:[
        { id:'que', titulo:'¿Qué hay que cambiar?', ayuda:'', ops:[
          { v:'electricidad', t:'Solo la luz', d:'Cables, enchufes, interruptores y el cuadro de los automáticos', factor:0.72 },
          { v:'fontaneria',   t:'Solo el agua',   d:'Tuberías, llaves de paso y desagües', factor:0.55 },
          { v:'ambas',        t:'Las dos cosas',           d:'Agua y luz, de cero', factor:1.00 }
        ]},
        { id:'alcance', junto:true, titulo:'¿Se hace todo de nuevo o solo se arregla lo que falla?', ayuda:'Hacerlo de nuevo significa abrir rozas en las paredes, tirar lo viejo y pasar todo otra vez. Da más trabajo, pero deja la casa lista para treinta años.', ops:[
          { v:'completa', t:'Todo de nuevo', d:'Se abren las paredes y se pasa todo otra vez', factor:1.00 },
          { v:'parcial',  t:'Solo una parte',   d:'Los baños y la cocina, o la línea que da problemas', factor:0.62 }
        ]},
        /* Las tuberías solo se preguntan si hay fontanería, y la potencia solo
           si hay electricidad. Van juntas en la misma pantalla, así que quien
           elige «las dos» ve las dos y quien elige una ve una sola. */
        { id:'tuberia', titulo:'¿Sabes de qué son las tuberías que tienes ahora?', ayuda:'Si son de plomo hay que cambiarlas todas, no vale con arreglar el trozo que gotea: el plomo pasa al agua de beber. Es la sorpresa más cara de una casa antigua. Si no lo sabes, marca la última: el precio ya lo contempla.',
          si:function (e) { return e.que !== 'electricidad'; }, ops:[
          { v:'plastico', t:'De plástico', d:'Instalación moderna, de los últimos veinte años', mas:0 },
          { v:'cobre',    t:'De cobre',                d:'Lo normal desde los años ochenta', mas:0 },
          { v:'plomo',    t:'De plomo, o no lo sé',     d:'Casas anteriores a 1975. Tubo gris y blando', mas:1240 }
        ]},
        { id:'potencia', junto:true, titulo:'¿Se te va la luz al enchufar varias cosas a la vez?', ayuda:'Es la señal de que la potencia que tienes contratada se queda corta. Con vitrocerámica de inducción, horno y aire acondicionado casi siempre hay que subirla, y eso es un trámite con la compañía de la luz que se paga aparte.',
          si:function (e) { return e.que !== 'fontaneria'; }, ops:[
          { v:'no', t:'No, va bien', d:'Con la que hay basta', mas:0 },
          { v:'si', t:'Sí, o voy a poner inducción',    d:'Hay que subirla y hacer el papeleo con la compañía', mas:680 }
        ]},
        { id:'calefaccion', titulo:'¿Tocamos la calefacción?', ayuda:'', ops:[
          { v:'no',          t:'No, se queda como está', d:'No entra en la obra', mas:0 },
          { v:'radiadores',  t:'Caldera y radiadores', d:'Lo de siempre: una caldera y los radiadores en cada habitación', mas:4200 },
          { v:'aerotermia',  t:'Aerotermia',           d:'Un solo aparato que da frío, calor y agua caliente. Gasta bastante menos', mas:9800 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'cuadro',   t:'Cuadro de luz nuevo',  d:'La caja de los automáticos, con protección contra descargas', mas:1060,
            si:function (e) { return e.que !== 'fontaneria'; } },
          { v:'boletin',  t:'El certificado de la instalación',  d:'El papel firmado por electricista autorizado que te pide la compañía de la luz', mas:550 },
          { v:'domotica', t:'Dejarlo listo para manejarlo desde el móvil', d:'Persianas, luces y aire acondicionado', mas:1900,
            si:function (e) { return e.que !== 'fontaneria'; } },
          { v:'termo',    t:'Termo o caldera nueva',   d:'Para el agua caliente', mas:980,
            si:function (e) { return e.que !== 'electricidad'; } },
          { v:'red',      t:'Cable de internet por las habitaciones',  d:'Va mejor que el wifi y no se corta', mas:620,
            si:function (e) { return e.que !== 'fontaneria'; } }
        ]}
      ]
    },

    carpinteria: {
      nombre:'Ventanas y puertas', icono:'carpinteria', iva:10, vivienda:true,
      sit:{ conserva:true, acceso:'piso', hab:true },
      unidad:'huecos', pregMedida:'¿Cuántas ventanas o puertas hay que cambiar?',
      ayudaMedida:'Cuenta cada agujero de la pared: cada ventana, cada ventanal y cada puerta que da a una terraza cuenta como uno.',
      min:1, max:40, ini:6, paso:1,
      gamaAyuda:'Aquí eliges la calidad del perfil y de la persiana. Todas llevan cristal doble que aísla del frío y del ruido.',
      gama:{
        esencial:{ t:'Sencillo', d:'Ventana correcta, de marca conocida, con su cristal doble. Cumple de sobra.' },
        media:   { t:'El más pedido', d:'Perfil con más cámaras dentro: aísla mejor y cierra más suave. Persiana con aislante.' },
        alta:    { t:'De diseño', d:'Perfil fino que deja pasar más luz, apertura oculta y colores especiales.' }
      },
      preguntas:[
        { id:'material', titulo:'¿De qué material quieres las ventanas?', ayuda:'Las tres llevan cristal doble con una capa que devuelve el calor hacia dentro en invierno.', ops:[
          { v:'pvc',      t:'PVC (plástico blanco)',                   d:'El que mejor aísla por lo que cuesta. Es el que más se pone', factor:1.00 },
          { v:'aluminio', t:'Aluminio',   d:'Marco más fino y más elegante. Lleva un corte aislante por dentro para que no pase el frío', factor:1.16 },
          { v:'madera',   t:'Madera',                d:'Para casas del casco antiguo, donde el ayuntamiento lo exige', factor:1.42 }
        ]},
        { id:'obra', junto:true, titulo:'¿Quitamos el marco viejo o ponemos la ventana encima?', ayuda:'Dejar el marco viejo y montar la ventana nueva encima es más rápido y no ensucia, pero el hueco de cristal se queda unos centímetros más pequeño. Quitarlo obliga a rematar con yeso y pintura alrededor.', ops:[
          { v:'renovacion', t:'Encima del marco de ahora', d:'Sin romper nada. En un día está', factor:0.88 },
          { v:'completa',   t:'Quitando el marco viejo', d:'Se gana cristal, pero hay que rematar y pintar', factor:1.00 }
        ]},
        /* El tamaño medio del hueco es lo que más mueve el precio de una
           carpintería y es justo lo que nadie pregunta. Un ventanal de tres
           metros cuesta el triple que una ventana de dormitorio. */
        { id:'tamano', titulo:'¿Cómo son de grandes, más o menos?', ayuda:'Piensa en la ventana típica de tu casa. Una ventana de dormitorio y un ventanal de salón de tres metros no cuestan ni parecido, y por eso lo preguntamos. Si tienes de los dos tipos, marca la de en medio.', ops:[
          { v:'pequenos', t:'Ventanas normales',  d:'Como mucho, metro y medio de ancho', masUd:-180 },
          { v:'medios',   t:'De todo un poco',     d:'Ventanas normales y algún ventanal', masUd:0 },
          { v:'grandes',  t:'Ventanales grandes', d:'De los que se abren corriéndolos, y puertas de terraza', masUd:420 }
        ]},
        { id:'apertura', junto:true, titulo:'¿Cómo quieres que se abran?', ayuda:'', ops:[
          { v:'practicable',    t:'Como una puerta, hacia dentro',      d:'Lo más común', masUd:0 },
          { v:'oscilobatiente', t:'Hacia dentro y además inclinándose por arriba',   d:'Para ventilar sin abrirla del todo, aunque llueva', masUd:70 },
          { v:'corredera',      t:'Corriéndolas de lado',        d:'No quitan sitio en la habitación al abrir', masUd:40 }
        ]},
        { id:'vidrio', titulo:'¿Qué cristal quieres?', ayuda:'El doble con cámara de aire es el que se pone hoy en cualquier casa y va de sobra. El triple solo compensa si la ventana da a una calle muy ruidosa o muy fría.', ops:[
          { v:'doble',     t:'Doble, con cámara de aire',   d:'Lo normal, y suficiente', masUd:0 },
          { v:'seguridad', t:'Doble y además antirrobo', d:'Lleva una lámina que no deja romperlo. Para planta baja o casa aislada', masUd:95 },
          { v:'triple',    t:'Triple',             d:'Lo que más aísla del frío y del ruido', masUd:130 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'persianas',   t:'Persianas nuevas',            d:'Con su caja de arriba. El precio es por cada ventana', masUd:245 },
          { v:'motor',       t:'Que las persianas suban con mando',       d:'Sin cinta que tirar. Por cada ventana', masUd:190 },
          { v:'mosquiteras', t:'Mosquiteras',                 d:'De las que se enrollan. Por cada ventana', masUd:65 },
          { v:'rejas',       t:'Quitar las rejas y arreglar la pared',      d:'Por cada ventana', masUd:85 },
          { v:'interior',    t:'Puertas nuevas por dentro de la casa',  d:'Todas las de las habitaciones', mas:2060 },
          { v:'blindada',    t:'Puerta de entrada blindada',  d:'Con cerradura de seguridad', mas:1750 }
        ]}
      ]
    },

    fachada: {
      nombre:'Fachada o cubierta', icono:'fachada', iva:10, vivienda:true,
      /* Ni `acceso` ni `hab`: aquí se trabaja desde fuera. La altura ya se
         pregunta con el andamio y la ocupación de la acera con «¿da a la
         calle?»; preguntar por el ascensor sería absurdo, y que la casa esté
         habitada apenas cambia una obra de fachada. */
      sit:{ conserva:true, acceso:false, hab:false },
      unidad:'m²', pregMedida:'¿Cuántos metros cuadrados tiene la fachada?',
      ayudaMedida:'Multiplica lo que mide de ancho por lo que mide de alto. Una fachada de 10 metros de ancho y 9 de alto son 90 m². Si hay varias paredes, súmalas.',
      min:20, max:1500, ini:150, paso:10,
      gamaAyuda:'Aquí eliges la calidad del material que va por fuera y cuánto va a durar sin volver a tocarlo.',
      gama:{
        esencial:{ t:'Sencillo', d:'Material correcto y colores de carta. Bien puesto, aguanta muchos años.' },
        media:   { t:'El más pedido', d:'Material con más resistencia al agua y a la suciedad, y colores a elegir libres.' },
        alta:    { t:'De diseño', d:'Acabados especiales, texturas y piezas decorativas. Máxima duración sin mantenimiento.' }
      },
      preguntas:[
        { id:'que', titulo:'¿Qué quieres hacer en la fachada?', ayuda:'', ops:[
          { v:'pintura',  t:'Arreglar las grietas y pintar',     d:'Lo más barato. Le da otra cara, pero no aísla más', factor:0.62 },
          { v:'monocapa', t:'Poner una capa nueva por fuera', d:'La capa de mortero de color que cubre el ladrillo, hecha de nuevo', factor:1.00 },
          { v:'sate',     t:'Forrar la fachada con aislante por fuera', d:'Se pegan planchas de aislante y se revisten. Es lo que más baja la factura de la calefacción', masUd:66 }
        ]},
        { id:'andamio', junto:true, titulo:'¿Cuántas plantas tiene el edificio?', ayuda:'A partir del primer piso hay que montar un andamio, y montarlo y alquilarlo cuesta dinero aparte del trabajo de la fachada.', ops:[
          { v:'baja',  t:'Solo planta baja', d:'Se llega con una escalera de mano', masUd:0 },
          { v:'media', t:'2 o 3 plantas', d:'Con andamio', masUd:21 },
          { v:'alta',  t:'4 plantas o más', d:'Con andamio grande y más medios de seguridad', masUd:34 }
        ]},
        { id:'picar', titulo:'¿La pared de fuera está firme o se cae a trozos?', ayuda:'Golpea la pared con los nudillos: si suena hueco, esa capa está despegada y no se puede revestir encima, porque se caería todo junto. Hay que quitarla hasta llegar al ladrillo.', ops:[
          { v:'no',      t:'Está firme',    d:'Se limpia y se trabaja encima', masUd:0 },
          { v:'parcial', t:'Se cae solo en algunas zonas',    d:'Se quita donde suena hueco o está abombado', masUd:11 },
          { v:'todo',    t:'Está mal en general',        d:'Se quita entera hasta el ladrillo y se retira el escombro', masUd:24 }
        ]},
        { id:'ornamentos', junto:true, titulo:'¿La fachada tiene adornos, salientes o balcones?', ayuda:'Todo lo que sobresale de la pared lisa hay que hacerlo a mano, pieza a pieza, y es lo que más tiempo lleva de una fachada.', ops:[
          { v:'no', t:'No, es lisa',      d:'Pared corrida, sin nada que sobresalga', masUd:0 },
          { v:'si', t:'Sí, tiene adornos o balcones', d:'Molduras, cornisas o balcones de piedra', masUd:18 }
        ]},
        { id:'via', titulo:'¿La fachada da a la calle?', ayuda:'Si el andamio se monta sobre la acera hay que pedir permiso al ayuntamiento, pagar una tasa por los días que ocupe y vallar y señalizar el paso de la gente.', ops:[
          { v:'patio', t:'No, da a un patio o a mi parcela', d:'Sin permisos del ayuntamiento', mas:0 },
          { v:'calle', t:'Sí, da a la calle',        d:'Con el permiso del ayuntamiento y el vallado', mas:640 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'cubierta',    t:'El tejado también',   d:'Tejado, capa contra el agua y canalones', masUd:87 },
          { v:'canalones',   t:'Canalones y bajantes',  d:'Los tubos que recogen el agua de lluvia, cambiados enteros', mas:1450 },
          { v:'balcones',    t:'Arreglar los balcones',      d:'Cuando se ven manchas de óxido o se cae el borde', mas:2300 },
          { v:'camara',      t:'Meter aislante por el hueco de la pared',  d:'Se hacen agujeros pequeños y se sopla el aislante dentro. Sin obra por dentro de casa', masUd:26 },
          { v:'cerrajeria',  t:'Pintar rejas y barandillas', d:'Se quita el óxido y se esmalta', mas:890 }
        ]}
      ]
    },

    local: {
      nombre:'Local comercial', icono:'local', iva:21, vivienda:false,
      /* `conserva` no: la primera pregunta del local ya es cómo está, y con
         más precisión. El acceso sí importa, pero contado como un local, no
         como un piso. */
      sit:{ conserva:false, acceso:'calle', hab:false },
      unidad:'m²', pregMedida:'¿Cuántos metros tiene el local?',
      ayudaMedida:'Los metros que se pisan dentro del local.',
      min:20, max:800, ini:100, paso:5,
      gamaAyuda:'Aquí eliges la calidad de los materiales que se ven: el suelo, las paredes y la iluminación.',
      gama:{
        esencial:{ t:'Sencillo', d:'Suelo de 10 a 14 € el metro, paredes pintadas y luz funcional. Para abrir y trabajar.' },
        media:   { t:'El más pedido', d:'Suelo de 15 a 22 € el metro, algún revestimiento de pared y luz bien repartida.' },
        alta:    { t:'De diseño', d:'Suelo de 25 € el metro para arriba, materiales vistos y una iluminación pensada para el negocio.' }
      },
      preguntas:[
        { id:'estado', titulo:'¿Cómo está el local ahora mismo?', ayuda:'', ops:[
          { v:'montado', t:'Está montado, solo hay que actualizarlo', d:'Ya tiene luz, agua, suelo y techo', factor:0.78 },
          { v:'bruto',   t:'Está vacío, sin nada',              d:'Cuatro paredes y el suelo de hormigón', factor:1.00 },
          { v:'vaciar',  t:'Está lleno de lo del negocio anterior',      d:'Primero hay que tirarlo todo y sacarlo', factor:1.13 }
        ]},
        { id:'actividad', junto:true, titulo:'¿Qué vas a poner en el local?', ayuda:'Un bar y una clínica tienen que cumplir cosas que una tienda no: extracción de humos, aseos con unas medidas concretas, materiales lavables. Eso es dinero y no se puede saltar.', ops:[
          { v:'comercio',  t:'Tienda u oficina', d:'Sin exigencias especiales', factor:1.00 },
          { v:'hosteleria',t:'Bar o restaurante',  d:'Cocina, salida de humos y aseos', factor:1.34 },
          { v:'sanitario', t:'Clínica o centro de salud',   d:'Materiales y medidas que exige Sanidad', factor:1.22 }
        ]},
        { id:'aseos', titulo:'¿El local ya tiene aseos?', ayuda:'En cualquier local donde entre gente hace falta al menos un aseo para personas con silla de ruedas, y eso obliga a llevar el agua y el desagüe hasta ese punto, que casi nunca está donde uno quiere.', ops:[
          { v:'si',        t:'Sí, y están bien',         d:'Solo hay que ponerlos al día', mas:0 },
          { v:'no_uno',    t:'No, hay que hacer uno', d:'Llevando el agua y el desagüe hasta allí', mas:4300 },
          { v:'adaptado',  t:'Hay que hacerlo para silla de ruedas', d:'Con las medidas y las barras que pide la ley', mas:5720 }
        ]},
        { id:'humos', junto:true, titulo:'¿Hace falta sacar humos fuera?', ayuda:'Si vas a cocinar, el tubo tiene que subir por fuera del edificio hasta pasar el tejado. Eso hay que hablarlo con la comunidad de vecinos antes de firmar el alquiler, porque pueden negarse.', ops:[
          { v:'no', t:'No hace falta',   d:'No se cocina', mas:0 },
          { v:'si', t:'Sí, hasta el tejado', d:'Tubo, extractor y el remate de arriba', mas:3800 }
        ]},
        { id:'techo', titulo:'¿Qué techo quieres?', ayuda:'', ops:[
          { v:'visto',       t:'Sin techo, con los tubos a la vista',      d:'Estilo industrial. Se pintan y se dejan vistos', masUd:0 },
          { v:'registrable', t:'De placas que se levantan',        d:'Se quita una placa y llegas a los cables. Fácil de arreglar', masUd:34 },
          { v:'pladur',      t:'Liso y pintado',    d:'Techo continuo de placa de yeso. El más limpio de ver', masUd:46 }
        ]},
        { id:'suelo', junto:true, titulo:'¿Y el suelo?', ayuda:'', ops:[
          { v:'sirve', t:'El que hay vale', d:'Se limpia y se remata', masUd:0 },
          { v:'nuevo', t:'Suelo nuevo',  d:'Baldosa o suelo continuo sin juntas', masUd:52 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'escaparate', t:'Escaparate nuevo',     d:'Con la persiana de seguridad', mas:3920 },
          { v:'clima',      t:'Aire acondicionado y calefacción',        d:'Equipo y tubos por el techo', mas:6400 },
          { v:'licencia',   t:'Que os encarguéis de la licencia', d:'El proyecto del técnico y el papeleo del ayuntamiento', mas:2900 },
          { v:'rotulo',     t:'El rótulo de la fachada', d:'Con el permiso para colgarlo', mas:1400 },
          { v:'pci',        t:'Extintores y luces de emergencia', d:'Lo que exige el ayuntamiento para poder abrir', mas:1650 }
        ]}
      ]
    },

    obranueva: {
      nombre:'Obra nueva o ampliación', icono:'obranueva', iva:21, vivienda:false,
      /* Ninguna de las tres. En obra nueva no hay nada construido cuyo estado
         valorar, y preguntar por el ascensor o por si se vive allí durante la
         obra es de risa: se está construyendo. El acceso sí cuenta, pero es el
         de la parcela y se pregunta abajo, con el camión. */
      sit:{ conserva:false, acceso:false, hab:false },
      unidad:'m²', pregMedida:'¿Cuántos metros se van a construir?',
      ayudaMedida:'Los metros de todas las plantas sumados, midiendo por fuera de las paredes.',
      min:30, max:600, ini:140, paso:10,
      gamaAyuda:'Aquí eliges la calidad de los acabados: suelos, azulejos, cocina, baños, puertas y ventanas.',
      gama:{
        esencial:{ t:'Sencillo', d:'Suelo y azulejo de 10 a 14 € el metro, ventanas correctas y cocina de línea básica. Casa terminada y lista.' },
        media:   { t:'El más pedido', d:'Suelo y azulejo de 15 a 22 € el metro, mejores ventanas, armarios puestos y cocina completa.' },
        alta:    { t:'De diseño', d:'Suelo y azulejo de 25 € el metro para arriba, carpintería a medida y acabados de catálogo alto.' }
      },
      preguntas:[
        { id:'que', titulo:'¿Qué vas a construir?', ayuda:'', ops:[
          { v:'ampliacion', t:'Ampliar una casa que ya existe', d:'Añadir una habitación, una planta o un anexo', factor:1.08 },
          { v:'unifamiliar',t:'Una casa entera desde cero', d:'Sobre un solar vacío', factor:1.00 },
          { v:'nave',       t:'Una nave o un almacén', d:'Sin los acabados de una vivienda', factor:0.58 }
        ]},
        { id:'proyecto', junto:true, titulo:'¿Ya tienes los planos y el permiso del ayuntamiento?', ayuda:'Para construir hacen falta unos planos firmados por un arquitecto, un técnico que vigile la obra mientras se hace, y el permiso del ayuntamiento con sus tasas. Los tres son obligatorios y no son baratos.', ops:[
          { v:'si', t:'Sí, ya los tengo', d:'Solo hay que construir', mas:0 },
          { v:'no', t:'No, hay que hacerlo todo', d:'Planos, técnico que vigila y permiso', factor:1.13 }
        ]},
        /* La parcela es la partida que más presupuestos de obra nueva rompe:
           si no hay acometidas o hay que mover tierras, no está en los m². */
        { id:'parcela', titulo:'¿Cómo está el terreno?', ayuda:'Que el agua, la luz y el alcantarillado lleguen ya hasta la puerta del terreno cambia el presupuesto más que los metros que vayas a construir. Si no llegan, hay que traerlos desde donde estén.', ops:[
          { v:'urbana',   t:'Llano, y con agua, luz y alcantarillado en la puerta', d:'Solo hay que engancharse', mas:0 },
          { v:'sin_acometidas', t:'No llegan el agua, la luz o el alcantarillado',    d:'Hay que traerlos, o hacer pozo y fosa', mas:5400 },
          { v:'desnivel', t:'Está en cuesta',            d:'Hay que mover tierra y levantar muros que la sujeten', mas:8900 }
        ]},
        { id:'plantas', junto:true, titulo:'¿Cuántas plantas tendrá?', ayuda:'', ops:[
          { v:'una',    t:'Una, todo a ras de suelo',            d:'Sin escaleras', mas:0 },
          { v:'dos',    t:'Dos',            d:'Con escalera y el suelo de hormigón de la planta de arriba', mas:3200 },
          { v:'sotano', t:'Con sótano', d:'Hay que excavar, hacer los muros y sacar el agua del terreno', mas:18000 }
        ]},
        { id:'estructura', titulo:'¿Con qué se aguanta la casa?', ayuda:'Es el esqueleto: lo que sostiene los pisos y el tejado. Si no lo sabes, deja hormigón: es lo que lleva el 90 % de las casas que se construyen.', ops:[
          { v:'hormigon', t:'Hormigón', d:'Pilares y suelos de hormigón. Lo normal', factor:1.00 },
          { v:'metalica', t:'Hierro',        d:'Se monta más rápido', factor:0.97 },
          { v:'carga',    t:'Sin pilares, sobre las propias paredes',   d:'Paredes gruesas que aguantan el peso, como en las casas antiguas', factor:1.04 }
        ]},
        { id:'fachada_acabado', junto:true, titulo:'¿Cómo quieres que se vea la fachada por fuera?', ayuda:'', ops:[
          { v:'monocapa', t:'Con una capa de mortero de color',            d:'El acabado normal de casi todas las casas', masUd:0 },
          { v:'sate',     t:'Forrada de aislante por fuera', d:'Cuesta más al principio y se nota todos los meses en la factura', masUd:38 },
          { v:'piedra',   t:'Piedra o ladrillo a la vista', d:'No hay que volver a pintarla nunca, y se ve mejor', masUd:72 }
        ]},
        { id:'cubierta', titulo:'¿Qué tejado quieres?', ayuda:'', ops:[
          { v:'teja',  t:'Inclinado, con tejas', d:'El de toda la vida, y el que menos problemas da con el agua', masUd:0,
            si:function (e) { return e.que !== 'nave'; } },
          { v:'plana', t:'Plano, para poder subir',  d:'Una azotea que se puede usar de terraza', masUd:26,
            si:function (e) { return e.que !== 'nave'; } },
          /* una nave no se cubre con teja: va con panel sándwich */
          { v:'chapa', t:'De chapa con aislante dentro',     d:'Lo que se pone en las naves', masUd:0,
            si:function (e) { return e.que === 'nave'; } }
        ]},
        /* El acceso que importa en obra nueva no es el del portal: es si el
           camión de hormigón puede acercarse a la parcela. Sustituye a la
           pregunta general de acceso, que aquí no venía a cuento. */
        { id:'acceso_parcela', junto:true, titulo:'¿Puede llegar un camión hasta el terreno?', ayuda:'El hormigón viene en camión y se descarga directamente donde va. Si el camión no puede acercarse hay que bombearlo con una manguera y descargar el material lejos y acarrearlo, y eso son horas que se pagan.', ops:[
          { v:'si',    t:'Sí, sin problema',  d:'El camión llega hasta la obra', factor:1.00 },
          { v:'justo', t:'Se llega, pero con apuros',   d:'Camino estrecho o sin sitio para dar la vuelta', factor:1.05 },
          { v:'no',    t:'No, no llega',               d:'Hay que bombear y descargar lejos', factor:1.11 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'piscina',  t:'Piscina',                 d:'El vaso, la depuradora y el borde de piedra', mas:23210,
            si:function (e) { return e.que !== 'nave'; } },
          { v:'garaje',   t:'Garaje cerrado',          d:'Con puerta automática', mas:11800,
            si:function (e) { return e.que !== 'nave'; } },
          { v:'urbaniza', t:'Arreglar el terreno alrededor de la casa', d:'Entrada, vallado y jardín', mas:9600 },
          { v:'solar',    t:'Placas solares',          d:'Para gastar menos luz, con el papeleo hecho', mas:6800 },
          { v:'aerotermia', t:'Aerotermia',            d:'Un solo aparato que da frío, calor y agua caliente', mas:9800,
            si:function (e) { return e.que !== 'nave'; } },
          { v:'domotica', t:'Manejar la casa desde el móvil',                d:'Luces, persianas y temperatura', mas:3100,
            si:function (e) { return e.que !== 'nave'; } }
        ]}
      ]
    },

    exterior: {
      nombre:'Exteriores', icono:'exterior', iva:10, vivienda:true,
      /* `acceso` no: esta obra ya pregunta cómo entra el material, que es lo
         mismo y mejor planteado. `hab` tampoco: nadie se va de su casa porque
         le arreglen el patio, así que preguntarlo solo servía para cobrar un
         5 % que no se sostiene. */
      sit:{ conserva:true, acceso:false, hab:false },
      unidad:'m²', pregMedida:'¿Cuántos metros tiene la zona de fuera?',
      ayudaMedida:'Los metros cuadrados del patio, el jardín o la terraza donde se va a trabajar.',
      min:10, max:600, ini:70, paso:5,
      gamaAyuda:'Aquí eliges lo caro que es el material que se pisa y el que va en las paredes de fuera.',
      gama:{
        esencial:{ t:'Sencillo', d:'Baldosa de exterior de 10 a 14 € el metro, que no resbale al mojarse. Cumple y dura.' },
        media:   { t:'El más pedido', d:'Baldosa de 15 a 22 € el metro, imitación piedra o madera, que no se calienta tanto al sol.' },
        alta:    { t:'De diseño', d:'Piedra natural o baldosa de 25 € el metro para arriba, en piezas grandes.' }
      },
      preguntas:[
        { id:'que', multi:true, titulo:'¿Qué quieres hacer ahí fuera?', ayuda:'Marca todo lo que entre en la obra. Es la pregunta que más cambia el precio.', ops:[
          { v:'pavimento', t:'Poner suelo nuevo',    d:'Baldosa que no resbala al mojarse, o piedra', masUd:61 },
          { v:'cesped',    t:'Césped artificial',  d:'Sobre el suelo de hormigón que ya hay', masUd:35 },
          { v:'paredes',   t:'Revestir las paredes', d:'Una capa de mortero de color sobre el ladrillo', masUd:48 },
          { v:'porche',    t:'Un porche cubierto',    d:'Con su estructura, su tejado y su techo por debajo', mas:8320 },
          { v:'barbacoa',  t:'Barbacoa de obra',   d:'Con su chimenea', mas:3040 },
          { v:'barra',     t:'Una barra o cocina de exterior', d:'Con fregadero y encimera', mas:4100 },
          { v:'piscina',   t:'Piscina',            d:'El vaso, la depuradora y el borde de piedra', mas:23210 },
          { v:'riego',     t:'Riego automático y plantas', d:'Con programador y goteo', mas:1850 }
        ]},
        { id:'demoler', titulo:'¿Hay que quitar lo que hay ahora?', ayuda:'Romper el suelo viejo y sacarlo tiene su trabajo, sus escombros y lo que cobra el vertedero por quedárselos.', ops:[
          { v:'no',      t:'No, se aprovecha lo que hay', d:'Se trabaja sobre el suelo actual', masUd:0 },
          { v:'parcial', t:'Solo una parte',              d:'Se rompe por zonas', masUd:14 },
          { v:'todo',    t:'Sí, hay que dejarlo limpio',        d:'Se rompe todo y se retira', masUd:26 }
        ]},
        { id:'desnivel', junto:true, titulo:'¿El terreno está llano o hace cuesta?', ayuda:'Si hace cuesta hay que mover tierra para dejarlo plano, y si la caída es mucha hay que levantar un muro que sujete la tierra de arriba.', ops:[
          { v:'si',    t:'Está llano',   d:'No hay que mover tierra', mas:0 },
          { v:'poco',  t:'Tiene algo de caída', d:'Se arregla rellenando y dejando un escalón', mas:1450 },
          { v:'mucho', t:'Está en cuesta', d:'Muro que sujete la tierra y terrazas escalonadas', mas:4900 }
        ]},
        { id:'instalaciones', titulo:'¿Hay que llevar agua o luz hasta ahí fuera?', ayuda:'Si la toma más cercana está lejos, hay que abrir una zanja y meter el tubo por dentro.', ops:[
          { v:'no',    t:'No, ya llega', d:'Hay una toma cerca', mas:0 },
          { v:'cerca', t:'Sí, pero está cerca', d:'A menos de 10 metros', mas:780 },
          { v:'lejos', t:'Sí, y está lejos', d:'Hay que abrir zanja', mas:2150 }
        ]},
        { id:'drenaje', junto:true, titulo:'¿Hay por dónde se vaya el agua cuando llueve?', ayuda:'Sin un sumidero, el agua de lluvia se queda embalsada y acaba entrando en casa por debajo de la puerta. Es lo primero que hay que resolver en un patio, antes que el suelo bonito.', ops:[
          { v:'si', t:'Sí, ya lo hay',        d:'Lo conectamos a lo que hay', mas:0 },
          { v:'no', t:'No, o se encharca cuando llueve',  d:'Sumideros, dar caída al suelo y conectarlo', mas:860 }
        ]},
        /* ojo: el identificador NO puede ser `acceso`, que ya lo usa la
           pantalla de situación y se pisarían la respuesta el uno al otro */
        { id:'acceso_obra', titulo:'¿Por dónde se mete el material?', ayuda:'En un patio interior al que no llega ningún vehículo, cada saco de cemento y cada palé de baldosas entra a mano, uno a uno, por el pasillo de la casa. Eso multiplica las horas de la obra.', ops:[
          { v:'camion', t:'Llega un camión hasta ahí', d:'Se descarga en la propia obra', factor:1.00 },
          { v:'carro',  t:'Solo con carretilla', d:'Por un lateral o un pasillo ancho', factor:1.09 },
          { v:'mano',   t:'Todo a mano',     d:'Patio interior, sin ninguna entrada para vehículos', factor:1.18 }
        ]},
        { id:'extras', multi:true, titulo:'¿Quieres añadir algo más?', ayuda:'', ops:[
          { v:'iluminacion', t:'Luz por el jardín o el patio',   d:'Puntos de luz, farolillos y su cuadro', mas:980 },
          { v:'valla',       t:'Cerrar el terreno',  d:'Con un muro, una valla o una celosía', mas:2400 },
          { v:'toldo',       t:'Toldo o pérgola', d:'Con lamas que se giran para dar más o menos sombra', mas:3600 },
          { v:'ducha',       t:'Ducha de exterior',         d:'Con su toma de agua y su desagüe', mas:540 },
          { v:'mobiliario',  t:'Bancos o jardineras de obra', d:'Hechos a medida', mas:1250 },
          { v:'trastero',    t:'Una caseta o trastero',      d:'Para las herramientas y la depuradora', mas:2900 }
        ]}
      ]
    }
  };

  /* ------------------------------------------------- lo que se supone de serie
     EL VALOR POR DEFECTO DE CADA PREGUNTA DE DETALLE.

     El cotizador pregunta cinco cosas y da un precio. Todo lo demas —si hay
     banera que quitar, si la encimera es de cuarzo, si hay que levantar el
     suelo— se da por supuesto con lo mas frecuente en una obra de ese tipo en
     Merida, y el cliente lo puede cambiar luego en «Afinar el precio», donde
     estas respuestas aparecen ya marcadas.

     POR QUE ESTO EXISTE. `calcular` se salta las preguntas sin contestar, no
     las cobra. Sin esta tabla, quitar las preguntas de en medio no simplifica
     el cotizador: lo convierte en una maquina de cotizar por debajo de coste.
     Medido sobre el propio motor: un bano de 6 m2 pasaba de 9.000 a 7.800 €, y
     la cifra sin contestar caia en el 5 % mas bajo de todo lo que puede valer
     esa obra. Con esta tabla cae en el 50 %, que es donde tiene que caer una
     estimacion.

     COMO SE CORRIGE UN VALOR. Se cambia aqui la palabra y ya esta: es el mismo
     `v` que lleva la opcion dentro de OBRA. No hay que tocar nada mas. Si una
     suposicion depende de otra respuesta —la cubierta de una nave no es de
     teja— se escribe como funcion del estado, igual que los `si()` de arriba.

     Lo que queda deliberadamente VACIO son los «¿quieres anadir algo mas?»:
     marcar un extra de serie es cobrar de mas por algo que el cliente no ha
     pedido. Las excepciones son cuatro cosas que no son extras de verdad sino
     parte del trabajo —el rodapie de un suelo nuevo, el boletin de una
     instalacion, la proteccion contra incendios de un local y las puertas de
     una reforma integral—, y por eso si van marcadas. */
  const DEFECTO = {
    bano:        { estado:'banera', mover:'no', alicatado:'techo', techo:'si',
                   ventilacion:'ventana', puerta:'no', extras:[] },
    cocina:      { abrir:'no', electro:'no', encimera:'compacto', frente:'azulejo',
                   instalaciones:'completa', humos:'si', extras:[] },
    vivienda:    { banos:'1', cocina:'si', tabiques:'algo', instalaciones:'completa',
                   suelo:'todo', pintura:'gotele', ventanas:'todas', techos:'zonas',
                   extras:['puertas'] },
    parcial:     { estancias:['salon','dormitorio','pasillo'], instalaciones:'completa',
                   tabiques:'no', suelo:'si', pintura:'gotele', extras:[] },
    suelo:       { material:'porcelanico', levantar:'si', amueblada:'vacia',
                   escalera:'no', extras:['rodapie'] },
    pintura:     { gotele:'no', techos:'si', amueblada:'amueblada', altura:'normal', extras:[] },
    instalacion: { que:'ambas', alcance:'completa', tuberia:'cobre', potencia:'si',
                   calefaccion:'no', extras:['boletin'] },
    carpinteria: { material:'pvc', obra:'completa', tamano:'medios',
                   apertura:'practicable', vidrio:'doble', extras:[] },
    fachada:     { que:'monocapa', andamio:'media', picar:'parcial', ornamentos:'no',
                   via:'calle', extras:[] },
    local:       { estado:'bruto', actividad:'comercio', aseos:'adaptado', humos:'no',
                   techo:'registrable', suelo:'nuevo', extras:['pci'] },
    obranueva:   { que:'unifamiliar', proyecto:'no', parcela:'urbana', plantas:'una',
                   estructura:'hormigon', fachada_acabado:'monocapa',
                   /* una nave no lleva teja, y la opcion ni siquiera existe para
                      ella: su `si()` la descarta. Va detras de `que` a proposito,
                      porque se aplican en el orden en que estan escritas. */
                   cubierta: e => (e.que === 'nave' ? 'chapa' : 'teja'),
                   acceso_parcela:'si', extras:[] },
    exterior:    { que:['pavimento','paredes'], demoler:'todo', desnivel:'si',
                   instalaciones:'no', drenaje:'si', acceso_obra:'carro', extras:[] }
  };

  /* LAS QUE NO SE PUEDEN SUPONER. Medido una por una sobre el motor: estas son
     las preguntas cuyo fallo mueve mas de un tercio del presupuesto, asi que
     aunque su valor por defecto este bien elegido no se pueden esconder detras
     de un boton opcional. Se preguntan siempre, en una sola pantalla, antes de
     dar el precio.

     Los casos: la calefaccion de una instalacion vale ella sola mas que el
     resto de la obra junta (la aerotermia son 9.800 €); «que hay que hacer» en
     una fachada, en una obra nueva y en unos exteriores decide de que obra
     estamos hablando; el tamano de los huecos manda en la carpinteria; los
     electrodomesticos son el mayor salto de una cocina; y en la reforma
     parcial, que habitaciones entran ES el alcance. */
  const CLAVE = {
    cocina:      ['electro'],
    parcial:     ['estancias'],
    suelo:       ['amueblada'],
    instalacion: ['que', 'calefaccion'],
    carpinteria: ['tamano'],
    fachada:     ['que'],
    obranueva:   ['que'],
    exterior:    ['que', 'desnivel']
  };

  /* Textos por defecto de la pantalla de acabados. Cada obra puede sustituirlos
     por los suyos con `gama` y `gamaAyuda`, y lo hacen las doce: «gama media» no
     le dice nada a nadie, y lo que la gente entiende es cuánto cuesta el metro
     de baldosa. Los tramos —10-14, 15-22, 25 y más— son los que reproduce
     TARIFA.suelo y salen de la compra real de la empresa (18 €/m² de media). Si
     se cambia la escalera de TARIFA hay que cambiar estos textos: son el mismo
     número contado de dos maneras. */
  const NIVEL = {
    esencial:{ t:'Sencillo', d:'Material de 10 a 14 € el metro. Lo que hace falta, bien puesto y sin florituras.' },
    media:   { t:'El más pedido', d:'Material de 15 a 22 € el metro. Es lo que elige la mayoría.' },
    alta:    { t:'De diseño', d:'Material de 25 € el metro para arriba, en piezas grandes y con detalles cuidados.' }
  };

  /* ------------------------------------------------- análisis de texto libre
     Detector por palabras clave. No es un modelo de lenguaje: reconoce
     conceptos de obra escritos en castellano corriente y los suma al cálculo.
     Si se configura ENDPOINT_IA en web.js, además se envía el texto a ese
     servicio y se fusionan los resultados (ver LEEME.md §6). */
  /* `tipos` acota en qué obras se cobra ese concepto. Fuera de esa lista se
     reconoce y se enseña, pero NO se suma: un aire acondicionado no vale lo
     mismo dentro de una reforma integral que mencionado de pasada en un baño
     de 6 m². Lo que no se puede valorar así se traslada a la visita. */
  const VIV = ['vivienda','parcial'];

  /* ------------------------------------------------ leer entre las palabras
     Reconocer la palabra «humedades» no es entenderla. Estas tres funciones
     son las que sacan del texto lo que de verdad cambia el precio: en qué
     oración está dicho, con cuánta intensidad, y con qué números. */

  /* La oración donde aparece un concepto. Todo lo que matiza a una cosa
     —cuánta hay, si se conserva, cuántos metros son— está en su misma frase;
     mirar el texto entero mezcla unas obras con otras. */
  function oracionDe(texto, re) {
    const oraciones = String(texto || '').split(/[.;!?\n]+/);
    for (let i = 0; i < oraciones.length; i++) {
      if (re.test(oraciones[i])) return oraciones[i];
    }
    return '';
  }

  const MUCHO = /\b(much[oa]s|bastantes?|graves?|generalizad[oa]s?|por todas? part\w*|en toda\b|de arriba a ?bajo|toda la (casa|planta|vivienda|fachada|pared)|todas las paredes|serias?|importantes?|tremend\w*|un desastre|fatal)\b/i;
  const POCO  = /\b(alguna|algo de|un poco|leve|puntual\w*|peque[ñn]\w*|una mancha|manchita|solo en\b|[úu]nicamente|en una pared|localizad\w*|de vez en cuando)\b/i;

  /* leve | media | grave, a partir de cómo lo cuenta el cliente en su frase */
  function intensidad(texto, re) {
    const o = oracionDe(texto, re);
    if (!o) return 'media';
    if (MUCHO.test(o)) return 'grave';
    if (POCO.test(o))  return 'leve';
    return 'media';
  }

  /* Los números escritos con letra son tan frecuentes como los escritos con
     cifra: «tres baños» y «3 baños» tienen que valer lo mismo. */
  const LETRAS = { un:1, una:1, uno:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6,
                   siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12 };
  function aNumero(s) {
    if (s === undefined || s === null) return 0;
    const t = String(s).trim().toLowerCase().replace(',', '.');
    if (LETRAS[t] !== undefined) return LETRAS[t];
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }

  const CIFRA = '(\\d{1,4}(?:[.,]\\d{1,2})?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)';
  function buscaCantidad(texto, unidades) {
    const re = new RegExp(CIFRA + '\\s*(?:' + unidades + ')\\b', 'i');
    const m = re.exec(String(texto || ''));
    return m ? aNumero(m[1]) : 0;
  }

  /* Todo lo que el cliente ha cuantificado, en un solo objeto. Se calcula una
     vez por análisis y lo comparten todas las entradas del léxico. */
  function cifrasDe(texto) {
    return {
      m2:          buscaCantidad(texto, 'm2|m²|metros?\\s*cuadrados?|metros?|mts?\\.?'),
      ml:          buscaCantidad(texto, 'ml|metros?\\s*lineales?'),
      banos:       buscaCantidad(texto, 'ba[ñn]os?|aseos?'),
      ventanas:    buscaCantidad(texto, 'ventanas?|huecos?|balcones?|balconeras?'),
      puertas:     buscaCantidad(texto, 'puertas?'),
      habitaciones:buscaCantidad(texto, 'habitaciones?|dormitorios?|cuartos?'),
      plantas:     buscaCantidad(texto, 'plantas?|alturas?|pisos? de altura')
    };
  }

  /* -------------------------------------------------------------- humedades
     El único concepto del léxico que se calcula en vez de sumar una cifra
     fija. Devuelve el importe, la etiqueta que se le enseña al cliente y el
     aviso, que aquí no es opcional: la humedad es lo que más se equivoca
     valorando a distancia y decirlo forma parte de dar un precio honrado. */
  function valorarHumedad(ctx) {
    const t = ctx.texto, e = ctx.e, num = ctx.num, grado = ctx.grado;
    const frase = oracionDe(t, /\bhumedad|filtraci|moho|gotera|salitre|eflorescenc|capilarid|condensaci/i);

    /* qué es, no solo que la hay */
    const capilaridad = /\b(capilarid|ascendent|sube del suelo|desde el suelo|del suelo hacia|salitre|eflorescenc|z[óo]calo)\b/i.test(frase);
    const enterrado   = /\b(s[óo]tano|semis[óo]tano|muro enterrado|contra el terreno|garaje|bodega|contenci[óo]n)\b/i.test(frase) ||
                        /\b(s[óo]tano|semis[óo]tano)\b/i.test(t);
    const condensa    = /\b(condensaci[óo]n|moho|hongo|se empa[ñn]a|ventilaci[óo]n)\b/i.test(frase) && !capilaridad;
    const filtra      = /\b(filtraci|gotera|tejado|cubierta|terraza|lluvia|entra agua)\b/i.test(frase);

    /* superficie de PARAMENTO afectada. Si el cliente la ha dicho, manda él.
       Si no, se estima sobre los metros de la obra, y solo cuando la obra se
       mide en metros cuadrados: en una carpintería medida en huecos ese
       cálculo no significaría nada. */
    /* Los metros del paño casi nunca están en la misma frase que la palabra
       «humedad»: se dicen en la de al lado («…la pared está mojada. Son unos
       40 m2»). Así que si en su frase no aparecen, se buscan en cualquier otra
       que hable de pared, muro o paramento, que es la única de la que pueden
       ser. Lo que no se hace nunca es coger un número suelto del texto: los
       metros de la casa entera no son los metros de la humedad. */
    let dichos = buscaCantidad(frase, 'm2|m²|metros?\\s*cuadrados?');
    if (!dichos) {
      String(t || '').split(/[.;!?\n]+/).forEach(function (o) {
        if (dichos) return;
        if (!/\b(pared(es)?|paramento|muro|tabique|pa[ñn]o|afectad\w*|humed\w*)\b/i.test(o)) return;
        dichos = buscaCantidad(o, 'm2|m²|metros?\\s*cuadrados?');
      });
    }
    const o = OBRA[e.tipo];
    let m2 = dichos;
    if (!m2 && o && o.unidad === 'm²' && e.medida) {
      m2 = e.medida * (HUM_ALCANCE[grado] || HUM_ALCANCE.media);
      /* si dice «la planta baja» y la casa tiene varias, solo se cuenta esa */
      if (/\bplanta baja\b/i.test(frase) && (num.plantas > 1 || /\bdos plantas|dos alturas|d[úu]plex\b/i.test(t))) {
        m2 = m2 / 2;
      }
    }
    /* Mínimo de un paño de pared. Sin este suelo, una humedad mencionada en un
       baño de 6 m² se quedaba en medio metro cuadrado y salía a cero euros:
       reconocida y sin valorar, que es lo peor de los dos mundos. */
    m2 = Math.max(Math.round(m2 || 0), 6);

    let euros = 0;
    const partes = [];

    if (condensa && !capilaridad && !enterrado && !filtra) {
      /* condensación: no se pica, se ventila y se aísla. Cuesta bastante menos
         que un saneamiento y confundirlos es lo que hincha los presupuestos. */
      euros += m2 * HUMEDAD.saneado * 0.45;
      partes.push('condensación');
    } else {
      euros += m2 * HUMEDAD.saneado;
      partes.push('saneado de paramento');
    }
    if (capilaridad) {
      /* metros lineales de muro a inyectar: la altura de trabajo habitual es
         de unos 2,5 m, así que el paramento afectado se traduce a lineales */
      const ml = num.ml || Math.max(Math.round(m2 / 2.5), 4);
      euros += ml * HUMEDAD.inyeccion;
      partes.push('barrera contra la capilaridad');
    }
    if (enterrado) {
      euros += m2 * HUMEDAD.camara;
      partes.push('trasdosado ventilado');
    }

    const topado = euros > HUMEDAD.tope;
    if (topado) euros = HUMEDAD.tope;

    return {
      mas: Math.round(euros),
      c: 'humedades: ' + partes.join(' + ') + ' (≈ ' + m2 + ' m²)',
      aviso: topado
        ? 'Por lo que cuentas, la humedad no es una partida más de la obra: es el problema a resolver antes de lo demás. Lo que ves aquí es un mínimo. Hay que ver de dónde viene el agua antes de poner un número, y eso se hace en la visita.'
        : 'La humedad se valora viéndola: no cuesta lo mismo una filtración puntual que un muro que absorbe del terreno. En la visita medimos el paño afectado y comprobamos el origen antes de cerrar esta partida.'
    };
  }

  const LEXICO = [
    { c:'quitar la bañera',        re:/\b(quitar|sacar|cambiar|sustituir|eliminar)\b[^.]{0,30}\b(ba[ñn]era)\b|\bba[ñn]era\b[^.]{0,25}\b(por|a)\b[^.]{0,15}\bducha\b/i, mas:860, tipos:['bano'].concat(VIV) },
    { c:'plato de ducha',          re:/\bplato de ducha\b|\bducha de obra\b/i, mas:0 },
    { c:'mampara',                 re:/\bmampara\b/i, mas:0 },
    { c:'tirar un tabique',        re:/\b(tirar|quitar|derribar|abrir|eliminar)\b[^.]{0,25}\b(tabique|pared|muro)\b|\bunir\b[^.]{0,20}\b(sal[óo]n|cocina)\b/i, mas:2800, tipos:['cocina','local'].concat(VIV) },
    { c:'cocina abierta al salón', re:/\bcocina\b[^.]{0,25}\b(abierta|al sal[óo]n|americana)\b/i, mas:930, tipos:['cocina'].concat(VIV) },
    { c:'isla en la cocina',       re:/\bisla\b|\bpen[íi]nsula\b/i, mas:2180, tipos:['cocina'].concat(VIV) },
    { c:'electrodomésticos',       re:/\belectrodom[ée]sticos?\b|\b(horno|placa de inducci[óo]n|lavavajillas|campana)\b/i, mas:3900, tipos:['cocina'].concat(VIV) },
    { c:'encimera de cuarzo',      re:/\bencimera\b[^.]{0,25}\b(cuarzo|silestone|compacto|dekton|granito|m[áa]rmol)\b/i, mas:1350, tipos:['cocina'].concat(VIV) },
    { c:'aire acondicionado',      re:/\b(aire acondicionado|climatizaci[óo]n|split|conductos|aerotermia|bomba de calor)\b/i, mas:5010, tipos:['local','obranueva','instalacion'].concat(VIV) },
    { c:'calefacción',             re:/\b(calefacci[óo]n|radiadores?|caldera)\b/i, mas:4200, tipos:['local','instalacion'].concat(VIV) },
    { c:'suelo radiante',          re:/\bsuelo radiante\b/i, mas:1190, tipos:['bano','suelo'].concat(VIV) },
    { c:'cambiar el suelo',        re:/\b(cambiar|poner|nuevo|levantar|quitar)\b[^.]{0,25}\b(suelo|pavimento|solado|parquet|tarima|gres|porcel[áa]nico|baldosas?)\b/i, mas:0 },
    { c:'quitar el gotelé',        re:/\bgotel[ée]\b|\b(alisar|alisado)\b[^.]{0,20}\b(pared|paredes|techo)\b/i, mas:0 },
    { c:'pintura',                 re:/\bpintar\b|\bpintura\b/i, mas:0 },
    /* Pedir un verbo o un adjetivo evita que «el baño no tiene ventana» se lea
       como que quiere ventanas nuevas. La palabra suelta no basta. */
    { c:'ventanas nuevas',         re:/\b(cambiar|poner|sustituir|renovar|nuevas?)\b[^.]{0,25}\bventanas?\b|\bventanas?\b[^.]{0,22}\b(nuevas?|de pvc|de aluminio|de madera)\b|\bcarpinter[íi]a exterior\b|\bpvc\b|\boscilobatiente\b|\bclimalit\b/i, mas:0,
      aviso:'Las ventanas son una de las partes más caras. Dinos en la visita cuántas son y de qué tamaño, que es lo que decide el precio.' },
    { c:'puertas de paso',         re:/\bpuertas? (de paso|interiores?)\b/i, mas:2060, tipos:['carpinteria'].concat(VIV) },
    { c:'puerta blindada',         re:/\bpuerta\b[^.]{0,20}\b(blindada|acorazada|de seguridad)\b/i, mas:1750, tipos:['carpinteria','local'].concat(VIV) },
    { c:'persianas',               re:/\bpersianas?\b/i, mas:245, tipos:['carpinteria'].concat(VIV) },
    { c:'armarios empotrados',     re:/\barmarios?\b[^.]{0,20}\b(empotrados?|a medida)\b|\bvestidor\b/i, mas:3400, tipos:VIV },
    { c:'falso techo',             re:/\bfalso techo\b|\bpladur\b|\bescayola\b/i, mas:310, tipos:['bano','cocina','local'].concat(VIV) },
    { c:'focos y luces',           re:/\bfocos?\b|\bled\b|\bilumina/i, mas:0 },
    { c:'instalación eléctrica',   re:/\b(instalaci[óo]n )?el[ée]ctrica\b|\bcableado\b|\benchufes?\b|\bcuadro el[ée]ctrico\b|\bboletines?\b/i, mas:1060, tipos:['instalacion','local'].concat(VIV) },
    { c:'fontanería',              re:/\bfontaner[íi]a\b|\btuber[íi]as?\b|\bdesag[üu]es?\b|\bbajante\b/i, mas:0 },
    /* Único concepto que se calcula en vez de sumar una cifra fija: ver
       `valorarHumedad`. La expresión es ancha a propósito, porque el cliente
       casi nunca escribe «humedad»: escribe salitre, moho, o que se le levanta
       la pintura del zócalo. */
    { c:'humedades', calc: valorarHumedad,
      re:/\bhumedad(es)?\b|\bfiltraci[óo]n(es)?\b|\bmoho\b|\bhongos?\b|\bgoteras?\b|\bsalitre\b|\beflorescenc\w*\b|\bcapilarid\w*\b|\bcondensaci[óo]n\b|\bmanchas? de agua\b|\bse (levanta|desconcha|abomba)\b[^.]{0,25}\b(pintura|yeso|pared|z[óo]calo)\b|\bpared(es)? (mojad|h[úu]med)\w*/i },
    { c:'tuberías de plomo',       re:/\bplomo\b/i, mas:1240, tipos:['instalacion'].concat(VIV) },
    { c:'radiador toallero',       re:/\btoaller[oa]\b/i, mas:290, tipos:['bano'].concat(VIV) },
    { c:'salida de humos',         re:/\b(salida|extracci[óo]n|conducto)\b[^.]{0,12}\bde humos?\b|\bcampana extractora\b/i, mas:0 },
    { c:'mosquiteras',             re:/\bmosquiteras?\b/i, mas:0 },
    { c:'alicatado',               re:/\balicatad|\bazulejos?\b|\bhasta el techo\b/i, mas:0 },
    { c:'desnivel del terreno',    re:/\bmuro de contenci[óo]n\b|\bdesnivel\b|\ben (cuesta|pendiente)\b|\bmovimiento de tierras?\b/i, mas:0, aviso:'Un desnivel hay que verlo sobre el terreno: puede quedarse en un escalón o pedir un muro de contención.' },
    { c:'fachada',                 re:/\bfachada\b|\bmonocapa\b|\brevoco\b|\bsate\b/i, mas:0 },
    { c:'tejado o cubierta',       re:/\b(tejado|cubierta|teja|impermeabiliza)\b/i, mas:0 },
    { c:'andamio',                 re:/\bandamio\b/i, mas:0 },
    { c:'piscina',                 re:/\bpiscina\b/i, mas:23210, tipos:['exterior','obranueva'] },
    { c:'porche o pérgola',        re:/\bporche\b|\bp[ée]rgola\b|\bcenador\b|\bmarquesina\b/i, mas:8320, tipos:['exterior','obranueva'] },
    { c:'barbacoa',                re:/\bbarbacoa\b|\bhorno de le[ñn]a\b|\bchimenea exterior\b/i, mas:3040, tipos:['exterior'] },
    { c:'césped artificial',       re:/\bc[ée]sped\b/i, mas:0 },
    { c:'terraza o patio',         re:/\bterraza\b|\bpatio\b|\bjard[íi]n\b/i, mas:0 },
    { c:'garaje',                  re:/\bgaraje\b|\bcochera\b/i, mas:0 },
    { c:'trastero o buhardilla',   re:/\btrastero\b|\bbuhardilla\b|\b[áa]tico\b|\bs[óo]tano\b/i, mas:0 },
    { c:'ascensor',                re:/\bascensor\b/i, mas:0 },
    { c:'accesibilidad',           re:/\b(accesib|rampa|movilidad reducida|silla de ruedas)\b/i, mas:1900, tipos:['bano','local'].concat(VIV) },
    { c:'placas solares',          re:/\b(placas? solares?|fotovoltaic|autoconsumo)\b/i, mas:6800, tipos:['obranueva','local','instalacion'].concat(VIV) },
    { c:'obra urgente',            re:/\b(urgente|cuanto antes|con prisa|para ya|lo antes posible)\b/i, mas:0, aviso:'Dinos la fecha tope en la visita y te decimos si entra.' },
    { c:'hay que vaciarlo',        re:/\b(vaciar|desescombrar|est[áa] en ruina|en bruto)\b/i, mas:0 },
    { c:'edificio protegido',      re:/\b(protegid|catalogad|patrimonio|casco hist[óo]rico)\b/i, mas:0, aviso:'En edificio protegido hay que contar con la autorización de Patrimonio antes de empezar.' },
    { c:'amianto',                 re:/\bamianto\b|\buralita\b|\bfibrocemento\b/i, mas:0, aviso:'El amianto obliga a un plan de trabajo y a un gestor autorizado: hay que verlo en la visita.' },

    /* ======================================================================
       AMPLIACIÓN DEL LÉXICO

       Casi todas las entradas de aquí abajo van con `mas:0`. No es un olvido:
       reconocer un concepto y cobrarlo son dos cosas distintas. Un cliente que
       escribe «hay que sustituir dos viguetas» necesita ver que lo hemos
       leído; poner un número a eso sin haber visto el forjado sería inventar.
       Lo que hacen estas entradas es que el texto libre deje de ser un cajón
       ciego: se entiende, se enseña entendido, y lo que no se puede valorar a
       distancia va con su aviso a la visita. Ese es el trato.

       Cuando una obra de estas se cierre y haya precio real, se le pone su
       `mas` aquí y empieza a contar. Ver LEEME.md §5.
       ====================================================================== */

    /* ------------------------------------------------------- estructura */
    { c:'estructura',              re:/\b(vigas?|viguetas?|forjado|pilares?|cimentaci[óo]n|zapatas?|muro de carga|apeo|apuntala\w*|estructural)\b/i, mas:0,
      aviso:'Todo lo que toca la estructura sale del cotizador: hay que verlo, y casi siempre hace falta un técnico que lo calcule y lo firme. Va aparte del presupuesto de obra.' },
    { c:'grietas',                 re:/\bgrietas?\b|\bfisuras?\b|\bse ha abierto\b[^.]{0,20}\bpared\b/i, mas:0,
      aviso:'Una grieta puede ser de asiento y estar parada, o estar viva. No se valora por una foto: hay que verla y, si hace falta, ponerle testigos.' },
    { c:'carcoma o termitas',      re:/\bcarcoma\b|\btermitas?\b|\bxil[óo]fagos?\b|\bpolilla de la madera\b/i, mas:0,
      aviso:'El tratamiento de la madera lo hace una empresa autorizada y se cotiza aparte, según los metros de madera afectada.' },

    /* ---------------------------------------------------------- cubierta */
    { c:'retejar la cubierta',     re:/\bretejar\b|\bretejado\b|\bcambiar\b[^.]{0,20}\btejas?\b|\btejado nuevo\b|\bcubierta nueva\b/i, mas:0,
      aviso:'Retejar se mide en metros de faldón y depende de si la teja se recupera o se sustituye. Lo vemos en la visita.' },
    { c:'aislar la cubierta',      re:/\baislar\b[^.]{0,25}\b(cubierta|tejado|buhardilla|bajo cubierta)\b|\baislamiento\b[^.]{0,25}\b(cubierta|tejado)\b/i, mas:0 },
    { c:'canalones y bajantes',    re:/\bcanal[óo]n(es)?\b|\bbajantes? de pluviales\b|\bcanaleta\b/i, mas:0 },
    { c:'impermeabilizar',         re:/\bimpermeabiliza\w*\b|\btela asf[áa]ltica\b|\bl[áa]mina impermeable\b|\bpoliurea\b/i, mas:0,
      aviso:'La impermeabilización se mide sobre la superficie real y depende de si hay que levantar el pavimento de arriba.' },

    /* ------------------------------------------------------ obra gruesa */
    { c:'demolición y escombro',   re:/\bdemolici[óo]n\b|\bderribo\b|\bpicar\b|\bdesescombr\w*\b|\bcontenedor(es)?\b|\bescombros?\b/i, mas:0 },
    { c:'solera de hormigón',      re:/\bsolera\b|\bhormig[óo]n de limpieza\b|\bforjado sanitario\b|\bencachado\b/i, mas:0 },
    { c:'nivelar el suelo',        re:/\bnivelar\b[^.]{0,20}\bsuelo\b|\bautonivelante\b|\brecrecid\w*\b|\bel suelo est[áa] (desnivelado|hundido|torcido)\b/i, mas:0 },
    { c:'tabiquería nueva',        re:/\b(levantar|hacer|construir|cerrar)\b[^.]{0,25}\b(tabiques?|paredes?|habitaci[óo]n)\b|\btabiquer[íi]a\b/i, mas:0, tipos:['local','obranueva'].concat(VIV) },
    { c:'trasdosado y aislamiento',re:/\btrasdosad\w*\b|\baislar\b[^.]{0,20}\b(pared|paredes|muro)\b|\baislamiento (t[ée]rmico|ac[úu]stico)\b|\binsonoriza\w*\b|\bl[ai]na (de roca|mineral)\b/i, mas:0 },
    { c:'abrir un hueco',          re:/\babrir\b[^.]{0,25}\b(hueco|puerta|ventana|paso)\b|\bhacer\b[^.]{0,15}\bventana nueva\b/i, mas:0,
      aviso:'Abrir un hueco en un muro depende de si ese muro carga o no. Se comprueba en la visita antes de valorarlo.' },
    { c:'escalera',                re:/\bescaleras?\b|\bpelda[ñn]os?\b|\bbarandilla\b/i, mas:0 },

    /* ---------------------------------------------------- instalaciones */
    { c:'agua caliente',           re:/\btermo\b|\bcalentador\b|\bacumulador\b|\bagua caliente\b|\baerotermia\b/i, mas:0, tipos:['bano','cocina','instalacion','local'].concat(VIV) },
    { c:'gas',                     re:/\bgas (natural|ciudad|butano|propano)\b|\bcaldera de gas\b|\bacometida de gas\b|\bbombona\b/i, mas:0,
      aviso:'El gas solo lo puede firmar un instalador autorizado, y ese papel se paga aparte del trabajo.' },
    { c:'acometidas',              re:/\bacometidas?\b|\bdar de alta\b[^.]{0,20}\b(luz|agua|contador)\b|\bcontador(es)? (de la )?(luz|agua)\b|\balcantarillado\b|\bfosa s[ée]ptica\b|\bpozo\b/i, mas:0,
      aviso:'Enganchar el agua, la luz o el alcantarillado lo cobra la compañía, no nosotros. Te decimos cuáles hacen falta y lo que suelen costar.' },
    { c:'ventilación mecánica',    re:/\bventilaci[óo]n mec[áa]nica\b|\bvmc\b|\brecuperador de calor\b/i, mas:0 },
    { c:'domótica',                re:/\bdom[óo]tica\b|\bcasa inteligente\b|\bpersianas motorizadas\b|\bvideoportero\b|\bportero autom[áa]tico\b/i, mas:0 },
    { c:'alarma',                  re:/\balarma\b|\bc[áa]maras? de seguridad\b|\bvideovigilancia\b/i, mas:0 },
    { c:'cargador de coche',       re:/\bcargador\b[^.]{0,20}\b(coche|el[ée]ctrico|veh[íi]culo)\b|\bpunto de recarga\b|\bwallbox\b/i, mas:0, tipos:['instalacion','obranueva','local'].concat(VIV) },

    /* --------------------------------------------------------- acabados */
    { c:'microcemento',            re:/\bmicrocemento\b|\bcemento pulido\b|\bresina continua\b/i, mas:0 },
    { c:'papel pintado o friso',   re:/\bpapel pintado\b|\bfriso\b|\bmolduras?\b|\blamas? de madera\b|\bpanelad\w*\b/i, mas:0 },
    { c:'rodapié',                 re:/\brodapi[ée]s?\b|\bz[óo]calos? de madera\b/i, mas:0 },
    { c:'puertas correderas',      re:/\bcorreder[ao]s?\b|\bpuerta de bolsillo\b|\bcasoneto\b/i, mas:0, tipos:['carpinteria','local'].concat(VIV) },
    { c:'pintura exterior',        re:/\bpintar\b[^.]{0,25}\b(fachada|exterior|patio|muro)\b|\bpintura (exterior|de fachada)\b/i, mas:0 },
    { c:'lavadero o despensa',     re:/\blavadero\b|\bdespensa\b|\bofficce?\b|\bzona de lavado\b/i, mas:0 },
    { c:'vestidor',                re:/\bvestidor\b/i, mas:0, tipos:VIV },
    { c:'chimenea o estufa',       re:/\bchimenea\b|\bestufa\b|\bpellets?\b|\binserta?ble\b|\bhogar de le[ñn]a\b/i, mas:0,
      aviso:'Una chimenea o una estufa necesitan salida de humos por cubierta, y eso manda más en el precio que el aparato.' },

    /* -------------------------------------------------------- exteriores */
    { c:'pavimento exterior',      re:/\b(solar|pavimentar|poner suelo)\b[^.]{0,25}\b(patio|terraza|jard[íi]n|exterior|porche)\b|\bgres antideslizante\b|\bad[oa]qu[íi]n\b|\bpavimento exterior\b/i, mas:0 },
    { c:'vallado o cerramiento',   re:/\bvallado?\b|\bcerramiento\b|\bmuro de cerramiento\b|\bverja\b|\brejas?\b|\bport[óo]n\b|\bpuerta de garaje\b/i, mas:0 },
    { c:'toldo o cortina de cristal', re:/\btoldos?\b|\bcortinas? de cristal\b|\bcerramiento de terraza\b|\bacristalar\b/i, mas:0 },
    { c:'riego y jardín',          re:/\briego\b|\bjardiner[íi]a\b|\bplantaci[óo]n\b|\bseto\b/i, mas:0 },
    { c:'depuradora o climatización de piscina', re:/\bdepuradora\b|\bclimatizar\b[^.]{0,15}\bpiscina\b|\bcloraci[óo]n salina\b/i, mas:0, tipos:['exterior','obranueva'] },

    /* --------------------------------------------------- papeles y plazos */
    { c:'licencia y proyecto',     re:/\blicencia\b|\bproyecto\b|\barquitecto\b|\baparejador\b|\bdirecci[óo]n facultativa\b|\bvisado\b|\bpermiso de obra\b/i, mas:0,
      aviso:'La licencia y los honorarios del técnico se pagan al Ayuntamiento y al colegio profesional, no a la constructora. Te decimos cuáles hacen falta y lo que cuestan por aquí.' },
    { c:'ITE o informe del edificio', re:/\bite\b|\biee\b|\binforme de evaluaci[óo]n\b|\binspecci[óo]n t[ée]cnica\b/i, mas:0 },
    { c:'cédula de habitabilidad', re:/\bc[ée]dula\b|\bhabitabilidad\b|\bsegunda ocupaci[óo]n\b/i, mas:0 },
    { c:'subvenciones',            re:/\bsubvenci[óo]n(es)?\b|\bayudas?\b|\bnext generation\b|\bplan de vivienda\b|\brehabilitaci[óo]n energ[ée]tica\b/i, mas:0,
      aviso:'Hay ayudas del Plan Estatal de Vivienda para envolvente y eficiencia. Te decimos si tu obra encaja y qué papeles pide antes de empezar.' },
    { c:'la comunidad de vecinos', re:/\bcomunidad de (vecinos|propietarios)\b|\bjunta de vecinos\b|\bel presidente\b|\bderrama\b/i, mas:0 },
    { c:'obra por fases',          re:/\bpor fases\b|\bpoco a poco\b|\ba trozos\b|\ben dos veces\b|\bmientras vivimos\b/i, mas:0 },
    { c:'casa vacía',              re:/\b(vac[íi]a|sin muebles|deshabitada|no vive nadie|est[áa] cerrada)\b/i, mas:0 },
    { c:'casa antigua',            re:/\b(antigua|vieja|de los a[ñn]os|del siglo|de mis (padres|abuelos)|heredad\w*|sin reformar|nunca se ha tocado)\b|\b\d{2,3} a[ñn]os\b/i, mas:0 },
    { c:'alquilar o vender',       re:/\bpara alquilar\b|\bpara vender\b|\binversi[óo]n\b|\bpiso tur[íi]stico\b/i, mas:0 },
    { c:'presupuesto ajustado',    re:/\bpresupuesto (ajustado|limitado|corto)\b|\bno puedo pasar de\b|\bcomo m[áa]ximo\b|\bpoco dinero\b|\bl[íi]mite de\b/i, mas:0,
      aviso:'Si tienes un tope, dínoslo en la visita: preferimos ajustar el alcance de la obra contigo antes que entregarte un presupuesto que no te encaja.' }
  ];

  /* -------------------------------------------------------------- utilidades */
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const euros = n => new Intl.NumberFormat('es-ES', {
    style:'currency', currency:'EUR', maximumFractionDigits:0, useGrouping:'always'
  }).format(n);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------------------------------------------------------------- el motor */
  function Cotizador(caja, cfg) {
    this.caja = caja;
    this.cfg = cfg || {};
    this.estado = {};
    this.paso = 0;
    this.pasos = [];
    this.montar();
  }

  Cotizador.prototype.montar = function () {
    const c = this.caja;
    c.innerHTML =
      '<div class="cot__barra"><i></i></div>' +
      '<div class="cot__cabeza">' +
        '<span class="cot__etapa"></span>' +
        '<span class="cot__cuenta"></span>' +
      '</div>' +
      '<div class="cot__lienzo"></div>' +
      '<div class="cot__navegacion">' +
        '<button class="enlace-atras" type="button" hidden>&larr; Atrás</button>' +
        '<button class="btn" type="button" disabled>Siguiente</button>' +
      '</div>';

    this.elBarra  = $('.cot__barra i', c);
    this.elEtapa  = $('.cot__etapa', c);
    this.elCuenta = $('.cot__cuenta', c);
    this.elLienzo = $('.cot__lienzo', c);
    this.elAtras  = $('.enlace-atras', c);
    this.elSig    = $('.cot__navegacion .btn', c);

    const yo = this;
    this.elSig.addEventListener('click', function () { yo.avanzar(); });
    this.elAtras.addEventListener('click', function () { yo.retroceder(); });

    this.reiniciar();
  };

  Cotizador.prototype.reiniciar = function () {
    this.estado = { tipo:null, medida:null, nivel:null, hab:'no', acceso:'facil',
                    antiguedad:'mas2', conserva:'bien', cuando:'meses',
                    texto:'', detectado:[] };
    this.paso = 0;
    this.idCot = null;          // se crea al elegir el tipo de obra
    this.afinando = false;
    /* `datosListos` NO se limpia a propósito: quien calcula una segunda obra
       en la misma pestaña ya nos dio su teléfono, y volver a pedírselo es el
       momento exacto en que la gente cierra la ventana. */
    this.datosListos = this.datosListos || false;
    this.construirPasos();
    this.pintar();
  };

  /* ------------------------------------------- preguntas que vienen a cuento
     Una pregunta o una opción con `si(e)` solo existe si su condición se
     cumple con lo ya contestado. Lo demás desaparece de la pantalla, del
     cálculo y del mensaje de WhatsApp. */
  function cabe(x, e) { return !x.si || x.si(e); }

  /* Las preguntas de una pantalla que hoy tienen sentido. Puede quedar vacía:
     `avanzar` se salta esas pantallas. */
  Cotizador.prototype.vivas = function (lista) {
    const e = this.estado;
    return (lista || []).filter(function (pr) { return cabe(pr, e); });
  };
  Cotizador.prototype.pasoVivo = function (p) {
    /* La pantalla de datos desaparece en cuanto se ha pasado por ella —se
       dejaran o no—, para que nadie tenga que escribir su teléfono dos veces
       por calcular una segunda obra. Y no existe si no hay dónde guardar el
       dato: el precio no puede depender de que el panel esté vivo. */
    if (p.id === 'datos') return !this.datosListos && !!medidor();
    return !p.preguntas || this.vivas(p.preguntas).length > 0;
  };
  Cotizador.prototype.pasosVivos = function () {
    const yo = this;
    return this.pasos.filter(function (p) { return yo.pasoVivo(p); });
  };

  /* Si el cliente vuelve atrás y cambia de idea, una respuesta anterior puede
     quedarse huérfana: contestó «hay que subir la potencia» y luego dijo que
     la obra es solo de fontanería. Se borra antes de pintar, para que no siga
     sumando por detrás una pregunta que ya no se ve. */
  Cotizador.prototype.depurar = function () {
    const e = this.estado, o = OBRA[e.tipo];
    if (!o) return;
    o.preguntas.forEach(function (pr) {
      if (!cabe(pr, e)) { e[pr.id] = pr.multi ? [] : null; return; }
      if (pr.multi) {
        if (e[pr.id] == null) return;          // sin contestar: lo rellena `suponer`
        e[pr.id] = e[pr.id].filter(function (v) {
          const op = pr.ops.filter(function (x) { return x.v === v; })[0];
          return op && cabe(op, e);
        });
      } else if (e[pr.id]) {
        const op = pr.ops.filter(function (x) { return x.v === e[pr.id]; })[0];
        if (!op || !cabe(op, e)) e[pr.id] = null;
      }
    });
    /* y lo que acaba de quedarse vacío se vuelve a suponer */
    this.suponer();
  };

  /* Rellena con lo que se supone de serie (DEFECTO) todo lo que no esté
     contestado. Dos reglas, y las dos importan:

       · NUNCA pisa lo que el cliente ya eligió. Solo entra en lo vacío.
       · Solo pone opciones que vengan a cuento: si la opción supuesta tiene un
         `si()` que no se cumple con lo contestado, se deja en blanco. Suponer
         una ventana en un baño que acaba de decir que no la tiene sería peor
         que no suponer nada.

     Se llama al final de `depurar`, o sea antes de cada pintado, porque el
     cliente puede volver atrás y dejar huérfana una respuesta que entonces hay
     que volver a suponer. */
  Cotizador.prototype.suponer = function () {
    const e = this.estado, o = OBRA[e.tipo], d = DEFECTO[e.tipo];
    if (!o || !d) return;
    o.preguntas.forEach(function (pr) {
      if (!(pr.id in d) || !cabe(pr, e)) return;
      /* Solo lo que nadie ha tocado. Una lista vacía ya es una respuesta
         —«ninguna de estas»— y volver a rellenarla haría imposible desmarcar. */
      if (e[pr.id] !== undefined && e[pr.id] !== null) return;
      const vale = function (x) {
        const op = pr.ops.filter(function (q) { return q.v === x; })[0];
        return !!op && cabe(op, e);
      };
      const v = typeof d[pr.id] === 'function' ? d[pr.id](e) : d[pr.id];
      if (Array.isArray(v)) e[pr.id] = v.filter(vale);
      else if (v && vale(v)) e[pr.id] = v;
    });
  };

  /* La lista de pantallas se rehace cada vez que cambia el tipo de obra: por
     eso el cuestionario es distinto para un baño que para unos exteriores. */
  Cotizador.prototype.construirPasos = function () {
    const p = [{ id:'tipo', etapa:'Tu obra' }];
    const o = OBRA[this.estado.tipo];
    if (o) {
      const clave = CLAVE[this.estado.tipo] || [];
      const esClave = function (pr) { return clave.indexOf(pr.id) >= 0; };

      p.push({ id:'medida', etapa:'Tamaño' });

      /* Las que no se pueden suponer, todas juntas en una pantalla. La mayoría
         de las obras no tienen ninguna y se saltan esta pantalla entera. */
      const claves = o.preguntas.filter(esClave);
      if (claves.length) p.push({ id:'clave', etapa:'Lo que más manda', preguntas:claves });

      p.push({ id:'nivel',     etapa:'Acabados' });
      p.push({ id:'situacion', etapa:'Situación' });

      /* EL DETALLE SOLO EXISTE SI LO PIDEN. Antes se preguntaba siempre y eran
         diez pantallas: la mayoría de la gente no llegaba al final. Ahora el
         resto de preguntas se suponen (ver DEFECTO) y solo aparecen si el
         cliente pulsa «Afinar el precio» en el resultado.

         `junto:true` sigue valiendo aquí dentro: engancha la pregunta a la
         pantalla anterior, pero solo si esa pantalla es también de detalle. */
      if (this.afinando) {
        o.preguntas.forEach(function (pr) {
          if (esClave(pr)) return;
          const ultimo = p[p.length - 1];
          if (pr.junto && ultimo && ultimo.preguntas && ultimo.id.slice(0, 2) === 'p:') {
            ultimo.preguntas.push(pr); return;
          }
          p.push({ id:'p:' + pr.id, etapa:'Tu obra al detalle', preguntas:[pr] });
        });
        /* «Cuéntanos» vuelve solo para quien afina. En el recorrido corto su
           sitio es la casilla pequeña de la pantalla de datos; aquí, con la
           pantalla entera, se recupera el detector que va marcando en vivo lo
           que entiende de lo que el cliente escribe. */
        p.push({ id:'texto', etapa:'Cuéntanos' });
      }

      p.push({ id:'datos',     etapa:'Tus datos' });
      p.push({ id:'resultado', etapa:'Tu precio' });
    }
    this.pasos = p;
  };

  Cotizador.prototype.pasoActual = function () { return this.pasos[this.paso]; };

  Cotizador.prototype.valido = function () {
    const p = this.pasoActual(), e = this.estado;
    if (!p) return false;
    switch (p.id) {
      case 'tipo':   return !!e.tipo;
      case 'medida': return e.medida > 0;
      case 'nivel':  return !!e.nivel;
      case 'situacion':
      case 'texto':
      case 'resultado': return true;
      /* LA PUERTA. Esconder el botón de «Siguiente» no cierra nada: `avanzar()`
         se llama también desde el avance automático, y con la pantalla dada por
         válida se colaba de largo y el precio salía sin haber dejado los datos.
         Comprobado: pasaba. Aquí se cierra donde no hay forma de rodearla. */
      case 'datos': return !!this.datosListos;
      default:
        if (p.preguntas) {
          /* una pantalla vale cuando están contestadas todas sus preguntas de
             respuesta única; las de marcar varias se pueden dejar en blanco, y
             las que no vienen a cuento no se miran */
          return this.vivas(p.preguntas).every(function (pr) {
            if (pr.multi) return true;
            return e[pr.id] !== undefined && e[pr.id] !== null;
          });
        }
        return true;
    }
  };

  Cotizador.prototype.avanzar = function () {
    if (!this.valido()) return;
    let i = this.paso;
    /* se salta las pantallas que se han quedado sin ninguna pregunta que
       tenga sentido con lo contestado hasta aquí */
    while (i < this.pasos.length - 1) {
      i++;
      if (this.pasoVivo(this.pasos[i])) { this.paso = i; this.pintar(); this.alaVista(); return; }
    }
  };
  Cotizador.prototype.retroceder = function () {
    let i = this.paso;
    while (i > 0) {
      i--;
      if (this.pasoVivo(this.pasos[i])) { this.paso = i; this.pintar(); this.alaVista(); return; }
    }
  };
  /* Saltar a una pantalla por su nombre. Hace falta desde que el recorrido
     cambia de forma a mitad —la pantalla de datos desaparece al pasarla y las
     de detalle aparecen al afinar—, así que el número del paso ya no es un
     sitio fiable al que volver. */
  Cotizador.prototype.irA = function (id) {
    const i = this.pasos.map(function (p) { return p.id; }).indexOf(id);
    if (i < 0) return;
    this.paso = i;
    this.pintar();
    this.alaVista();
  };

  Cotizador.prototype.alaVista = function () {
    const y = this.caja.getBoundingClientRect().top + window.scrollY - 100;
    if (window.scrollY > y + 40 || this.pasoActual().id === 'resultado') {
      window.scrollTo({ top:y, behavior:'smooth' });
    }
  };

  /* ------------------------------------------------------------- el cálculo */
  Cotizador.prototype.calcular = function () {
    const e = this.estado, o = OBRA[e.tipo];
    if (!o || !e.nivel || !e.medida) return 0;

    const t = TARIFA[e.tipo][e.nivel];
    let precio  = t[0] + t[1] * e.medida;
    let factor  = 1;
    let extras  = 0;

    /* respuestas propias del tipo de obra. Lo que no viene a cuento no suma,
       aunque haya quedado contestado de un camino anterior. */
    o.preguntas.forEach(function (pr) {
      const val = e[pr.id];
      if (val === undefined || val === null) return;
      if (!cabe(pr, e)) return;
      const marcadas = pr.multi ? (val || []) : [val];
      marcadas.forEach(function (v) {
        const op = pr.ops.filter(function (x) { return x.v === v; })[0];
        if (!op || !cabe(op, e)) return;
        if (op.factor) factor *= op.factor;
        if (op.mas)    extras += op.mas;
        if (op.masUd)  extras += op.masUd * e.medida;
      });
    });

    /* situación general: solo los factores que esta obra llega a preguntar.
       Los demás se quedan en 1, que es lo mismo que valían con la respuesta
       neutra, así que quitar la pregunta no mueve ningún precio. */
    const s = o.sit || {};
    if (s.hab)      factor *= (F_HABITADA[e.hab]    || 1);
    if (s.acceso)   factor *= (F_ACCESO[e.acceso]   || 1);
    if (s.conserva) factor *= (F_ESTADO[e.conserva] || 1);

    /* lo detectado en el texto libre, sin duplicar lo ya preguntado */
    e.detectado.forEach(function (d) { if (d.mas) extras += d.mas; });

    const total = precio * factor + extras;
    return Math.max(Math.ceil(total / 100) * 100, 900);
  };

  Cotizador.prototype.ivaAplicable = function () {
    const o = OBRA[this.estado.tipo];
    if (!o) return 21;
    if (!o.vivienda) return 21;
    return this.estado.antiguedad === 'mas2' ? 10 : 21;
  };

  /* Palabras que indican que algo se CONSERVA o NO entra en obra. Sin esto,
     «tengo una piscina vieja que quiero conservar» se cobraría como una
     piscina nueva. Se mira una ventana de texto alrededor de la coincidencia. */
  /* Sin `\w*` estas raíces no casarían: `\bconserv\b` no encuentra «conservar»,
     porque entre la v y la a no hay frontera de palabra. */
  const NEGACION = /\b(conserv\w*|mantien\w*|manten\w*|se qued\w*|ya (tengo|tiene|está|esta|hay)|existente|no (quiero|quiere|hace falta|se toca|se cambia|hay que|entra)|sin tocar|respet\w*|dejar como está|tal (y )?como está)/i;

  /* La negación solo cuenta dentro de la MISMA oración. Con una ventana de
     caracteres, «…piscina que quiero conservar. Quiero un porche» marcaría
     también el porche como conservado, que es justo lo contrario. */
  function estaNegado(texto, re) {
    const o = oracionDe(texto, re);
    return o ? NEGACION.test(o) : false;
  }

  /* ----------------------------------------------- análisis del texto libre */
  Cotizador.prototype.analizar = function (texto) {
    const e = this.estado;
    e.texto = texto;
    const yaPreguntado = {};
    /* Además de las etiquetas sueltas se guarda todo lo ya marcado como un
       texto corrido. Contra él se prueban las mismas expresiones del léxico:
       si «Caldera y radiadores» ya está elegido, escribir «quiero calefacción»
       no vuelve a sumarla. Se unen con « | » y no con un punto, porque las
       expresiones del léxico no cruzan el final de una oración. */
    let yaMarcado = '';
    const o = OBRA[e.tipo];
    if (o) o.preguntas.forEach(function (pr) {
      if (!cabe(pr, e)) return;
      const val = e[pr.id];
      const marcadas = pr.multi ? (val || []) : (val ? [val] : []);
      marcadas.forEach(function (v) {
        const op = pr.ops.filter(function (x) { return x.v === v; })[0];
        if (op && cabe(op, e) && (op.mas || op.masUd)) {
          yaPreguntado[op.t.toLowerCase()] = true;
          yaMarcado += op.t + ' | ' + (op.d || '') + ' | ';
        }
      });
    });

    const encontrados = [];
    /* Los números del texto se sacan una sola vez y los comparten todas las
       entradas: da igual en qué frase estén escritos, «tres baños» sirve tanto
       para valorar los baños como para saber que la casa es grande. */
    const num = cifrasDe(texto || '');
    e.cifras = num;
    if (texto && texto.trim().length > 3) {
      LEXICO.forEach(function (l) {
        if (!l.re.test(texto)) return;

        /* si el concepto ya se cobró en una pregunta, se reconoce pero no se
           suma. Se comprueba de dos maneras porque ninguna las pilla todas:
           por coincidencia de palabras y volviendo a aplicar la expresión
           sobre lo ya marcado. */
        /* La comparación por palabras exige raíces de cinco letras para arriba.
           Sin ese mínimo, cualquier opción que se llame «No» daba por incluida
           la entrada «subvencioNes», y «casa» la marcaba media web: las
           palabras cortas del castellano están dentro de casi todo. */
        const raiz = l.c.split(' ')[0].toLowerCase();
        const claves = Object.keys(yaPreguntado);
        const duplicado =
          (raiz.length >= 5 && claves.some(function (k) { return k.indexOf(raiz) !== -1; })) ||
          claves.some(function (k) {
            const primera = k.split(' ')[0];
            return primera.length >= 5 && l.c.indexOf(primera) !== -1;
          }) ||
          (!!yaMarcado && l.re.test(yaMarcado));
        /* si el concepto no encaja con el tipo de obra elegido, se reconoce
           pero se manda a la visita en vez de meterlo en el precio */
        const encaja = !l.tipos || l.tipos.indexOf(e.tipo) !== -1;
        /* «la piscina que ya tengo» no es una piscina que haya que construir */
        const negado = estaNegado(texto, l.re);
        const fuera = !!l.mas && !encaja && !negado;

        /* Conceptos que se calculan en vez de sumar una cifra fija. Solo se
           molestan en calcular si van a contar: si está negado o ya se
           preguntó, el resultado se tiraría igualmente. */
        let base = l.c, importe = l.mas || 0, aviso = l.aviso;
        if (l.calc && !negado && !duplicado && encaja) {
          const r = l.calc({ texto: texto, e: e, num: num, grado: intensidad(texto, l.re) }) || {};
          if (r.c) base = r.c;
          importe = r.mas || 0;
          if (r.aviso) aviso = r.aviso;
        }

        let etiqueta = base;
        if (negado)         etiqueta += ' (se conserva)';
        else if (duplicado) etiqueta += ' (ya incluido)';

        encontrados.push({
          c: etiqueta,
          mas: (duplicado || !encaja || negado) ? 0 : importe,
          fuera: fuera,
          /* el aviso solo tiene sentido si el concepto no está ya resuelto:
             si lo marcó en una pregunta, avisarle de ello sobra */
          aviso: (negado || duplicado) ? null : aviso
        });
      });
    }
    e.detectado = encontrados;
    return encontrados;
  };

  /* ------------------------------------------------- análisis con IA (opcional)
     El detector de arriba funciona sin servidor y sin coste. Si además se
     configura ENDPOINT_IA en web.js —una función serverless que guarda la
     clave de la API y llama al modelo—, se le manda el texto y se fusiona lo
     que devuelva. Si falla o no está configurado, no pasa nada: se sigue
     con el detector local. La clave NUNCA va aquí: este archivo lo lee
     cualquiera que abra el código fuente de la página. Ver LEEME.md §6. */
  Cotizador.prototype.analizarConIA = function (texto, alTerminar) {
    const url = this.cfg.endpointIA;
    if (!url || !texto || texto.trim().length < 12) return;
    if (this.ultimoIA === texto) return;     // no repetir la misma consulta
    this.ultimoIA = texto;

    const yo = this, e = this.estado;
    const control = new AbortController();
    setTimeout(function () { control.abort(); }, 6000);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: texto, tipo: e.tipo, medida: e.medida, nivel: e.nivel }),
      signal: control.signal
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (datos) {
        if (!datos || !Array.isArray(datos.conceptos)) return;
        if (yo.estado.texto !== texto) return;          // el usuario ya escribió otra cosa
        const yaEstan = {};
        e.detectado.forEach(function (d) { yaEstan[d.c.split(' (')[0]] = true; });
        datos.conceptos.forEach(function (c) {
          if (!c || !c.c || yaEstan[c.c]) return;
          e.detectado.push({ c: c.c, mas: Number(c.mas) || 0, fuera: !!c.fuera, aviso: c.aviso || null });
        });
        if (alTerminar) alTerminar();
      })
      .catch(function () { /* sin conexión o endpoint caído: se queda el análisis local */ });
  };

  /* ---------------------------------------------------------------- pintado */
  /* barra de avance, etapa y contador: se refrescan solos y también al elegir
     el tipo de obra, porque el número de pasos depende de él */
  /* El contador cuenta solo las pantallas que se van a ver: si una obra se
     salta alguna pregunta, el cliente no puede leer «paso 7 de 11» y llegar al
     final en el 10. */
  Cotizador.prototype.cabeza = function () {
    const p = this.pasoActual(), e = this.estado;
    const vivos = this.pasosVivos();
    const i = Math.max(vivos.indexOf(p), 0);
    const total = Math.max(vivos.length, 2);
    this.elBarra.style.width = (i / (total - 1) * 100) + '%';
    this.elEtapa.textContent = p.etapa;
    this.elCuenta.textContent = e.tipo
      ? 'Paso ' + (i + 1) + ' de ' + vivos.length
      : 'Cuatro o cinco preguntas';
  };

  Cotizador.prototype.pintar = function () {
    /* Al cambiar de pantalla muere cualquier avance automático pendiente de la
       anterior. Si no, salta encima de la pantalla nueva. */
    clearTimeout(this.temporizadorAvance);
    this.depurar();
    const p = this.pasoActual(), e = this.estado, yo = this;

    this.cabeza();
    const vivos = this.pasosVivos();
    this.elAtras.hidden = this.paso === 0;
    this.elSig.classList.toggle('oculto', p.id === 'resultado' || p.id === 'datos');
    this.elSig.disabled = !this.valido();
    const sig = vivos[vivos.indexOf(p) + 1];
    this.elSig.textContent = (sig && (sig.id === 'datos' || sig.id === 'resultado'))
      ? 'Ver mi precio' : 'Siguiente';

    let html = '';
    switch (p.id) {
      case 'tipo':      html = this.vistaTipo(); break;
      case 'medida':    html = this.vistaMedida(); break;
      case 'nivel':     html = this.vistaNivel(); break;
      case 'situacion': html = this.vistaSituacion(); break;
      case 'texto':     html = this.vistaTexto(); break;
      case 'datos':     html = this.vistaDatos(); break;
      case 'resultado': html = this.vistaResultado(); break;
      default:          html = this.vistaPreguntas(this.vivas(p.preguntas)); break;
    }
    this.elLienzo.innerHTML = '<div class="cot__pantalla activa">' + html + '</div>';
    this.enlazar(p);

    /* se le cuenta al panel por dónde va. En el resultado se manda además el
       precio: hasta que no lo ve, no hay precio que contar. */
    const m = medidor();
    if (m && this.idCot) {
      if (p.id === 'resultado') {
        const precio = this.calcular();
        m.ev('cot_precio', OBRA[e.tipo].nombre, precio);
        this.avisar({ completa: 1, precio: precio, iva: this.ivaAplicable() });
      } else {
        m.ev('cot_paso', p.etapa);
        this.avisar();
      }
    }
  };

  Cotizador.prototype.vistaTipo = function () {
    const e = this.estado;
    let h = '<p class="cot__pregunta">¿Qué obra quieres hacer?</p>' +
            '<p class="cot__ayuda">Si tu obra combina varias, elige la principal. Al final podrás detallarnos el resto.</p>' +
            '<div class="opciones" data-grupo="tipo">';
    Object.keys(OBRA).forEach(function (k) {
      const o = OBRA[k];
      h += '<button class="opcion' + (e.tipo === k ? ' sel' : '') + '" type="button" data-valor="' + k + '">' +
             '<svg viewBox="0 0 48 48" aria-hidden="true">' + IC[o.icono] + '</svg>' +
             '<b>' + esc(o.nombre) + '</b>' +
           '</button>';
    });
    return h + '</div>';
  };

  Cotizador.prototype.vistaMedida = function () {
    const e = this.estado, o = OBRA[e.tipo];
    const v = e.medida || o.ini;
    return '<p class="cot__pregunta">' + esc(o.pregMedida) + '</p>' +
      '<p class="cot__ayuda">' + esc(o.ayudaMedida) + '</p>' +
      '<div class="medida">' +
        '<input type="range" id="cot-rango" min="' + o.min + '" max="' + o.max + '" step="' + o.paso + '" value="' + v + '" aria-label="' + esc(o.pregMedida) + '">' +
        '<div class="medida__valor"><span id="cot-lbl">' + v + '</span><small>' + o.unidad + '</small></div>' +
      '</div>' +
      '<div class="campo" style="margin-top:28px;max-width:280px">' +
        '<label for="cot-num">O escríbelo a mano</label>' +
        '<input class="medida__num" type="number" id="cot-num" min="1" max="5000" step="1" value="' + v + '" inputmode="numeric">' +
      '</div>';
  };

  /* Una pantalla puede llevar una pregunta o varias (ver `junto` arriba). */
  Cotizador.prototype.vistaPreguntas = function (lista) {
    const yo = this;
    const solaUna = lista.length === 1;
    return lista.map(function (pr) {
      return (solaUna ? '' : '<div class="cot__grupo">') + yo.unaPregunta(pr) + (solaUna ? '' : '</div>');
    }).join('');
  };

  Cotizador.prototype.unaPregunta = function (pr) {
    const val = this.estado[pr.id], e = this.estado;
    let h = '<p class="cot__pregunta">' + esc(pr.titulo) + '</p>';
    if (pr.ayuda) h += '<p class="cot__ayuda">' + esc(pr.ayuda) + '</p>';
    h += '<div class="opciones opciones--dos" data-grupo="' + esc(pr.id) + '" data-multi="' + (pr.multi ? '1' : '') + '">';
    pr.ops.filter(function (op) { return cabe(op, e); }).forEach(function (op) {
      const sel = pr.multi ? (val || []).indexOf(op.v) !== -1 : val === op.v;
      h += '<button class="opcion' + (sel ? ' sel' : '') + '" type="button" data-valor="' + esc(op.v) + '">' +
             '<b>' + esc(op.t) + '</b>' +
             (op.d ? '<small>' + esc(op.d) + '</small>' : '') +
           '</button>';
    });
    h += '</div>';
    if (pr.multi) h += '<p class="cot__ayuda" style="margin:16px 0 0">Puedes marcar varias, o ninguna.</p>';
    return h;
  };

  /* El rótulo del nivel elegido, para el resumen y para el WhatsApp. Tiene que
     salir de la misma tabla que la pantalla o el cliente leería en el resumen un
     nombre que no ha visto en ningún botón. */
  function nivelT(e) {
    const o = OBRA[e.tipo] || {};
    const n = (o.gama && o.gama[e.nivel]) || NIVEL[e.nivel];
    return n ? n.t : '';
  }

  /* Los textos de esta pantalla salen de la obra si los tiene (`gama`), y si no
     del NIVEL genérico. Se hizo así porque el mismo nivel compra cosas distintas
     según la obra: en un baño paga azulejo y sanitarios, en un cambio de suelo
     solo la baldosa, y en unas ventanas ni siquiera hay baldosa que valorar. */
  Cotizador.prototype.vistaNivel = function () {
    const e = this.estado, o = OBRA[e.tipo] || {};
    const tabla = o.gama || NIVEL;
    const ayuda = o.gamaAyuda ||
      'Aquí eliges lo caro que es el material. Es lo que más mueve el precio.';
    let h = '<p class="cot__pregunta">¿Con qué materiales lo quieres?</p>' +
            '<p class="cot__ayuda">' + esc(ayuda) + ' No hace falta que sepas de obra: fíjate en el precio del metro y elige el que te encaje.</p>' +
            '<div class="opciones" data-grupo="nivel">';
    ['esencial','media','alta'].forEach(function (k) {
      const n = tabla[k] || NIVEL[k];
      h += '<button class="opcion' + (e.nivel === k ? ' sel' : '') + '" type="button" data-valor="' + k + '">' +
             '<b>' + esc(n.t) + '</b><small>' + esc(n.d) + '</small></button>';
    });
    return h + '</div>';
  };

  /* Las preguntas generales de esta pantalla NO valen para las doce obras. En
     una obra nueva no hay «estado de lo que hay» ni ascensor que subir, y en
     unos exteriores el acceso ya se ha preguntado antes y mejor. Cada obra
     declara en `sit` cuáles le tocan. */
  const CUENTA = ['', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco'];

  Cotizador.prototype.vistaSituacion = function () {
    const e = this.estado, o = OBRA[e.tipo], s = o.sit || {};
    const n = 1 + (o.vivienda ? 1 : 0) + (s.conserva ? 1 : 0) + (s.acceso ? 1 : 0) + (s.hab ? 1 : 0);

    let h = '<p class="cot__pregunta">' +
      (n === 1 ? 'Una última cosa'
               : CUENTA[n] + ' cosas ' + (o.vivienda ? 'de la casa' : 'del sitio')) + '</p>' +
      '<p class="cot__ayuda">' +
      (n === 1 ? 'No cambia el precio, pero sí el hueco que podemos guardarte.'
               : 'Mueven el precio y el plazo más de lo que parece.') + '</p>';

    if (o.vivienda) {
      h += '<div class="campo"><span class="campo__rotulo">¿La vivienda tiene más de dos años?</span>' +
           '<div class="opciones" data-grupo="antiguedad">' +
           this.op('antiguedad','mas2','Sí, más de dos años','Le corresponde el IVA reducido') +
           this.op('antiguedad','menos2','No, es de obra nueva','Le corresponde el 21 %') +
           '</div></div>';
    }

    if (s.conserva) {
      h += '<div class="campo"><span class="campo__rotulo">¿En qué estado está lo que hay?</span>' +
           '<div class="opciones" data-grupo="conserva">' +
           this.op('conserva','bien','Bien conservado','Sin sorpresas a la vista') +
           this.op('conserva','regular','Regular','Alguna humedad o instalación vieja') +
           this.op('conserva','malo','Mal, es antiguo','Más de 40 años sin tocar') +
           '</div></div>';
    }

    /* El acceso a un piso y el acceso a un local no se cuentan igual: en uno
       la pregunta es el ascensor y en el otro la calle y el sótano. */
    if (s.acceso === 'piso') {
      h += '<div class="campo"><span class="campo__rotulo">¿Cómo es el acceso a la vivienda?</span>' +
           '<div class="opciones" data-grupo="acceso">' +
           this.op('acceso','facil','Fácil','Planta baja o con ascensor') +
           this.op('acceso','sin_ascensor','Sin ascensor','Hay que subir todo a mano') +
           this.op('acceso','dificil','Complicado','Calle estrecha, sin sitio para el contenedor') +
           '</div></div>';
    } else if (s.acceso === 'calle') {
      h += '<div class="campo"><span class="campo__rotulo">¿Cómo se entra con el material?</span>' +
           '<div class="opciones" data-grupo="acceso">' +
           this.op('acceso','facil','Fácil','A pie de calle y con sitio para descargar') +
           this.op('acceso','sin_ascensor','En alto o en sótano','Hay que subirlo o bajarlo a mano') +
           this.op('acceso','dificil','Complicado','Calle peatonal o sin sitio para el contenedor') +
           '</div></div>';
    }

    if (s.hab) {
      h += '<div class="campo"><span class="campo__rotulo">¿Se va a vivir allí durante la obra?</span>' +
           '<div class="opciones" data-grupo="hab">' +
           this.op('hab','no','No, estará vacía','Se trabaja de corrido') +
           this.op('hab','si','Sí, habitada','Protecciones, limpieza diaria y trabajo por fases') +
           '</div></div>';
    }

    /* No cambia el precio: cambia el sitio que te podemos guardar en el
       calendario. Va en el mensaje que se manda por WhatsApp. */
    h += '<div class="campo"><span class="campo__rotulo">¿Para cuándo la quieres?</span>' +
         '<div class="opciones" data-grupo="cuando">' +
         this.op('cuando','ya','Cuanto antes','En el primer hueco que tengamos') +
         this.op('cuando','meses','En dos o tres meses','Con tiempo para decidir acabados') +
         this.op('cuando','info','Solo me estoy informando','Quiero saber por dónde anda el precio') +
         '</div></div>';

    return h;
  };

  Cotizador.prototype.op = function (grupo, v, t, d) {
    const sel = this.estado[grupo] === v ? ' sel' : '';
    return '<button class="opcion' + sel + '" type="button" data-valor="' + v + '">' +
           '<b>' + esc(t) + '</b>' + (d ? '<small>' + esc(d) + '</small>' : '') + '</button>';
  };

  Cotizador.prototype.vistaTexto = function () {
    const e = this.estado;
    return '<p class="cot__pregunta">Descríbenos la obra con tus palabras</p>' +
      '<p class="cot__ayuda">Escríbelo con tus palabras, sin tecnicismos. Lo leemos según escribes y lo que reconocemos entra en el cálculo.</p>' +
      '<div class="campo">' +
        '<label for="cot-texto">Tu obra, a tu manera</label>' +
        '<textarea id="cot-texto" placeholder="Por ejemplo: es la casa de mis padres, tiene unos 80 años y lleva mucho sin tocarse. Hay bastantes humedades en la planta baja, que sube del suelo. Quiero quitar la bañera y poner ducha, cambiar el suelo de toda la casa, quitar el gotelé y cambiar las ventanas.">' + esc(e.texto || '') + '</textarea>' +
        '<small>Opcional, pero cuanto más nos cuentes, más se acerca el número. Escribe las cantidades si las sabes: los metros, cuántos baños, cuántas ventanas.</small>' +
      '</div>' +
      '<div class="detectado" id="cot-detectado"></div>';
  };

  /* El icono de WhatsApp, en un solo sitio: lo usan el botón del resultado y
     el de la pantalla de datos. */
  const ICONO_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.6.2s-.7 1-.9 1.2c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5s0-.4 0-.6-.6-1.6-.9-2.2c-.2-.5-.5-.4-.6-.4h-.5a1 1 0 0 0-.8.4A3 3 0 0 0 6.4 9c0 1.3.9 2.6 1.1 2.8s1.9 2.9 4.6 4a15 15 0 0 0 1.5.6c.7.2 1.3.2 1.7.1.6-.1 1.7-.7 1.9-1.3s.2-1.2.2-1.3-.2-.3-.5-.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';

  /* LA HORQUILLA. Con los supuestos puestos no falta nada por contestar, así
     que lo que puede mover el precio no es la ignorancia: es que una suposición
     no case con esta obra en concreto. Eso se puede medir, y se midió sobre el
     propio motor moviendo una respuesta cada vez: la mediana se va un 15 %
     hacia abajo y un 14 % hacia arriba, y el percentil 75 queda en 15 y 19 %.
     De ahí el ±15 %: no es un número redondo elegido por bonito, es el error
     típico de suponer, y se puede defender delante de un cliente.

     En cuanto alguien afina, ya no hay nada supuesto y se da una cifra sola. */
  Cotizador.prototype.horquilla = function () {
    const p = this.calcular(), r = function (n) { return Math.round(n / 100) * 100; };
    return { bajo: r(p * 0.85), alto: r(p * 1.15) };
  };

  /* ------------------------------------------------------ datos del cliente
     Va ANTES del precio y es obligatorio: sin nombre y teléfono no se enseña la
     cifra. Es decisión de Jon, tomada a sabiendas: prefiere menos precios vistos
     y más gente a la que poder llamar. El correo se quitó el 8-10-2026: de cinco
     que eligieron obra, cuatro se fueron en esta pantalla.

     QUÉ LO SOSTIENE JURÍDICAMENTE. No es el consentimiento —un consentimiento
     que es la llave de algo no es libre, art. 7.4 RGPD—, sino el art. 6.1.b:
     quien pide una estimación de obra está dando un paso previo al contrato, y
     el nombre y el teléfono son lo que hace falta para atenderlo.
     Por eso la Política de Privacidad lo dice así y no habla de voluntariedad
     en este punto. Y por eso la pantalla recuerda que hay otra puerta —el
     WhatsApp y el teléfono de siempre— para quien no quiera usar esta: es una
     vía que la empresa ya atiende, no un atajo para ver la cifra aquí.

     Si la medición está apagada o no hay dónde guardar el dato, esta pantalla
     no existe (ver `pasoVivo`). No es una salida para el visitante: es que
     cobrar el dato sin poder guardarlo sería quedarse sin las dos cosas. */
  Cotizador.prototype.vistaDatos = function () {
    const e = this.estado, o = OBRA[e.tipo];
    return '<p class="cot__pregunta">Ya está. ¿A quién le damos el precio?</p>' +
      '<p class="cot__ayuda">Tu ' + esc(o.nombre.toLowerCase()) + ' ya está calculada. ' +
        'Déjanos cómo localizarte y te la enseñamos ahora mismo: te llamamos para verla contigo y ' +
        'cerrar el precio con una visita, que es gratis y no compromete a nada.</p>' +
      '<form class="recogida" id="cot-datos">' +
        '<div class="recogida__par">' +
          '<div class="campo"><label for="cot-nombre">Nombre</label>' +
            '<input type="text" id="cot-nombre" autocomplete="name" required></div>' +
          '<div class="campo"><label for="cot-tel">Teléfono</label>' +
            '<input type="tel" id="cot-tel" autocomplete="tel" inputmode="tel" required></div>' +
        '</div>' +
        '<div class="campo"><label for="cot-texto-corto">¿Algo que debamos saber? (opcional)</label>' +
          '<textarea id="cot-texto-corto" rows="2" placeholder="Humedades, una piscina, prisa por la fecha…">' +
          esc(e.texto || '') + '</textarea></div>' +
        '<label class="consentimiento"><input type="checkbox" id="cot-ok">' +
          '<span>Acepto la <a href="legal.html#privacidad" target="_blank" rel="noopener">Política de ' +
          'Privacidad</a> y que me llaméis para esta obra.</span></label>' +
        '<button class="btn" type="submit">Ver mi precio</button>' +
      '</form>' +
      '<div class="cot__otra-via">' +
        '<p>¿Prefieres no escribirlo aquí? Pídenoslo por WhatsApp y te lo decimos nosotros. ' +
          'El mensaje te sale ya escrito con los datos de tu obra.</p>' +
        '<a class="btn btn--wa" id="cot-wa-datos" href="#" target="_blank" rel="noopener">' +
        ICONO_WA + 'Pedir el precio por WhatsApp</a>' +
      '</div>';
  };

  Cotizador.prototype.vistaResultado = function () {
    const e = this.estado, o = OBRA[e.tipo];
    const precio = this.calcular();
    const iva = this.ivaAplicable();

    const filas = [
      ['Obra', o.nombre],
      [o.unidad === 'huecos' ? 'Huecos' : 'Superficie', e.medida + ' ' + o.unidad],
      ['Acabados', nivelT(e)]
    ];

    const hq = this.horquilla();
    const miles = function (n) { return new Intl.NumberFormat('es-ES').format(Math.round(n)); };

    let h = '<div class="resultado">' +
      '<p class="resultado__rotulo">' +
        (this.afinando ? 'Tu obra, con lo que nos has contado' : 'Estimación para tu obra') + '</p>' +
      '<div class="resultado__cifra" aria-live="polite">' +
        (this.afinando ? euros(precio) : miles(hq.bajo) + ' – ' + euros(hq.alto)) + '</div>' +
      '<p class="resultado__iva">IVA <b>no incluido</b> · a esta obra le corresponde un ' + iva + ' %' +
        (iva === 10 ? ' (reforma en vivienda de más de dos años)' : '') + '</p>' +
      (this.afinando ? '' :
        '<p class="resultado__iva">Es una horquilla porque hay cosas que hemos dado por supuestas ' +
        '—lo más habitual en una obra como la tuya—. Si nos las cuentas, te damos una cifra sola.</p>') +
      '<div class="resultado__resumen">' +
        filas.map(function (f) { return '<div><span>' + esc(f[0]) + '</span><b>' + esc(f[1]) + '</b></div>'; }).join('') +
      '</div>';

    const avisos = e.detectado.filter(function (d) { return d.aviso; });
    const fuera  = e.detectado.filter(function (d) { return d.fuera; });
    if (e.detectado.length) {
      h += '<div class="detectado" style="justify-content:center;margin-bottom:24px">' +
        e.detectado.slice(0, 14).map(function (d) {
          return '<span class="etiqueta' + (d.mas ? '' : ' etiqueta--gris') + '">' + esc(d.c) + '</span>';
        }).join('') + '</div>';
    }
    if (fuera.length) {
      h += '<div class="resultado__nota"><b>Esto lo vemos en la visita.</b> Has mencionado ' +
        fuera.map(function (d) { return esc(d.c); }).join(', ') +
        ', que queda fuera de una ' + esc(o.nombre.toLowerCase()) + '. Lo hemos anotado, pero no lo hemos ' +
        'incluido en el precio: valorarlo sin haberlo visto solo daría una cifra que no se sostiene.</div>';
    }
    if (avisos.length) {
      h += '<div class="resultado__nota"><b>A tener en cuenta.</b> ' +
        avisos.map(function (a) { return esc(a.aviso); }).join(' ') + '</div>';
    }

    h += '<div class="resultado__nota">' +
        '<b>Qué incluye esta cifra.</b> Materiales, mano de obra, maquinaria, retirada de escombro ' +
        'con su canon de vertedero, protecciones y limpieza final. Es una estimación a partir de lo ' +
        'que nos has contado: el precio definitivo se cierra tras la visita, es <b>vinculante</b> y no ' +
        'se mueve durante la obra. La visita y el presupuesto son gratuitos.' +
      '</div>';

    /* AFINAR. Aquí viven ahora las preguntas de detalle: las que antes hacían
       el cotizador de diez pantallas. El que quiera el número exacto las
       contesta; el que no, se queda con la horquilla. */
    if (!this.afinando && OBRA[e.tipo].preguntas.length > (CLAVE[e.tipo] || []).length) {
      h += '<div class="resultado__nota" style="text-align:center">' +
        '<b>¿Quieres el precio exacto?</b> Un minuto más de preguntas —qué hay ahora, qué acabados, ' +
        'qué quieres cambiar de sitio— y la horquilla se convierte en una cifra sola.' +
        '<div style="margin-top:12px"><button class="btn btn--linea" type="button" id="cot-afinar">' +
        'Afinar el precio</button></div></div>';
    }

    /* El formulario aquí es la red de seguridad: al resultado no se llega sin
       haber dejado los datos, salvo que la medición esté apagada —y entonces
       tampoco habría dónde guardarlos—. Se mantiene porque no cuesta nada y
       cubre ese caso y el de quien cambie de idea. */
    if (medidor() && !this.datosListos) {
      h += '<form class="recogida" id="cot-datos">' +
        '<p class="recogida__titulo">¿Prefieres que te llamemos nosotros?</p>' +
        '<p class="recogida__ayuda">Déjanos tu nombre y tu teléfono y te llamamos para concertar la visita. ' +
          'Es opcional: ya tienes tu estimación, y con los botones de abajo puedes escribirnos tú cuando quieras.</p>' +
        '<div class="recogida__par">' +
          '<div class="campo"><label for="cot-nombre">Nombre</label>' +
            '<input type="text" id="cot-nombre" autocomplete="name"></div>' +
          '<div class="campo"><label for="cot-tel">Teléfono</label>' +
            '<input type="tel" id="cot-tel" autocomplete="tel" inputmode="tel"></div>' +
        '</div>' +
        '<label class="consentimiento"><input type="checkbox" id="cot-ok">' +
          '<span>Acepto la <a href="legal.html#privacidad" target="_blank" rel="noopener">Política de Privacidad</a> y que me llaméis para esta obra.</span></label>' +
        '<button class="btn btn--linea" type="submit">Que me llamen</button>' +
        '<p class="recogida__gracias" id="cot-gracias" hidden>Recibido. Te llamamos en breve.</p>' +
      '</form>';
    } else if (medidor() && this.datosListos) {
      h += '<div class="resultado__nota" style="text-align:center">Ya tenemos tus datos: ' +
        'te llamamos nosotros. Si prefieres adelantarlo, escríbenos aquí abajo.</div>';
    }

    h += '<div class="resultado__acciones">' +
        '<a class="btn btn--wa" id="cot-wa" href="#" target="_blank" rel="noopener">' +
          ICONO_WA + 'Enviar por WhatsApp y pedir visita</a>' +
        '<a class="btn btn--linea" id="cot-correo" href="#">Enviarlo por correo</a>' +
        '<button class="btn btn--linea" type="button" id="cot-otra">Calcular otra obra</button>' +
      '</div></div>';
    return h;
  };

  /* ------------------------------------------------- mensaje para WhatsApp */
  /* `sinPrecio` es para el botón de WhatsApp de la pantalla de datos: ahí el
     cliente todavía no ha visto la cifra y el mensaje no se la puede chivar.
     Va con todo lo demás —obra, metros, acabados, lo que haya contestado— para
     que en el móvil de la empresa llegue con lo que hace falta para contestar
     sin tener que preguntarlo otra vez. */
  Cotizador.prototype.mensaje = function (sinPrecio) {
    const e = this.estado, o = OBRA[e.tipo], precio = this.calcular();
    const L = [sinPrecio
      ? 'Hola, he empezado el cotizador de la web y prefiero que me deis el precio por aquí:'
      : 'Hola, he utilizado el cotizador de la web y este es el resultado:', ''];
    L.push('· Obra: ' + o.nombre);
    L.push('· ' + (o.unidad === 'huecos' ? 'Huecos' : 'Superficie') + ': ' + e.medida + ' ' + o.unidad);
    L.push('· Acabados: ' + nivelT(e));

    o.preguntas.forEach(function (pr) {
      const val = e[pr.id];
      if (val === undefined || val === null) return;
      if (!cabe(pr, e)) return;
      const marcadas = pr.multi ? (val || []) : [val];
      if (!marcadas.length) return;
      const textos = marcadas.map(function (v) {
        const op = pr.ops.filter(function (x) { return x.v === v; })[0];
        return op ? op.t : v;
      });
      L.push('· ' + pr.titulo.replace(/^¿|\?$/g, '') + ': ' + textos.join(', '));
    });

    /* solo se manda lo que de verdad se ha preguntado en esta obra */
    const s = o.sit || {};
    if (s.hab)      L.push('· Vivienda habitada durante la obra: ' + (e.hab === 'si' ? 'sí' : 'no'));
    if (s.conserva) L.push('· Estado actual: ' + ({bien:'bien conservado', regular:'regular', malo:'antiguo'})[e.conserva]);
    if (s.acceso)   L.push('· Acceso: ' + (s.acceso === 'calle'
                             ? ({facil:'a pie de calle', sin_ascensor:'en alto o en sótano', dificil:'complicado'})[e.acceso]
                             : ({facil:'fácil', sin_ascensor:'sin ascensor', dificil:'complicado'})[e.acceso]));
    L.push('· Cuándo: ' + ({ya:'cuanto antes', meses:'en dos o tres meses', info:'de momento me informo'})[e.cuando]);

    if (e.texto && e.texto.trim()) { L.push('', 'Lo que quiero hacer:', e.texto.trim()); }
    if (!sinPrecio) L.push('', 'Estimación que da la web: ' + euros(precio) + ' (IVA no incluido)');
    L.push('', sinPrecio
      ? '¿Me podéis decir cuánto costaría?'
      : 'Me gustaría concertar una visita para tener el presupuesto cerrado.');
    return L.join('\n');
  };

  /* ==========================================================================
     LO QUE SE LE CUENTA AL PANEL

     Solo funciona si la medición está configurada (assets/medir.js). Aquí
     viajan las RESPUESTAS de la obra —qué pide, de qué tamaño, con qué
     acabados— y nunca datos personales: esos van por su propio camino y solo
     si el cliente los escribe y acepta la política de privacidad.

     Se manda desde que elige el tipo de obra y en cada pantalla, no al final.
     Es a propósito: lo que más falta hace saber es DÓNDE SE CAE LA GENTE, y
     el que abandona por definición no llega al final a contarlo.
     ======================================================================== */
  function medidor() {
    return (raiz.JonicaMedir && raiz.JonicaMedir.activo()) ? raiz.JonicaMedir : null;
  }

  /* Las respuestas en cristiano: «¿Qué hay ahora?» → «Un baño completo». Con
     los códigos internos (bano_completo) la hoja de Excel no la entendería
     nadie dentro de un año. */
  Cotizador.prototype.respuestasEnClaro = function () {
    const e = this.estado, o = OBRA[e.tipo], mapa = {};
    if (!o) return mapa;

    o.preguntas.forEach(function (pr) {
      const val = e[pr.id];
      if (val === undefined || val === null) return;
      if (!cabe(pr, e)) return;
      const marcadas = pr.multi ? (val || []) : [val];
      if (!marcadas.length) return;
      mapa[pr.titulo.replace(/^¿|\?$/g, '')] = marcadas.map(function (v) {
        const op = pr.ops.filter(function (x) { return x.v === v; })[0];
        return op ? op.t : v;
      });
    });

    /* de la pantalla de Situación, solo lo que esta obra llega a preguntar */
    const s = o.sit || {};
    if (s.hab)      mapa['Se vive allí durante la obra'] = e.hab === 'si' ? 'Sí' : 'No';
    if (s.conserva) mapa['Estado de lo que hay'] = ({ bien:'Bien conservado', regular:'Regular', malo:'Antiguo' })[e.conserva];
    if (s.acceso)   mapa['Acceso'] = (s.acceso === 'calle'
                      ? ({ facil:'A pie de calle', sin_ascensor:'En alto o en sótano', dificil:'Complicado' })
                      : ({ facil:'Planta baja o ascensor', sin_ascensor:'Sin ascensor', dificil:'Complicado' }))[e.acceso];
    if (o.vivienda) mapa['Antigüedad de la vivienda'] = e.antiguedad === 'mas2' ? 'Más de dos años' : 'Menos de dos años';
    mapa['Para cuándo'] = ({ ya:'Cuanto antes', meses:'En dos o tres meses', info:'De momento se informa' })[e.cuando];
    return mapa;
  };

  Cotizador.prototype.avisar = function (extra, sinPrisa) {
    const m = medidor();
    if (!m || !this.idCot) return;
    const e = this.estado, o = OBRA[e.tipo];
    if (!o) return;
    const vivos = this.pasosVivos(), p = this.pasoActual();

    m.cot(Object.assign({
      id: this.idCot,
      obra: e.tipo,
      obra_nombre: o.nombre,
      medida: e.medida,
      unidad: o.unidad,
      nivel: e.nivel,
      cuando: e.cuando,
      texto: (e.texto || '').trim() || null,
      detectado: e.detectado.length
        ? JSON.stringify(e.detectado.map(function (d) { return d.c; }))
        : null,
      respuestas: JSON.stringify(this.respuestasEnClaro()),
      paso: Math.max(vivos.indexOf(p), 0) + 1,
      pasos: vivos.length,
      etapa: p ? p.etapa : null
    }, extra || {}), sinPrisa);
  };

  /* ------------------------------------------------------------- cableado */
  Cotizador.prototype.enlazar = function (p) {
    const yo = this, e = this.estado;

    /* grupos de opciones */
    $$('.opciones', this.elLienzo).forEach(function (grupo) {
      const nombre = grupo.dataset.grupo;
      const multi = !!grupo.dataset.multi;
      $$('.opcion', grupo).forEach(function (b) {
        b.addEventListener('click', function () {
          const v = b.dataset.valor;
          if (multi) {
            const lista = e[nombre] ? e[nombre].slice() : [];
            const i = lista.indexOf(v);
            if (i === -1) lista.push(v); else lista.splice(i, 1);
            e[nombre] = lista;
            b.classList.toggle('sel');
          } else {
            $$('.opcion', grupo).forEach(function (o) { o.classList.remove('sel'); });
            b.classList.add('sel');
            e[nombre] = v;
            if (nombre === 'tipo') {
              e.medida = OBRA[v].ini;
              /* Se borra lo de la obra anterior y se pone lo que se supone de
                 la nueva. Antes aquí quedaba todo en null, y una pregunta en
                 null no se cobra: por eso el precio exprés salía por debajo. */
              /* null y no [] también en las de marcar varias: una lista vacía
                 significa «ya ha contestado, y no quiere ninguna», y eso es
                 justo lo que `suponer` no debe pisar. */
              OBRA[v].preguntas.forEach(function (pr) { e[pr.id] = null; });
              yo.suponer();
              yo.construirPasos();
              yo.cabeza();          // el contador de pasos depende del tipo de obra
              /* desde aquí, esta cotización tiene nombre y se puede seguir
                 aunque el cliente la deje a medias */
              if (!yo.idCot) yo.idCot = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
              const m = medidor();
              if (m) m.ev('cot_inicio', OBRA[v].nombre);
            }
          }
          yo.elSig.disabled = !yo.valido();
          /* con una sola respuesta posible, avanzar solo es más ágil. Se
             excluyen el tipo de obra (conviene poder cambiar de idea viendo
             las doce) y las pantallas con varias preguntas, donde adelantar
             dejaría las de abajo sin contestar. */
          const enPantalla = p.preguntas ? yo.vivas(p.preguntas) : [];
          const soloUna = (enPantalla.length === 1 && !enPantalla[0].multi) ||
                          nombre === 'nivel';
          if (!multi && nombre !== 'tipo' && soloUna) {
            /* Se guarda para poder cancelarlo: entre que se programa y que
               salta hay 280 ms, y quien pulsa rápido ya está en otra pantalla.
               Ese temporizador huérfano avanzaba una pantalla de más. */
            clearTimeout(yo.temporizadorAvance);
            yo.temporizadorAvance = setTimeout(function () { yo.avanzar(); }, 280);
          }
        });
      });
    });

    /* medida */
    const rango = $('#cot-rango', this.elLienzo);
    if (rango) {
      const num = $('#cot-num', this.elLienzo), lbl = $('#cot-lbl', this.elLienzo);
      const fijar = function (valor, origen) {
        let n = Math.round(Number(valor));
        const o = OBRA[e.tipo];
        if (!isFinite(n) || n <= 0) n = o.ini;
        n = Math.min(Math.max(n, 1), 5000);
        e.medida = n;
        lbl.textContent = n;
        if (origen !== 'rango') rango.value = Math.min(Math.max(n, Number(rango.min)), Number(rango.max));
        if (origen !== 'num') num.value = n;
        yo.elSig.disabled = !yo.valido();
      };
      rango.addEventListener('input', function (ev) { fijar(ev.target.value, 'rango'); });
      num.addEventListener('input', function (ev) { fijar(ev.target.value, 'num'); });
    }

    /* texto libre: se analiza según se escribe */
    const ta = $('#cot-texto', this.elLienzo);
    if (ta) {
      const salida = $('#cot-detectado', this.elLienzo);
      let temporizador = null;
      const repintar = function () {
        const enc = yo.analizar(ta.value);
        if (!enc.length) {
          salida.innerHTML = ta.value.trim().length > 3
            ? '<span class="etiqueta etiqueta--gris">Seguimos leyendo…</span>' : '';
          return;
        }
        salida.innerHTML = '<span class="etiqueta etiqueta--gris">Hemos entendido:</span>' +
          enc.slice(0, 22).map(function (d) { return '<span class="etiqueta">' + esc(d.c) + '</span>'; }).join('');
      };
      ta.addEventListener('input', function () {
        clearTimeout(temporizador);
        temporizador = setTimeout(function () {
          repintar();
          yo.analizarConIA(ta.value, repintar);
        }, 300);
      });
      repintar();
      setTimeout(function () { ta.focus(); }, 120);
    }

    /* resultado */
    const wa = $('#cot-wa', this.elLienzo);
    if (wa) {
      const texto = this.mensaje();
      const o = OBRA[e.tipo];
      wa.href = 'https://wa.me/' + this.cfg.telefono + '?text=' + encodeURIComponent(texto);
      $('#cot-correo', this.elLienzo).href = 'mailto:' + this.cfg.correo +
        '?subject=' + encodeURIComponent('Solicitud de presupuesto · ' + o.nombre) +
        '&body=' + encodeURIComponent(texto);
      $('#cot-otra', this.elLienzo).addEventListener('click', function () { yo.reiniciar(); yo.alaVista(); });

      /* qué hizo con el precio: es la diferencia entre «mira precios» y
         «quiere una obra» */
      const m = medidor();
      if (m) {
        wa.addEventListener('click', function () {
          m.ev('envio', 'whatsapp');
          m.solicitud();                     // esto sí es pedir una obra
          yo.avisar({ enviada: 'whatsapp' });
        });
        $('#cot-correo', this.elLienzo).addEventListener('click', function () {
          m.ev('envio', 'correo');
          m.solicitud();
          yo.avisar({ enviada: 'correo' });
        });
      }

    }

    /* EL FORMULARIO DE DATOS. Vive en su propia pantalla, antes del precio,
       pero el resultado lo vuelve a pintar para quien prefirió saltárselo: por
       eso se cablea aquí fuera y no dentro del bloque del resultado. */
    const datos = $('#cot-datos', this.elLienzo);
    if (datos) datos.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const leer = function (id) { const x = $(id, datos); return x ? x.value.trim() : ''; };
      const nombre = leer('#cot-nombre'), tel = leer('#cot-tel');

      if (!nombre || !tel) {
        alert('Necesitamos el nombre y el teléfono para poder llamarte.');
        (nombre ? $('#cot-tel', datos) : $('#cot-nombre', datos)).focus();
        return;
      }
      /* Nueve cifras empezando por 6, 7, 8 o 9. No está para desconfiar del
         cliente: está para que un número mal tecleado no se convierta en una
         llamada perdida. Se admiten espacios, puntos y el +34 porque la gente
         los escribe. */
      const limpio = tel.replace(/[\s.()-]/g, '').replace(/^(\+34|0034)/, '');
      if (!/^[6789]\d{8}$/.test(limpio)) {
        alert('Ese teléfono no parece correcto. Escríbelo con sus nueve cifras.');
        $('#cot-tel', datos).focus();
        return;
      }
      if (!$('#cot-ok', datos).checked) {
        alert('Para poder llamarte necesitamos que aceptes la política de privacidad.');
        $('#cot-ok', datos).focus();
        return;
      }

      /* Lo que escriba en la casilla de «algo que debamos saber» es el mismo
         texto libre de siempre: alimenta el detector de palabras —de ahí sale
         la piscina de unos exteriores, que multiplica el precio— y el mensaje
         de WhatsApp. */
      const libre = $('#cot-texto-corto', datos);
      if (libre) yo.analizar(libre.value);

      const enDatos = !!(yo.pasoActual() && yo.pasoActual().id === 'datos');
      const m2 = medidor();
      if (m2) {
        const precio = yo.calcular();
        /* `cot_datos` y no `contacto` cuando esto es la puerta del precio: el
           nombre `contacto` es el que Meta cuenta como cliente potencial, y
           contarle como cliente a todo el que cruza la puerta enseñaría a los
           anuncios a traer curiosos. En el resultado sí es `contacto`: allí el
           formulario es opcional y quien lo rellena está pidiendo la visita. */
        m2.ev(enDatos ? 'cot_datos' : 'contacto', 'cotizador', precio);
        /* La obra TERMINADA en ese mismo envío, sin prisa, para que viaje
           dentro del paquete de abajo. El servidor escribe la obra antes que la
           persona, y el correo de «Contacto nuevo en la web» lee el precio en el
           instante en que escribe a la persona: sin esto el aviso llegaría con
           «sin terminar» y sin cifra, que es justo el dato por el que se abre. */
        yo.avisar({ completa: 1, precio: precio, iva: yo.ivaAplicable() }, true);
        m2.con({
          nombre: nombre, telefono: tel, correo: null, via: 'cotizador',
          cotizacion: yo.idCot, consentido: 1,
          mensaje: (e.texto || '').trim() || null
        });
        if (!enDatos) m2.solicitud();     // «que me llamen» sí es pedir una obra
      }

      yo.datosListos = true;
      if (enDatos) { yo.construirPasos(); yo.irA('resultado'); return; }

      $('#cot-gracias', datos).hidden = false;
      $('.recogida__par', datos).hidden = true;
      $('.consentimiento', datos).hidden = true;
      datos.querySelector('button[type=submit]').hidden = true;
    });

    /* El WhatsApp de la pantalla de datos. Lleva la obra ya escrita y SIN la
       cifra: el precio es justo lo que no se enseña todavía. */
    const waDatos = $('#cot-wa-datos', this.elLienzo);
    if (waDatos) {
      waDatos.href = 'https://wa.me/' + this.cfg.telefono +
        '?text=' + encodeURIComponent(this.mensaje(true));
      waDatos.addEventListener('click', function () {
        const m3 = medidor();
        if (!m3) return;
        m3.ev('envio', 'whatsapp');
        m3.solicitud();                 // pedir precio por WhatsApp es pedir obra
        yo.avisar({ enviada: 'whatsapp' });
      });
    }

    /* Abrir el detalle desde el resultado. */
    const afinar = $('#cot-afinar', this.elLienzo);
    if (afinar) afinar.addEventListener('click', function () {
      yo.afinando = true;
      yo.construirPasos();
      const i = yo.pasos.map(function (x) { return x.id.slice(0, 2); }).indexOf('p:');
      if (i >= 0) yo.paso = i;
      yo.pintar();
      yo.alaVista();
    });
  };

  raiz.Cotizador = Cotizador;
})(window);
