// Funciones para cálculos estadísticos
export function calcularProbabilidades(palabrasPosibles) {
    const totalPalabras = palabrasPosibles.length;
    const probabilidadesPorPosicion = Array(5).fill().map(() => ({}));
    const probabilidadesPorPalabra = new Map();
    
    // Calculate letter frequencies per position
    palabrasPosibles.forEach(palabra => {
        palabra.split('').forEach((letra, posicion) => {
            probabilidadesPorPosicion[posicion][letra] = 
                (probabilidadesPorPosicion[posicion][letra] || 0) + 1;
        });
    });

    // Convert to probabilities
    probabilidadesPorPosicion.forEach(posicion => {
        Object.entries(posicion).forEach(([letra, freq]) => {
            posicion[letra] = freq / totalPalabras;
        });
    });

    // Calculate word probabilities using position-specific letter probabilities
    palabrasPosibles.forEach(palabra => {
        let probabilidadPalabra = 1.0;
        palabra.split('').forEach((letra, posicion) => {
            probabilidadPalabra *= probabilidadesPorPosicion[posicion][letra] || 0;
        });
        probabilidadesPorPalabra.set(palabra, probabilidadPalabra);
    });

    // Normalize probabilities
    const sumTotal = Array.from(probabilidadesPorPalabra.values())
        .reduce((a, b) => a + b, 0);
    
    probabilidadesPorPalabra.forEach((prob, palabra) => {
        probabilidadesPorPalabra.set(palabra, prob / sumTotal);
    });

    return {
        porPosicion: probabilidadesPorPosicion,
        porPalabra: probabilidadesPorPalabra
    };
}

export function calcularInformacion(probabilidadesPorPosicion) {
    const informacionPorPosicion = Array(5).fill().map(() => ({}));
    
    probabilidadesPorPosicion.forEach((posicion, index) => {
        Object.entries(posicion).forEach(([letra, prob]) => {
            // I(x) = -log₂(P(x))
            informacionPorPosicion[index][letra] = -Math.log2(prob);
        });
    });

    return informacionPorPosicion;
}

export function calcularEntropia(probabilidadesPorPosicion) {
    const entropiaPorPosicion = Array(5).fill(0);
    
    probabilidadesPorPosicion.forEach((posicion, index) => {
        Object.entries(posicion).forEach(([letra, prob]) => {
            // H = -∑ P(x) * log₂(P(x))
            entropiaPorPosicion[index] += -prob * Math.log2(prob);
        });
    });

    return entropiaPorPosicion;
}