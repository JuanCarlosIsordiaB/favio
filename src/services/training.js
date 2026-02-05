import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

export async function obtenerCapacitaciones(personnelId) {
  const { data, error } = await supabase
    .from('personnel_training')
    .select('*')
    .eq('personnel_id', personnelId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return { data };
}

export async function obtenerCapacitacionesPorFirma(firmId) {
  const { data, error } = await supabase
    .from('personnel_training')
    .select(`
      *,
      personnel:personnel(id, full_name, position_title, role)
    `)
    .eq('firm_id', firmId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return { data };
}

export async function crearCapacitacion(trainingData) {
  const { data, error } = await supabase
    .from('personnel_training')
    .insert([trainingData])
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId: trainingData.firm_id,
    tipo: 'capacitacion_creada',
    descripcion: `Capacitación registrada: ${data.training_name}`,
    moduloOrigen: 'personnel_manager',
    usuario: trainingData.currentUser || 'sistema',
    referencia: data.id
  });

  return data;
}

export async function actualizarCapacitacion(id, updates) {
  const { data, error } = await supabase
    .from('personnel_training')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function obtenerCapacitacionesVencidas(firmId) {
  const { data, error } = await supabase
    .from('v_expired_training')
    .select('*')
    .eq('firm_id', firmId);

  if (error) throw error;
  return { data };
}

export async function obtenerCapacitacionesPorVencer(firmId, days = 30) {
  const { data, error } = await supabase
    .from('v_expiring_training')
    .select('*')
    .eq('firm_id', firmId);

  if (error) throw error;
  return { data };
}
