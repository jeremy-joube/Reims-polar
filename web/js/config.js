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

const SUPABASE_URL = "https://lvmolteqcovpluredadq.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bW9sdGVxY292cGx1cmVkYWRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ3NzkzMywiZXhwIjoyMTA2MDUzOTMzfQ.1ZL4DOD_zQxB5MIFqwwH7a8x-wEaiuktINoNg5UIi4M";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );