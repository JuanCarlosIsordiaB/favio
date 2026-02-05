/**
 * MÓDULO 10: MONITOREO - Integración con Planificación
 * Servicios que vinculan datos de monitoreo con proyecciones y trabajos
 *
 * Funcionalidades:
 * - Ajustar proyecciones basadas en lluvia
 * - Recomendar ajustes de carga animal por oferta forrajera
 * - Generar órdenes de fertilización desde análisis de suelo
 * - Validar calidad de semilla antes de siembra
 * - Correlacionar NDVI con rendimientos
 */

import { supabase } from '../lib/supabase';
import { calcularAcumuladoLluvia, compararConPromedio } from './rainfallAnalytics';
import { calcularCargaRecomendada, compararLotesPorOferta } from './livestockAnalytics';
import { crearRegistro } from './registros';
import { crearAlertaAutomatica } from './alertas';

// =============================================
// 1. AJUSTE DE PROYECCIONES POR LLUVIA
// =============================================

/**
 * Ajusta el rendimiento proyectado de cultivos según acumulado de lluvia
 * @param {string} proyeccionId - ID de proyección agrícola
 * @param {number} acumuladoLluvia - mm acumulados en período crítico
 * @returns {Promise<Object>} Ajuste calculado y alerta generada
 */
export async function ajustarProyeccionPorLluvia(proyeccionId, acumuladoLluvia) {
  try {
    // 1. Obtener proyección
    const { data: proyeccion, error } = await supabase
      .from('proyecciones_agricolas')
      .select('*, lots(premise_id), premises(firm_id)')
      .eq('id', proyeccionId)
      .single();

    if (error) throw error;
    if (!proyeccion) throw new Error('Proyección no encontrada');

    // 2. Definir umbrales según tipo de cultivo (valores promedio)
    const umbralOptimo = 800; // mm óptimos en ciclo de cultivo
    const umbralMinimo = 400; // mm mínimos para rendimiento aceptable

    // 3. Calcular factor de ajuste
    let factorAjuste = 1.0;
    let descripcion = '';
    let prioridad = 'baja';

    if (acumuladoLluvia < umbralMinimo) {
      // Déficit severo: reducir rendimiento proyectado 30-50%
      factorAjuste = 0.5 + (acumuladoLluvia / umbralMinimo) * 0.2;
      descripcion = `Déficit hídrico severo (${acumuladoLluvia}mm vs ${umbralOptimo}mm óptimo). Rendimiento proyectado reducido al ${Math.round(factorAjuste * 100)}%.`;
      prioridad = 'alta';
    } else if (acumuladoLluvia < umbralOptimo * 0.8) {
      // Déficit moderado: reducir 10-20%
      factorAjuste = 0.8 + (acumuladoLluvia / umbralOptimo) * 0.2;
      descripcion = `Déficit hídrico moderado (${acumuladoLluvia}mm vs ${umbralOptimo}mm óptimo). Rendimiento proyectado ajustado al ${Math.round(factorAjuste * 100)}%.`;
      prioridad = 'media';
    } else if (acumuladoLluvia > umbralOptimo * 1.3) {
      // Exceso: puede reducir rendimiento por anegamiento
      factorAjuste = 0.9;
      descripcion = `Exceso de lluvias (${acumuladoLluvia}mm vs ${umbralOptimo}mm óptimo). Riesgo de anegamiento. Rendimiento ajustado al 90%.`;
      prioridad = 'media';
    } else {
      // Rango óptimo
      descripcion = `Lluvias en rango óptimo (${acumuladoLluvia}mm). Sin ajuste necesario.`;
      prioridad = 'baja';
    }

    // 4. Calcular nuevo rendimiento
    const rendimientoOriginal = parseFloat(proyeccion.rendimiento_proyectado) || 0;
    const rendimientoAjustado = rendimientoOriginal * factorAjuste;

    // 5. Crear alerta si hay ajuste significativo
    if (factorAjuste < 0.9 || factorAjuste > 1.1) {
      await crearAlertaAutomatica({
        firmaId: proyeccion.premises.firm_id,
        predioId: proyeccion.lots.premise_id,
        loteId: proyeccion.lot_id,
        tipo: 'alerta',
        reglaAplicada: 'ajuste_proyeccion_lluvia',
        prioridad: prioridad,
        titulo: 'Ajuste de Proyección por Lluvia',
        descripcion: descripcion,
        metadata: {
          proyeccion_id: proyeccionId,
          acumulado_lluvia: acumuladoLluvia,
          factor_ajuste: factorAjuste,
          rendimiento_original: rendimientoOriginal,
          rendimiento_ajustado: rendimientoAjustado
        }
      });
    }

    // 6. Registrar auditoría
    await crearRegistro({
      firmId: proyeccion.premises.firm_id,
      premiseId: proyeccion.lots.premise_id,
      lotId: proyeccion.lot_id,
      tipo: 'ajuste_proyeccion',
      descripcion: `Ajuste de proyección por lluvia: ${descripcion}`,
      moduloOrigen: 'monitoring_integration',
      metadata: {
        proyeccion_id: proyeccionId,
        factor_ajuste: factorAjuste,
        acumulado_lluvia: acumuladoLluvia
      }
    });

    return {
      factorAjuste,
      rendimientoOriginal,
      rendimientoAjustado,
      descripcion,
      prioridad,
      requiereAtencion: factorAjuste < 0.8
    };

  } catch (error) {
    console.error('Error ajustando proyección por lluvia:', error);
    throw error;
  }
}

