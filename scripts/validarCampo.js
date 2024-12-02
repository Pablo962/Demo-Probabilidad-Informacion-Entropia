import { PALABRAS, obtenerPalabraAleatoria, existePalabra } from './palabras.js';
import { calcularProbabilidades, calcularInformacion, calcularEntropia } from './calculos.js';

document.addEventListener('DOMContentLoaded', function() {
    // Variables para el tema
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Variables para el input y tablero
    const input = document.querySelector('.palabra-input');
    const borrarBtn = document.querySelector('#borrar-btn');
    const confirmarBtn = document.querySelector('#confirmar-btn');
    const filas = document.querySelectorAll('.tablero-row');
    let filaActual = 0;

    // Palabra objetivo que el jugador debe adivinar
    let palabraObjetivo = obtenerPalabraAleatoria();
    console.log('Palabra a adivinar:', palabraObjetivo); // Para testing

    // Función para reiniciar el juego
    function reiniciarJuego() {
        // Obtener nueva palabra objetivo
        palabraObjetivo = obtenerPalabraAleatoria();
        console.log('Nueva palabra a adivinar:', palabraObjetivo);
        
        // Reiniciar fila actual
        filaActual = 0;
        
        // Habilitar controles
        input.disabled = false;
        confirmarBtn.disabled = true;
        borrarBtn.disabled = false;
        input.value = '';
        input.classList.remove('is-invalid');
        
        // Limpiar todas las celdas
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('.tablero-celda');
            celdas.forEach(celda => {
                celda.textContent = '';
                celda.classList.remove('celda-correcta', 'celda-presente', 'celda-incorrecta');
            });
        });

        // Ocultar palabra correcta
        document.querySelector('.palabra-correcta-container').style.display = 'none';
        document.getElementById('palabra-correcta').textContent = '';

        // Limpiar estadísticas
        ['probabilidades-container', 'informacion-container', 'entropia-container'].forEach(id => {
            document.getElementById(id).innerHTML = '';
        });

        // Ocultar mensaje de error si está visible
        document.querySelector('.invalid-feedback').style.display = 'none';

        // Enfocar el input
        input.focus();

        // Reset chart
        if (probabilityChart) {
            probabilityChart.data.labels = [];
            probabilityChart.data.datasets[0].data = [];
            probabilityChart.update();
        }
    }

    // Función para cambiar el tema
    themeToggle.addEventListener('click', function() {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', newTheme);
        
        // Cambiar el ícono
        if (newTheme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        
        // Guardar en localStorage
        localStorage.setItem('theme', newTheme);
    });

    // Cargar tema guardado
    window.addEventListener('load', () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        
        if (savedTheme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    });

    // Validación del input
    input.addEventListener('input', function() {
        // Convertir a mayúsculas
        this.value = this.value.toUpperCase();
        
        // Solo permitir letras
        this.value = this.value.replace(/[^A-Z]/g, '');
        
        // Validar longitud
        if (this.value.length === 5) {
            this.classList.remove('is-invalid');
            confirmarBtn.disabled = false;
        } else {
            confirmarBtn.disabled = true;
        }
    });

    // Modificar el event listener del input para el Enter
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevenir el comportamiento por defecto
            if (this.value.length === 5) {
                confirmarBtn.click();
            }
        } else if (e.key === 'Escape') { // Opcional: agregar tecla Escape para borrar
            borrarBtn.click();
        }
    });

    // Función para borrar input
    borrarBtn.addEventListener('click', function() {
        input.value = '';
        input.classList.remove('is-invalid');
        confirmarBtn.disabled = true;
        document.querySelector('.invalid-feedback').style.display = 'none';
        input.focus(); // Mantener el foco en el input
    });

    // Modificar la función de obtener palabras coincidentes
    function obtenerPalabrasCoincidentes(letrasCorrectas, letrasPresentes, palabraIntentada, letrasIncorrectas) {
        return PALABRAS.filter(palabra => {
            // Skip tried word
            if (palabra === palabraIntentada) return false;
    
            // Check correct positions
            for (const [pos, letra] of Object.entries(letrasCorrectas)) {
                if (palabra[pos] !== letra) return false;
            }
    
            // Check present letters
            for (const [letra, cantidad] of Object.entries(letrasPresentes)) {
                const cantidadEnPalabra = (palabra.match(new RegExp(letra, 'g')) || []).length;
                if (cantidadEnPalabra < cantidad) return false;
            }
    
            // Check incorrect letters
            for (const letra in letrasIncorrectas) {
                // Allow letter if it's marked as correct or present
                if (Object.values(letrasCorrectas).includes(letra) || letra in letrasPresentes) continue;
                if (palabra.includes(letra)) return false;
            }
    
            return true;
        });
    }

    // Función para contar ocurrencias de letras en una palabra
    function contarLetras(palabra) {
        return palabra.split('').reduce((acc, letra) => {
            acc[letra] = (acc[letra] || 0) + 1;
            return acc;
        }, {});
    }

    // Función para mostrar palabras en ternas con información adicional
    function mostrarPalabrasCoincidentes(palabras) {
        const container = document.getElementById('lista-palabras-coincidentes');
        container.innerHTML = '';

        if (palabras.length === 0) {
            container.innerHTML = '<div class="no-coincidencias">No hay palabras coincidentes</div>';
            return;
        }

        // Crear grupos de tres palabras
        for (let i = 0; i < palabras.length; i += 3) {
            const terna = document.createElement('div');
            terna.className = 'palabra-terna';
            
            const palabrasTerna = palabras.slice(i, i + 3);
            terna.textContent = palabrasTerna.join(' - ');
            
            container.appendChild(terna);
        }
    }

    function actualizarEstadisticas(palabrasCoincidentes) {
        const resultados = calcularProbabilidades(palabrasCoincidentes);
        
        // Update display containers
        actualizarProbabilidades(resultados.porPalabra);
        actualizarInformacion(resultados.porPosicion);
        actualizarEntropia(resultados.porPosicion);
        
        // Update chart
        updateChart(resultados.porPalabra);
    }
    
    function actualizarProbabilidades(probabilidades) {
        const container = document.getElementById('probabilidades-container');
        container.innerHTML = Array.from(probabilidades.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([palabra, prob]) => `
                <div class="resultado-item">
                    <div class="resultado-label">${palabra}</div>
                    <div class="resultado-valor">${(prob * 100).toFixed(2)}%</div>
                </div>
            `).join('');
    }
    
    function actualizarInformacion(probabilidadesPorPosicion) {
        const informacion = calcularInformacion(probabilidadesPorPosicion);
        const container = document.getElementById('informacion-container');
        container.innerHTML = informacion.map((posInfo, pos) => `
            <div class="resultado-item">
                <div class="resultado-label">Posición ${pos + 1}</div>
                <div class="resultado-valor">${Object.values(posInfo).reduce((a, b) => a + b, 0).toFixed(2)} bits</div>
            </div>
        `).join('');
    }
    
    function actualizarEntropia(probabilidadesPorPosicion) {
        const entropia = calcularEntropia(probabilidadesPorPosicion);
        const container = document.getElementById('entropia-container');
        container.innerHTML = entropia.map((valor, pos) => `
            <div class="resultado-item">
                <div class="resultado-label">Posición ${pos + 1}</div>
                <div class="resultado-valor">${valor.toFixed(2)} bits</div>
            </div>
        `).join('');
    }

    // Modificar el event listener del botón confirmar
    function procesarIntento(palabra) {
        if (filaActual >= filas.length) return false;
        
        const celdas = filas[filaActual].querySelectorAll('.tablero-celda');
        const letrasCorrectas = {};
        const letrasPresentes = {};
        const letrasIncorrectas = {};
        const letrasObjetivo = new Map();
        
        // Count target word letters
        palabraObjetivo.split('').forEach(letra => {
            letrasObjetivo.set(letra, (letrasObjetivo.get(letra) || 0) + 1);
        });
    
        // First pass: Mark correct letters (green)
        palabra.split('').forEach((letra, pos) => {
            celdas[pos].textContent = letra;
            
            if (letra === palabraObjetivo[pos]) {
                celdas[pos].classList.add('celda-correcta');
                letrasCorrectas[pos] = letra;
                const count = letrasObjetivo.get(letra);
                letrasObjetivo.set(letra, count - 1);
            }
        });
    
        // Second pass: Mark present and incorrect letters
        palabra.split('').forEach((letra, pos) => {
            if (letra !== palabraObjetivo[pos]) {
                const remaining = letrasObjetivo.get(letra);
                if (remaining > 0) {
                    celdas[pos].classList.add('celda-presente');
                    letrasPresentes[letra] = (letrasPresentes[letra] || 0) + 1;
                    letrasObjetivo.set(letra, remaining - 1);
                } else {
                    celdas[pos].classList.add('celda-incorrecta');
                    letrasIncorrectas[letra] = true;
                }
            }
        });
    
        filaActual++;
        return {
            letrasCorrectas,
            letrasPresentes,
            letrasIncorrectas,
            esGanador: palabra === palabraObjetivo,
            esFinal: filaActual >= filas.length
        };
    }

    confirmarBtn.addEventListener('click', function() {
        const palabra = input.value.toUpperCase();
        
        // Validate input
        if (palabra.length !== 5 || !existePalabra(palabra)) {
            input.classList.add('is-invalid');
            document.querySelector('.invalid-feedback').style.display = 'block';
            return;
        }

        // Process attempt
        const resultado = procesarIntento(palabra);
        if (!resultado) return;

        // Update stats
        const palabrasCoincidentes = obtenerPalabrasCoincidentes(
            resultado.letrasCorrectas,
            resultado.letrasPresentes,
            palabra,
            resultado.letrasIncorrectas
        );

        // Update UI
        document.getElementById('palabras-coincidentes').textContent = palabrasCoincidentes.length;
        actualizarEstadisticas(palabrasCoincidentes);

        // Clear input
        input.value = '';
        input.classList.remove('is-invalid');
        confirmarBtn.disabled = true;
        
        // Handle game end conditions
        if (resultado.esGanador) {
            setTimeout(() => {
                alert('¡Felicitaciones! ¡Has ganado!');
                document.querySelector('.palabra-correcta-container').style.display = 'block';
                document.getElementById('palabra-correcta').textContent = palabraObjetivo;
                preguntarNuevaPartida();
            }, 500);
        } else if (resultado.esFinal) {
            setTimeout(() => {
                alert('¡Juego terminado! La palabra era: ' + palabraObjetivo);
                document.querySelector('.palabra-correcta-container').style.display = 'block';
                document.getElementById('palabra-correcta').textContent = palabraObjetivo;
                preguntarNuevaPartida();
            }, 500);
        } else {
            input.focus();
        }
    });

    // Función auxiliar para mostrar palabras en ternas
    function mostrarTernas(palabras) {
        if (palabras.length === 0) {
            return '<div class="no-coincidencias">No hay palabras coincidentes</div>';
        }

        let html = '<div class="ternas-container">';
        for (let i = 0; i < palabras.length; i += 3) {
            const terna = palabras.slice(i, i + 3);
            html += `<div class="palabra-terna">${terna.join(' - ')}</div>`;
        }
        html += '</div>';
        return html;
    }

    // Nueva función para preguntar si quiere jugar de nuevo
    function preguntarNuevaPartida() {
        setTimeout(() => {
            const jugarDeNuevo = confirm('¿Quieres jugar otra vez?');
            if (jugarDeNuevo) {
                reiniciarJuego();
            } else {
                // Deshabilitar controles
                input.disabled = true;
                confirmarBtn.disabled = true;
                borrarBtn.disabled = true;
            }
        }, 100); // Pequeño delay para mejor UX
    }

    let probabilityChart = null;

    function initializeChart() {
        const ctx = document.getElementById('probabilityChart').getContext('2d');
        probabilityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Probabilidad (%)',
                    data: [],
                    backgroundColor: 'rgba(106, 170, 100, 0.5)',
                    borderColor: 'rgba(106, 170, 100, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: value => `${(value * 100).toFixed(1)}%`,
                            color: 'var(--text-color)'
                        },
                        grid: {
                            color: 'var(--chart-grid-color)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'var(--text-color)',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'var(--chart-grid-color)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'var(--text-color)'
                        }
                    }
                }
            }
        });
    }

    function updateChart(probabilidades) {
        if (!probabilityChart) return;

        const topPalabras = Array.from(probabilidades.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        probabilityChart.data.labels = topPalabras.map(([palabra]) => palabra);
        probabilityChart.data.datasets[0].data = topPalabras.map(([,prob]) => prob);
        probabilityChart.update();
    }

    initializeChart(); // Add this line
});
