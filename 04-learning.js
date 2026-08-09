/* Lessons, exercises, and puzzle boards. Generated from the verified legacy bundle. */
const LESSONS = {
    1: {
      category: "fundamentos",
      xp: 25,
      content:
        '\n            <h4>¿Cómo se mueve cada pieza?</h4>\n            <p>El <b>peón</b> avanza una casilla (dos en su primer movimiento) y captura en diagonal. El <b>caballo</b> se mueve en "L" y es la única pieza que salta por encima de otras. El <b>alfil</b> se mueve en diagonal y siempre queda en casillas del mismo color. La <b>torre</b> se mueve en línea recta, por filas y columnas. La <b>dama</b> combina los movimientos de torre y alfil. El <b>rey</b> se mueve una casilla en cualquier dirección.</p>\n            <h4>Valor aproximado</h4>\n            <p>Peón = 1, Caballo = 3, Alfil = 3, Torre = 5, Dama = 9. El rey no tiene valor material: si lo pierden, pierden la partida.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/8" data-highlight="b3,b5,c2,c6,e2,e6,f3,f5"></div>\n            <p class="mini-diagram-caption">El caballo en d4 puede saltar a cualquiera de las 8 casillas marcadas.</p>\n            <div class="lesson-tip">💡 Los caballos son mejores cerca del centro; en el borde del tablero controlan muy pocas casillas.</div>\n          ',
      puzzle: {
        fen: "2b1k3/pppppppp/8/8/8/8/PPPPPPPP/1N2KB2 w - - 0 1",
        solution: ["b1c3"],
        prompt: "Es tu turno. Desarrollá el caballo hacia una casilla central.",
        success:
          "¡Muy bien! Cc3 lleva al caballo cerca del centro, donde controla más casillas.",
        fail: "Probá otra casilla: buscá acercar el caballo al centro del tablero.",
        hint: "El caballo se mueve en forma de L. Desde b1, una buena casilla central es c3.",
      },
    },
    2: {
      category: "fundamentos",
      xp: 30,
      content:
        '\n            <h4>¿Cuándo conviene capturar?</h4>\n            <p>No todas las capturas son buenas. Antes de capturar, comparen el valor de la pieza que capturan con el valor de la pieza que arriesgan. Capturar una pieza de mayor valor que la propia siempre es una ganancia de material.</p>\n            <h4>Piezas "colgadas"</h4>\n            <p>Una pieza está colgada cuando no tiene ninguna defensa y puede ser capturada gratis. Antes de cada jugada, revisen si el rival dejó alguna pieza sin proteger.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3n4/8/8/8/8" data-highlight="d5"></div>\n            <p class="mini-diagram-caption">Este caballo no tiene ninguna pieza que lo defienda: está "colgado".</p>\n            <div class="lesson-tip">💡 Contá siempre: ¿qué gano y qué puedo llegar a perder con esta captura?</div>\n          ',
      puzzle: {
        fen: "1nb1k3/ppp1pppp/8/3n4/8/8/PPP1PPPP/1N1QK3 w - - 0 1",
        solution: ["d1d5"],
        prompt: "El caballo negro en d5 no tiene ninguna defensa. Capturalo.",
        success: "¡Correcto! Dxd5 gana una pieza completamente gratis.",
        fail: "Todavía se puede ganar material gratis. Fijate qué pieza negra no tiene ninguna defensa.",
        hint: "La dama en d1 y el caballo en d5 están en la misma columna.",
      },
    },
    3: {
      category: "fundamentos",
      xp: 35,
      content:
        '\n            <h4>Jaque</h4>\n            <p>Hay jaque cuando el rey está siendo atacado. Deben responder de inmediato: mover el rey, bloquear el ataque o capturar la pieza que da jaque.</p>\n            <h4>Jaque mate</h4>\n            <p>Si están en jaque y no hay ninguna manera de solucionarlo, es <b>jaque mate</b> y la partida termina.</p>\n            <h4>Tablas</h4>\n            <p>La partida puede terminar en tablas por ahogado (el jugador en turno no está en jaque pero no tiene jugadas legales), por acuerdo mutuo, o por repetición de posición.</p>\n            <div class="mini-diagram" data-fen="k7/2K5/1Q6/8/8/8/8/8" data-highlight="a8"></div>\n            <p class="mini-diagram-caption">Ejemplo de ahogado: el rey negro no está en jaque, pero no tiene ninguna casilla legal. Tablas.</p>\n            <div class="lesson-tip">💡 Un patrón clásico: si el rey rival quedó encerrado detrás de sus propios peones, una torre o dama en la última fila puede dar jaque mate.</div>\n          ',
      puzzle: {
        fen: "6k1/1ppppppp/8/8/8/8/1PPPP3/R5K1 w - - 0 1",
        solution: ["a1a8"],
        checkmate: !0,
        prompt:
          "El rey negro está encerrado por sus propios peones. Encontrá el jaque mate en una jugada.",
        success:
          "¡Jaque mate! La torre controla toda la octava fila y el rey no tiene escapatoria.",
        fail: "Esa jugada no es mate. Pensá en llevar la torre a la última fila.",
        hint: "Mové la torre a lo largo de la columna 'a' hasta la última fila.",
      },
    },
    4: {
      category: "estrategia",
      xp: 40,
      content:
        '\n            <h4>¿Por qué importa el centro?</h4>\n            <p>Las casillas centrales (d4, d5, e4, e5) son las más valiosas del tablero: desde ahí, las piezas controlan más casillas y se pueden trasladar rápido a cualquier sector.</p>\n            <h4>Cómo ocuparlo</h4>\n            <p>En la apertura, lo habitual es avanzar los peones centrales (e4/d4 o e5/d5) para ganar espacio y abrir líneas para el desarrollo de las piezas menores.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/8" data-highlight="d4,d5,e4,e5"></div>\n            <p class="mini-diagram-caption">Las 4 casillas centrales: d4, d5, e4 y e5.</p>\n            <div class="lesson-tip">💡 "Quien domina el centro, domina el tablero." Evitá mover peones de torre o de alfil temprano sin una buena razón.</div>\n          ',
      puzzle: {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution: ["e2e4", "d2d4"],
        prompt:
          "Es la posición inicial. Jugá un movimiento que luche por el centro.",
        success:
          "¡Excelente! Ese avance central abre líneas para el alfil y la dama.",
        fail: "Esa jugada no pelea por el centro. Pensá en los peones de reina o de rey.",
        hint: "Los peones 'e' y 'd' son los que controlan las casillas centrales.",
      },
    },
    5: {
      category: "estrategia",
      xp: 45,
      content:
        '\n            <h4>Desarrollo antes que ataques prematuros</h4>\n            <p>Antes de buscar amenazas, saquen sus piezas menores (caballos y alfiles) de la fila inicial. Un desarrollo rápido permite enrocar antes y evita perder tiempos.</p>\n            <h4>La regla de "una pieza por jugada"</h4>\n            <p>En la apertura, eviten mover dos veces la misma pieza o sacar la dama demasiado pronto: le da tiempo al rival para desarrollarse mientras la atacan.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/4k3/8/8/8" data-highlight="e4"></div>\n            <p class="mini-diagram-caption">Un rey en el centro, sin enrocar, es un blanco fácil para las piezas rivales.</p>\n            <div class="lesson-tip">💡 Un buen orden típico: peón central, caballo, alfil, enroque.</div>\n          ',
      puzzle: {
        fen: "1nb1k3/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/4KBNR w - - 0 1",
        solution: ["g1f3"],
        prompt:
          "Elegí la jugada que mejor combina desarrollo y preparación para enrocar.",
        success:
          "¡Muy bien! Cf3 desarrolla una pieza y deja el camino libre para el enroque corto.",
        fail: "Esa jugada no desarrolla una pieza nueva. Buscá sacar el caballo.",
        hint: "El caballo en g1 puede saltar a una casilla útil sin bloquear el enroque.",
      },
    },
    6: {
      category: "estrategia",
      xp: 45,
      content:
        '\n            <h4>¿Qué es el enroque?</h4>\n            <p>El enroque es la única jugada donde se mueven dos piezas a la vez: el rey se desplaza dos casillas hacia una torre, y esa torre salta al otro lado del rey. Sirve para poner al rey a resguardo y conectar las torres.</p>\n            <h4>Condiciones</h4>\n            <p>No pueden haber piezas entre el rey y la torre, ninguno de los dos se movió antes, el rey no puede estar en jaque, y no puede pasar ni terminar en una casilla atacada.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/5RK1" data-highlight="f1,g1"></div>\n            <p class="mini-diagram-caption">Así queda el rey y la torre después del enroque corto (O-O).</p>\n            <div class="lesson-tip">💡 Como regla general, enrocá lo antes posible: un rey en el centro es un blanco fácil.</div>\n          ',
      puzzle: {
        fen: "1nb1k3/pppppppp/8/8/8/8/PPPPPPPP/1NB1K2R w K - 0 1",
        solution: ["e1g1"],
        prompt:
          "El camino está despejado. Enrocá corto para poner a resguardo al rey.",
        success:
          "¡Perfecto! El enroque corto pone al rey a salvo y activa la torre.",
        fail: "Esa no es la jugada de enroque. El rey se mueve dos casillas hacia la torre.",
        hint: "Mové el rey de e1 a g1 (enroque corto).",
      },
    },
    7: {
      category: "tactica",
      xp: 50,
      content:
        '\n            <h4>El ataque doble (horquilla)</h4>\n            <p>Un ataque doble ocurre cuando una sola pieza amenaza a dos objetivos al mismo tiempo. El rival solo puede salvar uno de ellos, así que ustedes ganan material.</p>\n            <h4>El caballo, especialista en horquillas</h4>\n            <p>Por su movimiento en "L", el caballo es ideal para dar horquillas: puede atacar dos piezas que están lejos entre sí y que no se defienden mutuamente.</p>\n            <div class="mini-diagram" data-fen="8/8/8/4N3/8/8/8/8" data-highlight="c4,c6,d3,d7,f3,f7,g4,g6"></div>\n            <p class="mini-diagram-caption">Desde e5, el caballo controla estas 8 casillas a la vez: cualquier par de piezas rivales ahí puede caer en una horquilla.</p>\n            <div class="lesson-tip">💡 Antes de saltar con el caballo, revisen si la casilla de destino ataca al rey y a otra pieza valiosa a la vez.</div>\n          ',
      puzzle: {
        fen: "2r1k3/pppppppp/8/1N6/8/8/PPPPPPPP/1NB3K1 w - - 0 1",
        sequence: ["b5d6", "e8d8", "d6c8"],
        midMessage:
          "¡Cd6+ es jaque! El rey se aparta del jaque. Ahora terminá la horquilla.",
        prompt:
          "Encontrá la jugada de caballo que ataca al rey y a la torre al mismo tiempo, y después ganá la torre.",
        success:
          "¡Horquilla completa! Diste jaque con el caballo y después te comiste la torre.",
        fail: "Esa jugada no ataca dos piezas a la vez. Buscá una casilla de caballo que dé jaque.",
        hint: "Desde d6, el caballo controla e8 y c8 al mismo tiempo. Después de que el rey se mueva, comé la torre en c8.",
      },
    },
    8: {
      category: "tactica",
      xp: 50,
      content:
        '\n            <h4>¿Qué es una clavada?</h4>\n            <p>Una pieza está clavada cuando no se puede (o no conviene) mover porque detrás de ella hay una pieza más valiosa, generalmente el rey. Las clavadas absolutas (contra el rey) son ilegales de romper.</p>\n            <h4>Cómo aprovecharla</h4>\n            <p>Una vez clavada una pieza, suele ser un buen objetivo: pueden sumar más atacantes sobre ella, ya que no se puede escapar sin exponer al rey.</p>\n            <div class="mini-diagram" data-fen="8/6k1/8/8/3n4/8/8/B7" data-highlight="d4"></div>\n            <p class="mini-diagram-caption">El caballo está clavado: si se mueve, expone al rey al ataque del alfil.</p>\n            <div class="lesson-tip">💡 Los alfiles y torres son las piezas que suelen clavar; siempre a lo largo de una línea recta o diagonal.</div>\n          ',
      puzzle: {
        fen: "r5k1/pppppppp/4n3/8/8/8/BPPPPPPP/1N4K1 w - - 0 1",
        solution: ["a2c4"],
        prompt:
          "Colocá el alfil en la diagonal para clavar el caballo negro contra el rey.",
        success:
          "¡Bien visto! Ac4 clava el caballo: si se mueve, queda expuesto el rey.",
        fail: "Esa jugada no clava ninguna pieza. Buscá la diagonal que une al alfil con el rey rival.",
        hint: "El alfil debe quedar en la misma diagonal que el caballo y el rey negro.",
      },
    },
    9: {
      category: "tactica",
      xp: 55,
      content:
        '\n            <h4>El ataque descubierto</h4>\n            <p>Ocurre cuando mueven una pieza que estaba bloqueando el ataque de otra pieja propia (torre, alfil o dama), y al apartarse, esa pieza de atrás queda atacando algo. La pieza que se mueve también puede capturar o amenazar algo por su cuenta: es un "dos por uno".</p>\n            <h4>El jaque descubierto</h4>\n            <p>Es el más peligroso: al descubrir jaque, la pieza que se movió queda libre para capturar cualquier cosa, porque el rival está obligado a resolver el jaque primero.</p>\n            <div class="mini-diagram" data-fen="3k4/8/8/8/3B4/8/8/3R4" data-highlight="d1,d4,d8"></div>\n            <p class="mini-diagram-caption">El alfil tapa a la torre. Si se aparta (capturando algo de paso), la torre queda dando jaque.</p>\n            <div class="lesson-tip">💡 Busquen piezas propias alineadas con el rey rival, con solo una pieza propia en el medio.</div>\n          ',
      puzzle: {
        fen: "rn1k4/p1p1pppp/8/3B4/8/8/PPP1PPPP/1N1R2K1 w - - 0 1",
        solution: ["d5a8"],
        prompt:
          "El alfil bloquea a tu propia torre. Movelo para ganar material con jaque descubierto.",
        success:
          "¡Excelente! Al capturar la torre en a8, además descubrís el jaque de tu torre en d1 sobre el rey.",
        fail: "Esa jugada no aprovecha el ataque descubierto. Fijate qué pieza tuya bloquea a la torre en d1.",
        hint: "El alfil está sobre la misma columna que tu torre y el rey rival. Movelo capturando algo.",
      },
    },
    10: {
      category: "tactica",
      xp: 60,
      content:
        '\n            <h4>La desviación</h4>\n            <p>La desviación consiste en eliminar u obligar a moverse a la pieza que defiende algo importante (una casilla de mate, una pieza valiosa). Sin su defensor, ese punto débil queda a merced del ataque.</p>\n            <h4>Cómo identificarla</h4>\n            <p>Busquen qué pieza rival cumple una tarea defensiva clave, y pregúntense: "¿puedo capturarla, atacarla o forzarla a moverse?"</p>\n            <div class="mini-diagram" data-fen="8/8/5n2/8/8/8/8/8" data-highlight="f6"></div>\n            <p class="mini-diagram-caption">Este caballo es el único defensor de casillas clave cerca del rey. Sin él, esas casillas quedan débiles.</p>\n            <div class="lesson-tip">💡 Si una sola pieza defiende dos cosas importantes, suele ser el blanco ideal para una desviación.</div>\n          ',
      puzzle: {
        fen: "r5k1/pppppp1p/5n2/8/8/2B5/PPPPPPPP/1N4K1 w - - 0 1",
        solution: ["c3f6"],
        prompt:
          "El caballo negro es el único defensor de casillas clave cerca del rey. Eliminalo.",
        success:
          "¡Muy bien! Al capturar el caballo, eliminás al defensor y dejás al rey negro mucho más débil.",
        fail: "Esa jugada no elimina al defensor. Buscá una captura con el alfil.",
        hint: "El alfil en c3 y el caballo en f6 están en la misma diagonal.",
      },
    },
    11: {
      category: "tactica",
      xp: 60,
      content:
        '\n            <h4>La sobrecarga</h4>\n            <p>Una pieza está sobrecargada cuando tiene que defender dos cosas a la vez. Si la atacan con una tercera amenaza, no va a poder cumplir con las dos tareas: al resolver una, dejará la otra sin protección.</p>\n            <h4>Ejemplo típico</h4>\n            <p>Una torre que defiende simultáneamente la última fila (contra el mate) y una pieza propia está sobrecargada: pueden ganar esa pieza sabiendo que, si recaptura, se abre una debilidad mayor.</p>\n            <div class="mini-diagram" data-fen="3r2k1/8/8/3n4/8/8/8/8" data-highlight="d5,d8"></div>\n            <p class="mini-diagram-caption">La torre en d8 cumple dos tareas a la vez: defiende al caballo y controla la última fila.</p>\n            <div class="lesson-tip">💡 Contá cuántas tareas defensivas tiene cada pieza rival antes de decidir un plan táctico.</div>\n          ',
      puzzle: {
        fen: "1n1r2k1/ppp2ppp/8/3n4/8/1B6/PPPP4/4R1K1 w - - 0 1",
        sequence: ["b3d5", "d8d5", "e1e8"],
        checkmate: !0,
        midMessage:
          "La torre recaptura en d5... pero eso le quita el control de la última fila.",
        prompt:
          "La torre negra defiende al caballo y, a la vez, la última fila. Aprovechá la sobrecarga para terminar la partida.",
        success:
          "¡Sobrecarga perfecta! Al capturar el caballo, la torre negra tuvo que elegir: y al recapturar, abandonó la última fila. Jaque mate.",
        fail: "Esa jugada no explota la sobrecarga. Buscá una captura con el alfil sobre el caballo.",
        hint: "El alfil puede capturar el caballo en d5. Si la torre recaptura, la última fila queda libre para tu torre.",
      },
    },
    12: {
      category: "estrategia",
      xp: 100,
      content:
        '\n            <h4>Pensar antes de mover</h4>\n            <p>Un buen método de pensamiento ajedrecístico combina varias preguntas: ¿tengo jaques, capturas o amenazas disponibles? ¿qué pieza rival está peor colocada? ¿cuál es mi pieza menos activa y cómo la mejoro?</p>\n            <h4>El plan general</h4>\n            <p>El ajedrez no se juega jugada por jugada sin rumbo: conviene tener siempre una idea de fondo (ganar espacio, atacar al rey, mejorar la peor pieza) y elegir jugadas que se acerquen a ese objetivo.</p>\n            <div class="mini-diagram" data-fen="6k1/8/8/8/8/8/8/2B3K1" data-highlight="c1"></div>\n            <p class="mini-diagram-caption">¿Cuál es tu pieza peor colocada ahora mismo? Este alfil todavía sigue en su casilla inicial.</p>\n            <div class="lesson-tip">💡 Si no ven ninguna jugada táctica forzada, la mejor jugada suele ser la que mejora su pieza peor colocada.</div>\n          ',
      puzzle: {
        fen: "2b3k1/pppppppp/8/8/8/N7/PPPPPPPP/5BK1 w - - 0 1",
        solution: ["a3c4"],
        prompt:
          "El caballo está mal ubicado en el borde. Centralizalo para mejorar tu peor pieza.",
        success:
          "¡Excelente aplicación del método! Un caballo centralizado vale mucho más que uno en el borde.",
        fail: "Esa jugada no mejora la posición del caballo. Buscá acercarlo al centro.",
        hint: "Desde a3, el caballo tiene una buena casilla central disponible.",
      },
    },
    13: {
      category: "fundamentos",
      xp: 40,
      content:
        '\n            <h4>¿Cómo se lee una jugada?</h4>\n            <p>Cada casilla se nombra con una letra (columna, de "a" a "h") y un número (fila, de 1 a 8). Las piezas se abrevian: R=Rey (K en inglés), D=Dama (Q), T=Torre (R), A=Alfil (B), C=Caballo (N). Los peones no llevan letra.</p>\n            <h4>Ejemplos</h4>\n            <p>"e4" significa que un peón avanza a e4. "Cf3" significa que un caballo se mueve a f3. "Cxf3" indica que esa jugada captura una pieza. "O-O" es el enroque corto.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/5N2/8/8" data-highlight="f3"></div>\n            <p class="mini-diagram-caption">La casilla "f3": columna f, fila 3.</p>\n            <div class="lesson-tip">💡 Practicar la notación les permite seguir partidas de otros jugadores y analizar las suyas.</div>\n          ',
      puzzle: {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution: ["g1f3"],
        prompt: "Jugá el movimiento que en notación se escribe 'Cf3'.",
        success:
          "¡Correcto! Esa es exactamente la jugada Cf3: el caballo de rey se desarrolla.",
        fail: "Esa no es la jugada Cf3. Recordá: C = caballo, y f3 es la casilla de destino.",
        hint: "Buscá el caballo que puede llegar a la casilla f3 en una jugada.",
      },
    },
    14: {
      category: "fundamentos",
      xp: 45,
      content:
        '\n            <h4>¿Cuándo conviene cambiar piezas?</h4>\n            <p>Cambiar piezas (intercambiarlas por otras de valor similar) suele convenir cuando están mejor posicionados, cuando tienen ventaja material (simplificar ayuda a concretar la ventaja) o cuando eliminan la pieza más activa del rival.</p>\n            <h4>Cuándo evitarlo</h4>\n            <p>Si están peor o necesitan complicar la partida, evitar cambios suele dar más chances, ya que mantiene piezas en el tablero para generar contrajuego.</p>\n            <div class="mini-diagram" data-fen="4k3/8/8/8/8/1P6/8/4K3" data-highlight="b3"></div>\n            <p class="mini-diagram-caption">Con una ventaja de material (como este peón de más), cambiar piezas ayuda a simplificar hacia la victoria.</p>\n            <div class="lesson-tip">💡 Regla práctica: si están mejor, cambien piezas (no peones); si están peor, evítenlo.</div>\n          ',
      puzzle: {
        fen: "1n2k3/pppppppp/8/3q4/3Q4/1P6/P1PPPPPP/1N2K3 w - - 0 1",
        solution: ["d4d5"],
        prompt:
          "Tenés una ventaja de material (un peón de más). Cambiá las damas para simplificar la posición.",
        success:
          "¡Bien pensado! Al cambiar damas estando mejor, se acercan a ganar la partida con menos riesgo.",
        fail: "Esa jugada no cambia las damas. Buscá la captura de dama por dama.",
        hint: "Las dos damas están en la misma columna.",
      },
    },
    15: {
      category: "estrategia",
      xp: 55,
      content:
        '\n            <h4>¿Qué es una columna abierta?</h4>\n            <p>Es una columna sin peones de ningún color. Las torres son mucho más fuertes ahí porque pueden moverse libremente de un extremo al otro del tablero e infiltrarse en el campo rival.</p>\n            <h4>Cómo usarla</h4>\n            <p>Coloquen sus torres en columnas abiertas (o semiabiertas, sin peones propios) apenas puedan. Suele ser más importante que mover un peón más en el flanco.</p>\n            <div class="mini-diagram" data-fen="6k1/ppp1pppp/8/8/8/8/PPP1PPPP/R5K1" data-highlight="d1,d2,d3,d4,d5,d6,d7,d8"></div>\n            <p class="mini-diagram-caption">La columna "d" no tiene peones de ningún color: está abierta.</p>\n            <div class="lesson-tip">💡 "Torre en columna abierta" es uno de los principios estratégicos más útiles para el medio juego.</div>\n          ',
      puzzle: {
        fen: "1n3bk1/ppp1pppp/8/8/8/8/PPP1PPPP/R4BK1 w - - 0 1",
        solution: ["a1d1"],
        prompt:
          "La columna 'd' está completamente abierta. Llevá tu torre ahí.",
        success: "¡Perfecto! Td1 ocupa la única columna abierta del tablero.",
        fail: "Esa jugada no coloca la torre en la columna abierta. Fijate qué columna no tiene peones.",
        hint: "Ninguna de las dos partes tiene peones en la columna 'd'.",
      },
    },
    16: {
      category: "estrategia",
      xp: 55,
      content:
        '\n            <h4>Caballo bueno vs. caballo malo</h4>\n            <p>Un caballo en el borde del tablero (columnas \'a\' u \'h\') controla muy pocas casillas y suele estar "malo". Un caballo en el centro, apoyado por un peón y sin poder ser atacado por peones rivales, es una pieza excelente: se llama <b>outpost</b> o "casilla fuerte".</p>\n            <h4>Cómo mejorarlo</h4>\n            <p>Si su caballo está mal ubicado, busquen la ruta más corta para llevarlo a una casilla central protegida.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/N7" data-highlight="d5"></div>\n            <p class="mini-diagram-caption">El caballo en a1 apenas controla 2 casillas; el mismo caballo en d5 controla hasta 8.</p>\n            <div class="lesson-tip">💡 Antes de mover otra pieza, revisen si su caballo peor colocado tiene una ruta de mejora disponible.</div>\n          ',
      puzzle: {
        fen: "2b3k1/pppppppp/8/8/N7/8/PPPPPPPP/5BK1 w - - 0 1",
        solution: ["a4c5"],
        prompt:
          "El caballo está en el borde, sin controlar casi nada. Llevalo a una casilla central.",
        success:
          "¡Bien! Esa casilla central es mucho más fuerte que el borde del tablero.",
        fail: "Esa jugada no mejora al caballo. Buscá una casilla más central.",
        hint: "Desde a4, el caballo tiene una casilla central disponible en la columna 'c'.",
      },
    },
    17: {
      category: "tactica",
      xp: 60,
      content:
        '\n            <h4>El doble ataque con la dama</h4>\n            <p>La dama, al combinar los movimientos de torre y alfil, es ideal para atacar dos piezas a la vez desde una sola casilla, incluso en direcciones distintas (una por columna o fila, otra por diagonal).</p>\n            <h4>Cómo buscarlo</h4>\n            <p>Fíjense si hay dos piezas rivales sin defensa que compartan una fila, columna o diagonal con una misma casilla disponible para su dama.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/3Q4/8/8/8" data-highlight="d1,d8,a4,h4,a1,g7"></div>\n            <p class="mini-diagram-caption">Desde d4, la dama controla toda la columna, la fila y las dos diagonales a la vez.</p>\n            <div class="lesson-tip">💡 Un doble ataque de dama suele ganar material aunque el rival tenga jaque o amenazas propias, siempre que puedan calcular bien el orden de jugadas.</div>\n          ',
      puzzle: {
        fen: "4k3/pppnpppp/8/r7/8/8/PP1PPPPP/3Q2K1 w - - 0 1",
        sequence: ["d1a4", "a5a6", "a4d7"],
        midMessage:
          "La torre se salva corriendo por la columna 'a'. El caballo quedó solo: andá por él.",
        prompt:
          "Encontrá la jugada de dama que ataca la torre y el caballo negros al mismo tiempo, y quedate con la pieza que no pueda salvar.",
        success:
          "¡Doble ataque perfecto! Dxa4 amenazó las dos piezas; al salvar la torre, te quedaste con el caballo.",
        fail: "Esa jugada no ataca las dos piezas a la vez. Buscá una casilla que una la columna de la torre con la diagonal del caballo.",
        hint: "Buscá una casilla en la misma columna que la torre y en la misma diagonal que el caballo. Si salvan la torre, comé el caballo.",
      },
    },
    18: {
      category: "tactica",
      xp: 70,
      content:
        '\n            <h4>La jugada intermedia (zwischenzug)</h4>\n            <p>A veces, antes de resolver el intercambio o la jugada "obvia", conviene intercalar una jugada más fuerte (un jaque o una amenaza mayor) que cambie la evaluación de la posición. El rival debe responder a esa jugada primero.</p>\n            <h4>Cómo detectarla</h4>\n            <p>Antes de recapturar automáticamente, pregúntense: "¿tengo un jaque o una amenaza más fuerte disponible ahora mismo?"</p>\n            <div class="mini-diagram" data-fen="4k3/8/8/1B6/8/8/8/8" data-highlight="b5,c6,d7,e8"></div>\n            <p class="mini-diagram-caption">Antes de resolver lo obvio, revisen si hay un jaque disponible como este.</p>\n            <div class="lesson-tip">💡 No siempre la jugada más obvia es la mejor: revisen si hay una jugada intermedia antes de continuar la secuencia esperada.</div>\n          ',
      puzzle: {
        fen: "1n2k3/pppp1ppp/8/8/3r4/3B4/PPP1PPPP/3Q2K1 w - - 0 1",
        sequence: ["d3b5", "e8e7", "d1d4"],
        midMessage:
          "Ab5+ obliga al rey a moverse antes de ocuparte de cualquier otra cosa.",
        prompt:
          "Podrías capturar la torre directamente, pero hay una jugada intermedia mejor. Encontrala, y después capturá la torre.",
        success:
          "¡Excelente! Ab5+ es la jugada intermedia: ganás un tiempo con jaque y después te quedás con la torre igual.",
        fail: "Esa jugada no es la intermedia más fuerte. Pensá en un jaque con el alfil antes de capturar la torre.",
        hint: "El alfil puede dar jaque en lugar de capturar directamente. Después de que el rey se mueva, capturá la torre con la dama.",
      },
    },
    19: {
      category: "tactica",
      xp: 80,
      content:
        '\n            <h4>¿Qué es un sacrificio?</h4>\n            <p>Sacrificar es entregar material a cambio de una compensación mayor: un ataque decisivo, jaque mate, o una ventaja posicional muy grande. No todo sacrificio es correcto: hay que calcular bien lo que se obtiene a cambio.</p>\n            <h4>El "sacrificio griego" (Axh7+)</h4>\n            <p>Un patrón clásico: si el rey rival enrocó corto y su alfil apunta a h7 (o h2), a veces se puede sacrificar el alfil ahí para exponer al rey y lanzar un ataque decisivo con las piezas restantes.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/2B5/8" data-highlight="c2,d3,e4,f5,g6,h7"></div>\n            <p class="mini-diagram-caption">La diagonal larga hacia h7: la ruta clásica del sacrificio griego.</p>\n            <div class="lesson-tip">💡 Antes de sacrificar, calculen al menos 2 o 3 jugadas del ataque resultante: un sacrificio sin seguimiento concreto suele ser solo pérdida de material.</div>\n          ',
      puzzle: {
        fen: "r5k1/pppppppp/8/8/8/3B1N2/PPPPPPPP/R5K1 w - - 0 1",
        sequence: ["d3h7", "g8h7", "f3g5"],
        midMessage:
          "El rey captura el alfil... y camina directo hacia el resto del ataque.",
        prompt:
          "El rey negro enrocó corto y tu alfil apunta directo a h7. Jugá el sacrificio clásico y continuá el ataque.",
        success:
          "¡Sacrificio griego completo! Axh7+ Rxh7 Cg5+ expone al rey negro por completo: el ataque recién empieza.",
        fail: "Esa jugada no es el sacrificio en h7. Fijate en qué diagonal está tu alfil.",
        hint: "El alfil en d3 apunta directo a la casilla h7. Después de que el rey capture, seguí el ataque con el caballo.",
      },
    },
    20: {
      category: "estrategia",
      xp: 120,
      content:
        '\n            <h4>Cómo armar un plan</h4>\n            <p>Después de la apertura, cada posición pide un plan concreto: puede ser ganar espacio, atacar al rey, mejorar la peor pieza o crear una debilidad en el bando rival. Un plan da sentido a cada jugada individual.</p>\n            <h4>Señales para elegir un plan</h4>\n            <p>Miren la estructura de peones, la seguridad de ambos reyes y qué piezas están mejor o peor colocadas. Eso les va a indicar de qué lado del tablero conviene jugar.</p>\n            <div class="mini-diagram" data-fen="6k1/5ppp/8/8/8/8/5PPP/6K1" data-highlight="f2,g2,h2"></div>\n            <p class="mini-diagram-caption">Un plan concreto: avanzar estos tres peones para atacar al rey enrocado.</p>\n            <div class="lesson-tip">💡 Un plan simple y consistente vence a una sucesión de jugadas sueltas sin conexión entre sí.</div>\n          ',
      puzzle: {
        fen: "2b3k1/ppppp1pp/5n2/8/4P3/8/PPPP1PPP/2B3K1 w - - 0 1",
        solution: ["e4e5"],
        prompt:
          "Elegí la jugada que ejecuta un plan claro: ganar espacio y ganar tiempo atacando al caballo.",
        success:
          "¡Gran plan! e5 gana espacio y obliga al caballo negro a retroceder, perdiendo tiempo.",
        fail: "Esa jugada no sigue el plan de ganar espacio con tempo. Pensá en avanzar el peón central.",
        hint: "El peón central puede avanzar una casilla y atacar al caballo negro.",
      },
    },
  },
  EXERCISES = {
    1: {
      category: "principiante",
      xp: 20,
      fen: "3nkb2/1pp2ppp/8/8/r2Q4/8/1PP2PPP/1N4K1 w - - 0 1",
      solution: ["d4a4"],
      prompt:
        "Tu dama puede capturar la torre o el caballo negros. Elegí la captura que gana más material.",
      success:
        "¡Correcto! La torre vale más que el caballo: Dxa4 es la mejor captura.",
      fail: "Esa captura suma menos material. Compará el valor de la torre y del caballo, y elegí la pieza más valiosa.",
      hint: "Compará: torre = 5 puntos, caballo = 3 puntos.",
    },
    2: {
      category: "principiante",
      xp: 20,
      fen: "2b1k3/pp3ppp/8/8/6n1/8/PP3PPP/1N2K2R w K - 0 1",
      solution: ["e1g1"],
      prompt:
        "Es tu turno. Poné a resguardo al rey con la mejor jugada de seguridad.",
      success:
        "¡Bien! El enroque corto es la jugada más segura para tu rey en esta posición.",
      fail: "Esa jugada no mejora la seguridad del rey. Pensá en enrocar.",
      hint: "El rey puede enrocar corto: se mueve dos casillas hacia la torre.",
    },
    3: {
      category: "estrategia",
      xp: 30,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      solution: ["e2e4", "d2d4", "g1f3", "c2c4"],
      prompt:
        "Elegí una jugada de apertura sólida que luche por el centro o desarrolle una pieza.",
      success:
        "¡Buena elección! Es una de las jugadas de apertura más sólidas y más jugadas a nivel mundial.",
      fail: "Esa jugada no es la más recomendable para empezar. Pensá en los peones centrales o en desarrollar un caballo.",
      hint: "e4, d4, Cf3 y c4 son las jugadas de apertura más comunes y sólidas.",
    },
    4: {
      category: "tactica",
      xp: 35,
      fen: "r1q3k1/pp3ppp/2N5/8/8/8/PP3PPP/2B3K1 w - - 0 1",
      sequence: ["c6e7", "g8f8", "e7c8"],
      midMessage:
        "Ce7+ es jaque: el rey se aparta. Ahora completá la horquilla.",
      prompt:
        "Encontrá el salto de caballo que ataca al rey y a la dama negros a la vez, y después ganá la dama.",
      success:
        "¡Horquilla real completa! Diste jaque con el caballo y después ganaste la dama.",
      fail: "Esa jugada no genera un ataque doble. Buscá una casilla de caballo que dé jaque.",
      hint: "Desde e7, el caballo controla tanto c8 como g8. Después del jaque, comé la dama en c8.",
    },
    5: {
      category: "tactica",
      xp: 35,
      fen: "2b3k1/p1p2ppp/8/4n2q/8/8/P1P2PPP/1RB3K1 w - - 0 1",
      solution: ["b1b5"],
      prompt:
        "Clavá el caballo negro contra la dama llevando tu torre a la quinta fila.",
      success:
        "¡Bien visto! Tb5 clava el caballo: si se mueve, pierde la dama.",
      fail: "Esa jugada no clava ninguna pieza. Buscá la fila que comparten el caballo y la dama negros.",
      hint: "El caballo y la dama negros están en la misma fila (la 5).",
    },
    6: {
      category: "tactica",
      xp: 50,
      fen: "rn4kb/1ppppp1p/8/8/8/8/2PPPPPP/QN4K1 w - - 0 1",
      solution: ["a1a8"],
      prompt:
        "Tenés dos capturas con jaque disponibles. Elegí la que gana más material.",
      success:
        "¡Correcto! Dxa8+ gana la torre (más valiosa que el alfil) y además da jaque.",
      fail: "Esa captura suma menos material. Compará el valor de la torre y el del alfil antes de elegir.",
      hint: "Torre = 5 puntos, alfil = 3 puntos. Elegí capturar la pieza más valiosa.",
    },
    7: {
      category: "estrategia",
      xp: 50,
      fen: "r5k1/ppp1p1pp/5n2/8/8/8/PPP2PPP/1NB3K1 w - - 0 1",
      solution: ["c1g5"],
      prompt:
        "Tu alfil sigue en la fila inicial. Activalo presionando al caballo negro.",
      success:
        "¡Buena mejora de pieza! Ag5 activa tu peor pieza y presiona al caballo.",
      fail: "Esa jugada no activa al alfil de la mejor manera. Buscá la diagonal larga hacia el caballo.",
      hint: "El alfil puede salir por la diagonal hasta la casilla g5.",
    },
    8: {
      category: "tactica",
      xp: 75,
      fen: "7k/2pp2pp/8/8/8/8/2PPP3/1Q4K1 w - - 0 1",
      solution: ["b1b8"],
      checkmate: !0,
      prompt:
        "El rey negro está atrapado en la esquina por sus propios peones. Encontrá el mate en una jugada.",
      success:
        "¡Jaque mate! La dama controla toda la última fila y el rey no tiene ninguna escapatoria.",
      fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila.",
      hint: "Llevá la dama por la columna 'b' hasta la última fila.",
    },
    9: {
      category: "principiante",
      xp: 25,
      fen: "1n2k3/pppppppp/8/8/2B5/8/PP1PPPPP/1N4K1 w - - 0 1",
      solution: ["c4f7"],
      prompt:
        "Leé bien la posición: hay un peón negro totalmente indefenso. Capturalo.",
      success:
        "¡Bien leído! El peón en f7 no tenía ninguna defensa, y de paso das jaque.",
      fail: "Todavía hay una captura gratis disponible. Revisá qué peón negro no tiene ninguna pieza que lo proteja.",
      hint: "El alfil y el peón negro comparten la misma diagonal.",
    },
    10: {
      category: "principiante",
      xp: 25,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      solution: ["e2e4"],
      prompt: "Jugá exactamente el movimiento que en notación se escribe 'e4'.",
      success:
        "¡Correcto! Esa jugada es exactamente 'e4': el peón de rey avanza dos casillas.",
      fail: "Esa no es la jugada 'e4'. Fijate bien qué peón y qué casilla indica la notación.",
      hint: "Buscá el peón que puede llegar a la casilla e4 en una sola jugada.",
    },
    11: {
      category: "estrategia",
      xp: 35,
      fen: "6k1/pppp1ppp/8/8/8/8/PPPP1PPP/5RK1 w - - 0 1",
      solution: ["f1e1"],
      prompt: "Encontrá la única columna sin peones y colocá tu torre ahí.",
      success:
        "¡Perfecto! La columna 'e' está completamente abierta: tu torre queda mucho más activa ahí.",
      fail: "Esa jugada no coloca la torre en la columna abierta. Fijate cuál es la única columna sin peones.",
      hint: "Ninguna de las dos partes tiene peones en la columna 'e'.",
    },
    12: {
      category: "estrategia",
      xp: 40,
      fen: "2b1k3/pppppppp/8/8/8/8/PPPP1PPP/4KB1N w - - 0 1",
      solution: ["h1g3"],
      prompt:
        "Tu caballo está totalmente aislado en el borde. Mejoralo llevándolo hacia el centro.",
      success:
        "¡Bien! Cg3 saca al caballo del borde y lo acerca a casillas mucho más útiles.",
      fail: "Esa jugada no mejora al caballo. Buscá una casilla más cercana al centro.",
      hint: "Desde h1, el caballo tiene una única casilla razonable de desarrollo.",
    },
    13: {
      category: "estrategia",
      xp: 50,
      fen: "1nb3k1/1ppppppp/8/8/8/8/PPPPPPPP/1N4K1 w - - 0 1",
      solution: ["a2a4"],
      prompt:
        "Elegí la jugada que empieza un plan de expansión en el flanco de dama.",
      success:
        "¡Buen plan! Avanzar el peón dos casillas gana espacio de inmediato en ese flanco.",
      fail: "Esa jugada no es la más ambiciosa para empezar el plan. Pensá en avanzar el peón dos casillas.",
      hint: "El peón todavía no se movió: puede avanzar una o dos casillas.",
    },
    14: {
      category: "tactica",
      xp: 40,
      fen: "6k1/pppppppp/8/2n1b3/8/3P4/PPP1PPPP/6K1 w - - 0 1",
      sequence: ["d3d4", "e5f6", "d4c5"],
      midMessage:
        "Salvaron el alfil, que valía más. El caballo quedó indefenso: comelo.",
      prompt:
        "Encontrá el avance de peón que ataca al caballo y al alfil negros a la vez, y quedate con la pieza que no puedan salvar.",
      success:
        "¡Horquilla de peón completa! d4 atacó las dos piezas; al salvar el alfil, ganaste el caballo igual.",
      fail: "Esa jugada no genera la horquilla. Pensá en avanzar el peón una casilla.",
      hint: "Un peón blanco ataca en diagonal hacia adelante. Buscá la casilla que ataque dos piezas a la vez, y después comé la que quedó sin defensa.",
    },
    15: {
      category: "tactica",
      xp: 50,
      fen: "r1b1k3/pp1p1ppp/8/1N6/8/8/PPPP1PPP/2B3K1 w - - 0 1",
      sequence: ["b5c7", "e8e7", "c7a8"],
      midMessage:
        "Cc7+ es jaque: el rey se aparta. Ahora terminá de ganar la torre.",
      prompt:
        "En vez de una jugada tranquila, encontrá la jugada intermedia que da jaque, y después ganá la torre.",
      success:
        "¡Excelente intermedia! Cc7+ ganó tiempo con jaque y después te llevaste la torre en a8.",
      fail: "Esa jugada no es la intermedia más fuerte. Buscá un salto de caballo que dé jaque.",
      hint: "Desde c7, el caballo ataca tanto al rey como a la torre. Después del jaque, comé la torre en a8.",
    },
    16: {
      category: "tactica",
      xp: 55,
      fen: "r5k1/pppppppp/8/8/8/4N3/PBPPPPPP/R5K1 w - - 0 1",
      sequence: ["b2g7", "g8g7", "e3f5"],
      midMessage:
        "El rey recaptura el alfil... y queda mucho más expuesto de lo que parece.",
      prompt:
        "Evaluá si conviene sacrificar el alfil para exponer al rey negro. Jugalo y seguí el ataque.",
      success:
        "¡Sacrificio correcto! Axg7 destruyó el refugio del rey negro, y el caballo llegó con jaque para continuar el ataque.",
      fail: "Esa jugada no es el sacrificio que expone al rey. Fijate en qué diagonal larga está tu alfil.",
      hint: "El alfil en b2 apunta directo a la casilla g7 por la diagonal larga. Después de la recaptura, seguí con el caballo.",
    },
    17: {
      category: "tactica",
      xp: 60,
      fen: "k7/pp2pp2/8/8/8/8/4PPP1/1NQ3K1 w - - 0 1",
      solution: ["c1c8"],
      checkmate: !0,
      prompt:
        "El rey negro está atrapado por sus propios peones. Encontrá el mate en una jugada.",
      success:
        "¡Jaque mate! El rey no puede capturar la dama ni escapar: sus propios peones se lo impiden.",
      fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila, lejos del alcance del rey.",
      hint: "La dama puede llegar a la última fila por la columna 'c'.",
    },
    18: {
      category: "tactica",
      xp: 65,
      fen: "3rk3/pppp1ppp/8/4N3/8/8/PPPP1PPP/4R1K1 w - - 0 1",
      sequence: ["e5c6", "e8e7", "c6d8"],
      midMessage:
        "El jaque descubierto obliga al rey a moverse. Ahora calculá la segunda jugada y quedate con la torre.",
      prompt:
        "Calculá dos jugadas: encontrá el salto de caballo que descubre jaque, y después ganá la torre negra.",
      success:
        "¡Cálculo perfecto! Cc6+ descubrió el jaque de tu torre y, dos jugadas después, ganaste la torre.",
      fail: "Esa jugada no descubre el jaque. Pensá en apartar el caballo de la columna 'e'.",
      hint: "Tu torre en e1 y el rey negro están en la misma columna: el caballo la está tapando. Después del jaque, comé la torre en d8.",
    },
    19: {
      category: "estrategia",
      xp: 70,
      fen: "2k5/8/8/8/8/8/2P5/2K5 w - - 0 1",
      solution: ["c1b2", "c1d2", "c1b1", "c1d1"],
      prompt:
        "Todavía no conviene avanzar el peón. Mejorá primero la posición de tu rey.",
      success:
        "¡Buena decisión! En los finales de peones, conviene activar el rey antes de avanzar el peón.",
      fail: "Avanzar el peón ahora no es la mejor decisión. Activá primero tu rey.",
      hint: "Mové el rey hacia el centro o hacia el peón, en lugar de avanzar el peón.",
    },
    20: {
      category: "tactica",
      xp: 100,
      fen: "1n4k1/ppp1pppp/8/8/8/8/PPP1PPPP/1N1Q2K1 w - - 0 1",
      solution: ["d1d8"],
      checkmate: !0,
      prompt:
        "Combiná todo lo aprendido y encontrá el jaque mate en una jugada.",
      success:
        "¡Jaque mate! Dd8 controla toda la última fila y los propios peones negros sellan la suerte del rey.",
      fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila por una columna despejada.",
      hint: "La columna 'd' está completamente libre hasta la última fila.",
    },
    21: {
      category: "tactica",
      level: "facil",
      xp: 25,
      fen: "4k3/8/8/3r4/2B5/8/8/4K3 w - - 0 1",
      solution: ["c4d5"],
      prompt:
        "La torre negra quedó sin defensa. Encontrá la captura directa que gana material.",
      success:
        "¡Correcto! Axd5 gana una torre limpia. Antes de calcular variantes largas, revisá siempre las piezas indefensas.",
      fail: "Hay una pieza negra de mucho valor que puede capturarse inmediatamente.",
      hint: "Seguí la diagonal del alfil desde c4 hasta la torre en d5.",
    },
    22: {
      category: "tactica",
      level: "facil",
      xp: 30,
      fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",
      solution: ["d1d8"],
      checkmate: !0,
      prompt:
        "El rey negro está encerrado por sus peones. Encontrá el mate de última fila.",
      success:
        "¡Jaque mate! Td8 controla toda la octava fila y los peones negros bloquean las casillas de escape.",
      fail: "Buscá un jaque de torre que controle toda la última fila.",
      hint: "La columna d está libre: llevá la torre hasta d8.",
    },
    23: {
      category: "estrategia",
      level: "facil",
      xp: 30,
      fen: "8/4k3/8/3K4/4P3/8/8/8 w - - 0 1",
      sequence: ["e4e5", "e7d7", "e5e6"],
      midMessage:
        "El rey negro se aparta. Ahora ganá espacio y acercá el peón a la promoción.",
      prompt:
        "Final básico: aprovechá la oposición de los reyes y avanzá el peón en el momento correcto.",
      success:
        "¡Bien jugado! Con los reyes enfrentados, avanzar el peón conserva el progreso y obliga al rey rival a ceder terreno.",
      fail: "No abandones la estructura: el avance del peón es la jugada que aprovecha la oposición.",
      hint: "Primero avanzá el peón de e4 a e5 y continuá empujándolo cuando el rey rival se aparte.",
    },
    24: {
      category: "tactica",
      level: "medio",
      xp: 45,
      fen: "8/4k1q1/8/8/3N4/8/8/7K w - - 0 1",
      sequence: ["d4f5", "e7f8", "f5g7"],
      midMessage:
        "Cf5+ obliga al rey a moverse. La segunda punta de la horquilla sigue atacada.",
      prompt:
        "Encontrá la horquilla de caballo que da jaque y, después, capturá la dama.",
      success:
        "¡Horquilla completa! El jaque ganó un tiempo y permitió capturar la dama en la jugada siguiente.",
      fail: "Buscá un salto de caballo que ataque simultáneamente al rey y a la dama.",
      hint: "Desde f5, el caballo ataca e7 y g7 al mismo tiempo.",
    },
    25: {
      category: "estrategia",
      level: "medio",
      xp: 45,
      fen: "8/3k4/8/2PK4/8/8/8/8 w - - 0 1",
      sequence: ["c5c6", "d7c7", "d5c5"],
      midMessage:
        "El jaque de peón desplazó al rey. Ahora colocá tu rey delante del peón.",
      prompt:
        "Usá un jaque de peón para ganar un tiempo y mejorar la posición de tu rey.",
      success:
        "¡Técnica correcta! El peón ganó un tiempo con jaque y el rey quedó preparado para escoltarlo.",
      fail: "Necesitás obligar primero al rey negro a cambiar de casilla.",
      hint: "El peón en c5 puede avanzar dando jaque al rey de d7.",
    },
    26: {
      category: "estrategia",
      level: "medio",
      xp: 45,
      fen: "8/6k1/4P3/8/8/8/8/R5K1 w - - 0 1",
      solution: ["a1e1"],
      prompt:
        "Tu peón pasado necesita apoyo. Colocá la torre detrás del peón para acompañar su avance.",
      success:
        "¡Correcto! Te1 aplica una regla fundamental: la torre trabaja mejor detrás del peón pasado.",
      fail: "La torre debe quedar alineada detrás del peón, no a un costado.",
      hint: "El peón está en la columna e. Llevá la torre a esa misma columna.",
    },
    27: {
      category: "tactica",
      level: "dificil",
      xp: 60,
      fen: "4k3/4q3/8/8/1B6/8/8/4R1K1 w - - 0 1",
      solution: ["e1e7"],
      prompt:
        "La dama negra está delante de su rey. Aprovechá la alineación y la protección de tu alfil.",
      success:
        "¡Excelente! Txe7+ gana la dama con jaque, y el rey no puede capturar la torre porque el alfil protege e7.",
      fail: "Buscá una captura de torre sobre la columna e que llegue con jaque.",
      hint: "La torre puede capturar en e7; el alfil de b4 protege esa casilla.",
    },
    28: {
      category: "estrategia",
      level: "dificil",
      xp: 65,
      fen: "8/8/1PK1k3/8/8/8/8/8 w - - 0 1",
      sequence: ["b6b7", "e6e7", "b7b8"],
      midMessage:
        "El rey negro se acerca, pero llega tarde. Completá la carrera.",
      prompt:
        "Calculá la carrera de peones y llevá el peón hasta la coronación.",
      success:
        "¡Cálculo correcto! El peón coronó antes de que el rey negro pudiera detenerlo.",
      fail: "No pierdas tiempos con el rey: el peón ya tiene vía libre hacia la última fila.",
      hint: "Avanzá el peón de b6 a b7 y prepará la coronación en b8.",
    },
    29: {
      category: "tactica",
      level: "dificil",
      xp: 70,
      fen: "3r2k1/5ppp/8/3n4/8/1B6/8/4R1K1 w - - 0 1",
      sequence: ["b3d5", "d8d5", "e1e8"],
      checkmate: !0,
      midMessage:
        "La torre recapturó y abandonó la última fila. Terminá la combinación.",
      prompt:
        "La torre negra está sobrecargada: defiende al caballo y evita el mate. Explotá las dos tareas.",
      success:
        "¡Sobrecarga resuelta! Axd5 desvió la torre y Te8 terminó la partida con mate.",
      fail: "Buscá capturar el caballo para obligar a la torre a abandonar la última fila.",
      hint: "El alfil de b3 puede capturar en d5. Si la torre recaptura, la octava fila queda libre.",
    },
    30: {
      category: "estrategia",
      level: "experto",
      xp: 75,
      fen: "8/8/7k/7p/4K3/8/8/R7 w - - 0 1",
      solution: ["a1a6"],
      prompt:
        "En este final de torre, cortá al rey rival para que no pueda acompañar su peón.",
      success:
        "¡Muy bien! Ta6+ obliga al rey a retroceder y lo separa del peón: la actividad de la torre decide el final.",
      fail: "Necesitás un jaque lateral que, además, corte el avance del rey.",
      hint: "La sexta fila permite dar jaque desde lejos y limitar al rey negro.",
    },
    31: {
      category: "tactica",
      level: "experto",
      xp: 80,
      fen: "7k/6pp/5Q2/8/3B4/8/8/6K1 w - - 0 1",
      solution: ["f6g7"],
      checkmate: !0,
      prompt:
        "Coordiná dama y alfil para dar mate junto al rey negro.",
      success:
        "¡Jaque mate! Dxg7 está protegida por el alfil y controla todas las casillas de escape.",
      fail: "Buscá una captura con la dama que quede protegida por el alfil de d4.",
      hint: "La diagonal del alfil termina en g7. La dama puede capturar allí con jaque.",
    },
    32: {
      category: "estrategia",
      level: "maestro",
      xp: 100,
      fen: "8/5KPk/8/8/8/8/8/8 w - - 0 1",
      solution: ["g7g8"],
      prompt:
        "Coroná sin perder la nueva pieza: comprobá primero que el rey protege la casilla de promoción.",
      success:
        "¡Final resuelto! El peón corona con jaque y el rey blanco protege g8, por lo que la nueva pieza no puede ser capturada.",
      fail: "La promoción es inmediata y la casilla g8 está protegida por tu rey.",
      hint: "Avanzá el peón de g7 a g8 y elegí la pieza con la que querés coronar.",
    },
  },
  LESSON_CATEGORY_LABEL = {
    fundamentos: "Fundamentos",
    estrategia: "Estrategia",
    tactica: "Táctica",
  },
  EXERCISE_CATEGORY_LABEL = {
    principiante: "Principiante",
    estrategia: "Estrategia",
    tactica: "Táctica",
  };
