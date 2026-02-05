/**
 * rainfallAlerts.config.js
 *
 * Configuración de reglas y umbrales para alertas de lluvia
 */

export const RAINFALL_ALERT_RULES = {
  // Alerta de sequía moderada
  SEQUIA_MODERADA: {
    id: 'sequia_moderada',
    enabled: true,
    nombre: 'Sequía Moderada',
    descripcion: 'Precipitación insuficiente en el último mes',
    prioridad: 'media',
    color: 'yellow',
    icono: '☀️',

    // Umbrales
    umbralDias: 30,
    umbralMmMinimo: 50,

    // Función de validación
    validar: (acumuladoMm, dias) => {
      return acumuladoMm < 50;
    },

    // Mensaje generado
    generarMensaje: (acumuladoMm, dias) => ({
      titulo: '⚠️ Sequía Moderada Detectada',
      descripcion: `Se registraron ${acumuladoMm.toFixed(1)}mm en los últimos ${dias} días. Se esperaban al menos 50mm.`,
      recomendacion: 'Considerar riego suplementario si es posible. Monitorear estado de cultivos y pasturas.'
    })
  },

  // Alerta de sequía severa
  SEQUIA_SEVERA: {
    id: 'sequia_severa',
    enabled: true,
    nombre: 'Sequía Severa',
    descripcion: 'Déficit hídrico crítico',
    prioridad: 'alta',
    color: 'red',
    icono: '🔥',

    umbralDias: 30,
    umbralMmMinimo: 20,

    validar: (acumuladoMm, dias) => {
      return acumuladoMm < 20;
    },

    generarMensaje: (acumuladoMm, dias) => ({
      titulo: '🚨 SEQUÍA SEVERA - Acción Urgente Requerida',
      descripcion: `CRÍTICO: Solo ${acumuladoMm.toFixed(1)}mm en los últimos ${dias} días. Déficit severo de ${(50 - acumuladoMm).toFixed(1)}mm.`,
      recomendacion: 'Acción urgente: Implementar riego de emergencia, reducir carga animal, considerar suplementación. Evaluar pérdidas potenciales.'
    })
  },

  // Alerta de exceso de agua
  EXCESO_AGUA: {
    id: 'exceso_agua',
    enabled: true,
    nombre: 'Exceso de Agua',
    descripcion: 'Precipitación excesiva en período corto',
    prioridad: 'media',
    color: 'blue',
    icono: '💧',

    umbralDias: 7,
    umbralMmMaximo: 150,

    validar: (acumuladoMm, dias) => {
      return acumuladoMm > 150;
    },

    generarMensaje: (acumuladoMm, dias) => ({
      titulo: '💧 Exceso de Precipitaciones',
      descripcion: `Se registraron ${acumuladoMm.toFixed(1)}mm en solo ${dias} días. Riesgo de encharcamiento.`,
      recomendacion: 'Verificar drenajes, evitar laboreo de suelos saturados, monitorear aparición de enfermedades fúngicas. Retrasar aplicaciones hasta que suelo drene.'
    })
  },

  // Alerta de campaña seca
  CAMPANIA_SECA: {
    id: 'campania_seca',
    enabled: true,
    nombre: 'Campaña Seca',
    descripcion: 'Acumulado de campaña por debajo del 70% del promedio histórico',
    prioridad: 'alta',
    color: 'orange',
    icono: '📊',

    umbralPorcentaje: 70,

    validar: (acumuladoCampania, promedioHistorico) => {
      if (!promedioHistorico || promedioHistorico === 0) return false;
      const porcentaje = (acumuladoCampania / promedioHistorico) * 100;
      return porcentaje < 70;
    },

    generarMensaje: (acumuladoCampania, promedioHistorico) => {
      const porcentaje = ((acumuladoCampania / promedioHistorico) * 100).toFixed(1);
      return {
        titulo: '📊 Campaña Seca Detectada',
        descripcion: `Acumulado de campaña: ${acumuladoCampania.toFixed(1)}mm (${porcentaje}% del promedio histórico de ${promedioHistorico.toFixed(1)}mm)`,
        recomendacion: 'Ajustar expectativas de rendimiento. Considerar cultivos de ciclo corto o tolerantes a sequía. Revisar estrategia de siembra para próxima campaña.'
      };
    }
  },

  // Alerta de días sin lluvia
  DIAS_SIN_LLUVIA: {
    id: 'dias_sin_lluvia',
    enabled: true,
    nombre: 'Período Prolongado Sin Lluvia',
    descripcion: 'Muchos días consecutivos sin precipitaciones',
    prioridad: 'media',
    color: 'orange',
    icono: '⏳',

    umbralDias: 21,

    validar: (diasSinLluvia) => {
      return diasSinLluvia >= 21;
    },

    generarMensaje: (diasSinLluvia) => ({
      titulo: '⏳ Período Prolongado Sin Lluvia',
      descripcion: `Han transcurrido ${diasSinLluvia} días sin precipitaciones significativas.`,
      recomendacion: 'Monitorear humedad de suelo. Priorizar riego en cultivos críticos. Estar atento a pronóstico para planificar operaciones.'
    })
  },

  // Alerta de déficit en etapa crítica de cultivo
  DEFICIT_ETAPA_CRITICA: {
    id: 'deficit_etapa_critica',
    enabled: true,
    nombre: 'Déficit Hídrico en Etapa Crítica',
    descripcion: 'Falta de agua en momento crítico del cultivo',
    prioridad: 'alta',
    color: 'red',
    icono: '🌱',

    // Esta alerta requiere información adicional del cultivo
    // Se puede integrar con módulo de trabajos/cultivos
    umbralMmMinimo: 30,
    umbralDias: 15,

    validar: (acumuladoMm, etapaCultivo) => {
      // Etapas críticas: floración, llenado de grano
      const etapasCriticas = ['floracion', 'llenado_grano'];
      return acumuladoMm < 30 && etapasCriticas.includes(etapaCultivo);
    },

    generarMensaje: (acumuladoMm, etapaCultivo) => ({
      titulo: '🌱 ALERTA CRÍTICA: Déficit en Etapa Clave',
      descripcion: `Cultivo en ${etapaCultivo} con solo ${acumuladoMm.toFixed(1)}mm en últimos 15 días. Impacto directo en rendimiento.`,
      recomendacion: 'URGENTE: Implementar riego inmediato si es posible. El déficit hídrico en esta etapa puede reducir rendimiento hasta un 50%.'
    })
  }
};

