import { DefenseLineCard, PresetBioImage, SopDocument } from '../types/biosecurity';

export const IMG_TRUCK_WASH = '/src/assets/images/biosecurity_truck_wash_1793970912763.jpg';
export const IMG_SHOWER_LOCK = '/src/assets/images/biosecurity_shower_lock_1793970913992.jpg';
export const IMG_UV_CHAMBER = '/src/assets/images/biosecurity_uv_chamber_1793970916342.jpg';
export const IMG_LOADING_CHUTE = '/src/assets/images/biosecurity_loading_chute_1793970917225.jpg';
export const IMG_CLEAN_BARN = '/src/assets/images/biosecurity_clean_barn_1793970919273.jpg';
export const IMG_LAB_TESTING = '/src/assets/images/biosecurity_lab_testing_1793970919464.jpg';

export const PRESET_BIO_IMAGES: PresetBioImage[] = [
  {
    id: 'preset-truck-wash',
    title: 'Trạm Rửa & Phun Sát Trùng Xe Tải Đa Tầng',
    zone: 'RED',
    url: IMG_TRUCK_WASH,
    caption: 'Cổng sát trùng tự động áp lực cao tại Tuyến 1 (Vùng Đỏ)',
  },
  {
    id: 'preset-shower-lock',
    title: 'Nhà Tắm Khử Khuẩn 1 Chiều & Thay Đồ Bảo Hộ PPE',
    zone: 'YELLOW',
    url: IMG_SHOWER_LOCK,
    caption: 'Chốt kiểm soát nhân sự Shower-in / Shower-out tại Tuyến 2 (Vùng Vàng)',
  },
  {
    id: 'preset-uv-chamber',
    title: 'Buồng Khử Trùng UV-C & Phun Sương Siêu Âm Vật Tư',
    zone: 'YELLOW',
    url: IMG_UV_CHAMBER,
    caption: 'Tủ pass-box khử khuẩn tia cực tím UV-C 254nm cho thiết bị và nhu yếu phẩm',
  },
  {
    id: 'preset-loading-chute',
    title: 'Cầu Trung Chuyển Xuất Nhập Heo Không Tiếp Xúc Chéo',
    zone: 'RED_YELLOW',
    url: IMG_LOADING_CHUTE,
    caption: 'Ranh giới vật lý phân tách tuyệt đối xe ngoài (Đỏ) và hành lang nội trại (Vàng)',
  },
  {
    id: 'preset-clean-barn',
    title: 'Chuồng Nuôi Sạch Tiêu Chuẩn All-In All-Out & Quét Vôi',
    zone: 'GREEN',
    url: IMG_CLEAN_BARN,
    caption: 'Khu sản xuất Vùng Xanh sau khi rửa, phun sát trùng và để trống chuồng 7 ngày',
  },
  {
    id: 'preset-lab-testing',
    title: 'Phòng Xét Nghiệm Kiểm Soát Mầm Bệnh ASF / PRRS',
    zone: 'GENERAL',
    url: IMG_LAB_TESTING,
    caption: 'Lấy mẫu swab bề mặt và xét nghiệm Real-time PCR kiểm tra hiệu quả sát trùng',
  },
];

