# Dashboard duyệt thiết kế — Thanh kê PVC chữ U, bộ Mẫu KH

| File | Nội dung |
|---|---|
| `dashboard_mau_kh.html` | **File gửi khách.** Một file duy nhất, mở bằng trình duyệt, chạy không cần mạng; có chế độ sáng/tối và nút "In / lưu PDF" (A4). |
| `dashboard.src.html` | Khung trang (giao diện, bản vẽ SVG, hình chiếu trục đo). |
| `web/dash3d.src.js` | Mô hình 3D (three.js) + xuất DXF bản vẽ 2D và DXF 3D. Hình học 3D dùng chung `../Mau_KH/tinh_toan/web/spacer_geom.js` với trình xem Mẫu KH. |
| `web/charts.js` | Thư viện biểu đồ SVG nhỏ (không phụ thuộc), chèn nguyên vào trang khi build. |
| `web/dxf.js` | Ghi file DXF R12 (AutoCAD mở trực tiếp), chia lớp nét, chữ tiếng Việt font Arial. |
| `build_dashboard.py` | Lấy hình học từ `../Mau_KH/tinh_toan/spacer_data.json`, gộp `web/dash3d.src.js` bằng esbuild (dùng `node_modules` của `Mau_KH/tinh_toan/web`), tạo lại `dashboard_mau_kh.html` (~580 KB, chạy offline). |
| `build_datasheet.py`, `datasheet/` | Data sheet A4 một trang cho từng cỡ (`DataSheet_PVC-U20…U70.pdf`), bố cục theo phiếu Technical Data; khối lượng và tải phá hủy ước tính lấy từ mô hình mô phỏng, có chú thích "Số liệu dựa trên tính toán mô phỏng, sẽ cập nhật khi có thí nghiệm sản phẩm thực tế". Ảnh sản phẩm: `datasheet/img/`. Tạo lại: `python build_datasheet.py`. |
| `*_truoc_duyet_tk.html.bak` | Bản dashboard trước (có hệ số an toàn, khối lượng). |
| `dashboard.src_truoc_saas.html.bak` | Bản một trang cuộn trước khi đổi sang giao diện ứng dụng (23/11/2026). |

Cập nhật sau khi đổi thông số bộ Mẫu KH:

```powershell
cd "D:\Claude - project\Spacer PVC\Mau_KH\tinh_toan"
python export_mau_kh.py
cd "D:\Claude - project\Spacer PVC\Dashboard_KH"
python build_dashboard.py
```

**Giai đoạn duyệt thiết kế (từ 23/11/2026):** chỉ đưa hình học — bỏ khối lượng, hệ số an toàn, độ lún, phương án dự phòng.

**Giao diện (từ 23/11/2026):** dạng ứng dụng nhiều màn hình. Thanh bên trái + thanh trên cùng là một khung xám, nội dung đặt trên "tờ" trắng; bộ lọc cỡ H20–H70 ở thanh trên áp dụng cho mọi màn hình; chế độ sáng/tối; điện thoại: menu gập, bộ lọc cỡ thành hàng riêng. Font IBM Plex Sans tải từ Google Fonts, mất mạng thì dùng font hệ thống. Sáu màn hình (địa chỉ `#ban-ve`, `#mo-hinh-3d`, `#thanh-cat`, `#so-sanh`, `#data-sheet`, `#duyet`):
- **Bản vẽ**: tiêu đề mã + cỡ, câu nhận xét chính (cầu nhựa mỏng nhất), 5 chỉ số hình học, tờ bản vẽ, khung tên, bảng thông số; nút Xuất DXF bản vẽ.
- **Mô hình 3D**: chiều dài, góc nhìn, Xuất DXF 3D.
- **Thanh cắt**: tỷ lệ đầu thanh có lỗ hở / mép mỏng, 3 thanh cắt ngẫu nhiên + thanh trượt e, biểu đồ tỷ lệ mép mỏng theo cỡ.
- **So sánh cỡ**: biểu đồ cầu nhựa mỏng nhất / chiều dày thành (đường 1,00), bảng kích thước có lọc "Cần lưu ý", bấm dòng để mở bản vẽ cỡ đó.
- **Phiếu kỹ thuật** (`#data-sheet`): data sheet một trang A4 cho cỡ đang chọn, bố cục như phiếu Technical Data (tiêu đề, mã hàng, ảnh mô hình 3D, bảng thông số hai cột, khung ghi chú "Số liệu dựa trên tính toán mô phỏng, sẽ cập nhật khi có thí nghiệm sản phẩm thực tế"). Theo nút VI | EN; nút In / lưu PDF chỉ in đúng tờ này. Khối lượng và tải phá hủy ước tính lấy từ mô hình mô phỏng khi chạy `build_dashboard.py`; ảnh lấy từ `datasheet/img/`. Đây là màn hình duy nhất có khối lượng / tải ước tính.
- **Duyệt thiết kế**: danh sách mục cần khách xác nhận (đánh dấu và ghi chú lưu trên máy người xem), nút gửi kết quả qua email (mở trình gửi thư với nội dung điền sẵn).

