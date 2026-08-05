// Ejemplo de preguntas de la trivia
const preguntas = [
    {
        pregunta: "¿Qué tipo de energía produce la Usina CEMDO I?",
        respuestas: ["Energía solar", "Energía eólica", "Energía hidráulica"],
        correcta: 0
    },
    {
        pregunta: "¿Dónde se encuentra la Usina Solar CEMDO I?",
        respuestas: ["Villa Dolores", "Córdoba Capital", "Mendoza"],
        correcta: 0
    },
    {
        pregunta: "¿Cuál es uno de los beneficios ambientales?",
        respuestas: ["Reducción de CO₂", "Mayor contaminación", "Uso de carbón"],
        correcta: 0
    }
];

let indicePregunta = 0;
let puntaje = 0;

const preguntaEl = document.getElementById("pregunta");
const respuestasEl = document.getElementById("respuestas");
const feedbackEl = document.getElementById("feedback");
const puntajeEl = document.getElementById("puntaje");
const reiniciarBtn = document.getElementById("reiniciarTrivia");

// Función para mostrar pregunta
function mostrarPregunta() {
    const preguntaActual = preguntas[indicePregunta];
    preguntaEl.textContent = preguntaActual.pregunta;
    respuestasEl.innerHTML = "";
    feedbackEl.textContent = "";

    preguntaActual.respuestas.forEach((resp, i) => {
        const btn = document.createElement("button");
        btn.textContent = resp;
        btn.className = "respuesta-btn";
        btn.addEventListener("click", () => verificarRespuesta(i));
        respuestasEl.appendChild(btn);
    });
}

// Función para verificar respuesta
function verificarRespuesta(indice) {
    const correcta = preguntas[indicePregunta].correcta;
    if (indice === correcta) {
        feedbackEl.textContent = "¡Correcto!";
        feedbackEl.style.color = "green";
        puntaje++;
    } else {
        feedbackEl.textContent = "Incorrecto.";
        feedbackEl.style.color = "red";
    }

    indicePregunta++;
    if (indicePregunta < preguntas.length) {
        setTimeout(mostrarPregunta, 1000);
    } else {
        setTimeout(() => {
            preguntaEl.textContent = "Trivia finalizada.";
            respuestasEl.innerHTML = "";
            feedbackEl.textContent = "";
            puntajeEl.textContent = `Tu puntaje: ${puntaje} de ${preguntas.length}`;
        }, 1000);
    }
}

// Función para reiniciar trivia
reiniciarBtn.addEventListener("click", () => {
    indicePregunta = 0;
    puntaje = 0;
    puntajeEl.textContent = "";
    mostrarPregunta();
});

// Iniciar trivia
mostrarPregunta();

// ===== Mapa Leaflet =====
const mapa = L.map('mapa').setView([-31.9456, -65.1697], 13); // Coordenadas aproximadas de Villa Dolores

// Capa de mapa base (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mapa);

// Marcador de la Usina Solar
const marcador = L.marker([-31.9456, -65.1697]).addTo(mapa);
marcador.bindPopup("<b>Usina Solar CEMDO I</b><br>Villa Dolores, Córdoba").openPopup();