/**
 * Verifica y ajusta todas las proyecciones activas de un predio según lluvia
 */
export async function verificarAjustesLluviaPredio(premiseId) {
  try {
    // 1. Obtener proyecciones activas
    const { data: proyecciones, error } = await supabase
      .from('proyecciones_agricolas')
      .select('id, lot_id, fecha_siembra_proyectada')
      .eq('premise_id', premiseId)
      .is('trabajo_agricola_id', null); // Solo no convertidas

    if (error) throw error;

    const ajustes = [];

    // 2. Para cada proyección, calcular lluvia en período relevante
    for (const proy of proyecciones || []) {
      // Calcular lluvia en últimos 90 días desde fecha de siembra
      const fechaFin = new Date();
      const fechaInicio = new Date(proy.fecha_siembra_proyectada);
      fechaInicio.setDate(fechaInicio.getDate() - 90);

      const acumulado = await calcularAcumuladoLluvia(
        premiseId,
        fechaInicio.toISOString().split('T')[0],
        fechaFin.toISOString().split('T')[0]
      );

      const ajuste = await ajustarProyeccionPorLluvia(proy.id, acumulado);
      ajustes.push({ proyeccionId: proy.id, ...ajuste });
    }

    return ajustes;

  } catch (error) {
    console.error('Error verificando ajustes de lluvia:', error);
    throw error;
  }
}

// =============================================
// 2. AJUSTE DE CARGA ANIMAL POR PASTURA
// =============================================

/**
 * Calcula y recomienda ajuste de carga animal basado en oferta forrajera actual
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Object>} Recomendaciones por lote
 */
