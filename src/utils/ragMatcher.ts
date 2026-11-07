import { BioZone, ChatResponsePayload, SopDocument } from '../types/biosecurity';
import { IMG_LAB_TESTING } from '../data/seedSops';

function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findBestMatchingSop(
  question: string,
  activeSops: SopDocument[]
): { sop: SopDocument | undefined; score: number } {
  const enabledSops = activeSops.filter((s) => s.active);
  if (enabledSops.length === 0) return { sop: undefined, score: 0 };

  const qNorm = normalizeVietnamese(question);
  const qLower = question.toLowerCase();
  const qTokens = qNorm.split(' ').filter((w) => w.length > 2);

  let bestSop: SopDocument | undefined;
  let bestScore = 0;

  for (const sop of enabledSops) {
    let score = 0;
    const titleNorm = normalizeVietnamese(sop.title);
    const summaryNorm = normalizeVietnamese(sop.summary);
    const contentNorm = normalizeVietnamese(sop.content);

    for (const tag of sop.tags) {
      const tagNorm = normalizeVietnamese(tag);
      if (qLower.includes(tag.toLowerCase()) || qNorm.includes(tagNorm)) {
        score += 18;
      }
    }

    for (const token of qTokens) {
      if (titleNorm.includes(token)) score += 6;
      if (summaryNorm.includes(token)) score += 3;
      if (contentNorm.includes(token)) score += 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestSop = sop;
    }
  }

  return { sop: bestSop, score: bestScore };
}

export function buildLocalRagFallback(
  question: string,
  activeSops: SopDocument[]
): { payload: ChatResponsePayload; matchedSop?: SopDocument } {
  const { sop, score } = findBestMatchingSop(question, activeSops);

  if (sop && score >= 12) {
    return {
      matchedSop: sop,
      payload: {
        matchedSopId: sop.id,
        isOutOfScope: false,
        zone: sop.zone,
        zoneLabel: sop.zoneLabel,
        summaryTitle: sop.title,
        stepsMarkdown: `Chào Anh/Chị, **Trợ lý ATSH** trích xuất quy trình chuẩn **[${sop.code}]** từ hệ thống dữ liệu Admin như sau:\n\n${sop.content}`,
        criticalWarning: sop.criticalWarning,
        keyMetrics: sop.keyMetrics,
      },
    };
  }

  return {
    matchedSop: undefined,
    payload: {
      matchedSopId: '',
      isOutOfScope: true,
      zone: 'GENERAL',
      zoneLabel: 'Khuyến Nghị Tham Khảo · Ngoài Danh Mục Admin',
      summaryTitle: 'Khuyến nghị An toàn sinh học tham khảo ngoài danh mục chuẩn',
      stepsMarkdown: `⚠️ **Thông tin này chưa có trong quy định chuẩn của hệ thống Admin. Dưới đây là khuyến nghị tham khảo theo tiêu chuẩn An toàn sinh học trại heo công nghệ cao:**\n\n1. **Nguyên tắc phân vùng:** Mọi hoạt động phát sinh chưa có trong danh mục SOP phải được thực hiện tại khu vực đệm (**Vùng Vàng**) hoặc ngoại vi (**Vùng Đỏ**), tuyệt đối không đưa trực tiếp vào **Vùng Xanh**.\n2. **Báo cáo phê duyệt:** Vui lòng liên hệ **Cán bộ Quản lý ATSH / Bác sĩ Thú y trưởng** để lập biên bản đánh giá rủi ro mầm bệnh (**ASF, PRRS, PED**) và cập nhật quy trình mới vào Cổng Admin.\n3. **Khử khuẩn dự phòng:** Áp dụng sát trùng bề mặt bằng **Virkon S nồng độ 1:100 (1%)** với thời gian tiếp xúc tối thiểu **30 phút**.`,
      criticalWarning:
        'Nội dung câu hỏi nằm ngoài các quy trình đang Active trong Knowledge Base của Admin. Tuyệt đối không tự ý thực hiện thao tác vượt rào cản sinh học khi chưa có lệnh phê duyệt.',
      keyMetrics: [
        { label: 'Nồng độ Virkon dự phòng', value: '1:100', unit: 'tỷ lệ' },
        { label: 'Thời gian tiếp xúc', value: '≥ 30', unit: 'phút' },
        { label: 'Trạng thái SOP', value: 'Chưa nạp', unit: 'Admin KB' },
      ],
    },
  };
}

