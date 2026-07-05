<div align="center">

# 🧠 bookdsa-web

**VI:** Nền tảng học Cấu trúc dữ liệu & Giải thuật (DSA) với cơ chế nhớ chủ động.

**EN:** *A DSA learning app for people who read the slides once, nodded, and remembered nothing.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

</div>

---

## 📖 Giới thiệu

`bookdsa-web` là một ứng dụng web hỗ trợ học Cấu trúc dữ liệu & Giải thuật, được xây dựng để giải quyết một vấn đề cụ thể trong cách học truyền thống: kiến thức đọc qua một lần thường không được ghi nhớ lâu dài. Thay vì trình bày lý thuyết theo dạng đọc — hiểu — quên, ứng dụng kết hợp ba cơ chế học tập chủ động: **active recall** (điền lại code từ trí nhớ), **kỹ thuật Feynman** (tự diễn giải khái niệm bằng ngôn ngữ của người học), và **lặp lại ngắt quãng theo thuật toán SM-2** (lên lịch ôn tập đúng thời điểm trước khi kiến thức bị lãng quên).

> ### 🇬🇧 *English version, unfiltered:*
> This is what happens when someone gets tired of forgetting a data structure they "learned" three days ago. Instead of another glorified PDF viewer, `bookdsa-web` makes you actually *work* for your memory — fill-in-the-blank code, explain concepts back in your own words (no copy-pasting the professor), and a spaced-repetition algorithm that stalks your forgetting curve and pings you right before your brain quietly deletes the file. It's less "study app," more "memory gym with a strict personal trainer."

---

## ✨ Tính năng / Features

| Tính năng | Mô tả (VI) | The Unhinged Version (EN) |
|---|---|---|
| 📚 Học theo chunk | Nội dung bài học được chia nhỏ thành từng phần (chunk) để tối ưu khả năng tiếp thu | Lessons are chopped into bite-sized pieces so you don't black out by concept #2 |
| ✍️ Active Recall | Bài tập điền code còn thiếu, thay vì chỉ đọc code có sẵn | Fill-in-the-blank coding drills, because staring at code isn't the same as knowing it |
| 🗣️ Kỹ thuật Feynman | Yêu cầu người học giải thích lại khái niệm bằng lời của chính mình | Forces you to explain it in your own words — the app can smell a copy-pasted definition from a mile away |
| ⏰ Spaced Repetition (SM-2) | Thuật toán xác định thời điểm tối ưu để ôn tập trước khi quên | An algorithm that knows exactly when you're about to forget everything — creepier than your ex, more useful too |
| 🖊️ Whiteboard Exam | Mô phỏng môi trường thi/phỏng vấn thực tế, viết code trên bảng trắng số | Simulates real interview pressure — no autocomplete, no mercy, just you and a blinking cursor |
| 🔐 Xác thực qua Supabase | Đăng nhập và lưu trữ tiến độ học tập cá nhân | Login so your shame is tracked and saved permanently in a database |
| 📊 Dashboard thống kê | Hiển thị số chương, số chunk đã hoàn thành | A dashboard with numbers that go up, engineered to trigger the same dopamine as a mobile game |

**Nội dung hiện có:** Đệ quy, Fractal, Quy hoạch động, Con trỏ, Danh sách liên kết, Cây, Cây cân bằng, B-Tree, Bảng băm, Hàng đợi ưu tiên.
*(**Current curriculum, in plain English:** Recursion, Fractals, DP, Pointers, Linked Lists, Trees, Balanced Trees, B-Trees, Hash Tables, Priority Queues — basically a greatest-hits album of things that make CS students cry.)*

---

## 🏗️ Kiến trúc hệ thống / Tech Stack

```
Frontend      → Next.js 16 (App Router) + React 19 + TypeScript
Styling       → Tailwind CSS v4
Backend/Auth  → Supabase
Markdown      → react-markdown + remark-gfm + remark-math + rehype-katex
Testing       → Vitest + jsdom
Data          → JSON tĩnh trong thư mục /data
```

```
dsa-web1.0/
├── app/                # Routes: learn, review, exam, login
├── components/         # ActiveRecallBlock, FeynmanInput, ChunkViewer, WhiteboardExam...
├── hooks/              # useSpacedRepetition, useAuth
├── lib/                # SM-2 core logic
├── types/              # Curriculum, SpacedRepetition, Exam type definitions
├── data/               # File JSON nội dung bài học theo từng chương
└── supabase/migrations # Schema cơ sở dữ liệu
```

---

## 🚀 Hướng dẫn cài đặt / Getting Started

**VI — Các bước thực hiện:**

```bash
git clone https://github.com/luchub-19/dsa-web1.0.git
cd dsa-web1.0
npm install
```

Tạo file `.env.local` với các biến môi trường Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Chạy server phát triển:
```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) để bắt đầu sử dụng.

**EN — same steps, less patience:**
```bash
git clone https://github.com/luchub-19/dsa-web1.0.git   # you clearly already did this
cd dsa-web1.0
npm install                                              # go make coffee, this will take a minute
npm run dev                                              # localhost:3000 — go forth and suffer productively
```

### Kiểm thử / Testing
```bash
npm run test        # chạy kiểm thử một lần
npm run test:watch  # chế độ theo dõi liên tục — for the anxious among us
```

---

## 🐛 Vấn đề đã biết / Known Issues

**VI:** Qua rà soát mã nguồn, phần lớn nội dung bài học (14/15 chương) hiện chưa có dữ liệu cho hai tính năng cốt lõi là Active Recall và Feynman prompt — hai tính năng này hiện chỉ hoạt động đầy đủ với chương Linked List (`linkedlists.json`). Đây là khoảng trống về nội dung, cần được đội ngũ biên soạn bổ sung; không phải lỗi logic xử lý của ứng dụng. Ngoài ra, trường `blanks` được định nghĩa trong schema nhưng chưa được bất kỳ thành phần giao diện nào sử dụng.

> ### 🇬🇧 English, roast edition:
> Turns out 14 out of 15 chapters are running on vibes alone — no Active Recall, no Feynman prompts, nothing. `linkedlists.json` is out here living its best life as the *only* chapter that got the full feature set, like the favorite child at a family reunion. Everyone else is stuck doing theory-then-self-grade, which defeats the entire point of the app but hey, at least the code handles it gracefully. Also there's a `blanks` field in the schema that no component has ever touched — just sitting there, unemployed, full of potential, like a gym membership from January.

**To-do:** Bổ sung `code_snippet` và `feynman_prompt` cho 14 file JSON còn lại.

---

## 🤝 Đóng góp / Contributing

**VI:** Vui lòng tạo nhánh mới từ `main`, tuân thủ chuẩn [Conventional Commits](https://www.conventionalcommits.org/) khi commit, và mở Pull Request để được xem xét.

**EN:** Fork it, branch it (`git checkout -b feat/whatever-youre-fixing`), commit like a responsible adult, and open a PR. Reviews happen whenever the maintainer's caffeine levels permit.

---

## 📜 Giấy phép / License

Chưa xác định. Vui lòng liên hệ trước khi sử dụng lại mã nguồn.
*(Not yet specified. Ask before you yoink the code — we're watching. Probably.)*

---

<div align="center">

**Học một lần, nhớ mãi mãi.**
*Learn it once, remember it forever — or at least survive the final exam.* 🎓

</div>
