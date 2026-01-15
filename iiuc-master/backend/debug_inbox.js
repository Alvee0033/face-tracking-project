
const { createClient } = require('@supabase/supabase-js');
const { createClient: createAdminClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to emulate admin

// Use service role for admin access like the controller does
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

async function debugInbox() {
    // First, let's find a recruiter user ID to test with.
    // We'll pick a recruiter profile.
    const { data: profiles, error: pError } = await supabaseAdmin
        .from('recruiter_profiles')
        .select('user_id, id')
        .limit(1);

    if (!profiles || profiles.length === 0) {
        console.log('No recruiter profiles found.');
        return;
    }

    const userId = profiles[0].user_id;
    const recruiterId = profiles[0].id;
    console.log(`Testing with User ID: ${userId}, Recruiter ID: ${recruiterId}`);

    // 1. Get Jobs
    const { data: jobs, error: jobsError } = await supabaseAdmin
        .from('jobs')
        .select('id, job_title')
        .eq('recruiter_id', recruiterId);

    console.log(`Found ${jobs?.length} jobs.`);

    if (!jobs || jobs.length === 0) return;

    // 2. Check Applications for these jobs
    for (const job of jobs) {
        // Check TOTAL applications for this job
        const { count: totalApps } = await supabaseAdmin
            .from('job_applications')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);

        console.log(`Job: ${job.job_title} (${job.id}) has ${totalApps} total applications.`);

        // Check Shortlisted/Interview/Hired
        const { data: apps } = await supabaseAdmin
            .from('job_applications')
            .select('id, status')
            .eq('job_id', job.id)
            .in('status', ['shortlisted', 'interview', 'hired']);

        console.log(`  -> Matches inbox criteria: ${apps?.length}`);
        if (apps?.length > 0) {
            console.log(`     Statuses: ${apps.map(a => a.status).join(', ')}`);
        } else {
            // Debug: check what statuses DO exist
            const { data: allJobApps } = await supabaseAdmin
                .from('job_applications')
                .select('status')
                .eq('job_id', job.id);
            console.log(`     Actual Statuses present: ${allJobApps?.map(a => a.status).join(', ')}`);
        }
    }
}

debugInbox();
