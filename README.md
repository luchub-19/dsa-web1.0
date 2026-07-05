<div align="center">

# 🧠 bookdsa-web (StudyOS)

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

> ### 🇬🇧 *English version:*
> This is what happens when someone gets tired of forgetting a data structure they "learned" three days ago. Instead of another glorified PDF viewer, `bookdsa-web` makes you actually *work* for your memory — fill-in-the-blank code, explain concepts back in your own words (no copy-pasting the professor), and a spaced-repetition algorithm that stalks your forgetting curve and pings you right before your brain quietly deletes the file. It's less "study app," more "memory gym with a strict personal trainer."

---

## ✨ Tính năng / Features

| Tính năng | Mô tả (VI) | The Unhinged Version (EN) |
|---|---|---|
| 📚 Học theo chunk | Nội dung bài học được chia nhỏ thành từng phần (chunk) để tối ưu khả năng tiếp thu | Lessons are chopped into bite-sized pieces so you don't black out by concept #2 |
| ✍️ Active Recall | Bài tập điền code còn thiếu, thay vì chỉ đọc code có sẵn | Fill-in-the-blank coding drills, because staring at code isn't the same as knowing it |
| 🗣️ Kỹ thuật Feynman | Yêu cầu người học giải thích lại khái niệm bằng lời của chính mình | Forces you to explain it in your own words — the app can smell a copy-pasted definition from a mile away |
| ⏰ Spaced Repetition (SM-2) | Thuật toán xác định thời điểm tối ưu để ôn tập trước khi quên | An algorithm that knows exactly when you're about to forget everything — creepier than your ex, more useful too |
| 🖊️ Whiteboard Exam | Mô phỏng môi trường thi/phỏng vấn thực tế, viết code trên bảng trắng số, chặn dán và chấm tự động qua Judge0 | Simulates real interview pressure — no paste, no autocomplete, no mercy, just you and a blinking cursor |
| 🔐 Xác thực qua Supabase | Đăng nhập và đồng bộ tiến độ học tập cá nhân giữa nhiều thiết bị | Login so your shame is tracked, saved, and synced across every device you own |
| 📊 Dashboard thống kê | Hiển thị số chương, số chunk đã hoàn thành, số thẻ đến hạn ôn tập | A dashboard with numbers that go up, engineered to trigger the same dopamine as a mobile game |
| ✅ Unit test | 40 test cho module SM-2, đảm bảo thuật toán ôn tập không âm thầm tính sai | 40 tests guarding the SM-2 algorithm like overly committed security dogs |

**Nội dung hiện có:** Giới thiệu DSA, Đệ quy, Fractal, Quy hoạch động, Phân tích thuật toán, Sắp xếp, Con trỏ, File & Stream, Cấu trúc dữ liệu cơ bản, Danh sách liên kết, Cây, Cây cân bằng, B-Tree, Hàng đợi ưu tiên, Bảng băm.
*(**Current curriculum, in plain English:** Intro to DSA, Recursion, Fractals, DP, Algorithm Analysis, Sorting, Pointers, File & Stream, Basic Data Structures, Linked Lists, Trees, Balanced Trees, B-Trees, Priority Queues, Hash Tables — basically a greatest-hits album of things that make CS students cry.)*

---

## 🏗️ Kiến trúc hệ thống / Tech Stack

```
Frontend      → Next.js 16 (App Router) + React 19 + TypeScript (strict mode)
Styling       → Tailwind CSS v4
Backend/Auth  → Supabase (PostgreSQL + Auth, đồng bộ tiến độ SM-2)
Chấm code     → Judge0, gọi qua API route riêng (key không lộ ra client)
Markdown      → react-markdown + remark-gfm + remark-math + rehype-katex
Testing       → Vitest + jsdom
Data          → JSON tĩnh trong thư mục /data
```

