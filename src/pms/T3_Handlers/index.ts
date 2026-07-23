/**
 * T3 - HANDLERS LAYER
 * Điều phối API Dispatchers cho Giai đoạn 1, 2, 3 và Giai đoạn 4 (Thi công, Giám sát & Thanh toán theo Gói thầu).
 */

import { PmsService, ProjectData, BoqItem, GanttTaskItem, SiteClearanceRecord, ProcurementPackageRecord, ContractManagementRecord, ConsultingProductRecord, ConstructionWorkRecord } from '../T2_Services';
import { DesignType, ApprovalStatus } from '../T0_Config';

export const PmsHandlers = {
  getProjectsApi(): { success: boolean; data: ProjectData[] } {
    try {
      const data = PmsService.getProjects();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, data: [] };
    }
  },

  saveProjectApi(project: ProjectData): { success: boolean; data?: ProjectData; message: string } {
    try {
      const saved = PmsService.saveProject(project);
      return { success: true, data: saved, message: `Đã lưu dự án ${saved.PROJECT_ID} thành công!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu dự án: ${err?.message}` };
    }
  },

  stage2PlanApi(projectId: string, ganttTasks: GanttTaskItem[]): { success: boolean; message: string } {
    try {
      const project = PmsService.getProjectById(projectId);
      if (!project) return { success: false, message: `Không tìm thấy dự án ${projectId}` };

      project.GANTT_TASKS_GDA2 = ganttTasks;
      PmsService.saveProject(project);
      return { success: true, message: `Đã lưu Kế hoạch tiến độ Baseline (${ganttTasks.length} công việc)` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu kế hoạch tiến độ: ${err?.message}` };
    }
  },

  stage2EstimateApi(params: {
    projectId: string;
    designType: DesignType;
    consultingMode: 'TỰ_THỰC_HIỆN' | 'THUÊ_TƯ_VẤN';
    consultantName?: string;
    boqItems: BoqItem[];
  }): { success: boolean; data?: { boqSummary: any; crossCheck: any }; message: string } {
    try {
      const project = PmsService.getProjectById(params.projectId);
      if (!project) return { success: false, message: `Không tìm thấy dự án ${params.projectId}` };

      const boqSummary = PmsService.calculateBoqSummary(params.boqItems);

      project.LOAI_THIET_KE = params.designType;
      project.TU_THUC_HIEN_HAY_THUE_TU_VAN = params.consultingMode;
      project.TEN_DON_VI_TU_VAN = params.consultantName;
      project.BOQ_ITEMS_GDA2 = params.boqItems;
      project.DU_TOAN_DAU_TU = boqSummary.tongDuToanBoq;

      PmsService.saveProject(project);

      const crossCheck = {
        isExceeded: project.CANH_BAO_RED_FLAG,
        alertMessage: project.NOI_DUNG_CANH_BAO || 'Dự toán BOQ nằm trong hạn mức TMĐT.'
      };

      return {
        success: true,
        data: { boqSummary, crossCheck },
        message: crossCheck.isExceeded
          ? `LƯU DỰ TOÁN THÀNH CÔNG NHƯNG CÓ CẢNH BÁO RED-FLAG!`
          : `Đã lưu thành công Dự toán BOQ (${boqSummary.tongDuToanBoq.toLocaleString()} VNĐ)!`
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu dự toán BOQ: ${err?.message}` };
    }
  },

  stage2ApprovalApi(params: {
    projectId: string;
    reviewerDept: string;
    reviewerName: string;
    status: ApprovalStatus;
    comments: string;
    smartCaToken: string;
  }): { success: boolean; message: string } {
    try {
      const project = PmsService.getProjectById(params.projectId);
      if (!project) return { success: false, message: `Không tìm thấy dự án ${params.projectId}` };

      if (project.CANH_BAO_RED_FLAG && params.status === ApprovalStatus.APPROVED) {
        return {
          success: false,
          message: `KHÔNG THỂ PHÊ DUYỆT: Dự toán BOQ (${project.DU_TOAN_DAU_TU.toLocaleString()} đ) đang VƯỢT Tổng mức đầu tư (${project.TONG_MUC_DAU_TU.toLocaleString()} đ)!`
        };
      }

      project.TRANG_THAI_THAM_DINH_GDA2 = params.status;
      project.REVIEW_LOGS_GDA2 = project.REVIEW_LOGS_GDA2 || [];
      project.REVIEW_LOGS_GDA2.push({
        reviewId: `REV-${Date.now()}`,
        reviewerDept: params.reviewerDept,
        reviewerName: params.reviewerName,
        reviewDate: new Date().toISOString().split('T')[0],
        status: params.status,
        comments: params.comments
      });

      if (params.status === ApprovalStatus.APPROVED) {
        project.TRANG_THAI = 'DỰ_TOÁN_ĐÃ_DUYỆT';
      }

      PmsService.saveProject(project);
      return { success: true, message: `Đã hoàn tất thẩm định nội bộ & ký số SmartCA thành công [Trạng thái: ${params.status}]` };
    } catch (err: any) {
      return { success: false, message: `Lỗi thẩm định nội bộ: ${err?.message}` };
    }
  },

  stage3GpmbApi(projectId: string, gpmbItems: SiteClearanceRecord[]): { success: boolean; message: string } {
    try {
      PmsService.saveGpmbItems(projectId, gpmbItems);
      return { success: true, message: `Đã lưu thành công dữ liệu GPMB (${gpmbItems.length} hộ dân/tổ chức)!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu dữ liệu GPMB: ${err?.message}` };
    }
  },

  stage3KhlcntApi(projectId: string, khlcntItems: ProcurementPackageRecord[]): { success: boolean; message: string } {
    try {
      PmsService.saveKhlcntItems(projectId, khlcntItems);
      return { success: true, message: `Đã lưu Kế hoạch & Kết quả LCNT (${khlcntItems.length} gói thầu)!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu KHLCNT: ${err?.message}` };
    }
  },

  stage3ContractApi(projectId: string, contractItems: ContractManagementRecord[]): { success: boolean; message: string } {
    try {
      PmsService.saveContractItems(projectId, contractItems);
      return { success: true, message: `Đã lưu danh mục Hợp đồng kinh tế (${contractItems.length} hợp đồng)!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu hợp đồng: ${err?.message}` };
    }
  },

  /**
   * API GIAI ĐOẠN 4: LƯU SẢN PHẨM MỐC TƯ VẤN THÀNH PHẦN
   */
  stage4ConsultingProductsApi(projectId: string, packageId: string, products: ConsultingProductRecord[]): { success: boolean; message: string } {
    try {
      PmsService.saveConsultingProducts(projectId, packageId, products);
      return { success: true, message: `Đã lưu danh mục Sản phẩm tư vấn gói [${packageId}]!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu sản phẩm tư vấn: ${err?.message}` };
    }
  },

  /**
   * API GIAI ĐOẠN 4: LƯU KHỐI LƯỢNG NGHIỆM THU THI CÔNG
   */
  stage4ConstructionWorksApi(projectId: string, packageId: string, works: ConstructionWorkRecord[]): { success: boolean; message: string } {
    try {
      PmsService.saveConstructionWorks(projectId, packageId, works);
      return { success: true, message: `Đã lưu khối lượng thi công gói [${packageId}]!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu khối lượng thi công: ${err?.message}` };
    }
  },

  /**
   * API GIAI ĐOẠN 4: YÊU CẦU GIẢI NGÂN THEO GÓI THẦU (CHỐNG HARD BLOCK)
   */
  stage4PackageDisbursementApi(projectId: string, packageId: string, reqAmount: number): { success: boolean; message: string; data?: any } {
    try {
      const res = PmsService.requestPackageDisbursement(projectId, packageId, reqAmount);
      return res;
    } catch (err: any) {
      return { success: false, message: `Lỗi giải ngân gói thầu: ${err?.message}` };
    }
  },

  uploadStage1DocumentApi(params: {
    projectId: string;
    stepId: number;
    docTypeId: string;
    docTypeName: string;
    fileName: string;
    fileSizeMB: number;
    uploaderName: string;
  }): { success: boolean; data?: any; message: string } {
    try {
      const doc = PmsService.uploadStage1Document(
        params.projectId,
        params.stepId,
        params.docTypeId,
        params.docTypeName,
        params.fileName,
        params.fileSizeMB,
        params.uploaderName
      );
      return { success: true, data: doc, message: `Đã tải lên hồ sơ [${params.docTypeName}] thành công!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi upload tài liệu GĐ 1: ${err?.message}` };
    }
  },

  uploadStage2DocumentApi(params: {
    projectId: string;
    stepId: number;
    docTypeId: string;
    docTypeName: string;
    fileName: string;
    fileSizeMB: number;
    uploaderName: string;
  }): { success: boolean; data?: any; message: string } {
    try {
      const doc = PmsService.uploadStage2Document(
        params.projectId,
        params.stepId,
        params.docTypeId,
        params.docTypeName,
        params.fileName,
        params.fileSizeMB,
        params.uploaderName
      );
      return { success: true, data: doc, message: `Đã tải lên tệp GĐ 2 [${params.docTypeName}] thành công!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi upload tài liệu GĐ 2: ${err?.message}` };
    }
  },

  uploadStage3DocumentApi(params: {
    projectId: string;
    stepId: number;
    docTypeId: string;
    docTypeName: string;
    fileName: string;
    fileSizeMB: number;
    uploaderName: string;
  }): { success: boolean; data?: any; message: string } {
    try {
      const doc = PmsService.uploadStage3Document(
        params.projectId,
        params.stepId,
        params.docTypeId,
        params.docTypeName,
        params.fileName,
        params.fileSizeMB,
        params.uploaderName
      );
      return { success: true, data: doc, message: `Đã tải lên tài liệu GĐ 3 [${params.docTypeName}] thành công!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi upload tài liệu GĐ 3: ${err?.message}` };
    }
  }
};
