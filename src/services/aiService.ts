import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ContractData {
  contractNumber: string;
  tenHopDong: string;
  date: string;
  value: number;
  contractor: string;
  thoi_han_hd: number; // Thời hạn thực hiện hợp đồng (số ngày)
  taxCode?: string;
  address?: string;
  representative?: string;
}

export const extractContractData = async (base64Data: string, mimeType: string): Promise<ContractData> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Extract contract information from this document. Return JSON with fields:
- contractNumber: Số hợp đồng
- tenHopDong: Tên/nội dung chính của hợp đồng (dòng chữ sau 'HỢP ĐỒNG KINH TẾ' hoặc tiêu đề hợp đồng)
- date: Ngày ký hợp đồng (format YYYY-MM-DD)
- value: Giá trị hợp đồng (số, đơn vị VNĐ)
- contractor: Tên đơn vị/nhà thầu thực hiện
- taxCode: Mã số thuế của đơn vị/nhà thầu
- address: Địa chỉ của đơn vị/nhà thầu
- representative: Người đại diện của đơn vị/nhà thầu
- thoi_han_hd: Thời hạn thực hiện hợp đồng tính bằng số NGÀY (tìm các cụm từ như "thời hạn 30 ngày", "60 ngày kể từ ngày ký", "thực hiện trong vòng 45 ngày"... Trả về 0 nếu không tìm thấy).`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contractNumber: { type: Type.STRING },
          tenHopDong: { type: Type.STRING },
          date: { type: Type.STRING },
          value: { type: Type.NUMBER },
          contractor: { type: Type.STRING },
          taxCode: { type: Type.STRING },
          address: { type: Type.STRING },
          representative: { type: Type.STRING },
          thoi_han_hd: { type: Type.NUMBER },
        },
        required: ["contractNumber", "tenHopDong", "date", "value", "contractor", "thoi_han_hd"],
      },
    },
  });

  return JSON.parse(response.text);
};


export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  giaTriTruocThue: number;
  tienThue: number;
  giaTriSauThue: number;
  sellerName: string;
  taxCode?: string;
  address?: string;
}

export const extractInvoiceData = async (base64Data: string, mimeType: string): Promise<InvoiceData> => {
  // For "Clean" PDFs/XMLs, we'd ideally use a parser, but for this demo 
  // we'll use Gemini as a fallback or if it's a scan.
  // The user requested a fast parser for clean files, but in a web environment, 
  // Gemini is often easier to implement for both.
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract invoice information. Return JSON with fields: invoiceNumber, date (YYYY-MM-DD), giaTriTruocThue (number), tienThue (number), giaTriSauThue (number), sellerName (the company name that issued the invoice), taxCode (Mã số thuế của bên bán), address (Địa chỉ của bên bán).",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          invoiceNumber: { type: Type.STRING },
          date: { type: Type.STRING },
          giaTriTruocThue: { type: Type.NUMBER },
          tienThue: { type: Type.NUMBER },
          giaTriSauThue: { type: Type.NUMBER },
          sellerName: { type: Type.STRING },
          taxCode: { type: Type.STRING },
          address: { type: Type.STRING },
        },
        required: ["invoiceNumber", "date", "giaTriTruocThue", "tienThue", "giaTriSauThue", "sellerName"],
      },
    },
  });

  return JSON.parse(response.text);
};
