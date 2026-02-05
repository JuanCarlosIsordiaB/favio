/**
 * seedAlerts.js
 *
 * Servicio para generar y gestionar alertas de análisis de semillas
 * Integra con SEED_ALERT_RULES y alertas.js
 */

import { supabase } from '../lib/supabase';
import { SEED_ALERT_RULES, calcularCalidadGeneral } from '../lib/seedAlerts.config';
import { crearAlertaAutomatica } from './alertas';

/**
 * Obtiene análisis de semillas por variedad
 * @param {string} seedVarietyId - ID de la variedad de semilla
 * @returns {Promise<Array>} Array de análisis
 */
async function obtenerAnalisisPorVariedad(seedVarietyId) {
  try {
    const { data, error } = await supabase
      .from('analisis_semillas')
      .select('*')
      .eq('seed_variety_id', seedVarietyId)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo análisis de semillas:', error);
    return [];
  }
}

/**
 * Obtiene el análisis de semilla más reciente para una variedad
 * @param {string} seedVarietyId - ID de la variedad
 * @returns {Promise<Object|null>} Análisis más reciente
 */
async function obtenerAnalisisSemillaReciente(seedVarietyId) {
  try {
    const { data, error } = await supabase
      .from('analisis_semillas')
      .select('*')
      .eq('seed_variety_id', seedVarietyId)
      .order('fecha', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error obteniendo análisis de semilla:', error);
    return null;
  }
}

/**
 * Verifica baja germinación
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarBajaGerminacion(seedVarietyId, firmId) {
  try {
    const analisis = await obtenerAnalisisSemillaReciente(seedVarietyId);
    if (!analisis || !analisis.germinacion) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SEED_ALERT_RULES.BAJA_GERMINACION;

    if (regla.enabled && regla.validar(analisis.germinacion)) {
      // Obtener nombre de variedad
      const { data: variedad } = await supabase
        .from('seed_varieties')
        .select('name, firm_id')
        .eq('id', seedVarietyId)
        .single();

      const mensaje = regla.generarMensaje(analisis.germinacion, variedad?.name);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        tipo: 'baja_germinacion',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          seed_variety_id: seedVarietyId,
          seed_variety_name: variedad?.name,
          germinacion: analisis.germinacion,
          umbral: regla.umbralMinimo,
          fecha_analisis: analisis.fecha,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando germinación:', error);
    throw error;
  }
}

/**
 * Verifica semilla inviable (germinación crítica)
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarSemillaInviable(seedVarietyId, firmId) {
  try {
    const analisis = await obtenerAnalisisSemillaReciente(seedVarietyId);
    if (!analisis || !analisis.germinacion) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SEED_ALERT_RULES.SEMILLA_INVIABLE;

    if (regla.enabled && regla.validar(analisis.germinacion)) {
      const { data: variedad } = await supabase
        .from('seed_varieties')
        .select('name')
        .eq('id', seedVarietyId)
        .single();

      const mensaje = regla.generarMensaje(analisis.germinacion, variedad?.name);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        tipo: 'semilla_inviable',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          seed_variety_id: seedVarietyId,
          seed_variety_name: variedad?.name,
          germinacion: analisis.germinacion,
          umbral: regla.umbralCritico,
          fecha_analisis: analisis.fecha,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando semilla inviable:', error);
    throw error;
  }
}

/**
 * Verifica baja pureza
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarBajaPureza(seedVarietyId, firmId) {
  try {
    const analisis = await obtenerAnalisisSemillaReciente(seedVarietyId);
    if (!analisis || !analisis.pureza) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SEED_ALERT_RULES.BAJA_PUREZA;

    if (regla.enabled && regla.validar(analisis.pureza)) {
      const { data: variedad } = await supabase
        .from('seed_varieties')
        .select('name')
        .eq('id', seedVarietyId)
        .single();

      const mensaje = regla.generarMensaje(analisis.pureza, variedad?.name);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        tipo: 'baja_pureza',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          seed_variety_id: seedVarietyId,
          seed_variety_name: variedad?.name,
          pureza: analisis.pureza,
          umbral: regla.umbralMinimo,
          fecha_analisis: analisis.fecha,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando pureza:', error);
    throw error;
  }
}

/**
 * Verifica humedad alta
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarHumedadAlta(seedVarietyId, firmId) {
  try {
    const analisis = await obtenerAnalisisSemillaReciente(seedVarietyId);
    if (!analisis || !analisis.humedad) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SEED_ALERT_RULES.HUMEDAD_ALTA;

    if (regla.enabled && regla.validar(analisis.humedad)) {
      const { data: variedad } = await supabase
        .from('seed_varieties')
        .select('name')
        .eq('id', seedVarietyId)
        .single();

      const mensaje = regla.generarMensaje(analisis.humedad, variedad?.name);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        tipo: 'humedad_alta',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          seed_variety_id: seedVarietyId,
          seed_variety_name: variedad?.name,
          humedad: analisis.humedad,
          umbral: regla.umbralMaximo,
          fecha_analisis: analisis.fecha,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando humedad:', error);
    throw error;
  }
}

/**
 * Verifica baja viabilidad (test de tetrazolio)
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarBajaViabilidadTetrazolio(seedVarietyId, firmId) {
  try {
    const analisis = await obtenerAnalisisSemillaReciente(seedVarietyId);
    if (!analisis || !analisis.tetrazolio) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SEED_ALERT_RULES.BAJA_VIABILIDAD_TETRAZOLIO;

    if (regla.enabled && regla.validar(analisis.tetrazolio)) {
      const { data: variedad } = await supabase
        .from('seed_varieties')
        .select('name')
        .eq('id', seedVarietyId)
        .single();

      const mensaje = regla.generarMensaje(analisis.tetrazolio, variedad?.name);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        tipo: 'baja_viabilidad_tetrazolio',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          seed_variety_id: seedVarietyId,
          seed_variety_name: variedad?.name,
          tetrazolio: analisis.tetrazolio,
          umbral: regla.umbralMinimo,
          fecha_analisis: analisis.fecha,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando viabilidad tetrazolio:', error);
    throw error;
  }
}

/**
 * Verifica discrepancia entre tests (germinación vs tetrazolio)
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarDiscrepanciaTests(seedVarietyId, firmId) {
  try {
    const analisis = await obtenerAnalisisSemillaReciente(seedVarietyId);
    if (!analisis || !analisis.germinacion || !analisis.tetrazolio) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SEED_ALERT_RULES.DISCREPANCIA_TESTS;

    if (regla.enabled && regla.validar(analisis.germinacion, analisis.tetrazolio)) {
      const { data: variedad } = await supabase
        .from('seed_varieties')
        .select('name')
        .eq('id', seedVarietyId)
        .single();

      const mensaje = regla.generarMensaje(
        analisis.germinacion,
        analisis.tetrazolio,
        variedad?.name
      );

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        tipo: 'discrepancia_tests',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          seed_variety_id: seedVarietyId,
          seed_variety_name: variedad?.name,
          germinacion: analisis.germinacion,
          tetrazolio: analisis.tetrazolio,
          diferencia: Math.abs(parseFloat(analisis.germinacion) - parseFloat(analisis.tetrazolio)),
          umbral: regla.umbralDiferencia,
          fecha_analisis: analisis.fecha,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando discrepancia de tests:', error);
    throw error;
  }
}

/**
 * Verifica semilla deteriorada (múltiples parámetros fuera de rango)
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarSemillaDeteriorada(seedVarietyId, firmId) {
  try {
    const analisis = await obtenerAnalisisSemillaReciente(seedVarietyId);
    if (!analisis) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SEED_ALERT_RULES.SEMILLA_DETERIORADA;

    if (regla.enabled && regla.validar(
      analisis.germinacion,
      analisis.pureza,
      analisis.humedad,
      analisis.tetrazolio
    )) {
      const { data: variedad } = await supabase
        .from('seed_varieties')
        .select('name')
        .eq('id', seedVarietyId)
        .single();

      const mensaje = regla.generarMensaje(
        analisis.germinacion,
        analisis.pureza,
        analisis.humedad,
        variedad?.name
      );

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        tipo: 'semilla_deteriorada',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          seed_variety_id: seedVarietyId,
          seed_variety_name: variedad?.name,
          germinacion: analisis.germinacion,
          pureza: analisis.pureza,
          humedad: analisis.humedad,
          tetrazolio: analisis.tetrazolio,
          fecha_analisis: analisis.fecha,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando semilla deteriorada:', error);
    throw error;
  }
}

/**
 * Ejecuta todas las verificaciones de alertas para una variedad de semilla
 * @param {string} seedVarietyId - ID de la variedad
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado con todas las alertas creadas
 */
export async function verificarTodasLasAlertasSemilla(seedVarietyId, firmId) {
  try {
    // Primero verificar semilla inviable (crítica)
    const inviable = await verificarSemillaInviable(seedVarietyId, firmId);

    // Si es inviable, no ejecutar otras verificaciones (para evitar alertas redundantes)
    if (inviable.alertasCreadas.length > 0) {
      return {
        totalAlertas: inviable.alertasCreadas.length,
        alertasCreadas: inviable.alertasCreadas,
        detalles: { inviable }
      };
    }

    // Si no es inviable, verificar semilla deteriorada
    const deteriorada = await verificarSemillaDeteriorada(seedVarietyId, firmId);

    // Si está deteriorada, no verificar parámetros individuales
    if (deteriorada.alertasCreadas.length > 0) {
      return {
        totalAlertas: deteriorada.alertasCreadas.length,
        alertasCreadas: deteriorada.alertasCreadas,
        detalles: { deteriorada }
      };
    }

    // Si no es ni inviable ni deteriorada, verificar parámetros individuales
    const resultados = await Promise.all([
      verificarBajaGerminacion(seedVarietyId, firmId),
      verificarBajaPureza(seedVarietyId, firmId),
      verificarHumedadAlta(seedVarietyId, firmId),
      verificarBajaViabilidadTetrazolio(seedVarietyId, firmId),
      verificarDiscrepanciaTests(seedVarietyId, firmId)
    ]);

    const todasLasAlertas = resultados.reduce((acc, resultado) => {
      return acc.concat(resultado.alertasCreadas || []);
    }, []);

    return {
      totalAlertas: todasLasAlertas.length,
      alertasCreadas: todasLasAlertas,
      detalles: {
        germinacion: resultados[0],
        pureza: resultados[1],
        humedad: resultados[2],
        tetrazolio: resultados[3],
        discrepancia: resultados[4]
      }
    };
  } catch (error) {
    console.error('Error verificando todas las alertas de semilla:', error);
    throw error;
  }
}

/**
 * Ejecuta verificaciones de alertas para todas las variedades de una firma
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado con todas las alertas creadas
 */
export async function verificarTodasLasAlertasSemillas(firmId) {
  try {
    // Obtener todas las variedades de la firma
    const { data: variedades, error: variedadesError } = await supabase
      .from('seed_varieties')
      .select('id, name')
      .eq('firm_id', firmId);

    if (variedadesError) throw variedadesError;

    const alertasPorVariedad = [];

    // Verificar cada variedad
    for (const variedad of variedades || []) {
      const resultado = await verificarTodasLasAlertasSemilla(variedad.id, firmId);
      if (resultado.totalAlertas > 0) {
        alertasPorVariedad.push({
          variedad_id: variedad.id,
          variedad_name: variedad.name,
          ...resultado
        });
      }
    }

    const todasLasAlertas = alertasPorVariedad.flatMap(v => v.alertasCreadas || []);

    return {
      totalAlertas: todasLasAlertas.length,
      alertasCreadas: todasLasAlertas,
      alertasPorVariedad,
      totalVariedades: variedades?.length || 0,
      variedadesConAlertas: alertasPorVariedad.length
    };
  } catch (error) {
    console.error('Error verificando todas las alertas de semillas:', error);
    throw error;
  }
}

/**
 * Obtiene resumen de estado de semillas con alertas activas
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resumen de estado
 */
export async function obtenerResumenEstadoSemillas(firmId) {
  try {
    // Obtener alertas activas de semillas
    const { data: alertasActivas, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmId)
      .in('tipo', [
        'baja_germinacion',
        'semilla_inviable',
        'baja_pureza',
        'humedad_alta',
        'baja_viabilidad_tetrazolio',
        'discrepancia_tests',
        'semilla_deteriorada'
      ])
      .eq('estado', 'pendiente')
      .order('prioridad', { ascending: false });

    if (error) throw error;

    // Obtener variedades con análisis recientes
    const { data: variedades } = await supabase
      .from('seed_varieties')
      .select('id, name')
      .eq('firm_id', firmId);

    const analisisPorVariedad = [];
    for (const variedad of variedades || []) {
      const analisis = await obtenerAnalisisSemillaReciente(variedad.id);
      if (analisis) {
        const calidad = calcularCalidadGeneral({
          germinacion: analisis.germinacion,
          pureza: analisis.pureza,
          humedad: analisis.humedad,
          tetrazolio: analisis.tetrazolio
        });

        analisisPorVariedad.push({
          variedad_id: variedad.id,
          variedad_name: variedad.name,
          analisis,
          calidad
        });
      }
    }

    return {
      alertasActivas: alertasActivas || [],
      totalAlertas: (alertasActivas || []).length,
      analisisPorVariedad,
      variedadesConAnalisis: analisisPorVariedad.length,
      totalVariedades: variedades?.length || 0
    };
  } catch (error) {
    console.error('Error obteniendo resumen de estado de semillas:', error);
    throw error;
  }
}