export async function ajustarCargaAnimalPorPastura(premiseId) {
  try {
    // 1. Obtener comparación de lotes por oferta
    const comparacion = await compararLotesPorOferta(premiseId);

    // 2. Obtener carga animal actual por lote
    const { data: animales, error: animalesError } = await supabase
      .from('animals')
      .select('id, lot_id')
      .eq('premise_id', premiseId)
      .eq('status', 'activo');

    if (animalesError) throw animalesError;

    // Contar animales por lote
    const cargaActual = {};
    (animales || []).forEach(animal => {
      cargaActual[animal.lot_id] = (cargaActual[animal.lot_id] || 0) + 1;
    });

    const recomendaciones = [];

    // 3. Para cada lote, comparar carga actual vs recomendada
    for (const loteData of comparacion) {
      const cargaActualLote = cargaActual[loteData.lot_id] || 0;
      const cargaRecomendada = loteData.carga_recomendada || 0;
      const diferencia = cargaActualLote - cargaRecomendada;

      let accion = 'mantener';
      let prioridad = 'baja';
      let mensaje = '';

      if (diferencia > 0) {
        // Sobrecarga
        accion = 'reducir';
        prioridad = diferencia > cargaRecomendada * 0.3 ? 'alta' : 'media';
        mensaje = `Lote ${loteData.lot_name}: Sobrecargado. Tiene ${cargaActualLote} animales, recomendado: ${Math.round(cargaRecomendada)}. Mover ${Math.ceil(diferencia)} animales a otro lote.`;
      } else if (diferencia < -5) {
        // Subcarga
        accion = 'aumentar';
        prioridad = 'baja';
        mensaje = `Lote ${loteData.lot_name}: Subcargado. Tiene ${cargaActualLote} animales, puede soportar ${Math.round(cargaRecomendada)}. Puede agregar ${Math.ceil(-diferencia)} animales.`;
      } else {
        mensaje = `Lote ${loteData.lot_name}: Carga animal óptima (${cargaActualLote} animales).`;
      }

      recomendaciones.push({
        lot_id: loteData.lot_id,
        lot_name: loteData.lot_name,
        altura_actual: loteData.altura_promedio,
        carga_actual: cargaActualLote,
        carga_recomendada: Math.round(cargaRecomendada),
        diferencia: Math.round(diferencia),
        accion,
        prioridad,
        mensaje
      });

      // Crear alerta si hay sobrecarga crítica
      if (accion === 'reducir' && prioridad === 'alta') {
        const { data: premise } = await supabase
          .from('premises')
          .select('firm_id')
          .eq('id', premiseId)
          .single();

        await crearAlertaAutomatica({
          firmaId: premise.firm_id,
          predioId: premiseId,
          loteId: loteData.lot_id,
          tipo: 'alerta',
          reglaAplicada: 'sobrecarga_animal',
          prioridad: 'alta',
          titulo: `Sobrecarga Animal - ${loteData.lot_name}`,
          descripcion: mensaje,
          metadata: {
            lot_id: loteData.lot_id,
            carga_actual: cargaActualLote,
            carga_recomendada: Math.round(cargaRecomendada)
          }
        });
      }
    }

    // 4. Registrar auditoría
    const { data: premise } = await supabase
      .from('premises')
      .select('firm_id')
      .eq('id', premiseId)
      .single();

    await crearRegistro({
      firmId: premise.firm_id,
      premiseId: premiseId,
      tipo: 'ajuste_carga_animal',
      descripcion: `Verificación de carga animal: ${recomendaciones.length} lotes analizados`,
      moduloOrigen: 'monitoring_integration',
      metadata: { recomendaciones }
    });

    return recomendaciones;

  } catch (error) {
    console.error('Error ajustando carga animal:', error);
    throw error;
  }
}

// =============================================
// 3. RECOMENDACIÓN DE FERTILIZACIÓN
// =============================================

/**
 * Genera recomendación de fertilización basada en último análisis de suelo
 * @param {string} lotId - ID del lote
 * @returns {Promise<Object>} Recomendación detallada
 */
