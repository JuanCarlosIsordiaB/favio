import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export default function DebugAlertsRLS() {
  const [debug, setDebug] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const result = {
        timestamp: new Date().toISOString(),
        diagnostics: []
      };

      // 1. Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      result.diagnostics.push({
        test: 'Current User',
        status: user ? 'OK' : 'ERROR',
        data: user ? { id: user.id, email: user.email } : userError
      });

      // 2. Revisar user_firm_access
      if (user?.id) {
        const { data: firmAccess, error: accessError } = await supabase
          .from('user_firm_access')
          .select('*')
          .eq('user_id', user.id)
          .is('revoked_at', null);

        result.diagnostics.push({
          test: 'user_firm_access records',
          status: firmAccess && firmAccess.length > 0 ? 'OK' : 'WARNING',
          count: firmAccess?.length || 0,
          data: firmAccess || accessError
        });

        // 3. Si hay acceso a firmas, intentar leer alertas directamente
        if (firmAccess && firmAccess.length > 0) {
          const firmIds = firmAccess.map(f => f.firm_id);

          const { data: alerts, error: alertsError } = await supabase
            .from('alerts')
            .select('id, firm_id, title, status, alert_date, origen')
            .in('firm_id', firmIds);

          result.diagnostics.push({
            test: 'Read alerts from user_firm_access firms',
            status: alerts ? 'OK' : 'ERROR',
            count: alerts?.length || 0,
            error: alertsError?.message,
            sample: alerts?.slice(0, 3) || []
          });

          // 4. Intentar insertar una alerta de test
          if (firmIds.length > 0) {
            const testAlertData = {
              firm_id: firmIds[0],
              title: 'Test Alert - RLS Debug',
              description: 'Testing RLS policies',
              alert_date: new Date().toISOString().split('T')[0],
              alert_type: 'warning',
              priority: 'low',
              status: 'pending',
              origen: 'test'
            };

            const { data: newAlert, error: insertError } = await supabase
              .from('alerts')
              .insert([testAlertData])
              .select()
              .single();

            result.diagnostics.push({
              test: 'Insert test alert',
              status: newAlert ? 'OK' : 'ERROR',
              error: insertError?.message,
              alertId: newAlert?.id
            });

            // 5. Intentar leer la alerta que acabamos de insertar
            if (newAlert?.id) {
              const { data: readAlert, error: readError } = await supabase
                .from('alerts')
                .select('*')
                .eq('id', newAlert.id)
                .single();

              result.diagnostics.push({
                test: 'Read back the test alert',
                status: readAlert ? 'OK' : 'ERROR',
                error: readError?.message,
                data: readAlert
              });

              // Limpiar: eliminar la alerta de test
              await supabase.from('alerts').delete().eq('id', newAlert.id);
            }
          }
        }

        // 6. Contar alertas totales en la tabla (sin filtros)
        const { data: allAlerts, error: countError } = await supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true });

        result.diagnostics.push({
          test: 'Total alerts in table (no filter)',
          status: 'INFO',
          totalCount: allAlerts?.length || 0,
          error: countError?.message
        });
      }

      setDebug(result);
    } catch (error) {
      console.error('Diagnostic error:', error);
      setDebug({
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug: Alertas RLS</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Ejecutando diagnóstico...' : 'Ejecutar Diagnóstico RLS'}
          </Button>
        </CardContent>
      </Card>

      {debug && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados del Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
