-- 20261113_initial_schema.sql
-- Kiến Trúc Dữ Liệu PostgreSQL & Supabase Row-Level Security (RLS) Cho BookMind AI
-- Tuân thủ chặt chẽ nguyên tắc bảo vệ quyền riêng tư và phân quyền RBAC (Role-Based Access Control)

-- 1. Bảng hồ sơ người dùng (User Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'catalog_editor', 'analyst', 'admin')),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_id TEXT DEFAULT 'avatar-1',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kích hoạt RLS cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Chính sách RLS cho profiles:
-- Người dùng xem được hồ sơ của chính mình
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- Người dùng cập nhật được hồ sơ của chính mình (ngoại trừ cột role)
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Admin xem và quản lý được tất cả hồ sơ
CREATE POLICY "Admins have full access to profiles" 
  ON public.profiles FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Bảng sự kiện hành vi độc giả (User Behavioral Events)
CREATE TABLE IF NOT EXISTS public.reading_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  book_id TEXT,
  book_title TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kích hoạt RLS cho bảng reading_events
ALTER TABLE public.reading_events ENABLE ROW LEVEL SECURITY;

-- Chính sách: Người dùng chỉ được ghi nhận và đọc sự kiện của chính mình
CREATE POLICY "Users can insert own events" 
  ON public.reading_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own events" 
  ON public.reading_events FOR SELECT 
  USING (auth.uid() = user_id);

-- Admin và Analyst xem được thống kê tổng hợp (hoặc toàn bộ sự kiện cho phân tích)
CREATE POLICY "Admins and Analysts can view all events" 
  ON public.reading_events FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'analyst')
    )
  );

-- 3. Bảng hồ sơ sở thích học máy (Dynamic User Preferences)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_affinity JSONB DEFAULT '{}'::jsonb,
  author_affinity JSONB DEFAULT '{}'::jsonb,
  keyword_weights JSONB DEFAULT '{}'::jsonb,
  recently_viewed_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  recently_dismissed_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  metrics JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" 
  ON public.user_preferences FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all preferences" 
  ON public.user_preferences FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Bảng nhật ký kiểm toán quản trị (Admin Audit Logs)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only Admins can insert audit logs" 
  ON public.admin_audit_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only Admins can view audit logs" 
  ON public.admin_audit_logs FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
