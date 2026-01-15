
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' }); // Adjust path if needed

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Try to use service role if available for admin access, roughly checking env vars
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatuses() {
    console.log('Checking statuses...');
    const { data, error } = await supabase
        .from('job_applications')
        .select('status, id');

    if (error) {
        console.error(error);
        return;
    }

    const statusCounts = {};
    data.forEach(app => {
        statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });

    console.log('Status Counts:', statusCounts);
}

checkStatuses();