export function parseBulkImportFile(
  fileName: string,
  rawText: string
): SopDocument[] {
  const lowerName = fileName.toLowerCase();
  const nowIso = new Date().toISOString();

  if (lowerName.endsWith('.json')) {
    const parsed = JSON.parse(rawText);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr
      .filter((item) => item && typeof item.title === 'string')
      .map((item, idx) => ({
        id: item.id || `sop-import-${Date.now()}-${idx}`,
        code: item.code || `SOP-IMP-${String(idx + 1).padStart(3, '0')}`,
        title: String(item.title).trim(),
        zone: (['RED', 'YELLOW', 'GREEN', 'RED_YELLOW', 'GENERAL'].includes(item.zone)
          ? item.zone
          : 'YELLOW') as BioZone,
        zoneLabel:
          item.zoneLabel ||
          getZoneDisplayLabel(
            (['RED', 'YELLOW', 'GREEN', 'RED_YELLOW', 'GENERAL'].includes(item.zone)
              ? item.zone
              : 'YELLOW') as BioZone
          ),
        tags: Array.isArray(item.tags)
          ? item.tags.map(String)
          : typeof item.tags === 'string'
          ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : ['atsh', 'quy trình'],
        imageUrl: item.imageUrl || IMG_LAB_TESTING,
        summary: item.summary || String(item.content || '').slice(0, 160) + '...',
        content: String(item.content || item.summary || ''),
        criticalWarning:
          item.criticalWarning ||
          'Tuân thủ nghiêm ngặt quy định phân vùng 1 chiều và thông số kỹ thuật đã ban hành.',
        keyMetrics: Array.isArray(item.keyMetrics) && item.keyMetrics.length > 0
          ? item.keyMetrics
          : [
              { label: 'Thời gian sát trùng', value: '≥ 30', unit: 'phút' },
              { label: 'Kiểm soát', value: '100', unit: '%' },
            ],
        active: item.active !== undefined ? Boolean(item.active) : true,
        updatedAt: item.updatedAt || nowIso,
      }));
  }

  if (lowerName.endsWith('.csv')) {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];

    // Expect CSV columns: title,zone,tags,summary,content,criticalWarning,imageUrl
    return lines.slice(1).map((line, idx) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const title = cols[0] || `Quy trình ATSH nhập từ CSV #${idx + 1}`;
      const rawZone = (cols[1] || 'YELLOW').toUpperCase();
      const zone: BioZone = (
        ['RED', 'YELLOW', 'GREEN', 'RED_YELLOW', 'GENERAL'].includes(rawZone) ? rawZone : 'YELLOW'
      ) as BioZone;
      const tags = (cols[2] || 'atsh, quy trình')
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean);
      const summary = cols[3] || `Quy trình chuẩn áp dụng tại ${getZoneDisplayLabel(zone)}.`;
      const content = cols[4] || summary;
      const criticalWarning =
        cols[5] || 'Tuân thủ tuyệt đối nguyên tắc một chiều và thời gian tiếp xúc thuốc sát trùng.';
      const imageUrl = cols[6] || IMG_LAB_TESTING;

      return {
        id: `sop-csv-${Date.now()}-${idx}`,
        code: `SOP-CSV-${String(idx + 1).padStart(3, '0')}`,
        title,
        zone,
        zoneLabel: getZoneDisplayLabel(zone),
        tags,
        imageUrl,
        summary,
        content,
        criticalWarning,
        keyMetrics: [
          { label: 'Thời gian tiếp xúc', value: '≥ 30', unit: 'phút' },
          { label: 'Kiểm tra đạt chuẩn', value: '100', unit: '%' },
        ],
        active: true,
        updatedAt: nowIso,
      };
    });
  }

  // .TXT format: Either separated by "---" blocks or treated as a single detailed SOP
  const blocks = rawText
    .split(/\n---+\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block, idx) => {
    const lines = block.split(/\r?\n/).filter(Boolean);
    const firstLine = lines[0]?.replace(/^#+\s*/, '').trim() || `Quy trình ATSH từ file TXT #${idx + 1}`;
    const bodyText = lines.slice(1).join('\n').trim() || block;

    return {
      id: `sop-txt-${Date.now()}-${idx}`,
      code: `SOP-TXT-${String(idx + 1).padStart(3, '0')}`,
      title: firstLine,
      zone: 'YELLOW',
      zoneLabel: getZoneDisplayLabel('YELLOW'),
      tags: ['tài liệu txt', 'quy trình nạp nhanh', 'atsh'],
      imageUrl: IMG_LAB_TESTING,
      summary: bodyText.slice(0, 150).replace(/\n/g, ' ') + '...',
      content: bodyText,
      criticalWarning:
        'Thực hiện đúng trình tự các bước và định lượng hóa chất sát trùng trong tài liệu gốc.',
      keyMetrics: [
        { label: 'Thời gian xử lý', value: '≥ 30', unit: 'phút' },
        { label: 'Mức độ tuân thủ', value: '100', unit: '%' },
      ],
      active: true,
      updatedAt: nowIso,
    };
  });
}

