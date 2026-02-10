export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      agricultural_works: {
        Row: {
          created_at: string | null;
          date: string | null;
          detail: string | null;
          dose_per_ha: number | null;
          firm_id: string | null;
          fuel_used: number | null;
          hectares: number | null;
          id: string;
          input_name: string | null;
          lot_id: string | null;
          others: string | null;
          premise_id: string | null;
          quantity_used: number | null;
          unit: string | null;
          variety: string | null;
          work_type: string | null;
        };
        Insert: {
          created_at?: string | null;
          date?: string | null;
          detail?: string | null;
          dose_per_ha?: number | null;
          firm_id?: string | null;
          fuel_used?: number | null;
          hectares?: number | null;
          id?: string;
          input_name?: string | null;
          lot_id?: string | null;
          others?: string | null;
          premise_id?: string | null;
          quantity_used?: number | null;
          unit?: string | null;
          variety?: string | null;
          work_type?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string | null;
          detail?: string | null;
          dose_per_ha?: number | null;
          firm_id?: string | null;
          fuel_used?: number | null;
          hectares?: number | null;
          id?: string;
          input_name?: string | null;
          lot_id?: string | null;
          others?: string | null;
          premise_id?: string | null;
          quantity_used?: number | null;
          unit?: string | null;
          variety?: string | null;
          work_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agricultural_works_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agricultural_works_lot_id_fkey";
            columns: ["lot_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agricultural_works_premise_id_fkey";
            columns: ["premise_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      analisis_semillas: {
        Row: {
          created_at: string | null;
          fecha: string | null;
          firma_id: string | null;
          germinacion: number | null;
          humedad: number | null;
          id: string;
          lote_id: string | null;
          no_viables: number | null;
          observaciones: string | null;
          predio_id: string | null;
          primer_conteo: number | null;
          pureza: number | null;
          seed_variety: string | null;
          tetrazolio: number | null;
        };
        Insert: {
          created_at?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          germinacion?: number | null;
          humedad?: number | null;
          id?: string;
          lote_id?: string | null;
          no_viables?: number | null;
          observaciones?: string | null;
          predio_id?: string | null;
          primer_conteo?: number | null;
          pureza?: number | null;
          seed_variety?: string | null;
          tetrazolio?: number | null;
        };
        Update: {
          created_at?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          germinacion?: number | null;
          humedad?: number | null;
          id?: string;
          lote_id?: string | null;
          no_viables?: number | null;
          observaciones?: string | null;
          predio_id?: string | null;
          primer_conteo?: number | null;
          pureza?: number | null;
          seed_variety?: string | null;
          tetrazolio?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "analisis_semillas_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analisis_semillas_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analisis_semillas_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      analisis_suelo: {
        Row: {
          aplicado: boolean | null;
          created_at: string | null;
          deficit: string | null;
          fecha: string | null;
          firma_id: string | null;
          fuente_recomendada: string | null;
          hectareas: number | null;
          id: string;
          kg_ha: number | null;
          kg_total: number | null;
          lote_id: string | null;
          objetivo: string | null;
          parametro: string | null;
          predio_id: string | null;
          redondeo: number | null;
          resultado: string | null;
        };
        Insert: {
          aplicado?: boolean | null;
          created_at?: string | null;
          deficit?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          fuente_recomendada?: string | null;
          hectareas?: number | null;
          id?: string;
          kg_ha?: number | null;
          kg_total?: number | null;
          lote_id?: string | null;
          objetivo?: string | null;
          parametro?: string | null;
          predio_id?: string | null;
          redondeo?: number | null;
          resultado?: string | null;
        };
        Update: {
          aplicado?: boolean | null;
          created_at?: string | null;
          deficit?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          fuente_recomendada?: string | null;
          hectareas?: number | null;
          id?: string;
          kg_ha?: number | null;
          kg_total?: number | null;
          lote_id?: string | null;
          objetivo?: string | null;
          parametro?: string | null;
          predio_id?: string | null;
          redondeo?: number | null;
          resultado?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analisis_suelo_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analisis_suelo_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analisis_suelo_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      depots: {
        Row: {
          created_at: string | null;
          description: string | null;
          firm_id: string | null;
          id: string;
          location: string | null;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          firm_id?: string | null;
          id?: string;
          location?: string | null;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          firm_id?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "depots_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          account_number: string | null;
          alert_days: number | null;
          amount: number;
          batch: string | null;
          category: string;
          commercial_name: string | null;
          concept: string | null;
          created_at: string | null;
          currency: string | null;
          date: string | null;
          description: string | null;
          due_date: string | null;
          email: string | null;
          firm_id: string | null;
          id: string;
          invoice_number: string | null;
          invoice_series: string | null;
          iva: number | null;
          iva_amount: number | null;
          payment_method: string | null;
          payment_order_id: string | null;
          phone: string | null;
          purchase_order_id: string | null;
          quantity: number | null;
          remittance_id: string | null;
          rut: string | null;
          status: string | null;
          subtotal: number | null;
          tax_rate: number | null;
          unit_price: number | null;
          units_envases: string | null;
        };
        Insert: {
          account_number?: string | null;
          alert_days?: number | null;
          amount: number;
          batch?: string | null;
          category: string;
          commercial_name?: string | null;
          concept?: string | null;
          created_at?: string | null;
          currency?: string | null;
          date?: string | null;
          description?: string | null;
          due_date?: string | null;
          email?: string | null;
          firm_id?: string | null;
          id?: string;
          invoice_number?: string | null;
          invoice_series?: string | null;
          iva?: number | null;
          iva_amount?: number | null;
          payment_method?: string | null;
          payment_order_id?: string | null;
          phone?: string | null;
          purchase_order_id?: string | null;
          quantity?: number | null;
          remittance_id?: string | null;
          rut?: string | null;
          status?: string | null;
          subtotal?: number | null;
          tax_rate?: number | null;
          unit_price?: number | null;
          units_envases?: string | null;
        };
        Update: {
          account_number?: string | null;
          alert_days?: number | null;
          amount?: number;
          batch?: string | null;
          category?: string;
          commercial_name?: string | null;
          concept?: string | null;
          created_at?: string | null;
          currency?: string | null;
          date?: string | null;
          description?: string | null;
          due_date?: string | null;
          email?: string | null;
          firm_id?: string | null;
          id?: string;
          invoice_number?: string | null;
          invoice_series?: string | null;
          iva?: number | null;
          iva_amount?: number | null;
          payment_method?: string | null;
          payment_order_id?: string | null;
          phone?: string | null;
          purchase_order_id?: string | null;
          quantity?: number | null;
          remittance_id?: string | null;
          rut?: string | null;
          status?: string | null;
          subtotal?: number | null;
          tax_rate?: number | null;
          unit_price?: number | null;
          units_envases?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_payment_order_id_fkey";
            columns: ["payment_order_id"];
            isOneToOne: false;
            referencedRelation: "payment_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_remittance_id_fkey";
            columns: ["remittance_id"];
            isOneToOne: false;
            referencedRelation: "remittances";
            referencedColumns: ["id"];
          },
        ];
      };
      fields: {
        Row: {
          created_at: string | null;
          department: string | null;
          firm_id: string | null;
          id: string;
          location_text: string | null;
          name: string;
          notes: string | null;
        };
        Insert: {
          created_at?: string | null;
          department?: string | null;
          firm_id?: string | null;
          id?: string;
          location_text?: string | null;
          name: string;
          notes?: string | null;
        };
        Update: {
          created_at?: string | null;
          department?: string | null;
          firm_id?: string | null;
          id?: string;
          location_text?: string | null;
          name?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      firms: {
        Row: {
          created_at: string | null;
          id: string;
          location: string | null;
          name: string;
          owner_id: string | null;
          rut: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          owner_id?: string | null;
          rut?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          owner_id?: string | null;
          rut?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "firms_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      income: {
        Row: {
          address: string | null;
          alert_days: number | null;
          amount: number;
          auth_number: string | null;
          category: string;
          company_name: string | null;
          created_at: string | null;
          date: string | null;
          description: string | null;
          due_date: string | null;
          firm_id: string | null;
          guide_number: string | null;
          id: string;
          iva: number | null;
          iva_amount: number | null;
          payment_method: string | null;
          product: string | null;
          rut: string | null;
          status: string | null;
          tax_rate: number | null;
          transport_cost: number | null;
          transport_method: string | null;
          unit: string | null;
          unit_price: number | null;
        };
        Insert: {
          address?: string | null;
          alert_days?: number | null;
          amount: number;
          auth_number?: string | null;
          category: string;
          company_name?: string | null;
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          due_date?: string | null;
          firm_id?: string | null;
          guide_number?: string | null;
          id?: string;
          iva?: number | null;
          iva_amount?: number | null;
          payment_method?: string | null;
          product?: string | null;
          rut?: string | null;
          status?: string | null;
          tax_rate?: number | null;
          transport_cost?: number | null;
          transport_method?: string | null;
          unit?: string | null;
          unit_price?: number | null;
        };
        Update: {
          address?: string | null;
          alert_days?: number | null;
          amount?: number;
          auth_number?: string | null;
          category?: string;
          company_name?: string | null;
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          due_date?: string | null;
          firm_id?: string | null;
          guide_number?: string | null;
          id?: string;
          iva?: number | null;
          iva_amount?: number | null;
          payment_method?: string | null;
          product?: string | null;
          rut?: string | null;
          status?: string | null;
          tax_rate?: number | null;
          transport_cost?: number | null;
          transport_method?: string | null;
          unit?: string | null;
          unit_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "income_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      input_movements: {
        Row: {
          batch_number: string | null;
          created_at: string | null;
          created_by: string | null;
          date: string | null;
          description: string | null;
          destination_depot_id: string | null;
          destination_input_id: string | null;
          document_reference: string | null;
          firm_id: string | null;
          id: string;
          invoice_id: string | null;
          input_id: string | null;
          lot_id: string | null;
          premise_id: string | null;
          purchase_order_id: string | null;
          quantity: number;
          remittance_id: string | null;
          type: string | null;
          unit_cost: number | null;
        };
        Insert: {
          batch_number?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string | null;
          description?: string | null;
          destination_depot_id?: string | null;
          destination_input_id?: string | null;
          document_reference?: string | null;
          firm_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          input_id?: string | null;
          lot_id?: string | null;
          premise_id?: string | null;
          purchase_order_id?: string | null;
          quantity: number;
          remittance_id?: string | null;
          type?: string | null;
          unit_cost?: number | null;
        };
        Update: {
          batch_number?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string | null;
          description?: string | null;
          destination_depot_id?: string | null;
          destination_input_id?: string | null;
          document_reference?: string | null;
          firm_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          input_id?: string | null;
          lot_id?: string | null;
          premise_id?: string | null;
          purchase_order_id?: string | null;
          quantity?: number;
          remittance_id?: string | null;
          type?: string | null;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "input_movements_destination_depot_id_fkey";
            columns: ["destination_depot_id"];
            isOneToOne: false;
            referencedRelation: "depots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_destination_input_id_fkey";
            columns: ["destination_input_id"];
            isOneToOne: false;
            referencedRelation: "inputs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_input_id_fkey";
            columns: ["input_id"];
            isOneToOne: false;
            referencedRelation: "inputs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_lot_id_fkey";
            columns: ["lot_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_premise_id_fkey";
            columns: ["premise_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_remittance_id_fkey";
            columns: ["remittance_id"];
            isOneToOne: false;
            referencedRelation: "remittances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "input_movements_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      inputs: {
        Row: {
          active_ingredient: string | null;
          batch_number: string | null;
          brand: string | null;
          category: string | null;
          cost_per_unit: number | null;
          created_at: string | null;
          currency: string | null;
          current_stock: number | null;
          depot_id: string | null;
          description: string | null;
          drug: string | null;
          entry_date: string | null;
          expiration_date: string | null;
          firm_id: string | null;
          id: string;
          image_url: string | null;
          is_depot: boolean | null;
          laboratory: string | null;
          lot_id: string | null;
          min_stock_alert: number | null;
          name: string;
          stock_status: string | null;
          unit: string | null;
          variety: string | null;
        };
        Insert: {
          active_ingredient?: string | null;
          batch_number?: string | null;
          brand?: string | null;
          category?: string | null;
          cost_per_unit?: number | null;
          created_at?: string | null;
          currency?: string | null;
          current_stock?: number | null;
          depot_id?: string | null;
          description?: string | null;
          drug?: string | null;
          entry_date?: string | null;
          expiration_date?: string | null;
          firm_id?: string | null;
          id?: string;
          image_url?: string | null;
          is_depot?: boolean | null;
          laboratory?: string | null;
          lot_id?: string | null;
          min_stock_alert?: number | null;
          name: string;
          stock_status?: string | null;
          unit?: string | null;
          variety?: string | null;
        };
        Update: {
          active_ingredient?: string | null;
          batch_number?: string | null;
          brand?: string | null;
          category?: string | null;
          cost_per_unit?: number | null;
          created_at?: string | null;
          currency?: string | null;
          current_stock?: number | null;
          depot_id?: string | null;
          description?: string | null;
          drug?: string | null;
          entry_date?: string | null;
          expiration_date?: string | null;
          firm_id?: string | null;
          id?: string;
          image_url?: string | null;
          is_depot?: boolean | null;
          laboratory?: string | null;
          lot_id?: string | null;
          min_stock_alert?: number | null;
          name?: string;
          stock_status?: string | null;
          unit?: string | null;
          variety?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inputs_depot_id_fkey";
            columns: ["depot_id"];
            isOneToOne: false;
            referencedRelation: "depots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inputs_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inputs_lot_id_fkey";
            columns: ["lot_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
        ];
      };
      licenses: {
        Row: {
          created_at: string | null;
          end_date: string | null;
          firm_id: string | null;
          id: string;
          plan_type: string | null;
          price: number | null;
          start_date: string | null;
          status: string | null;
        };
        Insert: {
          created_at?: string | null;
          end_date?: string | null;
          firm_id?: string | null;
          id?: string;
          plan_type?: string | null;
          price?: number | null;
          start_date?: string | null;
          status?: string | null;
        };
        Update: {
          created_at?: string | null;
          end_date?: string | null;
          firm_id?: string | null;
          id?: string;
          plan_type?: string | null;
          price?: number | null;
          start_date?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "licenses_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      livestock_monitoring: {
        Row: {
          average_weight: number | null;
          body_condition: string | null;
          category: string | null;
          created_at: string | null;
          date: string;
          id: string;
          max_weight: number | null;
          min_weight: number | null;
          notes: string | null;
          quantity: number | null;
          rodeo: string | null;
          treatment: string | null;
          user_id: string;
        };
        Insert: {
          average_weight?: number | null;
          body_condition?: string | null;
          category?: string | null;
          created_at?: string | null;
          date: string;
          id?: string;
          max_weight?: number | null;
          min_weight?: number | null;
          notes?: string | null;
          quantity?: number | null;
          rodeo?: string | null;
          treatment?: string | null;
          user_id: string;
        };
        Update: {
          average_weight?: number | null;
          body_condition?: string | null;
          category?: string | null;
          created_at?: string | null;
          date?: string;
          id?: string;
          max_weight?: number | null;
          min_weight?: number | null;
          notes?: string | null;
          quantity?: number | null;
          rodeo?: string | null;
          treatment?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      livestock_works: {
        Row: {
          alert_days_before: number | null;
          average_weight: number | null;
          category: string | null;
          created_at: string | null;
          date: string | null;
          detail: string | null;
          dose_cc: number | null;
          firm_id: string | null;
          herd_name: string | null;
          id: string;
          lot_change: string | null;
          lot_id: string | null;
          other_events: string | null;
          premise_id: string | null;
          product_used: string | null;
          quantity: number | null;
          suggested_repeat_date: string | null;
          traceability_file_url: string | null;
          treatment_date: string | null;
          treatment_name: string | null;
        };
        Insert: {
          alert_days_before?: number | null;
          average_weight?: number | null;
          category?: string | null;
          created_at?: string | null;
          date?: string | null;
          detail?: string | null;
          dose_cc?: number | null;
          firm_id?: string | null;
          herd_name?: string | null;
          id?: string;
          lot_change?: string | null;
          lot_id?: string | null;
          other_events?: string | null;
          premise_id?: string | null;
          product_used?: string | null;
          quantity?: number | null;
          suggested_repeat_date?: string | null;
          traceability_file_url?: string | null;
          treatment_date?: string | null;
          treatment_name?: string | null;
        };
        Update: {
          alert_days_before?: number | null;
          average_weight?: number | null;
          category?: string | null;
          created_at?: string | null;
          date?: string | null;
          detail?: string | null;
          dose_cc?: number | null;
          firm_id?: string | null;
          herd_name?: string | null;
          id?: string;
          lot_change?: string | null;
          lot_id?: string | null;
          other_events?: string | null;
          premise_id?: string | null;
          product_used?: string | null;
          quantity?: number | null;
          suggested_repeat_date?: string | null;
          traceability_file_url?: string | null;
          treatment_date?: string | null;
          treatment_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "livestock_works_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "livestock_works_lot_id_fkey";
            columns: ["lot_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "livestock_works_premise_id_fkey";
            columns: ["premise_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      lluvias: {
        Row: {
          created_at: string | null;
          fecha: string | null;
          firma_id: string | null;
          id: string;
          mm: number | null;
          predio_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          id?: string;
          mm?: number | null;
          predio_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          id?: string;
          mm?: number | null;
          predio_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lluvias_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lluvias_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      lots: {
        Row: {
          area_hectares: number | null;
          created_at: string | null;
          critical_remnant_height_cm: number | null;
          crops: string | null;
          current_crop: string | null;
          firm_id: string | null;
          id: string;
          is_depot: boolean | null;
          land_use: string | null;
          name: string;
          pasture_height: number | null;
          pasture_height_date: string | null;
          planting_date: string | null;
          polygon_data: Json | null;
          premise_id: string | null;
          remnant_height: number | null;
          status: string | null;
        };
        Insert: {
          area_hectares?: number | null;
          created_at?: string | null;
          critical_remnant_height_cm?: number | null;
          crops?: string | null;
          current_crop?: string | null;
          firm_id?: string | null;
          id?: string;
          is_depot?: boolean | null;
          land_use?: string | null;
          name: string;
          pasture_height?: number | null;
          pasture_height_date?: string | null;
          planting_date?: string | null;
          polygon_data?: Json | null;
          premise_id?: string | null;
          remnant_height?: number | null;
          status?: string | null;
        };
        Update: {
          area_hectares?: number | null;
          created_at?: string | null;
          critical_remnant_height_cm?: number | null;
          crops?: string | null;
          current_crop?: string | null;
          firm_id?: string | null;
          id?: string;
          is_depot?: boolean | null;
          land_use?: string | null;
          name?: string;
          pasture_height?: number | null;
          pasture_height_date?: string | null;
          planting_date?: string | null;
          polygon_data?: Json | null;
          premise_id?: string | null;
          remnant_height?: number | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lots_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lots_premise_id_fkey";
            columns: ["premise_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      monitoreo_agricola: {
        Row: {
          comentarios: string | null;
          created_at: string | null;
          fecha: string | null;
          firma_id: string | null;
          id: string;
          lote_id: string | null;
          predio_id: string | null;
        };
        Insert: {
          comentarios?: string | null;
          created_at?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          id?: string;
          lote_id?: string | null;
          predio_id?: string | null;
        };
        Update: {
          comentarios?: string | null;
          created_at?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          id?: string;
          lote_id?: string | null;
          predio_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monitoreo_agricola_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoreo_agricola_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoreo_agricola_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      monitoreo_ganado: {
        Row: {
          cantidad: number | null;
          categoria: string | null;
          created_at: string | null;
          fecha: string | null;
          firm_id: string | null;
          id: string;
          notas: string | null;
          peso_maximo: number | null;
          peso_minimo: number | null;
          peso_promedio: number | null;
          predio_id: string | null;
          rodeo: string | null;
          tratamiento: string | null;
        };
        Insert: {
          cantidad?: number | null;
          categoria?: string | null;
          created_at?: string | null;
          fecha?: string | null;
          firm_id?: string | null;
          id?: string;
          notas?: string | null;
          peso_maximo?: number | null;
          peso_minimo?: number | null;
          peso_promedio?: number | null;
          predio_id?: string | null;
          rodeo?: string | null;
          tratamiento?: string | null;
        };
        Update: {
          cantidad?: number | null;
          categoria?: string | null;
          created_at?: string | null;
          fecha?: string | null;
          firm_id?: string | null;
          id?: string;
          notas?: string | null;
          peso_maximo?: number | null;
          peso_minimo?: number | null;
          peso_promedio?: number | null;
          predio_id?: string | null;
          rodeo?: string | null;
          tratamiento?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monitoreo_ganado_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoreo_ganado_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      monitoreo_pasturas: {
        Row: {
          altura_lugar1_cm: number | null;
          altura_lugar2_cm: number | null;
          altura_lugar3_cm: number | null;
          created_at: string | null;
          cultivo_lugar1: string | null;
          cultivo_lugar2: string | null;
          cultivo_lugar3: string | null;
          fecha: string | null;
          firma_id: string | null;
          hectareas: number | null;
          id: string;
          lote_id: string | null;
          predio_id: string | null;
          remanente_objetivo_cm: number | null;
        };
        Insert: {
          altura_lugar1_cm?: number | null;
          altura_lugar2_cm?: number | null;
          altura_lugar3_cm?: number | null;
          created_at?: string | null;
          cultivo_lugar1?: string | null;
          cultivo_lugar2?: string | null;
          cultivo_lugar3?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          hectareas?: number | null;
          id?: string;
          lote_id?: string | null;
          predio_id?: string | null;
          remanente_objetivo_cm?: number | null;
        };
        Update: {
          altura_lugar1_cm?: number | null;
          altura_lugar2_cm?: number | null;
          altura_lugar3_cm?: number | null;
          created_at?: string | null;
          cultivo_lugar1?: string | null;
          cultivo_lugar2?: string | null;
          cultivo_lugar3?: string | null;
          fecha?: string | null;
          firma_id?: string | null;
          hectareas?: number | null;
          id?: string;
          lote_id?: string | null;
          predio_id?: string | null;
          remanente_objetivo_cm?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "monitoreo_ganadero_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoreo_ganadero_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoreo_ganadero_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_orders: {
        Row: {
          amount: number;
          approval_date: string | null;
          approved_by: string | null;
          beneficiary_account: string | null;
          beneficiary_bank: string | null;
          beneficiary_name: string;
          beneficiary_rut: string | null;
          concept: string;
          created_at: string | null;
          currency: string | null;
          expense_id: string | null;
          firm_id: string | null;
          id: string;
          notes: string | null;
          order_date: string;
          order_number: string;
          payment_date: string | null;
          payment_method: string | null;
          planned_payment_date: string | null;
          purchase_order_id: string | null;
          reference_number: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          approval_date?: string | null;
          approved_by?: string | null;
          beneficiary_account?: string | null;
          beneficiary_bank?: string | null;
          beneficiary_name: string;
          beneficiary_rut?: string | null;
          concept: string;
          created_at?: string | null;
          currency?: string | null;
          expense_id?: string | null;
          firm_id?: string | null;
          id?: string;
          notes?: string | null;
          order_date: string;
          order_number: string;
          payment_date?: string | null;
          payment_method?: string | null;
          planned_payment_date?: string | null;
          purchase_order_id?: string | null;
          reference_number?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          approval_date?: string | null;
          approved_by?: string | null;
          beneficiary_account?: string | null;
          beneficiary_bank?: string | null;
          beneficiary_name?: string;
          beneficiary_rut?: string | null;
          concept?: string;
          created_at?: string | null;
          currency?: string | null;
          expense_id?: string | null;
          firm_id?: string | null;
          id?: string;
          notes?: string | null;
          order_date?: string;
          order_number?: string;
          payment_date?: string | null;
          payment_method?: string | null;
          planned_payment_date?: string | null;
          purchase_order_id?: string | null;
          reference_number?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_orders_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_orders_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_orders_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      premises: {
        Row: {
          created_at: string | null;
          firm_id: string | null;
          id: string;
          location: string | null;
          name: string;
          total_area: number | null;
        };
        Insert: {
          created_at?: string | null;
          firm_id?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          total_area?: number | null;
        };
        Update: {
          created_at?: string | null;
          firm_id?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          total_area?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "premises_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      proyecciones_agricolas: {
        Row: {
          created_at: string;
          cultivo_proyectado: string | null;
          dosis_ha: number | null;
          estado: string | null;
          fecha_tentativa: string | null;
          firma_id: string | null;
          hectareas: number | null;
          id: string;
          lote_id: string | null;
          predio_id: string | null;
          producto: string | null;
          tipo_trabajo: string | null;
          total: number | null;
          trabajo_agricola_id: string | null;
          uso_suelo_actual: string | null;
          variedad: string | null;
        };
        Insert: {
          created_at?: string;
          cultivo_proyectado?: string | null;
          dosis_ha?: number | null;
          estado?: string | null;
          fecha_tentativa?: string | null;
          firma_id?: string | null;
          hectareas?: number | null;
          id?: string;
          lote_id?: string | null;
          predio_id?: string | null;
          producto?: string | null;
          tipo_trabajo?: string | null;
          total?: number | null;
          trabajo_agricola_id?: string | null;
          uso_suelo_actual?: string | null;
          variedad?: string | null;
        };
        Update: {
          created_at?: string;
          cultivo_proyectado?: string | null;
          dosis_ha?: number | null;
          estado?: string | null;
          fecha_tentativa?: string | null;
          firma_id?: string | null;
          hectareas?: number | null;
          id?: string;
          lote_id?: string | null;
          predio_id?: string | null;
          producto?: string | null;
          tipo_trabajo?: string | null;
          total?: number | null;
          trabajo_agricola_id?: string | null;
          uso_suelo_actual?: string | null;
          variedad?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "proyecciones_agricolas_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyecciones_agricolas_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyecciones_agricolas_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyecciones_agricolas_trabajo_agricola_id_fkey";
            columns: ["trabajo_agricola_id"];
            isOneToOne: false;
            referencedRelation: "agricultural_works";
            referencedColumns: ["id"];
          },
        ];
      };
      proyecciones_ganaderas: {
        Row: {
          cantidad: number | null;
          categoria: string | null;
          created_at: string;
          estado: string | null;
          fecha_tentativa: string | null;
          firma_id: string | null;
          id: string;
          lote_id: string | null;
          observaciones: string | null;
          predio_id: string | null;
          tipo_evento: string | null;
          trabajo_ganadero_id: string | null;
        };
        Insert: {
          cantidad?: number | null;
          categoria?: string | null;
          created_at?: string;
          estado?: string | null;
          fecha_tentativa?: string | null;
          firma_id?: string | null;
          id?: string;
          lote_id?: string | null;
          observaciones?: string | null;
          predio_id?: string | null;
          tipo_evento?: string | null;
          trabajo_ganadero_id?: string | null;
        };
        Update: {
          cantidad?: number | null;
          categoria?: string | null;
          created_at?: string;
          estado?: string | null;
          fecha_tentativa?: string | null;
          firma_id?: string | null;
          id?: string;
          lote_id?: string | null;
          observaciones?: string | null;
          predio_id?: string | null;
          tipo_evento?: string | null;
          trabajo_ganadero_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "proyecciones_ganaderas_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyecciones_ganaderas_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyecciones_ganaderas_predio_id_fkey";
            columns: ["predio_id"];
            isOneToOne: false;
            referencedRelation: "premises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proyecciones_ganaderas_trabajo_ganadero_id_fkey";
            columns: ["trabajo_ganadero_id"];
            isOneToOne: false;
            referencedRelation: "livestock_works";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_items: {
        Row: {
          created_at: string | null;
          id: string;
          input_id: string | null;
          item_description: string;
          purchase_order_id: string | null;
          quantity: number;
          subtotal: number;
          tax_amount: number | null;
          tax_rate: number | null;
          total: number;
          unit: string;
          unit_price: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          input_id?: string | null;
          item_description: string;
          purchase_order_id?: string | null;
          quantity: number;
          subtotal: number;
          tax_amount?: number | null;
          tax_rate?: number | null;
          total: number;
          unit: string;
          unit_price: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          input_id?: string | null;
          item_description?: string;
          purchase_order_id?: string | null;
          quantity?: number;
          subtotal?: number;
          tax_amount?: number | null;
          tax_rate?: number | null;
          total?: number;
          unit?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_input_id_fkey";
            columns: ["input_id"];
            isOneToOne: false;
            referencedRelation: "inputs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          delivery_address: string | null;
          delivery_date: string | null;
          firm_id: string | null;
          id: string;
          notes: string | null;
          order_date: string;
          order_number: string;
          payment_terms: string | null;
          status: string | null;
          subtotal: number | null;
          supplier_address: string | null;
          supplier_email: string | null;
          supplier_name: string;
          supplier_phone: string | null;
          supplier_rut: string | null;
          tax_amount: number | null;
          total_amount: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          delivery_address?: string | null;
          delivery_date?: string | null;
          firm_id?: string | null;
          id?: string;
          notes?: string | null;
          order_date: string;
          order_number: string;
          payment_terms?: string | null;
          status?: string | null;
          subtotal?: number | null;
          supplier_address?: string | null;
          supplier_email?: string | null;
          supplier_name: string;
          supplier_phone?: string | null;
          supplier_rut?: string | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          delivery_address?: string | null;
          delivery_date?: string | null;
          firm_id?: string | null;
          id?: string;
          notes?: string | null;
          order_date?: string;
          order_number?: string;
          payment_terms?: string | null;
          status?: string | null;
          subtotal?: number | null;
          supplier_address?: string | null;
          supplier_email?: string | null;
          supplier_name?: string;
          supplier_phone?: string | null;
          supplier_rut?: string | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          firm_id: string | null;
          id: string;
          priority: string | null;
          status: string | null;
          title: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          firm_id?: string | null;
          id?: string;
          priority?: string | null;
          status?: string | null;
          title: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          firm_id?: string | null;
          id?: string;
          priority?: string | null;
          status?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      remittance_items: {
        Row: {
          batch_expiry_date: string | null;
          batch_number: string | null;
          category: string | null;
          condition: string | null;
          created_at: string | null;
          id: string;
          input_id: string | null;
          item_description: string;
          notes: string | null;
          purchase_order_item_id: string | null;
          quantity_ordered: number | null;
          quantity_received: number;
          remittance_id: string | null;
          unit: string;
        };
        Insert: {
          batch_expiry_date?: string | null;
          batch_number?: string | null;
          category?: string | null;
          condition?: string | null;
          created_at?: string | null;
          id?: string;
          input_id?: string | null;
          item_description: string;
          notes?: string | null;
          purchase_order_item_id?: string | null;
          quantity_ordered?: number | null;
          quantity_received: number;
          remittance_id?: string | null;
          unit: string;
        };
        Update: {
          batch_expiry_date?: string | null;
          batch_number?: string | null;
          category?: string | null;
          condition?: string | null;
          created_at?: string | null;
          id?: string;
          input_id?: string | null;
          item_description?: string;
          notes?: string | null;
          purchase_order_item_id?: string | null;
          quantity_ordered?: number | null;
          quantity_received?: number;
          remittance_id?: string | null;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "remittance_items_input_id_fkey";
            columns: ["input_id"];
            isOneToOne: false;
            referencedRelation: "inputs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remittance_items_purchase_order_item_id_fkey";
            columns: ["purchase_order_item_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remittance_items_remittance_id_fkey";
            columns: ["remittance_id"];
            isOneToOne: false;
            referencedRelation: "remittances";
            referencedColumns: ["id"];
          },
        ];
      };
      remittances: {
        Row: {
          created_at: string | null;
          delivery_address: string | null;
          depot_id: string | null;
          driver_name: string | null;
          firm_id: string | null;
          id: string;
          invoice_id: string | null;
          notes: string | null;
          premise_id: string | null;
          purchase_order_id: string | null;
          received_by: string | null;
          received_date: string | null;
          remittance_date: string;
          remittance_number: string;
          status: string | null;
          supplier_name: string;
          supplier_rut: string | null;
          transport_company: string | null;
          updated_at: string | null;
          vehicle_plate: string | null;
        };
        Insert: {
          created_at?: string | null;
          delivery_address?: string | null;
          depot_id?: string | null;
          driver_name?: string | null;
          firm_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          premise_id?: string | null;
          purchase_order_id?: string | null;
          received_by?: string | null;
          received_date?: string | null;
          remittance_date: string;
          remittance_number: string;
          status?: string | null;
          supplier_name: string;
          supplier_rut?: string | null;
          transport_company?: string | null;
          updated_at?: string | null;
          vehicle_plate?: string | null;
        };
        Update: {
          created_at?: string | null;
          delivery_address?: string | null;
          depot_id?: string | null;
          driver_name?: string | null;
          firm_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          premise_id?: string | null;
          purchase_order_id?: string | null;
          received_by?: string | null;
          received_date?: string | null;
          remittance_date?: string;
          remittance_number?: string;
          status?: string | null;
          supplier_name?: string;
          supplier_rut?: string | null;
          transport_company?: string | null;
          updated_at?: string | null;
          vehicle_plate?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "remittances_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remittances_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remittances_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          role: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          role?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          role?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