export async function generarRecomendacionFertilizacion(lotId) {
  try {
    // 1. Obtener último análisis de suelo por parámetro
    const { data: analisis, error } = await supabase
      .from('analisis_suelo')
      .select('*, lots(name, premise_id, area_hectares), premises(firm_id)')
      .eq('lot_id', lotId)
      .order('fecha', { ascending: false })
      .limit(6); // Obtener últimos análisis de cada parámetro

    if (error) throw error;
    if (!analisis || analisis.length === 0) {
      return { requiereFertilizacion: false, mensaje: 'No hay análisis de suelo disponible' };
    }

    // 2. Identificar déficits que no fueron aplicados
    const deficits = analisis.filter(a =>
      parseFloat(a.deficit) > 0 && a.ya_aplicado === false
    );

    if (deficits.length === 0) {
      return { requiereFertilizacion: false, mensaje: 'No hay déficits pendientes de aplicar' };
    }

    // 3. Calcular insumos necesarios
    const recomendaciones = deficits.map(def => {
      const kgTotal = parseFloat(def.kg_total) || 0;
      const kgHa = parseFloat(def.kg_ha) || 0;

      return {
        parametro: def.parametro,
        deficit: parseFloat(def.deficit),
        fuente_recomendada: def.fuente_recomendada,
        kg_ha: kgHa,
        kg_total: kgTotal,
        fecha_analisis: def.fecha,
        resultado: parseFloat(def.resultado),
        objetivo: parseFloat(def.objetivo)
      };
    });

    // 4. Calcular costo estimado total
    const costoEstimadoTotal = recomendaciones.reduce((sum, rec) => {
      // Estimación de costos (valores promedio en USD/kg)
      const precios = {
        'Superfosfato triple': 0.6,
        'Urea': 0.4,
        'Cloruro de potasio': 0.5,
        'Azufre elemental': 0.3,
        'Sulfato de amonio': 0.35
      };
      const precio = precios[rec.fuente_recomendada] || 0.5;
      return sum + (rec.kg_total * precio);
    }, 0);

    // 5. Crear alerta de fertilización pendiente
    const lote = analisis[0].lots;
    const premise = analisis[0].premises;

    await crearAlertaAutomatica({
      firmaId: premise.firm_id,
      predioId: lote.premise_id,
      loteId: lotId,
      tipo: 'alerta',
      reglaAplicada: 'fertilizacion_pendiente',
      prioridad: deficits.length >= 3 ? 'alta' : 'media',
      titulo: `Fertilización Pendiente - ${lote.name}`,
      descripcion: `Se detectaron ${deficits.length} déficits de nutrientes sin aplicar. Costo estimado: $${costoEstimadoTotal.toFixed(2)} USD`,
      metadata: {
        lot_id: lotId,
        deficits: recomendaciones,
        costo_estimado: costoEstimadoTotal
      }
    });

    // 6. Registrar auditoría
    await crearRegistro({
      firmId: premise.firm_id,
      premiseId: lote.premise_id,
      lotId: lotId,
      tipo: 'recomendacion_fertilizacion',
      descripcion: `Generada recomendación de fertilización: ${deficits.length} nutrientes`,
      moduloOrigen: 'monitoring_integration',
      metadata: { recomendaciones }
    });

    return {
      requiereFertilizacion: true,
      lot_name: lote.name,
      hectareas: lote.area_hectares,
      recomendaciones,
      costoEstimadoTotal,
      mensaje: `Se requiere aplicar ${deficits.length} fuentes de fertilización`,
      prioridad: deficits.length >= 3 ? 'alta' : 'media'
    };

  } catch (error) {
    console.error('Error generando recomendación de fertilización:', error);
    throw error;
  }
}

// =============================================
// 4. VALIDACIÓN DE SEMILLA ANTES DE SIEMBRA
// =============================================

/**
 * Valida calidad de semilla antes de crear trabajo de siembra
 * @param {string} seedVarietyId - ID de variedad de semilla
 * @param {number} hectareas - Hectáreas a sembrar
 * @returns {Promise<Object>} Validación y alertas
 */
export async function validarSemillaParaSiembra(seedVarietyId, hectareas) {
  try {
    // 1. Obtener último análisis de la variedad
    const { data: analisis, error } = await supabase
      .from('analisis_semillas')
      .select('*, seed_varieties(name)')
      .eq('seed_variety_id', seedVarietyId)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!analisis) {
      return {
        aprobado: false,
        motivo: 'No hay análisis de calidad disponible para esta variedad',
        recomendacion: 'Realizar análisis de semilla antes de siembra',
        prioridad: 'alta'
      };
    }

    // 2. Validar parámetros de calidad
    const germinacion = parseFloat(analisis.germinacion) || 0;
    const pureza = parseFloat(analisis.pureza) || 0;
    const humedad = parseFloat(analisis.humedad) || 0;

    const problemas = [];
    let aprobado = true;
    let prioridad = 'baja';

    // Germinación mínima: 85%
    if (germinacion < 85) {
      problemas.push(`Germinación baja (${germinacion}% vs 85% mínimo)`);
      aprobado = false;
      prioridad = germinacion < 70 ? 'alta' : 'media';
    }

    // Pureza mínima: 98%
    if (pureza < 98) {
      problemas.push(`Pureza insuficiente (${pureza}% vs 98% mínimo)`);
      aprobado = false;
      prioridad = 'media';
    }

    // Humedad máxima: 14%
    if (humedad > 14) {
      problemas.push(`Humedad elevada (${humedad}% vs 14% máximo). Riesgo de deterioro en almacenamiento.`);
      aprobado = false;
      prioridad = 'media';
    }

    // 3. Calcular densidad de siembra ajustada
    const densidadBase = 65; // kg/ha (promedio para soja)
    const factorAjusteGerminacion = germinacion > 0 ? 100 / germinacion : 1.5;
    const densidadAjustada = densidadBase * factorAjusteGerminacion;
    const kgTotales = densidadAjustada * hectareas;

    // 4. Crear alerta si no está aprobado
    if (!aprobado) {
      const { data: firma } = await supabase
        .from('seed_varieties')
        .select('firm_id')
        .eq('id', seedVarietyId)
        .single();

      await crearAlertaAutomatica({
        firmaId: firma?.firm_id,
        predioId: null,
        loteId: null,
        tipo: 'alerta',
        reglaAplicada: 'semilla_baja_calidad',
        prioridad: prioridad,
        titulo: `Semilla No Apta - ${analisis.seed_varieties.name}`,
        descripcion: `La variedad ${analisis.seed_varieties.name} presenta: ${problemas.join(', ')}. No se recomienda para siembra.`,
        metadata: {
          seed_variety_id: seedVarietyId,
          germinacion,
          pureza,
          humedad,
          problemas
        }
      });
    }

    return {
      aprobado,
      variedad: analisis.seed_varieties.name,
      germinacion,
      pureza,
      humedad,
      fecha_analisis: analisis.fecha,
      problemas,
      densidad_ajustada: Math.round(densidadAjustada),
      kg_totales_necesarios: Math.round(kgTotales),
      motivo: aprobado ? 'Semilla cumple estándares de calidad' : problemas.join('; '),
      recomendacion: aprobado
        ? `Usar densidad de siembra de ${Math.round(densidadAjustada)} kg/ha (${Math.round(kgTotales)} kg totales)`
        : 'No utilizar esta semilla. Adquirir semilla de mayor calidad o ajustar densidad significativamente.',
      prioridad
    };

  } catch (error) {
    console.error('Error validando semilla:', error);
    throw error;
  }
}

