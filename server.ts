import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface SopDocument {
  id: string;
  code: string;
  title: string;
  zone: 'RED' | 'YELLOW' | 'GREEN' | 'RED_YELLOW' | 'GENERAL';
  zoneLabel: string;
  tags: string[];
  imageUrl: string;
  summary: string;
  content: string;
  criticalWarning: string;
  keyMetrics: { label: string; value: string; unit: string }[];
  active: boolean;
  updatedAt: string;
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
      const { question, activeSops = [], customSystemInstruction = '' } = req.body as {
        question: string;
        activeSops: SopDocument[];
        customSystemInstruction?: string;
      };

      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Vui lòng nhập câu hỏi tra cứu quy trình An toàn sinh học.' });
        return;
      }

      const ai = getGenAIClient();

      const knowledgeBaseText = activeSops
        .filter((s) => s.active)
        .map(
          (sop, idx) =>
            `--- QUY TRÌNH #${idx + 1} [ID: ${sop.id}] [MÃ: ${sop.code}] ---
Tiêu đề: ${sop.title}
Phân vùng ATSH: ${sop.zone} (${sop.zoneLabel})
Từ khóa nhận diện: ${sop.tags.join(', ')}
Tóm tắt: ${sop.summary}
Thông số kỹ thuật chính: ${sop.keyMetrics.map((m) => `${m.label}: ${m.value} ${m.unit}`).join(' | ')}
Cảnh báo sống còn: ${sop.criticalWarning}
Nội dung quy trình chi tiết:
${sop.content}
`
        )
        .join('\n\n');

      const systemInstruction = `Bạn là "Trợ lý ATSH" của Hệ Thống An Toàn Sinh Học - CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION - Chuyên gia Kiểm soát An toàn sinh học (Biosecurity) trại heo công nghệ cao.
Xưng hô: "Trợ lý ATSH" và gọi người dùng là "Anh/Chị".
Hướng dẫn bổ sung từ Admin: ${customSystemInstruction || 'Giọng điệu nghiêm túc, chuẩn mực, chính xác tuyệt đối các thông số kỹ thuật.'}

QUY TẮC SỐNG CÒN (RAG LOGIC):
1. Bạn CHỈ trả lời dựa trên "DỮ LIỆU QUY TRÌNH CHUẨN DO ADMIN NẠP (KNOWLEDGE BASE)" được cung cấp bên dưới.
2. Nếu câu hỏi của người dùng khớp với một hoặc nhiều quy trình trong Knowledge Base:
   - Đặt "isOutOfScope": false.
   - Đặt "matchedSopId" là ID chính xác của quy trình có độ tương đồng cao nhất (ví dụ: "sop-01").
   - Đặt "zone" và "zoneLabel" theo đúng phân vùng của quy trình đó.
   - Trong "stepsMarkdown": Trình bày các bước thực hiện chuẩn (Step-by-step) bằng danh sách đánh số hoặc gạch đầu dòng Markdown rõ ràng. BẮT BUỘC in đậm (**...**) tất cả các thông số kỹ thuật quan trọng (thời gian, nhiệt độ, nồng độ pha thuốc, áp lực nước, khoảng cách, số lần).
   - Trong "criticalWarning": Trích xuất hoặc tổng hợp Cảnh báo rủi ro (Lưu ý sống còn) nghiêm ngặt nhất của quy trình.
   - Trong "keyMetrics": Liệt kê 3 đến 4 thông số định lượng quan trọng nhất từ quy trình (label, value, unit).
3. Nếu câu hỏi của người dùng NẰM NGOÀI dữ liệu Knowledge Base hiện có (hoặc quy trình đó đã bị Admin tắt):
   - Đặt "isOutOfScope": true.
   - Đặt "matchedSopId": "".
   - Đặt "zone": "GENERAL", "zoneLabel": "Khuyến Nghị Tham Khảo · Ngoài Danh Mục Admin".
   - Mở đầu "stepsMarkdown" bằng câu cảnh báo nguyên văn: "⚠️ **Thông tin này chưa có trong quy định chuẩn của hệ thống Admin. Dưới đây là khuyến nghị tham khảo theo tiêu chuẩn An toàn sinh học trại heo công nghệ cao:**" sau đó mới đưa ra hướng dẫn tham khảo an toàn.

DỮ LIỆU QUY TRÌNH CHUẨN DO ADMIN NẠP (KNOWLEDGE BASE HIỆN TẠI - ${activeSops.filter((s) => s.active).length} QUY TRÌNH ACTIVE):
${knowledgeBaseText || '(Hiện chưa có quy trình nào đang Active trong hệ thống Admin)'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Câu hỏi của nhân sự trại: "${question}"`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedSopId: {
                type: Type.STRING,
                description: 'ID của quy trình SOP khớp nhất trong Knowledge Base, hoặc chuỗi rỗng nếu nằm ngoài dữ liệu.',
              },
              isOutOfScope: {
                type: Type.BOOLEAN,
                description: 'True nếu câu hỏi nằm ngoài dữ liệu quy trình chuẩn do Admin nạp.',
              },
              zone: {
                type: Type.STRING,
                description: 'Mã phân vùng: RED, YELLOW, GREEN, RED_YELLOW, hoặc GENERAL.',
              },
              zoneLabel: {
                type: Type.STRING,
                description: 'Tên hiển thị phân vùng áp dụng.',
              },
              summaryTitle: {
                type: Type.STRING,
                description: 'Tiêu đề tóm tắt ngắn gọn cho câu trả lời.',
              },
              stepsMarkdown: {
                type: Type.STRING,
                description: 'Nội dung các bước thực hiện chuẩn định dạng Markdown, in đậm các thông số kỹ thuật quan trọng.',
              },
              criticalWarning: {
                type: Type.STRING,
                description: 'Cảnh báo rủi ro (Lưu ý sống còn) cần đặc biệt tuân thủ.',
              },
              keyMetrics: {
                type: Type.ARRAY,
                description: '3-4 thông số kỹ thuật định lượng quan trọng nhất.',
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
