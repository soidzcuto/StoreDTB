import { supabase } from './supabase';

// ─── Profile ──────────────────────────────────────────────────

export async function fetchProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('Lỗi fetchProfile:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Lỗi fetchProfile catch:', err);
    return null;
  }
}

export async function createProfileIfMissing(user, customUsername) {
  if (!user) return null;
  const username =
    customUsername ||
    user.user_metadata?.username ||
    user.email?.split('@')[0] ||
    `user_${user.id.slice(0, 6)}`;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email || '',
          username: username,
          balance: 0,
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Lỗi createProfileIfMissing:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Lỗi createProfileIfMissing catch:', err);
    return null;
  }
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Lỗi updateUserProfile:', error);
    throw error;
  }
  return data;
}

export async function updateBalance(userId, newBalance) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── SePay Topup Requests ─────────────────────────────────────────────────────

/**
 * Tạo một yêu cầu nạp tiền mới trong bảng topup_requests.
 * transferContent phải là chuỗi unique dùng làm nội dung chuyển khoản.
 */
export async function createTopupRequest({ userId, amount, transferContent }) {
  const { data, error } = await supabase
    .from('topup_requests')
    .insert({
      user_id: userId,
      amount,
      transfer_content: transferContent.toUpperCase(),
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Lắng nghe realtime thay đổi trạng thái của 1 topup request.
 * Trả về unsubscribe function.
 */
export function subscribeTopupRequest(requestId, onSuccess) {
  const channel = supabase
    .channel(`topup-${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'topup_requests',
        filter: `id=eq.${requestId}`,
      },
      (payload) => {
        if (payload.new?.status === 'success') {
          onSuccess(payload.new);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}


export async function updateUsername(userId, username) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error) {
    console.error('Lỗi khi tải products từ Supabase:', error);
    throw error;
  }

  // Lấy các key từ bảng product_keys để đồng bộ tồn kho và số lượng đã bán
  let availableKeys = [];
  let soldKeys = [];
  try {
    const { data: keysData, error: keysError } = await supabase
      .from('product_keys')
      .select('id, product_id, package_id, package_name, status');
    if (!keysError && Array.isArray(keysData)) {
      availableKeys = keysData.filter((k) => k.status === 'available');
      soldKeys = keysData.filter((k) => k.status === 'sold');
    }
  } catch (err) {
    console.warn('Lỗi khi truy vấn product_keys để đồng bộ:', err);
  }

  return (data || []).map((p) => {
    let pkgs = [];
    if (Array.isArray(p.packages)) {
      pkgs = p.packages;
    } else if (typeof p.packages === 'string' && p.packages.trim()) {
      try {
        pkgs = JSON.parse(p.packages);
      } catch (e) {
        pkgs = [];
      }
    }

    // Đếm số lượng key thực tế từ bảng product_keys
    const pAvailableKeys = availableKeys.filter((k) => k.product_id === p.id);
    const pSoldKeys = soldKeys.filter((k) => k.product_id === p.id);

    // Tính toán số lượng tồn kho cho từng gói dựa 100% vào số key có sẵn trong product_keys
    const updatedPkgs = pkgs.map((pkg) => {
      const pkgKeyCount = pAvailableKeys.filter(
        (k) =>
          (pkg.id && k.package_id === pkg.id) ||
          (pkg.name && k.package_name === pkg.name)
      ).length;
      return {
        id: pkg.id || pkg.name,
        name: pkg.name,
        price: pkg.price || '0đ',
        stock: pkgKeyCount, // Số lượng key thực tế trong kho
      };
    });

    const realStock = pAvailableKeys.length;
    const realSold = pSoldKeys.length + (p.sold ?? 0);
    const realStatus = realStock > 0 ? 'in' : 'out';

    return {
      id: p.id,
      name: p.name,
      category: p.category_key || p.category || 'all',
      category_key: p.category_key || p.category || 'all',
      categoryLabel: p.category_label || p.categoryLabel || 'Sản phẩm',
      desc: p.description || p.desc || '',
      features: Array.isArray(p.features) ? p.features : p.features ? [p.features] : [],
      image_url: p.image_url || p.image || '',
      image: p.image_url || p.image || '',
      packages: updatedPkgs,
      productType: p.product_type || 'key',
      stock: realStock,
      pack: p.pack ?? (updatedPkgs.length > 0 ? updatedPkgs.length : 1),
      sold: realSold,
      price: p.price || '0đ',
      status: realStatus,
    };
  });
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('id');
  if (error) {
    console.error('Lỗi khi tải categories từ Supabase:', error);
    throw error;
  }
  return data || [];
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function fetchOrders(userId) {
  let query = supabase.from('orders').select('*').order('purchased_at', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Lỗi khi tải orders từ Supabase:', error);
    throw error;
  }
  return (data || []).map((o) => ({
    id: o.id,
    productName: o.product_name,
    packageName: o.package_name,
    productType: o.product_type || 'key',
    status: o.status,
    amount: o.amount ?? 0,
    purchasedAt: o.purchased_at || '—',
    completedAt: o.completed_at,
    adminNote: o.admin_note,
    productKey: o.product_key,
    expiresInSeconds: o.expires_in_seconds,
    supportsHwidReset: o.supports_hwid_reset ?? (o.product_type === 'token' ? false : true),
    lastHwidResetAt: o.last_hwid_reset_at || null,
  }));
}

export async function resetOrderHwid(orderId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('orders')
    .update({ last_hwid_reset_at: now })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi reset HWID:', error);
    throw error;
  }
  return data;
}

export async function createOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        id: orderData.id,
        user_id: orderData.user_id,
        product_name: orderData.product_name,
        package_name: orderData.package_name,
        product_type: orderData.product_type || 'key',
        status: orderData.status || 'success',
        amount: orderData.amount,
        purchased_at: orderData.purchased_at,
        completed_at: orderData.completed_at,
        admin_note: orderData.admin_note,
        product_key: orderData.product_key,
        expires_in_seconds: orderData.expires_in_seconds,
        supports_hwid_reset: orderData.supports_hwid_reset ?? (orderData.product_type === 'token' ? false : true),
        last_hwid_reset_at: orderData.last_hwid_reset_at || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi tạo order:', error);
    throw error;
  }
  return data;
}

// ─── Product Keys ─────────────────────────────────────────────────────────────

export async function claimProductKeys({
  productId,
  productName,
  packageId,
  packageName,
  userId,
  orderId,
  quantity = 1,
}) {
  try {
    // 1. Thử gọi hàm RPC trên Supabase
    const { data: rpcKeys, error: rpcError } = await supabase.rpc('claim_product_keys', {
      p_product_id: typeof productId === 'number' ? productId : null,
      p_package_id: packageId || null,
      p_package_name: packageName || null,
      p_user_id: userId,
      p_order_id: orderId,
      p_quantity: quantity,
    });

    if (!rpcError && Array.isArray(rpcKeys) && rpcKeys.length > 0) {
      return rpcKeys;
    }
  } catch (e) {
    console.warn('RPC claim_product_keys không khả dụng, thử fallback truy vấn bảng...', e);
  }

  // 2. Fallback: Truy vấn trực tiếp bảng product_keys
  try {
    let query = supabase
      .from('product_keys')
      .select('id, license_key')
      .eq('status', 'available');

    if (productId) {
      query = query.eq('product_id', productId);
    }
    if (packageId && packageId !== 'pkg-default') {
      query = query.or(`package_id.eq.${packageId},package_id.is.null`);
    }

    const { data: availableKeys, error: selectError } = await query.limit(quantity);

    if (!selectError && availableKeys && availableKeys.length > 0) {
      const ids = availableKeys.map((k) => k.id);
      const keys = availableKeys.map((k) => k.license_key);

      await supabase
        .from('product_keys')
        .update({
          status: 'sold',
          user_id: userId,
          order_id: orderId,
          sold_at: new Date().toISOString(),
        })
        .in('id', ids);

      return keys;
    }
  } catch (err) {
    console.error('Lỗi khi claim keys trực tiếp từ bảng product_keys:', err);
  }

  return [];
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function fetchTransactions(userId) {
  let query = supabase.from('transactions').select('*').order('time', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Lỗi khi tải transactions từ Supabase:', error);
    throw error;
  }
  return (data || []).map((t) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    subtitle: t.subtitle,
    time: t.time || '—',
    amount: t.amount ?? 0,
    balanceAfter: t.balance_after ?? 0,
  }));
}

export async function createTransaction(txData) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      {
        id: txData.id,
        user_id: txData.user_id,
        type: txData.type || 'purchase',
        title: txData.title,
        subtitle: txData.subtitle,
        time: txData.time,
        amount: txData.amount,
        balance_after: txData.balance_after,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi tạo transaction:', error);
    throw error;
  }
  return data;
}

// ─── Downloads ───────────────────────────────────────────────────────────────

export async function fetchDownloads() {
  const { data, error } = await supabase.from('downloads').select('*').order('id');
  if (error) {
    console.error('Lỗi khi tải downloads từ Supabase:', error);
    throw error;
  }
  return (data || []).map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    categoryLabel: d.category_label,
    desc: d.description,
    downloads: d.downloads,
    size: d.size,
    hasVideo: d.has_video,
    hasGuide: d.has_guide,
    image_url: d.image_url || d.image || '',
    image: d.image_url || d.image || '',
    download_url: d.download_url || d.downloadUrl || d.link || '',
    downloadUrl: d.download_url || d.downloadUrl || d.link || '',
  }));
}

export async function fetchDownloadCategories() {
  const { data, error } = await supabase
    .from('downloads')
    .select('category, category_label')
    .order('category');
  if (error) {
    console.error('Lỗi khi tải download categories:', error);
    return [{ key: 'all', label: 'Tất cả' }];
  }

  const unique = [{ key: 'all', label: 'Tất cả' }];
  const seen = new Set();
  for (const d of data || []) {
    if (d.category && !seen.has(d.category)) {
      seen.add(d.category);
      unique.push({ key: d.category, label: d.category_label?.toUpperCase() || d.category });
    }
  }
  return unique;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('id', { ascending: false });
  if (error) {
    console.error('Lỗi khi tải notifications:', error);
    return [];
  }
  return data || [];
}

// ─── Feedbacks ────────────────────────────────────────────────────────────────

export async function fetchFeedbacks() {
  const { data, error } = await supabase.from('feedbacks').select('*').order('id');
  if (error) {
    console.error('Lỗi khi tải feedbacks:', error);
    return [];
  }
  return data || [];
}

// ─── Contact Channels ─────────────────────────────────────────────────────────

export async function fetchContactChannels() {
  const { data, error } = await supabase.from('contact_channels').select('*').order('id');
  if (error) {
    console.error('Lỗi khi tải contact_channels:', error);
    return [];
  }
  return (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    desc: c.description,
    badges: Array.isArray(c.badges) ? c.badges : [],
    iconKey: c.icon_key,
    url: c.url,
  }));
}
