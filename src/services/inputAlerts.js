/**
 * Servicios de alertas automáticas para insumos
 * Gestiona alertas de vencimiento y stock mínimo
 * Sincronizado con SCHEMA.sql tabla: alerts
 */

import { supabase } from '../lib/supabase';

/**
 * Crea una alerta de vencimiento próximo
 * @param {Object} alertData - Datos de la alerta
 * @returns {Promise<Object>} Alerta creada
 */
export async function crearAlertaVencimiento(alertData) {
  try {
    if (!alertData.firm_id) throw new Error('firm_id es requerido');
    if (!alertData.input_id) throw new Error('input_id es requerido');

    const { data, error } = await supabase
      .from('alerts')
      .insert([
        {
          firm_id: alertData.firm_id,
          premise_id: alertData.premise_id || null,
          lot_id: alertData.depot_id,  // Apunta al lote que funciona como depósito del insumo
          title: `⚠️ Vencimiento próximo: ${alertData.insumo_nombre}`,
          description: `El insumo "${alertData.insumo_nombre}" vence el ${alertData.expiration_date}`,
          alert_type: 'warning',
          alert_date: new Date().toISOString().split('T')[0],
          priority: 'high',
          status: 'pending',
          origen: 'automatica',
          regla_aplicada: 'VENCIMIENTO_30_DIAS',
          metadata: {
            insumo_id: alertData.input_id,
            insumo_nombre: alertData.insumo_nombre,
            fecha_vencimiento: alertData.expiration_date,
            dias_para_vencimiento: alertData.dias_para_vencimiento
          }
        }
      ])
      .select()
      .single();

    if (error) {
      // Si es error de constraint unique (23505), significa que la alerta ya existe
      if (error.code === '23505') {
        console.warn('⚠️ Alerta de vencimiento ya existe para este insumo, ignorando...');
        // Retornar null para indicar que ya existe
        return null;
      }
      console.error('Error al crear alerta vencimiento:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en crearAlertaVencimiento:', error);
    throw error;
  }
}

/**
 * Crea una alerta de stock mínimo
 * @param {Object} alertData - Datos de la alerta
 * @returns {Promise<Object>} Alerta creada
 */
export async function crearAlertaStockMinimo(alertData) {
  try {
    if (!alertData.firm_id) throw new Error('firm_id es requerido');
    if (!alertData.input_id) throw new Error('input_id es requerido');

    const { data, error } = await supabase
      .from('alerts')
      .insert([
        {
          firm_id: alertData.firm_id,
          premise_id: alertData.premise_id || null,
          lot_id: alertData.depot_id,  // Apunta al lote que funciona como depósito del insumo
          title: `📦 Stock bajo: ${alertData.insumo_nombre}`,
          description: `El insumo "${alertData.insumo_nombre}" alcanzó stock mínimo. Stock actual: ${alertData.stock_actual} (Mínimo: ${alertData.stock_minimo})`,
          alert_type: 'alert',
          alert_date: new Date().toISOString().split('T')[0],
          priority: 'medium',
          status: 'pending',
          origen: 'automatica',
          regla_aplicada: 'STOCK_MINIMO',
          metadata: {
            insumo_id: alertData.input_id,
            insumo_nombre: alertData.insumo_nombre,
            stock_actual: alertData.stock_actual,
            stock_minimo: alertData.stock_minimo,
            unidad: alertData.unidad
          }
        }
      ])
      .select()
      .single();

    if (error) {
      // Si es error de constraint unique (23505), significa que la alerta ya existe
      if (error.code === '23505') {
        console.warn('⚠️ Alerta de stock mínimo ya existe para este insumo, ignorando...');
        // Retornar null para indicar que ya existe
        return null;
      }
      console.error('Error al crear alerta stock mínimo:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en crearAlertaStockMinimo:', error);
    throw error;
  }
}

/**
 * Verifica y crea alertas para un insumo específico
 * @param {string} insumoId - ID del insumo
 * @param {string} firmId - ID de la firma
 * @param {Object} insumo - Datos del insumo
 * @returns {Promise<Object>} { alertas_creadas: number, alertas: [] }
 */
export async function verificarAlertasInsumo(insumoId, firmId, insumo) {
  try {
    if (!insumoId) throw new Error('insumoId es requerido');
    if (!firmId) throw new Error('firmId es requerido');

    const alertasCreadas = [];

    // 1. Verificar vencimiento próximo (30 días)
    if (insumo.expiration_date) {
      const fechaVenc = new Date(insumo.expiration_date);
      const hoy = new Date();
      const diasParaVencer = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

      if (diasParaVencer <= 30 && diasParaVencer > 0) {
        // Verificar si ya existe alerta activa
        const { data: alertasExistentes } = await supabase
          .from('alerts')
          .select('id')
          .eq('firm_id', firmId)
          .eq('lot_id', insumo.depot_id)
          .eq('regla_aplicada', 'VENCIMIENTO_30_DIAS')
          .eq('status', 'pending');

        if (!alertasExistentes || alertasExistentes.length === 0) {
          const alerta = await crearAlertaVencimiento({
            firm_id: firmId,
            input_id: insumoId,
            depot_id: insumo.depot_id,
            insumo_nombre: insumo.name,
            expiration_date: insumo.expiration_date,
            dias_para_vencimiento: diasParaVencer
          });
          // Solo agregar si no es null (null = ya existe)
          if (alerta) {
            alertasCreadas.push(alerta);
          }
        }
      } else if (diasParaVencer <= 0) {
        // Alerta de vencido
        const { data: alertasExistentes } = await supabase
          .from('alerts')
          .select('id')
          .eq('firm_id', firmId)
          .eq('lot_id', insumo.depot_id)
          .eq('regla_aplicada', 'VENCIMIENTO_VENCIDO')
          .eq('status', 'pending');

        if (!alertasExistentes || alertasExistentes.length === 0) {
          const { data, error } = await supabase
            .from('alerts')
            .insert([
              {
                firm_id: firmId,
                lot_id: insumo.depot_id,
                title: `🚫 VENCIDO: ${insumo.name}`,
                description: `El insumo "${insumo.name}" está vencido desde ${insumo.expiration_date}`,
                alert_type: 'alert',
                alert_date: new Date().toISOString().split('T')[0],
                priority: 'high',
                status: 'pending',
                origen: 'automatica',
                regla_aplicada: 'VENCIMIENTO_VENCIDO',
                metadata: {
                  insumo_id: insumoId,
                  insumo_nombre: insumo.name,
                  fecha_vencimiento: insumo.expiration_date
                }
              }
            ])
            .select()
            .single();

          if (error) {
            // Si es error de constraint unique (23505), ya existe
            if (error.code === '23505') {
              console.warn('⚠️ Alerta de vencimiento vencido ya existe, ignorando...');
            } else {
              console.error('Error al crear alerta vencido:', error);
            }
          } else if (data) {
            alertasCreadas.push(data);
          }
        }
      }
    }

    // 2. Verificar stock mínimo
    if (insumo.min_stock_alert > 0 && insumo.current_stock <= insumo.min_stock_alert) {
      const { data: alertasExistentes } = await supabase
        .from('alerts')
        .select('id')
        .eq('firm_id', firmId)
        .eq('lot_id', insumo.depot_id)
        .eq('regla_aplicada', 'STOCK_MINIMO')
        .eq('status', 'pending');

      if (!alertasExistentes || alertasExistentes.length === 0) {
        const alerta = await crearAlertaStockMinimo({
          firm_id: firmId,
          input_id: insumoId,
          depot_id: insumo.depot_id,
          insumo_nombre: insumo.name,
          stock_actual: insumo.current_stock,
          stock_minimo: insumo.min_stock_alert,
          unidad: insumo.unit
        });
        // Solo agregar si no es null (null = ya existe)
        if (alerta) {
          alertasCreadas.push(alerta);
        }
      }
    }

    return {
      alertas_creadas: alertasCreadas.length,
      alertas: alertasCreadas
    };
  } catch (error) {
    console.error('Error en verificarAlertasInsumo:', error);
    throw error;
  }
}

/**
 * Verifica alertas para todos los insumos de una firma
 * @param {string} firmId - ID de la firma
 * @param {Array} insumos - Lista de insumos
 * @returns {Promise<Object>} { total_alertas: number, insumos_con_alerta: [] }
 */
export async function verificarAlertasGenerales(firmId, insumos) {
  try {
    if (!firmId) throw new Error('firmId es requerido');
    if (!Array.isArray(insumos)) throw new Error('insumos debe ser un array');

    let totalAlertas = 0;
    const insumosConAlerta = [];

    for (const insumo of insumos) {
      const resultado = await verificarAlertasInsumo(insumo.id, firmId, insumo);
      if (resultado.alertas_creadas > 0) {
        totalAlertas += resultado.alertas_creadas;
        insumosConAlerta.push({
          insumo_id: insumo.id,
          insumo_nombre: insumo.name,
          alertas: resultado.alertas
        });
      }
    }

    return {
      total_alertas: totalAlertas,
      insumos_con_alerta: insumosConAlerta,
      fecha_verificacion: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en verificarAlertasGenerales:', error);
    throw error;
  }
}

/**
 * Obtiene todas las alertas activas de una firma
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Alerta[], count: number }
 */
export async function obtenerAlertasActivas(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const { data, count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .eq('firm_id', firmId)
      .eq('status', 'pending')
      .order('alert_date', { ascending: false });

    if (error) {
      console.error('Error al obtener alertas activas:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error('Error en obtenerAlertasActivas:', error);
    throw error;
  }
}

/**
 * Obtiene alertas de vencimiento
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Alerta[], count: number }
 */
export async function obtenerAlertasVencimiento(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const { data, count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .eq('firm_id', firmId)
      .in('regla_aplicada', ['VENCIMIENTO_30_DIAS', 'VENCIMIENTO_VENCIDO'])
      .eq('status', 'pending')
      .order('alert_date', { ascending: false });

    if (error) {
      console.error('Error al obtener alertas vencimiento:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error('Error en obtenerAlertasVencimiento:', error);
    throw error;
  }
}

/**
 * Obtiene alertas de stock mínimo
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} { data: Alerta[], count: number }
 */
export async function obtenerAlertasStockMinimo(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const { data, count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .eq('firm_id', firmId)
      .eq('regla_aplicada', 'STOCK_MINIMO')
      .eq('status', 'pending')
      .order('alert_date', { ascending: false });

    if (error) {
      console.error('Error al obtener alertas stock:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error('Error en obtenerAlertasStockMinimo:', error);
    throw error;
  }
}

/**
 * Resuelve una alerta (marca como completada)
 * @param {string} alertaId - ID de la alerta
 * @returns {Promise<Object>} Alerta actualizada
 */
export async function resolverAlerta(alertaId) {
  try {
    if (!alertaId) throw new Error('alertaId es requerido');

    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'completed' })
      .eq('id', alertaId)
      .select()
      .single();

    if (error) {
      console.error('Error al resolver alerta:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en resolverAlerta:', error);
    throw error;
  }
}

/**
 * Resuelve todas las alertas de un insumo
 * @param {string} firmId - ID de la firma
 * @param {string} depotId - ID del depósito (lote con is_depot=true) donde está el insumo
 * @returns {Promise<Object>} { alertas_resueltas: number }
 */
export async function resolverAlertasInsumo(firmId, depotId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');
    if (!depotId) throw new Error('depotId es requerido');

    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'completed' })
      .eq('firm_id', firmId)
      .eq('lot_id', depotId)
      .select();

    if (error) {
      console.error('Error al resolver alertas insumo:', error);
      throw error;
    }

    return {
      alertas_resueltas: (data || []).length
    };
  } catch (error) {
    console.error('Error en resolverAlertasInsumo:', error);
    throw error;
  }
}

/**
 * Cancela una alerta (no se resolvió, solo se ignora)
 * @param {string} alertaId - ID de la alerta
 * @returns {Promise<Object>} Alerta actualizada
 */
export async function cancelarAlerta(alertaId) {
  try {
    if (!alertaId) throw new Error('alertaId es requerido');

    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'cancelled' })
      .eq('id', alertaId)
      .select()
      .single();

    if (error) {
      console.error('Error al cancelar alerta:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en cancelarAlerta:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de alertas
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Estadísticas de alertas
 */
export async function obtenerEstadisticasAlertas(firmId) {
  try {
    if (!firmId) throw new Error('firmId es requerido');

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmId);

    if (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }

    const alertas = data || [];
    const pendientes = alertas.filter(a => a.status === 'pending').length;
    const completadas = alertas.filter(a => a.status === 'completed').length;
    const canceladas = alertas.filter(a => a.status === 'cancelled').length;
    const vencimiento = alertas.filter(a =>
      a.status === 'pending' && a.regla_aplicada?.includes('VENCIMIENTO')
    ).length;
    const stockMinimo = alertas.filter(a =>
      a.status === 'pending' && a.regla_aplicada === 'STOCK_MINIMO'
    ).length;

    return {
      total: alertas.length,
      pendientes,
      completadas,
      canceladas,
      por_tipo: {
        vencimiento,
        stock_minimo: stockMinimo
      },
      por_prioridad: {
        low: alertas.filter(a => a.priority === 'low').length,
        medium: alertas.filter(a => a.priority === 'medium').length,
        high: alertas.filter(a => a.priority === 'high').length
      },
      fecha_calculo: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en obtenerEstadisticasAlertas:', error);
    throw error;
  }
}
