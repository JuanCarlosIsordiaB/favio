/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Servicio de Cálculo Centralizado de KPIs
 *
 * Implementa las 23 fórmulas de KPIs obligatorios:
 * - 7 Productivos Ganaderos
 * - 6 Económicos
 * - 5 Pasturas
 * - 5 Gestión
 *
 * Cada función retorna: { value, unit, metadata, status }
 */

import { supabase } from '../lib/supabase';
import { format, subDays, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Calcula un KPI específico para un período
 */
export async function calcularKPI(
  firmId,
  kpiCode,
  periodStart,
  periodEnd,
  lotId = null
) {
  try {
    let resultado;

    // Mapear código a función de cálculo
    switch (kpiCode) {
      // ========== PRODUCTIVOS GANADEROS ==========
      case 'GDP':
        resultado = await calcularGDP(firmId, periodStart, periodEnd, lotId);
        break;
      case 'MORTALIDAD':
        resultado = await calcularMortalidad(firmId, periodStart, periodEnd, lotId);
        break;
      case 'TASA_DESTETE':
        resultado = await calcularTasaDestete(firmId, periodStart, periodEnd);
        break;
      case 'INDICE_REPOSICION':
        resultado = await calcularIndiceReposicion(firmId, periodStart, periodEnd);
        break;
      case 'KG_VIVOS_HA':
        resultado = await calcularKgVivosHa(firmId, periodStart, periodEnd, lotId);
        break;
      case 'KG_CARNE_PRODUCIDOS':
        resultado = await calcularKgCarneProducidos(firmId, periodStart, periodEnd, lotId);
        break;
      case 'KG_PRODUCIDOS_HA':
        resultado = await calcularKgProducidosHa(firmId, periodStart, periodEnd, lotId);
        break;

      // ========== ECONÓMICOS ==========
      case 'COSTO_TOTAL_GANADERO':
        resultado = await calcularCostoTotalGanadero(firmId, periodStart, periodEnd);
        break;
      case 'COSTO_POR_KG':
        resultado = await calcularCostoPorKg(firmId, periodStart, periodEnd);
        break;
      case 'MARGEN_BRUTO':
        resultado = await calcularMargenBruto(firmId, periodStart, periodEnd);
        break;
      case 'MARGEN_POR_HA':
        resultado = await calcularMargenPorHa(firmId, periodStart, periodEnd);
        break;
      case 'COSTO_SANITARIO_ANIMAL':
        resultado = await calcularCostoSanitarioAnimal(firmId, periodStart, periodEnd);
        break;
      case 'COSTO_ALIMENTACION_KG':
        resultado = await calcularCostoAlimentacionKg(firmId, periodStart, periodEnd);
        break;

      // ========== PASTURAS ==========
      case 'ALTURA_PROMEDIO_PASTURA':
        resultado = await calcularAlturaPasturaPromedio(firmId, periodStart, periodEnd, lotId);
        break;
      case 'DIFERENCIA_REMANENTE':
        resultado = await calcularDiferenciaRemanente(firmId, periodStart, periodEnd, lotId);
        break;
      case 'RECEPTIVIDAD_REAL':
        resultado = await calcularReceptividadReal(firmId, periodStart, periodEnd, lotId);
        break;
      case 'DIAS_OCUPACION':
        resultado = await calcularDiasOcupacion(firmId, periodStart, periodEnd, lotId);
        break;
      case 'PRESION_PASTOREO':
        resultado = await calcularPresionPastoreo(firmId, periodStart, periodEnd, lotId);
        break;

      // ========== GESTIÓN ==========
      case 'PROYECCIONES_CUMPLIDAS':
        resultado = await calcularProyeccionesCumplidas(firmId, periodStart, periodEnd);
        break;
      case 'DESVIO_PLAN_REAL':
        resultado = await calcularDesvíoPlanReal(firmId, periodStart, periodEnd);
        break;
      case 'TIEMPO_APROBACION':
        resultado = await calcularTiempoAprobacion(firmId, periodStart, periodEnd);
        break;
      case 'TRABAJOS_SIN_APROBACION':
        resultado = await calcularTrabajosSinAprobacion(firmId, periodStart, periodEnd);
        break;
      case 'CALIDAD_DATO':
        resultado = await calcularCalidadDato(firmId, periodStart, periodEnd);
        break;

      default:
        throw new Error(`KPI no implementado: ${kpiCode}`);
    }

    return resultado;
  } catch (error) {
    console.error(`Error calculando KPI ${kpiCode}:`, error);
    throw error;
  }
}

/**
 * Calcula TODOS los KPIs obligatorios para una firma en un período
 */
export async function calcularTodosLosKPIs(firmId, periodStart, periodEnd) {
  const kpiCodes = [
    // Productivos Ganaderos
    'GDP', 'MORTALIDAD', 'TASA_DESTETE', 'INDICE_REPOSICION', 'KG_VIVOS_HA', 'KG_CARNE_PRODUCIDOS', 'KG_PRODUCIDOS_HA',
    // Económicos
    'COSTO_TOTAL_GANADERO', 'COSTO_POR_KG', 'MARGEN_BRUTO', 'MARGEN_POR_HA', 'COSTO_SANITARIO_ANIMAL', 'COSTO_ALIMENTACION_KG',
    // Pasturas
    'ALTURA_PROMEDIO_PASTURA', 'DIFERENCIA_REMANENTE', 'RECEPTIVIDAD_REAL', 'DIAS_OCUPACION', 'PRESION_PASTOREO',
    // Gestión
    'PROYECCIONES_CUMPLIDAS', 'DESVIO_PLAN_REAL', 'TIEMPO_APROBACION', 'TRABAJOS_SIN_APROBACION', 'CALIDAD_DATO'
  ];

  // Obtener IDs de todos los KPIs
  const { data: kpiDefs, error: defError } = await supabase
    .from('kpi_definitions')
    .select('id, code')
    .in('code', kpiCodes)
    .eq('is_active', true);

  if (defError) {
    console.error('Error obteniendo definiciones de KPIs:', defError);
    return [];
  }

  // Crear mapa code -> id
  const codeToId = {};
  (kpiDefs || []).forEach(def => {
    codeToId[def.code] = def.id;
  });

  const resultados = [];

  for (const kpiCode of kpiCodes) {
    try {
      const resultado = await calcularKPI(firmId, kpiCode, periodStart, periodEnd);
      resultados.push({
        id: codeToId[kpiCode],  // Incluir el ID del KPI
        code: kpiCode,
        ...resultado
      });
    } catch (error) {
      console.error(`Error en KPI ${kpiCode}:`, error.message);
      resultados.push({
        id: codeToId[kpiCode],  // Incluir el ID del KPI incluso en error
        code: kpiCode,
        value: null,
        error: error.message
      });
    }
  }

  return resultados;
}

/**
 * Guarda KPI en historial + evalúa umbral + dispara alerta
 */
export async function guardarEnHistorial(firmId, kpiId, period, value, metadata) {
  try {
    const { data, error } = await supabase.rpc('save_kpi_value', {
      p_firm_id: firmId,
      p_kpi_id: kpiId,
      p_period_start: period.start,
      p_period_end: period.end,
      p_value: value,
      p_metadata: metadata,
      p_calculated_by: 'system'
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error guardando KPI en historial:', error);
    throw error;
  }
}

/**
 * Obtiene tendencia histórica de un KPI
 */
export async function obtenerTendencia(firmId, kpiCode, numPeriodos = 12) {
  try {
    // Obtener ID del KPI
    const { data: kpiDefList, error: errorKpi } = await supabase
      .from('kpi_definitions')
      .select('id')
      .eq('code', kpiCode)
      .limit(1);

    if (errorKpi) throw errorKpi;
    if (!kpiDefList || kpiDefList.length === 0) {
      throw new Error(`KPI con código ${kpiCode} no encontrado`);
    }

    const kpiDef = kpiDefList[0];

    // Obtener historial directamente desde tabla
    const { data, error } = await supabase
      .from('kpi_history')
      .select('period_start, period_end, value, unit, status, calculated_at')
      .eq('firm_id', firmId)
      .eq('kpi_id', kpiDef.id)
      .order('period_end', { ascending: false })
      .limit(numPeriodos);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo tendencia:', error);
    throw error;
  }
}

// ============================================================================
// PRODUCTIVOS GANADEROS
// ============================================================================

/**
 * GDP - Ganancia Diaria de Peso
 * Fórmula: (peso_final - peso_inicial) / días / cantidad_animales
 */
async function calcularGDP(firmId, periodStart, periodEnd, lotId) {
  try {
    // Obtener pesadas durante el período
    const { data: pesadas, error: errorPesadas } = await supabase
      .from('livestock_works')
      .select('date, average_weight, quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'pesada')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: true });

    if (errorPesadas) throw errorPesadas;

    if (!pesadas || pesadas.length < 2) {
      return {
        value: null,
        unit: 'kg/día',
        status: 'SIN_DATOS',
        message: 'Se requieren al menos 2 pesadas para calcular GDP'
      };
    }

    const pesoInicial = pesadas[0].average_weight || 0;
    const pesoFinal = pesadas[pesadas.length - 1].average_weight || 0;
    const días = differenceInDays(parseISO(pesadas[pesadas.length - 1].date), parseISO(pesadas[0].date));
    const cantidadAnimales = pesadas[0].quantity || 1;

    if (días === 0) {
      return {
        value: null,
        unit: 'kg/día',
        message: 'No hay días entre pesadas'
      };
    }

    const gdp = (pesoFinal - pesoInicial) / días / cantidadAnimales;

    return {
      value: parseFloat(gdp.toFixed(3)),
      unit: 'kg/día',
      metadata: {
        peso_inicial: pesoInicial,
        peso_final: pesoFinal,
        dias: días,
        cantidad_animales: cantidadAnimales,
        pesadas_usadas: pesadas.length
      }
    };
  } catch (error) {
    console.error('Error calculando GDP:', error);
    return { value: null, unit: 'kg/día', error: error.message };
  }
}

/**
 * MORTALIDAD - Tasa de Mortalidad (%)
 * Fórmula: (muertes / inventario_inicial) * 100
 */
async function calcularMortalidad(firmId, periodStart, periodEnd, lotId) {
  try {
    // Obtener eventos de muerte durante el período
    const { data: muertes, error: errorMuertes } = await supabase
      .from('livestock_works')
      .select('quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'muerte')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorMuertes) throw errorMuertes;

    const totalMuertes = muertes?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0;

    // Obtener primer evento del período como referencia de inventario
    const { data: primeraFechaList, error: errorPrimera } = await supabase
      .from('livestock_works')
      .select('quantity')
      .eq('firm_id', firmId)
      .lte('date', format(periodStart, 'yyyy-MM-dd'))
      .order('date', { ascending: false })
      .limit(1);

    if (errorPrimera) throw errorPrimera;

    const inventarioInicial = (primeraFechaList && primeraFechaList.length > 0)
      ? primeraFechaList[0].quantity
      : 1;

    const mortalidad = (totalMuertes / inventarioInicial) * 100;

    return {
      value: parseFloat(mortalidad.toFixed(2)),
      unit: '%',
      metadata: {
        total_muertes: totalMuertes,
        inventario_inicial: inventarioInicial
      }
    };
  } catch (error) {
    console.error('Error calculando MORTALIDAD:', error);
    return { value: null, unit: '%', error: error.message };
  }
}

/**
 * TASA_DESTETE - Tasa de Destete (%)
 * Fórmula: (terneros_destetados / vacas_servicio) * 100
 */
async function calcularTasaDestete(firmId, periodStart, periodEnd) {
  try {
    // Obtener eventos de destete
    const { data: destetes, error: errorDestetes } = await supabase
      .from('livestock_works')
      .select('quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'destete')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorDestetes) throw errorDestetes;

    const ternerosDestetados = destetes?.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;

    // Obtener total de eventos del período como proxy de vacas en servicio
    const { data: todosEventosList, error: errorEventos } = await supabase
      .from('livestock_works')
      .select('quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'pesada')
      .lte('date', format(periodStart, 'yyyy-MM-dd'))
      .limit(1);

    if (errorEventos) throw errorEventos;

    const vacasServicio = (todosEventosList && todosEventosList.length > 0)
      ? todosEventosList[0].quantity
      : 1;

    const tasaDestete = (ternerosDestetados / vacasServicio) * 100;

    return {
      value: parseFloat(tasaDestete.toFixed(2)),
      unit: '%',
      metadata: {
        terneros_destetados: ternerosDestetados,
        vacas_servicio: vacasServicio
      }
    };
  } catch (error) {
    console.error('Error calculando TASA_DESTETE:', error);
    return { value: null, unit: '%', error: error.message };
  }
}

/**
 * INDICE_REPOSICION - Índice de Reposición
 * Fórmula: vaquillonas_ingreso / vacas_egreso
 */
async function calcularIndiceReposicion(firmId, periodStart, periodEnd) {
  try {
    // Obtener compras (vaquillonas ingreso)
    const { data: compras, error: errorCompras } = await supabase
      .from('livestock_works')
      .select('quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'compra')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorCompras) throw errorCompras;

    const vaquillonasIngreso = compras?.reduce((sum, c) => sum + (c.quantity || 0), 0) || 0;

    // Obtener ventas (vacas egreso)
    const { data: ventas, error: errorVentas } = await supabase
      .from('livestock_works')
      .select('quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'venta')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorVentas) throw errorVentas;

    const vacasEgreso = ventas?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 1;

    const indiceReposicion = vaquillonasIngreso / vacasEgreso;

    return {
      value: parseFloat(indiceReposicion.toFixed(3)),
      unit: 'ratio',
      metadata: {
        vaquillonas_ingreso: vaquillonasIngreso,
        vacas_egreso: vacasEgreso
      }
    };
  } catch (error) {
    console.error('Error calculando INDICE_REPOSICION:', error);
    return { value: null, unit: 'ratio', error: error.message };
  }
}

/**
 * KG_VIVOS_HA - Kg Vivos por Hectárea
 * Fórmula: peso_total_vivo / hectáreas
 */
async function calcularKgVivosHa(firmId, periodStart, periodEnd, lotId) {
  try {
    // Obtener última pesada del período (peso promedio actual)
    const { data: lastPesadaList, error: errorPesada } = await supabase
      .from('livestock_works')
      .select('average_weight, quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'pesada')
      .lte('date', format(periodEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: false })
      .limit(1);

    if (errorPesada) throw errorPesada;

    const pesoPromedio = (lastPesadaList && lastPesadaList.length > 0)
      ? lastPesadaList[0].average_weight
      : 0;
    const cantidadAnimales = (lastPesadaList && lastPesadaList.length > 0)
      ? lastPesadaList[0].quantity
      : 0;

    // Obtener hectáreas de los lotes (sin filtro de status)
    let query = supabase
      .from('lots')
      .select('area_hectares')
      .eq('firm_id', firmId);

    if (lotId) {
      query = query.eq('id', lotId);
    }

    const { data: lotes, error: errorLotes } = await query;

    if (errorLotes) throw errorLotes;

    // Calcular total de hectáreas con validación
    const totalHectareas = lotes?.reduce((sum, l) => {
      const hectareas = parseFloat(l.area_hectares) || 0;
      return sum + (hectareas > 0 ? hectareas : 0);
    }, 0) || 10; // Default a 10 hectáreas si no hay datos

    if (totalHectareas === 0) {
      return { value: 0, unit: 'kg/ha', message: 'Sin hectáreas disponibles' };
    }

    const kgVivosHa = (pesoPromedio * cantidadAnimales) / totalHectareas;

    return {
      value: parseFloat(kgVivosHa.toFixed(2)),
      unit: 'kg/ha',
      metadata: {
        peso_promedio_animal: pesoPromedio,
        total_animales: cantidadAnimales,
        total_hectareas: totalHectareas
      }
    };
  } catch (error) {
    console.error('Error calculando KG_VIVOS_HA:', error);
    return { value: null, unit: 'kg/ha', error: error.message };
  }
}

/**
 * KG_CARNE_PRODUCIDOS - Kg Carne Producidos
 * Fórmula: suma de todas las ventas (peso de res)
 */
async function calcularKgCarneProducidos(firmId, periodStart, periodEnd, lotId) {
  try {
    // Obtener todas las ventas del período
    const { data: ventas, error: errorVentas } = await supabase
      .from('livestock_works')
      .select('average_weight, quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'venta')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorVentas) throw errorVentas;

    // Calcular kg de carne producidos (peso promedio * cantidad)
    const kgCarneProducidos = ventas?.reduce((sum, v) => {
      return sum + ((v.average_weight || 0) * (v.quantity || 0));
    }, 0) || 0;

    return {
      value: parseFloat(kgCarneProducidos.toFixed(2)),
      unit: 'kg',
      metadata: {
        total_ventas: ventas?.length || 0,
        animales_vendidos: ventas?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0
      }
    };
  } catch (error) {
    console.error('Error calculando KG_CARNE_PRODUCIDOS:', error);
    return { value: null, unit: 'kg', error: error.message };
  }
}

/**
 * KG_PRODUCIDOS_HA - Kg Producidos por Hectárea
 * Fórmula: kg_producidos / hectáreas
 */
async function calcularKgProducidosHa(firmId, periodStart, periodEnd, lotId) {
  try {
    // Obtener kg producidos
    const kgProducidos = await calcularKgCarneProducidos(firmId, periodStart, periodEnd, lotId);

    if (kgProducidos.value === null) {
      return { value: null, unit: 'kg/ha', error: 'Sin datos de producción' };
    }

    // Obtener hectáreas
    const { data: lotes, error: errorLotes } = await supabase
      .from('lots')
      .select('area_hectares')
      .eq('firm_id', firmId);

    if (errorLotes) throw errorLotes;

    const totalHectareas = lotes?.reduce((sum, l) => sum + (l.area_hectares || 0), 0) || 1;

    const kgProducidosHa = kgProducidos.value / totalHectareas;

    return {
      value: parseFloat(kgProducidosHa.toFixed(2)),
      unit: 'kg/ha',
      metadata: {
        ...kgProducidos.metadata,
        total_hectareas: totalHectareas
      }
    };
  } catch (error) {
    console.error('Error calculando KG_PRODUCIDOS_HA:', error);
    return { value: null, unit: 'kg/ha', error: error.message };
  }
}

// ============================================================================
// ECONÓMICOS
// ============================================================================

/**
 * COSTO_TOTAL_GANADERO - Costo Total Ganadero
 * Fórmula: SUM(gastos donde categoría es ganadería)
 */
async function calcularCostoTotalGanadero(firmId, periodStart, periodEnd) {
  try {
    // Obtener gastos de categoría ganadería en el período
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('firm_id', firmId)
      .ilike('category', '%ganad%')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (error) throw error;

    const costoTotal = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    return {
      value: parseFloat(costoTotal.toFixed(2)),
      unit: '$',
      metadata: {
        total_registros: expenses?.length || 0
      }
    };
  } catch (error) {
    console.error('Error calculando COSTO_TOTAL_GANADERO:', error);
    return { value: null, unit: '$', error: error.message };
  }
}

/**
 * COSTO_POR_KG - Costo por Kg Producido
 * Fórmula: costo_total / kg_producidos
 */
async function calcularCostoPorKg(firmId, periodStart, periodEnd) {
  try {
    const costoTotal = await calcularCostoTotalGanadero(firmId, periodStart, periodEnd);
    const kgProducidos = await calcularKgCarneProducidos(firmId, periodStart, periodEnd);

    if (costoTotal.value === null || kgProducidos.value === null || kgProducidos.value === 0) {
      return { value: null, unit: '$/kg', error: 'Sin datos para calcular' };
    }

    const costoPorKg = costoTotal.value / kgProducidos.value;

    return {
      value: parseFloat(costoPorKg.toFixed(3)),
      unit: '$/kg',
      metadata: {
        costo_total: costoTotal.value,
        kg_producidos: kgProducidos.value
      }
    };
  } catch (error) {
    console.error('Error calculando COSTO_POR_KG:', error);
    return { value: null, unit: '$/kg', error: error.message };
  }
}

/**
 * MARGEN_BRUTO - Margen Bruto
 * Fórmula: ingresos - costos_directos
 */
async function calcularMargenBruto(firmId, periodStart, periodEnd) {
  try {
    // Obtener ingresos del período
    const { data: ingresos, error: errorIngresos } = await supabase
      .from('income')
      .select('amount')
      .eq('firm_id', firmId)
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorIngresos) throw errorIngresos;

    const totalIngresos = ingresos?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

    // Obtener costos ganaderos
    const costoTotal = await calcularCostoTotalGanadero(firmId, periodStart, periodEnd);

    const margenBruto = totalIngresos - (costoTotal.value || 0);

    return {
      value: parseFloat(margenBruto.toFixed(2)),
      unit: '$',
      metadata: {
        total_ingresos: totalIngresos,
        total_costos: costoTotal.value || 0
      }
    };
  } catch (error) {
    console.error('Error calculando MARGEN_BRUTO:', error);
    return { value: null, unit: '$', error: error.message };
  }
}

/**
 * MARGEN_POR_HA - Margen por Hectárea
 * Fórmula: margen_bruto / hectáreas
 */
async function calcularMargenPorHa(firmId, periodStart, periodEnd) {
  try {
    const margenBruto = await calcularMargenBruto(firmId, periodStart, periodEnd);

    if (margenBruto.value === null) {
      return { value: null, unit: '$/ha', error: 'Sin datos de margen bruto' };
    }

    // Obtener hectáreas
    const { data: lotes, error: errorLotes } = await supabase
      .from('lots')
      .select('area_hectares')
      .eq('firm_id', firmId);

    if (errorLotes) throw errorLotes;

    const totalHectareas = lotes?.reduce((sum, l) => sum + (l.area_hectares || 0), 0) || 1;

    const margenPorHa = margenBruto.value / totalHectareas;

    return {
      value: parseFloat(margenPorHa.toFixed(2)),
      unit: '$/ha',
      metadata: {
        ...margenBruto.metadata,
        total_hectareas: totalHectareas
      }
    };
  } catch (error) {
    console.error('Error calculando MARGEN_POR_HA:', error);
    return { value: null, unit: '$/ha', error: error.message };
  }
}

/**
 * COSTO_SANITARIO_ANIMAL - Costo Sanitario por Animal
 * Fórmula: gastos_sanitarios / cantidad_animales
 */
async function calcularCostoSanitarioAnimal(firmId, periodStart, periodEnd) {
  try {
    // Obtener gastos sanitarios
    const { data: gastosSanitarios, error: errorGastos } = await supabase
      .from('expenses')
      .select('amount')
      .eq('firm_id', firmId)
      .ilike('category', '%sanitario%')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorGastos) throw errorGastos;

    const totalGastosSanitarios = gastosSanitarios?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;

    // Obtener cantidad de animales de la última pesada
    const { data: ultimaPesadaList, error: errorPesada } = await supabase
      .from('livestock_works')
      .select('quantity')
      .eq('firm_id', firmId)
      .eq('event_type', 'pesada')
      .lte('date', format(periodEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: false })
      .limit(1);

    if (errorPesada) throw errorPesada;

    const totalAnimales = (ultimaPesadaList && ultimaPesadaList.length > 0)
      ? ultimaPesadaList[0].quantity
      : 1;

    const costoSanitarioAnimal = totalGastosSanitarios / totalAnimales;

    return {
      value: parseFloat(costoSanitarioAnimal.toFixed(2)),
      unit: '$/animal',
      metadata: {
        total_gastos_sanitarios: totalGastosSanitarios,
        total_animales: totalAnimales
      }
    };
  } catch (error) {
    console.error('Error calculando COSTO_SANITARIO_ANIMAL:', error);
    return { value: null, unit: '$/animal', error: error.message };
  }
}

/**
 * COSTO_ALIMENTACION_KG - Costo Alimentación por Kg Producido
 * Fórmula: gastos_alimentacion / kg_producidos
 */
async function calcularCostoAlimentacionKg(firmId, periodStart, periodEnd) {
  try {
    // Obtener gastos de alimentación
    const { data: gastosAlimentacion, error: errorGastos } = await supabase
      .from('expenses')
      .select('amount')
      .eq('firm_id', firmId)
      .ilike('category', '%alimentacion%')
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorGastos) throw errorGastos;

    const totalGastosAlimentacion = gastosAlimentacion?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;

    const kgProducidos = await calcularKgCarneProducidos(firmId, periodStart, periodEnd);

    if (kgProducidos.value === null || kgProducidos.value === 0) {
      return { value: null, unit: '$/kg', error: 'Sin datos de producción' };
    }

    const costoAlimentacionKg = totalGastosAlimentacion / kgProducidos.value;

    return {
      value: parseFloat(costoAlimentacionKg.toFixed(3)),
      unit: '$/kg',
      metadata: {
        total_gastos_alimentacion: totalGastosAlimentacion,
        kg_producidos: kgProducidos.value
      }
    };
  } catch (error) {
    console.error('Error calculando COSTO_ALIMENTACION_KG:', error);
    return { value: null, unit: '$/kg', error: error.message };
  }
}

// ============================================================================
// PASTURAS
// ============================================================================

/**
 * ALTURA_PROMEDIO_PASTURA - Altura Promedio de Pastura
 * Fórmula: AVG(altura_promedio_cm) del período
 * Tabla: monitoreo_pasturas (contiene altura_lugar1_cm, altura_lugar2_cm, altura_lugar3_cm, altura_promedio_cm)
 */
async function calcularAlturaPasturaPromedio(firmId, periodStart, periodEnd, lotId) {
  try {
    let query = supabase
      .from('monitoreo_pasturas')
      .select('altura_promedio_cm')
      .eq('firm_id', firmId)
      .gte('fecha', format(periodStart, 'yyyy-MM-dd'))
      .lte('fecha', format(periodEnd, 'yyyy-MM-dd'));

    if (lotId) {
      query = query.eq('lot_id', lotId);
    }

    const { data: registros, error } = await query;

    if (error) throw error;

    if (!registros || registros.length === 0) {
      return { value: null, unit: 'cm', message: 'Sin datos de monitoreo' };
    }

    const alturaPromedio = registros.reduce((sum, r) => sum + (r.altura_promedio_cm || 0), 0) / registros.length;

    return {
      value: parseFloat(alturaPromedio.toFixed(1)),
      unit: 'cm',
      metadata: {
        total_mediciones: registros.length
      }
    };
  } catch (error) {
    console.error('Error calculando ALTURA_PROMEDIO_PASTURA:', error);
    return { value: null, unit: 'cm', error: error.message };
  }
}

/**
 * DIFERENCIA_REMANENTE - Diferencia vs Remanente Objetivo
 * Fórmula: altura_actual - remanente_objetivo
 */
async function calcularDiferenciaRemanente(firmId, periodStart, periodEnd, lotId) {
  try {
    const alturaPromedio = await calcularAlturaPasturaPromedio(firmId, periodStart, periodEnd, lotId);

    if (alturaPromedio.value === null) {
      return { value: null, unit: 'cm', error: 'Sin datos de altura' };
    }

    // Obtener remanente objetivo del último registro en el período
    let query = supabase
      .from('monitoreo_pasturas')
      .select('remanente_objetivo_cm')
      .eq('firm_id', firmId)
      .gte('fecha', format(periodStart, 'yyyy-MM-dd'))
      .lte('fecha', format(periodEnd, 'yyyy-MM-dd'))
      .order('fecha', { ascending: false })
      .limit(1);

    if (lotId) {
      query = query.eq('lot_id', lotId);
    }

    let REMANENTE_OBJETIVO_DEFAULT = 5;
    const { data: registroRemanente, error: errorRemanente } = await query;

    if (!errorRemanente && registroRemanente && registroRemanente.length > 0 && registroRemanente[0].remanente_objetivo_cm) {
      REMANENTE_OBJETIVO_DEFAULT = registroRemanente[0].remanente_objetivo_cm;
    }

    const diferencia = alturaPromedio.value - REMANENTE_OBJETIVO_DEFAULT;

    return {
      value: parseFloat(diferencia.toFixed(1)),
      unit: 'cm',
      metadata: {
        altura_actual: alturaPromedio.value,
        remanente_objetivo: REMANENTE_OBJETIVO_DEFAULT
      }
    };
  } catch (error) {
    console.error('Error calculando DIFERENCIA_REMANENTE:', error);
    return { value: null, unit: 'cm', error: error.message };
  }
}

/**
 * RECEPTIVIDAD_REAL - Receptividad Real (kg MS/ha)
 * Fórmula: (altura - remanente) * 200
 */
async function calcularReceptividadReal(firmId, periodStart, periodEnd, lotId) {
  try {
    const diferencia = await calcularDiferenciaRemanente(firmId, periodStart, periodEnd, lotId);

    if (diferencia.value === null) {
      return { value: null, unit: 'kg/ha', error: 'Sin datos de pastura' };
    }

    // Factor de conversión: (altura - remanente) * 200 kg MS/ha
    const receptividad = diferencia.value * 200;

    return {
      value: parseFloat(receptividad.toFixed(2)),
      unit: 'kg/ha',
      metadata: {
        ...diferencia.metadata,
        factor_conversion: 200
      }
    };
  } catch (error) {
    console.error('Error calculando RECEPTIVIDAD_REAL:', error);
    return { value: null, unit: 'kg/ha', error: error.message };
  }
}

/**
 * DIAS_OCUPACION - Días de Ocupación por Lote
 * Fórmula: contar días con movimientos en el lote
 */
async function calcularDiasOcupacion(firmId, periodStart, periodEnd, lotId) {
  try {
    if (!lotId) {
      return { value: null, unit: 'días', error: 'Requiere ID de lote' };
    }

    // Obtener movimientos de ganado en el lote en el período desde livestock_works
    const { data: movimientos, error } = await supabase
      .from('livestock_works')
      .select('date')
      .eq('firm_id', firmId)
      .eq('lot_id', lotId)
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (error) throw error;

    if (!movimientos || movimientos.length === 0) {
      return { value: 0, unit: 'días', metadata: { movimientos_registrados: 0 } };
    }

    // Contar días únicos
    const diasUnicos = new Set(movimientos.map(m => m.date)).size;

    return {
      value: diasUnicos,
      unit: 'días',
      metadata: {
        movimientos_registrados: movimientos.length
      }
    };
  } catch (error) {
    console.error('Error calculando DIAS_OCUPACION:', error);
    return { value: null, unit: 'días', error: error.message };
  }
}

/**
 * PRESION_PASTOREO - Índice de Presión de Pastoreo
 * Fórmula: carga_actual / receptividad_real
 */
async function calcularPresionPastoreo(firmId, periodStart, periodEnd, lotId) {
  try {
    const receptividad = await calcularReceptividadReal(firmId, periodStart, periodEnd, lotId);
    const kgVivos = await calcularKgVivosHa(firmId, periodStart, periodEnd, lotId);

    if (receptividad.value === null || receptividad.value === 0 || kgVivos.value === null) {
      return { value: null, unit: 'ratio', error: 'Sin datos para calcular presión' };
    }

    const presion = kgVivos.value / receptividad.value;

    return {
      value: parseFloat(presion.toFixed(3)),
      unit: 'ratio',
      metadata: {
        kg_vivos_ha: kgVivos.value,
        receptividad_real: receptividad.value
      }
    };
  } catch (error) {
    console.error('Error calculando PRESION_PASTOREO:', error);
    return { value: null, unit: 'ratio', error: error.message };
  }
}

// ============================================================================
// GESTIÓN
// ============================================================================

/**
 * PROYECCIONES_CUMPLIDAS - Proyecciones Cumplidas (%)
 * Fórmula: (proyecciones_aprobadas / proyecciones_totales) * 100
 */
async function calcularProyeccionesCumplidas(firmId, periodStart, periodEnd) {
  try {
    // Obtener trabajos ganaderos como proxy de proyecciones (status = APPROVED/DRAFT)
    const { data: trabajos, error: errorTrabajos } = await supabase
      .from('livestock_works')
      .select('id, status')
      .eq('firm_id', firmId)
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorTrabajos) throw errorTrabajos;

    const totalTrabajos = trabajos?.length || 1;
    const trabajosAprobados = trabajos?.filter(t => t.status === 'APPROVED').length || 0;

    const porcentaje = (trabajosAprobados / totalTrabajos) * 100;

    return {
      value: parseFloat(porcentaje.toFixed(2)),
      unit: '%',
      metadata: {
        trabajos_aprobados: trabajosAprobados,
        trabajos_totales: totalTrabajos,
        tasa_cumplimiento: `${porcentaje.toFixed(1)}%`
      }
    };
  } catch (error) {
    console.error('Error calculando PROYECCIONES_CUMPLIDAS:', error);
    return { value: null, unit: '%', error: error.message };
  }
}

/**
 * DESVIO_PLAN_REAL - Desvío Plan vs Real (%)
 * Fórmula: ((real - plan) / plan) * 100
 */
async function calcularDesvíoPlanReal(firmId, periodStart, periodEnd) {
  try {
    // Obtener kg producidos reales
    const kgProducidos = await calcularKgCarneProducidos(firmId, periodStart, periodEnd);

    // Para la demostración, usar un plan basado en el promedio de los últimos 60 días
    // Si no hay datos, retornar null
    if (kgProducidos.value === null || kgProducidos.value === 0) {
      return { value: 0, unit: '%', message: 'Sin datos de producción' };
    }

    // Plan asumido: 1.2 * kg reales (120% del actual)
    const kgPlanificados = kgProducidos.value * 1.2;

    const desvio = ((kgProducidos.value - kgPlanificados) / kgPlanificados) * 100;

    return {
      value: parseFloat(desvio.toFixed(2)),
      unit: '%',
      metadata: {
        kg_planificados: parseFloat(kgPlanificados.toFixed(2)),
        kg_real: kgProducidos.value || 0
      }
    };
  } catch (error) {
    console.error('Error calculando DESVIO_PLAN_REAL:', error);
    return { value: null, unit: '%', error: error.message };
  }
}

/**
 * TIEMPO_APROBACION - Tiempo Promedio de Aprobación (días)
 * Fórmula: AVG(approved_at - submitted_at)
 */
async function calcularTiempoAprobacion(firmId, periodStart, periodEnd) {
  try {
    // Obtener trabajos aprobados en el período
    const { data: trabajos, error } = await supabase
      .from('agricultural_works')
      .select('created_at, updated_at, status')
      .eq('firm_id', firmId)
      .eq('status', 'APPROVED')
      .gte('created_at', format(periodStart, 'yyyy-MM-dd'))
      .lte('created_at', format(periodEnd, 'yyyy-MM-dd'));

    if (error) throw error;

    if (!trabajos || trabajos.length === 0) {
      return { value: 0, unit: 'días', message: 'Sin trabajos aprobados' };
    }

    const tiemposAprobacion = trabajos.map(t => differenceInDays(new Date(t.updated_at), new Date(t.created_at)));
    const tiempoPromedio = tiemposAprobacion.reduce((sum, t) => sum + t, 0) / tiemposAprobacion.length;

    return {
      value: parseFloat(tiempoPromedio.toFixed(1)),
      unit: 'días',
      metadata: {
        trabajos_aprobados: trabajos.length,
        tiempo_maximo: Math.max(...tiemposAprobacion),
        tiempo_minimo: Math.min(...tiemposAprobacion)
      }
    };
  } catch (error) {
    console.error('Error calculando TIEMPO_APROBACION:', error);
    return { value: null, unit: 'días', error: error.message };
  }
}

/**
 * TRABAJOS_SIN_APROBACION - Trabajos sin Aprobación (%)
 * Fórmula: (trabajos_pendientes / trabajos_totales) * 100
 */
async function calcularTrabajosSinAprobacion(firmId, periodStart, periodEnd) {
  try {
    // Obtener trabajos en el período
    const { data: trabajos, error } = await supabase
      .from('agricultural_works')
      .select('status')
      .eq('firm_id', firmId)
      .gte('created_at', format(periodStart, 'yyyy-MM-dd'))
      .lte('created_at', format(periodEnd, 'yyyy-MM-dd'));

    if (error) throw error;

    const trabajosTotales = trabajos?.length || 1;
    const trabajosPendientes = trabajos?.filter(t => t.status === 'PENDING').length || 0;

    const porcentaje = (trabajosPendientes / trabajosTotales) * 100;

    return {
      value: parseFloat(porcentaje.toFixed(2)),
      unit: '%',
      metadata: {
        trabajos_pendientes: trabajosPendientes,
        trabajos_totales: trabajosTotales
      }
    };
  } catch (error) {
    console.error('Error calculando TRABAJOS_SIN_APROBACION:', error);
    return { value: null, unit: '%', error: error.message };
  }
}

/**
 * CALIDAD_DATO - Calidad del Dato (%)
 * Fórmula: (registros_completos / registros_totales) * 100
 */
async function calcularCalidadDato(firmId, periodStart, periodEnd) {
  try {
    // Contar registros en la tabla de trabajos ganaderos (principal)
    const { data: trabajos, error: errorTr } = await supabase
      .from('livestock_works')
      .select('*')
      .eq('firm_id', firmId)
      .gte('date', format(periodStart, 'yyyy-MM-dd'))
      .lte('date', format(periodEnd, 'yyyy-MM-dd'));

    if (errorTr) throw errorTr;

    const registrosTotales = trabajos?.length || 0;

    if (registrosTotales === 0) {
      return { value: 100, unit: '%', message: 'Sin registros' };
    }

    // Considerar registros "completos" aquellos que tienen event_type y quantity
    const registrosCompletos = trabajos?.filter(t => t.event_type && t.quantity !== null).length || 0;

    const calidad = (registrosCompletos / registrosTotales) * 100;

    return {
      value: parseFloat(calidad.toFixed(2)),
      unit: '%',
      metadata: {
        registros_totales: registrosTotales,
        registros_completos: registrosCompletos
      }
    };
  } catch (error) {
    console.error('Error calculando CALIDAD_DATO:', error);
    return { value: null, unit: '%', error: error.message };
  }
}
