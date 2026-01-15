-- Community Posts Table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  type VARCHAR(50) DEFAULT 'official' CHECK (type IN ('official', 'casual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0
);

-- Community Likes Table
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Community Comments Table
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies (Simplified for now - can be refined)
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read posts
CREATE POLICY "Public posts are viewable by everyone" ON community_posts FOR SELECT USING (true);
-- Allow authenticated users to insert posts
CREATE POLICY "Users can insert their own posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "Likes viewable by everyone" ON community_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert likes" ON community_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete likes" ON community_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments viewable by everyone" ON community_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

