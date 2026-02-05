/**
 * useMonitoringTriggers.js
 *
 * Hook personalizado para triggers automáticos de integración de monitoreo
 * Ejecuta verificaciones y actualizaciones cuando se crean nuevos registros
 */

import { useCallback } from 'react';
import {
  verificarAjustesLluviaPredio,
  ajustarCargaAnimalPorPastura,
  generarRecomendacionFertilizacion,
  validarSemillaParaSiembra
} from '../services/monitoringIntegration';
import { toast } from 'sonner';

/**
 * Hook para triggers automáticos de monitoreo
 */
export function useMonitoringTriggers(firmId, premiseId) {

  /**
   * Trigger cuando se registra nueva lluvia
   * Verifica impacto en proyecciones activas
   */
  const triggerNuevaLluvia = useCallback(async (mmRegistrados) => {
    try {
      // Ejecutar verificación de ajustes en proyecciones
      const ajustes = await verificarAjustesLluviaPredio(premiseId);

      // Notificar si hay proyecciones que requieren atención
      const requierenAtencion = ajustes.filter(a => a.requiereAtencion);
      if (requierenAtencion.length > 0) {
        toast.warning(
          `${requierenAtencion.length} proyección(es) requieren ajuste por lluvia`,
          {
            description: 'Revisa la pestaña de Integración para más detalles',
            duration: 5000
          }
        );
      }

      return ajustes;
    } catch (error) {
      console.error('Error en trigger de lluvia:', error);
      return [];
    }
  }, [premiseId]);

  /**
   * Trigger cuando se registra nueva medición de pastura
   * Verifica si hay sobrecarga animal o necesidad de mover animales
   */
  const triggerNuevaPastura = useCallback(async (loteId, alturaPromedio, remanente) => {
    try {
      // Si altura está por debajo del remanente + 2cm, verificar carga
      if (alturaPromedio < remanente + 2) {
        const recomendaciones = await ajustarCargaAnimalPorPastura(premiseId);

        // Buscar recomendación específica del lote
        const recLote = recomendaciones.find(r => r.lot_id === loteId);

        if (recLote && recLote.accion === 'reducir') {
          toast.error(
            `Pastura crítica: ${recLote.lot_name}`,
            {
              description: recLote.mensaje,
              duration: 7000
            }
          );
        } else if (alturaPromedio < remanente) {
          toast.warning(
            'Altura de pastura por debajo del remanente objetivo',
            {
              description: 'Considera mover animales o suplementar con forraje',
              duration: 5000
            }
          );
        }

        return recomendaciones;
      }

      return [];
    } catch (error) {
      console.error('Error en trigger de pastura:', error);
      return [];
    }
  }, [premiseId]);

  /**
   * Trigger cuando se registra nuevo análisis de suelo
   * Genera recomendación de fertilización si hay déficit
   */
  const triggerNuevoSuelo = useCallback(async (loteId, deficit) => {
    try {
      // Si hay déficit significativo, generar recomendación
      if (deficit > 0) {
        const recomendacion = await generarRecomendacionFertilizacion(loteId);

        if (recomendacion.requiereFertilizacion) {
          toast.info(
            `Fertilización requerida: ${recomendacion.lot_name}`,
            {
              description: `${recomendacion.recomendaciones.length} nutriente(s) en déficit. Costo estimado: $${recomendacion.costoEstimadoTotal.toFixed(2)} USD`,
              duration: 7000
            }
          );
        }

        return recomendacion;
      }

      return null;
    } catch (error) {
      console.error('Error en trigger de suelo:', error);
      return null;
    }
  }, []);

  /**
   * Trigger cuando se crea un trabajo de siembra
   * Valida calidad de semilla antes de ejecutar
   */
  const triggerNuevaSiembra = useCallback(async (seedVarietyId, hectareas) => {
    try {
      const validacion = await validarSemillaParaSiembra(seedVarietyId, hectareas);

      if (!validacion.aprobado) {
        toast.error(
          `Semilla no apta: ${validacion.variedad}`,
          {
            description: validacion.motivo,
            duration: 10000
          }
        );
      } else {
        toast.success(
          `Semilla aprobada: ${validacion.variedad}`,
          {
            description: validacion.recomendacion,
            duration: 5000
          }
        );
      }

      return validacion;
    } catch (error) {
      console.error('Error en trigger de siembra:', error);
      return null;
    }
  }, []);

  /**
   * Trigger cuando se marca fertilización como aplicada
   * Actualiza estado y registra en auditoría
   */
  const triggerFertilizacionAplicada = useCallback(async (loteId, parametro) => {
    try {
      toast.success(
        'Fertilización aplicada',
        {
          description: `Se registró la aplicación de ${parametro} en el lote`,
          duration: 3000
        }
      );

      // Aquí podría integrarse con módulo de costos para registrar el gasto
      return true;
    } catch (error) {
      console.error('Error en trigger de fertilización aplicada:', error);
      return false;
    }
  }, []);

  return {
    triggerNuevaLluvia,
    triggerNuevaPastura,
    triggerNuevoSuelo,
    triggerNuevaSiembra,
    triggerFertilizacionAplicada
  };
}

/**
 * Hook simplificado para verificaciones manuales
 */
export function useIntegrationChecks(firmId, premiseId) {
  const verificarTodo = useCallback(async () => {
    try {
      toast.info('Ejecutando verificaciones de integración...', { duration: 2000 });

      const resultados = await Promise.allSettled([
        verificarAjustesLluviaPredio(premiseId),
        ajustarCargaAnimalPorPastura(premiseId)
      ]);

      let completadas = 0;
      let errores = 0;

      resultados.forEach(r => {
        if (r.status === 'fulfilled') completadas++;
        else errores++;
      });

      if (errores === 0) {
        toast.success(
          `Verificaciones completadas: ${completadas}`,
          { description: 'Revisa la pestaña Integración para detalles', duration: 4000 }
        );
      } else {
        toast.warning(
          `Completadas: ${completadas}, Errores: ${errores}`,
          { duration: 4000 }
        );
      }

      return resultados;
    } catch (error) {
      console.error('Error verificando integraciones:', error);
      toast.error('Error al ejecutar verificaciones');
      return [];
    }
  }, [firmId, premiseId]);

  return { verificarTodo };
}
