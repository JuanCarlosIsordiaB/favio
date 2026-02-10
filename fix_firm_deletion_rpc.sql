-- ============================================
-- FUNCIÓN RPC PARA ELIMINACIÓN DE FIRMAS
-- ============================================
-- Este script crea una función RPC en Supabase que maneja la eliminación
-- de firmas con permisos elevados, evitando problemas con políticas RLS
-- y restricciones de claves foráneas.
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase: https://app.supabase.com
-- 2. Ve a SQL Editor (menú lateral izquierdo)
-- 3. Crea una nueva consulta
-- 4. Copia y pega TODO este contenido
-- 5. Haz clic en "Run" o presiona Ctrl+Enter
-- 6. Verifica que aparezca "Successfully created function"
--
-- ============================================

-- Eliminar la función existente si existe (necesario si cambió el tipo de retorno)
DROP FUNCTION IF EXISTS delete_firm_with_cleanup(UUID);

-- Crear la función con el tipo de retorno correcto
CREATE OR REPLACE FUNCTION delete_firm_with_cleanup(firm_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador de la función (bypass RLS)
AS $$
DECLARE
  v_result JSONB;
  v_lot_ids UUID[];
  v_premise_ids UUID[];
  v_animal_count INTEGER := 0;
  v_audit_count INTEGER := 0;
  v_deleted_counts JSONB := jsonb_build_object();
BEGIN
  -- Inicializar resultado
  v_result := jsonb_build_object(
    'success', false,
    'message', '',
    'deleted_counts', jsonb_build_object()
  );

  -- PASO 1: Obtener IDs de lotes y predios de la firma
  SELECT ARRAY_AGG(id) INTO v_lot_ids
  FROM lots
  WHERE firm_id = delete_firm_with_cleanup.firm_id;

  SELECT ARRAY_AGG(id) INTO v_premise_ids
  FROM premises
  WHERE firm_id = delete_firm_with_cleanup.firm_id;

  -- PASO 2: Actualizar animales que referencian estos lotes
  -- Esto es CRÍTICO para evitar violaciones de clave foránea
  IF v_lot_ids IS NOT NULL AND array_length(v_lot_ids, 1) > 0 THEN
    -- Contar animales afectados
    SELECT COUNT(*) INTO v_animal_count
    FROM animals
    WHERE current_lot_id = ANY(v_lot_ids);

    IF v_animal_count > 0 THEN
      -- Actualizar animales: poner current_lot_id a NULL
      UPDATE animals
      SET current_lot_id = NULL
      WHERE current_lot_id = ANY(v_lot_ids);

      -- Guardar conteo de animales actualizados
      v_deleted_counts := jsonb_set(
        v_deleted_counts,
        '{animals_updated}',
        to_jsonb(v_animal_count)
      );
    END IF;
  END IF;

  -- PASO 3: Eliminar registros de auditoría relacionados
  -- Primero los que referencian lotes
  IF v_lot_ids IS NOT NULL AND array_length(v_lot_ids, 1) > 0 THEN
    DELETE FROM audit
    WHERE lot_id = ANY(v_lot_ids);
    
    GET DIAGNOSTICS v_audit_count = ROW_COUNT;
    IF v_audit_count > 0 THEN
      v_deleted_counts := jsonb_set(
        v_deleted_counts,
        '{audit_lots}',
        to_jsonb(v_audit_count)
      );
    END IF;
  END IF;

  -- Luego los que referencian predios
  IF v_premise_ids IS NOT NULL AND array_length(v_premise_ids, 1) > 0 THEN
    DELETE FROM audit
    WHERE premise_id = ANY(v_premise_ids);
    
    GET DIAGNOSTICS v_audit_count = ROW_COUNT;
    IF v_audit_count > 0 THEN
      v_deleted_counts := jsonb_set(
        v_deleted_counts,
        '{audit_premises}',
        to_jsonb(v_audit_count)
      );
    END IF;
  END IF;

  -- Eliminar todos los registros de auditoría de la firma
  DELETE FROM audit
  WHERE firm_id = delete_firm_with_cleanup.firm_id;
  
  GET DIAGNOSTICS v_audit_count = ROW_COUNT;
  IF v_audit_count > 0 THEN
    v_deleted_counts := jsonb_set(
      v_deleted_counts,
      '{audit_firm}',
      to_jsonb(v_audit_count)
    );
  END IF;

  -- PASO 4: Eliminar trabajos agrícolas y ganaderos
  DELETE FROM agricultural_works
  WHERE firm_id = delete_firm_with_cleanup.firm_id;
  
  GET DIAGNOSTICS v_audit_count = ROW_COUNT;
  IF v_audit_count > 0 THEN
    v_deleted_counts := jsonb_set(
      v_deleted_counts,
      '{agricultural_works}',
      to_jsonb(v_audit_count)
    );
  END IF;

  DELETE FROM livestock_works
  WHERE firm_id = delete_firm_with_cleanup.firm_id;
  
  GET DIAGNOSTICS v_audit_count = ROW_COUNT;
  IF v_audit_count > 0 THEN
    v_deleted_counts := jsonb_set(
      v_deleted_counts,
      '{livestock_works}',
      to_jsonb(v_audit_count)
    );
  END IF;

  -- PASO 5: Eliminar gastos e ingresos
  DELETE FROM expenses
  WHERE firm_id = delete_firm_with_cleanup.firm_id;
  
  GET DIAGNOSTICS v_audit_count = ROW_COUNT;
  IF v_audit_count > 0 THEN
    v_deleted_counts := jsonb_set(
      v_deleted_counts,
      '{expenses}',
      to_jsonb(v_audit_count)
    );
  END IF;

  DELETE FROM income
  WHERE firm_id = delete_firm_with_cleanup.firm_id;
  
  GET DIAGNOSTICS v_audit_count = ROW_COUNT;
  IF v_audit_count > 0 THEN
    v_deleted_counts := jsonb_set(
      v_deleted_counts,
      '{income}',
      to_jsonb(v_audit_count)
    );
  END IF;

  -- PASO 6: Eliminar lotes (ahora que los animales ya no los referencian)
  IF v_lot_ids IS NOT NULL AND array_length(v_lot_ids, 1) > 0 THEN
    DELETE FROM lots
    WHERE id = ANY(v_lot_ids);
    
    GET DIAGNOSTICS v_audit_count = ROW_COUNT;
    IF v_audit_count > 0 THEN
      v_deleted_counts := jsonb_set(
        v_deleted_counts,
        '{lots}',
        to_jsonb(v_audit_count)
      );
    END IF;
  END IF;

  -- PASO 7: Eliminar predios
  IF v_premise_ids IS NOT NULL AND array_length(v_premise_ids, 1) > 0 THEN
    DELETE FROM premises
    WHERE id = ANY(v_premise_ids);
    
    GET DIAGNOSTICS v_audit_count = ROW_COUNT;
    IF v_audit_count > 0 THEN
      v_deleted_counts := jsonb_set(
        v_deleted_counts,
        '{premises}',
        to_jsonb(v_audit_count)
      );
    END IF;
  END IF;

  -- PASO 8: Limpiar otras dependencias
  DELETE FROM user_firm_access
  WHERE firm_id = delete_firm_with_cleanup.firm_id;

  DELETE FROM chart_of_accounts
  WHERE firm_id = delete_firm_with_cleanup.firm_id;

  DELETE FROM cost_centers
  WHERE firm_id = delete_firm_with_cleanup.firm_id;

  -- PASO 9: Finalmente, eliminar la firma
  DELETE FROM firms
  WHERE id = delete_firm_with_cleanup.firm_id;

  -- Verificar que se eliminó
  IF NOT FOUND THEN
    v_result := jsonb_build_object(
      'success', false,
      'message', 'Firma no encontrada',
      'deleted_counts', v_deleted_counts
    );
    RETURN v_result;
  END IF;

  -- Éxito - construir resultado final
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Firma eliminada exitosamente',
    'deleted_counts', v_deleted_counts
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar información del error
    v_result := jsonb_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE,
      'deleted_counts', v_deleted_counts
    );
    RETURN v_result;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION delete_firm_with_cleanup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_firm_with_cleanup(UUID) TO service_role;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esto para verificar que la función se creó correctamente:
-- SELECT proname, prosecdef 
-- FROM pg_proc 
-- WHERE proname = 'delete_firm_with_cleanup';
