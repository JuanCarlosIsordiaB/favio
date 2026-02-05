/**
 * Configuración centralizada de reglas de alertas automáticas
 * Define las 4 alertas con lógica de validación, umbrales y templates
 *
 * IMPORTANTE: Estos valores son configurables según necesidades del cliente
 */

// ============================================================================
// REGLAS DE ALERTAS AUTOMÁTICAS - 4 tipos
// ============================================================================

export const REGLAS_ALERTAS = {
  /**
   * ALERTA 1: Pastura Crítica
   * Condición: Altura de pastura < remanente objetivo
   * Severidad: ALTA (requiere acción inmediata)
   */
  PASTURA_CRITICA: {
    id: 'pastura_critica',
    nombre: 'Pastura Crítica',
    descripcion: 'Altura de pastura por debajo del remanente objetivo',
    enabled: true,
    prioridad: 'alta',
    tipo: 'alerta',

    /**
     * Valida si un lote cumple la condición de alerta
     * @param {Object} lote - Lote a validar
     * @returns {boolean|null} true si aplica, false si no, null si no se puede evaluar
     */
    validarLote: (lote) => {
      if (!lote.altura_pastura_cm || !lote.remanente_objetivo_cm) {
        return null; // No se puede evaluar
      }
      return lote.altura_pastura_cm < lote.remanente_objetivo_cm;
    },

    /**
     * Genera mensaje de alerta personalizado
     * @param {Object} lote - Lote con la alerta
     * @returns {Object} { titulo, descripcion }
     */
    generarMensaje: (lote) => ({
      titulo: `Pastura crítica en ${lote.nombre}`,
      descripcion: `La altura actual (${lote.altura_pastura_cm} cm) está por debajo del remanente objetivo (${lote.remanente_objetivo_cm} cm). Se recomienda cambiar animales a otro lote o ajustar la carga.`,
    }),
  },

  /**
   * ALERTA 2: Medición de Pastura Vencida
   * Condición: Lote ganadero sin medición > X días
   * Severidad: MEDIA (falta de control/datos)
   */
  MEDICION_VENCIDA: {
    id: 'medicion_vencida',
    nombre: 'Medición de Pastura Vencida',
    descripcion: 'Lote ganadero sin medición de pastura reciente',
    enabled: true,
    diasUmbral: 14, // Días sin medición
    prioridad: 'media',
    tipo: 'alerta',

    validarLote: (lote, diasUmbral = 14) => {
      // Solo aplica a lotes ganaderos o mixtos
      if (!['ganadero', 'mixto'].includes(lote.uso_suelo)) {
        return null; // No aplica a otros usos
      }

      // Si nunca se midió, es alerta
      if (!lote.fecha_medicion_pastura) {
        return true;
      }

      // Calcular días desde última medición
      const fechaMedicion = new Date(lote.fecha_medicion_pastura);
      const diasTranscurridos = Math.floor(
        (Date.now() - fechaMedicion.getTime()) / (1000 * 60 * 60 * 24)
      );

      return diasTranscurridos > diasUmbral;
    },

    generarMensaje: (lote, diasUmbral = 14) => {
      if (!lote.fecha_medicion_pastura) {
        return {
          titulo: `Medición nunca realizada: ${lote.nombre}`,
          descripcion: `Este lote nunca ha tenido una medición de pastura registrada. Se recomienda realizar medición inicial para establecer línea base de altura de pastura.`,
        };
      }

      const fechaMedicion = new Date(lote.fecha_medicion_pastura);
      const diasTranscurridos = Math.floor(
        (Date.now() - fechaMedicion.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        titulo: `Medición vencida en ${lote.nombre}`,
        descripcion: `Han transcurrido ${diasTranscurridos} días desde la última medición (${fechaMedicion.toLocaleDateString('es-ES')}). Se recomienda realizar nueva medición de altura de pastura para actualizar información de disponibilidad forrajera.`,
      };
    },
  },

  /**
   * ALERTA 3: Depósitos Sin Control
   * Condición: Lote depósito sin actualización > X días
   * Severidad: MEDIA (falta de control de insumos)
   */
  DEPOSITO_SIN_CONTROL: {
    id: 'deposito_sin_control',
    nombre: 'Depósito Sin Control',
    descripcion: 'Lote depósito de insumos sin actualización reciente',
    enabled: true,
    diasUmbral: 21, // Días sin actualización
    prioridad: 'media',
    tipo: 'alerta',

    validarLote: (lote, diasUmbral = 21) => {
      // Solo aplica a lotes que funcionan como depósito
      if (!lote.funciona_como_deposito) {
        return null; // No es depósito
      }

      // Calcular días desde última actualización
      const fechaActualizacion = new Date(lote.updated_at);
      const diasTranscurridos = Math.floor(
        (Date.now() - fechaActualizacion.getTime()) / (1000 * 60 * 60 * 24)
      );

      return diasTranscurridos > diasUmbral;
    },

    generarMensaje: (lote, diasUmbral = 21) => {
      const fechaActualizacion = new Date(lote.updated_at);
      const diasTranscurridos = Math.floor(
        (Date.now() - fechaActualizacion.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        titulo: `Depósito sin control: ${lote.nombre}`,
        descripcion: `Este lote funciona como depósito de insumos y no ha sido actualizado en ${diasTranscurridos} días (desde ${fechaActualizacion.toLocaleDateString('es-ES')}). Se recomienda revisar estado físico del lote, inventario de insumos y tomar acciones de mantenimiento si es necesario.`,
      };
    },
  },

  /**
   * ALERTA 4: NDVI Bajo Umbral
   * Condición: Valor NDVI < 0.4 (estrés vegetal)
   * Severidad: ALTA (indica problema de cultivo/vegetación)
   */
  NDVI_BAJO: {
    id: 'ndvi_bajo',
    nombre: 'NDVI Bajo Umbral',
    descripcion: 'Valor NDVI indica estrés vegetal o baja cobertura',
    enabled: true,
    umbralNDVI: 0.4, // Valores < 0.4 indican estrés
    prioridad: 'alta',
    tipo: 'alerta',

    validarLote: (lote, umbralNDVI = 0.4) => {
      // Solo si tenemos valor NDVI
      if (lote.ndvi_valor === null || lote.ndvi_valor === undefined) {
        return null; // NDVI no disponible aún
      }

      // Solo aplica a lotes con uso agrícola/ganadero/mixto
      if (!['agricola', 'ganadero', 'mixto'].includes(lote.uso_suelo)) {
        return null; // No aplica a otros usos
      }

      return lote.ndvi_valor < umbralNDVI;
    },

    generarMensaje: (lote, umbralNDVI = 0.4) => {
      // Clasificar severidad del estrés según NDVI
      let nivelEstres = 'moderado';
      let recomendacion = 'Se recomienda investigar posibles causas.';

      if (lote.ndvi_valor < 0.2) {
        nivelEstres = 'crítico';
        recomendacion = 'CRÍTICO: Investigar inmediatamente posibles causas de estrés severo.';
      } else if (lote.ndvi_valor < 0.3) {
        nivelEstres = 'severo';
        recomendacion = 'Se recomienda inspeccionar el lote e investigar causas.';
      }

      const fechaNDVI = lote.ndvi_fecha_actualizacion
        ? new Date(lote.ndvi_fecha_actualizacion).toLocaleDateString('es-ES')
        : 'desconocida';

      return {
        titulo: `NDVI bajo en ${lote.nombre}`,
        descripcion: `El valor NDVI actual (${lote.ndvi_valor.toFixed(2)}) está por debajo del umbral recomendado (${umbralNDVI}), indicando estrés vegetal ${nivelEstres}. Medición: ${fechaNDVI}. Posibles causas: sequía, plagas, enfermedades, mala nutrición, mal drenaje. ${recomendacion}`,
      };
    },
  },
};

// ============================================================================
// COLORES Y ESTILOS POR PRIORIDAD
// ============================================================================

export const PRIORIDADES = {
  alta: {
    label: 'Alta',
    color: 'bg-red-100 text-red-800 border-red-200',
    badgeColor: 'destructive',
    icon: 'AlertCircle',
  },
  media: {
    label: 'Media',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    badgeColor: 'warning',
    icon: 'AlertTriangle',
  },
  baja: {
    label: 'Baja',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColor: 'secondary',
    icon: 'Info',
  },
};

// ============================================================================
// CONFIGURACIÓN DE VERIFICACIÓN AUTOMÁTICA
// ============================================================================

export const CONFIG_VERIFICACION = {
  // ¿Con qué frecuencia ejecutar verificaciones automáticas? (en minutos)
  // null = solo manual (FASE 5)
  // 60 = cada hora (FASE 6)
  // 1440 = diariamente (FASE 6)
  intervaloMinutos: null,

  // ¿Limpiar alertas resueltas automáticamente?
  limpiarAlertasResueltasAuto: true,

  // ¿Enviar notificaciones? (FASE 6+)
  notificacionesEnabled: false,
};

// ============================================================================
// HELPER: Obtener regla por ID
// ============================================================================

export function obtenerRegla(reglaId) {
  const clave = Object.keys(REGLAS_ALERTAS).find(
    k => REGLAS_ALERTAS[k].id === reglaId
  );
  return clave ? REGLAS_ALERTAS[clave] : null;
}

console.log('[Alertas Config] ✓ Configuración de alertas automáticas cargada');