// =============================================
// 5. CORRELACIÓN NDVI CON RENDIMIENTO
// =============================================

/**
 * Correlaciona valores históricos de NDVI con rendimiento real de cosecha
 * @param {string} lotId - ID del lote
 * @returns {Promise<Object>} Correlación y modelo predictivo
 */
export async function correlacionarNDVIRendimiento(lotId) {
  try {
    // 1. Obtener historial de NDVI
    const { data: ndviHistory, error: ndviError } = await supabase
      .from('ndvi_history')
      .select('date, ndvi_value')
      .eq('lot_id', lotId)
      .order('date', { ascending: false })
      .limit(50);

    if (ndviError) throw ndviError;

    // 2. Obtener trabajos de cosecha con rendimiento real
    const { data: cosechas, error: cosechaError } = await supabase
      .from('agricultural_works')
      .select('date, yield_real, crop_type')
      .eq('lot_id', lotId)
      .eq('work_type', 'Cosecha')
      .not('yield_real', 'is', null)
      .order('date', { ascending: false })
      .limit(10);

    if (cosechaError) throw cosechaError;

    if (!cosechas || cosechas.length === 0) {
      return {
        disponible: false,
        mensaje: 'No hay datos de cosecha históricos para correlacionar'
      };
    }

    // 3. Para cada cosecha, obtener NDVI promedio en período previo (30-60 días antes)
    const correlaciones = [];

    for (const cosecha of cosechas) {
      const fechaCosecha = new Date(cosecha.date);
      const fechaInicio = new Date(fechaCosecha);
      fechaInicio.setDate(fechaInicio.getDate() - 60);
      const fechaFin = new Date(fechaCosecha);
      fechaFin.setDate(fechaFin.getDate() - 30);

      // Filtrar NDVI en ventana crítica
      const ndviPeriodo = (ndviHistory || []).filter(n => {
        const fechaNdvi = new Date(n.date);
        return fechaNdvi >= fechaInicio && fechaNdvi <= fechaFin;
      });

      if (ndviPeriodo.length > 0) {
        const ndviPromedio = ndviPeriodo.reduce((sum, n) => sum + n.ndvi_value, 0) / ndviPeriodo.length;

        correlaciones.push({
          fecha_cosecha: cosecha.date,
          ndvi_promedio: ndviPromedio,
          rendimiento_real: cosecha.yield_real,
          cultivo: cosecha.crop_type
        });
      }
    }

    if (correlaciones.length < 2) {
      return {
        disponible: false,
        mensaje: 'Datos insuficientes para correlación (mínimo 2 cosechas con NDVI)'
      };
    }

    // 4. Calcular correlación lineal simple (R²)
    const n = correlaciones.length;
    const sumX = correlaciones.reduce((s, c) => s + c.ndvi_promedio, 0);
    const sumY = correlaciones.reduce((s, c) => s + c.rendimiento_real, 0);
    const sumXY = correlaciones.reduce((s, c) => s + (c.ndvi_promedio * c.rendimiento_real), 0);
    const sumX2 = correlaciones.reduce((s, c) => s + (c.ndvi_promedio ** 2), 0);
    const sumY2 = correlaciones.reduce((s, c) => s + (c.rendimiento_real ** 2), 0);

    const r = (n * sumXY - sumX * sumY) /
              Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));

    const r2 = r ** 2;

    // 5. Calcular ecuación de regresión: y = mx + b
    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    const b = (sumY - m * sumX) / n;

    // 6. Obtener NDVI actual para proyección
    const ndviActual = (ndviHistory && ndviHistory.length > 0)
      ? ndviHistory[0].ndvi_value
      : null;

    const rendimientoProyectado = ndviActual
      ? (m * ndviActual + b)
      : null;

    return {
      disponible: true,
      correlacion: {
        r: r.toFixed(3),
        r2: r2.toFixed(3),
        fuerza: r2 > 0.7 ? 'fuerte' : r2 > 0.4 ? 'moderada' : 'débil'
      },
      ecuacion: {
        pendiente: m.toFixed(2),
        intercepto: b.toFixed(2),
        formula: `Rendimiento = ${m.toFixed(2)} × NDVI + ${b.toFixed(2)}`
      },
      ndviActual,
      rendimientoProyectado: rendimientoProyectado ? Math.round(rendimientoProyectado) : null,
      muestras: n,
      datos: correlaciones
    };

  } catch (error) {
    console.error('Error correlacionando NDVI con rendimiento:', error);
    throw error;
  }
}

