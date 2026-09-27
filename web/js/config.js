/*
 * ============================================================
 * REIMS POLAR PLANNER
 * Configuration Supabase
 * ============================================================
 *
 * IMPORTANT :
 * Remplace les deux valeurs ci-dessous par celles fournies
 * par ton projet Supabase.
 *
 * Project Settings
 *      ↓
 * API
 *      ↓
 * Project URL
 * anon public key
 *
 * La clé "anon" peut être utilisée côté navigateur.
 * Les règles de sécurité Supabase restent indispensables.
 */

const SUPABASE_URL = "https://lvmolteqcovpluredadq.supabase.co/rest/v1/";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bW9sdGVxY292cGx1cmVkYWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Nzc5MzMsImV4cCI6MjEwNjA1MzkzM30.i3uVvvaKAs3UGvIC0cJ8h0pRcRo9xY-2JDSg4Ht9awQ";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );