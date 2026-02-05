/**
 * soilAlerts.config.js
 *
 * Configuración de reglas y umbrales para alertas de análisis de suelo
 */

export const SOIL_ALERT_RULES = {
  // Alerta de déficit de Fósforo (P)
  DEFICIT_FOSFORO: {
    id: 'deficit_fosforo',
    enabled: true,
    parametro: 'P',
    nombre: 'Déficit de Fósforo',
    descripcion: 'Nivel de fósforo por debajo del objetivo',
    prioridad: 'alta',
    color: 'red',
    icono: '🧪',

    // Umbral: si resultado < objetivo en más de 30%
    umbralPorcentaje: 30,

    validar: (resultado, objetivo) => {
      if (!resultado || !objetivo) return false;
      const resultadoNum = parseFloat(resultado);
      const objetivoNum = parseFloat(objetivo);
      if (isNaN(resultadoNum) || isNaN(objetivoNum)) return false;

      const porcentajeDelObjetivo = (resultadoNum / objetivoNum) * 100;
      return porcentajeDelObjetivo < 70; // Menos del 70% del objetivo
    },

    generarMensaje: (resultado, objetivo, fuente, kgHa) => {
      const deficit = parseFloat(objetivo) - parseFloat(resultado);
      return {
        titulo: '🧪 Déficit de Fósforo Detectado',
        descripcion: `Nivel actual: ${resultado} ppm. Objetivo: ${objetivo} ppm. Déficit: ${deficit.toFixed(1)} ppm.`,
        recomendacion: fuente
          ? `Aplicar ${fuente} a razón de ${kgHa} kg/ha para corregir déficit.`
          : 'Realizar fertilización fosfatada según recomendación agronómica.'
      };
    }
  },

  // Alerta de déficit de Potasio (K)
  DEFICIT_POTASIO: {
    id: 'deficit_potasio',
    enabled: true,
    parametro: 'K',
    nombre: 'Déficit de Potasio',
    descripcion: 'Nivel de potasio por debajo del objetivo',
    prioridad: 'alta',
    color: 'red',
    icono: '🧪',

    umbralPorcentaje: 30,

    validar: (resultado, objetivo) => {
      if (!resultado || !objetivo) return false;
      const resultadoNum = parseFloat(resultado);
      const objetivoNum = parseFloat(objetivo);
      if (isNaN(resultadoNum) || isNaN(objetivoNum)) return false;

      const porcentajeDelObjetivo = (resultadoNum / objetivoNum) * 100;
      return porcentajeDelObjetivo < 70;
    },

    generarMensaje: (resultado, objetivo, fuente, kgHa) => {
      const deficit = parseFloat(objetivo) - parseFloat(resultado);
      return {
        titulo: '🧪 Déficit de Potasio Detectado',
        descripcion: `Nivel actual: ${resultado} ppm. Objetivo: ${objetivo} ppm. Déficit: ${deficit.toFixed(1)} ppm.`,
        recomendacion: fuente
          ? `Aplicar ${fuente} a razón de ${kgHa} kg/ha para corregir déficit.`
          : 'Realizar fertilización potásica según recomendación agronómica.'
      };
    }
  },

  // Alerta de pH crítico
  PH_CRITICO: {
    id: 'ph_critico',
    enabled: true,
    parametro: 'pH',
    nombre: 'pH Crítico',
    descripcion: 'pH fuera del rango óptimo',
    prioridad: 'alta',
    color: 'red',
    icono: '⚗️',

    rangoOptimo: { min: 6.0, max: 7.5 },

    validar: (resultado) => {
      if (!resultado) return false;
      const ph = parseFloat(resultado);
      if (isNaN(ph)) return false;

      return ph < 6.0 || ph > 7.5;
    },

    generarMensaje: (resultado) => {
      const ph = parseFloat(resultado);
      let tipo, recomendacion;

      if (ph < 6.0) {
        tipo = 'ácido';
        recomendacion = `Suelo muy ácido (pH ${ph}). Aplicar enmienda calcárea para elevar pH. Dosis aprox: ${((6.5 - ph) * 2000).toFixed(0)} kg/ha de carbonato de calcio.`;
      } else {
        tipo = 'alcalino';
        recomendacion = `Suelo alcalino (pH ${ph}). Considerar aplicación de azufre elemental o fertilizantes acidificantes.`;
      }

      return {
        titulo: `⚗️ pH ${tipo.toUpperCase()} - Acción Requerida`,
        descripcion: `pH actual: ${ph}. Rango óptimo: 6.0-7.5. Suelo fuera de rango óptimo.`,
        recomendacion
      };
    }
  },

  // Alerta de déficit de Nitrógeno (N)
  DEFICIT_NITROGENO: {
    id: 'deficit_nitrogeno',
    enabled: true,
    parametro: 'N',
    nombre: 'Déficit de Nitrógeno',
    descripcion: 'Nivel de nitrógeno insuficiente',
    prioridad: 'alta',
    color: 'red',
    icono: '🌾',

    umbralPorcentaje: 30,

    validar: (resultado, objetivo) => {
      if (!resultado || !objetivo) return false;
      const resultadoNum = parseFloat(resultado);
      const objetivoNum = parseFloat(objetivo);
      if (isNaN(resultadoNum) || isNaN(objetivoNum)) return false;

      const porcentajeDelObjetivo = (resultadoNum / objetivoNum) * 100;
      return porcentajeDelObjetivo < 70;
    },

    generarMensaje: (resultado, objetivo, fuente, kgHa) => {
      const deficit = parseFloat(objetivo) - parseFloat(resultado);
      return {
        titulo: '🌾 Déficit de Nitrógeno Detectado',
        descripcion: `Nivel actual: ${resultado} ppm. Objetivo: ${objetivo} ppm. Déficit: ${deficit.toFixed(1)} ppm.`,
        recomendacion: fuente
          ? `Aplicar ${fuente} a razón de ${kgHa} kg/ha. Considerar fraccionamiento de la dosis.`
          : 'Realizar fertilización nitrogenada. Considerar análisis foliar para ajustar dosis.'
      };
    }
  },

  // Alerta de baja Materia Orgánica
  BAJA_MATERIA_ORGANICA: {
    id: 'baja_materia_organica',
    enabled: true,
    parametro: 'MO',
    nombre: 'Baja Materia Orgánica',
    descripcion: 'Contenido de MO por debajo del mínimo recomendado',
    prioridad: 'media',
    color: 'yellow',
    icono: '🍂',

    umbralMinimo: 3.0, // % de MO

    validar: (resultado) => {
      if (!resultado) return false;
      const mo = parseFloat(resultado);
      if (isNaN(mo)) return false;

      return mo < 3.0;
    },

    generarMensaje: (resultado, objetivo) => ({
      titulo: '🍂 Materia Orgánica Baja',
      descripcion: `Contenido actual: ${resultado}%. Mínimo recomendado: 3.0%. Impacta en estructura, retención de agua y nutrientes.`,
      recomendacion: 'Implementar prácticas de conservación: rotación con leguminosas, manejo de rastrojos, aplicación de compost o abonos verdes. Evitar labranzas excesivas.'
    })
  },

  // Alerta de déficit de Azufre (S)
  DEFICIT_AZUFRE: {
    id: 'deficit_azufre',
    enabled: true,
    parametro: 'S',
    nombre: 'Déficit de Azufre',
    descripcion: 'Nivel de azufre por debajo del objetivo',
    prioridad: 'media',
    color: 'yellow',
    icono: '🧪',

    umbralPorcentaje: 30,

    validar: (resultado, objetivo) => {
      if (!resultado || !objetivo) return false;
      const resultadoNum = parseFloat(resultado);
      const objetivoNum = parseFloat(objetivo);
      if (isNaN(resultadoNum) || isNaN(objetivoNum)) return false;

      const porcentajeDelObjetivo = (resultadoNum / objetivoNum) * 100;
      return porcentajeDelObjetivo < 70;
    },

    generarMensaje: (resultado, objetivo, fuente, kgHa) => {
      const deficit = parseFloat(objetivo) - parseFloat(resultado);
      return {
        titulo: '🧪 Déficit de Azufre Detectado',
        descripcion: `Nivel actual: ${resultado} ppm. Objetivo: ${objetivo} ppm. Déficit: ${deficit.toFixed(1)} ppm.`,
        recomendacion: fuente
          ? `Aplicar ${fuente} a razón de ${kgHa} kg/ha.`
          : 'Considerar fertilizantes con azufre (ej: sulfato de amonio, yeso agrícola).'
      };
    }
  },

  // Alerta de fertilización pendiente
  FERTILIZACION_PENDIENTE: {
    id: 'fertilizacion_pendiente',
    enabled: true,
    nombre: 'Fertilización Pendiente',
    descripcion: 'Análisis con déficit sin aplicar por más de 30 días',
    prioridad: 'media',
    color: 'orange',
    icono: '⏰',

    umbralDias: 30,

    validar: (diasDesdeAnalisis, aplicado) => {
      return !aplicado && diasDesdeAnalisis > 30;
    },

    generarMensaje: (diasDesdeAnalisis, parametro, fuente, kgTotal) => ({
      titulo: '⏰ Fertilización Pendiente',
      descripcion: `Han pasado ${diasDesdeAnalisis} días desde el análisis de suelo. Déficit de ${parametro} aún sin corregir.`,
      recomendacion: fuente && kgTotal
        ? `Aplicar ${kgTotal} kg de ${fuente} según recomendación técnica.`
        : `Programar aplicación de fertilizante para corregir déficit de ${parametro}.`
    })
  }
};

