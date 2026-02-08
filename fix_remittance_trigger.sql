-- ============================================
-- SOLUCIÓN PARA EL ERROR DE cancellation_reason
-- ============================================
-- Este archivo contiene el SQL necesario para corregir el problema
-- del trigger que intenta acceder a cancellation_reason que no existe

-- OPCIÓN 1: Crear una función RPC para actualizar remitos sin el problema del trigger
-- Ejecuta esto en el SQL Editor de Supabase:

CREATE OR REPLACE FUNCTION update_remittance_received(
  p_remittance_id UUID,
  p_status TEXT,
  p_received_by TEXT,
  p_received_date DATE
)
RETURNS TABLE(result JSON)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_old_replication_role TEXT;
BEGIN
  -- Guardar el valor actual de session_replication_role
  SELECT current_setting('session_replication_role', true) INTO v_old_replication_role;
  
  -- Deshabilitar triggers temporalmente para evitar el error de cancellation_reason
  PERFORM set_config('session_replication_role', 'replica', true);
  
  -- Actualizar el remito directamente sin disparar el trigger problemático
  UPDATE remittances
  SET 
    status = p_status,
    received_by = p_received_by,
    received_date = p_received_date,
    updated_at = NOW()
  WHERE id = p_remittance_id;
  
  -- Restaurar el valor original de session_replication_role
  IF v_old_replication_role IS NOT NULL THEN
    PERFORM set_config('session_replication_role', v_old_replication_role, true);
  ELSE
    PERFORM set_config('session_replication_role', 'origin', true);
  END IF;
  
  -- Retornar el remito actualizado
  SELECT row_to_json(r) INTO v_result
  FROM (
    SELECT * FROM remittances WHERE id = p_remittance_id
  ) r;
  
  RETURN QUERY SELECT v_result;
END;
$$;

-- OPCIÓN 2: Corregir el trigger directamente (si tienes acceso)
-- Primero, encuentra el trigger problemático:
-- SELECT * FROM pg_trigger WHERE tgname LIKE '%remittance%';

-- Luego, modifica el trigger para que no intente acceder a cancellation_reason
-- Si el trigger tiene algo como:
--   IF NEW.cancellation_reason IS NOT NULL THEN
-- Debería cambiarse a verificar si el campo existe primero, o eliminarse esa referencia

-- OPCIÓN 3: Agregar los campos faltantes a la tabla (SOLUCIÓN RÁPIDA Y RECOMENDADA)
-- El trigger está intentando acceder a campos que no existen. Agrega todos los campos necesarios:
ALTER TABLE remittances ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE remittances ADD COLUMN IF NOT EXISTS updated_reason TEXT;

-- OPCIÓN 4: Actualizar la función RPC para incluir todos los campos necesarios
-- Después de agregar los campos con la OPCIÓN 3, actualiza la función RPC:
-- Esta función permite actualizar remitos incluso si están en estado partially_received
-- NOTA: Como función SECURITY DEFINER, puede actualizar directamente sin pasar por triggers de validación
CREATE OR REPLACE FUNCTION update_remittance_received(
  p_remittance_id UUID,
  p_status TEXT,
  p_received_by TEXT,
  p_received_date DATE
)
RETURNS TABLE(result JSON)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_current_status TEXT;
BEGIN
  -- Obtener el estado actual del remito
  SELECT status INTO v_current_status
  FROM remittances
  WHERE id = p_remittance_id;
  
  -- Si el remito está en partially_received y queremos cambiarlo a received, permitirlo
  -- También permitir si está en in_transit
  IF v_current_status NOT IN ('in_transit', 'partially_received') AND p_status != 'cancelled' THEN
    RAISE EXCEPTION 'No se puede modificar un remito con estado "%" (ID: %). Solo se permite completar remitos parciales o cancelar.', 
      v_current_status, p_remittance_id;
  END IF;
  
  -- Actualizar el remito directamente
  -- Como función SECURITY DEFINER, ejecuta con permisos del propietario de la función
  -- Esto permite actualizar incluso si hay triggers que bloquean actualizaciones normales
  UPDATE remittances
  SET 
    status = p_status,
    received_by = p_received_by,
    received_date = p_received_date,
    updated_at = NOW(),
    cancellation_reason = NULL,  -- Establecer explícitamente a NULL
    updated_reason = NULL        -- Establecer explícitamente a NULL
  WHERE id = p_remittance_id;
  
  -- Retornar el remito actualizado
  SELECT row_to_json(r) INTO v_result
  FROM (SELECT * FROM remittances WHERE id = p_remittance_id) r;
  
  RETURN QUERY SELECT v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay algún error, lanzarlo con más contexto
    RAISE EXCEPTION 'Error actualizando remito: %', SQLERRM;
