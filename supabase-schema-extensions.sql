-- ამ SQL სკრიპტი შეიცავს ახალ ცხრილებს და ფუნქციებს გაუმჯობესებული Task Manager-ისთვის
-- გაუშვით ეს Supabase Dashboard-ში SQL Editor-ში

-- 1. სამუშაო სესიების ცხრილი (ეკრანის გაზიარება, წყვილური პროგრამირება)
CREATE TABLE IF NOT EXISTS work_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('screen_share', 'pair_programming', 'code_review')),
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    host_name TEXT NOT NULL,
    participants UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    metadata JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. დროის აღრიცხვის ცხრილი
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL DEFAULT 0, -- წამებში
    description TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    is_running BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. მიღწევების ცხრილი
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 1,
    unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_type)
);

-- 4. სისტემის ჯანმრთელობის მეტრიკების ცხრილი
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT,
    status TEXT DEFAULT 'good' CHECK (status IN ('good', 'warning', 'critical')),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- 5. მომხმარებლების ონლაინ სტატუსის ცხრილი
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    current_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    metadata JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. გუნდის ეფექტურობის მეტრიკების ცხრილი
CREATE TABLE IF NOT EXISTS team_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    tasks_completed INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    time_logged INTEGER DEFAULT 0, -- წამებში
    productivity_score NUMERIC DEFAULT 0,
    efficiency_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id, date)
);

-- 7. გენერალური კონფიგურაციის ცხრილი
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) ბეჭდვები
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;  
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS პოლისები

-- სამუშაო სესიები - ყველას ნახვა შეუძლია, მხოლოდ host-მა შეცვლა
CREATE POLICY "Anyone can view work sessions" ON work_sessions
    FOR SELECT USING (true);

CREATE POLICY "Host can manage work sessions" ON work_sessions
    FOR ALL USING (auth.uid() = host_id);

-- დროის ჩანაწერები - მხოლოდ საკუთარი ნახვა/შეცვლა
CREATE POLICY "Users can manage own time entries" ON time_entries
    FOR ALL USING (auth.uid() = user_id);

-- მიღწევები - მხოლოდ საკუთარი ნახვა
CREATE POLICY "Users can view own achievements" ON achievements
    FOR SELECT USING (auth.uid() = user_id);

-- სისტემის მეტრიკები - ყველას ნახვა, ადმინებს შეცვლა
CREATE POLICY "Anyone can view system metrics" ON system_metrics
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage system metrics" ON system_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- მომხმარებლების presence - ყველას ნახვა, საკუთარი შეცვლა
CREATE POLICY "Anyone can view user presence" ON user_presence
    FOR SELECT USING (true);

CREATE POLICY "Users can update own presence" ON user_presence
    FOR ALL USING (auth.uid() = user_id);

-- გუნდის ეფექტურობა - ყველას ნახვა საკუთარი და ადმინებს ყველას
CREATE POLICY "Users can view own performance" ON team_performance
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert performance data" ON team_performance
    FOR INSERT WITH CHECK (true);

-- აპლიკაციის პარამეტრები - ყველას ნახვა, ადმინებს შეცვლა
CREATE POLICY "Anyone can view app settings" ON app_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage app settings" ON app_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- ფუნქციები

