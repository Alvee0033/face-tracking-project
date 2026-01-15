require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
    console.log(`Checking user: ${email}`);

    // 1. Check Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.log('User not found in Auth. Creating...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: 'Test Recruiter', role: 'recruiter' }
        });

        if (createError) {
            console.error('Failed to create user:', createError);
            return;
        }
        console.log('User created:', newUser.user.id);
        return checkUserProfile(newUser.user.id, email);
    }

    console.log('User found:', user.id);
    await checkUserProfile(user.id, email);
}

async function checkUserProfile(userId, email) {
    // 2. Check Public Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile) {
        console.log('Profile missing. Creating...');
        await supabase.from('profiles').insert({
            id: userId,
            email: email,
            full_name: 'Test Recruiter',
            role: 'recruiter'
        });
        console.log('Profile created.');
    } else {
        console.log('Profile found:', profile);
        if (profile.role !== 'recruiter') {
            console.log(`Fixing role mismatch: ${profile.role} -> recruiter`);
            await supabase.from('profiles').update({ role: 'recruiter' }).eq('id', userId);
        }
    }

    // 3. Check Recruiter Profile
    const { data: recProfile, error: recError } = await supabase
        .from('recruiter_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!recProfile) {
        console.log('Recruiter Profile missing. Creating...');
        await supabase.from('recruiter_profiles').insert({
            user_id: userId,
            company_name: 'Tech Corp',
            company_website: 'https://example.com'
        });
        console.log('Recruiter Profile created.');
    } else {
        console.log('Recruiter Profile found.');
    }
}

// Check for a standard test user
checkUser('recruiter@example.com');
