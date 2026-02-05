import { supabase } from '../lib/supabase';

// ==================== LOGGING DE ACCESOS ====================

export async function registrarLogin(firmId, personnelId, userId, details = {}) {
  const { data, error } = await supabase
    .from('access_logs')
    .insert([{
      firm_id: firmId,
      personnel_id: personnelId,
      user_id: userId,
      action: 'LOGIN',
      login_timestamp: new Date().toISOString(),
      ip_address: details.ip_address || null,
      user_agent: details.user_agent || null,
      success: true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error registering login:', error);
    return null;
  }

  return data;
}

export async function registrarLogout(accessLogId, currentUser) {
  if (!accessLogId) return null;

  const { data, error } = await supabase
    .from('access_logs')
    .update({
      action: 'LOGOUT',
      logout_timestamp: new Date().toISOString()
    })
    .eq('id', accessLogId)
    .select()
    .single();

  if (error) {
    console.error('Error registering logout:', error);
    return null;
  }

  return data;
}

export async function registrarLoginFallido(firmId, userId, razon) {
  const { data, error } = await supabase
    .from('access_logs')
    .insert([{
      firm_id: firmId,
      user_id: userId,
      action: 'FAILED_LOGIN',
      login_timestamp: new Date().toISOString(),
      success: false,
      error_message: razon
    }])
    .select()
    .single();

  if (error) {
    console.error('Error registering failed login:', error);
    return null;
  }

  return data;
}

export async function registrarDenegacionPermiso(firmId, personnelId, userId, recurso, razon) {
  const { data, error } = await supabase
    .from('access_logs')
    .insert([{
      firm_id: firmId,
      personnel_id: personnelId,
      user_id: userId,
      action: 'PERMISSION_DENIED',
      login_timestamp: new Date().toISOString(),
      resource_accessed: recurso,
      error_message: razon,
      success: false
    }])
    .select()
    .single();

  if (error) {
    console.error('Error registering permission denial:', error);
    return null;
  }

  return data;
}

// ==================== CONSULTAS ====================

export async function obtenerAccessLogs(firmId, filtros = {}) {
  let query = supabase
    .from('access_logs')
    .select('*')
    .eq('firm_id', firmId);

  if (filtros.action) {
    query = query.eq('action', filtros.action);
  }

  if (filtros.personnelId) {
    query = query.eq('personnel_id', filtros.personnelId);
  }

  if (filtros.dateFrom) {
    query = query.gte('login_timestamp', filtros.dateFrom);
  }

  if (filtros.dateTo) {
    query = query.lte('login_timestamp', filtros.dateTo);
  }

  query = query.order('login_timestamp', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return { data };
}

export async function obtenerSesionesActivas(firmId) {
  const { data, error } = await supabase
    .from('v_concurrent_sessions')
    .select('*')
    .eq('firm_id', firmId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw error;
  }

  return { data: data || { firm_id: firmId, active_users: 0, active_personnel: 0 } };
}

export async function obtenerEstadisticasAcceso(firmId, dias = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  const { data, error } = await supabase
    .from('access_logs')
    .select('action, personnel_id')
    .eq('firm_id', firmId)
    .gte('login_timestamp', fechaLimite.toISOString());

  if (error) throw error;

  if (!data || data.length === 0) {
    return {
      total_accesos: 0,
      logins: 0,
      logouts: 0,
      intentos_fallidos: 0,
      denegaciones: 0,
      usuarios_activos: 0
    };
  }

  const stats = {
    total_accesos: data.length,
    logins: data.filter(a => a.action === 'LOGIN').length,
    logouts: data.filter(a => a.action === 'LOGOUT').length,
    intentos_fallidos: data.filter(a => a.action === 'FAILED_LOGIN').length,
    denegaciones: data.filter(a => a.action === 'PERMISSION_DENIED').length,
    usuarios_activos: new Set(data.map(a => a.personnel_id)).size
  };

  return stats;
}
