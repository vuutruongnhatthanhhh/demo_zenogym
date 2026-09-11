import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { QuoteLineItem, QuoteRequest } from "@/lib/types";

// Helvetica (react-pdf's built-in font) has no Vietnamese diacritics, so we
// register a Unicode font that does.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
  ],
});

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Noto Sans", color: "#1e293b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  brand: { fontSize: 20, fontWeight: 700, color: "#1d4ed8" },
  brandSub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  quoteMeta: { alignItems: "flex-end" },
  quoteCode: { fontSize: 14, fontWeight: 700 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    marginTop: 14,
    color: "#0f172a",
    textTransform: "uppercase",
  },
  infoBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 6,
  },
  infoCol: { width: "48%" },
  infoLine: { marginBottom: 3 },
  label: { color: "#64748b" },
  table: { marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1d4ed8",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
  },
  thText: { color: "#fff", fontSize: 9, fontWeight: 700 },
  colImage: { width: "12%" },
  colName: { width: "38%" },
  colQty: { width: "12%", textAlign: "center" },
  colUnit: { width: "19%", textAlign: "right" },
  colTotal: { width: "19%", textAlign: "right" },
  productImage: { width: 34, height: 34, borderRadius: 4, objectFit: "cover" },
  totalsBox: { marginTop: 10, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", width: 220, marginBottom: 3 },
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
  note: { marginTop: 16, fontSize: 9, color: "#64748b", lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
});

export interface QuoteDocumentProps {
  quote: QuoteRequest;
  items: QuoteLineItem[];
}

export function QuoteDocument({ quote, items }: QuoteDocumentProps) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const issuedDate = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>ZenoGym</Text>
            <Text style={styles.brandSub}>Thiết bị tập gym chuyên nghiệp</Text>
            <Text style={styles.brandSub}>Email: {process.env.ADMIN_EMAIL}</Text>
          </View>
          <View style={styles.quoteMeta}>
            <Text style={styles.quoteCode}>BÁO GIÁ #{quote.code}</Text>
            <Text style={styles.brandSub}>Ngày: {issuedDate}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLine}>
              <Text style={styles.label}>Khách hàng: </Text>
              {quote.customerName}
            </Text>
            {quote.companyName ? (
              <Text style={styles.infoLine}>
                <Text style={styles.label}>Công ty: </Text>
                {quote.companyName}
              </Text>
            ) : null}
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLine}>
              <Text style={styles.label}>Điện thoại: </Text>
              {quote.customerPhone}
            </Text>
            <Text style={styles.infoLine}>
              <Text style={styles.label}>Email: </Text>
              {quote.customerEmail}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Chi tiết báo giá</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, styles.colImage]}> </Text>
            <Text style={[styles.thText, styles.colName]}>Sản phẩm</Text>
            <Text style={[styles.thText, styles.colQty]}>SL</Text>
            <Text style={[styles.thText, styles.colUnit]}>Đơn giá</Text>
            <Text style={[styles.thText, styles.colTotal]}>Thành tiền</Text>
          </View>
          {items.map((item, idx) => (
            <View style={styles.tableRow} key={`${item.productId}-${idx}`} wrap={false}>
              <View style={styles.colImage}>
                <Image style={styles.productImage} src={item.image} />
              </View>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{formatUsd(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatUsd(item.unitPrice * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Tổng cộng</Text>
            <Text style={styles.grandTotalValue}>{formatUsd(total)}</Text>
          </View>
        </View>

        {quote.quotedNote ? <Text style={styles.note}>Ghi chú: {quote.quotedNote}</Text> : null}
        <Text style={styles.note}>
          Báo giá có giá trị trong 30 ngày kể từ ngày phát hành. Giá đã bao gồm chi phí vận
          chuyển và lắp đặt tiêu chuẩn, chưa bao gồm VAT (nếu có).
        </Text>

        <Text style={styles.footer}>
          ZenoGym - Đối tác thiết bị phòng tập của bạn | Đây là bản báo giá demo phục vụ mục đích
          giới thiệu
        </Text>
      </Page>
    </Document>
  );
}
