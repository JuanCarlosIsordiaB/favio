import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

// ==================== ÓRDENES DE SERVICIO ====================

export async function obtenerOrdenesServicio(firmId, filters = {}) {
  let query = supabase
    .from('machinery_service_orders')
    .select(`
      *,
      machinery:machinery(id, name, type, code),
      operator:personnel(id, full_name, cost_per_hour),
      premise:premises(id, name),
      lot:lots(id, name),
      cost_center:cost_centers(id, name)
    `)
    .eq('firm_id', firmId);

  if (filters.machineryId) {
    query = query.eq('machinery_id', filters.machineryId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.clientType) {
    query = query.eq('client_type', filters.clientType);
  }

  if (filters.dateFrom) {
    query = query.gte('order_date', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('order_date', filters.dateTo);
  }

  query = query.order('order_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return { data };
}

export async function crearOrdenServicio(orderData) {
  const { data, error } = await supabase
    .from('machinery_service_orders')
    .insert([{
      ...orderData,
      created_by: orderData.currentUser || 'sistema'
    }])
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId: orderData.firm_id,
    tipo: 'orden_servicio_creada',
    descripcion: `Orden de servicio creada para ${orderData.service_type}`,
    moduloOrigen: 'machinery_manager',
    usuario: orderData.currentUser || 'sistema',
    referencia: data.id
  });

  return data;
}

export async function actualizarOrdenServicio(id, updates) {
  const { data, error } = await supabase
    .from('machinery_service_orders')
    .update({
      ...updates,
      updated_by: updates.currentUser || 'sistema'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completarOrdenServicio(id, completionData) {
  const updates = {
    ...completionData,
    status: 'completed',
    end_datetime: new Date().toISOString()
  };

  return actualizarOrdenServicio(id, updates);
}

// ==================== MANTENIMIENTOS ====================

export async function obtenerMantenimientos(machineryId) {
  const { data, error } = await supabase
    .from('machinery_maintenance')
    .select(`
      *,
      machinery:machinery(id, name, type),
      performed_by:personnel(id, full_name)
    `)
    .eq('machinery_id', machineryId)
    .order('scheduled_date', { ascending: false });

  if (error) throw error;
  return { data };
}

export async function obtenerMantenimientosPorFirma(firmId, filters = {}) {
  let query = supabase
    .from('machinery_maintenance')
    .select(`
      *,
      machinery:machinery(id, name, type, code),
      performed_by:personnel(id, full_name)
    `)
    .eq('firm_id', firmId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.maintenanceType) {
    query = query.eq('maintenance_type', filters.maintenanceType);
  }

  query = query.order('scheduled_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return { data };
}

export async function crearMantenimiento(maintenanceData) {
  const { data, error } = await supabase
    .from('machinery_maintenance')
    .insert([maintenanceData])
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId: maintenanceData.firm_id,
    tipo: 'mantenimiento_programado',
    descripcion: `Mantenimiento ${maintenanceData.maintenance_type} programado`,
    moduloOrigen: 'machinery_manager',
    usuario: maintenanceData.currentUser || 'sistema',
    referencia: data.id
  });

  return data;
}

export async function actualizarMantenimiento(id, updates) {
  const { data, error } = await supabase
    .from('machinery_maintenance')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completarMantenimiento(id, completionData) {
  const updates = {
    ...completionData,
    status: 'completed',
    completion_date: new Date().toISOString().split('T')[0]
  };

  return actualizarMantenimiento(id, updates);
}

export async function obtenerMantenimientosVencidos(firmId) {
  const { data, error } = await supabase
    .from('v_overdue_maintenance')
    .select('*')
    .eq('firm_id', firmId);

  if (error) throw error;
  return { data };
}

// ==================== RENTABILIDAD ====================

export async function obtenerRentabilidadMaquinaria(firmId, filters = {}) {
  let query = supabase
    .from('v_machinery_profitability')
    .select('*')
    .eq('firm_id', firmId);

  const { data, error } = await query;
  if (error) throw error;
  return { data };
}

export async function obtenerCostosPorMaquina(machineryId, dateFrom, dateTo) {
  // Costos de servicios
  const { data: serviceCosts } = await supabase
    .from('machinery_service_orders')
    .select('total_cost, fuel_cost, operator_cost, order_date')
    .eq('machinery_id', machineryId)
    .eq('status', 'completed')
    .gte('order_date', dateFrom)
    .lte('order_date', dateTo);

  // Costos de mantenimientos
  const { data: maintenanceCosts } = await supabase
    .from('machinery_maintenance')
    .select('total_cost, labor_cost, parts_cost, completion_date')
    .eq('machinery_id', machineryId)
    .eq('status', 'completed')
    .gte('completion_date', dateFrom)
    .lte('completion_date', dateTo);

  const totalServiceCost = serviceCosts?.reduce((sum, s) => sum + parseFloat(s.total_cost || 0), 0) || 0;
  const totalMaintenanceCost = maintenanceCosts?.reduce((sum, m) => sum + parseFloat(m.total_cost || 0), 0) || 0;

  return {
    serviceCosts: serviceCosts || [],
    maintenanceCosts: maintenanceCosts || [],
    totalServiceCost,
    totalMaintenanceCost,
    totalCost: totalServiceCost + totalMaintenanceCost
  };
}
