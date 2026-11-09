import { BioZone, ChatResponsePayload, SopDocument, SpeciesType, ZoneType } from '../types/biosecurity';

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

export function normalizeZoneTypeValue(raw: unknown): ZoneType | '' {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim().toLowerCase();
  if (!str) return '';

  const noAccent = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

  if (noAccent === 'do_vang' || noAccent.includes('do - vang') || noAccent.includes('do_vang')) {
    return 'do';
  }
  if (noAccent === 'xanh' || noAccent.includes('vung xanh') || noAccent === 'green') {
    return 'xanh';
  }
  if (noAccent === 'vang' || noAccent.includes('vung vang') || noAccent === 'yellow') {
    return 'vang';
  }
  if (noAccent === 'do' || noAccent.includes('vung do') || noAccent === 'red') {
    return 'do';
  }
  return '';
}

export function isValidPositiveNumberMax2Decimals(rawStr: string): { valid: boolean; value: number } {
  const cleaned = rawStr.trim().replace(',', '.');
  if (!cleaned) return { valid: false, value: NaN };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { valid: false, value: NaN };
  }
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, value: NaN };
  }
  return { valid: true, value: Number(num.toFixed(2)) };
}

export function normalizeDisinfectMin(raw: unknown): { value: number | null; valid: boolean } {
  if (raw === null || raw === undefined) return { value: null, valid: true };
  const str = String(raw)
    .replace(/≥/g, '')
    .replace(/>=/g, '')
    .replace(/phút/gi, '')
    .replace(/phut/gi, '')
    .trim();
  if (!str) return { value: null, valid: true };

  const check = isValidPositiveNumberMax2Decimals(str);
  if (!check.valid) {
    return { value: -1, valid: false };
  }
  return { value: check.value, valid: true };
}

export function normalizeDilutionValue(
  rawDilution: unknown,
  legacyDrugPct?: unknown,
  legacyWaterPct?: unknown
): { value: string | null; valid: boolean } {
  if (rawDilution !== null && rawDilution !== undefined && String(rawDilution).trim() !== '') {
    const cleaned = String(rawDilution)
      .replace(/tỷ lệ/gi, '')
      .replace(/ty le/gi, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '.');

    const parts = cleaned.split(':');
    if (parts.length !== 2) {
      return { value: 'INVALID', valid: false };
    }
    const left = isValidPositiveNumberMax2Decimals(parts[0]);
    const right = isValidPositiveNumberMax2Decimals(parts[1]);
    if (!left.valid || !right.valid) {
      return { value: 'INVALID', valid: false };
    }
    return { value: `${left.value}:${right.value}`, valid: true };
  }

  // Backward compatibility for old files with drug_pct and water_pct (both > 0)
  if (
    legacyDrugPct !== null &&
    legacyDrugPct !== undefined &&
    String(legacyDrugPct).trim() !== '' &&
    legacyWaterPct !== null &&
    legacyWaterPct !== undefined &&
    String(legacyWaterPct).trim() !== ''
  ) {
    const d = Number(String(legacyDrugPct).trim().replace(',', '.'));
    const w = Number(String(legacyWaterPct).trim().replace(',', '.'));
    if (Number.isFinite(d) && d > 0 && Number.isFinite(w) && w > 0) {
      const ratio = Number((w / d).toFixed(2));
      if (ratio > 0) {
        return { value: `1:${ratio}`, valid: true };
      }
    }
  }

  return { value: null, valid: true };
}

export function zoneTypeToBioZone(zoneType?: ZoneType | string): BioZone {
  switch (zoneType) {
    case 'do':
      return 'RED';
    case 'vang':
      return 'YELLOW';
    case 'xanh':
      return 'GREEN';
    default:
      return 'GENERAL';
  }
}

export function zoneTypeToVietnameseLabel(zoneType?: ZoneType | string): string {
  switch (zoneType) {
    case 'do':
      return 'Vùng Đỏ (nguy hiểm)';
    case 'vang':
      return 'Vùng Vàng (rủi ro)';
    case 'xanh':
      return 'Vùng Xanh (an toàn)';
    default:
      return 'Vùng Xanh (an toàn)';
  }
}