/**
 * Configuración general del sistema de alertas de lluvia
 */
export const RAINFALL_ALERTS_CONFIG = {
  // Verificación automática
  autoVerificacion: {
    enabled: false, // Cambiar a true para habilitar verificaciones automáticas por cron
    intervaloHoras: 24, // Cada 24 horas
    horaEjecucion: '06:00' // A las 6 AM
  },

  // Notificaciones
  notificaciones: {
    email: false, // Implementar en futuro
    push: false, // Implementar en futuro
    inApp: true // Mostrar en dashboard
  },

  // Resolución automática de alertas
  autoResolucion: {
    enabled: true,
    // Una alerta se marca como "resuelta" automáticamente si:
    // - La condición ya no se cumple
    // - Han pasado X días desde su creación
    diasParaResolver: 7
  },

  // Colores por prioridad (para UI)
  coloresPrioridad: {
    baja: 'blue',
    media: 'yellow',
    alta: 'red'
  },

  // Íconos por tipo de alerta
  iconosPorTipo: {
    sequia: '☀️',
    exceso: '💧',
    general: '⚠️'
  }
};

/**
 * Obtiene una regla de alerta por ID
 * @param {string} ruleId - ID de la regla
 * @returns {Object|null} Regla de alerta
 */
export function obtenerReglaAlerta(ruleId) {
  const regla = Object.values(RAINFALL_ALERT_RULES).find(r => r.id === ruleId);
  return regla || null;
}

/**
 * Obtiene todas las reglas habilitadas
 * @returns {Array} Array de reglas habilitadas
 */
export function obtenerReglasHabilitadas() {
  return Object.values(RAINFALL_ALERT_RULES).filter(r => r.enabled);
}

/**
 * Obtiene color por prioridad
 * @param {string} prioridad - Prioridad de la alerta
 * @returns {string} Color
 */
export function obtenerColorPorPrioridad(prioridad) {
  return RAINFALL_ALERTS_CONFIG.coloresPrioridad[prioridad] || 'gray';
}
