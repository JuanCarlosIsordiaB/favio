/**
 * MÓDULO 11: REPORTES
 * produccionCarneService.js
 *
 * Cálculos de producción y carga animal
 * - Fórmula obligatoria de producción de carne
 * - Carga animal en kg/ha
 * - Desglose por categoría
 */

import { supabase } from '../lib/supabase';

/**
 * FÓRMULA OBLIGATORIA DE PRODUCCIÓN DE CARNE
 *
 * Producción (kg) = Inv.Final − Inv.Inicial + Ventas − Compras ± Traspasos
 *
 * Donde:
 * - Inv.Final: Inventario final valorizado (kg)
 * - Inv.Inicial: Inventario inicial valorizado (kg)
 * - Ventas: Kg vendidos
 * - Compras: Kg comprados
 * - Traspasos: Kg trasladados (entradas - salidas)
 */

export async function calcularProduccionCarne(premiseId, periodo) {
  try {
    // 1. Get initial inventory (at start_date)
    const inventarioInicial = await getInventarioInicial(premiseId, periodo.start);

    // 2. Get final inventory (at end_date)
    const inventarioFinal = await getInventarioFinal(premiseId, periodo.end);

    // 3. Get sales (ventas - ingresos por venta de carne)
    const ventas = await getVentasCarne(premiseId, periodo);

    // 4. Get purchases (compras - gastos de compra de animales)
    const compras = await getComprasCarne(premiseId, periodo);

    // 5. Get transfers (traspasos entre predios)
    const traspasos = await getTraspasosCarne(premiseId, periodo);

    // APPLY FORMULA: Producción = Final - Inicial + Ventas - Compras + (Entradas - Salidas)
    const produccion_kg =
      inventarioFinal.total_kg -
      inventarioInicial.total_kg +
      ventas.total_kg -
      compras.total_kg +
      (traspasos.entradas_kg - traspasos.salidas_kg);

    // Desglose por categoría (si está disponible)
    const desglosePorCategoria = await getDesgloceProduccionPorCategoria(
      premiseId,
      periodo,
      inventarioInicial,
      inventarioFinal
    );

    return {
      formula: 'Inv.Final − Inv.Inicial + Ventas − Compras ± Traspasos',
      periodo,
      inventario_inicial: inventarioInicial,
      inventario_final: inventarioFinal,
      ventas,
      compras,
      traspasos,
      produccion_kg,
      produccion_kg_redondeado: Math.round(produccion_kg * 100) / 100,
      desglose_por_categoria: desglosePorCategoria,
      calculado_en: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating produccion carne:', error);
    throw new Error(`Error calculando producción de carne: ${error.message}`);
  }
}

/**
 * Carga Animal = Peso total de animales / Área en hectáreas
 * Unidad: kg/ha
 */
export async function calcularCargaAnimal(premiseId, fecha = null) {
  try {
    const fechaConsulta = fecha ? new Date(fecha) : new Date();

    // 1. Get active animals with category JOIN
    const { data: animals, error: animalsError } = await supabase
      .from('animals')
      .select('id, initial_weight, status, current_category:current_category_id(name), herd_events(*)')
      .eq('premise_id', premiseId)
      .eq('status', 'ACTIVE');

    if (animalsError) throw animalsError;

    if (!animals || animals.length === 0) {
      return {
        fecha: fechaConsulta.toISOString().split('T')[0],
        peso_total_kg: 0,
        carga_kg_ha: 0,
        por_categoria: {},
        animales_activos: 0,
        hectareas: 0,
        mensaje: 'No hay animales activos'
      };
    }

    // 2. Get premise area
    const { data: premise, error: premiseError } = await supabase
      .from('premises')
      .select('total_area')
      .eq('id', premiseId)
      .single();

    if (premiseError) throw premiseError;

    const hectareas = premise?.total_area || 0;

    // 3. Calculate total weight by category
    const porCategoria = {};
    let pesoTotal = 0;

    animals.forEach((animal) => {
      const categoria = animal.current_category?.name || 'Sin categoría';

      // Get latest weight from herd_events or use initial_weight
      let peso = animal.initial_weight || 0;
      if (animal.herd_events && animal.herd_events.length > 0) {
        // Sort by date descending and get the first (most recent)
        const sorted = animal.herd_events.sort(
          (a, b) => new Date(b.event_date) - new Date(a.event_date)
        );
        peso = sorted[0].weight_kg || peso;
      }

      if (!porCategoria[categoria]) {
        porCategoria[categoria] = {
          categoria,
          cabezas: 0,
          peso_total_kg: 0,
          peso_promedio_kg: 0
        };
      }

      porCategoria[categoria].cabezas += 1;
      porCategoria[categoria].peso_total_kg += peso;
      pesoTotal += peso;
    });

    // Calculate average weight per category
    Object.keys(porCategoria).forEach((cat) => {
      porCategoria[cat].peso_promedio_kg =
        porCategoria[cat].peso_total_kg / porCategoria[cat].cabezas;
    });

    // 4. Calculate load (kg/ha)
    const carga_kg_ha = hectareas > 0 ? pesoTotal / hectareas : 0;

    // 5. Check if overloaded (benchmark: 500 kg/ha para ganadería extensiva)
    const umbral_kg_ha = 500;
    const estaSobrecargado = carga_kg_ha > umbral_kg_ha;

    return {
      fecha: fechaConsulta.toISOString().split('T')[0],
      peso_total_kg: Math.round(pesoTotal * 100) / 100,
      hectareas,
      carga_kg_ha: Math.round(carga_kg_ha * 100) / 100,
      animales_activos: animals.length,
      por_categoria: porCategoria,
      umbral_kg_ha,
      esta_sobrecargado: estaSobrecargado,
      indicador: estaSobrecargado ? 'SOBRECARGADO' : 'NORMAL',
      calculado_en: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating carga animal:', error);
    throw new Error(`Error calculando carga animal: ${error.message}`);
  }
}

/**
 * Get inventory at specific date
 */
async function getInventarioInicial(premiseId, fecha) {
  try {
    const { data, error } = await supabase
      .from('inventory_valuations')
      .select('*')
      .eq('premise_id', premiseId)
      .eq('valuation_type', 'INITIAL')
      .lte('valuation_date', fecha)
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    if (!data) {
      return {
        tipo: 'INITIAL',
        fecha,
        total_kg: 0,
        total_valor: 0,
        por_categoria: {},
        calculado: false
      };
    }

    return {
      tipo: 'INITIAL',
      fecha: data.valuation_date,
      total_kg: data.total_kg || 0,
      total_valor: data.total_valor || 0,
      por_categoria: data.details || {},
      metodo: data.valuation_method,
      calculado: true
    };
  } catch (error) {
    console.error('Error getting initial inventory:', error);
    return {
      tipo: 'INITIAL',
      fecha,
      total_kg: 0,
      total_valor: 0,
      por_categoria: {},
      error: error.message
    };
  }
}

async function getInventarioFinal(premiseId, fecha) {
  try {
    const { data, error } = await supabase
      .from('inventory_valuations')
      .select('*')
      .eq('premise_id', premiseId)
      .eq('valuation_type', 'FINAL')
      .lte('valuation_date', fecha)
      .order('valuation_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return {
        tipo: 'FINAL',
        fecha,
        total_kg: 0,
        total_valor: 0,
        por_categoria: {},
        calculado: false
      };
    }

    return {
      tipo: 'FINAL',
      fecha: data.valuation_date,
      total_kg: data.total_kg || 0,
      total_valor: data.total_valor || 0,
      por_categoria: data.details || {},
      metodo: data.valuation_method,
      calculado: true
    };
  } catch (error) {
    console.error('Error getting final inventory:', error);
    return {
      tipo: 'FINAL',
      fecha,
      total_kg: 0,
      total_valor: 0,
      por_categoria: {},
      error: error.message
    };
  }
}

/**
 * Get sales (income from livestock sales)
 */
async function getVentasCarne(premiseId, periodo) {
  try {
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('premise_id', premiseId)
      .gte('income_date', periodo.start)
      .lte('income_date', periodo.end)
      .in('category', ['venta_carne', 'venta_ganado', 'venta_animales'])
      .eq('status', 'APPROVED');

    if (error) throw error;

    const total_kg = (data || []).reduce((sum, item) => {
      // Assuming there's a quantity field in kg or we use a conversion
      return sum + (item.quantity_kg || 0);
    }, 0);

    const total_monto = (data || []).reduce((sum, item) => sum + (item.amount || 0), 0);

    return {
      tipo: 'VENTAS',
      periodo,
      total_kg,
      total_monto,
      items: (data || []).length,
      detalles: data || []
    };
  } catch (error) {
    console.error('Error getting sales:', error);
    return {
      tipo: 'VENTAS',
      periodo,
      total_kg: 0,
      total_monto: 0,
      items: 0,
      detalles: [],
      error: error.message
    };
  }
}

/**
 * Get purchases (expenses for buying animals)
 */
async function getComprasCarne(premiseId, periodo) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('premise_id', premiseId)
      .gte('expense_date', periodo.start)
      .lte('expense_date', periodo.end)
      .in('category', ['compra_carne', 'compra_ganado', 'compra_animales'])
      .eq('status', 'APPROVED');

    if (error) throw error;

    const total_kg = (data || []).reduce((sum, item) => {
      return sum + (item.quantity_kg || 0);
    }, 0);

    const total_monto = (data || []).reduce((sum, item) => sum + (item.amount || 0), 0);

    return {
      tipo: 'COMPRAS',
      periodo,
      total_kg,
      total_monto,
      items: (data || []).length,
      detalles: data || []
    };
  } catch (error) {
    console.error('Error getting purchases:', error);
    return {
      tipo: 'COMPRAS',
      periodo,
      total_kg: 0,
      total_monto: 0,
      items: 0,
      detalles: [],
      error: error.message
    };
  }
}

