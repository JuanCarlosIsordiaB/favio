/**
 * Servicio de Alertas Automáticas - FASE 5
 *
 * Funcionalidades:
 * - Verificación automática de 4 condiciones críticas
 * - Creación de alertas con deduplicación
 * - Limpieza de alertas resueltas
 * - Integración con auditoría
 */

import { supabase } from '../lib/supabase';
import { REGLAS_ALERTAS } from '../lib/alertas.config';
import { crearRegistro } from './registros';

console.log('[Alertas] Módulo alertas.js cargado');

/**
 * Crea una alerta automática en la base de datos
 * Verifica que no exista duplicada antes de crear
 *
 * @param {Object} params
 * @param {string} params.firmaId - ID de la firma
 * @param {string} params.predioId - ID del predio
 * @param {string} params.loteId - ID del lote (para alertas automáticas)
 * @param {string} params.tipo - Tipo: 'alerta' | 'recordatorio'
 * @param {string} params.titulo - Título de la alerta
 * @param {string} params.descripcion - Descripción detallada
 * @param {string} params.prioridad - Prioridad: 'alta' | 'media' | 'baja'
 * @param {string} params.reglaAplicada - ID de la regla (pastura_critica, etc)
 * @param {Object} params.metadata - Datos adicionales para auditoría
 * @returns {Promise<Object>} { created, alerta, reason }
 */
