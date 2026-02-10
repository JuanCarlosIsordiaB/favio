-- ============================================
-- AGREGAR COLUMNA category A purchase_order_items
-- ============================================
-- Este script agrega la columna category que falta en la tabla purchase_order_items
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Verifica que la columna se haya creado correctamente
--
-- ============================================

-- PASO 1: Verificar si la columna ya existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- PASO 2: Agregar la columna category si no existe
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- PASO 3: Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_category 
ON purchase_order_items(category);

-- PASO 4: Verificar que la columna se creó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- PASO 5: Verificar que el índice se creó
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'purchase_order_items'
AND indexname = 'idx_purchase_order_items_category';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- La columna category ahora debería existir y estar lista para usar
-- Puedes verificar ejecutando:
-- SELECT category FROM purchase_order_items LIMIT 1;

