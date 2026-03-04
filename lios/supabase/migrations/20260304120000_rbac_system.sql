-- ============================================================
-- LIOS RBAC System
-- Core tables for role-based access control
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS core_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS core_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS core_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module, action)
);

-- 4. Role-Permission junction
CREATE TABLE IF NOT EXISTS core_role_permissions (
  role_id UUID NOT NULL REFERENCES core_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES core_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 5. User-Role junction
CREATE TABLE IF NOT EXISTS core_user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES core_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- RLS: 3-layer pattern (ENABLE + FORCE + REVOKE anon)
-- ============================================================

-- core_profiles
ALTER TABLE core_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON core_profiles FROM anon;

CREATE POLICY "Users can view own profile"
  ON core_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON core_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON core_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_user_roles ur
      JOIN core_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- core_roles (read-only for authenticated, managed by admin)
ALTER TABLE core_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_roles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON core_roles FROM anon;

CREATE POLICY "Authenticated users can view roles"
  ON core_roles FOR SELECT
  TO authenticated
  USING (true);

-- core_permissions (read-only for authenticated)
ALTER TABLE core_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_permissions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON core_permissions FROM anon;

CREATE POLICY "Authenticated users can view permissions"
  ON core_permissions FOR SELECT
  TO authenticated
  USING (true);

-- core_role_permissions (read-only for authenticated)
ALTER TABLE core_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_role_permissions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON core_role_permissions FROM anon;

CREATE POLICY "Authenticated users can view role permissions"
  ON core_role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- core_user_roles
ALTER TABLE core_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_user_roles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON core_user_roles FROM anon;

CREATE POLICY "Users can view own roles"
  ON core_user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles"
  ON core_user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_user_roles ur
      JOIN core_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can manage user roles"
  ON core_user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_user_roles ur
      JOIN core_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================================
-- Seed data: roles and permissions
-- ============================================================

INSERT INTO core_roles (name, description) VALUES
  ('admin', 'Administrador do sistema — acesso total'),
  ('marketing', 'Equipe de marketing — acesso a módulos de marketing'),
  ('pedagogico', 'Equipe pedagógica — acesso a módulos pedagógicos')
ON CONFLICT (name) DO NOTHING;

INSERT INTO core_permissions (module, action, description) VALUES
  ('social-media', 'read', 'Visualizar carrosséis e templates'),
  ('social-media', 'write', 'Criar e editar carrosséis'),
  ('social-media', 'admin', 'Gerenciar templates e configurações do módulo')
ON CONFLICT (module, action) DO NOTHING;

-- Assign all social-media permissions to admin role
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
CROSS JOIN core_permissions p
WHERE r.name = 'admin'
  AND p.module = 'social-media'
ON CONFLICT DO NOTHING;

-- Assign social-media read+write to marketing role
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core_roles r
CROSS JOIN core_permissions p
WHERE r.name = 'marketing'
  AND p.module = 'social-media'
  AND p.action IN ('read', 'write')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Helper function: check user permission
-- ============================================================

CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_module TEXT,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core_user_roles ur
    JOIN core_role_permissions rp ON rp.role_id = ur.role_id
    JOIN core_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
      AND p.module = p_module
      AND p.action = p_action
  );
$$;

-- Helper: get user roles as array
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    array_agg(r.name),
    ARRAY[]::TEXT[]
  )
  FROM core_user_roles ur
  JOIN core_roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id;
$$;

-- Helper: get user permissions as array of 'module:action'
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT p.module || ':' || p.action),
    ARRAY[]::TEXT[]
  )
  FROM core_user_roles ur
  JOIN core_role_permissions rp ON rp.role_id = ur.role_id
  JOIN core_permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id;
$$;

-- ============================================================
-- Auto-create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO core_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END;
$$;

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER core_profiles_updated_at
  BEFORE UPDATE ON core_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
