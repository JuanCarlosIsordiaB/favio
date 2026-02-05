/**
 * useAuditLogs.js
 *
 * Hook personalizado para gestión de logs de auditoría
 * Proporciona: carga, filtrado, búsqueda y estadísticas
 */

import { useState, useCallback } from 'react';
import * as auditLogsService from '../services/auditLogs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar logs con filtros
   */
  const loadLogs = useCallback(async (filters) => {
    if (!filters.firmId) {
      console.warn('⚠️ loadLogs llamado sin firmId');
      setLogs([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await auditLogsService.getAuditLogs(filters);
      setLogs(result.logs);
      setTotal(result.total);

      console.log(`✅ loadLogs: ${result.logs.length} de ${result.total} logs cargados`);
    } catch (err) {
      console.error('❌ Error en loadLogs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener tipos de eventos únicos
   */
  const loadEventTypes = useCallback(async (firmId) => {
    if (!firmId) return [];

    try {
      const types = await auditLogsService.getEventTypes(firmId);
      return types;
    } catch (err) {
      console.error('❌ Error en loadEventTypes:', err);
      return [];
    }
  }, []);

  /**
   * Obtener módulos únicos
   */
  const loadModules = useCallback(async (firmId) => {
    if (!firmId) return [];

    try {
      const modules = await auditLogsService.getModules(firmId);
      return modules;
    } catch (err) {
      console.error('❌ Error en loadModules:', err);
      return [];
    }
  }, []);

  /**
   * Obtener usuarios únicos
   */
  const loadUsers = useCallback(async (firmId) => {
    if (!firmId) return [];

    try {
      const users = await auditLogsService.getUniqueUsers(firmId);
      return users;
    } catch (err) {
      console.error('❌ Error en loadUsers:', err);
      return [];
    }
  }, []);

  /**
   * Exportar logs a Excel usando XLSX + FileSaver
   */
  const exportToCSV = useCallback(() => {
    if (logs.length === 0) {
      console.warn('⚠️ No hay logs para exportar');
      return null;
    }

    try {
      // ✅ Preparar datos para XLSX
      const data = logs.map(log => ({
        'Fecha': new Date(log.fecha || log.created_at).toLocaleString('es-ES'),
        'Tipo': log.tipo || '',
        'Módulo': log.modulo_origen || '',
        'Usuario': log.usuario || '',
        'Descripción': log.descripcion || ''
      }));

      // ✅ Crear worksheet desde JSON
      const ws = XLSX.utils.json_to_sheet(data);

      // ✅ Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 20 },  // Fecha
        { wch: 25 },  // Tipo
        { wch: 20 },  // Módulo
        { wch: 15 },  // Usuario
        { wch: 40 }   // Descripción
      ];

      // ✅ Crear workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');

      // ✅ Generar archivo como array buffer
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // ✅ Convertir a Blob
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

      // ✅ Descargar usando FileSaver
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `auditoria_${timestamp}.xlsx`;
      saveAs(blob, filename);

      console.log(`✅ Archivo exportado correctamente: ${logs.length} registros`);
      console.log(`📥 Descargando: ${filename}`);
    } catch (err) {
      console.error('❌ Error exportando archivo:', err);
      throw err;
    }
  }, [logs]);

  /**
   * Obtener estadísticas de auditoría
   */
  const getStatistics = useCallback(async (firmId, startDate, endDate) => {
    if (!firmId) return null;

    try {
      const stats = await auditLogsService.getAuditStatistics(firmId, startDate, endDate);
      return stats;
    } catch (err) {
      console.error('❌ Error en getStatistics:', err);
      return null;
    }
  }, []);

  return {
    logs,
    total,
    loading,
    error,
    loadLogs,
    loadEventTypes,
    loadModules,
    loadUsers,
    exportToCSV,
    getStatistics
  };
}
