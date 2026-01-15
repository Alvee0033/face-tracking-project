const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Hardcoded credentials from migration_script.js
const SUPABASE_URL = 'https://qsboqdxgclmhqudfgmcl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYm9xZHhnY2xtaHF1ZGZnbWNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzODQwMiwiZXhwIjoyMDgzODE0NDAyfQ.tVdn25U2SitJoj0J-0yB3U-0DQ7EffTefFW1Q2cST9M';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
    const sqlPath = path.join(__dirname, 'migrations', 'video_call_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration from', sqlPath);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.log("RPC exec_sql failed, trying direct query via client...");
        // Note: This relies on us having appropriate permissions or a way to run SQL. 
        // Usually SERVICE_ROLE key has admin rights but the JS client prevents raw SQL unless permitted via RPC or specific methods.
        console.error(error);
    } else {
        console.log('✅ Migration applied successfully via RPC!');
    }
}

runMigration();