/**
 * Get transfers between premises
 */
async function getTraspasosCarne(premiseId, periodo) {
  try {
    // Get outgoing transfers (salidas)
    const { data: salidas, error: salidError } = await supabase
      .from('herd_events')
      .select('*')
      .eq('premise_id', premiseId)
      .eq('event_type', 'TRANSFER_OUT')
      .gte('event_date', periodo.start)
      .lte('event_date', periodo.end);

    if (salidError) throw salidError;

    // Get incoming transfers (entradas)
    const { data: entradas, error: entradError } = await supabase
      .from('herd_events')
      .select('*')
      .eq('premise_id', premiseId)
      .eq('event_type', 'TRANSFER_IN')
      .gte('event_date', periodo.start)
      .lte('event_date', periodo.end);

    if (entradError) throw entradError;

    const salidas_kg = (salidas || []).reduce((sum, item) => sum + (item.weight_kg || 0), 0);
    const entradas_kg = (entradas || []).reduce((sum, item) => sum + (item.weight_kg || 0), 0);

    return {
      tipo: 'TRASPASOS',
      periodo,
      entradas_kg,
      salidas_kg,
      neto_kg: entradas_kg - salidas_kg,
      entradas_count: (entradas || []).length,
      salidas_count: (salidas || []).length
    };
  } catch (error) {
    console.error('Error getting transfers:', error);
    return {
      tipo: 'TRASPASOS',
      periodo,
      entradas_kg: 0,
      salidas_kg: 0,
      neto_kg: 0,
      entradas_count: 0,
      salidas_count: 0,
      error: error.message
    };
  }
}

