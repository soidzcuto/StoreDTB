// supabase/functions/sepay-webhook/index.ts
// Edge Function nhận webhook từ SePay và xử lý nạp tiền tự động.
//
// Deploy:  supabase functions deploy sepay-webhook --no-verify-jwt
// Secrets: supabase secrets set SEPAY_WEBHOOK_TOKEN=<token_bí_mật>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 1. Xác thực token webhook (nếu có cấu hình)
    const webhookToken = Deno.env.get('SEPAY_WEBHOOK_TOKEN');
    if (webhookToken) {
      const incoming =
        req.headers.get('x-api-key') ||
        req.headers.get('authorization')?.replace('Bearer ', '');
      if (incoming && incoming !== webhookToken) {
        console.warn('SePay webhook: Token không hợp lệ');
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Parse payload từ SePay:
    // Hỗ trợ cả các trường chuẩn của SePay: content, code, description, transferAmount, amount, referenceCode, id
    const body = await req.json();
    console.log('SePay webhook payload:', JSON.stringify(body));

    const transferType = body.transferType || body.type || 'in';
    // Chỉ xử lý giao dịch nhận tiền vào
    if (transferType !== 'in' && transferType !== 'IN') {
      return new Response(
        JSON.stringify({ success: true, message: 'Bỏ qua giao dịch chuyển tiền ra.' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Lấy nội dung chuyển khoản từ content, code hoặc description
    const rawContent: string = (body.content || body.code || body.description || '').trim();
    const paidAmount: number = Math.round(
      Number(body.transferAmount || body.amount || body.accumulated || 0)
    );
    const sepayRef: string = String(body.referenceCode || body.id || ('SEPAY-' + Date.now()));

    if (!rawContent || paidAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Dữ liệu webhook không hợp lệ (thiếu content hoặc amount <= 0).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Kết nối Supabase bằng service_role (để bypass RLS và cập nhật profile người dùng)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // 4. Gọi stored procedure process_topup để xử lý cộng tiền
    const { data, error } = await supabase.rpc('process_topup', {
      p_transfer_content: rawContent,
      p_paid_amount: paidAmount,
      p_sepay_ref: sepayRef,
    });

    if (error) {
      console.error('Lỗi khi gọi process_topup:', error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Kết quả process_topup:', JSON.stringify(data));

    if (!data?.ok) {
      // Trả 200 kèm lý do để SePay không retry liên tục nếu chỉ là giao dịch không liên quan
      return new Response(
        JSON.stringify({ success: true, message: data?.reason || 'Không tìm thấy yêu cầu nạp phù hợp.' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nạp tiền thành công!',
        user_id: data.user_id,
        paid_amount: data.paid_amount,
        new_balance: data.new_balance,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled webhook error:', err);
    return new Response(
      JSON.stringify({ success: false, message: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