-- 1. მომხმარებლის productivity score-ის გამოთვლა
CREATE OR REPLACE FUNCTION calculate_user_productivity_score(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS NUMERIC AS $$
DECLARE
    score NUMERIC DEFAULT 0;
    total_tasks INTEGER;
    completed_tasks INTEGER;
    completion_rate NUMERIC;
    time_efficiency NUMERIC;
BEGIN
    -- დასრულებული tasks ბოლო N დღეში
    SELECT COUNT(*) INTO completed_tasks
    FROM tasks 
    WHERE assignee_id = user_uuid 
    AND status = 'done'
    AND updated_at >= NOW() - INTERVAL '1 day' * days_back;
    
    -- ყველა task ბოლო N დღეში
    SELECT COUNT(*) INTO total_tasks
    FROM tasks 
    WHERE assignee_id = user_uuid 
    AND created_at >= NOW() - INTERVAL '1 day' * days_back;
    
    -- completion rate (0-100)
    IF total_tasks > 0 THEN
        completion_rate := (completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100;
    ELSE
        completion_rate := 0;
    END IF;
    
    -- დროის ეფექტურობა (სიმულაცია)
    time_efficiency := LEAST(100, 50 + RANDOM() * 50);
    
    -- საბოლოო ქულა
    score := (completion_rate * 0.7) + (time_efficiency * 0.3);
    
    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. გუნდის ეფექტურობის განახლება
CREATE OR REPLACE FUNCTION update_team_performance_daily()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    performance_score NUMERIC;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT user_id FROM profiles WHERE role = 'user'
    LOOP
        -- ყოველდღიური productivity score-ის გამოთვლა
        performance_score := calculate_user_productivity_score(user_record.user_id, 1);
        
        -- performance ცხრილში ჩასმა ან განახლება
        INSERT INTO team_performance (user_id, date, productivity_score)
        VALUES (user_record.user_id, CURRENT_DATE, performance_score)
        ON CONFLICT (user_id, project_id, date) 
        DO UPDATE SET 
            productivity_score = EXCLUDED.productivity_score,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. მიღწევების შემოწმება და განახლება
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(user_uuid UUID)
RETURNS void AS $$
DECLARE
    user_stats RECORD;
BEGIN
    -- მომხმარებლის სტატისტიკის მოძიება
    SELECT 
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
        COUNT(*) as total_tasks
    INTO user_stats
    FROM tasks 
    WHERE assignee_id = user_uuid;
    
    -- "პირველი ნაბიჯი" მიღწევა
    INSERT INTO achievements (user_id, achievement_type, title, description, icon, progress, max_progress, unlocked)
    VALUES (user_uuid, 'first_task', 'პირველი ნაბიჯი', 'პირველი Task-ის დასრულება', '🎯', 
            LEAST(user_stats.completed_tasks, 1), 1, user_stats.completed_tasks >= 1)
    ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
        progress = LEAST(user_stats.completed_tasks, 1),
        unlocked = user_stats.completed_tasks >= 1,
        unlocked_at = CASE WHEN user_stats.completed_tasks >= 1 AND NOT achievements.unlocked THEN NOW() ELSE achievements.unlocked_at END;
    
    -- "მშრომელი" მიღწევა
    INSERT INTO achievements (user_id, achievement_type, title, description, icon, progress, max_progress, unlocked)
    VALUES (user_uuid, 'worker', 'მშრომელი', '10 Task-ის დასრულება', '⚡', 
            LEAST(user_stats.completed_tasks, 10), 10, user_stats.completed_tasks >= 10)
    ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
        progress = LEAST(user_stats.completed_tasks, 10),
        unlocked = user_stats.completed_tasks >= 10,
        unlocked_at = CASE WHEN user_stats.completed_tasks >= 10 AND NOT achievements.unlocked THEN NOW() ELSE achievements.unlocked_at END;
    
    -- "ექსპერტი" მიღწევა
    INSERT INTO achievements (user_id, achievement_type, title, description, icon, progress, max_progress, unlocked)
    VALUES (user_uuid, 'expert', 'ექსპერტი', '50 Task-ის დასრულება', '🏆', 
            LEAST(user_stats.completed_tasks, 50), 50, user_stats.completed_tasks >= 50)
    ON CONFLICT (user_id, achievement_type) 
    DO UPDATE SET 
        progress = LEAST(user_stats.completed_tasks, 50),
        unlocked = user_stats.completed_tasks >= 50,
        unlocked_at = CASE WHEN user_stats.completed_tasks >= 50 AND NOT achievements.unlocked THEN NOW() ELSE achievements.unlocked_at END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ტრიგერი - მიღწევების ავტომატური შემოწმება task-ის განახლებისას
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
        PERFORM check_and_unlock_achievements(NEW.assignee_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ტრიგერის შექმნა
DROP TRIGGER IF EXISTS check_achievements_on_task_completion ON tasks;
CREATE TRIGGER check_achievements_on_task_completion
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_achievements();

-- 5. სისტემის მეტრიკების განახლება
CREATE OR REPLACE FUNCTION update_system_metrics()
RETURNS void AS $$
BEGIN
    -- მომხმარებლების რაოდენობა
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit, status)
    SELECT 'total_users', COUNT(*), 'users', 'good'
    FROM profiles
    ON CONFLICT (metric_name) DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        recorded_at = NOW();
    
    -- აქტიური პროექტები
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit, status)
    SELECT 'active_projects', COUNT(*), 'projects', 'good'
    FROM projects WHERE status = 'active'
    ON CONFLICT (metric_name) DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        recorded_at = NOW();
    
    -- გადავადებული tasks
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit, status)
    SELECT 'overdue_tasks', COUNT(*), 'tasks', 
           CASE 
               WHEN COUNT(*) > 50 THEN 'critical'
               WHEN COUNT(*) > 20 THEN 'warning'
               ELSE 'good'
           END
    FROM tasks 
    WHERE due_date < NOW() AND status != 'done'
    ON CONFLICT (metric_name) DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        status = EXCLUDED.status,
        recorded_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- საწყისი მონაცემები
INSERT INTO app_settings (key, value, description) VALUES
('app_name', '"Task Manager Pro"', 'Application name'),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('notification_retention_days', '30', 'Days to keep notifications'),
('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)')
ON CONFLICT (key) DO NOTHING;

-- ინდექსები წარმადობისთვის
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements (user_id, unlocked);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics (metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_performance_user_date ON team_performance (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence (status, last_seen DESC);

-- ინიციალიზაცია მეტრიკების
SELECT update_system_metrics();

-- კომენტარი
COMMENT ON TABLE work_sessions IS 'Team work sessions (screen sharing, pair programming, code review)';
COMMENT ON TABLE time_entries IS 'Time tracking entries for tasks';
COMMENT ON TABLE achievements IS 'User achievements and gamification';
COMMENT ON TABLE system_metrics IS 'System health and performance metrics';
COMMENT ON TABLE user_presence IS 'Real-time user presence and status';
COMMENT ON TABLE team_performance IS 'Daily team performance analytics';
COMMENT ON TABLE app_settings IS 'Application configuration settings';