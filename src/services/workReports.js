/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Servicios de Reportes y Exportación
 *
 * Funcionalidad:
 * - Exportar trabajos a Excel
 * - Comparación planificado vs ejecutado
 * - Análisis de costos por lote
 * - Análisis de desempeño
 */

import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

/**
 * Obtiene datos de trabajos agrícolas para reportes
 */
export async function obtenerReporteTrabajosAgricolas(filtros = {}) {
  try {
    let query = supabase
      .from('agricultural_works')
      .select(`
        id,
        date,
        work_type,
        hectares,
        responsible_person,
        status,
        firms(name),
        premises(name),
        lots(name),
        cost_centers(code, name)
      `);

    // Aplicar filtros
    if (filtros.firma_id) {
      query = query.eq('firm_id', filtros.firma_id);
    }
    if (filtros.predio_id) {
      query = query.eq('premise_id', filtros.predio_id);
    }
    if (filtros.lote_id) {
      query = query.eq('lot_id', filtros.lote_id);
    }
    if (filtros.estado) {
      query = query.eq('status', filtros.estado);
    }
    if (filtros.desde) {
      query = query.gte('date', filtros.desde);
    }
    if (filtros.hasta) {
      query = query.lte('date', filtros.hasta);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    // Obtener costos desde tablas relacionadas
    const { data: inputCosts } = await supabase.from('work_inputs').select('agricultural_work_id, total_cost');
    const { data: machineryCosts } = await supabase.from('work_machinery').select('agricultural_work_id, total_cost');
    const { data: laborCosts } = await supabase.from('work_labor').select('agricultural_work_id, total_cost');

    // Enriquecer con análisis
    const trabajosEnriquecidos = (data || []).map(trabajo => {
      const inputs_cost = (inputCosts || [])
        .filter(ic => ic.agricultural_work_id === trabajo.id)
        .reduce((sum, ic) => sum + (ic.total_cost || 0), 0);
      const machinery_cost = (machineryCosts || [])
        .filter(mc => mc.agricultural_work_id === trabajo.id)
        .reduce((sum, mc) => sum + (mc.total_cost || 0), 0);
      const labor_cost = (laborCosts || [])
        .filter(lc => lc.agricultural_work_id === trabajo.id)
        .reduce((sum, lc) => sum + (lc.total_cost || 0), 0);
      const other_costs = 0;
      const costo_total = (inputs_cost + machinery_cost + labor_cost + other_costs).toFixed(2);
      const costo_por_hectarea = trabajo.hectares > 0
        ? (costo_total / trabajo.hectares).toFixed(2)
        : '0.00';

      return {
        ...trabajo,
        inputs_cost,
        machinery_cost,
        labor_cost,
        other_costs,
        costo_total,
        costo_por_hectarea
      };
    });

    return {
      data: trabajosEnriquecidos,
      count: trabajosEnriquecidos.length,
      resumen: {
        total_hectareas: trabajosEnriquecidos.reduce((sum, t) => sum + (parseFloat(t.hectares) || 0), 0),
        costo_total: trabajosEnriquecidos.reduce((sum, t) => sum + parseFloat(t.costo_total), 0),
        cantidad_trabajos: trabajosEnriquecidos.length,
        promedio_costo_hectarea: trabajosEnriquecidos.length > 0
          ? (trabajosEnriquecidos.reduce((sum, t) => sum + parseFloat(t.costo_por_hectarea), 0) / trabajosEnriquecidos.length).toFixed(2)
          : '0.00'
      }
    };
  } catch (error) {
    console.error('Error en obtenerReporteTrabajosAgricolas:', error);
    throw error;
  }
}

/**
 * Obtiene datos de trabajos ganaderos para reportes
 */
export async function obtenerReporteTrabajosGanaderos(filtros = {}) {
  try {
    let query = supabase
      .from('livestock_works')
      .select(`
        *,
        firms(name),
        premises(name),
        herds(name),
        cost_centers(code, name)
      `);

    // Aplicar filtros
    if (filtros.firma_id) {
      query = query.eq('firm_id', filtros.firma_id);
    }
    if (filtros.predio_id) {
      query = query.eq('premise_id', filtros.predio_id);
    }
    if (filtros.rodeo_id) {
      query = query.eq('herd_id', filtros.rodeo_id);
    }
    if (filtros.estado) {
      query = query.eq('status', filtros.estado);
    }
    if (filtros.desde) {
      query = query.gte('date', filtros.desde);
    }
    if (filtros.hasta) {
      query = query.lte('date', filtros.hasta);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    // Enriquecer con análisis
    const trabajosEnriquecidos = (data || []).map(trabajo => ({
      ...trabajo,
      costo_total: (parseFloat(trabajo.inputs_cost || 0) +
                    parseFloat(trabajo.machinery_cost || 0) +
                    parseFloat(trabajo.labor_cost || 0) +
                    parseFloat(trabajo.other_costs || 0)).toFixed(2),
      costo_por_animal: trabajo.quantity > 0
        ? ((parseFloat(trabajo.inputs_cost || 0) +
            parseFloat(trabajo.machinery_cost || 0) +
            parseFloat(trabajo.labor_cost || 0) +
            parseFloat(trabajo.other_costs || 0)) / trabajo.quantity).toFixed(2)
        : '0.00'
    }));

    return {
      data: trabajosEnriquecidos,
      count: trabajosEnriquecidos.length,
      resumen: {
        total_animales: trabajosEnriquecidos.reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0),
        costo_total: trabajosEnriquecidos.reduce((sum, t) => sum + parseFloat(t.costo_total), 0),
        cantidad_trabajos: trabajosEnriquecidos.length,
        promedio_costo_animal: trabajosEnriquecidos.length > 0
          ? (trabajosEnriquecidos.reduce((sum, t) => sum + parseFloat(t.costo_por_animal), 0) / trabajosEnriquecidos.length).toFixed(2)
          : '0.00'
      }
    };
  } catch (error) {
    console.error('Error en obtenerReporteTrabajosGanaderos:', error);
    throw error;
  }
}

/**
 * Obtiene comparación de proyecciones vs trabajos ejecutados
 */
export async function obtenerReporteComparacionProyecciones(filtros = {}) {
  try {
    // Obtener proyecciones agrícolas convertidas
    const { data: proyeccionesAgricolas } = await supabase
      .from('proyecciones_agricolas')
      .select(`
        *,
        agricultural_works!trabajo_agricola_id(
          date,
          work_type,
          hectares,
          inputs_cost,
          machinery_cost,
          labor_cost,
          other_costs
        )
      `)
      .not('trabajo_agricola_id', 'is', null);

    // Obtener proyecciones ganaderas convertidas
    const { data: proyeccionesGanaderas } = await supabase
      .from('proyecciones_ganaderas')
      .select(`
        *,
        livestock_works!trabajo_ganadero_id(
          date,
          event_type,
          quantity,
          inputs_cost,
          machinery_cost,
          labor_cost,
          other_costs
        )
      `)
      .not('trabajo_ganadero_id', 'is', null);

    // Procesar y enriquecer datos
    const comparacionAgricola = (proyeccionesAgricolas || []).map(proy => {
      const trabajo = proy.agricultural_works?.[0];
      if (!trabajo) return null;

      const costo_estimado = parseFloat(proy.estimated_total_cost || 0);
      const costo_real = parseFloat(trabajo.inputs_cost || 0) +
                         parseFloat(trabajo.machinery_cost || 0) +
                         parseFloat(trabajo.labor_cost || 0) +
                         parseFloat(trabajo.other_costs || 0);

      const varianza_costo = ((costo_real - costo_estimado) / costo_estimado * 100).toFixed(2);

      return {
        tipo: 'Agrícola',
        cultivo: proy.cultivo_proyectado,
        hectareas_proyectadas: proy.hectareas,
        hectareas_ejecutadas: trabajo.hectares,
        costo_estimado: costo_estimado.toFixed(2),
        costo_real: costo_real.toFixed(2),
        varianza_costo: varianza_costo,
        estado: varianza_costo < 5 ? 'Óptimo' : varianza_costo < 15 ? 'Aceptable' : 'Revisar'
      };
    }).filter(item => item !== null);

    const comparacionGanadera = (proyeccionesGanaderas || []).map(proy => {
      const trabajo = proy.livestock_works?.[0];
      if (!trabajo) return null;

      const costo_estimado = parseFloat(proy.estimated_total_cost || 0);
      const costo_real = parseFloat(trabajo.inputs_cost || 0) +
                         parseFloat(trabajo.machinery_cost || 0) +
                         parseFloat(trabajo.labor_cost || 0) +
                         parseFloat(trabajo.other_costs || 0);

      const varianza_costo = costo_estimado > 0
        ? ((costo_real - costo_estimado) / costo_estimado * 100).toFixed(2)
        : '0.00';

      return {
        tipo: 'Ganadero',
        evento: proy.tipo_evento,
        cantidad_proyectada: proy.cantidad,
        cantidad_ejecutada: trabajo.quantity,
        costo_estimado: costo_estimado.toFixed(2),
        costo_real: costo_real.toFixed(2),
        varianza_costo: varianza_costo,
        estado: varianza_costo < 5 ? 'Óptimo' : varianza_costo < 15 ? 'Aceptable' : 'Revisar'
      };
    }).filter(item => item !== null);

    return {
      agricola: comparacionAgricola,
      ganadera: comparacionGanadera,
      total_conversiones: (comparacionAgricola.length + comparacionGanadera.length),
      resumen: {
        varianza_promedio: (
          ([...comparacionAgricola, ...comparacionGanadera]
            .reduce((sum, item) => sum + parseFloat(item.varianza_costo), 0) /
          ([...comparacionAgricola, ...comparacionGanadera].length || 1))
        ).toFixed(2)
      }
    };
  } catch (error) {
    console.error('Error en obtenerReporteComparacionProyecciones:', error);
    throw error;
  }
}

/**
 * Obtiene análisis de costos por lote
 */
export async function obtenerAnalisisCostosPorLote(premiseId) {
  try {
    const { data: trabajos } = await supabase
      .from('agricultural_works')
      .select(`
        *,
        lots(name)
      `)
      .eq('premise_id', premiseId)
      .eq('status', 'APPROVED');

    const costosPorLote = {};

    (trabajos || []).forEach(trabajo => {
      const lote = trabajo.lots?.name || 'Sin Lote';
      if (!costosPorLote[lote]) {
        costosPorLote[lote] = {
          lote,
          trabajos: 0,
          hectareas: 0,
          costo_total: 0,
          costo_insumos: 0,
          costo_maquinaria: 0,
          costo_labor: 0,
          costo_otros: 0
        };
      }

      costosPorLote[lote].trabajos += 1;
      costosPorLote[lote].hectareas += parseFloat(trabajo.hectares || 0);
      costosPorLote[lote].costo_total += parseFloat(trabajo.inputs_cost || 0) +
                                          parseFloat(trabajo.machinery_cost || 0) +
                                          parseFloat(trabajo.labor_cost || 0) +
                                          parseFloat(trabajo.other_costs || 0);
      costosPorLote[lote].costo_insumos += parseFloat(trabajo.inputs_cost || 0);
      costosPorLote[lote].costo_maquinaria += parseFloat(trabajo.machinery_cost || 0);
      costosPorLote[lote].costo_labor += parseFloat(trabajo.labor_cost || 0);
      costosPorLote[lote].costo_otros += parseFloat(trabajo.other_costs || 0);
    });

    // Agregar costo por hectárea
    const analisis = Object.values(costosPorLote).map(lote => ({
      ...lote,
      costo_por_hectarea: lote.hectareas > 0
        ? (lote.costo_total / lote.hectareas).toFixed(2)
        : '0.00'
    }));

    return analisis.sort((a, b) => b.costo_total - a.costo_total);
  } catch (error) {
    console.error('Error en obtenerAnalisisCostosPorLote:', error);
    throw error;
  }
}

/**
 * Exporta datos a formato CSV (para Excel)
 */
export function exportarCSV(datos, nombreArchivo) {
  if (!datos || datos.length === 0) {
    console.warn('No hay datos para exportar');
    return;
  }

  // Obtener encabezados desde el primer objeto
  const encabezados = Object.keys(datos[0]);

  // Crear filas CSV
  const filas = datos.map(item =>
    encabezados.map(encabezado => {
      const valor = item[encabezado];
      // Escapar comillas y envolver en comillas si contiene comas
      if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
        return `"${valor.replace(/"/g, '""')}"`;
      }
      return valor;
    }).join(',')
  );

  // Construir CSV completo
  const csv = [encabezados.join(','), ...filas].join('\n');

  // Descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera resumen estadístico de trabajos
 */
export async function generarResumenEstadistico(firma_id, desde, hasta) {
  try {
    // Trabajos aprobados en período
    const { data: trabajosAgricolas } = await supabase
      .from('agricultural_works')
      .select('*')
      .eq('firm_id', firma_id)
      .eq('status', 'APPROVED')
      .gte('date', desde)
      .lte('date', hasta);

    const { data: trabajosGanaderos } = await supabase
      .from('livestock_works')
      .select('*')
      .eq('firm_id', firma_id)
      .eq('status', 'APPROVED')
      .gte('date', desde)
      .lte('date', hasta);

    // Calcular totales
    const totalCostoAgricola = (trabajosAgricolas || []).reduce((sum, t) =>
      sum + (parseFloat(t.inputs_cost || 0) +
             parseFloat(t.machinery_cost || 0) +
             parseFloat(t.labor_cost || 0) +
             parseFloat(t.other_costs || 0)), 0);

    const totalCostoGanadero = (trabajosGanaderos || []).reduce((sum, t) =>
      sum + (parseFloat(t.inputs_cost || 0) +
             parseFloat(t.machinery_cost || 0) +
             parseFloat(t.labor_cost || 0) +
             parseFloat(t.other_costs || 0)), 0);

    return {
      periodo: `${desde} a ${hasta}`,
      trabajos_agricolas: trabajosAgricolas?.length || 0,
      trabajos_ganaderos: trabajosGanaderos?.length || 0,
      total_trabajos: (trabajosAgricolas?.length || 0) + (trabajosGanaderos?.length || 0),
      costo_agricola: totalCostoAgricola.toFixed(2),
      costo_ganadero: totalCostoGanadero.toFixed(2),
      costo_total: (totalCostoAgricola + totalCostoGanadero).toFixed(2),
      hectareas_totales: (trabajosAgricolas || []).reduce((sum, t) => sum + (parseFloat(t.hectares) || 0), 0).toFixed(2),
      animales_totales: (trabajosGanaderos || []).reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0)
    };
  } catch (error) {
    console.error('Error en generarResumenEstadistico:', error);
    throw error;
  }
}

