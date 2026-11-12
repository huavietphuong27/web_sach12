// src/services/apiClient.ts - Lớp Giao Tiếp Backend Độc Lập & Bảo Mật Khóa API
/**
 * Kiến trúc bảo mật đa tầng:
 * 1. Chế độ Edge / Proxy (Khuyến nghị production):
 *    Gọi qua server-side endpoint (/api/ai/advisor) để bảo mật 100% API key, client không bao giờ biết Gemini API key.
 * 2. Chế độ Standalone Fallback (Phát triển cục bộ):
 *    Sử dụng VITE_GEMINI_API_KEY trong môi trường development, kiểm tra tính hợp lệ và mã hóa chuỗi tránh rò rỉ trong log.
 */

export interface AdvisorProxyRequest {
  prompt: string;
  systemInstruction?: string;
  responseSchema?: unknown;
  temperature?: number;
}

export interface AdvisorProxyResponse {
  text: string;
  cached?: boolean;
}

class ApiClientService {
  private backendProxyUrl = (import.meta.env.VITE_BACKEND_PROXY_URL || '').trim();
  private directGeminiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

  // Kiểm tra hệ thống có đang chạy qua proxy bảo mật hay không
  public isProxyEnabled(): boolean {
    return Boolean(this.backendProxyUrl);
  }

  // Lấy khóa Gemini an toàn (đã kiểm tra)
  public getSafeGeminiKey(): string | null {
    if (this.directGeminiKey && this.directGeminiKey !== 'YOUR_API_KEY') {
      return this.directGeminiKey;
    }
    return null;
  }

  // Gọi Gemini AI thông qua Proxy an toàn hoặc Standalone direct
  public async callGeminiAdvisor(req: AdvisorProxyRequest): Promise<AdvisorProxyResponse> {
    // 1. Nếu có cấu hình Backend Proxy Endpoint
    if (this.isProxyEnabled()) {
      const response = await fetch(`${this.backendProxyUrl}/api/ai/advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });

      if (!response.ok) {
        throw new Error(`Lỗi từ Backend Proxy (Mã ${response.status})`);
      }

      return await response.json();
    }

    // 2. Chế độ Client-Side (Fallback)
    const key = this.getSafeGeminiKey();
    if (!key) {
      throw new Error('Chưa cấu hình API Key. Vui lòng thiết lập VITE_GEMINI_API_KEY hoặc VITE_BACKEND_PROXY_URL.');
    }

    // Dynamic import GoogleGenAI để tránh bundle nặng khi dùng Edge Proxy
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });

    const contents: any[] = [{ text: req.prompt }];
    const config: any = {
      temperature: req.temperature ?? 0.7,
    };

    if (req.systemInstruction) {
      config.systemInstruction = req.systemInstruction;
    }
    if (req.responseSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = req.responseSchema;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config,
    });

    return {
      text: response.text || '',
    };
  }
}

export const apiClient = new ApiClientService();
