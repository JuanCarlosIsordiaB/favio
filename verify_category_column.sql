-- ============================================
-- VERIFICAR Y CREAR COLUMNA category
-- ============================================
-- Este script verifica que la columna category existe en purchase_order_items
-- y la crea si no existe
--
-- ============================================

-- PASO 1: Verificar si la columna existe
SELECT 
    'Verificando category...' AS paso,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- PASO 2: Agregar la columna si no existe
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- PASO 3: Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_category 
ON purchase_order_items(category);

-- PASO 4: Verificar que se creó correctamente
SELECT 
    'category verificada/creada' AS resultado,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- PASO 5: Verificar el índice
SELECT 
    'Índice verificado' AS resultado,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'purchase_order_items'
AND indexname = 'idx_purchase_order_items_category';

-- ============================================
-- NOTA SOBRE CACHÉ
-- ============================================
-- Si la columna existe pero aún recibes el error:
-- 1. Espera 1-2 minutos para que Supabase actualice su caché
-- 2. Refresca la aplicación (F5)
-- 3. Cierra y vuelve a abrir el navegador si es necesario

