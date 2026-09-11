-- Gán role mặc định "customer" vào app_metadata của mọi user mới (kể cả user
-- đăng ký qua Google OAuth). Role nằm trong app_metadata (chỉ service role
-- mới sửa được) nên không thể bị người dùng tự nâng quyền qua updateUser().
--
-- Nâng một tài khoản lên admin sau khi họ đã đăng ký, chạy thủ công:
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
--   WHERE email = 'admin@zenogym.com';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'role' IS NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"customer"}'::jsonb
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
