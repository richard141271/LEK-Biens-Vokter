
-- Migration to add is_resolved to warroom_posts
ALTER TABLE warroom_posts 
ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE;

-- Update existing records
UPDATE warroom_posts SET is_resolved = FALSE WHERE is_resolved IS NULL;
