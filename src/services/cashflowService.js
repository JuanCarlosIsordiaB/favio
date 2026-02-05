/**
 * MÓDULO 11: REPORTES
 * cashflowService.js
 *
 * Análisis de Flujo de Caja (Cashflow)
 * - Ingresos vs Egresos
 * - Flujo neto mensual
 * - Saldo acumulado
 * - Categorización de egresos
 */

import { supabase } from '../lib/supabase';

/**
 * Generar reporte de Cashflow
 * Analiza ingresos reales (collected) vs egresos realizados (executed)
 */
export async function generarCashflow(filtros) {
  try {
    const { premiseId, startDate, endDate, firmId } = filtros;

    // 1. Obtener egresos (órdenes de pago ejecutadas)
    const egresos = await getEgresos(premiseId || firmId, startDate, endDate, 'premise');

    // 2. Obtener ingresos (cobrados)
    const ingresos = await getIngresos(premiseId || firmId, startDate, endDate, 'premise');

    // 3. Agrupar por mes
    const cashflowMensual = agruparPorMes(ingresos, egresos);

    // 4. Calcular saldo acumulado
    const conSaldoAcumulado = calcularSaldoAcumulado(cashflowMensual);

    // 5. Categorizar egresos
    const porCategoria = categorizarEgresos(egresos);

    // 6. Totales
    const totalIngresos = ingresos.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalEgresos = egresos.reduce((sum, i) => sum + (i.amount || 0), 0);
    const flujoNeto = totalIngresos - totalEgresos;

    return {
      periodo: {
        start: startDate,
        end: endDate
      },
      generado_en: new Date().toISOString(),
      resumen: {
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        flujo_neto: flujoNeto,
        saldo_final: conSaldoAcumulado.length > 0
          ? conSaldoAcumulado[conSaldoAcumulado.length - 1].saldo_acumulado
          : 0
      },
      cashflow_mensual: conSaldoAcumulado,
      por_categoria: porCategoria,
      ingresos_items: ingresos,
      egresos_items: egresos
    };
  } catch (error) {
    console.error('Error generating cashflow:', error);
    throw new Error(`Error generando cashflow: ${error.message}`);
  }
}

/**
 * Obtener egresos (gastos aprobados/ejecutados)
 * Usa la tabla 'expenses' que es la fuente común de egresos en el sistema
 */
