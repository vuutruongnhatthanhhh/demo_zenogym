import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { QuoteRequest } from "@/lib/types";
import type { PdfImageSource } from "./pdf-image";

// Helvetica (react-pdf's built-in font) has no Vietnamese diacritics, so we
// register a Unicode font that does.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Noto Sans", color: "#1e293b" },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
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
  colIndex: { width: "8%", textAlign: "center" },
  colImage: { width: "14%" },
  colModel: { width: "24%" },
  colName: { width: "40%" },
  colQty: { width: "14%", textAlign: "center" },
  productImage: { width: 34, height: 34, borderRadius: 4, objectFit: "cover" },
});

export interface QuoteRequestDocumentProps {
  quote: QuoteRequest;
  // Resolved in parallel with `quote.items` (same index), since <Image>
  // can't decode the WebP URLs stored on each item directly.
  images: (PdfImageSource | null)[];
}

export function QuoteRequestDocument({ quote, images }: QuoteRequestDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, styles.colIndex]}>No.</Text>
            <Text style={[styles.thText, styles.colImage]}> </Text>
            <Text style={[styles.thText, styles.colModel]}>Model</Text>
            <Text style={[styles.thText, styles.colName]}>Name</Text>
            <Text style={[styles.thText, styles.colQty]}>Qty</Text>
          </View>
          {quote.items.map((item, idx) => (
            <View style={styles.tableRow} key={`${item.productId}-${idx}`} wrap={false}>
              <Text style={styles.colIndex}>{idx + 1}</Text>
              <View style={styles.colImage}>
                <Image style={styles.productImage} src={images[idx] ?? item.image} />
              </View>
              <Text style={styles.colModel}>{item.model}</Text>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
