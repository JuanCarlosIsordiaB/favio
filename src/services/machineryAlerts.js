import { supabase } from '../lib/supabase';

export async function verificarAlertasMaquinaria(firmId) {
  const alertas = [];

  // Mantenimientos vencidos
  const { data: overdueMaintenance } = await supabase
    .from('v_overdue_maintenance')
    .select('*')
    .eq('firm_id', firmId);

  if (overdueMaintenance && overdueMaintenance.length > 0) {
    overdueMaintenance.forEach(machine => {
      let message = `${machine.name}: Mantenimiento vencido`;

      if (machine.days_overdue > 0) {
        message += ` - ${machine.days_overdue} días de retraso`;
      } else if (machine.hours_overdue > 0) {
        message += ` - ${Math.round(machine.hours_overdue)} horas de retraso`;
      }

      alertas.push({
        firm_id: firmId,
        alert_type: 'maintenance_overdue',
        priority: 'HIGH',
        title: 'Mantenimiento Vencido',
        message,
        reference_id: machine.id,
        reference_table: 'machinery'
      });
    });
  }

  // Mantenimientos próximos (próximos 50 horas o 7 días)
  const { data: machinery } = await supabase
    .from('machinery')
    .select('*')
    .eq('firm_id', firmId)
    .eq('status', 'ACTIVE');

  if (machinery) {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    machinery.forEach(machine => {
      // Por horas
      if (machine.next_maintenance_hours && machine.horometer_hours) {
        const hoursUntilMaintenance = machine.next_maintenance_hours - machine.horometer_hours;
        if (hoursUntilMaintenance > 0 && hoursUntilMaintenance <= 50) {
          alertas.push({
            firm_id: firmId,
            alert_type: 'maintenance_due_soon',
            priority: 'MEDIUM',
            title: 'Mantenimiento Próximo',
            message: `${machine.name}: Mantenimiento requerido en ${Math.round(hoursUntilMaintenance)} horas`,
            reference_id: machine.id,
            reference_table: 'machinery'
          });
        }
      }

      // Por fecha
      if (machine.next_maintenance_date) {
        const maintenanceDate = new Date(machine.next_maintenance_date);
        if (maintenanceDate >= today && maintenanceDate <= sevenDaysLater) {
          const daysUntil = Math.ceil((maintenanceDate - today) / (1000 * 60 * 60 * 24));
          alertas.push({
            firm_id: firmId,
            alert_type: 'maintenance_due_soon',
            priority: 'MEDIUM',
            title: 'Mantenimiento Próximo',
            message: `${machine.name}: Mantenimiento programado en ${daysUntil} días`,
            reference_id: machine.id,
            reference_table: 'machinery'
          });
        }
      }
    });
  }

  // Seguro por vencer (30 días)
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const { data: expiringInsurance } = await supabase
    .from('machinery')
    .select('*')
    .eq('firm_id', firmId)
    .eq('status', 'ACTIVE')
    .not('insurance_expiry', 'is', null)
    .lte('insurance_expiry', thirtyDaysLater.toISOString().split('T')[0]);

  if (expiringInsurance && expiringInsurance.length > 0) {
    expiringInsurance.forEach(machine => {
      const expiryDate = new Date(machine.insurance_expiry);
      const daysUntil = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

      alertas.push({
        firm_id: firmId,
        alert_type: 'insurance_expiring',
        priority: daysUntil <= 7 ? 'HIGH' : 'MEDIUM',
        title: 'Seguro por Vencer',
        message: `${machine.name}: Seguro vence en ${daysUntil} días`,
        reference_id: machine.id,
        reference_table: 'machinery'
      });
    });
  }

  // Insertar alertas nuevas
  if (alertas.length > 0) {
    for (const alerta of alertas) {
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