const learningView = {
    category: "all",
    status: "all",
    search: "",
  },
  exerciseView = {
    category: "all",
    status: "all",
    level: "all",
    search: "",
  };
function normalizeStudyText(e) {
  return String(e || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function setActiveStudyButton(e, t) {
  document.querySelectorAll(e).forEach((e) => {
    e.classList.toggle("active", e === t);
  });
}
function getCardTitle(e) {
  const t = e && e.querySelector("h3");
  return t ? t.textContent.trim() : "";
}
function getExerciseCardLevel(e) {
  if (e.dataset.level) return e.dataset.level;
  const t = normalizeStudyText(e.textContent);
  if (t.includes("maestro")) return "maestro";
  if (t.includes("experto") || t.includes("desafio")) return "experto";
  if (t.includes("dificil")) return "dificil";
  if (t.includes("medio")) return "medio";
  return "facil";
}
function getRecommendedLessonId() {
  const e = state.lessonsCompleted || [],
    t = Object.keys(LESSONS);
  return t.find((t) => !e.includes(String(t))) || t[0] || null;
}
function getRecommendedExerciseId(e = null) {
  const t = (state.exerciseStats && state.exerciseStats.solved) || [],
    a = Object.keys(EXERCISES),
    n = null == e ? -1 : a.indexOf(String(e));
  for (let e = 1; e <= a.length; e++) {
    const o = a[(Math.max(-1, n) + e) % a.length];
    if (!t.includes(String(o))) return o;
  }
  return a[(Math.max(-1, n) + 1) % a.length] || null;
}
function updateLearningRecommendation() {
  const e = getRecommendedLessonId(),
    t = e && document.querySelector(`[data-lesson-card][data-lesson-id="${e}"]`),
    a = document.getElementById("learning-recommendation-title"),
    n = document.getElementById("learning-recommendation-text"),
    o = document.getElementById("learning-recommendation-action"),
    r = (state.lessonsCompleted || []).length === Object.keys(LESSONS).length;
  if (!e || !t) return;
  (a && (a.textContent = r ? "Curso completado: repasá una lección" : getCardTitle(t)),
    n &&
      (n.textContent = r
        ? "Mantené frescos los conceptos volviendo a la primera lección."
        : `Siguiente paso recomendado: ${LESSON_CATEGORY_LABEL[LESSONS[e].category]}.`),
    o &&
      ((o.textContent = r ? "Repasar" : "Continuar"),
      (o.onclick = () => openLessonModal(e))));
}
function updateExerciseRecommendation() {
  const e = getRecommendedExerciseId(currentExerciseId),
    t = e &&
      document.querySelector(`[data-exercise-card][data-exercise-id="${e}"]`),
    a = document.getElementById("exercise-recommendation-title"),
    n = document.getElementById("exercise-recommendation-text"),
    o = document.getElementById("exercise-recommendation-action"),
    r =
      ((state.exerciseStats && state.exerciseStats.solved) || []).length ===
      Object.keys(EXERCISES).length;
  if (!e || !t) return;
  (a && (a.textContent = r ? "Repaso recomendado" : getCardTitle(t)),
    n &&
      (n.textContent = r
        ? "Ya resolviste todos los desafíos. Seguimos con práctica de repaso."
        : `Próximo desafío pendiente: ${EXERCISE_CATEGORY_LABEL[EXERCISES[e].category]}.`),
    o &&
      ((o.textContent = r ? "Repasar" : "Entrenar ahora"),
      (o.onclick = () => openExerciseModal(e))));
}
function applyLearningFilters() {
  const e = state.lessonsCompleted || [],
    t = normalizeStudyText(learningView.search);
  let a = 0;
  document.querySelectorAll("[data-lesson-card]").forEach((n) => {
    const o = e.includes(String(n.dataset.lessonId)),
      r =
        "all" === learningView.category ||
        n.dataset.category === learningView.category,
      s =
        "all" === learningView.status ||
        ("completed" === learningView.status ? o : !o),
      l = !t || normalizeStudyText(n.textContent).includes(t),
      i = r && s && l;
    ((n.style.display = i ? "" : "none"), i && a++);
  });
  const n = document.getElementById("learning-empty"),
    o = document.getElementById("learning-results-count");
  (n && (n.style.display = a ? "none" : ""),
    o && (o.textContent = `${a} ${1 === a ? "lección" : "lecciones"}`));
}
function applyExerciseFilters() {
  const e = (state.exerciseStats && state.exerciseStats.solved) || [],
    t = normalizeStudyText(exerciseView.search);
  let a = 0;
  document.querySelectorAll("[data-exercise-card]").forEach((n) => {
    const o = e.includes(String(n.dataset.exerciseId)),
      r =
        "all" === exerciseView.category ||
        n.dataset.category === exerciseView.category,
      s =
        "all" === exerciseView.status ||
        ("completed" === exerciseView.status ? o : !o),
      l =
        "all" === exerciseView.level ||
        getExerciseCardLevel(n) === exerciseView.level,
      i = !t || normalizeStudyText(n.textContent).includes(t),
      c = r && s && l && i;
    ((n.style.display = c ? "" : "none"), c && a++);
  });
  const n = document.getElementById("exercise-empty"),
    o = document.getElementById("exercise-results-count");
  (n && (n.style.display = a ? "none" : ""),
    o && (o.textContent = `${a} ${1 === a ? "ejercicio" : "ejercicios"}`));
}
function wireLearningControls() {
  document.querySelectorAll("[data-learning-filter]").forEach((e) => {
    e.addEventListener("click", () => {
      ((learningView.category = e.dataset.learningFilter),
        setActiveStudyButton("[data-learning-filter]", e),
        applyLearningFilters());
    });
  });
  document.querySelectorAll("[data-learning-status]").forEach((e) => {
    e.addEventListener("click", () => {
      ((learningView.status = e.dataset.learningStatus),
        setActiveStudyButton("[data-learning-status]", e),
        applyLearningFilters());
    });
  });
  const e = document.getElementById("learning-search");
  e &&
    e.addEventListener("input", () => {
      ((learningView.search = e.value), applyLearningFilters());
    });
}
function wireExerciseControls() {
  document.querySelectorAll("[data-exercise-filter]").forEach((e) => {
    e.addEventListener("click", () => {
      ((exerciseView.category = e.dataset.exerciseFilter),
        setActiveStudyButton("[data-exercise-filter]", e),
        applyExerciseFilters());
    });
  });
  document.querySelectorAll("[data-exercise-status]").forEach((e) => {
    e.addEventListener("click", () => {
      ((exerciseView.status = e.dataset.exerciseStatus),
        setActiveStudyButton("[data-exercise-status]", e),
        applyExerciseFilters());
    });
  });
  const e = document.getElementById("exercise-search");
  e &&
    e.addEventListener("input", () => {
      ((exerciseView.search = e.value), applyExerciseFilters());
    });
  const t = document.getElementById("exercise-level");
  t &&
    t.addEventListener("change", () => {
      ((exerciseView.level = t.value), applyExerciseFilters());
    });
}
function updateLearningProgress() {
  const e = state.lessonsCompleted || [],
    t = Object.keys(LESSONS).length,
    a = Math.round((e.length / t) * 100),
    n = document.getElementById("learning-progress-text"),
    o = document.getElementById("learning-progress-bar"),
    r = document.getElementById("learning-progress-detail"),
    s = document.getElementById("learning-completed-stat"),
    l = document.getElementById("learning-pending-stat"),
    i = document.getElementById("learning-xp-stat"),
    c = e.reduce((e, t) => e + ((LESSONS[t] && LESSONS[t].xp) || 0), 0);
  (n && (n.textContent = a + "%"),
    o && (o.style.width = a + "%"),
    r && (r.textContent = `${e.length} de ${t} lecciones completadas`),
    s && (s.textContent = e.length),
    l && (l.textContent = Math.max(0, t - e.length)),
    i && (i.textContent = c + " XP"),
    document.querySelectorAll("[data-lesson-card]").forEach((t) => {
      const a = t.dataset.lessonId,
        n = e.includes(a),
        o = t.querySelector(".lesson-btn"),
        r = t.querySelector(".lesson-meta");
      let s = r && r.querySelector(".activity-state-badge");
      (t.classList.toggle("completed", n),
        o && (o.textContent = n ? "✓ Repasar" : "Comenzar"),
        r &&
          !s &&
          ((s = document.createElement("span")),
          (s.className = "badge activity-state-badge"),
          r.appendChild(s)),
        s &&
          ((s.textContent = n ? "Completada" : "Pendiente"),
          s.classList.toggle("is-complete", n)));
    }),
    updateLearningRecommendation(),
    applyLearningFilters());
}
function updateExerciseDashboard() {
  const e = state.exerciseStats || {
      solved: [],
      firstTry: 0,
      attempts: 0,
      streak: 0,
      bestStreak: 0,
    },
    t = document.getElementById("exercise-total-stat"),
    a = document.getElementById("exercise-correct-stat"),
    n = document.getElementById("exercise-streak-stat"),
    o = document.getElementById("exercise-best-stat");
  if (
    (t &&
      (t.textContent =
        (e.solved || []).length + "/" + Object.keys(EXERCISES).length),
    a)
  ) {
    const t = e.attempts ? Math.round((e.firstTry / e.attempts) * 100) : 0;
    a.textContent = t + "%";
  }
  (n && (n.textContent = (e.streak || 0) + " 🔥"),
    o && (o.textContent = e.bestStreak || 0),
    document.querySelectorAll("[data-exercise-card]").forEach((t) => {
      const a = t.dataset.exerciseId,
        n = (e.solved || []).includes(a),
        o = t.querySelector(".exercise-start"),
        r = t.querySelector(".exercise-meta");
      let s = r && r.querySelector(".activity-state-badge");
      (t.classList.toggle("completed", n),
        o && (o.textContent = n ? "Repasar" : "Resolver"),
        r &&
          !s &&
          ((s = document.createElement("span")),
          (s.className = "badge activity-state-badge"),
          r.appendChild(s)),
        s &&
          ((s.textContent = n ? "Resuelto" : "Pendiente"),
          s.classList.toggle("is-complete", n)));
    }),
    updateExerciseRecommendation(),
    applyExerciseFilters());
}
function ensureLearningState() {
  (Array.isArray(state.lessonsCompleted) ||
    (state.lessonsCompleted = []),
    state.exerciseStats && "object" == typeof state.exerciseStats ||
      (state.exerciseStats = {}),
    Array.isArray(state.exerciseStats.solved) ||
      (state.exerciseStats.solved = []),
    Number.isFinite(state.exerciseStats.firstTry) ||
      (state.exerciseStats.firstTry = 0),
    Number.isFinite(state.exerciseStats.attempts) ||
      (state.exerciseStats.attempts = 0),
    Number.isFinite(state.exerciseStats.streak) ||
      (state.exerciseStats.streak = 0),
    Number.isFinite(state.exerciseStats.bestStreak) ||
      (state.exerciseStats.bestStreak = 0),
    state.exerciseStats.timedBest &&
      "object" == typeof state.exerciseStats.timedBest ||
      (state.exerciseStats.timedBest = {}),
    [30, 45, 60, 90].includes(state.exerciseStats.timerSeconds) ||
      (state.exerciseStats.timerSeconds = 45));
}
function renderBoardGrid(e, t, a = {}) {
  e.innerHTML = "";
  for (let n = 0; n < 8; n++)
    for (let o = 0; o < 8; o++) {
      const r = FILES[o] + (8 - n),
        s = document.createElement("div");
      ((s.className = "square " + ((n + o) % 2 ? "dark" : "light")),
        (s.dataset.square = r),
        a.selected === r && s.classList.add("selected"),
        a.highlight &&
          a.highlight.includes(r) &&
          s.classList.add("diagram-highlight"));
      const l = t[n][o];
      if (l) {
        const e = document.createElement("div");
        ((e.className =
          "piece " + ("w" === l.color ? "piece-white" : "piece-black")),
          (e.textContent = PIECES[l.color + l.type.toUpperCase()]),
          s.appendChild(e));
      }
      (a.onClick && s.addEventListener("click", () => a.onClick(r)),
        e.appendChild(s));
    }
}
function fenBoardToMatrix(e) {
  const t = e.split(" ")[0].split("/"),
    a = [];
  for (let e = 0; e < 8; e++) {
    const n = [];
    for (const a of t[e])
      if (/\d/.test(a)) for (let e = 0; e < parseInt(a, 10); e++) n.push(null);
      else
        n.push({
          color: a === a.toUpperCase() ? "w" : "b",
          type: a.toLowerCase(),
        });
    a.push(n);
  }
  return a;
}
function createPuzzleBoard(e) {
  const t = { chess: null, selected: null, solvedOrFailed: !1, onResult: null };
  function a() {
    renderBoardGrid(e, t.chess.board(), { selected: t.selected, onClick: n });
  }
  async function n(e) {
    if (t.solvedOrFailed) return;
    const n = t.chess.get(e);
    if (t.selected === e) return ((t.selected = null), void a());
    if (t.selected) {
      const n = t.selected;
      let o = "q";
      if (isPromotionMove(t.chess, n, e)) {
        const e = t.chess.turn();
        ((t.selected = null), a(), (o = await askPromotion(e)));
      }
      const r = { from: n, to: e, promotion: o },
        s = n + e;
      return (
        (t.selected = null),
        void (function (e, a) {
          t.onAttempt && t.onAttempt(e, a);
        })(s, r)
      );
    }
    n && n.color === t.chess.turn() && ((t.selected = e), a());
  }
  return (
    (t.load = function (e) {
      ((t.chess = new Chess(e)),
        (t.selected = null),
        (t.solvedOrFailed = !1),
        a());
    }),
    (t.draw = a),
    (t.flash = function (t, a) {
      const n = e.querySelector(`[data-square="${t}"]`);
      n && (n.classList.add(a), setTimeout(() => n.classList.remove(a), 500));
    }),
    t
  );
}
(ensureLearningState(), wireLearningControls(), wireExerciseControls());
const lessonBoardCtx = createPuzzleBoard(
    document.getElementById("lesson-puzzle-board"),
  ),
  exerciseBoardCtx = createPuzzleBoard(
    document.getElementById("exercise-puzzle-board"),
  );
function makeSequenceRunner(e, t, a) {
  const n = {
    stepIndex: 0,
    resolved: !1,
    failedOnce: !1,
    puzzle: null,
    start: function (o) {
      ((n.puzzle = o),
        (n.stepIndex = 0),
        (n.resolved = !1),
        (n.failedOnce = !1),
        e.load(o.fen),
        (e.solvedOrFailed = !1),
        (t.textContent = ""),
        (t.className = "puzzle-feedback"),
        a && (a.style.display = "none"));
    },
    isLastPlayerStep: function () {
      const e = n.puzzle.sequence;
      return !e || n.stepIndex === e.length - 1;
    },
    attempt: function (o, r, s) {
      const { onSolved: l, onWrong: i } = s || {};
      if (n.resolved || e.solvedOrFailed) return;
      const c = new Chess(e.chess.fen());
      if (!c.move(r)) return void e.draw();
      const d = n.puzzle,
        u = n.isLastPlayerStep();
      let m;
      if (d.sequence) {
        const e = d.sequence[n.stepIndex];
        m = u && d.checkmate ? c.in_checkmate() : o === e;
      } else m = d.checkmate ? c.in_checkmate() : d.solution.includes(o);
      if (!m) {
        (e.draw(),
          e.flash(r.to, "wrong-flash"),
          (t.textContent = "❌ " + d.fail),
          (t.className = "puzzle-feedback wrong"),
          a && (a.style.display = ""));
        const o = !n.failedOnce;
        return ((n.failedOnce = !0), void (i && i(o)));
      }
      if (((e.chess = c), e.draw(), e.flash(r.to, "solved-flash"), u))
        return (
          (n.resolved = !0),
          (e.solvedOrFailed = !0),
          (t.textContent = "✅ " + d.success),
          (t.className = "puzzle-feedback correct"),
          void (l && l())
        );
      ((t.textContent =
        "✅ " +
        (d.midMessage || "¡Bien! El rival responde. Seguí calculando.")),
        (t.className = "puzzle-feedback correct"),
        (e.solvedOrFailed = !0));
      const p = d.sequence[n.stepIndex + 1],
        g = p.slice(0, 2),
        f = p.slice(2, 4);
      setTimeout(() => {
        const t = new Chess(e.chess.fen());
        (t.move({ from: g, to: f, promotion: "q" }),
          (e.chess = t),
          e.draw(),
          e.flash(f, "opponent-flash"),
          (e.solvedOrFailed = !1),
          (n.stepIndex += 2));
      }, 700);
    },
  };
  return n;
}
let currentLessonId = null,
  lessonPuzzleSolved = !1;
const lessonRunner = makeSequenceRunner(
  lessonBoardCtx,
  document.getElementById("lesson-puzzle-feedback"),
  document.getElementById("lesson-puzzle-retry"),
);
function checklistAllChecked() {
  const e = document.querySelectorAll("#lesson-modal .lesson-check");
  return Array.from(e).every((e) => e.checked);
}
function refreshLessonCompleteButton() {
  const e = document.getElementById("lesson-complete");
  if (e)
    return (state.lessonsCompleted || []).includes(String(currentLessonId))
      ? ((e.disabled = !0), void (e.textContent = "✓ Lección completada"))
      : ((e.textContent = "✓ Marcar como completada"),
        void (e.disabled = !(lessonPuzzleSolved && checklistAllChecked())));
}
function renderMiniDiagrams(e) {
  e.querySelectorAll(".mini-diagram[data-fen]").forEach((e) => {
    const t = (e.dataset.highlight || "").split(",").filter(Boolean),
      a = document.createElement("div");
    ((a.className = "board mini-diagram-board"),
      renderBoardGrid(a, fenBoardToMatrix(e.dataset.fen), { highlight: t }),
      (e.innerHTML = ""),
      e.appendChild(a));
  });
}
function openLessonModal(e) {
  const t = LESSONS[e];
  if (!t) return;
  ((currentLessonId = e),
    (lessonPuzzleSolved = (state.lessonsCompleted || []).includes(String(e))));
  const a = document.querySelector(`[data-lesson-card][data-lesson-id="${e}"]`),
    n = a ? a.querySelector("h3").textContent : "Lección";
  ((document.getElementById("lesson-modal-category").textContent =
    "📚 " + (LESSON_CATEGORY_LABEL[t.category] || "Lección")),
    (document.getElementById("lesson-title").textContent = n));
  const lessonIds = Object.keys(LESSONS),
    lessonIndex = lessonIds.indexOf(String(e)),
    lessonPosition = document.getElementById("lesson-modal-position"),
    previousButton = document.getElementById("lesson-previous"),
    nextButton = document.getElementById("lesson-next");
  (lessonPosition &&
      (lessonPosition.textContent = `Lección ${lessonIndex + 1} de ${lessonIds.length}`),
    previousButton && (previousButton.disabled = lessonIndex <= 0),
    nextButton && (nextButton.disabled = lessonIndex >= lessonIds.length - 1));
  const o = document.getElementById("lesson-content");
  ((o.innerHTML = t.content),
    renderMiniDiagrams(o),
    document.querySelectorAll("#lesson-modal .lesson-check").forEach((e) => {
      ((e.checked = lessonPuzzleSolved),
        (e.onchange = refreshLessonCompleteButton));
    }),
    (document.getElementById("lesson-puzzle-prompt").textContent =
      t.puzzle.prompt),
    lessonRunner.start(t.puzzle));
  const r = document.getElementById("lesson-puzzle-feedback");
  (lessonPuzzleSolved &&
    ((lessonBoardCtx.solvedOrFailed = !0),
    (r.textContent = "✓ Ya resolviste esta posición."),
    r.classList.add("correct")),
    (lessonBoardCtx.onAttempt = function (e, t) {
      lessonPuzzleSolved ||
        (lessonRunner.attempt(e, t, {
          onSolved: () => {
            ((lessonPuzzleSolved = !0), refreshLessonCompleteButton());
          },
        }),
        refreshLessonCompleteButton());
    }),
    refreshLessonCompleteButton(),
    (document.getElementById("lesson-modal").style.display = "flex"));
}
function closeLessonModal() {
  ((document.getElementById("lesson-modal").style.display = "none"),
    (currentLessonId = null));
}
(document.querySelectorAll(".lesson-btn").forEach((e) => {
  e.addEventListener("click", () => openLessonModal(e.dataset.lesson));
}),
  document
    .getElementById("lesson-close")
    .addEventListener("click", closeLessonModal),
  document
    .getElementById("lesson-previous")
    .addEventListener("click", () => {
      const e = Object.keys(LESSONS),
        t = e.indexOf(String(currentLessonId));
      t > 0 && openLessonModal(e[t - 1]);
    }),
  document.getElementById("lesson-next").addEventListener("click", () => {
    const e = Object.keys(LESSONS),
      t = e.indexOf(String(currentLessonId));
    t >= 0 && t < e.length - 1 && openLessonModal(e[t + 1]);
  }),
  document.getElementById("lesson-modal").addEventListener("click", (e) => {
    "lesson-modal" === e.target.id && closeLessonModal();
  }),
  document
    .getElementById("lesson-puzzle-hint")
    .addEventListener("click", () => {
      const e = LESSONS[currentLessonId];
      e && toast("💡 " + e.puzzle.hint);
    }),
  document
    .getElementById("lesson-puzzle-retry")
    .addEventListener("click", () => {
      const e = LESSONS[currentLessonId];
      e && lessonRunner.start(e.puzzle);
    }),
  document.getElementById("lesson-complete").addEventListener("click", () => {
    if (!currentLessonId) return;
    const e = LESSONS[currentLessonId],
      t = String(currentLessonId);
    (state.lessonsCompleted || []).includes(t) ||
      (state.lessonsCompleted.push(t),
      save(),
      addXP(e.xp, "Lección completada", "Completada"),
      updateLearningProgress(),
      refreshLessonCompleteButton());
  }));
let currentExerciseId = null,
  exerciseAttemptCounted = !1;
const exerciseRunner = makeSequenceRunner(
  exerciseBoardCtx,
  document.getElementById("puzzle-feedback"),
  document.getElementById("exercise-puzzle-retry"),
);
const exerciseTimedMode = {
  enabled: !1,
  applies: !1,
  duration: 45,
  remaining: 0,
  intervalId: null,
};
function getNextTacticalExerciseId(e = null) {
  const t = Object.keys(EXERCISES).filter(
      (e) => "tactica" === EXERCISES[e].category,
    ),
    a = (state.exerciseStats && state.exerciseStats.solved) || [],
    n = null == e ? -1 : t.indexOf(String(e));
  for (let e = 1; e <= t.length; e++) {
    const o = t[(Math.max(-1, n) + e) % t.length];
    if (!a.includes(String(o))) return o;
  }
  return t[(Math.max(-1, n) + 1) % t.length] || null;
}
function formatExerciseTime(e) {
  const t = Math.max(0, Math.ceil(e));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function updateTimedModeControls() {
  const e = document.getElementById("exercise-timed-panel"),
    t = document.getElementById("exercise-timed-status"),
    a = document.getElementById("exercise-timer-start"),
    n = document.getElementById("exercise-timer-stop"),
    o = document.getElementById("exercise-timer-seconds");
  (e && e.classList.toggle("active", exerciseTimedMode.enabled),
    t &&
      (t.textContent = exerciseTimedMode.enabled
        ? `Activo · ${exerciseTimedMode.duration} segundos por táctica`
        : "Inactivo"),
    a && (a.style.display = exerciseTimedMode.enabled ? "none" : ""),
    n && (n.style.display = exerciseTimedMode.enabled ? "" : "none"),
    o && (o.disabled = exerciseTimedMode.enabled));
}
function stopExerciseCountdown(e = !1) {
  (exerciseTimedMode.intervalId &&
    clearInterval(exerciseTimedMode.intervalId),
    (exerciseTimedMode.intervalId = null),
    (exerciseTimedMode.applies = !1));
  const t = document.getElementById("exercise-timer");
  e && t && (t.style.display = "none");
}
function renderExerciseCountdown() {
  const e = document.getElementById("exercise-timer"),
    t = document.getElementById("exercise-timer-text"),
    a = document.getElementById("exercise-timer-bar"),
    n = exerciseTimedMode.duration
      ? (exerciseTimedMode.remaining / exerciseTimedMode.duration) * 100
      : 0;
  (t && (t.textContent = formatExerciseTime(exerciseTimedMode.remaining)),
    a && (a.style.width = Math.max(0, n) + "%"),
    e &&
      (e.classList.toggle("warning", n <= 40 && n > 18),
      e.classList.toggle("danger", n <= 18)));
}
function countExerciseFailure(e) {
  ensureLearningState();
  const t = state.exerciseStats,
    a = String(e);
  (t.solved || []).includes(a) ||
    exerciseAttemptCounted ||
    ((t.attempts = (t.attempts || 0) + 1),
    (exerciseAttemptCounted = !0),
    (t.streak = 0),
    save(),
    (document.getElementById("exercise-modal-streak").textContent =
      "🔥 Racha: 0"),
    updateExerciseDashboard());
}
function expireTimedExercise() {
  if (!exerciseTimedMode.applies || !currentExerciseId) return;
  (stopExerciseCountdown(),
    (exerciseTimedMode.remaining = 0),
    renderExerciseCountdown(),
    (exerciseBoardCtx.solvedOrFailed = !0),
    (exerciseRunner.resolved = !0));
  const e = document.getElementById("puzzle-feedback"),
    t = document.getElementById("exercise-result-text");
  (e &&
    ((e.textContent = "⏱ Tiempo agotado. Revisá la posición y volvé a intentarlo."),
    (e.className = "puzzle-feedback wrong")),
    (document.getElementById("exercise-puzzle-retry").style.display = ""),
    (document.getElementById("exercise-result-score").textContent = "0/1"),
    t &&
      (t.textContent =
        "El tiempo terminó. Podés reintentar o pasar a la siguiente táctica."),
    (document.getElementById("exercise-result").style.display = ""),
    (document.getElementById("exercise-next").style.display = ""),
    countExerciseFailure(currentExerciseId));
}
function startExerciseCountdown(e) {
  stopExerciseCountdown(!0);
  const t = EXERCISES[e],
    a = document.getElementById("exercise-timer"),
    n = document.getElementById("exercise-timer-best");
  if (!exerciseTimedMode.enabled || !t || "tactica" !== t.category) return;
  (ensureLearningState(),
    (exerciseTimedMode.applies = !0),
    (exerciseTimedMode.remaining = exerciseTimedMode.duration),
    a && (a.style.display = ""));
  const o = state.exerciseStats.timedBest[String(e)];
  (n &&
    (n.textContent = o
      ? `Mejor marca: ${o} s`
      : "Sin marca anterior"),
    renderExerciseCountdown(),
    (exerciseTimedMode.intervalId = setInterval(() => {
      (exerciseTimedMode.remaining--,
        renderExerciseCountdown(),
        exerciseTimedMode.remaining <= 0 && expireTimedExercise());
    }, 1e3)));
}
function finishExerciseCountdown(e) {
  if (!exerciseTimedMode.applies) return null;
  const t = Math.max(
      1,
      exerciseTimedMode.duration - exerciseTimedMode.remaining,
    ),
    a = state.exerciseStats.timedBest[String(e)],
    n = !a || t < a;
  return (
    exerciseTimedMode.intervalId &&
      clearInterval(exerciseTimedMode.intervalId),
    (exerciseTimedMode.intervalId = null),
    (exerciseTimedMode.applies = !1),
    n && (state.exerciseStats.timedBest[String(e)] = t),
    save(),
    { seconds: t, isBest: n, previousBest: a || null }
  );
}
function enableTimedTraining() {
  ensureLearningState();
  const e = document.getElementById("exercise-timer-seconds"),
    t = Number(e && e.value);
  ((exerciseTimedMode.duration = [30, 45, 60, 90].includes(t) ? t : 45),
    (exerciseTimedMode.enabled = !0),
    (state.exerciseStats.timerSeconds = exerciseTimedMode.duration),
    save(),
    updateTimedModeControls());
  const a = document.querySelector('[data-exercise-filter="tactica"]');
  (a && a.click(), openExerciseModal(getNextTacticalExerciseId()));
}
function disableTimedTraining() {
  (stopExerciseCountdown(!0),
    (exerciseTimedMode.enabled = !1),
    updateTimedModeControls());
}
function openExerciseModal(e) {
  const t = EXERCISES[e];
  if (!t) return;
  ((currentExerciseId = e), (exerciseAttemptCounted = !1));
  const a = document.querySelector(
      `[data-exercise-card][data-exercise-id="${e}"]`,
    ),
    n = a ? a.querySelector("h3").textContent : "Ejercicio";
  ((document.getElementById("exercise-modal-category").textContent =
    "⚡ " + (EXERCISE_CATEGORY_LABEL[t.category] || "Ejercicio")),
    (document.getElementById("exercise-modal-title").textContent = n),
    (document.getElementById("exercise-modal-position").textContent =
      `Ejercicio ${Object.keys(EXERCISES).indexOf(String(e)) + 1} de ${Object.keys(EXERCISES).length}`),
    (document.getElementById("exercise-modal-streak").textContent =
      "🔥 Racha: " +
      ((state.exerciseStats && state.exerciseStats.streak) || 0)),
    (document.getElementById("exercise-question").textContent = t.prompt),
    (document.getElementById("exercise-result").style.display = "none"),
    (document.getElementById("exercise-next").style.display = "none"),
    exerciseRunner.start(t),
    startExerciseCountdown(e),
    (exerciseBoardCtx.onAttempt = function (a, n) {
      exerciseRunner.attempt(a, n, {
        onSolved: () => {
          ensureLearningState();
          const a = state.exerciseStats,
            n = String(e),
            o = (a.solved || []).includes(n),
            r = finishExerciseCountdown(e);
          (o ||
            (exerciseAttemptCounted ||
              ((a.attempts = (a.attempts || 0) + 1),
              (exerciseAttemptCounted = !0)),
            exerciseRunner.failedOnce
              ? (a.streak = 0)
              : ((a.firstTry = (a.firstTry || 0) + 1),
                (a.streak = (a.streak || 0) + 1),
                (a.bestStreak = Math.max(a.bestStreak || 0, a.streak))),
            (a.solved = a.solved || []),
            a.solved.push(n),
            save(),
            addXP(t.xp, "Ejercicio resuelto", "Correcto")),
            (document.getElementById("exercise-modal-streak").textContent =
              "🔥 Racha: " + a.streak),
            (document.getElementById("exercise-result-score").textContent =
              "1/1"),
            (document.getElementById("exercise-result-text").textContent = o
              ? "Ya habías resuelto este ejercicio antes. ¡Repaso completado!"
              : `¡Resuelto! Ganaste ${t.xp} XP.`),
            r &&
              (document.getElementById("exercise-result-text").textContent +=
                ` Tiempo: ${r.seconds} s${r.isBest ? " · nueva mejor marca." : "."}`),
            (document.getElementById("exercise-result").style.display = ""),
            (document.getElementById("exercise-next").style.display = ""),
            updateExerciseDashboard());
        },
        onWrong: (t) => {
          t && countExerciseFailure(e);
        },
      });
    }),
    (document.getElementById("exercise-modal").style.display = "flex"));
}
function closeExerciseModal() {
  (stopExerciseCountdown(!0),
    (document.getElementById("exercise-modal").style.display = "none"),
    (currentExerciseId = null));
}
(document.querySelectorAll(".exercise-start").forEach((e) => {
  e.addEventListener("click", () => openExerciseModal(e.dataset.exercise));
}),
  document
    .getElementById("exercise-close")
    .addEventListener("click", closeExerciseModal),
  document.getElementById("exercise-next").addEventListener("click", () => {
    const e = exerciseTimedMode.enabled
      ? getNextTacticalExerciseId(currentExerciseId)
      : getRecommendedExerciseId(currentExerciseId);
    e && openExerciseModal(e);
  }),
  document.getElementById("exercise-modal").addEventListener("click", (e) => {
    "exercise-modal" === e.target.id && closeExerciseModal();
  }),
  document
    .getElementById("exercise-puzzle-hint")
    .addEventListener("click", () => {
      const e = EXERCISES[currentExerciseId];
      e && toast("💡 " + e.hint);
    }),
  document
    .getElementById("exercise-puzzle-retry")
    .addEventListener("click", () => {
      const e = EXERCISES[currentExerciseId];
      e &&
        ((document.getElementById("exercise-result").style.display = "none"),
        (document.getElementById("exercise-next").style.display = "none"),
        exerciseRunner.start(e),
        startExerciseCountdown(currentExerciseId));
    }),
  document
    .getElementById("exercise-timer-start")
    .addEventListener("click", enableTimedTraining),
  document
    .getElementById("exercise-timer-stop")
    .addEventListener("click", disableTimedTraining),
  (exerciseTimedMode.duration = state.exerciseStats.timerSeconds || 45),
  (document.getElementById("exercise-timer-seconds").value =
    String(exerciseTimedMode.duration)),
  updateTimedModeControls(),
  updateLearningProgress(),
  updateExerciseDashboard());
