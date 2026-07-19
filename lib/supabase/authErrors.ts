import type { AuthError } from '@supabase/supabase-js';

/**
 * Chuyển lỗi từ supabase.auth.* sang thông báo tiếng Việt, dễ hiểu cho
 * người dùng cuối — thay vì hiện thẳng message tiếng Anh gốc của Supabase.
 *
 * Chiến lược: ưu tiên khớp theo `error.code`. Đây là cách Supabase khuyến
 * nghị chính thức (xem docs bên dưới), vì message tiếng Anh có thể đổi cách
 * diễn đạt giữa các bản Supabase mà không báo trước, còn `code` thì ổn định.
 * @see https://supabase.com/docs/guides/auth/debugging/error-codes
 *
 * NGOẠI LỆ: lỗi sai email/mật khẩu — case phổ biến nhất — từng có bug đã
 * xác nhận phía supabase-js khiến `code` bị `undefined` dù docs nói phải có
 * (supabase/auth-js#947, supabase/auth#1631). Vì vậy có thêm lớp fallback
 * khớp theo message gốc (không phân biệt hoa/thường) cho đúng case đó và
 * vài case phổ biến khác, phòng khi `code` không tồn tại (kể cả với các
 * bản Supabase tự host cũ hơn).
 */

const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  email_not_confirmed:
    'Email chưa được xác nhận — kiểm tra hộp thư và bấm vào link xác nhận trước khi đăng nhập.',
  user_already_exists: 'Email này đã được đăng ký rồi. Thử đăng nhập hoặc dùng "Quên mật khẩu?".',
  email_exists: 'Email này đã được đăng ký rồi. Thử đăng nhập hoặc dùng "Quên mật khẩu?".',
  weak_password: 'Mật khẩu chưa đủ mạnh — thử thêm chữ hoa, số hoặc ký tự đặc biệt.',
  same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  email_address_invalid: 'Địa chỉ email không hợp lệ.',
  validation_failed: 'Thông tin nhập chưa hợp lệ, kiểm tra lại email/mật khẩu.',
  over_email_send_rate_limit:
    'Email được gửi quá nhiều lần trong thời gian ngắn. Vui lòng đợi vài phút rồi thử lại.',
  over_request_rate_limit: 'Bạn thao tác hơi nhanh — vui lòng đợi một chút rồi thử lại.',
  over_sms_send_rate_limit: 'SMS được gửi quá nhiều lần. Vui lòng đợi rồi thử lại.',
  user_banned: 'Tài khoản này đã bị tạm khóa. Liên hệ quản trị viên nếu có nhầm lẫn.',
  user_not_found: 'Không tìm thấy tài khoản với thông tin này.',
  signup_disabled: 'Tính năng đăng ký tài khoản mới hiện đang tắt.',
  email_provider_disabled: 'Đăng nhập bằng email/mật khẩu hiện đang tắt.',
  session_expired: 'Phiên làm việc đã hết hạn, vui lòng thử lại từ đầu.',
  session_not_found: 'Phiên làm việc không còn hợp lệ, vui lòng đăng nhập lại.',
  reauthentication_needed: 'Cần xác thực lại trước khi đổi mật khẩu — đăng xuất rồi đăng nhập lại thử xem.',
  bad_json: 'Dữ liệu gửi lên không hợp lệ.',
  bad_jwt: 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.',
  request_timeout: 'Yêu cầu xử lý quá lâu, vui lòng thử lại.',
  captcha_failed: 'Xác minh captcha thất bại, thử lại lần nữa.',
};

// Dự phòng khi Supabase KHÔNG trả `code` — khớp theo message tiếng Anh gốc.
const MESSAGE_FALLBACKS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email hoặc mật khẩu không đúng.'],
  [/user already registered/i, 'Email này đã được đăng ký rồi. Thử đăng nhập hoặc dùng "Quên mật khẩu?".'],
  [/email not confirmed/i, 'Email chưa được xác nhận — kiểm tra hộp thư trước khi đăng nhập.'],
  [/password should be at least/i, 'Mật khẩu quá ngắn — cần ít nhất 6 ký tự.'],
  [/rate limit/i, 'Bạn thao tác hơi nhanh — vui lòng đợi một chút rồi thử lại.'],
  [/network|fetch failed|failed to fetch|load failed/i, 'Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.'],
];

const DEFAULT_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại.';

/**
 * @param error Lỗi bất kỳ từ 1 lệnh gọi supabase.auth.* (thường là AuthError)
 * @returns Message tiếng Việt, luôn an toàn để hiện trực tiếp cho người dùng.
 *          Không bao giờ trả lại nguyên văn message tiếng Anh gốc.
 */
export function translateAuthError(error: unknown): string {
  if (!error) return DEFAULT_MESSAGE;

  const code = (error as Partial<AuthError>)?.code;
  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  const message = error instanceof Error ? error.message : String(error);
  for (const [pattern, vi] of MESSAGE_FALLBACKS) {
    if (pattern.test(message)) return vi;
  }

  if (process.env.NODE_ENV !== 'production') {
    // Không map được — log nguyên văn để dễ bổ sung thêm case, nhưng người
    // dùng vẫn chỉ thấy message tiếng Việt mặc định, không thấy tiếng Anh.
    console.error('[authErrors] Chưa có bản dịch cho lỗi này:', error);
  }

  return DEFAULT_MESSAGE;
}
