import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

// ==================== CRUD EVALUACIONES ====================

export async function obtenerEvaluaciones(firmId, personnelId = null) {
  let query = supabase
    .from('performance_evaluations')
    .select(`
      *,
      personnel:personnel(id, full_name, position_title, role),
      evaluator:personnel!evaluator_id(id, full_name),
      approved_by:personnel!approved_by_id(id, full_name)
    `)
    .eq('firm_id', firmId);

  if (personnelId) {
    query = query.eq('personnel_id', personnelId);
  }

  query = query.order('evaluation_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return { data };
}

export async function obtenerEvaluacionPorId(id) {
  const { data, error } = await supabase
    .from('performance_evaluations')
    .select(`
      *,
      personnel:personnel(id, full_name, position_title, role),
      evaluator:personnel!evaluator_id(id, full_name),
      approved_by:personnel!approved_by_id(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return { data };
}

export async function crearEvaluacion(evaluationData) {
  // Validar campos de calificación
  const scores = [
    evaluationData.technical_skills,
    evaluationData.soft_skills,
    evaluationData.productivity,
    evaluationData.reliability,
    evaluationData.teamwork,
    evaluationData.initiative
  ];

  for (const score of scores) {
    if (score !== null && (score < 0 || score > 100)) {
      throw new Error('Todas las calificaciones deben estar entre 0 y 100');
    }
  }

  const { data, error } = await supabase
    .from('performance_evaluations')
    .insert([{
      ...evaluationData,
      created_by: evaluationData.currentUser || 'sistema'
    }])
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId: evaluationData.firm_id,
    tipo: 'evaluacion_desempeño_creada',
    descripcion: `Evaluación de desempeño creada para ${evaluationData.overall_score || 'evaluación'}`,
    moduloOrigen: 'performance_evaluations',
    usuario: evaluationData.currentUser || 'sistema',
    referencia: data.id
  });

  return data;
}

export async function actualizarEvaluacion(id, updates) {
  const { data, error } = await supabase
    .from('performance_evaluations')
    .update({
      ...updates,
      updated_by: updates.currentUser || 'sistema'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId: data.firm_id,
    tipo: 'evaluacion_desempeño_actualizada',
    descripcion: `Evaluación actualizada - ${data.overall_score || 'sin calificación'}`,
    moduloOrigen: 'performance_evaluations',
    usuario: updates.currentUser || 'sistema',
    referencia: id
  });

  return data;
}

export async function aprobarEvaluacion(id, approverPersonnelId, currentUser) {
  const { data, error } = await supabase
    .from('performance_evaluations')
    .update({
      status: 'approved',
      approved_by_id: approverPersonnelId,
      approved_at: new Date().toISOString(),
      updated_by: currentUser || 'sistema'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await crearRegistro({
    firmId: data.firm_id,
    tipo: 'evaluacion_desempeño_aprobada',
    descripcion: `Evaluación aprobada - Score: ${data.overall_score}`,
    moduloOrigen: 'performance_evaluations',
    usuario: currentUser || 'sistema',
    referencia: id
  });

  return data;
}

export async function obtenerEvaluacionesPorPeriodo(firmId, startDate, endDate) {
  const { data, error } = await supabase
    .from('v_personnel_performance_by_period')
    .select('*')
    .eq('firm_id', firmId)
    .gte('evaluation_date', startDate)
    .lte('evaluation_date', endDate)
    .order('overall_score', { ascending: false });

  if (error) throw error;
  return { data };
}

export async function obtenerRecomendacionesDesarrollo(firmId) {
  const { data, error } = await supabase
    .from('performance_evaluations')
    .select(`
      personnel:personnel(id, full_name),
      overall_score,
      promotion_recommended,
      salary_increase_recommended,
      training_recommended
    `)
    .eq('firm_id', firmId)
    .eq('status', 'approved')
    .or('promotion_recommended.eq.true,salary_increase_recommended.eq.true');

  if (error) throw error;
  return { data };
}

// ==================== ESTADÍSTICAS ====================

export async function obtenerEstadisticasEvaluaciones(firmId) {
  const { data, error } = await supabase
    .from('v_personnel_performance_by_period')
    .select('overall_score, performance_level')
    .eq('firm_id', firmId);

  if (error) throw error;

  if (!data || data.length === 0) {
    return {
      total: 0,
      promedio: 0,
      distribution: {
        excelente: 0,
        muy_bueno: 0,
        bueno: 0,
        aceptable: 0,
        necesita_mejora: 0
      }
    };
  }

  const scores = data.map(e => parseFloat(e.overall_score || 0));
  const promedio = scores.reduce((a, b) => a + b, 0) / scores.length;

  const distribution = {
    excelente: data.filter(e => e.performance_level === 'EXCELENTE').length,
    muy_bueno: data.filter(e => e.performance_level === 'MUY BUENO').length,
    bueno: data.filter(e => e.performance_level === 'BUENO').length,
    aceptable: data.filter(e => e.performance_level === 'ACEPTABLE').length,
    necesita_mejora: data.filter(e => e.performance_level === 'NECESITA MEJORA').length
  };

  return {
    total: data.length,
    promedio: Math.round(promedio * 100) / 100,
    distribution
  };
}
