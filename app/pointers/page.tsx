import { redirect } from 'next/navigation';

/**
 * FIX: file này trước đây chỉ render `<div>Pointers</div>` — trang tạm còn
 * sót lại từ lúc dựng khung dự án, trùng chức năng với /learn/pointers
 * (trang học thật của chương Con trỏ). Không tìm thấy nơi nào trong app
 * liên kết tới /pointers, nên khả năng cao đây là route thừa.
 *
 * Giữ route để không phá link cũ nếu ai đã bookmark, nhưng chuyển hướng
 * ngay tới trang học thật thay vì hiện nội dung rỗng.
 */
export default function PointersRedirectPage() {
  redirect('/learn/pointers');
}
