/**
 * chartOfAccounts.js
 * Servicio para gestión del plan de cuentas contable
 */

import { supabase } from '../lib/supabase';

/**
 * Obtener plan de cuentas de una firma (organizado jerárquicamente)
 */
export async function getChartOfAccounts(firmId) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('firm_id', firmId)
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (error) throw error;
  return organizeHierarchy(data || []);
}

/**
 * Obtener todas las cuentas (incluyendo inactivas)
 */
export async function getAllChartOfAccounts(firmId) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('firm_id', firmId)
    .order('code', { ascending: true });

  if (error) throw error;
  return organizeHierarchy(data || []);
}

/**
 * Organizar cuentas en estructura jerárquica
 */
export function organizeHierarchy(flatList) {
  const map = {};
  const roots = [];

  flatList.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });

  flatList.forEach(item => {
    if (item.parent_id) {
      const parent = map[item.parent_id];
      if (parent) {
        parent.children.push(map[item.id]);
      }
    } else {
      roots.push(map[item.id]);
    }
  });

  return roots;
}

/**
 * Obtener una cuenta específica
 */
export async function getAccount(accountId) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crear cuenta contable
 */
export async function createAccount({
  firmId,
  code,
  name,
  description,
  accountType,
  balanceNature,
  allowsTransactions,
  parentId
}) {
  // Validar código único
  const { data: existing } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('firm_id', firmId)
    .eq('code', code)
    .single();

  if (existing) {
    throw new Error('Ya existe una cuenta con este código');
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert([{
      firm_id: firmId,
      code,
      name,
      description,
      account_type: accountType,
      balance_nature: balanceNature,
      allows_transactions: allowsTransactions,
      parent_id: parentId || null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Actualizar cuenta
 */
export async function updateAccount(accountId, updates) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Desactivar cuenta (soft delete con cascada a hijos)
 */
export async function deactivateAccount(accountId) {
  // Obtener todos los hijos
  const { data: children } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('parent_id', accountId);

  // Desactivar hijos recursivamente
  if (children && children.length > 0) {
    for (const child of children) {
      await deactivateAccount(child.id);
    }
  }

  return updateAccount(accountId, { is_active: false });
}

/**
 * Activar cuenta
 */
export async function activateAccount(accountId) {
  return updateAccount(accountId, { is_active: true });
}

/**
 * Obtener opciones de cuenta padre para un tipo específico
 */
export async function getParentAccountOptions(firmId, accountType, excludeId = null) {
  let query = supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type')
    .eq('firm_id', firmId)
    .eq('account_type', accountType)
    .eq('is_active', true);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.order('code');

  if (error) throw error;
  return data || [];
}

/**
 * Cargar plan de cuentas estándar (llama función SQL)
 */
export async function loadStandardChartOfAccounts(firmId) {
  const { data, error } = await supabase.rpc('load_standard_chart_of_accounts', {
    p_firm_id: firmId
  });

  if (error) throw error;

  if (!data || !data[0]?.success) {
    throw new Error(data?.[0]?.message || 'Error cargando plan estándar');
  }

  return data[0];
}

/**
 * Verificar si una firma tiene plan cargado
 */
export async function hasChartOfAccounts(firmId) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id', { count: 'exact' })
    .eq('firm_id', firmId)
    .limit(1);

  if (error) throw error;
  return (data?.length || 0) > 0;
}