/**
 * Exporta lista de trabajos a Excel con XLSX
 */
export async function exportarTrabajosAExcelXLSX(premiseId, filtros = {}) {
  try {
    // Obtener reporte con datos enriquecidos
    const reporte = await obtenerReporteTrabajosAgricolas({
      predio_id: premiseId,
      ...filtros
    });

    // Preparar datos para Excel
    const excelData = reporte.data.map(w => ({
      'Fecha': w.date || '-',
      'Tipo de Trabajo': w.work_type || '-',
      'Lote': w.lots?.name || '-',
      'Hectáreas': w.hectares || 0,
      'Responsable': w.responsible_person || '-',
      'Centro Costo': w.cost_centers ? `${w.cost_centers.code} - ${w.cost_centers.name}` : '-',
      'Estado': w.status || '-',
      'Costo Insumos': w.inputs_cost || 0,
      'Costo Maquinaria': w.machinery_cost || 0,
      'Costo Mano Obra': w.labor_cost || 0,
      'Otros Costos': w.other_costs || 0,
      'Costo Total': w.costo_total || 0,
      'Costo por Ha': w.costo_por_hectarea || 0
    }));

    // Crear workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trabajos');

    // Ajustar anchos de columnas
    worksheet['!cols'] = Array(14).fill({ wch: 16 });

    // Descargar archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `trabajos_agricolas_${fecha}.xlsx`);

    return { success: true, count: reporte.data.length };
  } catch (error) {
    console.error('Error exportando trabajos a Excel:', error);
    throw error;
  }
}