```
dsa-web1.0/
├── app/                 # Routes: learn, review, exam, login, api/judge0
├── components/          # ActiveRecallBlock, FeynmanInput, ChunkViewer, WhiteboardExam...
├── hooks/               # useSpacedRepetition, useAuth
├── lib/                 # SM-2 core logic, parseCodeBlanks, sanitizeHtml, Judge0 client/server
├── types/               # Curriculum, SpacedRepetition, Exam type definitions
├── data/                # File JSON nội dung bài học theo từng chương
└── supabase/migrations/ # Schema cơ sở dữ liệu (bảng sm2_cards + RLS)
```

---

## 🚀 Hướng dẫn cài đặt / Getting Started

**VI — Các bước thực hiện:**

```bash
git clone https://github.com/luchub-19/dsa-web1.0.git
cd dsa-web1.0
npm install
```

**1. Cấu hình Supabase** (đăng nhập + đồng bộ tiến độ)
1. Tạo project miễn phí tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor**, chạy toàn bộ nội dung file `supabase/migrations/0001_sm2_cards.sql`
3. Vào **Project Settings → API**, lấy `Project URL` và `anon public key`

**2. Cấu hình Judge0** (phòng thi code)
Để trống sẽ dùng endpoint public mặc định (rate-limit thấp, phù hợp test cá nhân). Nếu triển khai cho lớp học, khuyến nghị đăng ký key tại [RapidAPI Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce).