/**
 * Get production breakdown by category
 */
async function getDesgloceProduccionPorCategoria(premiseId, periodo, invInicial, invFinal) {
  try {
    // Get all animals grouped by category with JOIN
    const { data: animals, error } = await supabase
      .from('animals')
      .select('current_category:current_category_id(name)')
      .eq('premise_id', premiseId);

    if (error) throw error;

    const categorias = {};
    (animals || []).forEach((animal) => {
      const cat = animal.current_category?.name || 'Sin categoría';
      if (!categorias[cat]) {
        categorias[cat] = {
          categoria: cat,
          inv_inicial_kg: invInicial.por_categoria?.[cat]?.total_kg || 0,
          inv_final_kg: invFinal.por_categoria?.[cat]?.total_kg || 0,
          produccion_kg: 0
        };
      }
      categorias[cat].produccion_kg =
        categorias[cat].inv_final_kg - categorias[cat].inv_inicial_kg;
    });

    return categorias;
  } catch (error) {
    console.error('Error getting desglose:', error);
    return {};
  }
}

/**
 * Obtener histórico de carga animal (para gráficos)
 */
export async function getHistoricoCargaAnimal(premiseId, fechaInicio, fechaFin) {
  try {
    const { data: premise } = await supabase
      .from('premises')
      .select('total_area')
      .eq('id', premiseId)
      .single();

    const hectareas = premise?.total_area || 0;

    // Get monthly snapshots from animals table
    const { data: animals } = await supabase
      .from('animals')
      .select('*, herd_events(*)')
      .eq('premise_id', premiseId)
      .eq('status', 'ACTIVE');

    if (!animals || animals.length === 0) {
      return [];
    }

    // Group events by month
    const porMes = {};

    animals.forEach((animal) => {
      if (animal.herd_events) {
        animal.herd_events.forEach((event) => {
          const fecha = new Date(event.event_date);
          const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

          if (!porMes[mes]) {
            porMes[mes] = {
              mes,
              peso_total_kg: 0,
              cabezas: 0
            };
          }

          porMes[mes].peso_total_kg += event.weight_kg || 0;
        });
      }
    });

    // Add initial weight for animals
    animals.forEach((animal) => {
      const mesInicial = `${new Date(animal.created_at).getFullYear()}-${String(
        new Date(animal.created_at).getMonth() + 1
      ).padStart(2, '0')}`;

      if (!porMes[mesInicial]) {
        porMes[mesInicial] = {
          mes: mesInicial,
          peso_total_kg: 0,
          cabezas: 0
        };
      }

      porMes[mesInicial].peso_total_kg += animal.initial_weight || 0;
      porMes[mesInicial].cabezas += 1;
    });

    // Calculate kg/ha for each month
    const historico = Object.values(porMes)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((item) => ({
        ...item,
        carga_kg_ha: hectareas > 0 ? item.peso_total_kg / hectareas : 0,
        carga_kg_ha_redondeada: Math.round((hectareas > 0 ? item.peso_total_kg / hectareas : 0) * 100) / 100
      }));

    return historico;
  } catch (error) {
    console.error('Error getting historico carga animal:', error);
    return [];
  }
}
