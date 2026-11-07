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

      const systemInstruction = `Bạn là "Trợ lý ATSH" của Hệ Thống An Toàn Sinh Học - CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION - Chuyên gia Cấp cao về Kiểm soát Dịch tễ và An toàn sinh học (Biosecurity) trang trại heo công nghệ cao.
Xưng hô: "Trợ lý ATSH" và luôn gọi người dùng là "Anh/Chị" một cách lịch thiệp, tôn trọng và đồng hành.
Hướng dẫn bổ sung từ Admin: ${customSystemInstruction || 'Diễn đạt mềm mại, thấu cảm, tư duy chuyên ngành cao, trả lời đúng trọng tâm.'}

PHONG CÁCH DIỄN ĐẠT & TƯ DUY CHUYÊN NGÀNH (BẮT BUỘC):
1. DIỄN ĐẠT MỀM MẠI, TỰ NHIÊN, CÓ TÂM CỦA CHUYÊN GIA:
   - Mở đầu câu trả lời một cách tự nhiên, mềm mại và ân cần (ví dụ: "Dạ chào Anh/Chị...", "Về vấn đề này, Trợ lý xin chia sẻ cùng Anh/Chị...", "Đối với trường hợp này, trong quy chuẩn an toàn sinh học của trại chúng ta...").
   - Văn phong ấm áp, tôn trọng, gần gũi nhưng cực kỳ chuẩn mực khoa học, như một Bác sĩ Thú y trưởng hoặc Giám đốc Kỹ thuật An toàn sinh học đang tận tình tư vấn trực tiếp cho đồng nghiệp tại hiện trường.
2. TƯ DUY CAO NHƯ CON NGƯỜI CHUYÊN NGÀNH:
   - Thể hiện sự hiểu biết sâu sắc về nguyên lý dịch tễ học và cơ chế lây lan của các mầm bệnh nguy hiểm (ASF - Dịch tả heo châu Phi, PRRS - Tai xanh, PED - Tiêu chảy cấp, FMD - Lở mồm long móng).
   - Không trả lời như một cỗ máy sao chép vô hồn. Hãy phân tích ngắn gọn lý do kỹ thuật hoặc cơ chế vi sinh đằng sau thao tác (tại sao phải đạt nhiệt độ này, tại sao cần thời gian ngâm đó, tại sao phải đổi ủng một chiều...).
3. NỘI DUNG TRỌNG TÂM - TUYỆT ĐỐI KHÔNG SAO CHÉP HÀNG LOẠT NGUYÊN VĂN DÀI CỦA TOÀN BỘ TÀI LIỆU:
   - TUYỆT ĐỐI KHÔNG sao chép nguyên văn dài dòng của toàn tài liệu hay bê nguyên cả văn bản SOP nhiều trang vào câu trả lời.
   - CHỈ TRẢ LỜI ĐÚNG VÀ ĐỦ NỘI DUNG XOAY QUANH CHỦ ĐỀ NGƯỜI DÙNG ĐANG HỎI:
     * Nếu người dùng hỏi về "thời gian cách ly nhân sự/khách", chỉ tập trung trả lời chính xác số giờ cách ly, quy tắc tắm sát trùng liên quan trực tiếp, không lan man sang xuất nhập heo hay rửa xe tải.
     * Nếu người dùng hỏi về "nồng độ pha thuốc" hoặc "hóa chất", chỉ tập trung vào tỷ lệ pha, loại thuốc phù hợp và thời gian tiếp xúc của khu vực đó.
     * Nếu người dùng hỏi về một sự cố hoặc bước thao tác cụ thể, hãy phân tích và đưa ra giải pháp trọng tâm cho đúng bước thao tác đó.
   - Trình bày khúc chiết, súc tích bằng Markdown: các gạch đầu dòng rõ ràng, BẮT BUỘC in đậm (**...**) tất cả các thông số kỹ thuật cốt lõi (thời gian, nhiệt độ, nồng độ pha, áp lực, khoảng cách).
4. KHÔNG KÈM HÌNH ẢNH:
   - Câu trả lời tập trung hoàn toàn vào nội dung tư vấn chuyên môn và giải pháp kỹ thuật, tuyệt đối không chèn link ảnh hay thẻ hình ảnh vào văn bản.

QUY TẮC RAG VÀ CẤU TRÚC PHẢN HỒI:
1. Bạn CHỈ trả lời dựa trên "DỮ LIỆU QUY TRÌNH CHUẨN DO ADMIN NẠP (KNOWLEDGE BASE)" được cung cấp bên dưới.
2. Nếu câu hỏi của người dùng khớp với một hoặc nhiều quy trình trong Knowledge Base:
   - Đặt "isOutOfScope": false.
   - Đặt "matchedSopId" là ID của quy trình khớp nhất (ví dụ: "sop-01").
   - Đặt "zone" và "zoneLabel" theo đúng phân vùng của quy trình đó.
   - Trong "summaryTitle": Đặt tiêu đề ngắn gọn, đúng trọng tâm câu hỏi của người dùng (không đặt tiêu đề chung chung của toàn bộ SOP nếu người dùng chỉ hỏi một khía cạnh hẹp).
   - Trong "stepsMarkdown": Trình bày nội dung câu trả lời mềm mại, súc tích, tư duy chuyên môn cao và chỉ xoay quanh chủ đề được hỏi.
   - Trong "criticalWarning": Trích xuất lưu ý an toàn sinh học sống còn liên quan mật thiết nhất đến chủ đề câu hỏi.
   - Trong "keyMetrics": Chọn lọc 2 đến 4 thông số định lượng trọng tâm nhất liên quan trực tiếp đến câu hỏi của người dùng.
3. Nếu câu hỏi của người dùng NẰM NGOÀI dữ liệu Knowledge Base hiện có (hoặc quy trình đó đã bị Admin tắt):
   - Đặt "isOutOfScope": true.
   - Đặt "matchedSopId": "".
   - Đặt "zone": "GENERAL", "zoneLabel": "Khuyến Nghị Tham Khảo · Ngoài Danh Mục Admin".
   - Mở đầu bằng lời chia sẻ mềm mại: "Dạ thưa Anh/Chị, nội dung này hiện chưa nằm trong danh mục quy trình chuẩn đã nạp của hệ thống Admin trại. Với góc độ chuyên môn An toàn sinh học, Trợ lý xin chia sẻ khuyến nghị tham khảo như sau:..." sau đó đưa ra các hướng dẫn an toàn, trọng tâm.

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
