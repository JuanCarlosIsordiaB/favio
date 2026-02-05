/**
 * Servicio para gestión de costos automáticos de eventos ganaderos
 * Propósito: Configurar y gestionar reglas de costo por evento
 */

import { supabase } from '../lib/supabase';

/**
 * Obtiene las reglas de costo configuradas para una firma
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Array>} Array de reglas de costo
 */
export async function getEventCostRules(firmId) {
    try {
        const { data, error } = await supabase
            .from('event_cost_rules')
            .select('*')
            .eq('firm_id', firmId)
            .order('event_type', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching event cost rules:', error);
        throw error;
    }
}

/**
 * Crea o actualiza una regla de costo
 * @param {string} firmId - ID de la firma
 * @param {Object} ruleData - Datos de la regla
 * @returns {Promise<Object>} Regla creada/actualizada
 */
export async function upsertEventCostRule(firmId, ruleData) {
    try {
        const { data, error } = await supabase
            .from('event_cost_rules')
            .upsert({
                firm_id: firmId,
                event_type: ruleData.event_type,
                base_cost: ruleData.base_cost || 0,
                cost_per_head: ruleData.cost_per_head || 0,
                cost_per_kg: ruleData.cost_per_kg || 0,
                is_active: ruleData.is_active ?? true,
                notes: ruleData.notes || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'firm_id,event_type'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error upserting cost rule:', error);
        throw error;
    }
}

/**
 * Obtiene los costos automáticos generados
 * @param {Object} filters - Filtros opcionales (firmId, eventType)
 * @returns {Promise<Array>} Array de costos generados
 */
export async function getEventCosts(filters = {}) {
    try {
        let query = supabase
            .from('work_costs')
            .select(`
                *,
                event:event_id(
                    id, event_type, event_date, qty_heads, qty_kg,
                    herd:herd_id(name),
                    animal:animal_id(visual_tag)
                )
            `)
            .order('created_at', { ascending: false });

        if (filters.firmId) {
            query = query.eq('firm_id', filters.firmId);
        }

        if (filters.eventType) {
            query = query.eq('event.event_type', filters.eventType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching event costs:', error);
        throw error;
    }
}

/**
 * Convierte un costo automático en factura (expense)
 * @param {string} workCostId - ID del costo de trabajo
 * @param {Object} expenseData - Datos de la factura
 * @returns {Promise<Object>} Factura creada
 */
export async function convertCostToExpense(workCostId, expenseData) {
    try {
        // 1. Obtener datos del costo
        const { data: workCost, error: workCostError } = await supabase
            .from('work_costs')
            .select('*, event:event_id(*)')
            .eq('id', workCostId)
            .single();

        if (workCostError) throw workCostError;
        if (!workCost) throw new Error('Costo no encontrado');

        // 2. Crear factura vinculada al evento
        const { data: expense, error: expenseError } = await supabase
            .from('expenses')
            .insert({
                firm_id: workCost.firm_id,
                premise_id: workCost.premise_id,
                event_id: workCost.event_id,
                category: expenseData.category || 'Operaciones Ganaderas',
                provider_name: expenseData.provider_name,
                invoice_number: expenseData.invoice_number,
                invoice_date: expenseData.invoice_date || workCost.event?.event_date,
                subtotal: workCost.cost_amount,
                total_amount: workCost.cost_amount,
                status: 'REGISTERED',
                notes: `Generado desde costo automático de evento ${workCost.event?.event_type}`,
                metadata: {
                    auto_generated: true,
                    work_cost_id: workCostId,
                    event_type: workCost.event?.event_type
                }
            })
            .select()
            .single();

        if (expenseError) throw expenseError;

        // 3. Actualizar work_cost para indicar que fue convertido
        const { error: updateError } = await supabase
            .from('work_costs')
            .update({
                status: 'CONVERTED_TO_EXPENSE',
                metadata: {
                    ...workCost.metadata,
                    converted_to_expense_id: expense.id,
                    converted_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', workCostId);

        if (updateError) throw updateError;

        return expense;
    } catch (error) {
        console.error('Error converting cost to expense:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas de costos
 * @param {string} firmId - ID de la firma
 * @returns {Promise<Object>} Estadísticas de costos
 */
export async function getEventCostStats(firmId) {
    try {
        const { data, error } = await supabase
            .from('work_costs')
            .select('cost_amount, status, created_at')
            .eq('firm_id', firmId);

        if (error) throw error;

        const stats = {
            total_posted: 0,
            total_converted: 0,
            total_amount: 0
        };

        data?.forEach(cost => {
            stats.total_amount += cost.cost_amount || 0;
            if (cost.status === 'POSTED') {
                stats.total_posted += cost.cost_amount || 0;
            } else if (cost.status === 'CONVERTED_TO_EXPENSE') {
                stats.total_converted += cost.cost_amount || 0;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error fetching cost stats:', error);
        throw error;
    }
}
