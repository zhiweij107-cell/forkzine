/**
 * Database migration script for Supabase
 * Run this via Supabase SQL Editor or use `npm run db:migrate`
 *
 * This file outputs the SQL that should be run in your Supabase project.
 */

const MIGRATION_SQL = `
-- ================================================
-- Forkzine Database Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== PROFILES ==========
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  title TEXT DEFAULT '内容创作者',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ========== TOPICS ==========
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '自由话题',
  creator_id UUID REFERENCES profiles(id),
  interview_count INT DEFAULT 0,
  trending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics are viewable by everyone"
  ON topics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create topics"
  ON topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ========== INTERVIEWS ==========
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES profiles(id),
  topic_id UUID REFERENCES topics(id),
  topic_title TEXT,
  title TEXT,
  subtitle TEXT,
  summary TEXT,
  template_style TEXT DEFAULT 'deep',
  cover_gradient TEXT DEFAULT 'from-navy via-navy-light to-purple-900',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published')),
  read_count INT DEFAULT 0,
  branch_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published interviews are viewable by everyone"
  ON interviews FOR SELECT USING (status = 'published' OR creator_id = auth.uid());
CREATE POLICY "Users can create interviews"
  ON interviews FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own interviews"
  ON interviews FOR UPDATE USING (auth.uid() = creator_id);

-- ========== SECTIONS ==========
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  key_quote TEXT,
  image_prompt TEXT,
  image_url TEXT,
  image_task_id TEXT,
  branch_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sections follow interview visibility"
  ON sections FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = sections.interview_id
      AND (interviews.status = 'published' OR interviews.creator_id = auth.uid())
    )
  );
CREATE POLICY "Interview creators can manage sections"
  ON sections FOR ALL USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = sections.interview_id
      AND interviews.creator_id = auth.uid()
    )
  );

-- ========== MESSAGES (chat history) ==========
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message creators can view their messages"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = messages.interview_id
      AND interviews.creator_id = auth.uid()
    )
  );

-- ========== BRANCHES ==========
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  branch_type TEXT NOT NULL CHECK (branch_type IN ('refute', 'supplement', 'extend', 'example')),
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branches are viewable by everyone"
  ON branches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create branches"
  ON branches FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- ========== BRANCH LIKES ==========
CREATE TABLE IF NOT EXISTS branch_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, user_id)
);

ALTER TABLE branch_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes"
  ON branch_likes FOR ALL USING (auth.uid() = user_id);

-- ========== FUNCTIONS ==========

-- Increment read count
CREATE OR REPLACE FUNCTION increment_read_count(interview_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE interviews SET read_count = read_count + 1
  WHERE id = interview_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment branch count
CREATE OR REPLACE FUNCTION increment_branch_count(section_id_input UUID)
RETURNS void AS $$
DECLARE
  v_interview_id UUID;
BEGIN
  -- Increment on section
  UPDATE sections SET branch_count = branch_count + 1
  WHERE id = section_id_input
  RETURNING interview_id INTO v_interview_id;

  -- Increment on interview
  UPDATE interviews SET branch_count = branch_count + 1
  WHERE id = v_interview_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle branch like
CREATE OR REPLACE FUNCTION toggle_branch_like(branch_id_input UUID, user_id_input UUID)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM branch_likes
    WHERE branch_id = branch_id_input AND user_id = user_id_input
  ) THEN
    DELETE FROM branch_likes
    WHERE branch_id = branch_id_input AND user_id = user_id_input;

    UPDATE branches SET likes = likes - 1
    WHERE id = branch_id_input;
  ELSE
    INSERT INTO branch_likes (branch_id, user_id)
    VALUES (branch_id_input, user_id_input);

    UPDATE branches SET likes = likes + 1
    WHERE id = branch_id_input;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_creator ON interviews(creator_id);
CREATE INDEX IF NOT EXISTS idx_interviews_topic ON interviews(topic_id);
CREATE INDEX IF NOT EXISTS idx_sections_interview ON sections(interview_id);
CREATE INDEX IF NOT EXISTS idx_branches_section ON branches(section_id);
CREATE INDEX IF NOT EXISTS idx_messages_interview ON messages(interview_id);
CREATE INDEX IF NOT EXISTS idx_topics_trending ON topics(trending) WHERE trending = true;
`

console.log('=== Forkzine Database Migration SQL ===')
console.log('Copy and run this SQL in your Supabase SQL Editor:')
console.log('Dashboard > SQL Editor > New Query')
console.log('=========================================\n')
console.log(MIGRATION_SQL)
