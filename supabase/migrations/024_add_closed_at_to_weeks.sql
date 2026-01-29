-- Track when transfer window was closed (to distinguish "completed" from "ready")
-- A window that was opened and then closed (either manually or by cron)
-- is considered "completed", while one that was never opened is "ready".

ALTER TABLE weeks
  ADD COLUMN IF NOT EXISTS transfer_window_closed_at TIMESTAMPTZ;

COMMENT ON COLUMN weeks.transfer_window_closed_at IS
  'Timestamp when transfer window was closed. NULL if never opened or still open.';
