# Thanh kê PVC chữ U H20–H70 — Dashboard duyệt thiết kế

Dashboard duyệt thiết kế bộ thanh kê thép PVC chữ U (bộ Mẫu KH, H20–H70): bản vẽ kỹ thuật theo cỡ, mô hình 3D, thanh cắt ngẫu nhiên từ dây chuyền (đùn ép + dập lỗ liên tục), so sánh cỡ, danh sách duyệt thiết kế, xuất DXF (AutoCAD) bản vẽ 2D và mô hình 3D. Song ngữ Việt / Anh, chế độ sáng / tối, dùng được trên điện thoại.

**Bản xem trực tuyến:** GitHub Pages của repo này (thư mục `docs/`).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `docs/index.html` | **Bản xuất bản** — một file HTML duy nhất, chạy không cần mạng (chỉ font chữ tải từ Google Fonts). GitHub Pages phục vụ riêng thư mục này. |
| `Dashboard_KH/dashboard.src.html` | Mã nguồn trang (giao diện, bản vẽ SVG, song ngữ). |
| `Dashboard_KH/web/dash3d.src.js`, `dxf.js`, `charts.js` | Mô hình 3D (three.js), ghi DXF R12, biểu đồ SVG. |
| `Dashboard_KH/build_dashboard.py` | Đóng gói: lấy dữ liệu, gộp mã bằng esbuild, ghi `Dashboard_KH/dashboard_mau_kh.html` và `docs/index.html`. |
| `Mau_KH/tinh_toan/spacer_data.json` | Thông số hình học các cỡ (xuất từ mô hình tính của dự án). |
| `Mau_KH/tinh_toan/web/spacer_geom.js` | Hình học 3D dùng chung (lỗ dập liên tục, đầu thanh cắt ngẫu nhiên). |

## Build lại sau khi đổi thông số

Cần Python 3 và Node.js.

```powershell
cd Mau_KH\tinh_toan\web
npm install
cd ..\..\..\Dashboard_KH
python build_dashboard.py
```

Rồi commit `docs/index.html` để cập nhật trang.
