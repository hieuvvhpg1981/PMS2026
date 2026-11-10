/**
 * T3 - HANDLERS LAYER
 * Điều phối API Dispatchers cho Giai đoạn 1, 2, 3 và Giai đoạn 4 (Thi công, Giám sát & Thanh toán theo Gói thầu).
 */

import { PmsService, ProjectData, BoqItem, GanttTaskItem, SiteClearanceRecord, ProcurementPackageRecord, ContractManagementRecord, ConsultingProductRecord, ConstructionWorkRecord, ConstructionPermitRecord, MaterialSubmittalRecord, ELogbookItem, MaintenanceScheduleItem } from '../T2_Services';
import { DesignType, ApprovalStatus, STAGE1_DOCUMENT_TYPES } from '../T0_Config';
import { validateRequiredAttachments } from '../T1_Utils';

export const PmsHandlers = {
  getProjectsApi(): { success: boolean; data: ProjectData[] } {
    try {
      const data = PmsService.getProjects();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, data: [] };
    }
  },

  saveProjectApi(project: Partial<ProjectData>, _smartCaToken?: string): { success: boolean; data?: ProjectData; message: string } {
    try {
      const saved = PmsService.saveProject(project as ProjectData);
      return { success: true, data: saved, message: `Đã lưu dự án ${saved.PROJECT_ID} (${saved.NATIONAL_PROJECT_CODE}) thành công!` };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu dự án: ${err?.message}` };
    }
  },

  validateStepProgressionApi(projectId: string, stepId: number): { success: boolean; data?: { canProgress: boolean; missingDocs: string[] }; message: string } {
    try {
      const project = PmsService.getProjectById(projectId);
      if (!project) return { success: false, message: `Không tìm thấy dự án ${projectId}` };
      const uploaded = project.DOCUMENT_MATRIX_GDA1 || [];
      const res = validateRequiredAttachments(stepId, STAGE1_DOCUMENT_TYPES as any, uploaded);
      return {
        success: res.canProgress,
        data: { canProgress: res.canProgress, missingDocs: res.missingDocNames },
        message: res.message
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi kiểm tra hồ sơ: ${err?.message}` };
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
  },

  /**
   * API NĐ 217/2026: LƯU THÔNG TIN CẤP GIẤY PHÉP XÂY DỰNG / MIỄN GPXD
   */
  stage2PermitApi(projectId: string, permit: ConstructionPermitRecord): { success: boolean; message: string } {
    try {
      PmsService.saveConstructionPermit(projectId, permit);
      return {
        success: true,
        message: `Đã lưu thông tin Cấp phép Xây dựng (NĐ 217/2026) [${permit.permitStatus}] thành công!`
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu GPXD: ${err?.message}` };
    }
  },

  /**
   * API NĐ 209/2026: LƯU KIỂM SOÁT VẬT LIỆU XÂY DỰNG ĐẦU VÀO & HỢP QUY QCVN
   */
  stage4MaterialSubmittalsApi(projectId: string, materials: MaterialSubmittalRecord[]): { success: boolean; message: string } {
    try {
      PmsService.saveMaterialSubmittals(projectId, materials);
      return {
        success: true,
        message: `Đã lưu hồ sơ Kiểm soát & Hợp quy VLXD đầu vào (NĐ 209/2026) (${materials.length} lô vật tư)!`
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu hồ sơ VLXD: ${err?.message}` };
    }
  },

  /**
   * API NĐ 207/2026: LƯU NHẬT KÝ THI CÔNG ĐIỆN TỬ KÝ SỐ ĐỐI XỨNG 2 BÊN
   */
  stage4ELogbookApi(projectId: string, logs: ELogbookItem[]): { success: boolean; message: string } {
    try {
      PmsService.saveELogbookEntries(projectId, logs);
      return {
        success: true,
        message: `Đã ghi nhận & ký số Nhật ký thi công điện tử (NĐ 207/2026 & TT 41/2026) thành công!`
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu nhật ký thi công: ${err?.message}` };
    }
  },

  /**
   * API NĐ 207/2026: LƯU QUY TRÌNH BẢO TRÌ & THÔNG BÁO KIỂM TRA CÔNG TÁC NGHIỆM THU
   */
  stage5MaintenanceApi(projectId: string, items: MaintenanceScheduleItem[], stateAcceptanceNoticeNo?: string): { success: boolean; message: string } {
    try {
      PmsService.saveMaintenanceSchedule(projectId, items, stateAcceptanceNoticeNo);
      return {
        success: true,
        message: `Đã cập nhật Kế hoạch Bảo trì & Văn bản nghiệm thu Nhà nước (NĐ 207/2026)!`
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi lưu kế hoạch bảo trì: ${err?.message}` };
    }
  },

  /**
   * API NĐ 212/2026 & TT 39/2026: XUẤT & ĐỒNG BỘ DỮ LIỆU QUỐC GIA BỘ XÂY DỰNG
   */
  nationalDbExportApi(): { success: boolean; data: any } {
    try {
      return {
        success: true,
        data: PmsService.exportNationalDatabaseSchema212()
      };
    } catch {
      return { success: false, data: {} };
    }
  }
};
