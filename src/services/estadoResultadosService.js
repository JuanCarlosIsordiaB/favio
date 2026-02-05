/**
 * MÓDULO 11: REPORTES
 * estadoResultadosService.js
 *
 * Estado de Resultados (P&L) - Profit & Loss Statement
 * Estructura obligatoria de 7 secciones según requerimientos del cliente
 */

import { supabase } from '../lib/supabase';

/**
 * ESTRUCTURA P&L OBLIGATORIA (7 SECCIONES)
 *
 * 1. INGRESOS
 *    - Ventas principales
 *    - Otros ingresos
 *    = Total Ingresos
 *
 * 2. COSTO DE VENTAS
 *    - Inventario inicial
 *    + Compras
 *    - Inventario final
 *    = Costo de Ventas
 *
 * 3. MARGEN BRUTO = Ingresos - Costo de Ventas
 *
 * 4. GASTOS OPERATIVOS
 *    - Mano de obra
 *    - Combustibles
 *    - Servicios
 *    - Mantenimiento
 *    - Otros gastos operativos
 *    = Total Gastos Operativos
 *
 * 5. RESULTADO OPERATIVO = Margen Bruto - Gastos Operativos
 *
 * 6. GASTOS FINANCIEROS
 *    - Intereses
 *    - Comisiones
 *    = Total Gastos Financieros
 *
 * 7. RESULTADO FINAL = Resultado Operativo - Gastos Financieros
 */

export async function generarEstadoResultados(premiseId, periodo) {
  try {
    // 1. INGRESOS
    const ingresos = await getIngresos(premiseId, periodo);

    // 2. COSTO DE VENTAS
    const costoVentas = await getCostoVentas(premiseId, periodo);

    // 3. MARGEN BRUTO
    const margenBruto = ingresos.total_ingresos - costoVentas.total_costo_ventas;
    const margenBrutoPorcentaje = ingresos.total_ingresos > 0
      ? (margenBruto / ingresos.total_ingresos) * 100
      : 0;

    // 4. GASTOS OPERATIVOS
    const gastosOperativos = await getGastosOperativos(premiseId, periodo);

    // 5. RESULTADO OPERATIVO
    const resultadoOperativo = margenBruto - gastosOperativos.total_gastos_operativos;
    const resultadoOperativoPorcentaje = ingresos.total_ingresos > 0
      ? (resultadoOperativo / ingresos.total_ingresos) * 100
      : 0;

    // 6. GASTOS FINANCIEROS
    const gastosFinancieros = await getGastosFinancieros(premiseId, periodo);

    // 7. RESULTADO FINAL
    const resultadoFinal = resultadoOperativo - gastosFinancieros.total_gastos_financieros;
    const resultadoFinalPorcentaje = ingresos.total_ingresos > 0
      ? (resultadoFinal / ingresos.total_ingresos) * 100
      : 0;

    return {
      periodo,
      generado_en: new Date().toISOString(),
      // Sección 1: Ingresos
      ingresos: {
        ventas_principales: ingresos.ventas_principales,
        otros_ingresos: ingresos.otros_ingresos,
        total_ingresos: ingresos.total_ingresos,
        por_categoria: ingresos.por_categoria
      },
      // Sección 2: Costo de Ventas
      costo_ventas: {
        inventario_inicial: costoVentas.inventario_inicial,
        compras: costoVentas.compras,
        inventario_final: costoVentas.inventario_final,
        total_costo_ventas: costoVentas.total_costo_ventas
      },
      // Sección 3: Margen Bruto
      margen_bruto: {
        valor: margenBruto,
        porcentaje: margenBrutoPorcentaje
      },
      // Sección 4: Gastos Operativos
      gastos_operativos: {
        mano_obra: gastosOperativos.mano_obra,
        combustibles: gastosOperativos.combustibles,
        servicios: gastosOperativos.servicios,
        mantenimiento: gastosOperativos.mantenimiento,
        otros_operativos: gastosOperativos.otros_operativos,
        total_gastos_operativos: gastosOperativos.total_gastos_operativos,
        por_categoria: gastosOperativos.por_categoria
      },
      // Sección 5: Resultado Operativo
      resultado_operativo: {
        valor: resultadoOperativo,
        porcentaje: resultadoOperativoPorcentaje
      },
      // Sección 6: Gastos Financieros
      gastos_financieros: {
        intereses: gastosFinancieros.intereses,
        comisiones: gastosFinancieros.comisiones,
        total_gastos_financieros: gastosFinancieros.total_gastos_financieros
      },
      // Sección 7: Resultado Final
      resultado_final: {
        valor: resultadoFinal,
        porcentaje: resultadoFinalPorcentaje,
        estado: resultadoFinal >= 0 ? 'GANANCIA' : 'PÉRDIDA'
      }
    };
  } catch (error) {
    console.error('Error generating estado resultados:', error);
    throw new Error(`Error generando estado de resultados: ${error.message}`);
  }
}