export async function crearAlertaAutomatica({
  firmaId,
  predioId,
  loteId,
  tipo = 'alerta',
  titulo,
  descripcion,
  prioridad = 'media',
  reglaAplicada,
  metadata = {},
}) {
  try {
    console.log('[Alertas] Creando alerta automática:', { titulo, reglaAplicada, loteId });

    // Verificar si ya existe una alerta similar pendiente (deduplicación)
    const { data: existente, error: errorQuery } = await supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmaId)
      .eq('lot_id', loteId)
      .eq('regla_aplicada', reglaAplicada)
      .eq('estado', 'pendiente')
      .eq('origen', 'automatica');

    if (errorQuery) {
      console.error('[Alertas] Error verificando duplicados:', errorQuery);
      throw errorQuery;
    }

    if (existente && existente.length > 0) {
      console.log('[Alertas] Alerta duplicada detectada, omitiendo creación');
      return {
        created: false,
        alerta: existente[0],
        reason: 'duplicate',
      };
    }

    // Crear nueva alerta
    const { data: alerta, error } = await supabase
      .from('alerts')
      .insert([
        {
          firm_id: firmaId,
          premise_id: predioId,
          lot_id: loteId,
          tipo,
          titulo,
          descripcion,
          prioridad,
          origen: 'automatica',
          regla_aplicada: reglaAplicada,
          estado: 'pendiente',
          fecha: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[Alertas] Error creando alerta:', error);
      throw error;
    }

    console.log('[Alertas] ✓ Alerta creada exitosamente:', alerta.id);

    // Registrar en auditoría
    try {
      await crearRegistro({
        firmId: firmaId,
        premiseId: predioId,
        lotId: loteId,
        tipo: 'monitoreo',
        descripcion: `Alerta automática creada: ${titulo}`,
        moduloOrigen: 'alertas_automaticas',
        usuario: 'sistema',
        referencia: alerta.id,
        metadata: {
          reglaAplicada,
          loteId,
          prioridad,
          ...metadata,
        },
      });
    } catch (regError) {
      console.error('[Alertas] Error en auditoría:', regError);
      // No bloquear si falla la auditoría
    }

    return {
      created: true,
      alerta,
      reason: 'new',
    };
  } catch (error) {
    console.error('[Alertas] Error en crearAlertaAutomatica:', error);
    throw error;
  }
}

/**
 * Verifica lotes con pastura crítica (altura < remanente)
 * @param {string} predioId - ID del predio
 * @returns {Promise<Array>} Array de alertas creadas
 */
export async function verificarPasturaCritica(predioId) {
  console.log('[Alertas] Verificando pastura crítica en predio:', predioId);

  try {
    const regla = REGLAS_ALERTAS.PASTURA_CRITICA;
    if (!regla.enabled) {
      console.log('[Alertas] Regla PASTURA_CRITICA deshabilitada');
      return [];
    }

    // Obtener todos los lotes del predio
    const { data: lotes, error } = await supabase
      .from('lots')
      .select('*')
      .eq('premise_id', predioId)
      .eq('activo', true);

    if (error) throw error;

    const alertasCreadas = [];

    for (const lote of lotes) {
      const esValido = regla.validarLote(lote);

      if (esValido === true) {
        const mensaje = regla.generarMensaje(lote);

        const resultado = await crearAlertaAutomatica({
          firmaId: lote.firm_id,
          predioId: lote.premise_id,
          loteId: lote.id,
          tipo: regla.tipo,
          titulo: mensaje.titulo,
          descripcion: mensaje.descripcion,
          prioridad: regla.prioridad,
          reglaAplicada: regla.id,
          metadata: {
            altura_actual: lote.altura_pastura_cm,
            remanente_objetivo: lote.remanente_objetivo_cm,
          },
        });

        if (resultado.created) {
          alertasCreadas.push(resultado.alerta);
        }
      }
    }

    console.log(`[Alertas] ✓ Pastura crítica: ${alertasCreadas.length} alertas creadas`);
    return alertasCreadas;
  } catch (error) {
    console.error('[Alertas] Error en verificarPasturaCritica:', error);
    throw error;
  }
}

/**
 * Verifica lotes con medición vencida (sin medir > X días)
 * @param {string} predioId - ID del predio
 * @param {number} diasUmbral - Días sin medición
 * @returns {Promise<Array>} Array de alertas creadas
 */
export async function verificarMedicionVencida(predioId, diasUmbral = 14) {
  console.log('[Alertas] Verificando mediciones vencidas en predio:', predioId);

  try {
    const regla = REGLAS_ALERTAS.MEDICION_VENCIDA;
    if (!regla.enabled) return [];

    const { data: lotes, error } = await supabase
      .from('lots')
      .select('*')
      .eq('premise_id', predioId)
      .eq('activo', true);

    if (error) throw error;

    const alertasCreadas = [];

    for (const lote of lotes) {
      const esValido = regla.validarLote(lote, diasUmbral);

      if (esValido === true) {
        const mensaje = regla.generarMensaje(lote, diasUmbral);

        const resultado = await crearAlertaAutomatica({
          firmaId: lote.firm_id,
          predioId: lote.premise_id,
          loteId: lote.id,
          tipo: regla.tipo,
          titulo: mensaje.titulo,
          descripcion: mensaje.descripcion,
          prioridad: regla.prioridad,
          reglaAplicada: regla.id,
          metadata: {
            fecha_ultima_medicion: lote.fecha_medicion_pastura,
            dias_umbral: diasUmbral,
          },
        });

        if (resultado.created) {
          alertasCreadas.push(resultado.alerta);
        }
      }
    }

    console.log(`[Alertas] ✓ Mediciones vencidas: ${alertasCreadas.length} alertas creadas`);
    return alertasCreadas;
  } catch (error) {
    console.error('[Alertas] Error en verificarMedicionVencida:', error);
    throw error;
  }
}

/**
 * Verifica depósitos sin control (sin actualizar > X días)
 * @param {string} firmaId - ID de la firma
 * @param {number} diasUmbral - Días sin actualización
 * @returns {Promise<Array>} Array de alertas creadas
 */
export async function verificarDepositosSinControl(firmaId, diasUmbral = 21) {
  console.log('[Alertas] Verificando depósitos sin control en firma:', firmaId);

  try {
    const regla = REGLAS_ALERTAS.DEPOSITO_SIN_CONTROL;
    if (!regla.enabled) return [];

    // Buscar todos los lotes depósito de la firma
    const { data: lotes, error } = await supabase
      .from('lots')
      .select('*')
      .eq('firm_id', firmaId)
      .eq('funciona_como_deposito', true)
      .eq('activo', true);

    if (error) throw error;

    const alertasCreadas = [];

    for (const lote of lotes) {
      const esValido = regla.validarLote(lote, diasUmbral);

      if (esValido === true) {
        const mensaje = regla.generarMensaje(lote, diasUmbral);

        const resultado = await crearAlertaAutomatica({
          firmaId: lote.firm_id,
          predioId: lote.premise_id,
          loteId: lote.id,
          tipo: regla.tipo,
          titulo: mensaje.titulo,
          descripcion: mensaje.descripcion,
          prioridad: regla.prioridad,
          reglaAplicada: regla.id,
          metadata: {
            fecha_actualizacion: lote.updated_at,
            dias_umbral: diasUmbral,
          },
        });

        if (resultado.created) {
          alertasCreadas.push(resultado.alerta);
        }
      }
    }

    console.log(`[Alertas] ✓ Depósitos sin control: ${alertasCreadas.length} alertas creadas`);
    return alertasCreadas;
  } catch (error) {
    console.error('[Alertas] Error en verificarDepositosSinControl:', error);
    throw error;
  }
}

/**
 * Verifica lotes con NDVI bajo umbral (estrés vegetal)
 * @param {string} predioId - ID del predio
 * @param {number} umbralNDVI - Umbral NDVI crítico
 * @returns {Promise<Array>} Array de alertas creadas
 */
export async function verificarNDVIBajo(predioId, umbralNDVI = 0.4) {
  console.log('[Alertas] Verificando NDVI bajo en predio:', predioId);

  try {
    const regla = REGLAS_ALERTAS.NDVI_BAJO;
    if (!regla.enabled) return [];

    // Obtener lotes con valores NDVI disponibles
    const { data: lotes, error } = await supabase
      .from('lots')
      .select('*')
      .eq('premise_id', predioId)
      .eq('activo', true)
      .not('ndvi_valor', 'is', null);

    if (error) throw error;

    const alertasCreadas = [];

    for (const lote of lotes) {
      const esValido = regla.validarLote(lote, umbralNDVI);

      if (esValido === true) {
        const mensaje = regla.generarMensaje(lote, umbralNDVI);

        const resultado = await crearAlertaAutomatica({
          firmaId: lote.firm_id,
          predioId: lote.premise_id,
          loteId: lote.id,
          tipo: regla.tipo,
          titulo: mensaje.titulo,
          descripcion: mensaje.descripcion,
          prioridad: regla.prioridad,
          reglaAplicada: regla.id,
          metadata: {
            ndvi_valor: lote.ndvi_valor,
            ndvi_fecha: lote.ndvi_fecha_actualizacion,
            umbral_ndvi: umbralNDVI,
          },
        });

        if (resultado.created) {
          alertasCreadas.push(resultado.alerta);
        }
      }
    }

    console.log(`[Alertas] ✓ NDVI bajo: ${alertasCreadas.length} alertas creadas`);
    return alertasCreadas;
  } catch (error) {
    console.error('[Alertas] Error en verificarNDVIBajo:', error);
    throw error;
  }
}

/**
 * Ejecuta TODAS las verificaciones automáticas de forma paralela
 * Este es el punto de entrada principal para verificación de alertas
 *
 * @param {string} firmaId - ID de la firma
 * @param {string} predioId - ID del predio (opcional, si null verifica toda la firma)
 * @param {Object} opciones - Opciones de verificación
 * @returns {Promise<Object>} Resumen de verificación con estadísticas
 */
export async function ejecutarVerificacionesAutomaticas(
  firmaId,
  predioId = null,
  opciones = {}
) {
  console.log('[Alertas] ===== Iniciando verificación automática =====');
  console.log('[Alertas] Firma:', firmaId, '| Predio:', predioId || 'TODOS');

  const {
    diasMedicionVencida = 14,
    diasDepositoSinControl = 21,
    umbralNDVI = 0.4,
    limpiarResueltas = true,
  } = opciones;

  try {
    const resultados = {
      timestamp: new Date().toISOString(),
      firmaId,
      predioId,
      totalAlertas: 0,
      alertasPorRegla: {},
    };

    // Obtener lista de predios a verificar
    let prediosAVerificar = [];

    if (predioId) {
      const { data: predio } = await supabase
        .from('premises')
        .select('id')
        .eq('id', predioId)
        .single();

      if (predio) prediosAVerificar = [predio.id];
    } else {
      const { data: predios } = await supabase
        .from('premises')
        .select('id')
        .eq('firm_id', firmaId);

      if (predios) prediosAVerificar = predios.map(p => p.id);
    }

    console.log(`[Alertas] Verificando ${prediosAVerificar.length} predio(s)...`);

    // Ejecutar verificaciones por predio en paralelo
    for (const pid of prediosAVerificar) {
      const [pasturaCritica, medicionVencida, ndviBajo] = await Promise.all([
        verificarPasturaCritica(pid),
        verificarMedicionVencida(pid, diasMedicionVencida),
        verificarNDVIBajo(pid, umbralNDVI),
      ]);

      resultados.alertasPorRegla[pid] = {
        pastura_critica: pasturaCritica.length,
        medicion_vencida: medicionVencida.length,
        ndvi_bajo: ndviBajo.length,
      };

      resultados.totalAlertas +=
        pasturaCritica.length + medicionVencida.length + ndviBajo.length;
    }

    // Verificar depósitos (a nivel firma, no por predio)
    const depositosSinControl = await verificarDepositosSinControl(
      firmaId,
      diasDepositoSinControl
    );

    resultados.alertasPorRegla.depositos_sin_control = depositosSinControl.length;
    resultados.totalAlertas += depositosSinControl.length;

    // Limpiar alertas resueltas si está habilitado
    if (limpiarResueltas) {
      const limpieza = await limpiarAlertasResueltas(firmaId, predioId);
      resultados.alertasLimpiadas = limpieza.eliminadas;
    }

    console.log('[Alertas] ✓ Verificación completada:', resultados.totalAlertas, 'alertas generadas');

    // Registrar en auditoría
    try {
      await crearRegistro({
        firmId: firmaId,
        premiseId: predioId,
        lotId: null,
        tipo: 'monitoreo',
        descripcion: `Verificación automática ejecutada: ${resultados.totalAlertas} alertas generadas`,
        moduloOrigen: 'alertas_automaticas',
        usuario: 'sistema',
        metadata: resultados,
      });
    } catch (regError) {
      console.error('[Alertas] Error en auditoría de verificación:', regError);
    }

    console.log('[Alertas] ===== Verificación completada =====\n');

    return resultados;
  } catch (error) {
    console.error('[Alertas] Error en verificaciones automáticas:', error);
    throw error;
  }
}

/**
 * Limpia alertas automáticas que ya no aplican
 * Si la condición se resolvió, marca la alerta como completada
 *
 * @param {string} firmaId - ID de la firma
 * @param {string} predioId - ID del predio (opcional)
 * @returns {Promise<Object>} { eliminadas, alertas }
 */
export async function limpiarAlertasResueltas(firmaId, predioId = null) {
  console.log('[Alertas] Limpiando alertas resueltas...');

  try {
    // Obtener todas las alertas automáticas pendientes
    let query = supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmaId)
      .eq('origen', 'automatica')
      .eq('estado', 'pendiente');

    if (predioId) {
      query = query.eq('premise_id', predioId);
    }

    const { data: alertas, error } = await query;

    if (error) throw error;

    const alertasALimpiar = [];

    // Verificar cada alerta si su condición aún aplica
    for (const alerta of alertas) {
      if (!alerta.lote_id || !alerta.regla_aplicada) continue;

      // Obtener lote actual
      const { data: lote } = await supabase
        .from('lots')
        .select('*')
        .eq('id', alerta.lot_id)
        .single();

      if (!lote) {
        // Lote fue eliminado, marcar alerta como completada
        alertasALimpiar.push(alerta.id);
        continue;
      }

      // Obtener regla y verificar si aún aplica
      const reglaId = alerta.regla_aplicada;
      const regla = Object.values(REGLAS_ALERTAS).find(r => r.id === reglaId);

      if (!regla) {
        console.warn('[Alertas] Regla no encontrada:', reglaId);
        continue;
      }

      // Validar si la condición aún se cumple
      const aúnAplica = regla.validarLote(lote);

      if (aúnAplica !== true) {
        // La condición ya no se cumple
        console.log('[Alertas] Alerta resuelta:', alerta.titulo);
        alertasALimpiar.push(alerta.id);
      }
    }

    // Marcar alertas como completadas (no las eliminamos, solo cambiamos estado)
    if (alertasALimpiar.length > 0) {
      const { error: updateError } = await supabase
        .from('alerts')
        .update({
          estado: 'completado',
          updated_at: new Date().toISOString(),
        })
        .in('id', alertasALimpiar);

      if (updateError) throw updateError;

      console.log(`[Alertas] ✓ ${alertasALimpiar.length} alertas marcadas como resueltas`);
    }

    return {
      eliminadas: alertasALimpiar.length,
      alertas: alertasALimpiar,
    };
  } catch (error) {
    console.error('[Alertas] Error limpiando alertas resueltas:', error);
    throw error;
  }
}

