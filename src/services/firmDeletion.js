/**
 * Servicio de Eliminación de Firmas - Enfoque Arquitectónico
 *
 * PROBLEMA: PostgreSQL Error 23503 (FK Constraint) bloquea eliminación de firmas
 *
 * ANÁLISIS:
 * Cuando se crea una firma, el sistema automáticamente crea:
 * - Registros en tabla AUDIT (auditoría de creación)
 * - Registros en USER_FIRM_ACCESS (acceso del propietario)
 * - Posibles cuentas contables por defecto
 * - Posibles centros de costo por defecto
 *
 * SOLUCIÓN INGENIERIL:
 * 1. Verificar TODAS las dependencias automáticas
 * 2. Limpiar dependencias automáticas ANTES de eliminar firma
 * 3. Reportar exactamente qué fue limpiado
 * 4. Permitir eliminación solo si no hay datos USER-CREATED (predios, etc)
 *
 * ARQUITECTURA:
 * - checkFirmDependencies() : Investiga qué depende de la firma
 * - cleanupFirmDependencies() : Limpia datos auto-creados
 * - deleteFirm() : Orquesta limpieza y eliminación
 */

import { supabase } from '../lib/supabase';
import { crearRegistro } from './registros';

/**
 * PASO 1: Investigar todas las dependencias de una firma
 * @param {string} firmId - ID de la firma a verificar
 * @returns {Promise<Object>} Mapa de todas las dependencias
 */
export async function checkFirmDependencies(firmId) {
  const dependencies = {
    // Datos user-created (BLOQUEAN eliminación)
    premises: { count: 0, canDelete: false, description: 'Predios del usuario' },
    lots: { count: 0, canDelete: false, description: 'Lotes del usuario' },

    // Datos auto-created (LIMPIAR antes de eliminar)
    audit: { count: 0, canDelete: true, description: 'Registros de auditoría' },
    userFirmAccess: { count: 0, canDelete: true, description: 'Acceso usuario-firma' },
    chartOfAccounts: { count: 0, canDelete: true, description: 'Cuentas contables automáticas' },
    costCenters: { count: 0, canDelete: true, description: 'Centros de costo automáticos' },
    campaigns: { count: 0, canDelete: 'conditional', description: 'Campañas' },

    // Otros (investigar)
    expenses: { count: 0, canDelete: false, description: 'Gastos registrados' },
    income: { count: 0, canDelete: false, description: 'Ingresos registrados' },
    works: { count: 0, canDelete: false, description: 'Trabajos registrados' }
  };

  try {
    // Verificar cada tabla
    for (const [key, dep] of Object.entries(dependencies)) {
      let query;

      switch (key) {
        case 'premises':
          query = supabase.from('premises').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'lots':
          // Lots pertenecen a premises, que pertenecen a firms
          query = supabase.from('lots').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'audit':
          query = supabase.from('audit').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'userFirmAccess':
          query = supabase.from('user_firm_access').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'chartOfAccounts':
          query = supabase.from('chart_of_accounts').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'costCenters':
          query = supabase.from('cost_centers').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'campaigns':
          query = supabase.from('campaigns').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'expenses':
          query = supabase.from('expenses').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'income':
          query = supabase.from('income').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
        case 'works':
          query = supabase.from('works').select('id', { count: 'exact' }).eq('firm_id', firmId);
          break;
      }

      if (query) {
        const { count, error } = await query;
        if (!error && count !== null) {
          dep.count = count;
        }
      }
    }
  } catch (error) {
    console.error('Error investigando dependencias:', error);
  }

  return dependencies;
}

/**
 * PASO 2A: Limpiar datos creados por el usuario (eliminación en cascada)
 * Esta función elimina predios, lotes, gastos e ingresos relacionados con la firma
 * 
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Reporte de limpieza
 */
