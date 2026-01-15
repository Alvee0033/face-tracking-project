const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Hardcode credentials from .env file view earlier
const SUPABASE_URL = 'https://qsboqdxgclmhqudfgmcl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYm9xZHhnY2xtaHF1ZGZnbWNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzODQwMiwiZXhwIjoyMDgzODE0NDAyfQ.tVdn25U2SitJoj0J-0yB3U-0DQ7EffTefFW1Q2cST9M';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
    try {
        console.log('Reading migration file...');
        const sqlPath = path.join(__dirname, 'add_missing_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration...');

        // We can't execute raw SQL directly with the JS client unless we have a stored procedure for it.
        // However, we can try to use a specialized RPC function if one exists, or fallback to manual instructions.

        // Attempt 1: Check if 'exec_sql' or similar RPC exists (common in some setups)
        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.log('Direct execution via RPC failed:', error.message);
            console.log('Attempting alternative method...');

            // Attempt 2: REST API direct query (rarely enabled/available without extensions)
            // Since we can't easily run DDL (ALTER TABLE) via the JS client without a specific RPC,
            // I will output the critical instructions for the user if this fails.

            console.error('\n❌ AUTOMATED MIGRATION FAILED');
            console.error('The Supabase JS client cannot execute "ALTER TABLE" commands directly without a helper function.');
            console.error('\nPlease execute the following SQL manually in your Supabase Dashboard SQL Editor:');
            console.error('---------------------------------------------------');
            console.log(sql);
            console.error('---------------------------------------------------');
            console.error('URL: https://supabase.com/dashboard/project/qsboqdxgclmhqudfgmcl/sql');
        } else {
            console.log('✅ Migration executed successfully!');
        }
    } catch (error) {
        console.error('Migration script error:', error);
    }
}

runMigration();
