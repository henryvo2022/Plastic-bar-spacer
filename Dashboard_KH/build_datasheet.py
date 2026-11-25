# -*- coding: utf-8 -*-
"""Tạo data sheet A4 (PDF) cho từng cỡ H20–H70, bố cục theo phiếu "Technical Data" của sản phẩm tương tự.

Số liệu: hình học lấy từ Mau_KH/tinh_toan/thong_so_mau_kh.json; khối lượng và tải phá hủy ước tính tính bằng
mô hình pvc_spacer_model (cùng cách tính với DE_XUAT_THEO_KUM.md). Đây là SỐ LIỆU MÔ PHỎNG, chưa thí nghiệm.

Chạy:  python build_datasheet.py        -> datasheet/DataSheet_PVC-Uxx.pdf
Ảnh sản phẩm: datasheet/img/prodXX.png (chụp từ màn hình Mô hình 3D, đoạn 400 mm, góc trục đo).
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TT = HERE.parent / "Mau_KH" / "tinh_toan"
sys.path.insert(0, str(TT))
from de_xuat_theo_kum import evaluate          # noqa: E402

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DATE = "23.11.2026"
NOTE_VI = "Số liệu dựa trên tính toán mô phỏng, sẽ cập nhật khi có thí nghiệm sản phẩm thực tế"
NOTE_EN = "Figures are based on simulation; they will be updated once tests on actual products are available."


def num(x, d=0):
    s = f"{x:,.{d}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", " ")


def rnd10(x):
    return int(round(x / 10.0) * 10)


def row(label_vi, label_en, val, unit="", star=False):
    st = "<sup>*</sup>" if star else ""
    return f'<tr><th>{label_vi}<i>{label_en}</i></th><td class="v">{val}{st}</td><td class="u">{unit}</td></tr>'


CSS = """
@page { size: A4; margin: 0 }
* { box-sizing: border-box }
body { margin: 0; font: 11.5px/1.45 "Segoe UI", Arial, sans-serif; color: #222; }
.pg { width: 210mm; height: 296mm; padding: 14mm 15mm 12mm; position: relative; overflow: hidden }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12mm }
h1 { margin: 0 0 3mm; font-size: 20px; line-height: 1.25; color: #c00000; font-weight: 700 }
h1 small { display: block; font-size: 12.5px; font-weight: 500; color: #555; margin-top: 1.5mm }
.item { font-weight: 700; font-size: 13px }
.brand { flex: none; text-align: center; border: 2px solid #c00000; border-radius: 6px; padding: 2.2mm 5mm 1.6mm; color: #c00000; line-height: 1.1; margin-top: 1mm }
.brand b { display: block; font-size: 19px; letter-spacing: .12em }
.brand span { font-size: 8.5px; letter-spacing: .28em }
.mid { margin-top: 5mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; align-items: start }
.mid p.k { margin: 0 0 2mm; color: #555 }
.mid ul { margin: 0 0 3mm; padding-left: 4.5mm; list-style: none }
.mid li { position: relative; margin-bottom: 1.6mm }
.mid li::before { content: ""; position: absolute; left: -4.5mm; top: .55em; width: 5px; height: 5px; background: #c00000 }
.mid li i { display: block; font-style: normal; color: #777; font-size: 10.5px }
.photo { border: 1px solid #ddd; padding: 3mm; display: flex; align-items: center; justify-content: center; height: 46mm; background: #fff }
.photo img { max-width: 100%; max-height: 100% }
h2 { margin: 6mm 0 3mm; font-size: 18px; font-weight: 400; padding-bottom: 1.5mm; border-bottom: 1.5px solid #c00000 }
h2 i { font-size: 12px; color: #777; font-style: normal; margin-left: 3mm }
.tb { display: grid; grid-template-columns: 1fr 1fr; gap: 0 5mm }
table { width: 100%; border-collapse: collapse }
tr:nth-child(odd) { background: #ddd }
th { text-align: left; font-weight: 700; padding: 1.5mm 3mm; width: 56% }
th i { display: block; font-weight: 400; font-style: normal; font-size: 9.5px; color: #666 }
td { padding: 1.5mm 2mm; vertical-align: middle }
td.v { text-align: right; white-space: nowrap }
td.u { width: 17%; padding-left: 2mm; white-space: nowrap }
sup { color: #c00000; font-weight: 700 }
.note { margin-top: 5mm; border-left: 3px solid #c00000; background: #fdf1f1; padding: 3mm 4mm; font-size: 11.5px }
.note b { color: #c00000 }
.note i { display: block; font-style: normal; color: #555; font-size: 10.5px; margin-top: 1mm }
.fine { margin-top: 4mm; font-size: 9.8px; color: #666; line-height: 1.5 }
.foot { position: absolute; left: 15mm; right: 15mm; bottom: 10mm; border-top: 1px solid #1c3b57; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 9.5px; color: #333 }
.foot div:last-child { text-align: right }
"""


def page(e, r):
    sp = e["spec"]
    H = e["H"]
    code = f"PVC-U{H}"
    img = base64.b64encode((HERE / "datasheet" / "img" / f"prod{H}.png").read_bytes()).decode()
    tw, tt = sp["tw"], sp["ttop"]
    thick = num(tw, 1) if abs(tw - tt) < 1e-9 else f"{num(tw, 1)} / {num(tt, 1)}"
    left = "".join([
        row("Lớp bê tông bảo vệ", "Concrete cover", num(H), "mm"),
        row("Chiều dài", "Length", "2 000", "mm"),
        row("Giới hạn dưới lớp bảo vệ", "Lower tolerance limit", num(H - 1), "mm"),
        row("Giới hạn trên lớp bảo vệ", "Upper tolerance limit", num(H + 1), "mm"),
        row("Kích thước tiết diện W × H", "Section W × H", f"{num(sp['W'])} × {num(H)}", "mm"),
        row("Chiều dày cánh / bụng", "Flange / web thickness", thick, "mm"),
        row("Bo góc ngoài (đỉnh)", "Outer corner radius", f"R{num(sp.get('r_out', 0), 1)}", "mm"),
        row("Bước lỗ P (so le P/2)", "Hole pitch P (staggered P/2)", num(sp["P"]), "mm"),
        row("Đơn vị bán", "Storage unit", "Thanh", "Pce"),
        row("Quy cách đóng gói", "Packaging unit", "Theo thỏa thuận", ""),
    ])
    right = "".join([
        row("Khối lượng", "Weight", num(r["kg"], 3), "kg/thanh", star=True),
        row("Vát góc trong 45°", "Inner chamfer 45°", num(sp["chamfer"], 1), "mm"),
        row("Khuyết vòm (rộng × cao)", "Arch notch (w × h)", f"{num(sp['Wa'])} × {num(sp['Ha'], 1)}", "mm"),
        row("Lỗ tròn, tâm cách mặt ván", "Round hole, centre height", f"Ø{num(sp['d'])}, {num(sp['yh'], 1)}", "mm"),
        row("Lỗ bụng (dài × rộng)", "Web slot (L × w)", f"{num(sp['Ls'])} × {num(sp['ws'])}", "mm"),
        row("Tỷ lệ lỗ trên cánh", "Flange open area", num(r["open"]), "%", star=True),
        row("Tải phá hủy ước tính, 23&nbsp;°C", "Est. breaking load at 23&nbsp;°C", f"~{num(rnd10(r['P23']))}", "N", star=True),
        row("Tải phá hủy ước tính, 45&nbsp;°C", "Est. breaking load at 45&nbsp;°C", f"~{num(rnd10(r['P45']))}", "N", star=True),
        row("Cấp cháy (DIN 4102)", "Building material class", "Chờ thí nghiệm", ""),
        row("Vật liệu", "Material", "uPVC tái chế", ""),
    ])
    openp = num(r["open"])
    return f"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Data sheet {code}</title><style>{CSS}</style></head><body><div class="pg">
<div class="top">
  <div>
    <h1>Thanh kê cốt thép PVC chữ U có khuyết vòm, c&nbsp;=&nbsp;{H}&nbsp;mm, dài 2&nbsp;000&nbsp;mm
      <small>PVC U-channel rebar spacer with arch notches, c {H} mm, length 2000 mm</small></h1>
    <div class="item">Mã hàng / Item No. {code}</div>
  </div>
  <div class="brand"><b>HAN</b><span>CORPORATION</span></div>
</div>
<div class="mid">
  <div>
    <p class="k">Thanh kê cốt thép PVC <span style="color:#777">· PVC rebar spacers</span></p>
    <ul>
      <li>Dùng kê cốt thép cho cấu kiện nằm ngang, giữ lớp bê tông bảo vệ c&nbsp;=&nbsp;{H}&nbsp;mm.<i>For horizontal members; holds the concrete cover at c = {H} mm.</i></li>
      <li>Khuyết vòm và lỗ tròn bố trí so le giữa hai cánh để bê tông chảy qua (tỷ lệ lỗ trên cánh {openp} %).<i>Staggered arch notches and round holes let concrete flow through.</i></li>
      <li>Đùn ép biên dạng, dập lỗ liên tục; thanh cắt dài 2 000 mm.<i>Profile extrusion with continuous punching; bars cut to 2000 mm.</i></li>
    </ul>
  </div>
  <div class="photo"><img src="data:image/png;base64,{img}" alt="{code}"></div>
</div>
<h2>Thông số kỹ thuật <i>Technical Data</i></h2>
<div class="tb"><table>{left}</table><table>{right}</table></div>
<div class="note"><b>*</b> <b>{NOTE_VI}.</b><i>{NOTE_EN}</i></div>
<div class="fine">Tải phá hủy ước tính: tải tập trung qua thanh thép đặt trên thanh kê, tính bằng mô hình chưa hiệu chỉnh; chưa phải kết quả thử theo quy trình của DBV. Khối lượng tính với khối lượng riêng nhựa 1,8 g/cm³ (uPVC tái chế, có chất độn). Dung sai lớp bảo vệ ±1 mm là đề xuất, chờ thống nhất.
<br>Breaking load: point load through a rebar placed on the spacer, from an uncalibrated model; not a DBV test result. Weight uses a resin density of 1.8 g/cm³ (recycled, filled uPVC). The ±1 mm cover tolerance is proposed and to be agreed.</div>
<div class="foot"><div>HAN CORPORATION | han@hancorporation.vn</div><div>Ngày lập / Date of creation: {DATE}<br>Trang / Page 1/1</div></div>
</div></body></html>"""


def main():
    data = json.load(open(TT / "thong_so_mau_kh.json", encoding="utf-8"))
    out = HERE / "datasheet"
    out.mkdir(exist_ok=True)
    for e in data:
        r = evaluate(e["spec"])
        code = f"PVC-U{e['H']}"
        h = out / f"DataSheet_{code}.html"
        h.write_text(page(e, r), encoding="utf-8")
        pdf = out / f"DataSheet_{code}.pdf"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={pdf}", h.as_uri()], check=True, capture_output=True, timeout=120)
        h.unlink()
        print(code, f"{r['kg']:.3f} kg  {rnd10(r['P23'])}/{rnd10(r['P45'])} N ->", pdf.name)


if __name__ == "__main__":
    main()
