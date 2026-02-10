-- ============================================
-- VERIFICAR COLUMNAS Y REFRESCAR CACHÉ
-- ============================================
-- Este script verifica que las columnas existen y ayuda a refrescar la caché
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script para verificar que todo está correcto
-- 2. Si las columnas existen, el problema es solo de caché
-- 3. La caché de Supabase se refresca automáticamente, pero puede tardar unos minutos
--
-- ============================================

-- Verificar que premise_id existe en purchase_orders
SELECT 
    'premise_id en purchase_orders' AS verificacion,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'purchase_orders' 
AND column_name = 'premise_id';

-- Verificar que category existe en purchase_order_items
SELECT 
    'category en purchase_order_items' AS verificacion,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- Verificar índices relacionados
SELECT 
    'Índices' AS tipo,
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE (tablename = 'purchase_orders' AND indexname = 'idx_purchase_orders_premise_id')
   OR (tablename = 'purchase_order_items' AND indexname = 'idx_purchase_order_items_category')
ORDER BY tablename, indexname;

-- Verificar foreign keys
SELECT
    'Foreign Keys' AS tipo,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'purchase_orders'
  AND kcu.column_name = 'premise_id';

-- ============================================
-- SOLUCIÓN PARA EL PROBLEMA DE CACHÉ
-- ============================================
-- Si las columnas existen pero aún recibes el error:
--
-- 1. Espera 1-2 minutos (la caché se refresca automáticamente)
-- 2. Refresca la página de la aplicación
-- 3. Si persiste, intenta:
--    - Cerrar y abrir el navegador
--    - Limpiar la caché del navegador
--    - En Supabase Dashboard, ve a Settings > API y haz clic en "Refresh Schema"
--
-- NOTA: El error "Could not find the column in the schema cache" es temporal
-- y se resuelve automáticamente cuando Supabase actualiza su caché de esquema.

