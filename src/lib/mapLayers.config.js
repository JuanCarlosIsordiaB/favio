/**
 * Configuración centralizada de todas las capas de mapa
 * Permite gestionar capas base, overlays y colores de forma consistente
 */

// ========== CAPAS BASE (mutuamente exclusivas) ==========

export const BASE_LAYERS = {
  osm: {
    id: 'osm',
    label: 'Mapa',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    type: 'tile'
  },

  satellite: {
    id: 'satellite',
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    type: 'tile'
  },

  terrain: {
    id: 'terrain',
    label: 'Relieve',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    type: 'tile'
  },

  ndvi: {
    id: 'ndvi',
    label: 'NDVI',
    url: null, // Se construye dinámicamente en ndvi.js
    attribution: 'Sentinel-2 / ESA',
    type: 'ndvi'
  }
};

// ========== CAPAS OVERLAY (pueden combinarse con base) ==========

export const OVERLAY_LAYERS = {
  cultivo: {
    id: 'cultivo',
    label: 'Ver Cultivo',
    type: 'data-driven',
    source: 'cultivo_actual'
  },

  pastura: {
    id: 'pastura',
    label: 'Índice de Altura',
    type: 'data-driven',
    source: 'altura_pastura_cm'
  }
};

// ========== PALETAS DE COLORES ==========

/**
 * Colores para diferentes tipos de cultivo
 * Usado por CultivoLayer para colorear lotes según cultivo_actual
 */
export const COLORES_CULTIVO = {
  'Soja': '#FFEB3B',           // Amarillo
  'Maíz': '#FFC107',           // Ámbar
  'Trigo': '#FF9800',          // Naranja
  'Pastura': '#4CAF50',        // Verde
  'Avena': '#8BC34A',          // Verde claro
  'Girasol': '#F57C00',        // Naranja oscuro
  'Sorgo': '#D32F2F',          // Rojo
  'Sin cultivo': '#9E9E9E'     // Gris
};

/**
 * Colores para diferentes usos de suelo
 */
export const COLORES_USO_SUELO = {
  'pradera': '#4CAF50',        // Verde
  'cultivo': '#FFEB3B',        // Amarillo
  'campo_natural': '#8BC34A',  // Verde claro
  'barbecho': '#795548',       // Marrón
  'otro': '#9E9E9E'            // Gris
};

/**
 * Función para obtener color según altura de pastura
 * Escala: Rojo (bajo) → Naranja (bajo-medio) → Amarillo (medio) → Verde (bueno) → Verde oscuro (óptimo)
 * @param {number} altura_cm - Altura en centímetros
 * @returns {string} Color hex
 */
export function getColorByHeight(altura_cm) {
  if (!altura_cm) {
    return '#E0E0E0'; // Gris: sin dato
  }

  if (altura_cm < 5) {
    return '#D32F2F'; // Rojo: muy bajo (crítico)
  } else if (altura_cm < 10) {
    return '#FF9800'; // Naranja: bajo
  } else if (altura_cm < 15) {
    return '#FFEB3B'; // Amarillo: medio
  } else if (altura_cm < 20) {
    return '#8BC34A'; // Verde claro: bueno
  } else {
    return '#4CAF50'; // Verde: óptimo
  }
}

/**
 * Obtiene leyenda de altura de pastura para mostrar en UI
 * @returns {Array} Array con objetos {rango, color}
 */
export function getPasturaHeightLegend() {
  return [
    { rango: '< 5 cm', color: '#D32F2F', label: 'Crítico' },
    { rango: '5-10 cm', color: '#FF9800', label: 'Bajo' },
    { rango: '10-15 cm', color: '#FFEB3B', label: 'Medio' },
    { rango: '15-20 cm', color: '#8BC34A', label: 'Bueno' },
    { rango: '> 20 cm', color: '#4CAF50', label: 'Óptimo' }
  ];
}

/**
 * Obtiene leyenda de cultivos para mostrar en UI
 * @returns {Array} Array con objetos {cultivo, color}
 */
export function getCultivoLegend() {
  return Object.entries(COLORES_CULTIVO).map(([cultivo, color]) => ({
    cultivo,
    color
  }));
}

// ========== CONFIGURACIÓN DE VALIDACIÓN ==========

/**
 * Validar que una capa base es válida
 */
export function isValidBaseLayer(layerId) {
  return Object.keys(BASE_LAYERS).includes(layerId);
}

/**
 * Validar que un overlay es válido
 */
export function isValidOverlay(overlayId) {
  return Object.keys(OVERLAY_LAYERS).includes(overlayId);
}
