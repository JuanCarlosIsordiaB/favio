import { supabase } from '../lib/supabase';

export async function verificarAlertasPersonal(firmId) {
  const alertas = [];

  // Capacitaciones vencidas
  const { data: expiredTraining } = await supabase
    .from('v_expired_training')
    .select('*')
    .eq('firm_id', firmId);

  if (expiredTraining && expiredTraining.length > 0) {
    expiredTraining.forEach(training => {
      alertas.push({
        firm_id: firmId,
        alert_type: 'training_expired',
        priority: training.is_mandatory ? 'HIGH' : 'MEDIUM',
        title: 'Capacitación Vencida',
        message: `${training.full_name}: Capacitación "${training.training_name}" venció el ${training.expiration_date}`,
        reference_id: training.id,
        reference_table: 'personnel_training'
      });
    });
  }

  // Capacitaciones por vencer (30 días)
  const { data: expiringTraining } = await supabase
    .from('v_expiring_training')
    .select('*')
    .eq('firm_id', firmId);

  if (expiringTraining && expiringTraining.length > 0) {
    expiringTraining.forEach(training => {
      alertas.push({
        firm_id: firmId,
        alert_type: 'training_expiring',
        priority: 'MEDIUM',
        title: 'Capacitación Próxima a Vencer',
        message: `${training.full_name}: Capacitación "${training.training_name}" vence en ${training.days_until_expiration} días`,
        reference_id: training.id,
        reference_table: 'personnel_training'
      });
    });
  }

  // Asignaciones sin completar (más de 7 días)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: overdueAssignments } = await supabase
    .from('personnel_assignments')
    .select(`
      *,
      personnel:personnel(full_name)
    `)
    .eq('firm_id', firmId)
    .eq('status', 'in_progress')
    .lt('assignment_date', sevenDaysAgo.toISOString().split('T')[0]);

  if (overdueAssignments && overdueAssignments.length > 0) {
    overdueAssignments.forEach(assignment => {
      alertas.push({
        firm_id: firmId,
        alert_type: 'assignment_overdue',
        priority: 'HIGH',
        title: 'Asignación Pendiente',
        message: `${assignment.personnel.full_name}: Asignación pendiente desde ${assignment.assignment_date}`,
        reference_id: assignment.id,
        reference_table: 'personnel_assignments'
      });
    });
  }

  // Insertar alertas nuevas
  if (alertas.length > 0) {
    for (const alerta of alertas) {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('firm_id', alerta.firm_id)
        .eq('alert_type', alerta.alert_type)
        .eq('reference_id', alerta.reference_id)
        .eq('status', 'pending')
        .single();

      if (!existing) {
        await supabase.from('alerts').insert([{
          ...alerta,
          alert_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }]);
      }
    }
  }

  return { alertas, count: alertas.length };
}
