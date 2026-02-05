import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

// ==================== CRUD PERSONAL ====================

export async function obtenerPersonal(firmId) {
  const { data, error } = await supabase
    .from('personnel')
    .select(`
      *,
      cost_center:cost_centers(id, name, code),
      reports_to:personnel!reports_to_id(id, full_name)
    `)
    .eq('firm_id', firmId)
    .order('full_name');

  if (error) throw error;
  return { data };
}

export async function obtenerPersonalPorId(id) {
  const { data, error } = await supabase
    .from('personnel')
    .select(`
      *,
      cost_center:cost_centers(id, name, code),
      reports_to:personnel!reports_to_id(id, full_name, position_title),
      subordinates:personnel!reports_to_id(id, full_name, position_title, status)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return { data };
}

export async function crearPersonal(personnelData) {
  const { data, error } = await supabase
    .from('personnel')
    .insert([{
      ...personnelData,
      created_by: personnelData.currentUser || 'sistema'
    }])
    .select()
    .single();

  if (error) throw error;

  // Auditoría
  await crearRegistro({
    firmId: personnelData.firm_id,
    tipo: 'personal_creado',
    descripcion: `Personal creado: ${data.full_name} (${data.position_title})`,
    moduloOrigen: 'personnel_manager',
    usuario: personnelData.currentUser || 'sistema',
    referencia: data.id
  });

  return data;
}

export async function actualizarPersonal(id, updates) {
  const { data, error } = await supabase
    .from('personnel')
    .update({
      ...updates,
      updated_by: updates.currentUser || 'sistema'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Auditoría
  await crearRegistro({
    firmId: data.firm_id,
    tipo: 'personal_actualizado',
    descripcion: `Personal actualizado: ${data.full_name}`,
    moduloOrigen: 'personnel_manager',
    usuario: updates.currentUser || 'sistema',
    referencia: id
  });

  return data;
}

export async function eliminarPersonal(id, currentUser) {
  // Verificar si tiene asignaciones activas
  const { data: assignments } = await supabase
    .from('personnel_assignments')
    .select('id')
    .eq('personnel_id', id)
    .in('status', ['assigned', 'in_progress']);

  if (assignments && assignments.length > 0) {
    throw new Error('No se puede eliminar personal con asignaciones activas');
  }

  // Cambiar estado a INACTIVE en lugar de eliminar
  const { data, error } = await supabase
    .from('personnel')
    .update({
      status: 'INACTIVE',
      termination_date: new Date().toISOString().split('T')[0],
      updated_by: currentUser || 'sistema'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Auditoría
  await crearRegistro({
    firmId: data.firm_id,
    tipo: 'personal_eliminado',
    descripcion: `Personal dado de baja: ${data.full_name}`,
    moduloOrigen: 'personnel_manager',
    usuario: currentUser || 'sistema',
    referencia: id
  });

  return data;
}

// ==================== BÚSQUEDAS ESPECÍFICAS ====================

export async function buscarPersonalPorRol(firmId, role) {
  const { data, error } = await supabase
    .from('personnel')
    .select('*')
    .eq('firm_id', firmId)
    .eq('role', role)
    .eq('status', 'ACTIVE')
    .order('full_name');

  if (error) throw error;
  return { data };
}

export async function obtenerOperadores(firmId) {
  const { data, error } = await supabase
    .from('personnel')
    .select('id, full_name, role, position_title')
    .eq('firm_id', firmId)
    .in('role', ['operator', 'field_supervisor'])
    .eq('status', 'ACTIVE')
    .order('full_name');

  if (error) throw error;
  return { data };
}

export async function obtenerOrganigrama(firmId) {
  const { data, error } = await supabase
    .from('personnel')
    .select(`
      id,
      full_name,
      position_title,
      role,
      reports_to_id,
      status
    `)
    .eq('firm_id', firmId)
    .eq('status', 'ACTIVE')
    .order('reports_to_id', { nullsFirst: true })
    .order('full_name');

  if (error) throw error;

  // Construir árbol jerárquico
  const tree = buildOrgTree(data);
  return { data: tree };
}

function buildOrgTree(personnel) {
  const map = {};
  const roots = [];

  personnel.forEach(person => {
    map[person.id] = { ...person, subordinates: [] };
  });

  personnel.forEach(person => {
    if (person.reports_to_id) {
      if (map[person.reports_to_id]) {
        map[person.reports_to_id].subordinates.push(map[person.id]);
      }
    } else {
      roots.push(map[person.id]);
    }
  });

  return roots;
}

// ==================== ESTADÍSTICAS ====================

export async function obtenerEstadisticasPersonal(firmId) {
  const { data, error } = await supabase
    .from('personnel')
    .select('id, status, role, cost_per_hour, salary_amount')
    .eq('firm_id', firmId);

  if (error) throw error;

  const stats = {
    total: data.length,
    active: data.filter(p => p.status === 'ACTIVE').length,
    inactive: data.filter(p => p.status === 'INACTIVE').length,
    onLeave: data.filter(p => p.status === 'ON_LEAVE').length,
    byRole: {},
    totalMonthlyCost: 0
  };

  data.forEach(person => {
    stats.byRole[person.role] = (stats.byRole[person.role] || 0) + 1;
    if (person.status === 'ACTIVE' && person.salary_amount) {
      stats.totalMonthlyCost += parseFloat(person.salary_amount);
    }
  });

  return stats;
}
