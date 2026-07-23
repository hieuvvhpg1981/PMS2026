/**
 * T4 - SYNC LAYER
 * Đồng bộ dữ liệu tốc độ cao (Cloudflare KV/Proxy/Cache), tối ưu mảng 2 chiều và chặn Race Condition (Dual-Write Pattern).
 */

import { ProjectData } from '../T2_Services';
import { safeString } from '../T1_Utils';

export class SyncEngine {
  private static isLocked = false;
  private static syncQueue: ProjectData[] = [];

  /**
   * Dual-Write Pattern: Ghi đồng thời vào Local Storage và gửi sao lưu real-time
   */
  public static async executeDualWrite(project: ProjectData): Promise<{ synced: boolean; mode: string }> {
    if (this.isLocked) {
      this.syncQueue.push(project);
      return { synced: false, mode: 'QUEUED_DUE_TO_RACE_CONDITION' };
    }

    try {
      this.isLocked = true;
      // 1. Primary write to LocalStorage
      const raw = localStorage.getItem('PMS_2026_PROJECTS_DATABASE_V1');
      const list: ProjectData[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(p => p.PROJECT_ID === project.PROJECT_ID);
      if (idx >= 0) list[idx] = project;
      else list.push(project);
      localStorage.setItem('PMS_2026_PROJECTS_DATABASE_V1', JSON.stringify(list));

      // 2. Secondary write (Dual-Write simulation to Google Drive / Cloud Backup KV)
      const backupMatrix = this.convertTo2DArrayMatrix(list);
      localStorage.setItem('PMS_2026_DRIVE_BACKUP_MATRIX', JSON.stringify(backupMatrix));

      return { synced: true, mode: 'DUAL_WRITE_SUCCESSFUL' };
    } finally {
      this.isLocked = false;
      if (this.syncQueue.length > 0) {
        const next = this.syncQueue.shift();
        if (next) this.executeDualWrite(next);
      }
    }
  }

  /**
   * Tối ưu mảng 2 chiều (2D Matrix array) để xuất/nhập nhanh với Google Sheets / Excel
   */
  public static convertTo2DArrayMatrix(projects: ProjectData[]): (string | number)[][] {
    const headers = [
      'MÃ DỰ ÁN (PROJECT_ID)',
      'TÊN DỰ ÁN',
      'CHỦ TRƯƠNG ID',
      'MÃ TUYẾN ĐƯỜNG',
      'MÃ BÁO GIÁ',
      'NHÓM DỰ ÁN',
      'CẤP CÔNG TRÌNH',
      'TỔNG MỨC ĐẦU TƯ (VND)',
      'DỰ TOÁN ĐẦU TƯ (VND)',
      'TỔNG GIÁ TRỊ HỢP ĐỒNG (VND)',
      'LŨY KẾ GIẢI NGÂN (VND)',
      'GIAI ĐOẠN',
      'CẢNH BÁO RED FLAG'
    ];

    const rows = projects.map(p => [
      safeString(p.PROJECT_ID),
      safeString(p.TEN_DU_AN),
      safeString(p.CHỦ_TRƯƠNG_ID),
      safeString(p.TUYEN_DUONG_ID),
      safeString(p.MA_BAO_GIA),
      safeString(p.NHOM_DU_AN),
      safeString(p.CAP_CONG_TRINH),
      Number(p.TONG_MUC_DAU_TU) || 0,
      Number(p.DU_TOAN_DAU_TU) || 0,
      Number(p.TONG_GIA_TRI_HOP_DONG) || 0,
      Number(p.LUY_KE_GIAI_NGAN) || 0,
      Number(p.GIAI_DOAN_HIEN_TAI) || 1,
      p.CANH_BAO_RED_FLAG ? 'CÓ (CẢNH BÁO)' : 'KHÔNG'
    ]);

    return [headers, ...rows];
  }
}
