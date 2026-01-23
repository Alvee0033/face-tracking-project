const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Helper to fetch author details for a list of user IDs
 * Bypasses RLS to ensure we get the info.
 */
async function fetchAuthors(userIds) {
    if (!userIds || userIds.length === 0) return {};

    const uniqueIds = [...new Set(userIds)];

    // Fetch from Candidates
    const { data: candidates } = await supabaseAdmin
        .from('candidate_profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', uniqueIds);

    // Fetch from Recruiters
    const { data: recruiters } = await supabaseAdmin
        .from('recruiter_profiles')
        .select('user_id, full_name, company_name, profile_picture_url')
        .in('user_id', uniqueIds);

    const authorMap = {};

    candidates?.forEach(c => {
        authorMap[c.user_id] = {
            name: c.full_name,
            role: 'Candidate',
            avatar: c.profile_picture_url,
            is_recruiter: false
        };
    });

    recruiters?.forEach(r => {
        authorMap[r.user_id] = {
            name: r.full_name,
            role: r.company_name ? `${r.company_name} (Recruiter)` : 'Recruiter',
            avatar: r.profile_picture_url,
            is_recruiter: true
        };
    });

    return authorMap;
}

/**
 * Get community posts
 */
const getPosts = async (req, res) => {
    try {
        const { type = 'official', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // 1. Fetch Posts
        let query = supabaseAdmin
            .from('community_posts')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type !== 'all') {
            query = query.eq('type', type);
        }

        const { data: posts, error, count } = await query;

        if (error) throw error;

        // 2. Fetch Authors
        const userIds = posts.map(p => p.user_id);
        const authors = await fetchAuthors(userIds);

        // 3. Check Like Status for Current User
        const currentUserId = req.user?.id;
        let likedPostIds = new Set();
        if (currentUserId && posts.length > 0) {
            const { data: likes } = await supabaseAdmin
                .from('community_likes')
                .select('post_id')
                .eq('user_id', currentUserId)
                .in('post_id', posts.map(p => p.id));

            likes?.forEach(l => likedPostIds.add(l.post_id));
        }

        // 4. Merge Data
        const enrichedPosts = posts.map(post => {
            const author = authors[post.user_id] || {
                name: 'Unknown User',
                role: 'Member',
                avatar: null
            };

            return {
                id: post.id,
                content: post.content,
                image: post.image_url, // Map to frontend expected prop
                type: post.type,
                likes: post.likes_count || 0,
                comments: post.comments_count || 0,
                time: post.created_at, // Frontend will format this
                isLiked: likedPostIds.has(post.id),
                author: {
                    name: author.name,
                    role: author.role,
                    avatar: author.avatar
                }
            };
        });

        res.json({
            success: true,
            data: {
                posts: enrichedPosts,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};

/**
 * Create a new post
 */
const createPost = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content, type = 'official', imageUrl } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Insert Post
        const { data: post, error } = await supabaseAdmin
            .from('community_posts')
            .insert({
                user_id: userId,
                content,
                type,
                image_url: imageUrl
            })
            .select() // Select created row
            .single();

        if (error) throw error;

        // Fetch Author Details for response
        const authors = await fetchAuthors([userId]);
        const author = authors[userId] || { name: 'You', role: 'Member', avatar: null };

        const enrichedPost = {
            id: post.id,
            content: post.content,
            image: post.image_url,
            type: post.type,
            likes: 0,
            comments: 0,
            time: post.created_at,
            isLiked: false,
            author: {
                name: author.name,
                role: author.role,
                avatar: author.avatar
            }
        };

        res.status(201).json({
            success: true,
            data: enrichedPost
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
};

/**
 * Toggle Like
 */
const toggleLike = async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;

        // Check if already liked
        const { data: existingLike } = await supabaseAdmin
            .from('community_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        let isLiked = false;

        if (existingLike) {
            // Unlike
            await supabaseAdmin
                .from('community_likes')
                .delete()
                .eq('id', existingLike.id);

            isLiked = false;
        } else {
            // Like
            await supabaseAdmin
                .from('community_likes')
                .insert({ post_id: postId, user_id: userId });

            isLiked = true;
        }

        // Recalculate Count (Safe way)
        const { count } = await supabaseAdmin
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        // Update Post Count
        await supabaseAdmin
            .from('community_posts')
            .update({ likes_count: count })
            .eq('id', postId);

        res.json({ success: true, liked: isLiked, likesCount: count });

    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
};


module.exports = {
    getPosts,
    createPost,
    toggleLike
};
