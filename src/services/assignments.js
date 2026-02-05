import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

export async function obtenerAsignaciones(personnelId) {
  const { data, error } = await supabase
    .from('personnel_assignments')
    .select(`
      *,
      personnel:personnel(id, full_name),
      agricultural_work:agricultural_works(id, work_type, lot_id),
      livestock_work:livestock_works(id, herd_id),
      machinery:machinery(id, name, type)
    `)
    .eq('personnel_id', personnelId)
    .order('assignment_date', { ascending: false });

  if (error) throw error;
  return { data };
}

export async function obtenerAsignacionesActivas(firmId) {
  const { data, error } = await supabase
    .from('personnel_assignments')
    .select(`
      *,
      personnel:personnel(id, full_name, cost_per_hour),
      agricultural_work:agricultural_works(id, work_type, lot_id),
      livestock_work:livestock_works(id, herd_id),
      machinery:machinery(id, name, code, type)
    `)
    .eq('firm_id', firmId)
    .neq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
}

export async function crearAsignacion(assignmentData, currentUser = 'sistema') {
  // Extraer currentUser antes de insertar (no es columna en BD)
  const { currentUser: _, ...dataToInsert } = assignmentData;

  const { data, error } = await supabase
    .from('personnel_assignments')
    .insert([dataToInsert])
    .select()
    .single();

  if (error) throw error;

  // Auditoría con el usuario real
  await crearRegistro({
    firmId: dataToInsert.firm_id,
    tipo: 'asignacion_creada',
    descripcion: `Asignación creada: ${dataToInsert.assignment_type} - Personal: ${dataToInsert.personnel_id}`,
    moduloOrigen: 'personnel_manager',
    usuario: currentUser,
    referencia: data.id,
    metadata: {
      assignment_type: dataToInsert.assignment_type,
      machinery_id: dataToInsert.machinery_id,
      agricultural_work_id: dataToInsert.agricultural_work_id,
      livestock_work_id: dataToInsert.livestock_work_id
    }
  });

  return data;
}

export async function actualizarAsignacion(id, updates) {
  const { data, error } = await supabase
    .from('personnel_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completarAsignacion(id, currentUser = 'sistema') {
  const { data, error } = await supabase
    .from('personnel_assignments')
    .update({
      status: 'completed',
      end_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Auditoría
  await crearRegistro({
    firmId: data.firm_id,
    tipo: 'asignacion_completada',
    descripcion: `Asignación completada: ${data.assignment_type}`,
    moduloOrigen: 'personnel_manager',
    usuario: currentUser,
    referencia: id
  });

  return data;
}