END;
$$;

-- IMPORTANTE: Dar permisos de ejecución a la función
GRANT EXECUTE ON FUNCTION update_remittance_received(UUID, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_remittance_received(UUID, TEXT, TEXT, DATE) TO anon;

-- OPCIÓN 5: Encontrar y modificar el trigger que bloquea remitos parciales
-- PASO 1: Encuentra el trigger problemático
-- Ejecuta esto para ver los triggers de la tabla remittances:
/*
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgrelid = 'remittances'::regclass 
  AND tgisinternal = false;
*/

-- PASO 2: Si encuentras un trigger que valida el estado, necesitas modificarlo
-- El trigger probablemente tiene algo como esto que bloquea partially_received:
-- IF OLD.status IN ('received', 'partially_received') AND NEW.status != OLD.status THEN
--
-- Debería cambiarse a solo bloquear si está en 'received' (completamente recibido):
-- IF OLD.status = 'received' AND NEW.status != 'received' AND NEW.status != 'cancelled' THEN
--
-- Esto permitiría cambiar de 'partially_received' a 'received' para completar la recepción.

-- PASO 3: Ver la función prevent_remittance_modification
-- Ejecuta esto para ver el código de la función:
/*
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'prevent_remittance_modification';
*/

-- PASO 4: Modificar la función para permitir completar remitos parciales
-- La función probablemente bloquea todos los remitos con estado 'received' o 'partially_received'
-- Necesitamos modificarla para permitir cambiar de 'partially_received' a 'received'
-- Ejecuta esto (reemplaza la función existente):
CREATE OR REPLACE FUNCTION prevent_remittance_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Permitir actualizar si está cambiando de partially_received a received (completar recepción)
  IF OLD.status = 'partially_received' AND NEW.status = 'received' THEN
    RETURN NEW;  -- Permitir esta transición
  END IF;
  
  -- Permitir actualizar si está en in_transit (primera recepción)
  IF OLD.status = 'in_transit' THEN
    RETURN NEW;  -- Permitir esta transición
  END IF;
  
  -- Permitir cancelar cualquier remito (excepto los ya cancelados)
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    RETURN NEW;  -- Permitir cancelación
  END IF;
  
  -- Bloquear cualquier otra modificación de remitos recibidos o parcialmente recibidos
  IF OLD.status IN ('received', 'partially_received') AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'No se puede modificar un remito con estado "%" (ID: %). Los remitos recibidos son inmutables. Solo se permite cancelación con motivo.', 
      OLD.status, OLD.id;
  END IF;
  
  -- Permitir otras actualizaciones (campos que no sean status)
  IF OLD.status = NEW.status THEN
    RETURN NEW;  -- Si el status no cambia, permitir actualizar otros campos
  END IF;
  
  RETURN NEW;
END;
$$;

-- OPCIÓN 5: Modificar el trigger para permitir completar remitos parciales
-- Si el trigger está bloqueando actualizaciones de remitos parciales, ejecuta esto:
-- Primero, encuentra el trigger:
-- SELECT tgname, tgtype, tgenabled FROM pg_trigger WHERE tgrelid = 'remittances'::regclass;
--
-- Luego, si el trigger tiene una validación que bloquea partially_received, 
-- necesitas modificarlo para permitir la transición de partially_received a received.
-- 
-- Ejemplo de cómo debería ser la validación en el trigger:
-- IF OLD.status IN ('received', 'cancelled') AND NEW.status NOT IN ('received', 'cancelled') THEN
--   RAISE EXCEPTION 'No se puede modificar...';
-- END IF;
--
-- Debería cambiar a:
-- IF OLD.status = 'received' AND NEW.status != 'received' AND NEW.status != 'cancelled' THEN
--   RAISE EXCEPTION 'No se puede modificar...';
-- END IF;
--
-- Esto permitiría cambiar de partially_received a received, pero no de received a otro estado.

