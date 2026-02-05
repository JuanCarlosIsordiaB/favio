/**
 * rainfallAnalytics.js
 *
 * Servicio para análisis de datos de lluvia con Supabase
 * Funciones asíncronas que consultan la BD y aplican cálculos
 */

import { supabase } from '../lib/supabase';
import {
  calcularAcumulado,
  agruparPorMes,
  agruparPorAnio,
  calcularPromedio,
  clasificarCampania,
  obtenerRangoCampania,
  obtenerCampaniaDeUnaFecha,
  filtrarPorRangoFechas,
  calcularDiasSinLluvia,
  obtenerEstadisticasMensuales,
  calcularBalanceHidrico
} from '../lib/rainfallCalculations';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Obtiene todos los registros de lluvia de un predio
 * @param {string} premiseId - ID del predio
 * @param {Date} fechaInicio - Fecha de inicio (opcional)
 * @param {Date} fechaFin - Fecha de fin (opcional)
 * @returns {Promise<Array>} Array de registros de lluvia
 */
export async function obtenerRegistrosLluvia(premiseId, fechaInicio = null, fechaFin = null) {
  try {
    let query = supabase
      .from('lluvias')
      .select('*')
      .eq('premise_id', premiseId)
      .order('fecha', { ascending: false });

    if (fechaInicio) {
      const fechaInicioStr = format(fechaInicio, 'yyyy-MM-dd');
      query = query.gte('fecha', fechaInicioStr);
    }

    if (fechaFin) {
      const fechaFinStr = format(fechaFin, 'yyyy-MM-dd');
      query = query.lte('fecha', fechaFinStr);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo registros de lluvia:', error);
    throw error;
  }
}

/**
 * Calcula el acumulado de lluvia para un período específico
 * @param {string} premiseId - ID del predio
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @returns {Promise<Object>} { acumulado, registros, dias }
 */
export async function calcularAcumuladoLluvia(premiseId, fechaInicio, fechaFin) {
  try {
    const registros = await obtenerRegistrosLluvia(premiseId, fechaInicio, fechaFin);
    const acumulado = calcularAcumulado(registros);

    return {
      acumulado: Math.round(acumulado * 10) / 10,
      registros: registros.length,
      fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
      fechaFin: format(fechaFin, 'yyyy-MM-dd')
    };
  } catch (error) {
    console.error('Error calculando acumulado de lluvia:', error);
    throw error;
  }
}

/**
 * Obtiene acumulados mensuales de lluvia para un año
 * @param {string} premiseId - ID del predio
 * @param {number} anio - Año a analizar
 * @returns {Promise<Array>} Array con estadísticas mensuales
 */
export async function obtenerAcumuladosMensuales(premiseId, anio) {
  try {
    const fechaInicio = new Date(anio, 0, 1); // 1 de enero
    const fechaFin = new Date(anio, 11, 31); // 31 de diciembre

    const registros = await obtenerRegistrosLluvia(premiseId, fechaInicio, fechaFin);
    const registrosPorMes = agruparPorMes(registros);
    const estadisticas = obtenerEstadisticasMensuales(registrosPorMes);

    return estadisticas.sort((a, b) => parseInt(a.mes) - parseInt(b.mes));
  } catch (error) {
    console.error('Error obteniendo acumulados mensuales:', error);
    throw error;
  }
}

/**
 * Obtiene el acumulado de lluvia para una campaña productiva (julio-junio)
 * @param {string} premiseId - ID del predio
 * @param {number} anioInicio - Año de inicio de la campaña (ej: 2024 para 2024/2025)
 * @returns {Promise<Object>} Datos de la campaña con acumulado y clasificación
 */
export async function obtenerAcumuladoCampania(premiseId, anioInicio) {
  try {
    const campania = obtenerRangoCampania(anioInicio);
    const registros = await obtenerRegistrosLluvia(
      premiseId,
      campania.fechaInicio,
      campania.fechaFin
    );

    const acumulado = calcularAcumulado(registros);

    return {
      ...campania,
      acumulado: Math.round(acumulado * 10) / 10,
      registros: registros.length,
      registrosDetalle: registros
    };
  } catch (error) {
    console.error('Error obteniendo acumulado de campaña:', error);
    throw error;
  }
}

/**
 * Obtiene la campaña actual basada en la fecha de hoy
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Object>} Datos de la campaña actual
 */
export async function obtenerCampaniaActual(premiseId) {
  try {
    const hoy = new Date();
    const campaniaActual = obtenerCampaniaDeUnaFecha(hoy);

    return await obtenerAcumuladoCampania(premiseId, campaniaActual.anioInicio);
  } catch (error) {
    console.error('Error obteniendo campaña actual:', error);
    throw error;
  }
}

/**
 * Compara el acumulado actual con el promedio histórico
 * @param {string} premiseId - ID del predio
 * @param {Date} fechaInicio - Fecha de inicio del período a comparar
 * @param {Date} fechaFin - Fecha de fin del período a comparar
 * @param {number} aniosHistorico - Cantidad de años hacia atrás para calcular promedio (default: 5)
 * @returns {Promise<Object>} Comparación con promedio histórico
 */
export async function compararConPromedio(premiseId, fechaInicio, fechaFin, aniosHistorico = 5) {
  try {
    // Obtener acumulado del período actual
    const periodoActual = await calcularAcumuladoLluvia(premiseId, fechaInicio, fechaFin);

    // Obtener acumulados de los mismos períodos en años anteriores
    const acumuladosHistoricos = [];

    for (let i = 1; i <= aniosHistorico; i++) {
      const fechaInicioHistorico = new Date(fechaInicio);
      fechaInicioHistorico.setFullYear(fechaInicio.getFullYear() - i);

      const fechaFinHistorico = new Date(fechaFin);
      fechaFinHistorico.setFullYear(fechaFin.getFullYear() - i);

      try {
        const acumuladoHistorico = await calcularAcumuladoLluvia(
          premiseId,
          fechaInicioHistorico,
          fechaFinHistorico
        );
        acumuladosHistoricos.push(acumuladoHistorico.acumulado);
      } catch (error) {
        console.warn(`No hay datos para año ${fechaInicioHistorico.getFullYear()}`);
      }
    }

    const promedioHistorico = calcularPromedio(acumuladosHistoricos);
    const diferencia = periodoActual.acumulado - promedioHistorico;
    const porcentajeDiferencia = promedioHistorico > 0
      ? ((periodoActual.acumulado / promedioHistorico) * 100) - 100
      : 0;

    return {
      acumuladoActual: periodoActual.acumulado,
      promedioHistorico: Math.round(promedioHistorico * 10) / 10,
      diferencia: Math.round(diferencia * 10) / 10,
      porcentajeDiferencia: Math.round(porcentajeDiferencia * 10) / 10,
      aniosConsiderados: acumuladosHistoricos.length,
      clasificacion: diferencia >= 0 ? 'SUPERIOR' : 'INFERIOR',
      acumuladosHistoricos
    };
  } catch (error) {
    console.error('Error comparando con promedio:', error);
    throw error;
  }
}

/**
 * Obtiene la distribución de lluvia por mes para un rango de fechas
 * @param {string} premiseId - ID del predio
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @returns {Promise<Object>} Distribución mensual
 */
export async function obtenerDistribucionMensual(premiseId, fechaInicio, fechaFin) {
  try {
    const registros = await obtenerRegistrosLluvia(premiseId, fechaInicio, fechaFin);
    const registrosPorMes = agruparPorMes(registros);

    return {
      meses: obtenerEstadisticasMensuales(registrosPorMes),
      totalAcumulado: calcularAcumulado(registros),
      totalRegistros: registros.length
    };
  } catch (error) {
    console.error('Error obteniendo distribución mensual:', error);
    throw error;
  }
}

/**
 * Detecta déficit hídrico en los últimos N días
 * @param {string} premiseId - ID del predio
 * @param {number} diasAAnalizar - Cantidad de días a analizar (default: 30)
 * @param {number} umbralMm - Umbral mínimo esperado en mm (default: 50mm en 30 días)
 * @returns {Promise<Object>} Información sobre déficit hídrico
 */
export async function detectarDeficitHidrico(premiseId, diasAAnalizar = 30, umbralMm = 50) {
  try {
    const fechaFin = new Date();
    const fechaInicio = subDays(fechaFin, diasAAnalizar);

    const registros = await obtenerRegistrosLluvia(premiseId, fechaInicio, fechaFin);
    const acumulado = calcularAcumulado(registros);
    const diasSinLluvia = calcularDiasSinLluvia(registros, 1);

    const hayDeficit = acumulado < umbralMm;
    const porcentajeDelUmbral = (acumulado / umbralMm) * 100;

    let severidad, color, descripcion;

    if (porcentajeDelUmbral >= 100) {
      severidad = 'NINGUNO';
      color = 'green';
      descripcion = 'Precipitaciones adecuadas';
    } else if (porcentajeDelUmbral >= 70) {
      severidad = 'LEVE';
      color = 'yellow';
      descripcion = `Déficit leve: ${Math.round(umbralMm - acumulado)}mm por debajo del umbral`;
    } else if (porcentajeDelUmbral >= 40) {
      severidad = 'MODERADO';
      color = 'orange';
      descripcion = `Déficit moderado: ${Math.round(umbralMm - acumulado)}mm por debajo del umbral`;
    } else {
      severidad = 'SEVERO';
      color = 'red';
      descripcion = `Déficit severo: ${Math.round(umbralMm - acumulado)}mm por debajo del umbral`;
    }

    return {
      hayDeficit,
      severidad,
      color,
      descripcion,
      acumulado: Math.round(acumulado * 10) / 10,
      umbralEsperado: umbralMm,
      diasAnalizados: diasAAnalizar,
      diasSinLluvia,
      porcentajeDelUmbral: Math.round(porcentajeDelUmbral),
      registros: registros.length
    };
  } catch (error) {
    console.error('Error detectando déficit hídrico:', error);
    throw error;
  }
}

/**
 * Detecta exceso de lluvia en un período corto
 * @param {string} premiseId - ID del predio
 * @param {number} diasAAnalizar - Cantidad de días a analizar (default: 7)
 * @param {number} umbralMm - Umbral máximo en mm (default: 150mm en 7 días)
 * @returns {Promise<Object>} Información sobre exceso de lluvia
 */
export async function detectarExcesoLluvia(premiseId, diasAAnalizar = 7, umbralMm = 150) {
  try {
    const fechaFin = new Date();
    const fechaInicio = subDays(fechaFin, diasAAnalizar);

    const registros = await obtenerRegistrosLluvia(premiseId, fechaInicio, fechaFin);
    const acumulado = calcularAcumulado(registros);

    const hayExceso = acumulado > umbralMm;
    const porcentajeSobreUmbral = ((acumulado / umbralMm) * 100) - 100;

    let severidad, color, descripcion;

    if (!hayExceso) {
      severidad = 'NINGUNO';
      color = 'green';
      descripcion = 'Precipitaciones dentro de rangos normales';
    } else if (porcentajeSobreUmbral <= 20) {
      severidad = 'LEVE';
      color = 'yellow';
      descripcion = `Exceso leve: ${Math.round(acumulado - umbralMm)}mm sobre el umbral`;
    } else if (porcentajeSobreUmbral <= 50) {
      severidad = 'MODERADO';
      color = 'orange';
      descripcion = `Exceso moderado: ${Math.round(acumulado - umbralMm)}mm sobre el umbral`;
    } else {
      severidad = 'SEVERO';
      color = 'red';
      descripcion = `Exceso severo: ${Math.round(acumulado - umbralMm)}mm sobre el umbral. Riesgo de encharcamiento`;
    }

    return {
      hayExceso,
      severidad,
      color,
      descripcion,
      acumulado: Math.round(acumulado * 10) / 10,
      umbralMaximo: umbralMm,
      diasAnalizados: diasAAnalizar,
      porcentajeSobreUmbral: Math.round(porcentajeSobreUmbral),
      registros: registros.length
    };
  } catch (error) {
    console.error('Error detectando exceso de lluvia:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas completas de lluvia para un predio
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Object>} Estadísticas completas
 */
export async function obtenerEstadisticasCompletas(premiseId) {
  try {
    // Últimos 30 días
    const ultimos30Dias = await calcularAcumuladoLluvia(
      premiseId,
      subDays(new Date(), 30),
      new Date()
    );

    // Mes actual
    const mesActual = await calcularAcumuladoLluvia(
      premiseId,
      startOfMonth(new Date()),
      endOfMonth(new Date())
    );

    // Campaña actual
    const campaniaActual = await obtenerCampaniaActual(premiseId);

    // Déficit hídrico
    const deficitHidrico = await detectarDeficitHidrico(premiseId);

    // Exceso de lluvia
    const excesoLluvia = await detectarExcesoLluvia(premiseId);

    // Obtener todos los registros para cálculo de días sin lluvia
    const todosRegistros = await obtenerRegistrosLluvia(premiseId);
    const diasSinLluvia = calcularDiasSinLluvia(todosRegistros, 1);

    return {
      ultimos30Dias,
      mesActual,
      campaniaActual,
      deficitHidrico,
      excesoLluvia,
      diasSinLluvia,
      fechaConsulta: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas completas:', error);
    throw error;
  }
}

/**
 * Calcula el balance hídrico para un período
 * @param {string} premiseId - ID del predio
 * @param {number} dias - Cantidad de días a analizar (default: 30)
 * @param {number} evapotranspiracion - ET diaria en mm (default: 5)
 * @returns {Promise<Object>} Balance hídrico
 */
export async function calcularBalanceHidricoPredio(premiseId, dias = 30, evapotranspiracion = 5) {
  try {
    const fechaFin = new Date();
    const fechaInicio = subDays(fechaFin, dias);

    const registros = await obtenerRegistrosLluvia(premiseId, fechaInicio, fechaFin);
    const precipitacion = calcularAcumulado(registros);

    const balance = calcularBalanceHidrico(precipitacion, evapotranspiracion, dias);

    return {
      ...balance,
      periodo: {
        dias,
        fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
        fechaFin: format(fechaFin, 'yyyy-MM-dd')
      }
    };
  } catch (error) {
    console.error('Error calculando balance hídrico:', error);
    throw error;
  }
}

/**
 * Obtiene comparación interanual de campañas
 * @param {string} premiseId - ID del predio
 * @param {number} aniosAComparar - Cantidad de años a comparar (default: 3)
 * @returns {Promise<Array>} Array con datos de cada campaña
 */
export async function obtenerComparacionInteranual(premiseId, aniosAComparar = 3) {
  try {
    const campaniaActual = obtenerCampaniaDeUnaFecha(new Date());
    const campanias = [];

    for (let i = 0; i < aniosAComparar; i++) {
      const anioInicio = campaniaActual.anioInicio - i;
      try {
        const datos = await obtenerAcumuladoCampania(premiseId, anioInicio);
        campanias.push(datos);
      } catch (error) {
        console.warn(`No hay datos para campaña ${anioInicio}/${anioInicio + 1}`);
      }
    }

    // Calcular promedio histórico
    const acumulados = campanias.map(c => c.acumulado);
    const promedioHistorico = calcularPromedio(acumulados);

    // Clasificar cada campaña
    const campaniasConClasificacion = campanias.map(campania => ({
      ...campania,
      clasificacion: clasificarCampania(campania.acumulado, promedioHistorico)
    }));

    return {
      campanias: campaniasConClasificacion,
      promedioHistorico: Math.round(promedioHistorico * 10) / 10,
      totalCampanias: campanias.length
    };
  } catch (error) {
    console.error('Error obteniendo comparación interanual:', error);
    throw error;
  }
}
