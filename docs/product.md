# PRODUCT DESIGN DOCUMENT (product.md)
## SYSTEM: HE THONG QUAN LY DU AN DAU TU XAY DUNG (PMS 2026)

### 1. Tong Quan & Muc Tieu
PMS 2026 la he thong quan ly so hoa 100% vong doi du an dau tu xay dung theo phap luat Viet Nam hien hanh:
- **Luat Xay dung 135/2025/QH15**
- **Nghi dinh**: 206/2026/ND-CP (Quan ly chi phi), 207/2026/ND-CP (Thi cong & Ngiem thu), 210/2026/ND-CP (Hop dong xay dung), 212/2026/ND-CP (Dau thau), 217/2026/ND-CP (Tham dinh & Khai tao du an), 193/2026/ND-CP (Quyet toan von dau tu cong).
- **Thong tu BXD**: 34/2026/TT-BXD (Phan cap cong trinh), 38/2026/TT-BXD (Dinh muc xay dung), 39/2026/TT-BXD (So hoa & CSDL Quoc gia), 40/2026/TT-BXD (Bao tri cong trinh), 41/2026/TT-BXD (Nhat ky thi cong va nghiem thu).

---

### 2. Micro-Architecture 7 Tang Atomic Design (T0 -> T6)
1. **T0 - Config**: Hang so, Schema, Enumeration (Nhom A/B/C, Cap I/II/III/IV/Dac biet), Rate coefficients, API keys, SmartCA Tokens.
2. **T1 - Utils**: Ham xu ly chuoi, Number formatting (VND), Safe math `Number(x) || 0`, String trimming `String(x || '').trim()`.
3. **T2 - Services**: Thao tac Firestore DB / Dual-Write Google Sheets / KV LocalStorage, Engine tinh TMDT, Du toan, Giai ngan, Hard Block validation.
4. **T3 - Handlers**: API Endpoints dispatcher (`...Api`), validate SmartCA Digital Signature, HTTP Request/Response formatter.
5. **T4 - Sync**: Che che Dual-write Real-time, Synced 2D Data matrices, Race condition guards.
6. **T5 - Schedulers & Tests**: Automated backup triggers, Maintenance alert scheduler (TT 40/2026), TDD Unit tests suite.
7. **T6 - Sheet Functions & UI**: SaaS Vibrant Tech full-screen Responsive UI dashboard + 5 Business Stage Modules.

---

### 3. Quy Trinh Nghiep Vu 5 Giai Doan (BPMN)
- **Giai doan 1 (Khoi tao)**: Tiep nhan Van ban -> Auto Project Code -> Routing Nhom A/B/C theo TT 34/2026 -> Phê duyet BCNCTKT/BCKTKT.
- **Giai doan 2 (Thiet ke & Du toan)**: TK BVTC -> Do boc khoi luong -> Ap dinh muc -> Cross-check Alert (`Du toan > TMDT`) -> Gantt Chart Baseline.
- **Giai doan 3 (Dau thau & Hop dong)**: KHLCNT -> Dau thau -> Tinh nang luc nha thau -> Auto Contract Gen (QD 1040/BXD) -> Milestones.
- **Giai doan 4 (Thi cong & Thanh toan)**: E-Logbook GPS SmartCA -> Nghiem thu -> Cost Control Hard Block (`Luy ke giai ngan > Hop dong`).
- **Giai doan 5 (Ban giao & Quyet toan)**: One-click Quyet toan ND 193/2026 -> Digital Handover ZIP -> Maintenance Scheduler TT 40/2026.