export function getZoneDisplayLabel(zone: BioZone): string {
  switch (zone) {
    case 'RED':
      return 'Vùng Đỏ · Ngoại Vi & Trạm Rửa Xe';
    case 'YELLOW':
      return 'Vùng Vàng · Vùng Đệm & Khử Khuẩn';
    case 'RED_YELLOW':
      return 'Vùng Đỏ - Vàng · Cầu Trung Chuyển';
    case 'GREEN':
      return 'Vùng Xanh · Khu Sản Xuất & Chuồng Nuôi';
    case 'GENERAL':
    default:
      return 'Quy Định Chung · Toàn Hệ Thống Trại';
  }
}

export function getZoneSemanticStyle(zone: BioZone): {
  glyph: string;
  textColor: string;
  borderColor: string;
  surfaceBg: string;
  badgeClass: string;
  shortTag: string;
} {
  switch (zone) {
    case 'RED':
      return {
        glyph: '●',
        textColor: 'text-rose-300',
        borderColor: 'border-rose-500/30',
        surfaceBg: 'bg-rose-500/10',
        badgeClass:
          'bg-rose-500/10 border border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
        shortTag: 'VÙNG ĐỎ · RỦI RO CAO',
      };
    case 'YELLOW':
      return {
        glyph: '▲',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-500/30',
        surfaceBg: 'bg-amber-500/10',
        badgeClass:
          'bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.12)]',
        shortTag: 'VÙNG VÀNG · RỦI RO',
      };
    case 'RED_YELLOW':
      return {
        glyph: '◆',
        textColor: 'text-amber-300',
        borderColor: 'border-rose-500/30',
        surfaceBg: 'bg-gradient-to-r from-rose-500/10 to-amber-500/10',
        badgeClass:
          'bg-gradient-to-r from-rose-500/15 to-amber-500/15 border border-rose-500/30 text-amber-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
        shortTag: 'VÙNG ĐỎ - VÀNG · TRUNG CHUYỂN',
      };
    case 'GREEN':
      return {
        glyph: '■',
        textColor: 'text-emerald-300',
        borderColor: 'border-emerald-500/30',
        surfaceBg: 'bg-emerald-500/10',
        badgeClass:
          'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        shortTag: 'VÙNG XANH · AN TOÀN',
      };
    case 'GENERAL':
    default:
      return {
        glyph: '◈',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-500/30',
        surfaceBg: 'bg-cyan-500/10',
        badgeClass:
          'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
        shortTag: 'QUY ĐỊNH CHUNG · ATSH',
      };
  }
}
