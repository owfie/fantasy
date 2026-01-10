-- Add RLS policies for player_availability to allow admins to insert/update
-- This allows the admin panel to manage player availability

-- Admins can insert player availability
CREATE POLICY "Admins can insert player availability" ON player_availability 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

-- Admins can update player availability
CREATE POLICY "Admins can update player availability" ON player_availability 
  FOR UPDATE USING (is_admin((select auth.uid())));

-- Admins can delete player availability
CREATE POLICY "Admins can delete player availability" ON player_availability 
  FOR DELETE USING (is_admin((select auth.uid())));