**3. Tạo file `.env.local`**
```bash
cp .env.example .env.local
```
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
JUDGE0_URL=...
JUDGE0_KEY=...
```

**4. Chạy server phát triển**
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000) để bắt đầu sử dụng.

**EN — same steps, less patience:**
```bash
git clone https://github.com/luchub-19/dsa-web1.0.git   # you clearly already did this
cd dsa-web1.0
npm install                                              # go make coffee, this will take a minute
cp .env.example .env.local                               # fill in Supabase + Judge0, no shortcuts
npm run dev                                              # localhost:3000 — go forth and suffer productively
```

### Kiểm thử / Testing
```bash
npm run test        # chạy 40 test 1 lần
npm run test:watch  # chế độ theo dõi liên tục — for the anxious among us
npm run lint         # ESLint
npm run build        # build production thử
```

---

## 🐛 Vấn đề đã biết / Known Issues

**VI:** Qua rà soát mã nguồn, phần lớn nội dung bài học (12/15 chương) hiện chưa có dữ liệu cho hai tính năng cốt lõi là Active Recall và Feynman prompt — hai tính năng này hiện hoạt động đầy đủ với chương Linked List, Đệ quy và Sắp xếp. Đây là khoảng trống về nội dung, cần được đội ngũ biên soạn bổ sung; không phải lỗi logic xử lý của ứng dụng. Ngoài ra, trường `blanks` được định nghĩa trong schema v2 nhưng chưa được bất kỳ thành phần giao diện nào sử dụng.

> ### 🇬🇧 English, roast edition:
> Turns out 12 out of 15 chapters are still running on vibes alone — no Active Recall, no Feynman prompts, nothing. Linked List, Recursion, and Sorting are out here living their best life as the *only* chapters that got the full feature set, like the favorite kids at a family reunion. Everyone else is stuck doing theory-then-self-grade, which defeats half the point of the app but hey, at least the code handles it gracefully instead of crashing about it. Also there's a `blanks` field in the schema that no component has ever touched — just sitting there, unemployed, full of potential, like a gym membership from January.

**To-do:** Bổ sung `code_snippet` và `feynman_prompt` cho 12 file JSON còn lại.

---

## 🤝 Đóng góp / Contributing

**VI:** Vui lòng tạo nhánh mới từ `main`, tuân thủ chuẩn [Conventional Commits](https://www.conventionalcommits.org/) khi commit, và mở Pull Request để được xem xét.

**EN:** Fork it, branch it (`git checkout -b feat/whatever-youre-fixing`), commit like a responsible adult, and open a PR. Reviews happen whenever the maintainer's caffeine levels permit.

---

## 📖 Lời tác giả

Chuyện là hồi đó đang giữa kỳ, ngồi vật lộn với DSA như bao đứa sinh viên CS khác — con trỏ trỏ lung tung, đệ quy đệ hoài không quy, và một đống tài liệu tự đi cày khắp nơi: slide thầy cô, sách tiếng Anh, video Youtube tua đi tua lại, note chép tay nhìn như bãi chiến trường. Vấn đề không phải là thiếu tài liệu — vấn đề là **thừa tài liệu nhưng không có chỗ nào gom lại cho tử tế**. Mỗi lần muốn ôn một khái niệm là phải lục lại 4-5 nguồn khác nhau, xong quên mất lần trước học tới đâu rồi.

Rồi một hôm (chắc lúc đang trốn học bài bằng cách... làm việc khác) nảy ra ý nghĩ: *"hay là tự làm một cái web, nhét hết đống này vào, rồi tự chấm mình luôn cho nó công bằng?"* Ban đầu chỉ định làm cái gì đó be bé, kiểu trang ghi chú có mục lục cho gọn. Ai ngờ càng làm càng ham, thêm cái này thêm cái kia, cuối cùng đẻ ra nguyên một hệ thống có thuật toán ôn tập, có phòng thi, có cả tài khoản đăng nhập — từ "ghi chú cá nhân" leo thang thành "dự án có backend đàng hoàng" lúc nào không hay.

Và đúng rồi, phải thú nhận luôn cho nó minh bạch: một phần kha khá của quá trình này là **vibe coding** — tức là vừa code vừa hỏi AI, vừa nhìn code chạy vừa đoán xem tại sao nó chạy được, và thỉnh thoảng copy một đoạn rồi tự thuyết phục bản thân "chắc mình hiểu nó rồi đó". Không có gì phải giấu — thời này ai cũng dùng AI để code nhanh hơn, quan trọng là hiểu được cái mình đang ráp vào, chứ không phải paste xong nhắm mắt deploy (nói vậy chứ cũng có vài lần nhắm mắt thật).

Dự án vẫn còn dở dang — 12/15 chương vẫn đang chờ được "nạp Feynman" — nhưng riêng cái việc nó đã sống được từ 1 ý tưởng lúc nửa đêm cho tới một cái web chạy thật, có test, có người dùng đăng nhập được, thì tự thấy đã là một chiến thắng nho nhỏ rồi.

*English translation, emotionally unfiltered: this whole thing was born out of pure academic desperation — drowning in DSA lecture slides, half-finished notes, and a YouTube watch history that would concern a therapist. The original plan was "make a tiny notes page." The notes page had other plans. It looked me dead in the eye and became a spaced-repetition engine with a login system.*

*And yes — full disclosure, because we're not cowards — a good chunk of this was built via what the youths call "vibe coding": me, an AI, and a shared understanding that we'd figure out why the code worked AFTER it worked. Some of it was copy-pasted with the confidence of someone who definitely read every line (I did not always read every line). No shame in it — everyone's doing the human-plus-AI combo now, the only real sin is deploying something you don't understand even a little bit. I understood at least, like, 60% of it in real time. The other 40% I understood retroactively, through debugging, at 2 AM, powered entirely by spite and cà phê sữa đá.*

*12 chapters are still mid-transformation from "raw JSON" to "actual pedagogy." But hey — it went from a 1 AM shower thought to a real website with real tests and real users who can log in. That's not nothing. That's honestly kind of a big deal, and I will be accepting compliments about it indefinitely.*

— **Khanh Nguyen** ([@luchub-19](https://github.com/luchub-19))

---

## 📜 Giấy phép / License

Chưa xác định. Vui lòng liên hệ trước khi sử dụng lại mã nguồn.
*(Not yet specified. Ask before you yoink the code — we're watching. Probably.)*

---

<div align="center">

**Học một lần, nhớ mãi mãi.**
*Learn it once, remember it forever — or at least survive the final exam.* 🎓

</div>
