# UI / UX DESIGN SPECIFICATION (ui.md)
## SYSTEM: HE THONG QUAN LY DU AN DAU TU XAY DUNG (PMS 2026)

### 1. Aesthetic Standard (SaaS Vibrant Tech)
- **Color Palette**:
  - Primary: Deep Tech Blue (`#1E40AF` / `bg-blue-700` to `#3B82F6` / `bg-blue-500`)
  - Accent / Emerald: Emerald Green (`#059669` / `bg-emerald-600`) for Approved/Paid states.
  - Alert / Red: Crimson Red (`#DC2626` / `bg-red-600`) for Over-budget or Hard-Blocked states.
  - Warning / Amber: Amber (`#D97706` / `bg-amber-600`) for Pending / Verification states.
  - Neutral Background: Slate Light (`bg-slate-50`, `bg-slate-100`, cards `bg-white` with `border border-slate-200 shadow-sm`).
- **Typography**: Inter / System UI, modern hierarchy, clear badges and financial number representations (`1.500.000.000 đ`).

---

### 2. Screen Layout & Navigation Architecture
- **Sidebar Header**: App Logo + System Title "PMS 2026 - QLDA Đầu Tư Xây Dựng".
- **Navigation Tabs**:
  1. Executive BI Dashboard (S-Curve Progress & Cost, Red-flag alert center, Real-time Disbursement %).
  2. Giai đoạn 1: Chuẩn bị đầu tư & Khởi tạo (Auto-routing Group A/B/C, Decision approvals).
  3. Giai đoạn 2: Thiết kế & Dự toán (Norm DB lookup, Gantt Chart Baseline, Alert `Dự toán > TMĐT`).
  4. Giai đoạn 3: Đấu thầu & Hợp đồng (Contractor evaluation, Auto Contract Gen QĐ 1040/BXD, Milestones).
  5. Giai đoạn 4: Thi công & Thanh toán (E-Logbook GPS SmartCA, Cost Control & Hard Block over-payment).
  6. Giai đoạn 5: Bàn giao & Quyết toán (One-click Quyết toán NĐ 193/2026, Handover ZIP, Maintenance TT 40/2026).
  7. API CSDL Quốc gia (Import/Export JSON/Excel TT 39/2026/TT-BXD).