async function getEgresos(premiseIdOrFirmId, startDate, endDate, type = 'premise') {
  try {
    let query = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .eq('status', 'APPROVED');

    if (type === 'premise' && premiseIdOrFirmId) {
      query = query.eq('premise_id', premiseIdOrFirmId);
    } else if (type === 'firm' && premiseIdOrFirmId) {
      query = query.eq('firm_id', premiseIdOrFirmId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting egresos:', error);
    return [];
  }
}

/**
 * Obtener ingresos (cobrados/aprobados)
 */
async function getIngresos(premiseIdOrFirmId, startDate, endDate, type = 'premise') {
  try {
    let query = supabase
      .from('income')
      .select('*')
      .gte('income_date', startDate)
      .lte('income_date', endDate)
      .eq('status', 'APPROVED');

    if (type === 'premise' && premiseIdOrFirmId) {
      query = query.eq('premise_id', premiseIdOrFirmId);
    } else if (type === 'firm' && premiseIdOrFirmId) {
      query = query.eq('firm_id', premiseIdOrFirmId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting ingresos:', error);
    return [];
  }
}

/**
 * Agrupar ingresos y egresos por mes
 */
function agruparPorMes(ingresos, egresos) {
  const meses = {};

  // Procesar ingresos
  ingresos.forEach(item => {
    const fecha = new Date(item.income_date);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

    if (!meses[mesKey]) {
      meses[mesKey] = {
        mes: mesKey,
        ingresos: 0,
        egresos: 0,
        flujo_neto: 0,
        saldo_acumulado: 0
      };
    }

    meses[mesKey].ingresos += item.amount || 0;
  });

  // Procesar egresos
  egresos.forEach(item => {
    const fecha = new Date(item.expense_date);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

    if (!meses[mesKey]) {
      meses[mesKey] = {
        mes: mesKey,
        ingresos: 0,
        egresos: 0,
        flujo_neto: 0,
        saldo_acumulado: 0
      };
    }

    meses[mesKey].egresos += item.amount || 0;
  });

  // Calcular flujo neto para cada mes
  Object.values(meses).forEach(mes => {
    mes.flujo_neto = mes.ingresos - mes.egresos;
  });

  // Ordenar por mes
  return Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * Calcular saldo acumulado
 */
function calcularSaldoAcumulado(cashflowMensual) {
  let saldoAcumulado = 0;

  return cashflowMensual.map(mes => ({
    ...mes,
    saldo_acumulado: (saldoAcumulado += mes.flujo_neto)
  }));
}

/**
 * Categorizar egresos
 */
function categorizarEgresos(egresos) {
  const categorias = {
    alimentacion: 0,
    sanidad: 0,
    semillas_fertilizantes: 0,
    combustibles: 0,
    mano_obra: 0,
    servicios: 0,
    impuestos: 0,
    otros: 0
  };

  egresos.forEach(egreso => {
    const categoria = egreso.category || 'otros';

    if (['alimento', 'alimentacion', 'comida_animales'].includes(categoria)) {
      categorias.alimentacion += egreso.amount || 0;
    } else if (['sanidad', 'medicinas', 'vacunas', 'veterinario'].includes(categoria)) {
      categorias.sanidad += egreso.amount || 0;
    } else if (['semillas', 'fertilizantes', 'insumos_agricolas'].includes(categoria)) {
      categorias.semillas_fertilizantes += egreso.amount || 0;
    } else if (['combustible', 'gasolina', 'diesel', 'lubricantes'].includes(categoria)) {
      categorias.combustibles += egreso.amount || 0;
    } else if (['salarios', 'jornales', 'mano_obra'].includes(categoria)) {
      categorias.mano_obra += egreso.amount || 0;
    } else if (['servicios', 'electricidad', 'agua', 'telefono'].includes(categoria)) {
      categorias.servicios += egreso.amount || 0;
    } else if (['impuestos', 'contribuciones'].includes(categoria)) {
      categorias.impuestos += egreso.amount || 0;
    } else {
      categorias.otros += egreso.amount || 0;
    }
  });

  // Convertir a array y ordenar por monto descendente
  return Object.entries(categorias)
    .map(([nombre, monto]) => ({
      categoria: nombre,
      monto,
      porcentaje: 0 // Se calcula en el componente
    }))
    .filter(item => item.monto > 0)
    .sort((a, b) => b.monto - a.monto);
}

/**
 * Proyecciones de cashflow (forecast)
 * Basado en promedio mensual
 */
export function proyectarCashflow(cashflowHistorico, mesesProyeccion = 3) {
  if (cashflowHistorico.length === 0) {
    return [];
  }

  // Calcular promedio
  const promedio_ingresos = cashflowHistorico.reduce((sum, m) => sum + m.ingresos, 0) / cashflowHistorico.length;
  const promedio_egresos = cashflowHistorico.reduce((sum, m) => sum + m.egresos, 0) / cashflowHistorico.length;
  const promedio_flujo = promedio_ingresos - promedio_egresos;

  // Últimas fechas
  const ultimoMes = cashflowHistorico[cashflowHistorico.length - 1];
  const ultimaFecha = new Date(ultimoMes.mes + '-01');
  let saldoAcumulado = ultimoMes.saldo_acumulado;

  const proyecciones = [];

  for (let i = 1; i <= mesesProyeccion; i++) {
    const fecha = new Date(ultimaFecha);
    fecha.setMonth(fecha.getMonth() + i);

    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

    const flujoNeto = promedio_flujo;
    saldoAcumulado += flujoNeto;

    proyecciones.push({
      mes: mesKey,
      ingresos: promedio_ingresos,
      egresos: promedio_egresos,
      flujo_neto: flujoNeto,
      saldo_acumulado: saldoAcumulado,
      es_proyeccion: true
    });
  }

  return proyecciones;
}

/**
 * Análisis de tendencias de cashflow
 */
export function analizarTendencias(cashflow) {
  if (cashflow.length < 2) {
    return {
      tendencia: 'NEUTRAL',
      mensaje: 'Datos insuficientes para análisis',
      promedio_primeros: 0,
      promedio_ultimos: 0,
      cambio_porcentaje: 0
    };
  }

  const primeros = cashflow.slice(0, Math.floor(cashflow.length / 2));
  const ultimos = cashflow.slice(Math.floor(cashflow.length / 2));

  const promedioPrimeros = primeros.reduce((sum, m) => sum + m.flujo_neto, 0) / primeros.length;
  const promedioUltimos = ultimos.reduce((sum, m) => sum + m.flujo_neto, 0) / ultimos.length;

  let tendencia = 'NEUTRAL';
  let mensaje = '';

  if (promedioUltimos > promedioPrimeros * 1.1) {
    tendencia = 'POSITIVA';
    mensaje = 'El flujo de caja está mejorando';
  } else if (promedioUltimos < promedioPrimeros * 0.9) {
    tendencia = 'NEGATIVA';
    mensaje = 'El flujo de caja está empeorando';
  } else {
    tendencia = 'ESTABLE';
    mensaje = 'El flujo de caja se mantiene estable';
  }

  return {
    tendencia,
    mensaje,
    promedio_primeros: promedioPrimeros,
    promedio_ultimos: promedioUltimos,
    cambio_porcentaje: ((promedioUltimos - promedioPrimeros) / Math.abs(promedioPrimeros)) * 100
  };
}
