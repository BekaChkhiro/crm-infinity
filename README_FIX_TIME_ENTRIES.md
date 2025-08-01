# Fix for time_entries Table Error

The 404 error for the `time_entries` table occurs because the table exists in the schema extensions file but hasn't been applied to your Supabase database yet.

## Solution

1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and run the entire contents of `supabase-schema-extensions.sql`

This will create the missing tables including:
- `time_entries` - For time tracking functionality
- `work_sessions` - For screen sharing and pair programming
- `achievements` - For user achievements
- `system_metrics` - For system health monitoring
- `user_presence` - For online status tracking
- `team_performance` - For team analytics
- `app_settings` - For application configuration

After running the SQL script, the time tracking features in the dashboard will work correctly.