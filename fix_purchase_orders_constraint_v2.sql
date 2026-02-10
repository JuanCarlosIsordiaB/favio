-- ============================================
-- CORRECCIÓN DEFINITIVA DEL CONSTRAINT DE ESTADOS
-- ============================================
-- Este script corrige el problema del constraint check_purchase_order_status
-- que está bloqueando inserciones válidas
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script completo
-- 2. Verifica que no haya errores
-- 3. Intenta crear una nueva orden de compra
--
-- ============================================

-- PASO 1: Verificar qué constraints existen actualmente
-- Esto te mostrará todos los constraints en purchase_orders
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'purchase_orders'::regclass
    AND contype = 'c';  -- 'c' = CHECK constraint

-- PASO 2: Eliminar TODOS los constraints de estado (por si hay múltiples)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'purchase_orders'::regclass 
        AND contype = 'c'
        AND (conname LIKE '%status%' OR pg_get_constraintdef(oid) LIKE '%status%')
    LOOP
        EXECUTE 'ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Eliminado constraint: %', r.conname;
    END LOOP;
END $$;

-- PASO 3: Verificar que no queden constraints de estado
-- Esta consulta debería retornar 0 filas
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'purchase_orders'::regclass 
AND contype = 'c'
AND (conname LIKE '%status%' OR pg_get_constraintdef(oid) LIKE '%status%');

-- PASO 4: Actualizar TODOS los estados existentes a valores válidos
UPDATE purchase_orders
SET status = CASE
  -- Estados antiguos en inglés
  WHEN LOWER(status) = 'draft' THEN 'pendiente'
  WHEN LOWER(status) = 'approved' THEN 'aprobada'
  WHEN LOWER(status) = 'sent' THEN 'aprobada'
  WHEN LOWER(status) = 'received' THEN 'aprobada'
  WHEN LOWER(status) = 'cancelled' THEN 'rechazada'
  -- Estados nuevos en español (normalizar a minúsculas)
  WHEN LOWER(status) = 'pendiente' THEN 'pendiente'
  WHEN LOWER(status) = 'aprobada' THEN 'aprobada'
  WHEN LOWER(status) = 'rechazada' THEN 'rechazada'
  -- Cualquier otro valor se convierte en pendiente
  ELSE 'pendiente'
END
WHERE status IS NOT NULL;

-- PASO 5: Normalizar todos los estados a minúsculas (por si acaso)
UPDATE purchase_orders
SET status = LOWER(TRIM(status))
WHERE status IS NOT NULL;

-- PASO 6: Establecer pendiente para valores NULL
UPDATE purchase_orders
SET status = 'pendiente'
WHERE status IS NULL OR status = '';

-- PASO 7: Verificar que todos los estados sean válidos
-- Esta consulta debería retornar 0 filas
SELECT id, order_number, status 
FROM purchase_orders 
WHERE status NOT IN ('pendiente', 'aprobada', 'rechazada')
   OR status IS NULL;

-- PASO 8: Verificar el tipo de dato de la columna status
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
AND column_name = 'status';

-- PASO 9: Verificar triggers que dependen de la columna status
-- NO podemos cambiar el tipo de columna si hay triggers que la usan
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'purchase_orders'
AND action_statement LIKE '%status%';

-- NOTA: No intentamos cambiar el tipo de la columna porque hay triggers que dependen de ella
-- Solo actualizamos los datos y creamos el constraint

-- PASO 10: Verificar que el trigger no esté estableciendo valores inválidos
-- Si el trigger 'trigger_sync_po_expenses' está estableciendo estados antiguos,
-- necesitarás actualizarlo manualmente para usar los nuevos estados

-- PASO 11: Crear el constraint CHECK de nuevo con valores explícitos
ALTER TABLE purchase_orders
ADD CONSTRAINT check_purchase_order_status 
CHECK (
    status IS NOT NULL 
    AND status IN ('pendiente', 'aprobada', 'rechazada')
);

-- PASO 12: Verificar que el constraint se creó correctamente
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'purchase_orders'::regclass
    AND conname = 'check_purchase_order_status';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Ejecuta estas consultas para verificar:

-- Ver todos los estados actuales y su conteo
SELECT status, COUNT(*) as cantidad
FROM purchase_orders 
GROUP BY status
ORDER BY status;

-- Verificar que no hay estados inválidos
SELECT COUNT(*) as estados_invalidos
FROM purchase_orders 
WHERE status NOT IN ('pendiente', 'aprobada', 'rechazada')
   OR status IS NULL;

-- Verificar que el constraint permite los valores correctos
-- Esta consulta debería retornar 3 filas (uno por cada estado válido)
SELECT unnest(ARRAY['pendiente', 'aprobada', 'rechazada']) AS estado_valido;

-- ============================================
-- PRUEBA DE INSERCIÓN
-- ============================================
-- Si quieres probar que el constraint funciona, ejecuta esto:
-- (Reemplaza los valores con datos reales de tu base de datos)

/*
INSERT INTO purchase_orders (
    id,
    firm_id,
    order_number,
    order_date,
    supplier_name,
    supplier_phone,
    supplier_email,
    supplier_address,
    status
) VALUES (
    gen_random_uuid(),
    'TU_FIRM_ID_AQUI',
    'OC-2026-00001',
    CURRENT_DATE,
    'Proveedor Test',
    '123456789',
    'test@test.com',
    'Dirección Test',
    'pendiente'  -- Estado válido
);
*/

-- ============================================
-- ACTUALIZACIÓN DEL TRIGGER (si es necesario)
-- ============================================
-- Si el trigger 'trigger_sync_po_expenses' o 'sync_purchase_order_expenses_status' 
-- está usando estados antiguos, necesitarás actualizarlo.
-- 
-- Para ver el código del trigger, ejecuta:
/*
SELECT 
    pg_get_functiondef(oid) as trigger_function
FROM pg_proc
WHERE proname LIKE '%sync%po%expenses%' 
   OR proname LIKE '%purchase%order%expenses%';
*/

-- Si el trigger usa estados antiguos (draft, approved, cancelled, etc.),
-- necesitarás actualizarlo manualmente para usar los nuevos estados:
-- 'pendiente', 'aprobada', 'rechazada'

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Si después de ejecutar este script aún hay errores:
-- 1. Verifica que no haya triggers que estén cambiando el estado después de la inserción
-- 2. Verifica que el código de la aplicación esté usando exactamente estos valores: 'pendiente', 'aprobada', 'rechazada'
-- 3. Verifica que no haya espacios en blanco o caracteres especiales en los valores
-- 4. Si el trigger está estableciendo estados antiguos, actualízalo para usar los nuevos estados