/**
 * Exporta resumen de costos por lote a Excel
 */
export async function exportarCostosPorLoteXLSX(premiseId) {
  try {
    const analisis = await obtenerAnalisisCostosPorLote(premiseId);

    const excelData = analisis.map(lote => ({
      'Lote': lote.lote,
      'Cantidad Trabajos': lote.trabajos,
      'Hectáreas': lote.hectareas.toFixed(2),
      'Costo Insumos': lote.costo_insumos.toFixed(2),
      'Costo Maquinaria': lote.costo_maquinaria.toFixed(2),
      'Costo Mano Obra': lote.costo_labor.toFixed(2),
      'Otros Costos': lote.costo_otros.toFixed(2),
      'Costo Total': lote.costo_total.toFixed(2),
      'Costo por Ha': lote.costo_por_hectarea
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Costos por Lote');

    worksheet['!cols'] = Array(9).fill({ wch: 16 });

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `costos_por_lote_${fecha}.xlsx`);

    return { success: true };
  } catch (error) {
    console.error('Error exportando costos por lote a Excel:', error);
    throw error;
  }
}

/**
 * Exporta comparación de proyecciones vs ejecutado a Excel
 */
export async function exportarComparacionProyeccionesXLSX(premiseId) {
  try {
    const comparacion = await obtenerReporteComparacionProyecciones({
      predio_id: premiseId
    });

    const excelData = [
      ...comparacion.agricola.map(item => ({
        'Tipo': item.tipo,
        'Cultivo/Evento': item.cultivo,
        'Ha/Cant Proyectada': item.hectareas_proyectadas,
        'Ha/Cant Ejecutada': item.hectareas_ejecutadas,
        'Costo Estimado': item.costo_estimado,
        'Costo Real': item.costo_real,
        'Variación (%)': item.varianza_costo,
        'Estado': item.estado
      })),
      ...comparacion.ganadera.map(item => ({
        'Tipo': item.tipo,
        'Cultivo/Evento': item.evento,
        'Ha/Cant Proyectada': item.cantidad_proyectada,
        'Ha/Cant Ejecutada': item.cantidad_ejecutada,
        'Costo Estimado': item.costo_estimado,
        'Costo Real': item.costo_real,
        'Variación (%)': item.varianza_costo,
        'Estado': item.estado
      }))
    ];

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparación');

    worksheet['!cols'] = Array(8).fill({ wch: 18 });

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `comparacion_proyecciones_${fecha}.xlsx`);

    return { success: true, count: comparacion.total_conversiones };
  } catch (error) {
    console.error('Error exportando comparación a Excel:', error);
    throw error;
  }
}
