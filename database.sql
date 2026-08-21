-- ============================================================
-- GearStore – Supabase Database Schema + Demo Data
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

-- ─── Profiles (liên kết với Supabase Auth) ───────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  email text NOT NULL,
  balance integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Migration nếu bảng đã tồn tại
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Trigger: tự động tạo profile khi user đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _username text;
BEGIN
  _username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

  -- Tránh trùng lặp username
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = _username AND id <> new.id) THEN
    _username := _username || '_' || substr(new.id::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (id, email, username, balance)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    _username,
    0
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      username = EXCLUDED.username;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Không làm gián đoạn việc đăng ký của Supabase Auth
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security cho profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép xem profile của mình" ON public.profiles;
CREATE POLICY "Cho phép xem profile của mình"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Cho phép tạo profile của mình" ON public.profiles;
CREATE POLICY "Cho phép tạo profile của mình"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Cho phép cập nhật profile của mình" ON public.profiles;
CREATE POLICY "Cho phép cập nhật profile của mình"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  key text UNIQUE NOT NULL,
  label text NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category_key text REFERENCES categories(key),
  category_label text NOT NULL,
  description text,
  features text[],
  image_url text,
  packages jsonb,
  product_type text DEFAULT 'key', -- 'key' hoặc 'token'
  stock integer DEFAULT 0,
  pack integer DEFAULT 1,
  sold integer DEFAULT 0,
  price text NOT NULL,
  status text NOT NULL
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packages jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'key';

-- Orders (gắn liền với user_id của từng tài khoản)
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  package_name text,
  product_type text DEFAULT 'key',
  status text NOT NULL,
  amount integer NOT NULL,
  purchased_at text,
  completed_at text,
  admin_note text,
  product_key text,
  expires_in_seconds integer,
  supports_hwid_reset boolean DEFAULT false,
  last_hwid_reset_at timestamp with time zone
);

-- Nếu bảng orders đã tồn tại, đảm bảo có cột user_id, product_type và last_hwid_reset_at
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'key';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_hwid_reset_at timestamp with time zone;

-- Transactions (gắn liền với user_id của từng tài khoản)
CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  subtitle text,
  time text,
  amount integer NOT NULL,
  balance_after integer NOT NULL
);

-- Nếu bảng transactions đã tồn tại, đảm bảo có cột user_id
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── Bảng yêu cầu nạp tiền SePay ────────────────────────────────────────────
-- Mỗi row = 1 lần user bấm "Nạp tiền", chứa mã nội dung chuyển khoản duy nhất.
-- Webhook SePay sẽ tra bảng này để xác định user và số tiền cần cộng.
CREATE TABLE IF NOT EXISTS topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,                         -- Số tiền yêu cầu (VNĐ)
  transfer_content text UNIQUE NOT NULL,           -- Nội dung CK duy nhất (vd: "GS A1B2C3D4")
  status text DEFAULT 'pending',                   -- 'pending' | 'success' | 'expired'
  paid_amount integer,                             -- Số tiền SePay thực nhận
  sepay_ref text,                                  -- Mã tham chiếu từ SePay
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_topup_content ON topup_requests (transfer_content, status);
CREATE INDEX IF NOT EXISTS idx_topup_user   ON topup_requests (user_id, created_at DESC);

-- RLS cho topup_requests
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Xem yêu cầu nạp của mình" ON topup_requests;
CREATE POLICY "Xem yêu cầu nạp của mình"
  ON topup_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tạo yêu cầu nạp của mình" ON topup_requests;
CREATE POLICY "Tạo yêu cầu nạp của mình"
  ON topup_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Function) được cập nhật status
DROP POLICY IF EXISTS "Service cập nhật topup_request" ON topup_requests;
CREATE POLICY "Service cập nhật topup_request"
  ON topup_requests FOR UPDATE USING (true) WITH CHECK (true);