// =============================================
// 6. VERIFICACIÓN AUTOMÁTICA INTEGRAL
// =============================================

/**
 * Ejecuta todas las verificaciones de integración para un predio
 * @param {string} firmId - ID de la firma
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Object>} Resumen de todas las verificaciones
 */
export async function ejecutarVerificacionesAutomaticas(firmId, premiseId) {
  try {
    const resultados = {
      timestamp: new Date().toISOString(),
      firmId,
      premiseId,
      verificaciones: {}
    };

    // 1. Verificar ajustes de lluvia en proyecciones
    try {
      const ajustesLluvia = await verificarAjustesLluviaPredio(premiseId);
      resultados.verificaciones.ajustesLluvia = {
        ejecutado: true,
        proyeccionesRevisadas: ajustesLluvia.length,
        requierenAtencion: ajustesLluvia.filter(a => a.requiereAtencion).length
      };
    } catch (error) {
      resultados.verificaciones.ajustesLluvia = { ejecutado: false, error: error.message };
    }

    // 2. Verificar carga animal
    try {
      const ajustesCarga = await ajustarCargaAnimalPorPastura(premiseId);
      resultados.verificaciones.ajustesCarga = {
        ejecutado: true,
        lotesRevisados: ajustesCarga.length,
        sobrecargados: ajustesCarga.filter(a => a.accion === 'reducir').length
      };
    } catch (error) {
      resultados.verificaciones.ajustesCarga = { ejecutado: false, error: error.message };
    }

    // 3. Verificar fertilización pendiente en lotes
    try {
      const { data: lotes } = await supabase
        .from('lots')
        .select('id')
        .eq('premise_id', premiseId);

      let lotesPendientesFertilizacion = 0;
      for (const lote of lotes || []) {
        const rec = await generarRecomendacionFertilizacion(lote.id);
        if (rec.requiereFertilizacion) lotesPendientesFertilizacion++;
      }

      resultados.verificaciones.fertilizacion = {
        ejecutado: true,
        lotesRevisados: (lotes || []).length,
        lotesPendientes: lotesPendientesFertilizacion
      };
    } catch (error) {
      resultados.verificaciones.fertilizacion = { ejecutado: false, error: error.message };
    }

    // 4. Registrar auditoría de verificación
    await crearRegistro({
      firmId,
      premiseId,
      tipo: 'verificacion_automatica',
      descripcion: 'Verificación automática de integraciones de monitoreo ejecutada',
      moduloOrigen: 'monitoring_integration',
      metadata: resultados
    });

    return resultados;

  } catch (error) {
    console.error('Error ejecutando verificaciones automáticas:', error);
    throw error;
  }
}
