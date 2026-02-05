// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Configuración
const SENTINEL_AUTH_URL = "https://services.sentinel-hub.com/oauth/token";
const SENTINEL_STAT_URL = "https://services.sentinel-hub.com/api/v1/statistics";
const THRESHOLD_ALERTA_NDVI = 0.3; // Umbral crítico

// Evalscript para NDVI limpio (sin nubes)
const EVALSCRIPT_NDVI = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL"],
      units: "DN"
    }],
    output: [
      {
        id: "data",
        bands: 1
      },
      {
        id: "dataMask",
        bands: 1
      }
    ]
  };
}

function evaluatePixel(sample) {
  // SCL (Scene Classification Layer)
  // 0: No Data, 1: Saturated, 3: Cloud Shadows, 8: Cloud medium, 9: Cloud high, 10: Cirrus, 11: Snow
  const CLOUD_MASK = [0, 1, 3, 8, 9, 10, 11];
  
  if (CLOUD_MASK.includes(sample.SCL)) {
    return {
      data: [0],
      dataMask: [0] // Pixel inválido
    };
  }

  // NDVI = (NIR - RED) / (NIR + RED)
  // B08 = NIR, B04 = RED
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  return {
    data: [ndvi],
    dataMask: [1]
  };
}
`;

serve(async (req) => {
  try {
    // 1. Inicializar Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Autenticar con Sentinel Hub
    const clientId = Deno.env.get('SENTINEL_CLIENT_ID');
    const clientSecret = Deno.env.get('SENTINEL_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error("Faltan credenciales de Sentinel Hub");
    }

    const authBody = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    });

    const authRes = await fetch(SENTINEL_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: authBody
    });

    if (!authRes.ok) {
      const errorText = await authRes.text();
      throw new Error(`Sentinel Hub auth failed: ${authRes.status} - ${errorText}`);
    }

    const contentType = authRes.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await authRes.text();
      throw new Error(`Auth response is not JSON (content-type: ${contentType}): ${textResponse.substring(0, 100)}`);
    }

    const authData = await authRes.json();
    const token = authData.access_token;

    // 3. Obtener Lotes Activos
    const { data: lots, error: lotsError } = await supabase
      .from('lots')
      .select('id, name, firm_id, premise_id, polygon_data')
      .eq('status', true)
      .not('polygon_data', 'is', null);

    if (lotsError) throw lotsError;

    const results = [];

    // 4. Procesar cada lote
    // NOTA: En producción, esto debería hacerse en lotes (batch) o cola para no exceder timeouts
    for (const lot of lots) {
      // Validar geometría mínima
      if (!lot.polygon_data.coordinates || lot.polygon_data.coordinates[0].length < 4) continue;

      // Definir rango de tiempo (Últimos 5 días)
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - 5);

      const payload = {
        input: {
          bounds: {
            geometry: lot.polygon_data,
            properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
          },
          data: [{
            type: "sentinel-2-l2a",
            dataFilter: { maxCloudCoverage: 20 }
          }]
        },
        aggregation: {
          timeRange: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          },
          aggregationInterval: {
            of: "P1D", // Diario
            lastIntervalBehavior: "SHORTEN"
          },
          evalscript: EVALSCRIPT_NDVI
        }
      };

      const statRes = await fetch(SENTINEL_STAT_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!statRes.ok) {
        const errorText = await statRes.text();
        console.error(`Sentinel Hub API error for lot ${lot.name}: ${statRes.status} - ${errorText}`);
        continue; // Skip this lot and continue with the next
      }

      const contentType = statRes.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await statRes.text();
        console.error(`Sentinel Hub API response is not JSON for lot ${lot.name}: ${textResponse.substring(0, 100)}`);
        continue; // Skip this lot and continue with the next
      }

      const statData = await statRes.json();

      if (statData.data && statData.data.length > 0) {
        // Tomar el último dato válido
        const latestData = statData.data.reverse().find((d: any) => d.outputs.data.bands.bands_0.stats.sampleCount > 0);

        if (latestData) {
          const stats = latestData.outputs.data.bands.bands_0.stats;
          const date = latestData.interval.from.split('T')[0];

          // Guardar en Historial
          const { error: insertError } = await supabase
            .from('ndvi_history')
            .upsert({
              lot_id: lot.id,
              date: date,
              mean_ndvi: stats.mean,
              max_ndvi: stats.max,
              min_ndvi: stats.min,
              std_dev: stats.stDev,
              valid_pixels_percent: latestData.outputs.dataMask.bands.bands_0.stats.mean * 100 // Aprox
            }, { onConflict: 'lot_id, date' });

          if (insertError) console.error(`Error guardando historial lote ${lot.name}:`, insertError);

          // Verificar Alerta
          if (stats.mean < THRESHOLD_ALERTA_NDVI) {
            // Crear Alerta si no existe una reciente (lógica simple)
            await supabase.from('alerts').insert({
              firm_id: lot.firm_id,
              premise_id: lot.premise_id,
              lot_id: lot.id,
              title: `Alerta NDVI Bajo: ${lot.name}`,
              description: `El índice de vegetación promedio cayó a ${stats.mean.toFixed(2)}. Posible estrés hídrico o plaga.`,
              alert_type: 'warning',
              priority: 'high',
              alert_date: new Date(),
              status: 'pending',
              origen: 'automatica'
            });
            results.push({ lot: lot.name, status: 'ALERT_CREATED', ndvi: stats.mean });
          } else {
            results.push({ lot: lot.name, status: 'OK', ndvi: stats.mean });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