export function findBestMatchingSop(
  question: string,
  activeSops: SopDocument[]
): { sop: SopDocument | undefined; score: number } {
  const enabledSops = activeSops.filter((s) => s.active !== false);
  if (enabledSops.length === 0) return { sop: undefined, score: 0 };

  const qNorm = normalizeVietnamese(question);
  const qTokens = qNorm.split(' ').filter((w) => w.length > 2);

  let bestSop: SopDocument | undefined;
  let bestScore = 0;

  for (const sop of enabledSops) {
    let score = 0;
    const titleNorm = normalizeVietnamese(sop.title || '');
    const areaNorm = normalizeVietnamese(sop.area || '');
    const contentNorm = normalizeVietnamese(sop.content || '');
    const warningNorm = normalizeVietnamese(sop.warning || '');

    for (const token of qTokens) {
      if (titleNorm.includes(token)) score += 8;
      if (areaNorm.includes(token)) score += 6;
      if (warningNorm.includes(token)) score += 3;
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
  activeSops: SopDocument[],
  species: SpeciesType = 'heo'
): { payload: ChatResponsePayload; matchedSop?: SopDocument; sourceSops?: SopDocument[] } {
  const speciesShort = species === 'ga' ? 'gà' : 'heo';
  const { sop, score } = findBestMatchingSop(question, activeSops);

  if (sop && score >= 8) {
    const zoneLabelText = zoneTypeToVietnameseLabel(sop.zone_type);
    const bulletLines: string[] = [
      `* **Khu vực áp dụng:** **${sop.area}**`,
      `* **Phân vùng:** **${zoneLabelText}**`,
    ];

    if (sop.disinfect_min !== null && sop.disinfect_min !== undefined) {
      bulletLines.push(`* **Thời gian sát trùng:** **≥ ${sop.disinfect_min} phút**`);
    }
    if (sop.dilution) {
      bulletLines.push(`* **Nồng độ pha thuốc:** **${sop.dilution}**`);
    }

    return {
      matchedSop: sop,
      sourceSops: [sop],
      payload: {
        matchedSopId: sop.id,
        source_ids: [sop.id],
        sourceSopTitle: sop.title,
        sourceZone: `${sop.area} (${zoneLabelText})`,
        isOutOfScope: false,
        zone: zoneTypeToBioZone(sop.zone_type),
        zoneLabel: `${sop.area} · ${zoneLabelText}`,
        summaryTitle: `Tư vấn trọng tâm: ${sop.title}`,
        stepsMarkdown:
          `Dạ chào Anh/Chị, đối với câu hỏi này, **Trợ lý ATSH** xin chia sẻ nội dung trọng tâm từ quy trình **[${sop.title}]** như sau:\n\n` +
          `${bulletLines.join('\n')}\n\n` +
          `**Nội dung hướng dẫn:**\n${sop.content}`,
        criticalWarning: sop.warning ? sop.warning : '',
        keyMetrics: [],
      },
    };
  }

  return {
    matchedSop: undefined,
    sourceSops: [],
    payload: {
      matchedSopId: '',
      source_ids: [],
      isOutOfScope: true,
      zone: 'GENERAL',
      zoneLabel: 'Ngoài Danh Mục Quy Trình',
      summaryTitle: `Thông báo hệ thống an toàn sinh học ${speciesShort}`,
      stepsMarkdown: `Chưa có quy trình này trong hệ thống ${speciesShort}, vui lòng liên hệ bộ phận Bio.`,
      criticalWarning: '',
      keyMetrics: [],
    },
  };
}

export interface BulkImportItem {
  title: string;
  area: string;
  zone_type: string;
  disinfect_min: number | null;
  dilution: string | null;
  content: string;
  warning: string | null;
}

// Parse RFC-4180 CSV supporting quoted multiline fields and commas
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const text = csvText.replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nextCh = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && nextCh === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.trim() !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function extractLegacyAreaAndZone(item: Record<string, any>): { area: string; zone_type: string } {
  let area = typeof item.area === 'string' ? item.area.trim() : '';
  let zoneRaw = item.zone_type ?? item.zone ?? '';

  // Legacy support for `zones` array
  if (!area && Array.isArray(item.zones) && item.zones.length > 0) {
    const first = item.zones[0];
    if (first && typeof first === 'object') {
      area = String(first.name || first.area || '').trim();
      zoneRaw = first.type || first.zone_type || zoneRaw;
    } else if (typeof first === 'string') {
      const parts = first.split(/[—·|-]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const z0 = normalizeZoneTypeValue(parts[0]);
        const z1 = normalizeZoneTypeValue(parts[parts.length - 1]);
        if (z0) {
          zoneRaw = parts[0];
          area = parts.slice(1).join(' - ');
        } else if (z1) {
          zoneRaw = parts[parts.length - 1];
          area = parts.slice(0, -1).join(' - ');
        } else {
          area = first.trim();
        }
      } else {
        area = first.trim();
      }
    }
  }

  const normalizedZone = normalizeZoneTypeValue(zoneRaw);
  return { area, zone_type: normalizedZone };
}

export function parseBulkImportFile(
  fileName: string,
  rawText: string
): { items: BulkImportItem[]; totalRawCount: number } {
  const lowerName = fileName.toLowerCase();

  // 1. JSON format
  if (lowerName.endsWith('.json')) {
    try {
      const parsed = JSON.parse(rawText);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const totalRawCount = arr.length;

      const items: BulkImportItem[] = arr.map((rawItem) => {
        if (!rawItem || typeof rawItem !== 'object') {
          return {
            title: '',
            area: '',
            zone_type: '',
            disinfect_min: null,
            dilution: null,
            content: '',
            warning: null,
          };
        }
        const title = typeof rawItem.title === 'string' ? rawItem.title.trim() : '';
        const { area, zone_type } = extractLegacyAreaAndZone(rawItem);
        const disinfectNorm = normalizeDisinfectMin(rawItem.disinfect_min);
        const dilutionNorm = normalizeDilutionValue(
          rawItem.dilution,
          rawItem.drug_pct,
          rawItem.water_pct
        );
        const content = typeof rawItem.content === 'string' ? rawItem.content.trim() : '';
        const warningRaw = rawItem.warning ?? rawItem.criticalWarning ?? null;
        const warning =
          warningRaw !== null && warningRaw !== undefined && String(warningRaw).trim() !== ''
            ? String(warningRaw).trim()
            : null;

        return {
          title,
          area,
          zone_type,
          disinfect_min: disinfectNorm.valid ? disinfectNorm.value : -1,
          dilution: dilutionNorm.valid ? dilutionNorm.value : 'INVALID',
          content,
          warning,
        };
      });

      return { items, totalRawCount };
    } catch {
      return { items: [], totalRawCount: 0 };
    }
  }

  // 2. CSV format: header title,area,zone,disinfect_min,dilution,content,warning
  if (lowerName.endsWith('.csv')) {
    const rows = parseCsvRows(rawText);
    if (rows.length < 2) return { items: [], totalRawCount: 0 };

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);
    const totalRawCount = dataRows.length;

    const idxTitle = header.indexOf('title') !== -1 ? header.indexOf('title') : 0;
    const idxArea = header.indexOf('area') !== -1 ? header.indexOf('area') : 1;
    const idxZone =
      header.indexOf('zone') !== -1
        ? header.indexOf('zone')
        : header.indexOf('zone_type') !== -1
        ? header.indexOf('zone_type')
        : 2;
    const idxDisinfect =
      header.indexOf('disinfect_min') !== -1 ? header.indexOf('disinfect_min') : 3;
    const idxDilution =
      header.indexOf('dilution') !== -1 ? header.indexOf('dilution') : 4;
    const idxContent = header.indexOf('content') !== -1 ? header.indexOf('content') : 5;
    const idxWarning = header.indexOf('warning') !== -1 ? header.indexOf('warning') : 6;

    // Optional legacy columns in CSV
    const idxDrug = header.indexOf('drug_pct');
    const idxWater = header.indexOf('water_pct');

    const items: BulkImportItem[] = dataRows.map((cols) => {
      const title = (cols[idxTitle] || '').trim();
      const area = (cols[idxArea] || '').trim();
      const zone_type = normalizeZoneTypeValue(cols[idxZone] || '');
      const disinfectNorm =
        idxDisinfect >= 0 && idxDisinfect !== idxDrug
          ? normalizeDisinfectMin(cols[idxDisinfect])
          : { value: null, valid: true };
      const dilutionNorm = normalizeDilutionValue(
        idxDilution >= 0 && idxDilution !== idxWater ? cols[idxDilution] : null,
        idxDrug !== -1 ? cols[idxDrug] : undefined,
        idxWater !== -1 ? cols[idxWater] : undefined
      );
      const content = (cols[idxContent] || '').trim();
      const warningStr = (cols[idxWarning] || '').trim();

      return {
        title,
        area,
        zone_type,
        disinfect_min: disinfectNorm.valid ? disinfectNorm.value : -1,
        dilution: dilutionNorm.valid ? dilutionNorm.value : 'INVALID',
        content,
        warning: warningStr ? warningStr : null,
      };
    });

    return { items, totalRawCount };
  }

  // 3. TXT format: separated by a line containing only ---
  const blocks = rawText
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*---+[ \t]*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const totalRawCount = blocks.length;

  const items: BulkImportItem[] = blocks.map((block) => {
    const lines = block.split('\n');
    let title = '';
    let area = '';
    let zoneRaw = '';
    let disinfectRaw = '';
    let dilutionRaw = '';
    let legacyDrugRaw = '';
    let legacyWaterRaw = '';
    let warningRaw = '';
    const contentLines: string[] = [];
    let inContent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (inContent) {
        contentLines.push(line);
        continue;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;

      const lower = trimmed.toLowerCase();
      if (lower.startsWith('tiêu đề:') || lower.startsWith('tieu de:')) {
        title = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('khu vực:') || lower.startsWith('khu vuc:')) {
        area = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('vùng:') || lower.startsWith('vung:')) {
        zoneRaw = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (
        lower.startsWith('thời gian sát trùng') ||
        lower.startsWith('thoi gian sat trung')
      ) {
        disinfectRaw = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (
        lower.startsWith('nồng độ pha thuốc:') ||
        lower.startsWith('nong do pha thuoc:') ||
        lower.startsWith('nồng độ pha:') ||
        lower.startsWith('nong do pha:')
      ) {
        dilutionRaw = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('% thuốc:') || lower.startsWith('% thuoc:')) {
        legacyDrugRaw = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('% nước:') || lower.startsWith('% nuoc:')) {
        legacyWaterRaw = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (
        lower.startsWith('lưu ý cảnh báo:') ||
        lower.startsWith('luu y canh bao:') ||
        lower.startsWith('cảnh báo:')
      ) {
        warningRaw = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('nội dung:') || lower.startsWith('noi dung:')) {
        inContent = true;
        const afterColon = trimmed.slice(trimmed.indexOf(':') + 1).trim();
        if (afterColon) {
          contentLines.push(afterColon);
        }
      }
    }

    const zone_type = normalizeZoneTypeValue(zoneRaw);
    const disinfectNorm = normalizeDisinfectMin(disinfectRaw);
    const dilutionNorm = normalizeDilutionValue(dilutionRaw, legacyDrugRaw, legacyWaterRaw);
    const content = contentLines.join('\n').trim();

    return {
      title,
      area,
      zone_type,
      disinfect_min: disinfectNorm.valid ? disinfectNorm.value : -1,
      dilution: dilutionNorm.valid ? dilutionNorm.value : 'INVALID',
      content,
      warning: warningRaw ? warningRaw : null,
    };
  });

  return { items, totalRawCount };
}

export const SAMPLE_TXT_TEMPLATE = `Tiêu đề: Quy trình phun sát trùng xe vận chuyển tại cổng trại
Khu vực: Trạm rửa xe
Vùng: Đỏ
Thời gian sát trùng (phút): 30
Nồng độ pha thuốc: 1:100
Lưu ý cảnh báo: Tuyệt đối không cho xe qua cổng khi chưa đủ thời gian tiếp xúc thuốc tối thiểu 30 phút.
Nội dung:
1. Dừng phương tiện tại vạch kiểm soát Vùng Đỏ cách cổng trại 500m.
2. Xịt rửa sạch bùn đất và chất hữu cơ bám trên gầm xe, bánh xe và thùng xe bằng vòi áp lực cao (150 - 200 bar).
3. Pha dung dịch thuốc sát trùng theo tỷ lệ quy định và phun phủ kín toàn bộ bề mặt phương tiện.
4. Giữ xe tại khu vực chờ đủ thời gian sát trùng trước khi di chuyển vào cầu trung chuyển.
---
Tiêu đề: Quy trình tắm sát trùng và thay đồ bảo hộ nhân sự
Khu vực: Nhà tắm sát trùng
Vùng: Vàng
Thời gian sát trùng (phút): 5
Nồng độ pha thuốc:
Lưu ý cảnh báo: Nhân sự không được mang điện thoại, trang sức hoặc thực phẩm cá nhân từ Vùng Đỏ qua nhà tắm.
Nội dung:
1. Cởi bỏ toàn bộ quần áo và giày dép cá nhân tại tủ đồ Khu Bẩn.
2. Bước qua khu vực tắm vòi sen một chiều, gội đầu và tắm xà phòng diệt khuẩn tối thiểu 5 phút.
3. Sang Khu Sạch mặc trang phục bảo hộ nội trại và ủng chuyên dụng đã được khử trùng.
---
Tiêu đề: Quy trình vệ sinh máng ăn và đường nước uống hàng ngày
Khu vực: Khu chuồng nuôi
Vùng: Xanh
Nội dung:
1. Kiểm tra độ sạch của máng ăn và hệ thống núm uống vào đầu ca sáng.
2. Xả cặn đường ống nước và vệ sinh bầu lọc định kỳ.
3. Ghi chép nhật ký tiêu thụ thức ăn và nước uống của đàn vật nuôi.
`;

export function inferBioZoneFromText(zoneText: string): BioZone {
  const lower = zoneText.toLowerCase();
  const hasRed = lower.includes('đỏ') || lower.includes('do') || lower.includes('red');
  const hasYellow = lower.includes('vàng') || lower.includes('vang') || lower.includes('yellow');
  const hasGreen = lower.includes('xanh') || lower.includes('green');

  if (hasRed && hasYellow) return 'RED_YELLOW';
  if (hasRed) return 'RED';
  if (hasYellow) return 'YELLOW';
  if (hasGreen) return 'GREEN';
  return 'GENERAL';
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
          'bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
        shortTag: 'VÙNG ĐỎ (NGUY HIỂM)',
      };
    case 'YELLOW':
      return {
        glyph: '▲',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-500/30',
        surfaceBg: 'bg-amber-500/10',
        badgeClass:
          'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.12)]',
        shortTag: 'VÙNG VÀNG (RỦI RO)',
      };
    case 'RED_YELLOW':
      return {
        glyph: '◆',
        textColor: 'text-amber-200',
        borderColor: 'border-rose-500/30',
        surfaceBg: 'bg-gradient-to-r from-rose-500/10 to-amber-500/10',
        badgeClass:
          'bg-gradient-to-r from-rose-500/15 to-amber-500/15 border border-rose-500/30 text-amber-200 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
        shortTag: 'VÙNG ĐỎ (NGUY HIỂM)',
      };
    case 'GREEN':
      return {
        glyph: '■',
        textColor: 'text-emerald-300',
        borderColor: 'border-emerald-500/30',
        surfaceBg: 'bg-emerald-500/10',
        badgeClass:
          'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        shortTag: 'VÙNG XANH (AN TOÀN)',
      };
    case 'GENERAL':
    default:
      return {
        glyph: '◈',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-500/30',
        surfaceBg: 'bg-cyan-500/10',
        badgeClass:
          'bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
        shortTag: 'QUY ĐỊNH CHUNG · ATSH',
      };
  }
}