/**
 * Configuración general del sistema de alertas de suelo
 */
export const SOIL_ALERTS_CONFIG = {
  // Verificación automática
  autoVerificacion: {
    enabled: false,
    intervaloHoras: 24,
    horaEjecucion: '07:00'
  },

  // Notificaciones
  notificaciones: {
    email: false,
    push: false,
    inApp: true
  },

  // Resolución automática
  autoResolucion: {
    enabled: true,
    // Una alerta se resuelve si se marca "aplicado=true"
    resolverAlAplicar: true
  },

  // Rangos óptimos por parámetro (para referencia)
  rangosOptimos: {
    P: { min: 15, max: 30, unidad: 'ppm' },
    K: { min: 150, max: 300, unidad: 'ppm' },
    pH: { min: 6.0, max: 7.5, unidad: '' },
    MO: { min: 3.0, max: 6.0, unidad: '%' },
    N: { min: 20, max: 40, unidad: 'ppm' },
    S: { min: 10, max: 20, unidad: 'ppm' }
  },

  // Colores por prioridad
  coloresPrioridad: {
    baja: 'blue',
    media: 'yellow',
    alta: 'red'
  }
};

/**
 * Obtiene una regla de alerta por ID
 * @param {string} ruleId - ID de la regla
 * @returns {Object|null} Regla de alerta
 */
export function obtenerReglaAlertaSuelo(ruleId) {
  const regla = Object.values(SOIL_ALERT_RULES).find(r => r.id === ruleId);
  return regla || null;
}

/**
 * Obtiene reglas para un parámetro específico
 * @param {string} parametro - Parámetro del suelo (P, K, MO, pH, N, S)
 * @returns {Array} Reglas aplicables
 */
export function obtenerReglasPorParametro(parametro) {
  return Object.values(SOIL_ALERT_RULES).filter(
    r => r.parametro === parametro && r.enabled
  );
}

/**
 * Obtiene todas las reglas habilitadas
 * @returns {Array} Array de reglas habilitadas
 */
export function obtenerReglasHabilitadasSuelo() {
  return Object.values(SOIL_ALERT_RULES).filter(r => r.enabled);
}

/**
 * Obtiene rango óptimo para un parámetro
 * @param {string} parametro - Parámetro del suelo
 * @returns {Object|null} Rango óptimo
 */
export function obtenerRangoOptimo(parametro) {
  return SOIL_ALERTS_CONFIG.rangosOptimos[parametro] || null;
}
