/**
 * Helper function to get or create recruiter profile
 * This ensures that recruiter profiles are automatically created when needed
 */
const getOrCreateRecruiterProfile = async (userSupabase, userId) => {
    try {
        // Try to get existing recruiter profile
        let { data: recruiterProfile, error: profileError } = await userSupabase
            .from('recruiter_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        // If profile exists, return it
        if (recruiterProfile && !profileError) {
            return { data: recruiterProfile, error: null };
        }

        // Profile doesn't exist, create it
        console.log('Recruiter profile not found, creating default profile for user:', userId);

        // Get user's profile info
        const { data: userProfile } = await userSupabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();

        // Create default recruiter profile
        let newProfile;

        try {
            const { data, error: createError } = await userSupabase
                .from('recruiter_profiles')
                .insert({
                    user_id: userId,
                    company_name: userProfile?.full_name ? `${userProfile.full_name}'s Company` : 'My Company',
                    company_website: '',
                    company_size: '1-10',
                    industry: 'Technology',
                    company_description: 'Please update your company information in the profile settings.',
                    country: 'Bangladesh',
                    city: 'Dhaka'
                })
                .select('*')
                .single();

            if (createError) throw createError;
            newProfile = data;
        } catch (err) {
            // Check for missing column error
            if (err.message && err.message.includes('column') && err.message.includes('does not exist')) {
                console.warn('Column missing in database during auto-create, falling back to minimal insert', err.message);
                const { data, error: simpleError } = await userSupabase
                    .from('recruiter_profiles')
                    .insert({
                        user_id: userId,
                        company_name: userProfile?.full_name ? `${userProfile.full_name}'s Company` : 'My Company',
                        country: 'Bangladesh',
                        city: 'Dhaka'
                    })
                    .select('*')
                    .single();

                if (simpleError) {
                    console.error('Error creating recruiter profile (minimal):', simpleError);
                    return { data: null, error: simpleError };
                }
                newProfile = data;
            } else {
                console.error('Error creating recruiter profile:', err);
                return { data: null, error: err };
            }
        }

        console.log('Successfully created recruiter profile:', newProfile.id);
        return { data: newProfile, error: null };
    } catch (error) {
        console.error('Error in getOrCreateRecruiterProfile:', error);
        return { data: null, error };
    }
};

module.exports = { getOrCreateRecruiterProfile };