/**
 * Carga alertas pendientes para un lote específico
 *
 * @param {string} loteId - ID del lote
 * @returns {Promise<Array>} Array de alertas pendientes para el lote
 */
export async function cargarAlertasPorLote(loteId) {
  try {
    console.log('[Alertas] Cargando alertas para lote:', loteId);

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('lot_id', loteId)
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: false });

    if (error) throw error;

    console.log(`[Alertas] ✓ ${data?.length || 0} alertas encontradas para lote`);
    return data || [];
  } catch (error) {
    console.error('[Alertas] Error cargando alertas por lote:', error);
    throw error;
  }
}

/**
 * Carga alertas pendientes de un predio, agrupadas por lote
 * Útil para visualizar en mapa qué lotes tienen alertas
 *
 * @param {string} predioId - ID del predio
 * @returns {Promise<Object>} { loteId: [alertas] }
 */
export async function cargarAlertasPorPredio(predioId) {
  try {
    console.log('[Alertas] Cargando alertas para predio:', predioId);

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('premise_id', predioId)
      .eq('estado', 'pendiente')
      .not('lot_id', 'is', null)
      .order('fecha', { ascending: false });

    if (error) throw error;

    // Agrupar por lote_id
    const alertasPorLote = {};

    if (data) {
      data.forEach(alerta => {
        if (!alertasPorLote[alerta.lot_id]) {
          alertasPorLote[alerta.lot_id] = [];
        }
        alertasPorLote[alerta.lot_id].push(alerta);
      });
    }

    console.log(`[Alertas] ✓ Alertas de ${Object.keys(alertasPorLote).length} lote(s) cargadas`);
    return alertasPorLote;
  } catch (error) {
    console.error('[Alertas] Error cargando alertas por predio:', error);
    throw error;
  }
}

