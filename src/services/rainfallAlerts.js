/**
 * rainfallAlerts.js
 *
 * Servicio para generar y gestionar alertas de lluvia
 * Integra con rainfallAnalytics.js y alertas.js
 */

import { supabase } from '../lib/supabase';
import {
  detectarDeficitHidrico,
  detectarExcesoLluvia,
  obtenerCampaniaActual,
  compararConPromedio,
  obtenerRegistrosLluvia,
  calcularAcumuladoLluvia
} from './rainfallAnalytics';
import { calcularDiasSinLluvia } from '../lib/rainfallCalculations';
import { RAINFALL_ALERT_RULES } from '../lib/rainfallAlerts.config';
import { crearAlertaAutomatica } from './alertas';

/**
 * Verifica alerta de déficit hídrico (sequía moderada/severa)
 * @param {string} premiseId - ID del predio
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarDeficitHidrico(premiseId, firmId) {
  try {
    const deficitInfo = await detectarDeficitHidrico(premiseId, 30, 50);

    const alertasCreadas = [];

    // Verificar sequía severa primero
    const reglaSevera = RAINFALL_ALERT_RULES.SEQUIA_SEVERA;
    if (reglaSevera.enabled && reglaSevera.validar(deficitInfo.acumulado, 30)) {
      const mensaje = reglaSevera.generarMensaje(deficitInfo.acumulado, 30);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: premiseId,
        tipo: 'deficit_hidrico',
        prioridad: reglaSevera.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: reglaSevera.id,
        metadata: {
          acumulado: deficitInfo.acumulado,
          umbral: reglaSevera.umbralMmMinimo,
          dias: 30,
          severidad: 'SEVERA',
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }
    // Si no hay sequía severa, verificar moderada
    else {
      const reglaModera = RAINFALL_ALERT_RULES.SEQUIA_MODERADA;
      if (reglaModera.enabled && reglaModera.validar(deficitInfo.acumulado, 30)) {
        const mensaje = reglaModera.generarMensaje(deficitInfo.acumulado, 30);

        const alertaCreada = await crearAlertaAutomatica({
          firm_id: firmId,
          premise_id: premiseId,
          tipo: 'deficit_hidrico',
          prioridad: reglaModera.prioridad,
          titulo: mensaje.titulo,
          descripcion: mensaje.descripcion,
          regla_aplicada: reglaModera.id,
          metadata: {
            acumulado: deficitInfo.acumulado,
            umbral: reglaModera.umbralMmMinimo,
            dias: 30,
            severidad: 'MODERADA',
            recomendacion: mensaje.recomendacion
          }
        });

        if (alertaCreada) {
          alertasCreadas.push(alertaCreada);
        }
      }
    }

    return {
      alertasCreadas,
      deficitInfo
    };
  } catch (error) {
    console.error('Error verificando déficit hídrico:', error);
    throw error;
  }
}

/**
 * Verifica alerta de exceso de lluvia
 * @param {string} premiseId - ID del predio
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarExcesoLluvia(premiseId, firmId) {
  try {
    const excesoInfo = await detectarExcesoLluvia(premiseId, 7, 150);

    const alertasCreadas = [];

    const regla = RAINFALL_ALERT_RULES.EXCESO_AGUA;
    if (regla.enabled && excesoInfo.hayExceso) {
      const mensaje = regla.generarMensaje(excesoInfo.acumulado, 7);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: premiseId,
        tipo: 'exceso_agua',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          acumulado: excesoInfo.acumulado,
          umbral: regla.umbralMmMaximo,
          dias: 7,
          severidad: excesoInfo.severidad,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return {
      alertasCreadas,
      excesoInfo
    };
  } catch (error) {
    console.error('Error verificando exceso de lluvia:', error);
    throw error;
  }
}

/**
 * Verifica alerta de campaña seca
 * @param {string} premiseId - ID del predio
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarCampaniaSeca(premiseId, firmId) {
  try {
    const campaniaActual = await obtenerCampaniaActual(premiseId);

    // Obtener promedio histórico de campañas anteriores (5 años)
    const { promedioHistorico } = await compararConPromedio(
      premiseId,
      campaniaActual.fechaInicio,
      campaniaActual.fechaFin,
      5
    );

    const alertasCreadas = [];

    const regla = RAINFALL_ALERT_RULES.CAMPANIA_SECA;
    if (regla.enabled && regla.validar(campaniaActual.acumulado, promedioHistorico)) {
      const mensaje = regla.generarMensaje(campaniaActual.acumulado, promedioHistorico);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: premiseId,
        tipo: 'campania_seca',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          acumuladoCampania: campaniaActual.acumulado,
          promedioHistorico,
          porcentaje: ((campaniaActual.acumulado / promedioHistorico) * 100).toFixed(1),
          campania: campaniaActual.nombre,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return {
      alertasCreadas,
      campaniaActual,
      promedioHistorico
    };
  } catch (error) {
    console.error('Error verificando campaña seca:', error);
    throw error;
  }
}

/**
 * Verifica alerta de días sin lluvia
 * @param {string} premiseId - ID del predio
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resultado de verificación
 */