export const DEFENSE_LINES: DefenseLineCard[] = [
  {
    id: 'LINE_1',
    zone: 'RED',
    lineNumber: '01. Tuyến Phòng Thủ Vùng Đỏ',
    title: 'Kiểm Soát Phương Tiện, Trạm Rửa Xe & Cổng Trại',
    subtitle: 'Vùng Bẩn · Ngoại Vi Cách Trại ≥ 500m',
    description:
      'Ngăn chặn mầm bệnh ASF, PRRS, PED xâm nhập từ phương tiện vận chuyển bên ngoài. Thực hiện rửa áp lực cao, phun bọt kiềm, sát trùng đa tầng và sấy nhiệt.',
    imageUrl: IMG_TRUCK_WASH,
    keyControlPoints: [
      'Áp lực rửa xe 150–200 bar',
      'Thời gian ngâm thuốc ≥ 30 phút',
      'Sấy nhiệt cabin & thùng 65–70 °C',
    ],
    quickPrompts: [
      'Quy trình rửa và sát trùng xe tải nhiều sàn?',
      'Xử lý khi phát hiện xe chưa đạt chuẩn sạch?',
      'Tỷ lệ pha thuốc sát trùng xe và thời gian tiếp xúc?',
      'Quy định đối với tài xế trong khu vực Vùng Đỏ?',
    ],
  },
  {
    id: 'LINE_2',
    zone: 'YELLOW',
    lineNumber: '02. Tuyến Phòng Thủ Vùng Vàng',
    title: 'Nhà Tắm Sát Trùng, Khử Khuẩn Vật Tư & Xuất Nhập Heo',
    subtitle: 'Vùng Đệm · Ranh Giới Chuyển Tiếp 1 Chiều',
    description:
      'Kiểm soát con người, vật tư, thực phẩm và cầu trung chuyển heo. Tuân thủ nghiêm ngặt quy tắc tắm 3 bước 1 chiều, khử trùng tia UV-C và cách ly tối thiểu.',
    imageUrl: IMG_SHOWER_LOCK,
    keyControlPoints: [
      'Cách ly khách vào trại 48–72 giờ',
      'Tắm xà phòng sát khuẩn ≥ 5 phút',
      'Chiếu UV-C vật tư 254nm ≥ 30 phút',
    ],
    quickPrompts: [
      'Thời gian cách ly khách và nhân viên trước khi vào trại?',
      'Quy trình tắm sát trùng 1 chiều qua 3 phân khu?',
      'Quy trình khử trùng vật tư, thiết bị và thực phẩm qua phòng UV?',
      'Quy trình xuất nhập heo qua cầu trung chuyển không tiếp xúc chéo?',
    ],
  },
  {
    id: 'LINE_3',
    zone: 'GREEN',
    lineNumber: '03. Tuyến Phòng Thủ Vùng Xanh',
    title: 'Quy Trình Nội Trại, Xử Lý Sự Cố & Vệ Sinh Chuồng Nuôi',
    subtitle: 'Vùng Sạch · Khu Sản Xuất & Chuồng Nuôi Cốt Lõi',
    description:
      'Bảo vệ đàn heo giống và heo thịt bằng nguyên tắc Cùng vào - Cùng ra (All-in All-out), để trống chuồng sau sát trùng, hố nhúng ủng và diệt côn trùng định kỳ.',
    imageUrl: IMG_CLEAN_BARN,
    keyControlPoints: [
      'Trống chuồng tối thiểu 7–10 ngày',
      'Thay thuốc hố nhúng ủng mỗi 24 giờ',
      'Quét vôi nồng độ 15–20% sàn & tường',
    ],
    quickPrompts: [
      'Quy trình vệ sinh và để trống chuồng All-in All-out?',
      'Tần suất thay thuốc sát trùng tại hố nhúng ủng trước chuồng?',
      'Quy trình kiểm soát chuột bọ, ruồi muỗi và chim hoang nội trại?',
      'Các bước xử lý khi phát hiện heo có biểu hiện sốt bất thường?',
    ],
  },
];