/**
 * Elimina una alerta de la base de datos
 *
 * @param {string} alertaId - ID de la alerta a eliminar
 * @returns {Promise<boolean>} true si se eliminó exitosamente
 */
export async function eliminarAlerta(alertaId) {
  try {
    console.log('[Alertas] Eliminando alerta:', alertaId);

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertaId);

    if (error) throw error;

    console.log('[Alertas] ✓ Alerta eliminada exitosamente');
    return true;
  } catch (error) {
    console.error('[Alertas] Error eliminando alerta:', error);
    throw error;
  }
}

/**
 * Actualiza todos los campos de una alerta
 *
 * @param {string} alertaId - ID de la alerta
 * @param {Object} datosActualizacion - Campos a actualizar
 * @returns {Promise<Object>} Alerta actualizada
 */
export async function actualizarAlerta(alertaId, datosActualizacion) {
  try {
    console.log('[Alertas] Actualizando alerta:', alertaId, datosActualizacion);

    const { data, error } = await supabase
      .from('alerts')
      .update({
        ...datosActualizacion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertaId)
      .select()
      .single();

    if (error) throw error;

    console.log('[Alertas] ✓ Alerta actualizada exitosamente');
    return data;
  } catch (error) {
    console.error('[Alertas] Error actualizando alerta:', error);
    throw error;
  }
}

/**
 * Actualiza solo el estado de una alerta
 *
 * @param {string} alertaId - ID de la alerta
 * @param {string} nuevoEstado - Nuevo estado: 'pending' | 'completed' | 'cancelled' | 'atrasada'
 * @returns {Promise<Object>} Alerta actualizada
 */
export async function actualizarEstadoAlerta(alertaId, nuevoEstado) {
  try {
    console.log('[Alertas] Cambiando estado de alerta a:', nuevoEstado);

    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertaId)
      .select()
      .single();

    if (error) throw error;

    console.log('[Alertas] ✓ Estado actualizado a:', nuevoEstado);
    return data;
  } catch (error) {
    console.error('[Alertas] Error actualizando estado:', error);
    throw error;
  }
}