-- ─── SQL Function: Xử lý SePay webhook (gọi từ Edge Function bằng service_role) ─
-- Cộng tiền và đánh dấu request thành công trong 1 transaction
CREATE OR REPLACE FUNCTION process_topup(
  p_transfer_content text,
  p_paid_amount      integer,
  p_sepay_ref        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request      topup_requests%ROWTYPE;
  v_profile      profiles%ROWTYPE;
  v_new_bal      integer;
  v_tx_id        text;
  v_clean_input  text;
BEGIN
  -- Chuẩn hoá chuỗi nội dung từ ngân hàng (xoá khoảng trắng, chuyển chữ hoa)
  v_clean_input := upper(replace(COALESCE(p_transfer_content, ''), ' ', ''));

  -- 1. Tìm yêu cầu nạp pending khớp nội dung (khớp chính xác hoặc ngân hàng gửi kèm tiền tố/hậu tố)
  SELECT * INTO v_request
  FROM topup_requests
  WHERE status = 'pending'
    AND (
      -- Khớp chính xác
      upper(transfer_content) = upper(p_transfer_content)
      -- Hoặc input ngân hàng chứa mã nạp (vd: 'MBVCB.123.GS12345.CT' chứa 'GS12345')
      OR upper(p_transfer_content) LIKE '%' || upper(transfer_content) || '%'
      -- Hoặc so khớp khi đã xóa toàn bộ khoảng trắng
      OR v_clean_input LIKE '%' || upper(replace(transfer_content, ' ', '')) || '%'
    )
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'Không tìm thấy yêu cầu nạp tiền pending khớp với nội dung chuyển khoản: ' || COALESCE(p_transfer_content, ''));
  END IF;

  -- 2. Lấy số dư hiện tại của user
  SELECT * INTO v_profile FROM profiles WHERE id = v_request.user_id;
  v_new_bal := COALESCE(v_profile.balance, 0) + p_paid_amount;

  -- 3. Cộng tiền vào profiles
  UPDATE profiles SET balance = v_new_bal WHERE id = v_request.user_id;

  -- 4. Cập nhật trạng thái request
  UPDATE topup_requests
  SET status       = 'success',
      paid_amount  = p_paid_amount,
      sepay_ref    = p_sepay_ref,
      completed_at = now()
  WHERE id = v_request.id;

  -- 5. Ghi lịch sử giao dịch
  v_tx_id := 'NAP-' || substr(COALESCE(p_sepay_ref, 'TX'), 1, 8) || '-' || to_char(now(), 'HH24MI');
  INSERT INTO transactions (id, user_id, type, title, subtitle, time, amount, balance_after)
  VALUES (
    v_tx_id,
    v_request.user_id,
    'topup',
    'Nạp tiền thành công',
    'SePay · ' || v_request.transfer_content,
    to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY'),
    p_paid_amount,
    v_new_bal
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN json_build_object(
    'ok',          true,
    'user_id',     v_request.user_id,
    'paid_amount', p_paid_amount,
    'new_balance', v_new_bal
  );
END;
$$;

-- Bật Realtime cho bảng topup_requests và profiles để client nhận sự kiện tức thì
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE topup_requests;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
  END;
END $$;


-- Downloads
CREATE TABLE IF NOT EXISTS downloads (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text,
  category_label text,
  description text,
  downloads text,
  size text,
  has_video boolean DEFAULT false,
  has_guide boolean DEFAULT false,
  image_url text,
  download_url text
);

ALTER TABLE downloads ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS download_url text;

-- Product Keys (Bảng chứa kho key bản quyền theo từng sản phẩm & từng gói)
CREATE TABLE IF NOT EXISTS product_keys (
  id serial PRIMARY KEY,
  product_id integer REFERENCES products(id) ON DELETE CASCADE,
  product_name text,
  package_id text,
  package_name text,
  license_key text NOT NULL,
  status text DEFAULT 'available', -- 'available' (chưa bán), 'sold' (đã bán)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id text,
  created_at timestamp with time zone DEFAULT now(),
  sold_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_product_keys_search ON product_keys (product_id, package_id, status);
CREATE INDEX IF NOT EXISTS idx_product_keys_user ON product_keys (user_id);

-- Hàm SQL tự động lấy và gán key cho đơn hàng
CREATE OR REPLACE FUNCTION claim_product_keys(
  p_product_id integer,
  p_package_id text,
  p_package_name text,
  p_user_id uuid,
  p_order_id text,
  p_quantity integer DEFAULT 1
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_keys text[];
  v_ids integer[];
BEGIN
  -- Tìm các key đang available theo product và package
  SELECT array_agg(id), array_agg(license_key)
  INTO v_ids, v_keys
  FROM (
    SELECT id, license_key
    FROM product_keys
    WHERE status = 'available'
      AND (product_id = p_product_id OR p_product_id IS NULL)
      AND (
        package_id = p_package_id 
        OR package_name ILIKE '%' || p_package_name || '%'
        OR p_package_id IS NULL
        OR p_package_name IS NULL
      )
    ORDER BY id ASC
    LIMIT p_quantity
    FOR UPDATE SKIP LOCKED
  ) sub;

  -- Nếu tìm thấy key trong kho thì cập nhật trạng thái đã bán
  IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
    UPDATE product_keys
    SET status = 'sold',
        user_id = p_user_id,
        order_id = p_order_id,
        sold_at = now()
    WHERE id = ANY(v_ids);
    
    RETURN v_keys;
  END IF;

  RETURN ARRAY[]::text[];
END;
$$;

-- Hàm SQL import nhanh danh sách nhiều key dạng text list (mỗi dòng 1 key)
CREATE OR REPLACE FUNCTION import_product_keys(
  p_product_id integer,
  p_package_id text,
  p_package_name text,
  p_keys_text text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key text;
  v_count integer := 0;
  v_lines text[];
BEGIN
  -- Tách chuỗi theo dòng mới hoặc dấu phẩy
  v_lines := regexp_split_to_array(p_keys_text, '[\r\n,]+');
  
  FOREACH v_key IN ARRAY v_lines LOOP
    v_key := trim(v_key);
    IF v_key <> '' THEN
      INSERT INTO product_keys (product_id, package_id, package_name, license_key, status)
      VALUES (p_product_id, p_package_id, p_package_name, v_key, 'available');
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  title text NOT NULL,
  detail text,
  time text,
  tone text
);

-- Feedbacks
CREATE TABLE IF NOT EXISTS feedbacks (
  id serial PRIMARY KEY,
  name text NOT NULL,
  text text,
  stars integer
);

-- Contact Channels
CREATE TABLE IF NOT EXISTS contact_channels (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  badges text[],
  icon_key text,
  url text
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Bảng công khai (ai cũng có thể xem)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem categories" ON categories;
CREATE POLICY "Cho phép xem categories" ON categories FOR SELECT USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem products" ON products;
CREATE POLICY "Cho phép xem products" ON products FOR SELECT USING (true);

ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem downloads" ON downloads;
CREATE POLICY "Cho phép xem downloads" ON downloads FOR SELECT USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem notifications" ON notifications;
CREATE POLICY "Cho phép xem notifications" ON notifications FOR SELECT USING (true);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem feedbacks" ON feedbacks;
CREATE POLICY "Cho phép xem feedbacks" ON feedbacks FOR SELECT USING (true);

ALTER TABLE contact_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem contact_channels" ON contact_channels;
CREATE POLICY "Cho phép xem contact_channels" ON contact_channels FOR SELECT USING (true);

-- Bảng cá nhân (người dùng CHỈ XEM VÀ TẠO ĐƠN HÀNG/GIAO DỊCH CỦA CHÍNH MÌNH)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem orders" ON orders;
DROP POLICY IF EXISTS "Chỉ xem đơn hàng của mình" ON orders;
CREATE POLICY "Chỉ xem đơn hàng của mình" ON orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cho phép tạo đơn hàng của mình" ON orders;
CREATE POLICY "Cho phép tạo đơn hàng của mình" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cho phép cập nhật đơn hàng của mình" ON orders;
CREATE POLICY "Cho phép cập nhật đơn hàng của mình" ON orders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem transactions" ON transactions;
DROP POLICY IF EXISTS "Chỉ xem giao dịch của mình" ON transactions;
CREATE POLICY "Chỉ xem giao dịch của mình" ON transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cho phép tạo giao dịch của mình" ON transactions;
CREATE POLICY "Cho phép tạo giao dịch của mình" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bảng kho key
ALTER TABLE product_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chỉ xem key của chính mình hoặc key khả dụng" ON product_keys;
CREATE POLICY "Chỉ xem key của chính mình hoặc key khả dụng" ON product_keys FOR SELECT USING (auth.uid() = user_id OR status = 'available');

DROP POLICY IF EXISTS "Cho phép cập nhật key khi mua" ON product_keys;
CREATE POLICY "Cho phép cập nhật key khi mua" ON product_keys FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép thêm key" ON product_keys;
CREATE POLICY "Cho phép thêm key" ON product_keys FOR INSERT WITH CHECK (true);

ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem downloads" ON downloads;
CREATE POLICY "Cho phép xem downloads" ON downloads FOR SELECT USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem notifications" ON notifications;
CREATE POLICY "Cho phép xem notifications" ON notifications FOR SELECT USING (true);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem feedbacks" ON feedbacks;
CREATE POLICY "Cho phép xem feedbacks" ON feedbacks FOR SELECT USING (true);

ALTER TABLE contact_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép xem contact_channels" ON contact_channels;
CREATE POLICY "Cho phép xem contact_channels" ON contact_channels FOR SELECT USING (true);


-- ============================================================
-- Demo Data
-- ============================================================

INSERT INTO categories (key, label) VALUES
  ('all', 'Tất cả'),
  ('perf', 'TỐI ƯU HIỆU NĂNG'),
  ('config', 'CẤU HÌNH GAME'),
  ('license', 'BẢN QUYỀN PHẦN MỀM'),
  ('service', 'GÓI DỊCH VỤ')
ON CONFLICT (key) DO NOTHING;

INSERT INTO products (name, category_key, category_label, description, features, stock, pack, sold, price, status) VALUES
  ('Performance Booster Pro', 'perf', 'Tối ưu hiệu năng', 'Tối ưu tài nguyên hệ thống, tăng FPS ổn định cho máy cấu hình thấp.', ARRAY['Giảm độ trễ hệ thống', 'Tối ưu RAM & CPU', 'Tương thích đa nền tảng'], 81, 1, 281, '350.000đ', 'in'),
  ('Game Config Optimizer', 'config', 'Cấu hình game', 'Bộ cấu hình sẵn giúp game khởi động nhanh và mượt hơn.', ARRAY['Cấu hình đồ họa tối ưu', 'Tự động backup setting', 'Hỗ trợ nhiều tựa game'], 46, 1, 194, '220.000đ', 'in'),
  ('Software License Key', 'license', 'Bản quyền phần mềm', 'Key bản quyền chính hãng, kích hoạt trọn đời cho thiết bị.', ARRAY['Bản quyền chính hãng', 'Kích hoạt trọn đời', 'Hỗ trợ cập nhật miễn phí'], 0, 1, 512, '450.000đ', 'out'),
  ('Cloud Backup Plan', 'service', 'Gói dịch vụ', 'Dịch vụ sao lưu đám mây bảo mật cho dữ liệu cá nhân.', ARRAY['Dung lượng 100GB', 'Mã hoá đầu cuối', 'Đồng bộ đa thiết bị'], 120, 3, 98, '150.000đ', 'in'),
  ('System Optimizer Suite', 'perf', 'Tối ưu hiệu năng', 'Bộ công cụ dọn dẹp và tăng tốc hệ thống toàn diện.', ARRAY['Dọn rác hệ thống', 'Tăng tốc khởi động', 'Giám sát hiệu năng realtime'], 63, 1, 176, '180.000đ', 'in'),
  ('Pro Config Bundle', 'config', 'Cấu hình game', 'Combo cấu hình chuyên sâu dành cho nhiều thể loại game.', ARRAY['10+ cấu hình dựng sẵn', 'Cập nhật định kỳ', 'Hướng dẫn chi tiết'], 27, 2, 87, '290.000đ', 'in'),
  ('Streaming Access Pass', 'service', 'Gói dịch vụ', 'Gói truy cập dịch vụ giải trí trực tuyến thời hạn 1 tháng.', ARRAY['Xem không giới hạn', 'Chất lượng Full HD', 'Dùng trên nhiều thiết bị'], 200, 1, 342, '99.000đ', 'in'),
  ('Creative Software License', 'license', 'Bản quyền phần mềm', 'Bản quyền phần mềm sáng tạo nội dung, sử dụng chính chủ.', ARRAY['Kích hoạt chính chủ', 'Không giới hạn thiết bị chính', 'Hỗ trợ kỹ thuật 24/7'], 15, 1, 63, '520.000đ', 'in'),
  ('Network Optimizer Key', 'perf', 'Tối ưu hiệu năng', 'Tối ưu đường truyền mạng, giảm ping khi chơi game online.', ARRAY['Giảm ping trung bình 20%', 'Ổn định kết nối', 'Cấu hình theo khu vực'], 54, 1, 231, '160.000đ', 'in');

INSERT INTO orders (id, product_name, package_name, status, amount, purchased_at, completed_at, admin_note, product_key, expires_in_seconds, supports_hwid_reset) VALUES
  ('ORD-MS05QHF21A', 'System Optimizer Suite', 'GÓI 7 NGÀY', 'success', 90000, '21:49:15 11/8/2026', '21:49:32 11/8/2026', 'Sau khi kích hoạt, khởi động lại ứng dụng để áp dụng cấu hình tối ưu. Liên hệ hỗ trợ nếu key báo lỗi.', 'SOS7day1rnLbcGg5Jk', 19774, true),
  ('ORD-7YQ2KX90PL', 'Performance Booster Pro', 'GÓI VĨNH VIỄN', 'success', 350000, '10:12:04 9/8/2026', '10:12:19 9/8/2026', 'Bản quyền vĩnh viễn, không cần gia hạn. Xem hướng dẫn kích hoạt trong mục Tải xuống.', 'PBP-LT-88213-QXHV', null, true),
  ('ORD-3F8DNC12ZT', 'Cloud Backup Plan', 'GÓI 30 NGÀY', 'processing', 150000, '08:41:50 12/8/2026', null, 'Đơn hàng đang được xử lý, key sẽ được gửi trong vòng vài phút.', null, null, false),
  ('ORD-9K1LWE44RS', 'Software License Key', 'GÓI 1 NĂM', 'expired', 450000, '02:15:00 20/7/2026', '02:15:40 20/7/2026', 'Key đã hết hạn sử dụng. Vui lòng mua gói mới để tiếp tục sử dụng dịch vụ.', 'SLK-EXP-10293-OLD', 0, false),
  ('ORD-5H2QVB77YM', 'Streaming Access Pass', 'GÓI 1 THÁNG', 'cancelled', 99000, '19:03:11 5/8/2026', null, 'Đơn hàng đã bị hủy do thanh toán không hợp lệ. Số dư đã được hoàn lại.', null, null, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (id, type, title, subtitle, time, amount, balance_after) VALUES
  ('TX-0091', 'purchase', 'System Optimizer Suite', 'GÓI 7 NGÀY', '21:49:15 11/8/2026', -90000, 0),
  ('TX-0090', 'topup', 'Nạp QR', 'Ngân hàng • Chuyển khoản', '21:48:23 11/8/2026', 90000, 90000),
  ('TX-0089', 'purchase', 'Cloud Backup Plan', 'GÓI 30 NGÀY', '08:41:50 12/8/2026', -150000, 200000),
  ('TX-0088', 'refund', 'Hoàn tiền — Streaming Access Pass', 'Đơn hàng bị hủy', '19:05:02 5/8/2026', 99000, 350000),
  ('TX-0087', 'topup', 'Nạp QR', 'Ngân hàng • Chuyển khoản', '09:20:11 5/8/2026', 200000, 251000),
  ('TX-0086', 'purchase', 'Performance Booster Pro', 'GÓI VĨNH VIỄN', '10:12:04 9/8/2026', -350000, 51000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO downloads (name, category, category_label, description, downloads, size, has_video, has_guide) VALUES
  ('GearStore_Launcher_v3.2.1.exe', 'launcher', 'Launcher & công cụ', 'Ứng dụng khởi chạy chính thức, tự động cập nhật và quản lý license.', '12.4k', '48 MB', true, true),
  ('Emulator_Pro_Setup_5.0.exe', 'emulator', 'Giả lập', 'Bộ giả lập hiệu năng cao, hỗ trợ đa nhân ảo và cấu hình tuỳ chỉnh.', '8.1k', '1.2 GB', true, true),
  ('GPU_Driver_Universal_552.44.exe', 'drivers', 'Drivers', 'Driver đồ họa tổng hợp, tương thích nhiều dòng card phổ biến.', '22.7k', '620 MB', false, true),
  ('Virtualization_Toggle_Tool.exe', 'virtualization', 'Ảo hóa hệ thống', 'Công cụ bật/tắt tính năng ảo hóa hệ thống phục vụ chạy giả lập.', '5.5k', '3 MB', false, true),
  ('Stream_Record_FixPack.zip', 'recording', 'Ghi hình & stream', 'Gói khắc phục lỗi ghi hình/stream phổ biến trên phần mềm capture.', '3.9k', '210 MB', true, false),
  ('Emulator_Lite_Setup_5.0.exe', 'emulator', 'Giả lập', 'Phiên bản nhẹ của bộ giả lập, tối ưu cho máy cấu hình thấp.', '6.6k', '780 MB', false, true),
  ('Network_Driver_Pack.exe', 'drivers', 'Drivers', 'Bộ driver mạng hỗ trợ ổn định kết nối cho nhiều dòng thiết bị.', '4.2k', '95 MB', false, false),
  ('GearStore_Launcher_Beta.exe', 'launcher', 'Launcher & công cụ', 'Bản beta của launcher, thử nghiệm tính năng mới trước khi phát hành chính thức.', '1.3k', '51 MB', false, true);

INSERT INTO notifications (title, detail, time, tone) VALUES
  ('Nạp tiền thành công', 'Số dư của bạn vừa được cộng thêm 200.000đ.', '2 phút trước', 'success'),
  ('Đơn hàng đã hoàn tất', 'Đơn #GS-10432 đã được giao thành công.', '1 giờ trước', 'success'),
  ('Sản phẩm mới được cập nhật', 'Gói "Performance Booster Pro" vừa ra bản v3.2.', 'Hôm qua', 'info');

INSERT INTO feedbacks (name, text, stars) VALUES
  ('Minh Khang', 'Giao dịch nhanh, hỗ trợ nhiệt tình, sẽ ủng hộ lâu dài.', 5),
  ('Thảo Uyên', 'Sản phẩm đúng như mô tả, kích hoạt trong vài phút.', 5),
  ('Quốc Bảo', 'Giá hợp lý, key hoạt động ổn định suốt thời gian dùng.', 4),
  ('Hải Đăng', 'Đội ngũ CSKH phản hồi cực nhanh, rất chuyên nghiệp.', 5);

INSERT INTO contact_channels (name, description, badges, icon_key, url) VALUES
  ('Zalo Cá Nhân', 'Nhắn tin trực tiếp để được hỗ trợ 1-1 nhanh nhất', ARRAY['Cá nhân', 'Phản hồi nhanh'], 'zalo', 'https://zalo.me/'),
  ('Zalo Nhóm Cộng Đồng 1', 'Tham gia nhóm để trao đổi, hỏi đáp cùng cộng đồng người dùng', ARRAY['Nhóm', 'Cộng đồng'], 'zalo', 'https://zalo.me/'),
  ('Zalo Nhóm Cộng Đồng 2', 'Nhóm dự phòng khi nhóm chính đã đầy thành viên', ARRAY['Nhóm', 'Cộng đồng'], 'zalo', 'https://zalo.me/'),
  ('Facebook Cá Nhân', 'Kết bạn và nhắn tin trực tiếp qua Messenger', ARRAY['Cá nhân', 'Phản hồi nhanh'], 'facebook', 'https://facebook.com/'),
  ('Facebook Group', 'Cộng đồng người dùng chia sẻ kinh nghiệm và cập nhật mới', ARRAY['Cộng đồng'], 'facebook', 'https://facebook.com/');
