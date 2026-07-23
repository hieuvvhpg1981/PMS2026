# ENGINEERING SPECIFICATION & TESTING STRATEGY (engineering.md)
## SYSTEM: HE THONG QUAN LY DU AN DAU TU XAY DUNG (PMS 2026)

### 1. Data Schema & Mandatory Key Alignment
To guarantee 100% data integrity between Frontend and Backend, all state objects adhere strictly to the following keys:
- `PROJECT_ID`: string (e.g., `DA-2026-001`)
- `TUYEN_DUONG_ID`: string (e.g., `TD-01`)
- `MA_BAO_GIA`: string (e.g., `BG-2026-88`)
- `NHOM_DU_AN`: `'NHOM_A' | 'NHOM_B' | 'NHOM_C'`
- `CAP_CONG_TRINH`: `'CAP_DAC_BIET' | 'CAP_I' | 'CAP_II' | 'CAP_III' | 'CAP_IV'`
- `TONG_MUC_DAU_TU`: number
- `DU_TOAN_DAU_TU`: number
- `LUY_KE_GIAP_NGAN`: number
- `TONG_GIA_TRI_HOP_DONG`: number

---

### 2. Mandatory Coding Conventions
1. **Financial Calculations**:
   All mathematical calculations must wrap operands with `Number(val) || 0`.
   Example: `const total = (Number(a) || 0) + (Number(b) || 0);`
2. **String Operations**:
   All string manipulation must sanitize input with `String(val || '').trim()`.
3. **Hard-Block Payment Guard**:
   ```typescript
   if ((Number(cumulativePayment) || 0) > (Number(contractValue) || 0) && !hasAddendum) {
     throw new Error("HARD BLOCK: Khối lượng thanh toán lũy kế vượt giá trị hợp đồng khi chưa có phụ lục!");
   }
   ```

---

### 3. Testing Strategy (T5 Layer)
Automated unit tests (`pmsUnitTests.test.ts`) verify:
1. **Auto-routing Logic**: Evaluates project group A, B, C & construction grade according to Circular 34/2026/TT-BXD and Decree 217/2026/NĐ-CP.
2. **Cross-check Alert Logic**: Triggers error if `Estimate > Total Investment`.
3. **Hard Block Payment Logic**: Prevents illegal payment creation if `Cumulative Paid > Contract Value`.
4. **Dual-write Backup Logic**: Ensures real-time sync with local backup storage.
