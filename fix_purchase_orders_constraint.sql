-- ============================================
-- CORRECCIÓN DEL CONSTRAINT DE ESTADOS
-- ============================================
-- Este script corrige el problema del constraint check_purchase_order_status
-- que está fallando porque hay datos con estados antiguos
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script ANTES de intentar crear nuevas órdenes
-- 2. Esto actualizará todos los datos existentes y recreará el constraint
--
-- ============================================

-- PASO 1: Eliminar el constraint existente (si existe)
ALTER TABLE purchase_orders
DROP CONSTRAINT IF EXISTS check_purchase_order_status;

-- PASO 2: Actualizar TODOS los estados existentes a los nuevos valores
-- Esto incluye estados en inglés y cualquier variación
UPDATE purchase_orders
SET status = CASE
  -- Estados antiguos en inglés
  WHEN status = 'draft' THEN 'pendiente'
  WHEN status = 'approved' THEN 'aprobada'
  WHEN status = 'sent' THEN 'aprobada'
  WHEN status = 'received' THEN 'aprobada'
  WHEN status = 'cancelled' THEN 'rechazada'
  -- Estados nuevos en español (asegurar que estén correctos)
  WHEN status = 'pendiente' THEN 'pendiente'
  WHEN status = 'aprobada' THEN 'aprobada'
  WHEN status = 'rechazada' THEN 'rechazada'
  -- Cualquier otro valor se convierte en pendiente
  ELSE 'pendiente'
END
WHERE status IS NOT NULL;

-- PASO 3: Verificar que no queden valores inválidos
-- Si hay valores NULL, establecerlos como 'pendiente'
UPDATE purchase_orders
SET status = 'pendiente'
WHERE status IS NULL;

-- PASO 4: Verificar que todos los estados sean válidos
-- Esta consulta debería retornar 0 filas si todo está correcto
-- Si retorna filas, hay estados inválidos que necesitan corrección manual
SELECT id, order_number, status 
FROM purchase_orders 
WHERE status NOT IN ('pendiente', 'aprobada', 'rechazada');

-- PASO 5: Crear el constraint CHECK de nuevo
ALTER TABLE purchase_orders
ADD CONSTRAINT check_purchase_order_status 
CHECK (status IN ('pendiente', 'aprobada', 'rechazada'));

-- PASO 6: Verificar que el constraint se creó correctamente
-- Esta consulta debería retornar información del constraint
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
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
WHERE status NOT IN ('pendiente', 'aprobada', 'rechazada');

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Si después de ejecutar este script aún hay errores:
-- 1. Verifica que no haya triggers o funciones que estén estableciendo estados antiguos
-- 2. Verifica que el código de la aplicación esté usando los nuevos estados
-- 3. Si hay datos con estados personalizados, actualízalos manualmente

