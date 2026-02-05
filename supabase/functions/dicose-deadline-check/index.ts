// Edge Function: dicose-deadline-check
// Propósito: Verificar diariamente eventos DICOSE fuera de plazo y crear alertas automáticas
// Trigger: Cron job diario a las 8:00 AM
// Cumplimiento: Decreto 289/74 Uruguay - Plazo máximo 30 días

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    try {
        // 1. INICIALIZAR CLIENTE SUPABASE
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Variables de entorno faltantes: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. CALCULAR FECHA LÍMITE (30 días atrás)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Formatear como YYYY-MM-DD para consulta
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        console.log(`[DICOSE-Check] Verificando eventos fuera de plazo desde: ${thirtyDaysAgoStr}`);

        // 3. BUSCAR EVENTOS PENDIENTES FUERA DE PLAZO
        // Tipos críticos: DEATH, CONSUMPTION, LOST_WITH_HIDE (plazo 30 días)
        const { data: overdueEvents, error: eventsError } = await supabase
            .from('herd_events')
            .select(`
                id,
                firm_id,
                premise_id,
                event_date,
                event_type,
                scope,
                animal:animal_id(visual_tag, rfid_tag),
                herd:herd_id(name)
            `)
            .in('event_type', ['DEATH', 'CONSUMPTION', 'LOST_WITH_HIDE'])
            .eq('status', 'PENDING')
            .lt('event_date', thirtyDaysAgoStr);

        if (eventsError) {
            throw new Error(`Error al buscar eventos: ${eventsError.message}`);
        }

        console.log(`[DICOSE-Check] Encontrados ${overdueEvents?.length || 0} eventos fuera de plazo`);

        if (!overdueEvents || overdueEvents.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No hay eventos fuera de plazo',
                alerts_created: 0
            }), { status: 200 });
        }

        // 4. CREAR ALERTAS PARA CADA EVENTO FUERA DE PLAZO
        const alertsToCreate = overdueEvents.map((event: any) => {
            const eventDate = new Date(event.event_date);
            const daysDiff = Math.floor((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
            const daysOverdue = daysDiff - 30;

            const animalInfo = event.scope === 'ANIMAL'
                ? `${event.animal?.visual_tag || event.animal?.rfid_tag || 'SIN ID'}`
                : `Rodeo: ${event.herd?.name || 'DESCONOCIDO'}`;

            return {
                firm_id: event.firm_id,
                premise_id: event.premise_id,
                title: `🚨 URGENTE: Evento ${event.event_type} FUERA DE PLAZO DICOSE`,
                description: `
${animalInfo} - Evento del ${eventDate.toLocaleDateString('es-UY')}
Días transcurridos: ${daysDiff} (${daysOverdue} días VENCIDOS)
Plazo legal máximo: 30 días según Decreto 289/74

ACCIÓN REQUERIDA: Aprobar inmediatamente o contactar a DICOSE.
                `.trim(),
                alert_type: 'alert',
                priority: 'high',
                status: 'pending',
                origen: 'automatica',
                regla_aplicada: 'DICOSE_30_DAYS_DEADLINE',
                metadata: {
                    event_id: event.id,
                    event_type: event.event_type,
                    days_overdue: daysOverdue,
                    days_elapsed: daysDiff,
                    animal_info: animalInfo
                },
                created_at: new Date().toISOString()
            };
        });

        // 5. INSERTAR ALERTAS EN BASE DE DATOS
        const { error: alertsError, data: createdAlerts } = await supabase
            .from('alerts')
            .insert(alertsToCreate);

        if (alertsError) {
            throw new Error(`Error al crear alertas: ${alertsError.message}`);
        }

        console.log(`[DICOSE-Check] ✅ ${alertsToCreate.length} alertas creadas exitosamente`);

        // 6. RETORNAR RESPUESTA EXITOSA
        return new Response(JSON.stringify({
            success: true,
            message: `Se crearon ${alertsToCreate.length} alertas de eventos fuera de plazo`,
            alerts_created: alertsToCreate.length,
            events_checked: overdueEvents.length,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[DICOSE-Check] ❌ Error:', error);

        // Retornar error de forma segura
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido en verificación DICOSE',
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
