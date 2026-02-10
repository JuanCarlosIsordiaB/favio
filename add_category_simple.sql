-- ============================================
-- AGREGAR COLUMNA category (SIN TOCAR STATUS)
-- ============================================
-- Este script SOLO agrega la columna category
-- NO modifica ninguna otra columna
--
-- ============================================

-- Verificar si la columna category ya existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

-- Agregar la columna category (solo si no existe)
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Crear índice (solo si no existe)
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_category 
ON purchase_order_items(category);

-- Verificar que se creó
SELECT 
    'Columna category creada/verificada' AS resultado,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'purchase_order_items' 
AND column_name = 'category';