/**
 * Sección 1: INGRESOS
 */
async function getIngresos(premiseId, periodo) {
  try {
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('premise_id', premiseId)
      .gte('income_date', periodo.start)
      .lte('income_date', periodo.end)
      .eq('status', 'APPROVED');

    if (error) throw error;

    const items = data || [];

    // Clasificar ingresos
    const ventasCategories = ['venta_granos', 'venta_carne', 'venta_ganado', 'venta_animales', 'venta_produccion'];
    const ventasPrincipales = items
      .filter(i => ventasCategories.includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const otrosIngresos = items
      .filter(i => !ventasCategories.includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    // Por categoría
    const porCategoria = {};
    items.forEach(item => {
      if (!porCategoria[item.category]) {
        porCategoria[item.category] = 0;
      }
      porCategoria[item.category] += item.amount || 0;
    });

    return {
      ventas_principales: ventasPrincipales,
      otros_ingresos: otrosIngresos,
      total_ingresos: ventasPrincipales + otrosIngresos,
      por_categoria: porCategoria,
      items: items.length
    };
  } catch (error) {
    console.error('Error getting ingresos:', error);
    return {
      ventas_principales: 0,
      otros_ingresos: 0,
      total_ingresos: 0,
      por_categoria: {},
      items: 0,
      error: error.message
    };
  }
}

/**
 * Sección 2: COSTO DE VENTAS
 * Fórmula: Inventario Inicial + Compras - Inventario Final
 */
async function getCostoVentas(premiseId, periodo) {
  try {
    // Inventario inicial
    const { data: invInicial } = await supabase
      .from('inventory_valuations')
      .select('total_kg, total_valor')
      .eq('premise_id', premiseId)
      .eq('valuation_type', 'INITIAL')
      .lte('valuation_date', periodo.start)
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    const inventario_inicial = invInicial?.total_valor || 0;

    // Compras
    const { data: compras } = await supabase
      .from('expenses')
      .select('*')
      .eq('premise_id', premiseId)
      .gte('expense_date', periodo.start)
      .lte('expense_date', periodo.end)
      .in('category', ['compra_granos', 'compra_carne', 'compra_ganado', 'compra_animales', 'compra_insumos'])
      .eq('status', 'APPROVED');

    const comprasTotal = (compras || []).reduce((sum, i) => sum + (i.amount || 0), 0);

    // Inventario final
    const { data: invFinal } = await supabase
      .from('inventory_valuations')
      .select('total_kg, total_valor')
      .eq('premise_id', premiseId)
      .eq('valuation_type', 'FINAL')
      .lte('valuation_date', periodo.end)
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    const inventario_final = invFinal?.total_valor || 0;

    // Costo de Ventas = Inv. Inicial + Compras - Inv. Final
    const total_costo_ventas = inventario_inicial + comprasTotal - inventario_final;

    return {
      inventario_inicial,
      compras: comprasTotal,
      inventario_final,
      total_costo_ventas
    };
  } catch (error) {
    console.error('Error getting costo ventas:', error);
    return {
      inventario_inicial: 0,
      compras: 0,
      inventario_final: 0,
      total_costo_ventas: 0,
      error: error.message
    };
  }
}

/**
 * Sección 4: GASTOS OPERATIVOS
 */
async function getGastosOperativos(premiseId, periodo) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('premise_id', premiseId)
      .gte('expense_date', periodo.start)
      .lte('expense_date', periodo.end)
      .eq('status', 'APPROVED');

    if (error) throw error;

    const items = data || [];

    // Categorías operativas
    const mano_obra = items
      .filter(i => ['salarios', 'jornales', 'mano_obra'].includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const combustibles = items
      .filter(i => ['combustible', 'gasolina', 'diesel', 'lubricantes'].includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const servicios = items
      .filter(i => ['servicios', 'electricidad', 'agua', 'telefono', 'internet'].includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const mantenimiento = items
      .filter(i => ['mantenimiento', 'reparaciones', 'herramientas'].includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    // Otros operativos (excluyendo compras y financieros)
    const compraCategories = ['compra_granos', 'compra_carne', 'compra_ganado', 'compra_animales', 'compra_insumos'];
    const financieroCategories = ['intereses', 'comisiones', 'impuestos'];
    const otros_operativos = items
      .filter(i =>
        !compraCategories.includes(i.category) &&
        !financieroCategories.includes(i.category) &&
        !['salarios', 'jornales', 'mano_obra'].includes(i.category) &&
        !['combustible', 'gasolina', 'diesel', 'lubricantes'].includes(i.category) &&
        !['servicios', 'electricidad', 'agua', 'telefono', 'internet'].includes(i.category) &&
        !['mantenimiento', 'reparaciones', 'herramientas'].includes(i.category)
      )
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    // Por categoría
    const porCategoria = {};
    items
      .filter(i =>
        !compraCategories.includes(i.category) &&
        !financieroCategories.includes(i.category)
      )
      .forEach(item => {
        if (!porCategoria[item.category]) {
          porCategoria[item.category] = 0;
        }
        porCategoria[item.category] += item.amount || 0;
      });

    const total_gastos_operativos = mano_obra + combustibles + servicios + mantenimiento + otros_operativos;

    return {
      mano_obra,
      combustibles,
      servicios,
      mantenimiento,
      otros_operativos,
      total_gastos_operativos,
      por_categoria: porCategoria
    };
  } catch (error) {
    console.error('Error getting gastos operativos:', error);
    return {
      mano_obra: 0,
      combustibles: 0,
      servicios: 0,
      mantenimiento: 0,
      otros_operativos: 0,
      total_gastos_operativos: 0,
      por_categoria: {},
      error: error.message
    };
  }
}

/**
 * Sección 6: GASTOS FINANCIEROS
 */
async function getGastosFinancieros(premiseId, periodo) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('premise_id', premiseId)
      .gte('expense_date', periodo.start)
      .lte('expense_date', periodo.end)
      .in('category', ['intereses', 'comisiones', 'impuestos'])
      .eq('status', 'APPROVED');

    if (error) throw error;

    const items = data || [];

    const intereses = items
      .filter(i => ['intereses'].includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const comisiones = items
      .filter(i => ['comisiones', 'impuestos'].includes(i.category))
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    return {
      intereses,
      comisiones,
      total_gastos_financieros: intereses + comisiones
    };
  } catch (error) {
    console.error('Error getting gastos financieros:', error);
    return {
      intereses: 0,
      comisiones: 0,
      total_gastos_financieros: 0,
      error: error.message
    };
  }
}

/**
 * Comparación de múltiples períodos
 */
export async function compararEstadosResultados(premiseId, periodos) {
  try {
    const resultados = [];

    for (const periodo of periodos) {
      const resultado = await generarEstadoResultados(premiseId, periodo);
      resultados.push(resultado);
    }

    return resultados;
  } catch (error) {
    console.error('Error comparing estados resultados:', error);
    throw new Error(`Error comparando estados: ${error.message}`);
  }
}
