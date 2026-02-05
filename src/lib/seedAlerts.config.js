/**
 * seedAlerts.config.js
 *
 * Configuración de reglas y umbrales para alertas de análisis de semillas
 */

export const SEED_ALERT_RULES = {
  // Alerta de baja germinación
  BAJA_GERMINACION: {
    id: 'baja_germinacion',
    enabled: true,
    nombre: 'Baja Germinación',
    descripcion: 'Porcentaje de germinación por debajo del mínimo aceptable',
    prioridad: 'alta',
    color: 'red',
    icono: '🌱',

    umbralMinimo: 85, // %

    validar: (germinacion) => {
      if (!germinacion) return false;
      const germ = parseFloat(germinacion);
      if (isNaN(germ)) return false;

      return germ < 85;
    },

    generarMensaje: (germinacion, variedad) => {
      const germ = parseFloat(germinacion);
      let severidad, recomendacion;

      if (germ < 70) {
        severidad = 'CRÍTICA';
        recomendacion = 'NO RECOMENDADO PARA SIEMBRA. Descartar lote o usar solo para ensayos. Solicitar semilla de reemplazo.';
      } else if (germ < 80) {
        severidad = 'SEVERA';
        recomendacion = 'Aumentar densidad de siembra en 20-30% para compensar baja germinación. Evaluar costo-beneficio vs compra de nueva semilla.';
      } else {
        severidad = 'MODERADA';
        recomendacion = 'Aumentar densidad de siembra en 10-15%. Monitorear emergencia en campo y estar preparado para resiembra.';
      }

      return {
        titulo: `🌱 Germinación ${severidad} - ${variedad || 'Semilla'}`,
        descripcion: `Germinación: ${germ}%. Mínimo recomendado: 85%. Severidad: ${severidad}.`,
        recomendacion
      };
    }
  },

  // Alerta de semilla inviable
  SEMILLA_INVIABLE: {
    id: 'semilla_inviable',
    enabled: true,
    nombre: 'Semilla Inviable',
    descripcion: 'Germinación crítica - semilla no apta para siembra',
    prioridad: 'alta',
    color: 'red',
    icono: '❌',

    umbralCritico: 70, // %

    validar: (germinacion) => {
      if (!germinacion) return false;
      const germ = parseFloat(germinacion);
      if (isNaN(germ)) return false;

      return germ < 70;
    },

    generarMensaje: (germinacion, variedad) => ({
      titulo: `❌ SEMILLA INVIABLE - ${variedad || 'Análisis'}`,
      descripcion: `Germinación: ${germinacion}%. CRÍTICO: Por debajo del umbral mínimo de 70%.`,
      recomendacion: '🚫 NO UTILIZAR para siembra comercial. Riesgo alto de fallas de implantación y pérdidas económicas. Solicitar devolución o reemplazo al proveedor.'
    })
  },

  // Alerta de baja pureza
  BAJA_PUREZA: {
    id: 'baja_pureza',
    enabled: true,
    nombre: 'Baja Pureza',
    descripcion: 'Semilla contaminada con impurezas o malezas',
    prioridad: 'media',
    color: 'yellow',
    icono: '🔍',

    umbralMinimo: 98, // %

    validar: (pureza) => {
      if (!pureza) return false;
      const pur = parseFloat(pureza);
      if (isNaN(pur)) return false;

      return pur < 98;
    },

    generarMensaje: (pureza, variedad) => {
      const pur = parseFloat(pureza);
      const impurezas = 100 - pur;

      let recomendacion;
      if (pur < 95) {
        recomendacion = 'Pureza muy baja. Verificar origen de semilla. Riesgo alto de malezas. Considerar rechazo del lote.';
      } else if (pur < 97) {
        recomendacion = 'Pureza por debajo del estándar. Aumentar vigilancia de malezas post-siembra. Ajustar densidad considerando impurezas.';
      } else {
        recomendacion = 'Pureza ligeramente baja. Aceptable pero monitorear calidad en próximas compras.';
      }

      return {
        titulo: `🔍 Pureza Baja - ${variedad || 'Semilla'}`,
        descripcion: `Pureza: ${pur}%. Impurezas: ${impurezas.toFixed(1)}%. Estándar mínimo: 98%.`,
        recomendacion
      };
    }
  },

  // Alerta de humedad alta
  HUMEDAD_ALTA: {
    id: 'humedad_alta',
    enabled: true,
    nombre: 'Humedad Alta',
    descripcion: 'Humedad por encima del límite seguro para almacenamiento',
    prioridad: 'alta',
    color: 'orange',
    icono: '💧',

    umbralMaximo: 13, // %

    validar: (humedad) => {
      if (!humedad) return false;
      const hum = parseFloat(humedad);
      if (isNaN(hum)) return false;

      return hum > 13;
    },

    generarMensaje: (humedad, variedad) => {
      const hum = parseFloat(humedad);
      let severidad, recomendacion;

      if (hum > 15) {
        severidad = 'CRÍTICA';
        recomendacion = 'URGENTE: Secar inmediatamente. Riesgo MUY ALTO de hongos y pérdida total del lote. No almacenar en estas condiciones.';
      } else if (hum > 14) {
        severidad = 'ALTA';
        recomendacion = 'Secar antes de almacenar. Riesgo alto de deterioro por hongos. Reducir humedad a 12-13% máximo.';
      } else {
        severidad = 'MODERADA';
        recomendacion = 'Monitorear humedad durante almacenamiento. Idealmente reducir a 12% o menos para almacenamiento prolongado.';
      }

      return {
        titulo: `💧 Humedad ${severidad} - ${variedad || 'Semilla'}`,
        descripcion: `Humedad: ${hum}%. Máximo seguro: 13%. Riesgo de hongos y pérdida de viabilidad.`,
        recomendacion
      };
    }
  },

  // Alerta de test de tetrazolio bajo
  BAJA_VIABILIDAD_TETRAZOLIO: {
    id: 'baja_viabilidad_tetrazolio',
    enabled: true,
    nombre: 'Baja Viabilidad (Tetrazolio)',
    descripcion: 'Test de tetrazolio indica baja viabilidad',
    prioridad: 'alta',
    color: 'red',
    icono: '🔬',

    umbralMinimo: 85, // %

    validar: (tetrazolio) => {
      if (!tetrazolio) return false;
      const tetra = parseFloat(tetrazolio);
      if (isNaN(tetra)) return false;

      return tetra < 85;
    },

    generarMensaje: (tetrazolio, variedad) => ({
      titulo: `🔬 Baja Viabilidad (Test Tetrazolio) - ${variedad || 'Semilla'}`,
      descripcion: `Viabilidad: ${tetrazolio}%. El test de tetrazolio indica bajo potencial de germinación.`,
      recomendacion: 'Resultados de tetrazolio suelen ser más precisos que germinación estándar. Considerar no usar este lote o aumentar significativamente la densidad de siembra.'
    })
  },

  // Alerta de discrepancia entre germinación y tetrazolio
  DISCREPANCIA_TESTS: {
    id: 'discrepancia_tests',
    enabled: true,
    nombre: 'Discrepancia entre Tests',
    descripcion: 'Diferencia significativa entre germinación y tetrazolio',
    prioridad: 'media',
    color: 'yellow',
    icono: '⚠️',

    umbralDiferencia: 10, // %

    validar: (germinacion, tetrazolio) => {
      if (!germinacion || !tetrazolio) return false;
      const germ = parseFloat(germinacion);
      const tetra = parseFloat(tetrazolio);
      if (isNaN(germ) || isNaN(tetra)) return false;

      return Math.abs(germ - tetra) > 10;
    },

    generarMensaje: (germinacion, tetrazolio, variedad) => {
      const diferencia = Math.abs(parseFloat(germinacion) - parseFloat(tetrazolio));

      return {
        titulo: `⚠️ Discrepancia en Tests - ${variedad || 'Semilla'}`,
        descripcion: `Germinación: ${germinacion}%, Tetrazolio: ${tetrazolio}%. Diferencia: ${diferencia.toFixed(1)}%.`,
        recomendacion: 'Diferencia significativa entre tests. Repetir análisis para confirmar. Si tetrazolio es menor, considerar como referencia para decisión de siembra.'
      };
    }
  },

  // Alerta de semilla vieja o deteriorada
  SEMILLA_DETERIORADA: {
    id: 'semilla_deteriorada',
    enabled: true,
    nombre: 'Semilla Posiblemente Deteriorada',
    descripcion: 'Múltiples indicadores de baja calidad',
    prioridad: 'alta',
    color: 'red',
    icono: '⚠️',

    validar: (germinacion, pureza, humedad, tetrazolio) => {
      // Se dispara si 2 o más parámetros están fuera de rango
      let problemasDetectados = 0;

      if (germinacion && parseFloat(germinacion) < 85) problemasDetectados++;
      if (pureza && parseFloat(pureza) < 98) problemasDetectados++;
      if (humedad && parseFloat(humedad) > 13) problemasDetectados++;
      if (tetrazolio && parseFloat(tetrazolio) < 85) problemasDetectados++;

      return problemasDetectados >= 2;
    },

    generarMensaje: (germinacion, pureza, humedad, variedad) => ({
      titulo: `⚠️ SEMILLA DETERIORADA - ${variedad || 'Análisis'}`,
      descripcion: `Múltiples parámetros fuera de rango. Germinación: ${germinacion || 'N/A'}%, Pureza: ${pureza || 'N/A'}%, Humedad: ${humedad || 'N/A'}%.`,
      recomendacion: '🚫 ALTO RIESGO: No recomendado para siembra. Semilla probablemente vieja, mal almacenada o de baja calidad. Contactar proveedor para devolución o reemplazo.'
    })
  }
};