export const INITIAL_SEED_SOPS: SopDocument[] = [
  {
    id: 'sop-01',
    code: 'SOP-RED-001',
    title: 'Quy trình rửa và sát trùng xe vận chuyển heo (Kiểm tra đa tầng/sàn xe, gầm xe, cabin)',
    zone: 'RED',
    zoneLabel: 'Vùng Đỏ · Ngoại Vi & Trạm Rửa Xe',
    tags: [
      'xe tải',
      'rửa xe',
      'sát trùng xe',
      'nhiều sàn',
      'đa tầng',
      'gầm xe',
      'cabin',
      'tài xế',
      'vùng đỏ',
      'chưa đạt chuẩn sạch',
    ],
    imageUrl: IMG_TRUCK_WASH,
    summary:
      'Quy trình 6 bước kiểm tra, rửa áp lực cao, phủ bọt kiềm, phun sát trùng Glutaraldehyde/Virkon và sấy nhiệt đối với xe vận chuyển heo nhiều sàn tại trạm Vùng Đỏ cách trại tối thiểu 500m.',
    criticalWarning:
      'TUYỆT ĐỐI KHÔNG cho xe tiến vào cổng trại nếu còn sót bất kỳ vết phân, chất độn chuồng hoặc bùn đất nào ở mặt dưới sàn tầng 2, tầng 3, hốc bánh xe hoặc gầm xe. Tài xế cấm bước xuống khỏi cabin khi xe đã vào khu vực sạch sau sát trùng.',
    keyMetrics: [
      { label: 'Khoảng cách trạm rửa', value: '≥ 500', unit: 'mét' },
      { label: 'Áp lực vòi rửa', value: '150–200', unit: 'bar' },
      { label: 'Thời gian ngâm thuốc', value: '≥ 30', unit: 'phút' },
      { label: 'Nhiệt độ sấy khô', value: '65–70', unit: '°C' },
    ],
    content: `### 1. Vị trí và Điều kiện Tiên quyết
- Trạm rửa và sát trùng xe cấp 1 phải đặt tại **Vùng Đỏ ngoại vi**, cách tường rào trại heo tối thiểu **500 mét** về phía cuối hướng gió chính.
- Nhân viên kiểm soát ATSH mặc đầy đủ đồ bảo hộ Vùng Đỏ (ủng cao su, tạp dề chống thấm, kính chắn giọt bắn, khẩu trang N95).

### 2. Các bước thực hiện chuẩn (Step-by-Step)
1. **Bước 1 - Kiểm tra sơ bộ & Tháo dỡ (10 phút):**
   - Dừng xe tại vạch Đỏ. Mở toàn bộ các sàn nâng (**sàn tầng 1, tầng 2, tầng 3**), tấm chắn phân và cửa hậu.
   - Cạo sạch phân khô, chất độn chuồng còn sót trên các góc sàn và rãnh thoát nước.
2. **Bước 2 - Rửa thô bằng nước áp lực cao (25–30 phút):**
   - Sử dụng súng phun cao áp đạt áp lực **150–200 bar** (lưu lượng **25–30 lít/phút**).
   - Phun theo nguyên tắc: **Từ trên xuống dưới (Tầng 3 → Tầng 2 → Tầng 1), từ trong ra ngoài**, đặc biệt chú ý mặt gầm của sàn tầng trên, khớp bản lề thủy lực, hốc bánh xe và hệ thống nhíp gầm xe.
3. **Bước 3 - Phủ bọt chất tẩy rửa kiềm (15–20 phút):**
   - Phun dung dịch xà phòng kiềm tạo bọt (nồng độ **1% – 2%**) phủ kín toàn bộ bề mặt thùng xe và gầm xe để phá vỡ màng sinh học (biofilm) và chất hữu cơ.
   - Giữ bọt tiếp xúc tối thiểu **15 phút**, sau đó xịt rửa lại bằng nước sạch áp lực cao cho đến khi nước chảy ra trong suốt hoàn toàn.
4. **Bước 4 - Nghiệm thu độ sạch bằng mắt thường & đèn pin (5 phút):**
   - Kỹ thuật viên ATSH dùng đèn pin chiếu kiểm tra **12 điểm mù**: gầm sàn nâng, góc cột thùng, chắn bùn, bàn đạp cabin.
   - **Xử lý khi phát hiện xe chưa đạt chuẩn sạch:** Lập tức yêu cầu xe lùi lại khu vực rửa thô để thực hiện lại Bước 2 và Bước 3. Nghiêm cấm phun thuốc sát trùng lên bề mặt còn dính phân vì chất hữu cơ làm bất hoạt thuốc sát trùng.
5. **Bước 5 - Phun sát trùng & Vệ sinh Cabin (30 phút):**
   - Pha dung dịch sát trùng phổ rộng (**Virkon S nồng độ 1:100 (1%)** hoặc **Glutaraldehyde + QAC tỷ lệ 1:150 – 1:200**). Lượng dung dịch phun tối thiểu **0.4 lít/m²** bề mặt.
   - Đối với **Cabin xe**: Tài xế mang giày bọc nilon, thu dọn rác, dùng khăn tẩm cồn **70 độ** hoặc dung dịch Virkon **0.5%** lau sạch vô lăng, tay nắm cửa, cần số, ghế ngồi; phun sương sát trùng sàn cabin và thảm để chân.
   - Giữ nguyên xe tại bãi chờ khô tối thiểu **30 phút** (hoặc đưa vào buồng sấy nhiệt ở **65–70 °C trong 20 phút** để diệt triệt để virus ASF).
6. **Bước 6 - Niêm phong & Cấp phiếu thông hành:**
   - Sau khi đạt chuẩn (hoặc có kết quả test nhanh ATP bề mặt đạt chuẩn), dán tem niêm phong thùng xe và cấp Phiếu Xác Nhận Sát Trùng có hiệu lực trong vòng **4 giờ**.`,
    active: true,
    updatedAt: '2026-11-06T08:00:00Z',
  },
  {
    id: 'sop-02',
    code: 'SOP-YEL-002',
    title: 'Quy trình tắm sát trùng và thay đồ bảo hộ cho nhân viên & khách vào trại (Quy tắc 1 chiều)',
    zone: 'YELLOW',
    zoneLabel: 'Vùng Vàng · Nhà Tắm Sát Trùng & Cách Ly',
    tags: [
      'tắm sát trùng',
      'nhà tắm',
      'cách ly',
      'khách vào trại',
      'nhân viên',
      'thay đồ bảo hộ',
      '1 chiều',
      'ppe',
      'vùng vàng',
      'thời gian cách ly',
    ],
    imageUrl: IMG_SHOWER_LOCK,
    summary:
      'Quy định cách ly y tế 48–72 giờ và quy trình tắm khử khuẩn 1 chiều qua 3 phân khu (Khu Bẩn → Buồng Tắm Khóa Liên Động → Khu Sạch) dành cho mọi nhân sự và khách trước khi bước vào Vùng Xanh.',
    criticalWarning:
      'Nguyên tắc bất di bất dịch: QUY TẮC 1 CHIỀU. Khi đã bước qua cửa Khu Sạch, tuyệt đối không quay ngược tay hoặc bước lùi lại Khu Bẩn để lấy đồ bỏ quên. Mọi trang sức, đồng hồ, điện thoại cá nhân chưa qua khử trùng UV-C đều bị cấm mang qua buồng tắm.',
    keyMetrics: [
      { label: 'Cách ly khách ngoài', value: '48–72', unit: 'giờ' },
      { label: 'Thời gian tắm gội', value: '≥ 5', unit: 'phút' },
      { label: 'Nhiệt độ nước tắm', value: '38–42', unit: '°C' },
      { label: 'Ngâm ủng sát trùng', value: '≥ 30', unit: 'giây' },
    ],
    content: `### 1. Quy định Cách ly trước khi vào Trại (Quarantine Time)
- **Đối với nhân viên trại đi phép / công tác về:** Bắt buộc lưu trú tại Khu nhà cách ly Vùng Vàng tối thiểu **48 giờ** (2 đêm) nếu không tiếp xúc trại heo khác, hoặc **72 giờ** (3 đêm) nếu có đi qua vùng dịch tễ.
- **Đối với khách tham quan, chuyên gia kỹ thuật:** Bắt buộc cam kết không tiếp xúc với bất kỳ trại heo, lò mổ, chợ thực phẩm tươi sống nào trong vòng **72 giờ** trước khi đến trại, và cách ly tại nhà khách Vùng Vàng tối thiểu **24–48 giờ** kèm xét nghiệm mẫu ngoáy dịch hầu họng/bề mặt âm tính với ASF.

### 2. Quy trình Tắm Sát Trùng 1 Chiều (3 Phân Khu)
1. **Phân khu 1 - Khu Bẩn (Bên ngoài / Vùng Đỏ - Vàng):**
   - Khai báo nhật ký ra vào trại và kiểm tra thân nhiệt (yêu cầu **< 37.5 °C**).
   - Cởi bỏ **100%** quần áo cá nhân, đồ lót, tất, giày dép, đồng hồ, nhẫn và cất vào tủ Locker số hiệu cá nhân tại Khu Bẩn.
   - Xì mũi sạch, cắt ngắn móng tay và tháo kính mắt (nếu có kính cận phải ngâm rửa bằng dung dịch xà phòng sát khuẩn).
2. **Phân khu 2 - Buồng Tắm Trung Gian (Shower Airlock):**
   - Bước vào buồng tắm một chiều, đóng chặt cửa phía Khu Bẩn.
   - Tắm dưới vòi nước ấm (**38–42 °C**) liên tục tối thiểu **5 phút** (hệ thống khóa từ chỉ mở cửa phía Khu Sạch sau khi đủ **300 giây** xả nước).
   - Bắt buộc gội đầu kỹ bằng dầu gội, chà sạch kẽ móng tay bằng bàn chải mềm và tắm toàn thân bằng xà phòng sát khuẩn (**Chlorhexidine 2% – 4%**).
3. **Phân khu 3 - Khu Sạch (Đầu Vùng Xanh):**
   - Bước sang Khu Sạch, sử dụng khăn tắm đã hấp tiệt trùng để lau khô người.
   - Mặc đồ lót mới, quần áo bảo hộ chuyên dụng của trại, đội mũ trùm tóc, đeo khẩu trang và mang ủng cao su nội trại đúng kích cỡ.
   - Trước khi bước ra hành lang Vùng Xanh: Rửa tay bằng cồn sát khuẩn **70 độ trong 30 giây** và bước qua hố nhúng ủng chứa dung dịch sát trùng (**Iodine hoặc Virkon 1%**) ngâm ủng tối thiểu **30 giây**.`,
    active: true,
    updatedAt: '2026-11-06T08:05:00Z',
  },
  {
    id: 'sop-03',
    code: 'SOP-YEL-003',
    title: 'Quy trình khử trùng vật tư, thiết bị và thực phẩm qua phòng UV / Xông Formalin / Phun sương',
    zone: 'YELLOW',
    zoneLabel: 'Vùng Vàng · Phòng Khử Khuẩn Vật Tư',
    tags: [
      'vật tư',
      'thiết bị',
      'thực phẩm',
      'phòng uv',
      'tia cực tím',
      'phun sương',
      'xông',
      'formalin',
      'vaccine',
      'thuốc thú y',
      'tỷ lệ pha thuốc',
    ],
    imageUrl: IMG_UV_CHAMBER,
    summary:
      'Phân loại và xử lý khử trùng 100% vật tư, thuốc thú y, dụng cụ kỹ thuật và thực phẩm nhà bếp qua buồng Pass-Box 2 cửa bằng tia cực tím UV-C, phun sương siêu âm hoặc ozon/nhiệt.',
    criticalWarning:
      'TUYỆT ĐỐI CẤM mang thịt heo, các chế phẩm từ thịt heo (xúc xích, chà bông, giò chả, mì gói có gói súp thịt heo) vào trại dưới mọi hình thức. Khi tháo bao bì carton lớp ngoài tại cửa bẩn, tay nhân viên Khu Sạch không được chạm vào vỏ thùng carton.',
    keyMetrics: [
      { label: 'Bước sóng đèn UV-C', value: '254', unit: 'nm' },
      { label: 'Thời gian chiếu UV-C', value: '≥ 30', unit: 'phút' },
      { label: 'Phun sương Virkon', value: '1:100', unit: 'tỷ lệ' },
      { label: 'Xử lý nhiệt thực phẩm', value: '≥ 80', unit: '°C (30p)' },
    ],
    content: `### 1. Nguyên tắc Phân loại & Tháo bỏ Bao bì Ngoại vi
- Tất cả vật tư đưa vào trại phải đi qua **Phòng Khử Trùng Vật Tư 2 cửa (Pass-through Chamber)** nằm trên ranh giới Vùng Đỏ và Vùng Vàng.
- Nhân viên phía ngoài (Vùng Đỏ) bắt buộc **tháo bỏ toàn bộ thùng carton, bao tải dứa, màng bọc bên ngoài**, chỉ giữ lại đơn vị đóng gói nhỏ nhất bên trong và xếp lên kệ lưới inox (cách mặt sàn **≥ 40 cm**, các kiện cách nhau **≥ 5 cm** để tia UV và sương tiếp xúc đủ 6 mặt).

### 2. Quy trình Khử trùng theo từng Nhóm Vật tư
1. **Nhóm 1 - Thiết bị điện tử, Điện thoại, Tài liệu giấy, Dụng cụ kim loại:**
   - Lau bề mặt bằng khăn tẩm cồn **Isopropyl 70%**.
   - Đưa vào tủ chiếu tia cực tím **UV-C (bước sóng 254 nm, cường độ ≥ 40 mJ/cm²)**.
   - Thời gian chiếu: **Tối thiểu 30 phút** (sau **15 phút** lật mặt vật dụng để đảm bảo không có góc khuất bóng râm).
2. **Nhóm 2 - Thuốc thú y, Dụng cụ chăn nuôi lớn, Bao cám / Vật tư chịu ẩm:**
   - Xếp lên kệ rỗng trong phòng phun sương siêu âm (Ultrasonic Fogging) hoặc phòng xông khử trùng.
   - **Phương pháp Phun sương lạnh:** Sử dụng dung dịch **Virkon S pha tỷ lệ 1:100 (1%)** hoặc **Peracetic Acid 0.5%**, bật máy tạo sương hạt mịn (**kích thước hạt 5–20 µm**) trong **20 phút**, sau đó ủ kín buồng thêm **40 phút** (tổng thời gian tiếp xúc **60 phút**).
   - **Phương pháp Xông khí / Ozone công nghiệp:** Áp dụng cho kho vật tư lớn trong **2–4 giờ**, bật quạt thông gió hút khí tồn dư **30 phút** trước khi nhân viên Khu Sạch mở cửa lấy hàng.
3. **Nhóm 3 - Vaccine và Chế phẩm sinh học nhạy cảm nhiệt (2–8 °C):**
   - **Không** chiếu UV trực tiếp vào lọ vaccine hoặc sấy nhiệt.
   - Mở thùng xốp tại cửa bẩn: Nhân viên Khu Bẩn dùng kẹp gắp từng lọ vaccine nhúng qua dung dịch sát trùng **Virkon 1%** hoặc cồn **70 độ** trong **30 giây**, lau khô và chuyển ngay vào thùng bảo ôn sạch của nhân viên Khu Sạch đang chờ sẵn.
4. **Nhóm 4 - Thực phẩm nhà bếp (Rau củ, thịt gà/bò/cá, trứng):**
   - Cấm tuyệt đối thịt heo và nội tạng động vật.
   - Rau củ quả rửa sạch đất cát, ngâm dung dịch **Chlorine hoạt tính 100–150 ppm** hoặc **Ozone sục nước trong 15–20 phút**, để ráo rồi mới chuyển qua cửa giao nhận. Thực phẩm tươi sống nên ưu tiên sơ chế chín ở bếp ngoại vi (**nhiệt độ tâm sản phẩm ≥ 80 °C trong 30 phút**) trước khi đưa vào nội khu.`,
    active: true,
    updatedAt: '2026-11-06T08:10:00Z',
  },
  {
    id: 'sop-04',
    code: 'SOP-RY-004',
    title: 'Quy trình xuất - nhập heo qua cầu trung chuyển (Không tiếp xúc chéo giữa xe ngoài và người trong trại)',
    zone: 'RED_YELLOW',
    zoneLabel: 'Vùng Đỏ - Vàng · Cầu Trung Chuyển Xuất Nhập Heo',
    tags: [
      'xuất heo',
      'nhập heo',
      'cầu trung chuyển',
      'bàn cân',
      'tiếp xúc chéo',
      'heo giống',
      'heo thịt',
      'vạch đỏ',
      'cổng xuất',
    ],
    imageUrl: IMG_LOADING_CHUTE,
    summary:
      'Thiết lập ranh giới vật lý tuyệt đối trên cầu dẫn xuất nhập heo: Cổng khóa một chiều, phân tách nhân sự nội trại và tài xế xe ngoài, khử trùng tức thời trong vòng 15 phút sau khi kết thúc ca xuất.',
    criticalWarning:
      'NGHIÊM CẤM HEO QUAY ĐẦU! Con heo nào đã bước chân qua vạch ranh giới Vùng Đỏ trên cầu dẫn thì tuyệt đối không được phép lùa ngược trở lại phía Vùng Vàng/Vùng Xanh. Nhân viên nội trại và nhân viên xe ngoài không được bước qua vạch phân cách hoặc trao đổi dụng cụ lùa heo.',
    keyMetrics: [
      { label: 'Ranh giới cách ly cầu', value: '≥ 3.0', unit: 'mét' },
      { label: 'Rửa cầu sau xuất heo', value: '≤ 15', unit: 'phút' },
      { label: 'Nồng độ Xút (NaOH) rửa cầu', value: '2.0', unit: '%' },
      { label: 'Cách ly heo hậu bị nhập', value: '28–42', unit: 'ngày' },
    ],
    content: `### 1. Thiết kế & Phân vạch Cầu Trung Chuyển (Loading Chute)
- Cầu trung chuyển xuất nhập heo được chia làm **2 nửa độc lập** ngăn cách bởi **Cổng Chốt Một Chiều (One-way Gate)** và vạch sơn cảnh báo Đỏ - Vàng rộng **3 mét**:
  - **Nửa Trong (Vùng Vàng):** Chỉ dành cho nhân viên nội trại (mặc đồ bảo hộ màu Xanh/Trắng).
  - **Nửa Ngoài (Vùng Đỏ):** Chỉ dành cho nhân viên bốc xếp bên ngoài và xe tải (mặc đồ bảo hộ màu Đỏ/Cam).

### 2. Quy trình Thực hiện Chuẩn (Step-by-Step)
1. **Bước 1 - Kiểm tra Xe trước khi Cập Cầu:**
   - Nhân viên bảo vệ kiểm tra **Phiếu Xác Nhận Sát Trùng Xe** còn hiệu lực (**≤ 4 giờ**) và niêm phong thùng xe.
   - Xe tải lùi sát vào đệm cao su đầu cầu Vùng Đỏ, tắt máy. Tài xế ngồi yên trong cabin hoặc chỉ đứng trên bệ Vùng Đỏ, tuyệt đối không bước sang phần cầu Vùng Vàng.
2. **Bước 2 - Vận hành Lùa Heo 1 Chiều (Không tiếp xúc chéo):**
   - Nhân viên nội trại lùa heo từ hành lang xuất bán lên bàn cân và đưa vào khoang đệm trung gian trên cầu dẫn, sau đó **đóng chốt cửa ngăn phía Vùng Vàng**.
   - Chỉ khi cửa Vùng Vàng đã khóa hoàn toàn, nhân viên bốc xếp Vùng Đỏ mới mở cửa phía xe tải để lùa heo từ khoang đệm lên xe.
   - **Dụng cụ lùa heo (bảng nhựa, cờ lùa):** Trang bị riêng biệt 2 bộ theo mã màu (**Màu Xanh cho nửa trong, Màu Đỏ cho nửa ngoài**), nghiêm cấm dùng chung hoặc ném qua vạch phân cách.
3. **Bước 3 - Xử lý Vệ sinh & Khử trùng Cầu ngay sau khi Xe rời bến (Trong vòng 15 phút):**
   - Ngay khi xe tải đóng thùng và rời khỏi cầu, đóng kín cổng ngoài của cầu trung chuyển.
   - Trong vòng **tối đa 15 phút**, đội vệ sinh phải xịt rửa toàn bộ cầu dẫn, bàn cân và hành lang lùa heo theo hướng từ trong đẩy dồn ra phía hố thu nước thải Vùng Đỏ.
   - Phun dung dịch **Xút (NaOH 2%)** hoặc **Virkon S 1%**, để ngấm **30 phút**, sau đó quét nước vôi đặc **20%** lên toàn bộ mặt sàn cầu dẫn.
4. **Bước 4 - Quy định riêng khi Nhập Heo Hậu Bị (Gilt Quarantine):**
   - Heo giống nhập về phải được đưa thẳng vào **Trại Cách Ly (Quarantine Barn)** nằm tách biệt ít nhất **300–500m** với khu sản xuất chính.
   - Thời gian nuôi cách ly theo dõi và lấy mẫu máu/dịch miệng xét nghiệm PCR là **28 đến 42 ngày** trước khi nhập đàn Vùng Xanh.`,
    active: true,
    updatedAt: '2026-11-06T08:15:00Z',
  },
  {
    id: 'sop-05',
    code: 'SOP-GRN-005',
    title: 'Quy trình vệ sinh, để trống chuồng (All-in All-out) và kiểm soát côn trùng, chuột bọ nội trại',
    zone: 'GREEN',
    zoneLabel: 'Vùng Xanh · Khu Sản Xuất & Chuồng Nuôi',
    tags: [
      'vệ sinh chuồng',
      'trống chuồng',
      'all-in all-out',
      'cùng vào cùng ra',
      'quét vôi',
      'hố nhúng ủng',
      'chuột bọ',
      'côn trùng',
      'vùng xanh',
      'sốt bất thường',
    ],
    imageUrl: IMG_CLEAN_BARN,
    summary:
      'Quy trình 7 bước vệ sinh khử trùng chuồng nuôi theo nguyên tắc Cùng vào - Cùng ra (All-in All-out), để trống chuồng 7–10 ngày, quản lý hố nhúng ủng 24h và kiểm soát sinh vật trung gian truyền bệnh.',
    criticalWarning:
      'Không bao giờ nhập lô heo mới vào chuồng chưa đủ thời gian để trống và khô hoàn toàn tối thiểu 7 ngày sau khi sát trùng lần 2. Nếu phát hiện heo bỏ ăn, sốt ≥ 40.5 °C hoặc đỏ da, phải lập tức khóa sổ di chuyển chuồng đó và báo Bác sĩ thú y trưởng lấy mẫu xét nghiệm ngay.',
    keyMetrics: [
      { label: 'Thời gian trống chuồng', value: '7–10', unit: 'ngày' },
      { label: 'Thay hố nhúng ủng', value: '24', unit: 'giờ/lần' },
      { label: 'Tỷ lệ pha nước vôi', value: '15–20', unit: '%' },
      { label: 'Khoảng cách bả chuột', value: '10–15', unit: 'mét/trạm' },
    ],
    content: `### 1. Quy trình Vệ sinh & Để trống chuồng (All-In All-Out)
1. **Bước 1 - Dọn phân khô & Tháo dỡ thiết bị (Ngày 1):**
   - Sau khi xuất hết heo trong dãy chuồng, tháo tấm đan sàn nhựa, máng ăn, đèn sưởi, dọn sạch phân dưới hầm Biogas/cống thoát và mạng nhện trên trần, quạt hút.
2. **Bước 2 - Ngâm bọt tẩy rửa & Rửa cao áp (Ngày 1–2):**
   - Phun nước làm ẩm toàn bộ chuồng trong **2 giờ**, sau đó phủ chất tẩy rửa kiềm **1.5%** trong **30 phút**.
   - Dùng máy rửa áp lực cao (**120–150 bar**) xịt sạch trần, bạt la-phông, tường, vách ngăn, mặt trên và mặt dưới tấm đan sàn.
3. **Bước 3 - Sát trùng Lần 1 & Quét vôi (Ngày 3):**
   - Khi chuồng ráo nước, phun thuốc sát trùng lần 1 (**Glutaraldehyde + QAC tỷ lệ 1:200**).
   - Pha dung dịch **nước vôi tôi (Ca(OH)₂) nồng độ 15% – 20%** quét phủ kín mặt sàn, chân tường cao **1.2 mét** và hố cống.
4. **Bước 4 - Phun khử trùng Sương mù / Xông kín & Để trống chuồng (Ngày 4–10):**
   - Đóng kín toàn bộ cửa chuồng và bạt che, phun mù nhiệt (Thermal Fogging) dung dịch sát trùng lần 2.
   - **Thời gian để trống chuồng bắt buộc:** Tối thiểu **7 đến 10 ngày** (đối với chuồng có lịch sử bệnh hô hấp/tiêu chảy phải để trống **14 ngày** và dùng súng khò lửa khò mặt sàn bê tông/sắt).

### 2. Quản lý Hố Nhúng Ủng & Kiểm Soát Vật Chủ Trung Gian Nội Trại
- **Hố nhúng ủng trước cửa mỗi dãy chuồng:**
  - Luôn duy trì mực nước thuốc sát trùng ngập sâu **tối thiểu 15 cm** (ngập qua mắt cá ủng).
  - Bố trí **2 chậu**: Chậu 1 chứa nước sạch + bàn chải để cọ sạch phân dính dưới đế ủng; Chậu 2 chứa dung dịch sát trùng (**Iodine 1% hoặc Virkon 1%**).
  - **Tần suất thay thuốc:** Thay mới định kỳ **mỗi 24 giờ/lần** (hoặc thay ngay lập tức khi dung dịch bị vẩn đục bởi chất hữu cơ).
- **Kiểm soát Chuột bọ, Côn trùng & Chim hoang:**
  - Lưới chắn chim bao kín **100%** các ô thoáng và cửa quạt thông gió (mắt lưới **≤ 1.5 cm**).
  - Đặt trạm bả chuột cố định dọc theo hành lang ngoài chuồng và tường bao với khoảng cách **10–15 mét/trạm**, kiểm tra và bổ sung bả sinh học định kỳ **7 ngày/lần**.
  - Phun thuốc diệt ruồi, muỗi tồn lưu định kỳ **2 lần/tuần** quanh rãnh thoát nước và khu vực thu gom phân.
- **Xử lý Sự cố Heo sốt bất thường:**
  - Khi phát hiện heo sốt **≥ 40.5 °C**, bỏ ăn hoặc nằm tụm: Công nhân chuồng **dừng ngay việc đi sang các ô chuồng khác**, đánh dấu ô chuồng nghi ngờ, thay ủng và gọi ngay Bác sĩ Thú y trưởng lấy mẫu máu kiểm tra nhanh ASF/PRRS tại chỗ.`,
    active: true,
    updatedAt: '2026-11-06T08:20:00Z',
  },
];

export const DEFAULT_SYSTEM_PROMPT =
  'Giọng điệu nghiêm túc, chuẩn mực, kỷ luật cao của chuyên gia An toàn sinh học trại heo công nghệ cao. Xưng hô "Trợ lý ATSH" và gọi người dùng là "Anh/Chị". Luôn nhấn mạnh các thông số định lượng (nồng độ, thời gian, nhiệt độ, áp lực) và cảnh báo rủi ro lây nhiễm chéo.';
