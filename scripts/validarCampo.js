import { PALABRAS, obtenerPalabraAleatoria, existePalabra } from './palabras.js';
import { calcularProbabilidades, calcularInformacion, calcularEntropia } from './calculos.js';

let positionProbabilityChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Variables initialization
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    const input = document.querySelector('.palabra-input');
    const borrarBtn = document.querySelector('#borrar-btn');
    const confirmarBtn = document.querySelector('#confirmar-btn');
    const filas = document.querySelectorAll('.tablero-row');
    let filaActual = 0;
    let palabraObjetivo = obtenerPalabraAleatoria();
    let probabilityChart = null;

    // Initialize game
    console.log('Palabra a adivinar:', palabraObjetivo);
    initializeChart();
    initializePositionChart();
    loadSavedTheme();

    // Event Listeners
    input.addEventListener('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '');
        confirmarBtn.disabled = this.value.length !== 5;
        this.classList.remove('is-invalid');
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && this.value.length === 5) {
            confirmarBtn.click();
        } else if (e.key === 'Escape') {
            borrarBtn.click();
        }
    });

    borrarBtn.addEventListener('click', function() {
        input.value = '';
        input.classList.remove('is-invalid');
        confirmarBtn.disabled = true;
        document.querySelector('.invalid-feedback').style.display = 'none';
        input.focus();
    });

    confirmarBtn.addEventListener('click', function() {
        const palabra = input.value.toUpperCase();
        
        if (palabra.length !== 5 || !existePalabra(palabra)) {
            input.classList.add('is-invalid');
            document.querySelector('.invalid-feedback').style.display = 'block';
            return;
        }

        const resultado = procesarIntento(palabra);
        if (!resultado) return;

        const palabrasCoincidentes = obtenerPalabrasCoincidentes(
            resultado.letrasCorrectas,
            resultado.letrasPresentes,
            palabra,
            resultado.letrasIncorrectas
        );

        // Actualizar stats
        document.getElementById('palabras-coincidentes').textContent = palabrasCoincidentes.length;
        actualizarEstadisticas(palabrasCoincidentes);

        // Limpiar input
        input.value = '';
        input.classList.remove('is-invalid');
        confirmarBtn.disabled = true;

        // Verificar fin del juego
        if (resultado.esGanador || resultado.esFinal) {
            finalizarJuego(resultado.esGanador);
        } else {
            input.focus();
        }
    });

    themeToggle.addEventListener('click', function() {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        body.setAttribute('data-theme', newTheme);
        themeIcon.classList.toggle('fa-moon');
        themeIcon.classList.toggle('fa-sun');
        
        // Update charts and table
        updateChartTheme();
        actualizarTablaProbabilidades(calcularProbabilidades(PALABRAS).porPosicion);
        localStorage.setItem('theme', newTheme);
    });

    // Theme functions
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        
        if (savedTheme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            updateChartTheme();
        }
    }

    function updateChartTheme() {
        if (!probabilityChart || !positionProbabilityChart) return;
        
        const colors = getChartThemeColors();
        
        // Update both charts
        [probabilityChart, positionProbabilityChart].forEach(chart => {
            chart.options.scales.y.grid.color = colors.gridColor;
            chart.options.scales.x.grid.color = colors.gridColor;
            chart.options.scales.y.ticks.color = colors.textColor;
            chart.options.scales.x.ticks.color = colors.textColor;
            chart.options.plugins.legend.labels.color = colors.textColor;
            chart.update();
        });
    }

    function getChartThemeColors() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        return {
            backgroundColor: isDark ? 'rgba(106, 170, 100, 0.3)' : 'rgba(106, 170, 100, 0.5)',
            borderColor: isDark ? 'rgba(106, 170, 100, 0.8)' : 'rgba(106, 170, 100, 1)',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            textColor: isDark ? '#ffffff' : '#000000',
            hoverColor: isDark ? 'rgba(106, 170, 100, 0.5)' : 'rgba(106, 170, 100, 0.7)'
        };
    }

    // Game functions
    function reiniciarJuego() {
        // Get new random word and reset state
        palabraObjetivo = obtenerPalabraAleatoria();
        filaActual = 0;
        
        // Reset UI controls
        input.disabled = false;
        confirmarBtn.disabled = true;
        borrarBtn.disabled = false;
        input.value = '';
        input.classList.remove('is-invalid');
        document.querySelector('.invalid-feedback').style.display = 'none';
        
        // Clear board
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('.tablero-celda');
            celdas.forEach(celda => {
                celda.textContent = '';
                celda.classList.remove('celda-correcta', 'celda-presente', 'celda-incorrecta');
            });
        });

        // Reset UI elements
        const palabraCorrectaContainer = document.querySelector('.palabra-correcta-container');
        if (palabraCorrectaContainer) {
            palabraCorrectaContainer.style.display = 'none';
            document.getElementById('palabra-correcta').textContent = '';
        }
        
        // Reset stats
        document.getElementById('palabras-coincidentes').textContent = PALABRAS.length.toString();
        
        // Clear stats containers
        ['probabilidades-container', 'informacion-container', 'entropia-container'].forEach(id => {
            document.getElementById(id).innerHTML = '';
        });
        
        // Clear probability table
        const probTable = document.getElementById('letra-prob-table').getElementsByTagName('tbody')[0];
        if (probTable) {
            probTable.innerHTML = '';
        }
        
        // Reset and update chart
        if (probabilityChart) {
            probabilityChart.data.labels = [];
            probabilityChart.data.datasets[0].data = [];
            probabilityChart.update();
        }
        if (positionProbabilityChart) {
            positionProbabilityChart.data.datasets = [];
            positionProbabilityChart.update();
        }
        
        // Initialize stats with full word list
        actualizarEstadisticas(PALABRAS);
        
        console.log('Nueva palabra a adivinar:', palabraObjetivo);
        input.focus();
    }

    // Initialize chart on load
    function initializeChart() {
        const ctx = document.getElementById('probabilityChart').getContext('2d');
        const colors = getChartThemeColors();
        
        probabilityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Probabilidad por palabra (%)',
                    data: [],
                    backgroundColor: colors.backgroundColor,
                    borderColor: colors.borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                indexAxis: 'y',  // Make horizontal bar chart
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: value => `${(value * 100).toFixed(1)}%`,
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    },
                    y: {
                        ticks: {
                            color: colors.textColor
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Probabilidad: ${(context.raw * 100).toFixed(2)}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    function initializePositionChart() {
        const ctx = document.getElementById('positionProbabilityChart').getContext('2d');
        const colors = getChartThemeColors();
        
        positionProbabilityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pos 1', 'Pos 2', 'Pos 3', 'Pos 4', 'Pos 5'],
                datasets: []  // Will be populated dynamically
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: value => `${(value * 100).toFixed(1)}%`,
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: colors.textColor,
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${(context.raw * 100).toFixed(2)}%`;
                            }
                        }
                    }
                }
            }
        });
    }

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
        
        actualizarProbabilidades(resultados.porPalabra);
        actualizarInformacion(resultados.porPosicion);
        actualizarEntropia(resultados.porPosicion);
        actualizarTablaProbabilidades(resultados.porPosicion);
        updateChart(resultados.porPalabra);
        updatePositionChart(resultados.porPosicion);
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

    // Nueva función para preguntar si quiere jugar de nuevo
    function finalizarJuego(ganador) {
        // Disable controls
        input.disabled = true;
        confirmarBtn.disabled = true;
        borrarBtn.disabled = true;

        // Prepare message based on result
        const mensaje = ganador ? 
            '¡Felicidades, adivinaste la palabra!' : 
            `¡Juego terminado! La palabra secreta era: ${palabraObjetivo}`;

        // Show message and correct word with delay
        setTimeout(() => {
            // Show alert with result
            alert(mensaje);
            
            // Always show correct word container
            const palabraCorrectaContainer = document.querySelector('.palabra-correcta-container');
            if (!palabraCorrectaContainer) {
                // Create container if it doesn't exist
                const container = document.createElement('div');
                container.className = 'palabra-correcta-container';
                container.innerHTML = `
                    <label class="palabra-correcta-label">
                        La palabra correcta era: <span id="palabra-correcta" class="palabra-correcta"></span>
                    </label>
                `;
                document.querySelector('.tablero').after(container);
            }
            
            palabraCorrectaContainer.style.display = 'block';
            document.getElementById('palabra-correcta').textContent = palabraObjetivo;
            
            // Ask to play again
            const jugarDeNuevo = confirm('¿Quieres jugar otra vez?');
            if (jugarDeNuevo) {
                reiniciarJuego();
            }
        }, 500);
    }

    function actualizarTablaProbabilidades(probabilidadesPorPosicion) {
        const table = document.getElementById('letra-prob-table').getElementsByTagName('tbody')[0];
        table.innerHTML = '';
        
        const letras = new Set();
        probabilidadesPorPosicion.forEach(pos => {
            Object.keys(pos).forEach(letra => letras.add(letra));
        });
        
        const letrasOrdenadas = Array.from(letras).sort();
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        letrasOrdenadas.forEach(letra => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${letra}</td>`;
            
            for (let pos = 0; pos < 5; pos++) {
                const prob = probabilidadesPorPosicion[pos][letra] || 0;
                const width = Math.round(prob * 100);
                const barColor = isDark ? 'rgba(106, 170, 100, 0.3)' : 'rgba(106, 170, 100, 0.2)';
                
                row.innerHTML += `
                    <td class="prob-cell">
                        <div class="prob-value">${(prob * 100).toFixed(1)}%</div>
                        <div class="prob-bar" style="width: ${width}%; background-color: ${barColor};"></div>
                    </td>
                `;
            }
            
            table.appendChild(row);
        });
    }

    function finalizarJuego(ganador) {
        // Deshabilitar controles durante el mensaje
        input.disabled = true;
        confirmarBtn.disabled = true;
        borrarBtn.disabled = true;

        // Preparar mensaje según resultado
        const mensaje = ganador ? 
            '¡Felicidades, adivinaste la palabra!' : 
            `Has usado todos los intentos. La palabra secreta era: ${palabraObjetivo}`;

        // Mostrar mensaje y palabra correcta con delay
        setTimeout(() => {
            // Mostrar palabra correcta
            document.querySelector('.palabra-correcta-container').style.display = 'block';
            document.getElementById('palabra-correcta').textContent = palabraObjetivo;
            
            // Preguntar si quiere jugar de nuevo
            if (confirm(mensaje + '\n\n¿Quieres jugar otra vez?')) {
                reiniciarJuego();
            }
        }, 500);
    }

    function updateChart(probabilidades) {
        if (!probabilityChart) return;
    
        // Get top 15 most probable words
        const topPalabras = Array.from(probabilidades.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15);
    
        probabilityChart.data.labels = topPalabras.map(([palabra]) => palabra);
        probabilityChart.data.datasets[0].data = topPalabras.map(([,prob]) => prob);
    
        const colors = getChartThemeColors();
        probabilityChart.data.datasets[0].backgroundColor = colors.backgroundColor;
        probabilityChart.data.datasets[0].borderColor = colors.borderColor;
        probabilityChart.options.scales.x.grid.color = colors.gridColor;
        probabilityChart.options.scales.y.ticks.color = colors.textColor;
        probabilityChart.options.scales.x.ticks.color = colors.textColor;
    
        probabilityChart.update();
    }

    function updatePositionChart(probabilidadesPorPosicion) {
        if (!positionProbabilityChart) return;
    
        // Get all unique letters
        const letras = new Set();
        probabilidadesPorPosicion.forEach(pos => {
            Object.keys(pos).forEach(letra => letras.add(letra));
        });
    
        // Create datasets for each letter
        const datasets = Array.from(letras).map(letra => {
            const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
            return {
                label: letra,
                data: probabilidadesPorPosicion.map(pos => pos[letra] || 0),
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1
            };
        });
    
        // Sort datasets by average probability
        datasets.sort((a, b) => {
            const avgA = a.data.reduce((sum, val) => sum + val, 0) / a.data.length;
            const avgB = b.data.reduce((sum, val) => sum + val, 0) / b.data.length;
            return avgB - avgA;
        });
    
        // Take top 10 letters for clarity
        positionProbabilityChart.data.datasets = datasets.slice(0, 10);
        positionProbabilityChart.update();
    }
});
