/**
 * useChartOfAccounts.js
 * Hook para gestión del plan de cuentas
 */

import { useState, useCallback, useEffect } from 'react';
import * as chartOfAccountsService from '../services/chartOfAccounts';
import { toast } from 'sonner';

export function useChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [flatAccounts, setFlatAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasChart, setHasChart] = useState(false);

  const loadAccounts = useCallback(async (firmId) => {
    if (!firmId) return;

    setLoading(true);
    try {
      const data = await chartOfAccountsService.getChartOfAccounts(firmId);
      setAccounts(data);

      // Aplanar la estructura para búsquedas
      const flat = flattenHierarchy(data);
      setFlatAccounts(flat);
      setHasChart(flat.length > 0);
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
      toast.error('Error al cargar plan de cuentas');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllAccounts = useCallback(async (firmId) => {
    if (!firmId) return;

    setLoading(true);
    try {
      const data = await chartOfAccountsService.getAllChartOfAccounts(firmId);
      setAccounts(data);
      const flat = flattenHierarchy(data);
      setFlatAccounts(flat);
    } catch (error) {
      console.error('Error loading all accounts:', error);
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (accountData) => {
    try {
      const newAccount = await chartOfAccountsService.createAccount(accountData);
      toast.success('Cuenta creada exitosamente');
      return newAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Error al crear cuenta');
      throw error;
    }
  }, []);

  const updateAccount = useCallback(async (accountId, updates) => {
    try {
      const updated = await chartOfAccountsService.updateAccount(accountId, updates);
      toast.success('Cuenta actualizada exitosamente');
      return updated;
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Error al actualizar cuenta');
      throw error;
    }
  }, []);

  const deactivateAccount = useCallback(async (accountId) => {
    try {
      await chartOfAccountsService.deactivateAccount(accountId);
      toast.success('Cuenta desactivada exitosamente');
    } catch (error) {
      console.error('Error deactivating account:', error);
      toast.error('Error al desactivar cuenta');
      throw error;
    }
  }, []);

  const activateAccount = useCallback(async (accountId) => {
    try {
      await chartOfAccountsService.activateAccount(accountId);
      toast.success('Cuenta activada exitosamente');
    } catch (error) {
      console.error('Error activating account:', error);
      toast.error('Error al activar cuenta');
      throw error;
    }
  }, []);

  const loadStandardChart = useCallback(async (firmId) => {
    try {
      setLoading(true);
      const result = await chartOfAccountsService.loadStandardChartOfAccounts(firmId);
      toast.success(result.message || 'Plan estándar cargado exitosamente');

      // Recargar cuentas
      await loadAccounts(firmId);
      return result;
    } catch (error) {
      console.error('Error loading standard chart:', error);
      toast.error(error.message || 'Error al cargar plan estándar');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadAccounts]);

  const getParentOptions = useCallback(async (firmId, accountType, excludeId = null) => {
    try {
      return await chartOfAccountsService.getParentAccountOptions(firmId, accountType, excludeId);
    } catch (error) {
      console.error('Error getting parent options:', error);
      return [];
    }
  }, []);

  return {
    accounts,
    flatAccounts,
    loading,
    hasChart,
    loadAccounts,
    loadAllAccounts,
    createAccount,
    updateAccount,
    deactivateAccount,
    activateAccount,
    loadStandardChart,
    getParentOptions
  };
}

/**
 * Aplanar la estructura jerárquica para búsquedas y tablas simples
 */
function flattenHierarchy(items, parentCode = '') {
  let result = [];

  items.forEach(item => {
    result.push({
      ...item,
      level: parentCode ? parentCode.split('.').length : 0,
      indent: parentCode ? '  '.repeat(parentCode.split('.').length) : ''
    });

    if (item.children && item.children.length > 0) {
      result = result.concat(flattenHierarchy(item.children, item.code));
    }
  });

  return result;
}