/**
 * Verifica alertas pendientes cuya fecha ya pasó
 * y las marca automáticamente como "atrasada"
 *
 * @param {string} firmaId - ID de la firma
 * @returns {Promise<Object>} { actualizadas, alertas }
 */
export async function verificarYActualizarAtrasadas(firmaId) {
  try {
    console.log('[Alertas] Verificando alertas atrasadas para firma:', firmaId);

    const hoy = new Date().toISOString().split('T')[0];

    // Obtener alertas pendientes con fecha anterior a hoy
    const { data: alertasAtrasadas, error: errorQuery } = await supabase
      .from('alerts')
      .select('id, title, alert_date, status')
      .eq('firm_id', firmaId)
      .eq('status', 'pending')
      .lt('alert_date', hoy);

    if (errorQuery) throw errorQuery;

    if (!alertasAtrasadas || alertasAtrasadas.length === 0) {
      console.log('[Alertas] ✓ No hay alertas atrasadas');
      return { actualizadas: 0, alertas: [] };
    }

    // Actualizar a estado "atrasada"
    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'atrasada',
        updated_at: new Date().toISOString(),
      })
      .eq('firm_id', firmaId)
      .eq('status', 'pending')
      .lt('alert_date', hoy);

    if (updateError) throw updateError;

    console.log(`[Alertas] ✓ ${alertasAtrasadas.length} alertas marcadas como atrasadas`);
    return {
      actualizadas: alertasAtrasadas.length,
      alertas: alertasAtrasadas,
    };
  } catch (error) {
    console.error('[Alertas] Error verificando alertas atrasadas:', error);
    throw error;
  }
}