export async function cleanupUserCreatedData(firmId) {
  const report = {
    success: true,
    cleaned: {},
    errors: [],
    counts: {}
  };

  try {
    console.log(`🗑️ Iniciando eliminación en cascada de datos del usuario para firma: ${firmId}`);

    // PASO 0: Obtener IDs de datos relacionados para eliminar sus registros de auditoría primero
    console.log('  → Obteniendo IDs de datos relacionados...');
    
    // Obtener IDs de lotes
    const { data: lotsData } = await supabase
      .from('lots')
      .select('id')
      .eq('firm_id', firmId);
    const lotIds = lotsData?.map(l => l.id) || [];
    
    // Obtener IDs de predios
    const { data: premisesData } = await supabase
      .from('premises')
      .select('id')
      .eq('firm_id', firmId);
    const premiseIds = premisesData?.map(p => p.id) || [];
    
    // Obtener IDs de gastos
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('id')
      .eq('firm_id', firmId);
    const expenseIds = expensesData?.map(e => e.id) || [];
    
    // Obtener IDs de ingresos
    const { data: incomeData } = await supabase
      .from('income')
      .select('id')
      .eq('firm_id', firmId);
    const incomeIds = incomeData?.map(i => i.id) || [];
    
    // Obtener IDs de trabajos
    const { data: worksData } = await supabase
      .from('works')
      .select('id')
      .eq('firm_id', firmId);
    const workIds = worksData?.map(w => w.id) || [];

    // PASO 1: Eliminar registros de auditoría que referencian estos datos
    console.log('  → Eliminando registros de auditoría relacionados...');
    
    // Eliminar registros de auditoría con lot_id
    if (lotIds.length > 0) {
      const { error: auditLotsError } = await supabase
        .from('audit')
        .delete()
        .in('lot_id', lotIds);
      if (auditLotsError) {
        console.warn('  ⚠️ Error eliminando audit de lotes:', auditLotsError.message);
      } else {
        console.log(`  ✓ Eliminados registros de auditoría de ${lotIds.length} lotes`);
      }
    }
    
    // Eliminar registros de auditoría con premise_id
    if (premiseIds.length > 0) {
      const { error: auditPremisesError } = await supabase
        .from('audit')
        .delete()
        .in('premise_id', premiseIds);
      if (auditPremisesError) {
        console.warn('  ⚠️ Error eliminando audit de predios:', auditPremisesError.message);
      } else {
        console.log(`  ✓ Eliminados registros de auditoría de ${premiseIds.length} predios`);
      }
    }
    
    // Eliminar registros de auditoría con referencia a gastos
    if (expenseIds.length > 0) {
      const { error: auditExpensesError } = await supabase
        .from('audit')
        .delete()
        .in('referencia', expenseIds)
        .eq('firm_id', firmId);
      if (auditExpensesError) {
        console.warn('  ⚠️ Error eliminando audit de gastos:', auditExpensesError.message);
      } else {
        console.log(`  ✓ Eliminados registros de auditoría de ${expenseIds.length} gastos`);
      }
    }
    
    // Eliminar registros de auditoría con referencia a ingresos
    if (incomeIds.length > 0) {
      const { error: auditIncomeError } = await supabase
        .from('audit')
        .delete()
        .in('referencia', incomeIds)
        .eq('firm_id', firmId);
      if (auditIncomeError) {
        console.warn('  ⚠️ Error eliminando audit de ingresos:', auditIncomeError.message);
      } else {
        console.log(`  ✓ Eliminados registros de auditoría de ${incomeIds.length} ingresos`);
      }
    }
    
    // Eliminar registros de auditoría con referencia a trabajos
    if (workIds.length > 0) {
      const { error: auditWorksError } = await supabase
        .from('audit')
        .delete()
        .in('referencia', workIds)
        .eq('firm_id', firmId);
      if (auditWorksError) {
        console.warn('  ⚠️ Error eliminando audit de trabajos:', auditWorksError.message);
      } else {
        console.log(`  ✓ Eliminados registros de auditoría de ${workIds.length} trabajos`);
      }
    }

    // PASO 2: Eliminar lotes (después de eliminar sus registros de auditoría)
    console.log('  → Eliminando lotes...');
    if (lotIds.length > 0) {
      const { error: deleteLotsError } = await supabase
        .from('lots')
        .delete()
        .eq('firm_id', firmId);

      if (deleteLotsError) {
        report.errors.push(`Error eliminando lotes: ${deleteLotsError.message}`);
        console.error('  ❌ Error eliminando lotes:', deleteLotsError);
      } else {
        report.cleaned.lots = `✅ Eliminados ${lotIds.length} lotes`;
        report.counts.lots = lotIds.length;
        console.log(`  ✓ ${lotIds.length} lotes eliminados`);
      }
    } else {
      report.counts.lots = 0;
      console.log('  ✓ Sin lotes para eliminar');
    }

    // PASO 3: Eliminar predios (después de lotes y sus registros de auditoría)
    console.log('  → Eliminando predios...');
    if (premiseIds.length > 0) {
      const { error: deletePremisesError } = await supabase
        .from('premises')
        .delete()
        .eq('firm_id', firmId);

      if (deletePremisesError) {
        report.errors.push(`Error eliminando predios: ${deletePremisesError.message}`);
        console.error('  ❌ Error eliminando predios:', deletePremisesError);
      } else {
        report.cleaned.premises = `✅ Eliminados ${premiseIds.length} predios`;
        report.counts.premises = premiseIds.length;
        console.log(`  ✓ ${premiseIds.length} predios eliminados`);
      }
    } else {
      report.counts.premises = 0;
      console.log('  ✓ Sin predios para eliminar');
    }

    // PASO 4: Eliminar gastos
    console.log('  → Eliminando gastos...');
    if (expenseIds.length > 0) {
      const { error: deleteExpensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('firm_id', firmId);

      if (deleteExpensesError) {
        report.errors.push(`Error eliminando gastos: ${deleteExpensesError.message}`);
        console.error('  ❌ Error eliminando gastos:', deleteExpensesError);
      } else {
        report.cleaned.expenses = `✅ Eliminados ${expenseIds.length} gastos`;
        report.counts.expenses = expenseIds.length;
        console.log(`  ✓ ${expenseIds.length} gastos eliminados`);
      }
    } else {
      report.counts.expenses = 0;
      console.log('  ✓ Sin gastos para eliminar');
    }

    // PASO 5: Eliminar ingresos
    console.log('  → Eliminando ingresos...');
    if (incomeIds.length > 0) {
      const { error: deleteIncomeError } = await supabase
        .from('income')
        .delete()
        .eq('firm_id', firmId);

      if (deleteIncomeError) {
        report.errors.push(`Error eliminando ingresos: ${deleteIncomeError.message}`);
        console.error('  ❌ Error eliminando ingresos:', deleteIncomeError);
      } else {
        report.cleaned.income = `✅ Eliminados ${incomeIds.length} ingresos`;
        report.counts.income = incomeIds.length;
        console.log(`  ✓ ${incomeIds.length} ingresos eliminados`);
      }
    } else {
      report.counts.income = 0;
      console.log('  ✓ Sin ingresos para eliminar');
    }

    // PASO 6: Eliminar trabajos
    console.log('  → Eliminando trabajos...');
    if (workIds.length > 0) {
      const { error: deleteWorksError } = await supabase
        .from('works')
        .delete()
        .eq('firm_id', firmId);

      if (deleteWorksError) {
        report.errors.push(`Error eliminando trabajos: ${deleteWorksError.message}`);
        console.error('  ❌ Error eliminando trabajos:', deleteWorksError);
      } else {
        report.cleaned.works = `✅ Eliminados ${workIds.length} trabajos`;
        report.counts.works = workIds.length;
        console.log(`  ✓ ${workIds.length} trabajos eliminados`);
      }
    } else {
      report.counts.works = 0;
      console.log('  ✓ Sin trabajos para eliminar');
    }

    if (report.errors.length > 0) {
      report.success = false;
      console.error(`  ❌ Eliminación en cascada fallida con errores`);
    } else {
      console.log(`  ✅ Eliminación en cascada completada exitosamente`);
    }
  } catch (error) {
    report.success = false;
    report.errors.push(`Error general en eliminación en cascada: ${error.message}`);
    console.error('❌ Error inesperado en cleanupUserCreatedData:', error);
  }

  return report;
}

/**
 * PASO 2: Limpiar dependencias auto-creadas ANTES de eliminar
 *
 * NOTA CRÍTICA: Las políticas RLS de Supabase pueden bloquear DELETEs
 * incluso para usuarios admin. Por eso intentamos de múltiples formas:
 * 1. DELETE estándar (a través de cliente autenticado)
 * 2. Si falla, reportamos el error pero continuamos (para no bloquear totalmente)
 *
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Reporte de limpieza
 */
export async function cleanupFirmDependencies(firmId) {
  const report = {
    success: true,
    cleaned: {},
    errors: [],
    rls_warnings: []
  };

  try {
    console.log(`🧹 Iniciando limpieza de dependencias para firma: ${firmId}`);

    // 1. Limpiar registros de auditoría
    console.log('  → Limpiando tabla audit...');
    const { error: auditError } = await supabase
      .from('audit')
      .delete()
      .eq('firm_id', firmId);

    if (auditError) {
      // RLS probablemente está bloqueando - registrar pero no fallar
      console.warn(`  ⚠️ Error limpiando audit (posible RLS):`, auditError.message);
      report.rls_warnings.push(`Audit: ${auditError.message} (puede ser bloqueado por RLS)`);
      // NO agregamos a errors - intentamos continuar
    } else {
      report.cleaned.audit = '✅ Limpiado';
      console.log('  ✓ Audit limpiado');
    }

    // 2. Limpiar acceso usuario-firma
    console.log('  → Limpiando tabla user_firm_access...');
    const { error: accessError } = await supabase
      .from('user_firm_access')
      .delete()
      .eq('firm_id', firmId);

    if (accessError) {
      console.warn(`  ⚠️ Error limpiando user_firm_access:`, accessError.message);
      report.rls_warnings.push(`User Access: ${accessError.message}`);
    } else {
      report.cleaned.userFirmAccess = '✅ Limpiado';
      console.log('  ✓ User firm access limpiado');
    }

    // 3. Limpiar cuentas contables (si existen)
    console.log('  → Investigando chart_of_accounts...');
    const { data: accounts, error: accountsError } = await supabase
      .from('chart_of_accounts')
      .select('id', { count: 'exact' })
      .eq('firm_id', firmId);

    if (!accountsError && accounts && accounts.length > 0 && accounts.length <= 100) {
      // Parece ser auto-creadas (setup estándar, no muchas)
      console.log(`  → Limpiando ${accounts.length} cuentas contables...`);
      const { error: coaError } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('firm_id', firmId);

      if (!coaError) {
        report.cleaned.chartOfAccounts = `✅ Limpiado (${accounts.length} cuentas)`;
        console.log(`  ✓ ${accounts.length} cuentas contables limpiadas`);
      } else {
        console.warn(`  ⚠️ Error limpiando COA:`, coaError.message);
        report.rls_warnings.push(`Chart of Accounts: ${coaError.message}`);
      }
    }

    // 4. Limpiar centros de costo
    console.log('  → Investigando cost_centers...');
    const { data: centers, error: centersError } = await supabase
      .from('cost_centers')
      .select('id', { count: 'exact' })
      .eq('firm_id', firmId);

    if (!centersError && centers && centers.length > 0 && centers.length <= 50) {
      console.log(`  → Limpiando ${centers.length} centros de costo...`);
      const { error: ccError } = await supabase
        .from('cost_centers')
        .delete()
        .eq('firm_id', firmId);

      if (!ccError) {
        report.cleaned.costCenters = `✅ Limpiado (${centers.length} centros)`;
        console.log(`  ✓ ${centers.length} centros de costo limpiados`);
      } else {
        console.warn(`  ⚠️ Error limpiando cost centers:`, ccError.message);
        report.rls_warnings.push(`Cost Centers: ${ccError.message}`);
      }
    }

    // Si hay warnings de RLS pero no errores críticos, marca como éxito parcial
    if (report.rls_warnings.length > 0 && report.errors.length === 0) {
      report.success = true; // Continuar intentando delete de firma
      console.log(`  ⚠️ Limpieza parcial: RLS bloqueó algunas tablas pero continuamos`);
    }

    if (report.errors.length > 0) {
      report.success = false;
      console.error(`  ❌ Limpieza fallida con errores críticos`);
    }
  } catch (error) {
    report.success = false;
    report.errors.push(`Error general en cleanup: ${error.message}`);
    console.error('❌ Error inesperado en cleanupFirmDependencies:', error);
  }

  console.log(`🧹 Limpieza completada. Éxito: ${report.success}`);
  return report;
}

/**
 * PASO 3: Función orquestadora de eliminación de firma
 * @param {Object} params
 * @param {string} params.firmId - ID de la firma a eliminar
 * @param {string} params.firmName - Nombre de la firma (para auditoría)
 * @param {string} params.userId - ID del usuario realizando la acción
 * @param {boolean} params.forceDelete - Si es true, elimina en cascada todos los datos relacionados
 * @returns {Promise<Object>} Resultado de la eliminación
 */
export async function deleteFirmWithCleanup({
  firmId,
  firmName,
  userId,
  forceDelete = false
}) {
  const result = {
    success: false,
    message: '',
    blockers: [],
    cleaned: {},
    cascadeDeleted: {}
  };

  try {
    // PASO 1: Verificar dependencias
    const deps = await checkFirmDependencies(firmId);

    // PASO 2: Detectar bloqueadores (datos user-created)
    const blockers = Object.entries(deps)
      .filter(([key, dep]) => !dep.canDelete && dep.count > 0)
      .map(([key, dep]) => ({
        table: key,
        count: dep.count,
        description: dep.description
      }));

    // Si hay bloqueadores y no se fuerza la eliminación, retornar error
    if (blockers.length > 0 && !forceDelete) {
      result.message = `No se puede eliminar la firma porque contiene datos: ${blockers.map(b => b.description).join(', ')}`;
      result.blockers = blockers;
      return result;
    }

    // Si se fuerza la eliminación, eliminar primero los datos relacionados
    if (blockers.length > 0 && forceDelete) {
      console.log(`⚠️ Eliminación forzada: eliminando ${blockers.length} tipos de datos relacionados...`);
      const cascadeResult = await cleanupUserCreatedData(firmId);
      result.cascadeDeleted = cascadeResult.counts;
      
      if (!cascadeResult.success) {
        result.message = `Error eliminando datos relacionados: ${cascadeResult.errors.join('; ')}`;
        result.cleaned = cascadeResult.cleaned;
        return result;
      }
      
      // Agregar los datos eliminados al reporte de limpieza
      Object.assign(result.cleaned, cascadeResult.cleaned);
      console.log(`✅ Datos relacionados eliminados:`, cascadeResult.counts);
    }

    // PASO 3: Limpiar dependencias auto-creadas
    const cleanup = await cleanupFirmDependencies(firmId);
    result.cleaned = cleanup.cleaned;

    if (!cleanup.success && cleanup.errors.length > 0) {
      result.message = `Error limpiando dependencias: ${cleanup.errors.join('; ')}`;
      return result;
    }

    // PASO 4: Eliminar la firma
    // Intentar primero con función RPC (si está disponible después del FIX)
    // Si no está disponible o timeout, intentar DELETE directo
    let deleteError = null;
    let rpcSuccess = false;

    try {
      console.log('  → Intentando eliminar con RPC (modo seguro)...');

      // Promise con timeout explícito (5 segundos)
      const rpcPromise = supabase
        .rpc('delete_firm_with_cleanup', { firm_id: firmId });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout after 5s')), 5000)
      );

      try {
        const { data: rpcResult, error: rpcError } = await Promise.race([
          rpcPromise,
          timeoutPromise
        ]);

        if (rpcError) {
          console.warn('  ⚠️ RPC error:', rpcError.message);
          console.log('  ⚠️ Fallback: Intentando DELETE directo...');
          rpcSuccess = false;
        } else if (rpcResult && !rpcResult.success) {
          console.warn('  ⚠️ RPC reportó error:', rpcResult.message);
          console.log('  ⚠️ Fallback: Intentando DELETE directo...');
          rpcSuccess = false;
        } else if (rpcResult && rpcResult.success) {
          console.log('  ✓ Firma eliminada exitosamente con RPC');
          result.success = true;
          result.message = `Firma "${firmName}" eliminada exitosamente`;
          return result;
        }
      } catch (raceError) {
        // Timeout o error en Promise.race
        console.warn(`  ⚠️ RPC no respondió (timeout o no existe): ${raceError.message}`);
        console.log('  ⚠️ Fallback: Intentando DELETE directo...');
        rpcSuccess = false;
      }
    } catch (rpcException) {
      console.warn('  ⚠️ Excepción en RPC:', rpcException.message);
      console.log('  ⚠️ Fallback: Intentando DELETE directo...');
      rpcSuccess = false;
    }

    // Si RPC no fue exitoso, intentar DELETE directo
    if (!rpcSuccess) {
      try {
        console.log('  → Ejecutando DELETE directo en tabla firms...');
        const { error: directDeleteError } = await supabase
          .from('firms')
          .delete()
          .eq('id', firmId);
        deleteError = directDeleteError;

        if (!deleteError) {
          console.log('  ✓ Firma eliminada exitosamente con DELETE directo');
          result.success = true;
          result.message = `Firma "${firmName}" eliminada exitosamente (sin RPC)`;

          // Registrar en auditoría y retornar
          try {
            await crearRegistro({
              firmId,
              tipo: 'firma_eliminada',
              descripcion: `Firma "${firmName}" eliminada (fallback DELETE)`,
              moduloOrigen: 'firmas',
              usuario: userId || 'sistema',
              referencia: firmId,
              metadata: {
                nombre: firmName,
                method: 'DELETE_DIRECTO',
                dependenciesCleared: Object.keys(cleanup.cleaned)
              }
            });
          } catch (auditError) {
            console.warn('Firma eliminada pero error en auditoría:', auditError);
          }
          return result;
        }
      } catch (directException) {
        console.error('  ❌ Error en DELETE directo:', directException.message);
        deleteError = new Error(directException.message);
      }
    }

    // Si llegamos aquí, DELETE directo también falló
    if (deleteError) {
      console.error('  ❌ DELETE DIRECTO FALLÓ:', deleteError);
      result.message = `Error eliminando firma: ${deleteError.message || JSON.stringify(deleteError)}`;

      // Detectar tipo de error específico para mensaje más útil
      const errorStr = JSON.stringify(deleteError);
      const isRLSError = deleteError.status === 409 || deleteError.code === '23503' || errorStr.includes('security');
      const isFK = deleteError.code === '23503' || errorStr.includes('foreign key');

      if (isRLSError) {
        console.warn('  ⚠️ BLOQUEADOR RLS DETECTADO');
        result.message = `⚠️ BLOQUEADOR RLS: Las políticas de seguridad de Supabase impiden la eliminación.`;
        result.message += `\n\n📋 SOLUCIÓN: Ejecutar el script SQL que crea la función RPC con permisos elevados.`;
        result.message += `\nArchivo: src/sql/fix_firm_deletion_rls.sql`;
        result.message += `\nURL Supabase: https://app.supabase.com/project/ewkelozzomeroiifnkej/sql/new`;
        result.message += `\n\nPASONS:`;
        result.message += `\n1. Copiar TODO el contenido de src/sql/fix_firm_deletion_rls.sql`;
        result.message += `\n2. Ir a la URL anterior`;
        result.message += `\n3. Pegar el código en el editor SQL`;
        result.message += `\n4. Hacer clic en RUN o presionar Ctrl+Enter`;
        result.message += `\n5. Verificar que aparezca: 'Successfully created function'`;
        result.message += `\n6. Reintentar esta eliminación`;
      } else if (isFK) {
        result.message = `⚠️ FK CONSTRAINT: Existen registros relacionados que impiden la eliminación.`;
        result.message += `\n\nSOLUCIÓN: El script SQL en src/sql/fix_firm_deletion_rls.sql también soluciona esto.`;
      }

      return result;
    }

    // ÉXITO
    result.success = true;
    result.message = `Firma "${firmName}" eliminada exitosamente`;

    // Registrar en auditoría (con admin token) si es posible
    try {
      await crearRegistro({
        firmId,
        tipo: 'firma_eliminada',
        descripcion: `Firma "${firmName}" eliminada permanentemente`,
        moduloOrigen: 'firmas',
        usuario: userId || 'sistema',
        referencia: firmId,
        metadata: {
          nombre: firmName,
          dependenciesCleared: Object.keys(cleanup.cleaned)
        }
      });
    } catch (auditError) {
      console.warn('Firma eliminada pero error en auditoría:', auditError);
    }

  } catch (error) {
    result.message = `Error inesperado: ${error.message}`;
    console.error('Error en deleteFirmWithCleanup:', error);
  }

  return result;
}

/**
 * Función de diagnóstico para debugging
 */
export async function diagnosticFirmDeletion(firmId) {
  console.log(`📊 DIAGNÓSTICO DE ELIMINACIÓN - Firma: ${firmId}`);
  console.log('=====================================\n');

  const deps = await checkFirmDependencies(firmId);

  console.log('Dependencias encontradas:');
  for (const [key, dep] of Object.entries(deps)) {
    if (dep.count > 0) {
      console.log(`  ❌ ${key}: ${dep.count} registros (${dep.description})`);
    } else {
      console.log(`  ✅ ${key}: sin datos`);
    }
  }

  console.log('\nPuede eliminarse:',
    Object.values(deps).every(d => d.canDelete || d.count === 0) ? '✅ SÍ' : '❌ NO'
  );
}
