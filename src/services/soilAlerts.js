/**
 * soilAlerts.js
 *
 * Servicio para generar y gestionar alertas de análisis de suelo
 * Integra con SOIL_ALERT_RULES y alertas.js
 */

import { supabase } from '../lib/supabase';
import { SOIL_ALERT_RULES } from '../lib/soilAlerts.config';
import { crearAlertaAutomatica } from './alertas';
import { differenceInDays } from 'date-fns';

/**
 * Obtiene análisis de suelo recientes para un lote
 * @param {string} lotId - ID del lote
 * @param {number} diasAtras - Días hacia atrás a buscar
 * @returns {Promise<Array>} Array de análisis
 */
async function obtenerAnalisisSueloPorLote(lotId, diasAtras = 180) {
  try {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - diasAtras);

    const { data, error } = await supabase
      .from('analisis_suelo')
      .select('*')
      .eq('lot_id', lotId)
      .gte('fecha', fechaInicio.toISOString())
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo análisis de suelo:', error);
    return [];
  }
}

/**
 * Obtiene el análisis de suelo más reciente para un lote
 * @param {string} lotId - ID del lote
 * @returns {Promise<Object|null>} Análisis más reciente
 */
async function obtenerAnalisisReciente(lotId) {
  try {
    const { data, error } = await supabase
      .from('analisis_suelo')
      .select('*')
      .eq('lot_id', lotId)
      .order('fecha', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error obteniendo análisis reciente:', error);
    return null;
  }
}

/**
 * Verifica déficit de Fósforo (P)
 * @param {string} lotId - ID del lote
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarDeficitFosforo(lotId, firmId) {
  try {
    const analisis = await obtenerAnalisisReciente(lotId);
    if (!analisis || !analisis.p_resultado || !analisis.p_objetivo) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SOIL_ALERT_RULES.DEFICIT_FOSFORO;

    if (regla.enabled && regla.validar(analisis.p_resultado, analisis.p_objetivo)) {
      const mensaje = regla.generarMensaje(
        analisis.p_resultado,
        analisis.p_objetivo,
        analisis.p_fuente_recomendada,
        analisis.p_kg_ha
      );

      // Obtener premise_id del lote
      const { data: loteData } = await supabase
        .from('lots')
        .select('premise_id')
        .eq('id', lotId)
        .single();

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: loteData?.premise_id,
        tipo: 'deficit_fosforo',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          lot_id: lotId,
          resultado: analisis.p_resultado,
          objetivo: analisis.p_objetivo,
          deficit: parseFloat(analisis.p_objetivo) - parseFloat(analisis.p_resultado),
          fuente: analisis.p_fuente_recomendada,
          kg_ha: analisis.p_kg_ha,
          kg_total: analisis.p_kg_total,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando déficit de fósforo:', error);
    throw error;
  }
}

/**
 * Verifica déficit de Potasio (K)
 * @param {string} lotId - ID del lote
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarDeficitPotasio(lotId, firmId) {
  try {
    const analisis = await obtenerAnalisisReciente(lotId);
    if (!analisis || !analisis.k_resultado || !analisis.k_objetivo) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SOIL_ALERT_RULES.DEFICIT_POTASIO;

    if (regla.enabled && regla.validar(analisis.k_resultado, analisis.k_objetivo)) {
      const mensaje = regla.generarMensaje(
        analisis.k_resultado,
        analisis.k_objetivo,
        analisis.k_fuente_recomendada,
        analisis.k_kg_ha
      );

      const { data: loteData } = await supabase
        .from('lots')
        .select('premise_id')
        .eq('id', lotId)
        .single();

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: loteData?.premise_id,
        tipo: 'deficit_potasio',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          lot_id: lotId,
          resultado: analisis.k_resultado,
          objetivo: analisis.k_objetivo,
          deficit: parseFloat(analisis.k_objetivo) - parseFloat(analisis.k_resultado),
          fuente: analisis.k_fuente_recomendada,
          kg_ha: analisis.k_kg_ha,
          kg_total: analisis.k_kg_total,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando déficit de potasio:', error);
    throw error;
  }
}

/**
 * Verifica pH crítico
 * @param {string} lotId - ID del lote
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarPhCritico(lotId, firmId) {
  try {
    const analisis = await obtenerAnalisisReciente(lotId);
    if (!analisis || !analisis.ph) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SOIL_ALERT_RULES.PH_CRITICO;

    if (regla.enabled && regla.validar(analisis.ph)) {
      const mensaje = regla.generarMensaje(analisis.ph);

      const { data: loteData } = await supabase
        .from('lots')
        .select('premise_id')
        .eq('id', lotId)
        .single();

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: loteData?.premise_id,
        tipo: 'ph_critico',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          lot_id: lotId,
          ph: analisis.ph,
          rangoOptimo: regla.rangoOptimo,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando pH crítico:', error);
    throw error;
  }
}

/**
 * Verifica déficit de Nitrógeno (N)
 * @param {string} lotId - ID del lote
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarDeficitNitrogeno(lotId, firmId) {
  try {
    const analisis = await obtenerAnalisisReciente(lotId);
    if (!analisis || !analisis.n_resultado || !analisis.n_objetivo) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SOIL_ALERT_RULES.DEFICIT_NITROGENO;

    if (regla.enabled && regla.validar(analisis.n_resultado, analisis.n_objetivo)) {
      const mensaje = regla.generarMensaje(
        analisis.n_resultado,
        analisis.n_objetivo,
        analisis.n_fuente_recomendada,
        analisis.n_kg_ha
      );

      const { data: loteData } = await supabase
        .from('lots')
        .select('premise_id')
        .eq('id', lotId)
        .single();

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: loteData?.premise_id,
        tipo: 'deficit_nitrogeno',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          lot_id: lotId,
          resultado: analisis.n_resultado,
          objetivo: analisis.n_objetivo,
          deficit: parseFloat(analisis.n_objetivo) - parseFloat(analisis.n_resultado),
          fuente: analisis.n_fuente_recomendada,
          kg_ha: analisis.n_kg_ha,
          kg_total: analisis.n_kg_total,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando déficit de nitrógeno:', error);
    throw error;
  }
}

/**
 * Verifica baja materia orgánica
 * @param {string} lotId - ID del lote
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarBajaMateriaOrganica(lotId, firmId) {
  try {
    const analisis = await obtenerAnalisisReciente(lotId);
    if (!analisis || !analisis.mo) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SOIL_ALERT_RULES.BAJA_MATERIA_ORGANICA;

    if (regla.enabled && regla.validar(analisis.mo)) {
      const mensaje = regla.generarMensaje(analisis.mo);

      const { data: loteData } = await supabase
        .from('lots')
        .select('premise_id')
        .eq('id', lotId)
        .single();

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: loteData?.premise_id,
        tipo: 'baja_materia_organica',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          lot_id: lotId,
          mo: analisis.mo,
          umbral: regla.umbralMinimo,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando materia orgánica:', error);
    throw error;
  }
}

/**
 * Verifica déficit de Azufre (S)
 * @param {string} lotId - ID del lote
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarDeficitAzufre(lotId, firmId) {
  try {
    const analisis = await obtenerAnalisisReciente(lotId);
    if (!analisis || !analisis.s_resultado || !analisis.s_objetivo) {
      return { alertasCreadas: [], analisis: null };
    }

    const alertasCreadas = [];
    const regla = SOIL_ALERT_RULES.DEFICIT_AZUFRE;

    if (regla.enabled && regla.validar(analisis.s_resultado, analisis.s_objetivo)) {
      const mensaje = regla.generarMensaje(
        analisis.s_resultado,
        analisis.s_objetivo,
        analisis.s_fuente_recomendada,
        analisis.s_kg_ha
      );

      const { data: loteData } = await supabase
        .from('lots')
        .select('premise_id')
        .eq('id', lotId)
        .single();

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: loteData?.premise_id,
        tipo: 'deficit_azufre',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          lot_id: lotId,
          resultado: analisis.s_resultado,
          objetivo: analisis.s_objetivo,
          deficit: parseFloat(analisis.s_objetivo) - parseFloat(analisis.s_resultado),
          fuente: analisis.s_fuente_recomendada,
          kg_ha: analisis.s_kg_ha,
          kg_total: analisis.s_kg_total,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return { alertasCreadas, analisis };
  } catch (error) {
    console.error('Error verificando déficit de azufre:', error);
    throw error;
  }
}

/**
 * Verifica fertilización pendiente (análisis con déficit sin aplicar)
 * @param {string} premiseId - ID del predio
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarFertilizacionPendiente(premiseId, firmId) {
  try {
    // Obtener lotes del predio
    const { data: lotes, error: lotesError } = await supabase
      .from('lots')
      .select('id, name')
      .eq('premise_id', premiseId);

    if (lotesError) throw lotesError;

    const alertasCreadas = [];
    const regla = SOIL_ALERT_RULES.FERTILIZACION_PENDIENTE;

    if (!regla.enabled) {
      return { alertasCreadas, analisisPendientes: [] };
    }

    // Buscar análisis con déficit no aplicado
    for (const lote of lotes || []) {
      const analisis = await obtenerAnalisisReciente(lote.id);

      if (!analisis || analisis.aplicado) continue;

      const diasDesdeAnalisis = differenceInDays(new Date(), new Date(analisis.fecha));

      // Detectar si hay déficit en algún parámetro
      let tieneDeficit = false;
      let parametro = '';
      let fuente = '';
      let kgTotal = 0;

      // Verificar P
      if (analisis.p_resultado && analisis.p_objetivo) {
        const porcP = (parseFloat(analisis.p_resultado) / parseFloat(analisis.p_objetivo)) * 100;
        if (porcP < 70) {
          tieneDeficit = true;
          parametro = 'Fósforo (P)';
          fuente = analisis.p_fuente_recomendada;
          kgTotal = analisis.p_kg_total;
        }
      }

      // Verificar K si no hay déficit de P
      if (!tieneDeficit && analisis.k_resultado && analisis.k_objetivo) {
        const porcK = (parseFloat(analisis.k_resultado) / parseFloat(analisis.k_objetivo)) * 100;
        if (porcK < 70) {
          tieneDeficit = true;
          parametro = 'Potasio (K)';
          fuente = analisis.k_fuente_recomendada;
          kgTotal = analisis.k_kg_total;
        }
      }

      // Verificar N si no hay otros déficits
      if (!tieneDeficit && analisis.n_resultado && analisis.n_objetivo) {
        const porcN = (parseFloat(analisis.n_resultado) / parseFloat(analisis.n_objetivo)) * 100;
        if (porcN < 70) {
          tieneDeficit = true;
          parametro = 'Nitrógeno (N)';
          fuente = analisis.n_fuente_recomendada;
          kgTotal = analisis.n_kg_total;
        }
      }

      if (tieneDeficit && regla.validar(diasDesdeAnalisis, analisis.aplicado)) {
        const mensaje = regla.generarMensaje(diasDesdeAnalisis, parametro, fuente, kgTotal);

        const alertaCreada = await crearAlertaAutomatica({
          firm_id: firmId,
          premise_id: premiseId,
          tipo: 'fertilizacion_pendiente',
          prioridad: regla.prioridad,
          titulo: mensaje.titulo,
          descripcion: mensaje.descripcion,
          regla_aplicada: regla.id,
          metadata: {
            lot_id: lote.id,
            lot_name: lote.name,
            diasDesdeAnalisis,
            parametro,
            fuente,
            kg_total: kgTotal,
            fecha_analisis: analisis.fecha,
            recomendacion: mensaje.recomendacion
          }
        });

        if (alertaCreada) {
          alertasCreadas.push(alertaCreada);
        }
      }
    }

    return { alertasCreadas, analisisPendientes: alertasCreadas.length };
  } catch (error) {
    console.error('Error verificando fertilización pendiente:', error);
    throw error;
  }
}

/**
 * Ejecuta todas las verificaciones de alertas de suelo para un lote
 * @param {string} lotId - ID del lote
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado con todas las alertas creadas
 */
export async function verificarTodasLasAlertasSueloPorLote(lotId, firmId) {
  try {
    const resultados = await Promise.all([
      verificarDeficitFosforo(lotId, firmId),
      verificarDeficitPotasio(lotId, firmId),
      verificarPhCritico(lotId, firmId),
      verificarDeficitNitrogeno(lotId, firmId),
      verificarBajaMateriaOrganica(lotId, firmId),
      verificarDeficitAzufre(lotId, firmId)
    ]);

    const todasLasAlertas = resultados.reduce((acc, resultado) => {
      return acc.concat(resultado.alertasCreadas || []);
    }, []);

    return {
      totalAlertas: todasLasAlertas.length,
      alertasCreadas: todasLasAlertas,
      detalles: {
        fosforo: resultados[0],
        potasio: resultados[1],
        ph: resultados[2],
        nitrogeno: resultados[3],
        materiaOrganica: resultados[4],
        azufre: resultados[5]
      }
    };
  } catch (error) {
    console.error('Error verificando todas las alertas de suelo:', error);
    throw error;
  }
}

/**
 * Ejecuta todas las verificaciones de alertas de suelo para un predio
 * @param {string} firmId - ID de la firma
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Object>} Resultado con todas las alertas creadas
 */
export async function verificarTodasLasAlertasSuelo(firmId, premiseId) {
  try {
    // Obtener todos los lotes del predio
    const { data: lotes, error: lotesError } = await supabase
      .from('lots')
      .select('id, name')
      .eq('premise_id', premiseId);

    if (lotesError) throw lotesError;

    const alertasPorLote = [];

    // Verificar cada lote
    for (const lote of lotes || []) {
      const resultado = await verificarTodasLasAlertasSueloPorLote(lote.id, firmId);
      if (resultado.totalAlertas > 0) {
        alertasPorLote.push({
          lote_id: lote.id,
          lote_name: lote.name,
          ...resultado
        });
      }
    }

    // Verificar fertilización pendiente a nivel predio
    const fertilizacionPendiente = await verificarFertilizacionPendiente(premiseId, firmId);

    const todasLasAlertas = [
      ...alertasPorLote.flatMap(l => l.alertasCreadas || []),
      ...fertilizacionPendiente.alertasCreadas
    ];

    return {
      totalAlertas: todasLasAlertas.length,
      alertasCreadas: todasLasAlertas,
      alertasPorLote,
      fertilizacionPendiente
    };
  } catch (error) {
    console.error('Error verificando todas las alertas de suelo:', error);
    throw error;
  }
}

/**
 * Obtiene resumen de estado de suelo con alertas activas
 * @param {string} premiseId - ID del predio
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resumen de estado
 */
export async function obtenerResumenEstadoSuelo(premiseId, firmId) {
  try {
    // Obtener alertas activas de suelo
    const { data: alertasActivas, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmId)
      .eq('premise_id', premiseId)
      .in('tipo', [
        'deficit_fosforo',
        'deficit_potasio',
        'ph_critico',
        'deficit_nitrogeno',
        'baja_materia_organica',
        'deficit_azufre',
        'fertilizacion_pendiente'
      ])
      .eq('estado', 'pendiente')
      .order('prioridad', { ascending: false });

    if (error) throw error;

    // Obtener lotes con análisis recientes
    const { data: lotes } = await supabase
      .from('lots')
      .select('id, name')
      .eq('premise_id', premiseId);

    const analisisPorLote = [];
    for (const lote of lotes || []) {
      const analisis = await obtenerAnalisisReciente(lote.id);
      if (analisis) {
        analisisPorLote.push({
          lote_id: lote.id,
          lote_name: lote.name,
          analisis
        });
      }
    }

    return {
      alertasActivas: alertasActivas || [],
      totalAlertas: (alertasActivas || []).length,
      analisisPorLote,
      lotesConAnalisis: analisisPorLote.length
    };
  } catch (error) {
    console.error('Error obteniendo resumen de estado de suelo:', error);
    throw error;
  }
}