/**
 * Configuración general del sistema de alertas de semillas
 */
export const SEED_ALERTS_CONFIG = {
  // Verificación automática
  autoVerificacion: {
    enabled: false,
    intervaloHoras: 24,
    horaEjecucion: '08:00'
  },

  // Notificaciones
  notificaciones: {
    email: false,
    push: false,
    inApp: true
  },

  // Resolución automática
  autoResolucion: {
    enabled: false, // Las alertas de semillas no se resuelven automáticamente
  },

  // Estándares de calidad (referencia)
  estandaresCalidad: {
    germinacion: { minimo: 85, optimo: 90, unidad: '%' },
    pureza: { minimo: 98, optimo: 99, unidad: '%' },
    humedad: { maximo: 13, optimo: 12, unidad: '%' },
    tetrazolio: { minimo: 85, optimo: 90, unidad: '%' }
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
export function obtenerReglaAlertaSemilla(ruleId) {
  const regla = Object.values(SEED_ALERT_RULES).find(r => r.id === ruleId);
  return regla || null;
}

/**
 * Obtiene todas las reglas habilitadas
 * @returns {Array} Array de reglas habilitadas
 */
export function obtenerReglasHabilitadasSemilla() {
  return Object.values(SEED_ALERT_RULES).filter(r => r.enabled);
}

/**
 * Calcula calidad general de semilla (0-100)
 * @param {Object} analisis - Objeto con germinacion, pureza, humedad, tetrazolio
 * @returns {Object} { calidad: number, clasificacion: string, color: string }
 */
export function calcularCalidadGeneral(analisis) {
  const { germinacion, pureza, humedad, tetrazolio } = analisis;

  let puntaje = 0;
  let factores = 0;

  // Germinación (peso: 40%)
  if (germinacion) {
    const germ = parseFloat(germinacion);
    if (!isNaN(germ)) {
      puntaje += (germ / 100) * 40;
      factores++;
    }
  }

  // Pureza (peso: 30%)
  if (pureza) {
    const pur = parseFloat(pureza);
    if (!isNaN(pur)) {
      puntaje += (pur / 100) * 30;
      factores++;
    }
  }

  // Humedad (peso: 15%, invertido - menor es mejor)
  if (humedad) {
    const hum = parseFloat(humedad);
    if (!isNaN(hum)) {
      const puntajeHumedad = hum <= 12 ? 15 : hum <= 13 ? 10 : hum <= 14 ? 5 : 0;
      puntaje += puntajeHumedad;
      factores++;
    }
  }

  // Tetrazolio (peso: 15%)
  if (tetrazolio) {
    const tetra = parseFloat(tetrazolio);
    if (!isNaN(tetra)) {
      puntaje += (tetra / 100) * 15;
      factores++;
    }
  }

  if (factores === 0) {
    return {
      calidad: null,
      clasificacion: 'SIN_DATOS',
      color: 'gray',
      mensaje: 'No hay datos suficientes para evaluar calidad'
    };
  }

  const calidadFinal = Math.round(puntaje);

  let clasificacion, color, mensaje;

  if (calidadFinal >= 90) {
    clasificacion = 'EXCELENTE';
    color = 'green';
    mensaje = 'Semilla de excelente calidad. Apta para siembra.';
  } else if (calidadFinal >= 80) {
    clasificacion = 'BUENA';
    color = 'blue';
    mensaje = 'Semilla de buena calidad. Apta para siembra.';
  } else if (calidadFinal >= 70) {
    clasificacion = 'ACEPTABLE';
    color = 'yellow';
    mensaje = 'Semilla de calidad aceptable. Considerar ajustes en densidad de siembra.';
  } else if (calidadFinal >= 60) {
    clasificacion = 'DEFICIENTE';
    color = 'orange';
    mensaje = 'Semilla de calidad deficiente. No recomendado para siembra comercial.';
  } else {
    clasificacion = 'INADECUADA';
    color = 'red';
    mensaje = 'Semilla inadecuada para siembra. Rechazar lote.';
  }

  return {
    calidad: calidadFinal,
    clasificacion,
    color,
    mensaje
  };
}
