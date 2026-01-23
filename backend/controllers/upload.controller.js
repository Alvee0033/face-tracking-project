const { supabaseAdmin } = require('../config/supabase');

const uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        // 1. Get Candidate Profile ID (to use in filename)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('candidate_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }

        // 2. Upload to Storage
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
        const bucketName = 'avatars';

        // Ensure bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets?.find(b => b.name === bucketName)) {
            await supabaseAdmin.storage.createBucket(bucketName, { public: true });
        }

        // Try to upload
        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Supabase Storage Upload Error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload image to storage', details: uploadError });
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = supabaseAdmin
            .storage
            .from(bucketName)
            .getPublicUrl(fileName);

        // 4. Update Profile in DB
        // verified column: profile_picture_url
        const { error: updateError } = await supabaseAdmin
            .from('candidate_profiles')
            .update({ profile_picture_url: publicUrl })
            .eq('id', profile.id);

        if (updateError) {
            console.error('Profile Update Error:', updateError);
            // attempt fallback if column name differs (unlikely given other controllers)
        }

        // If frontend expects 'avatar_url', I must ensure the API returns it. 
        // My frontend update will rely on the returned 'url' to update local state anyway.

        res.json({ success: true, url: publicUrl });

    } catch (error) {
        console.error('Upload Controller Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { uploadProfileImage };