/**
 * Carga una alerta específica por ID
 *
 * @param {string} alertaId - ID de la alerta
 * @returns {Promise<Object>} Datos completos de la alerta
 */
export async function obtenerAlerta(alertaId) {
  try {
    console.log('[Alertas] Obteniendo alerta:', alertaId);

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertaId)
      .single();

    if (error) throw error;

    console.log('[Alertas] ✓ Alerta obtenida');
    return data;
  } catch (error) {
    console.error('[Alertas] Error obteniendo alerta:', error);
    throw error;
  }
}

/**
 * Busca alertas por título
 *
 * @param {string} firmaId - ID de la firma
 * @param {string} titulo - Título a buscar (búsqueda parcial)
 * @returns {Promise<Array>} Array de alertas que coinciden
 */
export async function buscarAlertasPorTitulo(firmaId, titulo) {
  try {
    console.log('[Alertas] Buscando alertas con título:', titulo);

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('firm_id', firmaId)
      .ilike('title', `%${titulo}%`)
      .order('alert_date', { ascending: false });

    if (error) throw error;

    console.log(`[Alertas] ✓ ${data?.length || 0} alertas encontradas`);
    return data || [];
  } catch (error) {
    console.error('[Alertas] Error buscando alertas:', error);
    throw error;
  }
}

/**
 * Crea una alerta desde un KPI (Módulo 15)
 * Reutiliza crearAlertaAutomatica() para mantener consistencia
 *
 * @param {Object} params
 * @param {string} params.firmId - ID de la firma
 * @param {string} params.kpiCode - Código del KPI (ej: 'GDP', 'MORTALIDAD')
 * @param {string} params.kpiName - Nombre del KPI
 * @param {number} params.value - Valor actual del KPI
 * @param {number} params.threshold - Umbral para comparación
 * @param {string} params.status - Status: 'AMARILLO' | 'ROJO'
 * @param {number} params.daysInStatus - Días que lleva en este estado
 * @param {string} params.lotId - ID del lote (opcional)
 * @param {string} params.premiseId - ID del predio (opcional)
 * @param {Object} params.metadata - Metadata adicional
 * @returns {Promise<Object>} { created, alerta, reason }
 */
export async function crearAlertaDesdeKPI({
  firmId,
  kpiCode,
  kpiName,
  value,
  threshold,
  status,
  daysInStatus = 1,
  lotId = null,
  premiseId = null,
  metadata = {},
}) {
  try {
    console.log('[Alertas KPI] Creando alerta desde KPI:', { kpiCode, status, value });

    // Construir título e icono según status
    const icono = status === 'ROJO' ? '❌' : '⚠️';
    const titulo = `${icono} KPI ${status}: ${kpiName}`;

    // Construir descripción
    let descripcion = `El KPI ${kpiName} está en ${status}. Valor actual: ${value}`;
    if (threshold !== undefined && threshold !== null) {
      descripcion += ` (umbral: ${threshold})`;
    }
    if (daysInStatus > 1) {
      descripcion += `. Se mantiene en ${status} desde hace ${daysInStatus} período(s).`;
    }

    // Determinar prioridad según status
    const prioridad = status === 'ROJO' ? 'alta' : 'media';

    // Crear la alerta reutilizando crearAlertaAutomatica
    return await crearAlertaAutomatica({
      firmaId,
      predioId: premiseId,
      loteId,
      tipo: 'alerta',
      titulo,
      descripcion,
      prioridad,
      reglaAplicada: `KPI_${kpiCode}_${status}`,
      metadata: {
        kpi_code: kpiCode,
        kpi_name: kpiName,
        valor_actual: value,
        umbral,
        dias_en_status: daysInStatus,
        ...metadata,
      },
    });
  } catch (error) {
    console.error('[Alertas KPI] Error en crearAlertaDesdeKPI:', error);
    throw error;
  }
}