export async function verificarDiasSinLluvia(premiseId, firmId) {
  try {
    const registros = await obtenerRegistrosLluvia(premiseId);
    const diasSinLluvia = calcularDiasSinLluvia(registros, 1);

    const alertasCreadas = [];

    const regla = RAINFALL_ALERT_RULES.DIAS_SIN_LLUVIA;
    if (regla.enabled && regla.validar(diasSinLluvia)) {
      const mensaje = regla.generarMensaje(diasSinLluvia);

      const alertaCreada = await crearAlertaAutomatica({
        firm_id: firmId,
        premise_id: premiseId,
        tipo: 'dias_sin_lluvia',
        prioridad: regla.prioridad,
        titulo: mensaje.titulo,
        descripcion: mensaje.descripcion,
        regla_aplicada: regla.id,
        metadata: {
          diasSinLluvia,
          umbral: regla.umbralDias,
          recomendacion: mensaje.recomendacion
        }
      });

      if (alertaCreada) {
        alertasCreadas.push(alertaCreada);
      }
    }

    return {
      alertasCreadas,
      diasSinLluvia
    };
  } catch (error) {
    console.error('Error verificando días sin lluvia:', error);
    throw error;
  }
}

/**
 * Ejecuta todas las verificaciones de alertas de lluvia
 * @param {string} firmId - ID de la firma
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Object>} Resultado con todas las alertas creadas
 */
export async function verificarTodasLasAlertasLluvia(firmId, premiseId) {
  try {
    const resultados = await Promise.all([
      verificarDeficitHidrico(premiseId, firmId),
      verificarExcesoLluvia(premiseId, firmId),
      verificarCampaniaSeca(premiseId, firmId),
      verificarDiasSinLluvia(premiseId, firmId)
    ]);

    const todasLasAlertas = resultados.reduce((acc, resultado) => {
      return acc.concat(resultado.alertasCreadas || []);
    }, []);

    return {
      totalAlertas: todasLasAlertas.length,
      alertasCreadas: todasLasAlertas,
      detalles: {
        deficitHidrico: resultados[0],
        excesoLluvia: resultados[1],
        campaniaSeca: resultados[2],
        diasSinLluvia: resultados[3]
      }
    };
  } catch (error) {
    console.error('Error verificando todas las alertas de lluvia:', error);
    throw error;
  }
}

/**
 * Obtiene resumen de estado de lluvia con alertas activas
 * @param {string} premiseId - ID del predio
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Resumen de estado
 */
export async function obtenerResumenEstadoLluvia(premiseId, firmId) {
  try {
    // Obtener alertas activas de lluvia
    const { data: alertasActivas, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmId)
      .eq('premise_id', premiseId)
      .in('tipo', ['deficit_hidrico', 'exceso_agua', 'campania_seca', 'dias_sin_lluvia'])
      .eq('estado', 'pendiente')
      .order('prioridad', { ascending: false });

    if (error) throw error;

    // Obtener estadísticas actuales
    const [deficitInfo, excesoInfo, diasSinLluviaData] = await Promise.all([
      detectarDeficitHidrico(premiseId, 30, 50),
      detectarExcesoLluvia(premiseId, 7, 150),
      obtenerRegistrosLluvia(premiseId).then(r => ({
        diasSinLluvia: calcularDiasSinLluvia(r, 1)
      }))
    ]);

    return {
      alertasActivas: alertasActivas || [],
      totalAlertas: (alertasActivas || []).length,
      estadoActual: {
        deficitHidrico: deficitInfo,
        excesoLluvia: excesoInfo,
        diasSinLluvia: diasSinLluviaData.diasSinLluvia
      }
    };
  } catch (error) {
    console.error('Error obteniendo resumen de estado de lluvia:', error);
    throw error;
  }
}
