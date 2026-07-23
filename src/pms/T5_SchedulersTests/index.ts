/**
 * T5 - SCHEDULERS & TESTS LAYER
 * Triggers sao lưu Real-time (Dual-Write Pattern), tự động cảnh báo lịch bảo trì (TT 40/2026/TT-BXD) và runner kiểm thử tích hợp.
 */

import { PmsService, ProjectData } from '../T2_Services';
import { SyncEngine } from '../T4_Sync';
import { formatDateVN } from '../T1_Utils';

export class PmsScheduler {
  /**
   * Run background backup trigger
   */
  public static triggerRealtimeBackup(): { status: string; backedUpCount: number; timestamp: string } {
    const projects = PmsService.getProjects();
    projects.forEach(p => SyncEngine.executeDualWrite(p));
    return {
      status: 'SUCCESS',
      backedUpCount: projects.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Tự động quét và cảnh báo bảo trì công trình theo Thông tư 40/2026/TT-BXD
   */
  public static checkMaintenanceAlerts(): {
    overdueCount: number;
    upcomingCount: number;
    alerts: Array<{ projectId: string; hangMuc: string; ngayNext: string; isOverdue: boolean }>;
  } {
    const projects = PmsService.getProjects();
    const alerts: Array<{ projectId: string; hangMuc: string; ngayNext: string; isOverdue: boolean }> = [];
    const today = new Date();

    projects.forEach(p => {
      p.LIC_BAO_TRI?.forEach(sch => {
        const nextDate = new Date(sch.NGAY_BAO_TRI_NEXT);
        const diffDays = (nextDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

        if (diffDays < 0 || sch.TRANG_THAI === 'QUÁ_HẠN') {
          alerts.push({
            projectId: p.PROJECT_ID,
            hangMuc: sch.HANG_MUC_BAO_TRI,
            ngayNext: formatDateVN(sch.NGAY_BAO_TRI_NEXT),
            isOverdue: true
          });
        } else if (diffDays <= 30) {
          alerts.push({
            projectId: p.PROJECT_ID,
            hangMuc: sch.HANG_MUC_BAO_TRI,
            ngayNext: formatDateVN(sch.NGAY_BAO_TRI_NEXT),
            isOverdue: false
          });
        }
      });
    });

    return {
      overdueCount: alerts.filter(a => a.isOverdue).length,
      upcomingCount: alerts.filter(a => !a.isOverdue).length,
      alerts
    };
  }
}
