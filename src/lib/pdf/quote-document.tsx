import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { QuoteLineItem, QuoteRequest } from "@/lib/types";
import type { PdfImageSource } from "./pdf-image";

export interface QuoteDocumentItem extends Omit<QuoteLineItem, "image"> {
  image: PdfImageSource | string;
}

// Helvetica (react-pdf's built-in font) has no Vietnamese diacritics, so we
// register a Unicode font that does.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
  ],
});

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Noto Sans", color: "#1e293b" },
  title: { fontSize: 15, fontWeight: 700, textAlign: "center", marginBottom: 14 },
  paragraph: { marginBottom: 3, lineHeight: 1.4 },
  partyLine: { marginBottom: 3, lineHeight: 1.4 },
  partyLineBold: { marginBottom: 3, lineHeight: 1.4, fontWeight: 700 },
  spacer: { height: 10 },
  table: { marginTop: 16, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
  },
  thText: { color: "#0f172a", fontSize: 9, fontWeight: 700 },
  colIndex: { width: "6%", textAlign: "center" },
  colModel: { width: "15%" },
  colName: { width: "23%" },
  colImage: { width: "12%" },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "17%", textAlign: "right" },
  colTotal: { width: "17%", textAlign: "right" },
  productImage: { width: 34, height: 34, borderRadius: 4, objectFit: "cover" },
  totalsBox: { marginTop: 10, alignItems: "flex-end" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#1d4ed8",
  },
  grandTotalLabel: { fontSize: 11, fontWeight: 700 },
  grandTotalValue: { fontSize: 12, fontWeight: 700, color: "#1d4ed8" },
  noteTitle: { marginTop: 16, fontSize: 10, fontWeight: 700, color: "#0f172a" },
  noteBlock: { marginTop: 4, fontSize: 9, color: "#334155", lineHeight: 1.5 },
});

export interface QuoteDocumentProps {
  quote: QuoteRequest;
  items: QuoteDocumentItem[];
}

export function QuoteDocument({ quote, items }: QuoteDocumentProps) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const modelByProductId = new Map(quote.items.map((item) => [item.productId, item.model]));
  // getDate()/getMonth()/getFullYear() read the server's local timezone,
  // which is fine on a Vietnam-based dev machine but shifts by 7 hours on
  // Vercel (UTC) — so pin the timezone explicitly instead.
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date());
  const day = dateParts.find((p) => p.type === "day")?.value ?? "";
  const month = dateParts.find((p) => p.type === "month")?.value ?? "";
  const year = dateParts.find((p) => p.type === "year")?.value ?? "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>HỢP ĐỒNG MUA THIẾT BỊ GYM</Text>

        <Text style={styles.paragraph}>Căn cứ nhu cầu và khả năng thực hiện của 2 bên.</Text>
        <Text style={styles.paragraph}>
          Hôm nay, ngày {day} tháng {month} năm {year}. Chúng tôi gửi đến quý khách hàng chi tiết
          báo giá như sau:
        </Text>

        <Text style={styles.partyLineBold}>
          BÊN BÁN HÀNG (BÊN A): CÔNG TY TNHH ĐẦU TƯ PHÁT TRIỂN DỊCH VỤ CỘNG ĐỒNG VIỆT.
        </Text>
        <Text style={styles.partyLine}>Địa chỉ: Số 1137 Huỳnh Tấn Phát, Phú Thuận, TP.HCM.</Text>
        <Text style={styles.partyLine}>MST: 0314243469</Text>
        <Text style={styles.partyLine}>Đại diện: Trần Ngọc Châu</Text>
        <Text style={styles.partyLine}>Chức vụ: Giám đốc</Text>

        <View style={styles.spacer} />

        <Text style={styles.partyLineBold}>
          BÊN MUA HÀNG (BÊN B): ........................................
        </Text>
        <Text style={styles.partyLine}>SĐT: ........................................</Text>
        <Text style={styles.partyLine}>Địa chỉ: ........................................</Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, styles.colIndex]}>NO.</Text>
            <Text style={[styles.thText, styles.colModel]}>MODEL</Text>
            <Text style={[styles.thText, styles.colName]}>NAME</Text>
            <Text style={[styles.thText, styles.colImage]}>PHOTO</Text>
            <Text style={[styles.thText, styles.colQty]}>QTY</Text>
            <Text style={[styles.thText, styles.colUnit]}>UNIT PRICE</Text>
            <Text style={[styles.thText, styles.colTotal]}>TOTAL</Text>
          </View>
          {items.map((item, idx) => (
            <View style={styles.tableRow} key={`${item.productId}-${idx}`} wrap={false}>
              <Text style={styles.colIndex}>{idx + 1}</Text>
              <Text style={styles.colModel}>{modelByProductId.get(item.productId) ?? "-"}</Text>
              <Text style={styles.colName}>{item.name}</Text>
              <View style={styles.colImage}>
                <Image style={styles.productImage} src={item.image} />
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{formatVnd(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatVnd(item.unitPrice * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Tổng cộng</Text>
            <Text style={styles.grandTotalValue}>{formatVnd(total)}</Text>
          </View>
        </View>

        <Text style={styles.noteTitle}>NOTE:</Text>
        <Text style={styles.noteBlock}>
          Giá trên CHƯA BAO GỒM chi phí BỐC DỠ, Lắp đặt, Vận chuyển và chưa thuế VAT 8%{"\n"}
          Bên A hỗ trợ bốc hàng từ kho lên xe, hàng từ xe xuống tới chỗ lắp máy bên B tự cho người
          bốc dỡ.{"\n"}
          1. Thanh Toán: KHÔNG HOÀN CỌC VỚI BẤT KỲ TRƯỜNG HỢP NÀO{"\n"}
          {"  "}- Hàng order từ nhà máy: thanh toán 90% giá trị hợp đồng. 10% còn lại thanh toán
          ngay sau khi giao hàng.{"\n"}
          2. Thời gian giao hàng:{"\n"}
          {"  "}Hàng có sẵn: giao luôn trong vòng 1-15 ngày kể từ ngày đặt cọc.{"\n"}
          {"  "}Hàng order: khoảng 45-60 ngày kể từ ngày ký hợp đồng.{"\n"}
          3. Đóng gói: Mỗi máy trong 1 hộp gỗ dán hoặc hộp giấy.{"\n"}
          4. Lắp đặt và nghiệm thu: NGAY SAU KHI LẮP XONG{"\n"}
          5. Bảo hành tại kho: * Trường hợp máy có lỗi sẽ hướng dẫn từ xa và sẽ gửi linh kiện thay
          thế cho khách tự thay. Thay xong gửi lại bên bán phần linh kiện bị lỗi.{"\n"}
          {"  "}- Bảo hành 18 tháng đối với máy điện tử: Lỗi biến tần và màn hình.{"\n"}
          {"  "}Bảo hành 12 tháng đối với máy cơ nếu có lỗi nhà sản xuất (không bao gồm phần đệm).
          {"\n\n"}
          {"  "}- Dây cáp: sẽ gửi dây cáp về cho khách tự thay.
          {"\n\n"}
          KHÔNG BẢO HÀNH TẠ TAY, TẠ ĐĨA, TẠ LIÊN ĐÒN.{"\n"}
          6. Lưu kho: Sản phẩm phải được vận chuyển trong vòng 3 tháng, sau 3 tháng hợp đồng vô
          hiệu hóa.{"\n"}
          7. Đơn đặt hàng này có hiệu lực kể từ ngày ........ cho đến khi có thông báo bảng giá
          mới.
        </Text>
      </Page>
    </Document>
  );
}