**Liên kết, bàn phím, in (từ 23/11/2026):** địa chỉ giữ màn hình, cỡ và ngôn ngữ, ví dụ `dashboard_mau_kh.html#ban-ve?co=H40&lang=en`; nút "Sao chép liên kết" trên thanh trên cùng gửi đúng bản vẽ cho khách. Có liên kết "Bỏ qua tới nội dung chính", mô hình 3D điều khiển bằng bàn phím (mũi tên xoay, `+`/`-` phóng, `Home` về ban đầu), vùng bấm ≥ 44 px trên màn hình cảm ứng. Nút In / lưu PDF chỉ in màn hình đang xem (A4, nền trắng); màn hình Bản vẽ ra 2 trang.

**Song ngữ Việt / Anh (từ 23/11/2026):** nút **VI | EN** trên thanh trên cùng đổi toàn bộ dashboard: giao diện, tờ bản vẽ, khung tên, biểu đồ, danh sách duyệt, email và file DXF xuất ra (tên file `ThanhKe_…` / `Spacer_…`). Ngôn ngữ được nhớ trên máy người xem. Chữ tĩnh trong `dashboard.src.html` có thuộc tính `data-en` (nội dung) hoặc `data-en-title` / `data-en-aria` / `data-en-ph`; chữ sinh bằng mã dùng `T(vi, en)` (trong `web/dash3d.src.js` là `LT(vi, en)`). Thuật ngữ: bụng = web, cánh = flange, lỗ vòm = arch opening, lỗ bụng = web slot, khoảng cách mép lỗ = edge distance, lớp bê tông bảo vệ = concrete cover, ván khuôn = formwork, hình chiếu bằng / đứng = top view / front elevation, hình trích = detail.

Nội dung:
1. **Tờ bản vẽ từng cỡ** — mặt cắt biên dạng đùn (gạch chéo), chi tiết I (vát 45°) và II (chân R0,5); mặt lưng, thành A, thành B gióng thẳng hàng cùng tỷ lệ, đầy đủ kích thước, đường tâm, nét khuất; đoạn trích 2,5 bước lỗ với nét cắt lìa (profile liên tục). Khung tên bên dưới.
2. **Thanh cắt từ dây chuyền** — sản phẩm đùn + dập lỗ liên tục, cắt 2 000 mm không đồng bộ với khuôn dập nên lỗ ở hai đầu thanh ngẫu nhiên. Vẽ 3 thanh cắt ngẫu nhiên (nút "Cắt ngẫu nhiên", thanh trượt e), hình chiếu trục đo hai đầu thanh, liệt kê mặt nào bị cắt qua lỗ / mép nhựa còn lại; tỷ lệ đầu thanh có lỗ hở và có mép mỏng hơn chiều dày thành.
3. **Mô hình 3D** — thanh 2 m hoặc đoạn 400 mm đầu thanh, theo vị trí cắt e của thanh đang chọn; góc nhìn trục đo / đầu trái / đầu phải / cạnh bên / từ trên.
4. **Xuất AutoCAD (DXF)**:
   - *Xuất DXF bản vẽ* — tờ bản vẽ cỡ đang chọn, **tỷ lệ 1:1, đơn vị mm**; lớp CONTOUR, HIDDEN, CENTER, DIM, HATCH, TEXT, DETAIL, FRAME; có khung tên. Kích thước là nét + chữ (không phải đối tượng DIMENSION liên kết). Chi tiết I, II phóng to (ghi hệ số trên bản vẽ).
   - *Xuất DXF 3D* — lưới đa diện (POLYFACE) của thanh đang xem, mỗi khối một lớp (LUNG, THANH_A, THANH_B, VAT); X dọc thanh, Y ngang (thành A phía Y âm), Z hướng lên.
   - DXF dạng R12 — mở bằng AutoCAD (Open), lưu lại .dwg nếu cần. Đã kiểm tra đọc bằng ezdxf: 0 lỗi.
5. **Bảng kích thước toàn bộ cỡ** và **nội dung đề nghị khách xác nhận**.

Quy ước: e = khoảng cách từ mặt cắt đầu thanh tới tâm vòm gần nhất của thành A. Lỗ lưng đồng tâm vòm thành A; thành B lệch P/2 (giống mô hình 3D trong `Mau_KH`).

**Dấu HAN CORPORATION:** dấu đỏ hai dòng (HAN / CORPORATION, viền kép bo góc) ở chân thanh bên và đè lên ô Lập / Kiểm / Duyệt của khung tên bản vẽ; trong file DXF vẽ ở lớp `STAMP` (màu đỏ) tại cùng vị trí. Biểu tượng định nghĩa một lần (`<symbol id="seal">`) trong `dashboard.src.html`; hình trong DXF dựng bằng `stampDXF()` trong `web/dash3d.src.js`. Đây là hình dấu minh họa, không phải con dấu pháp lý.
