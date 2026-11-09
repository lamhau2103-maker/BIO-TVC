import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface SopInputDocument {
  id: string;
  title: string;
  species?: 'ga' | 'heo';
  area?: string;
  zone_type?: 'xanh' | 'vang' | 'do' | string;
  disinfect_min?: number | null;
  dilution?: string | null;
  content: string;
  warning?: string | null;
  active?: boolean;
}

function getZoneDisplayLabel(zoneType?: string): string {
  switch (zoneType) {
    case 'do':
      return 'Vùng Đỏ (nguy hiểm)';
    case 'vang':
      return 'Vùng Vàng (rủi ro)';
    case 'xanh':
    default:
      return 'Vùng Xanh (an toàn)';
  }
}

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.post('/api/biosecurity/ask', async (req, res) => {
    try {
      const {
        question,
        species = 'heo',
        activeSops = [],
        customSystemInstruction = '',
      } = req.body as {
        question: string;
        species?: 'ga' | 'heo';
        activeSops: SopInputDocument[];
        customSystemInstruction?: string;
      };

      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Vui lòng nhập câu hỏi tra cứu quy trình An toàn sinh học.' });
        return;
      }

      const speciesText = species === 'ga' ? 'GÀ' : 'HEO';
      const speciesShort = species === 'ga' ? 'gà' : 'heo';

      const ai = getGenAIClient();

      const knowledgeBaseText = activeSops
        .map((sop, idx) => {
          const areaText = sop.area || 'Khu vực chung';
          const zoneLabel = getZoneDisplayLabel(sop.zone_type);
          const hasDisinfect =
            sop.disinfect_min !== null &&
            sop.disinfect_min !== undefined &&
            Number(sop.disinfect_min) > 0;
          const hasDilution = Boolean(sop.dilution && String(sop.dilution).trim() !== '');
          const hasWarning = Boolean(sop.warning && String(sop.warning).trim() !== '');

          const lines: string[] = [
            `--- QUY TRÌNH #${idx + 1} [ID: ${sop.id}] ---`,
            `Tiêu đề: ${sop.title}`,
            `Khu vực: ${areaText}`,
            `Vùng: ${zoneLabel}`,
          ];

          if (hasDisinfect) {
            lines.push(`Thời gian sát trùng: ≥ ${sop.disinfect_min} phút`);
          }
          if (hasDilution) {
            lines.push(`Nồng độ pha thuốc: ${String(sop.dilution).trim()}`);
          }

          lines.push(`Nội dung:\n${sop.content}`);

          if (hasWarning) {
            lines.push(`Lưu ý cảnh báo: ${String(sop.warning).trim()}`);
          }

          return lines.join('\n');
        })
        .join('\n\n');

      const systemInstruction = `Bạn là "Trợ lý ATSH" của Hệ Thống An Toàn Sinh Học - CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION - Chuyên gia Cấp cao về Kiểm soát Dịch tễ và An toàn sinh học (Biosecurity) trang trại ${speciesText}.
Xưng hô: "Trợ lý ATSH" và luôn gọi người dùng là "Anh/Chị" một cách lịch thiệp, tôn trọng và đồng hành.
${customSystemInstruction ? `Hướng dẫn bổ sung: ${customSystemInstruction}` : ''}

QUY TẮC RAG VÀ TÁCH BIỆT DỮ LIỆU [BẮT BUỘC]:
1. Chỉ trả lời dựa trên các quy trình [${speciesText}] bên dưới. Nếu không có thông tin, trả lời: "Chưa có quy trình này trong hệ thống ${speciesShort}, vui lòng liên hệ bộ phận Bio." Không bịa đặt, không suy diễn ngoài tài liệu.
2. Chỉ nhắc các thông số khi quy trình có ghi, không tự suy đoán. Nêu rõ khu vực và vùng áp dụng.
3. Nếu không có thông tin khớp trong danh sách quy trình ${speciesShort} bên dưới:
   - Đặt "isOutOfScope": true.
   - Đặt "matchedSopId": "" và "source_ids": [].
   - Đặt "stepsMarkdown": "Chưa có quy trình này trong hệ thống ${speciesShort}, vui lòng liên hệ bộ phận Bio."
   - Đặt "criticalWarning": "" (chuỗi rỗng).
   - Đặt "keyMetrics": [] (mảng rỗng).
4. Nếu có thông tin khớp trong danh sách quy trình ${speciesShort}:
   - Đặt "isOutOfScope": false.
   - Đặt "matchedSopId" là ID của quy trình chính khớp nhất, và đặt "source_ids" là mảng chứa ID của quy trình nguồn được sử dụng.
   - Ghi rõ tên quy trình ("sourceSopTitle") và khu vực kèm vùng ("sourceZone").
   - CHỈ TRẢ LỜI ĐÚNG VÀ ĐỦ NỘI DUNG XOAY QUANH CHỦ ĐỀ NGƯỜI DÙNG ĐANG HỎI, diễn đạt mềm mại, tư duy cao như chuyên gia chuyên ngành, nội dung trọng tâm. Không sao chép hàng loạt nguyên văn dài của toàn tài liệu.
5. KHÔNG KÈM HÌNH ẢNH trong nội dung trả lời.

DỮ LIỆU QUY TRÌNH [${speciesText}] HIỆN TẠI (${activeSops.length} QUY TRÌNH):
${knowledgeBaseText || `(Hiện chưa có quy trình nào cho ${speciesShort} trong hệ thống)`}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Câu hỏi của nhân sự trang trại ${speciesShort}: "${question}"`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedSopId: {
                type: Type.STRING,
                description: 'ID của quy trình SOP khớp nhất, hoặc chuỗi rỗng nếu không có.',
              },
              source_ids: {
                type: Type.ARRAY,
                description: 'Mảng ID của các quy trình SOP nguồn được dùng để trả lời.',
                items: { type: Type.STRING },
              },
              sourceSopTitle: {
                type: Type.STRING,
                description: 'Tên quy trình SOP được dùng làm nguồn tham chiếu.',
              },
              sourceZone: {
                type: Type.STRING,
                description: 'Khu vực và vùng áp dụng.',
              },
              isOutOfScope: {
                type: Type.BOOLEAN,
                description: 'True nếu câu hỏi nằm ngoài dữ liệu quy trình chuẩn do Admin nạp.',
              },
              zone: {
                type: Type.STRING,
                description: 'Mã phân vùng: RED (Vùng Đỏ), YELLOW (Vùng Vàng), GREEN (Vùng Xanh), hoặc GENERAL.',
              },
              zoneLabel: {
                type: Type.STRING,
                description: 'Khu vực và tên vùng hiển thị.',
              },
              summaryTitle: {
                type: Type.STRING,
                description: 'Tiêu đề tóm tắt ngắn gọn cho câu trả lời.',
              },
              stepsMarkdown: {
                type: Type.STRING,
                description: 'Nội dung trả lời trọng tâm, mềm mại, chuẩn mực định dạng Markdown.',
              },
              criticalWarning: {
                type: Type.STRING,
                description: 'Lưu ý cảnh báo nếu quy trình có ghi, hoặc chuỗi rỗng nếu quy trình không có.',
              },
              keyMetrics: {
                type: Type.ARRAY,
                description: 'Mảng rỗng hoặc thông số định lượng.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                  },
                  required: ['label', 'value', 'unit'],
                },
              },
            },
            required: [
              'matchedSopId',
              'source_ids',
              'sourceSopTitle',
              'sourceZone',
              'isOutOfScope',
              'zone',
              'zoneLabel',
              'summaryTitle',
              'stepsMarkdown',
              'criticalWarning',
              'keyMetrics',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Gemini API Error:', errMessage);
      res.status(500).json({
        error: errMessage || 'Không thể kết nối đến bộ máy AI. Vui lòng kiểm tra cấu hình hoặc thử lại.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BIO-SHIELD AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
