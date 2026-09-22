// Contract party info shown on the customer-facing PDF ("HỢP ĐỒNG MUA THIẾT
// BỊ GYM") — editable by the admin in a confirmation dialog right before
// previewing/downloading/sending, so a wrong customer detail or an updated
// company detail can be fixed without leaving the page.
export interface QuotePartyInfo {
  sellerName: string;
  sellerAddress: string;
  sellerTaxId: string;
  sellerRepresentative: string;
  sellerPosition: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
}

export type SellerPartyInfo = Pick<
  QuotePartyInfo,
  "sellerName" | "sellerAddress" | "sellerTaxId" | "sellerRepresentative" | "sellerPosition"
>;

export const DEFAULT_SELLER_PARTY: SellerPartyInfo = {
  sellerName: "CÔNG TY TNHH ĐẦU TƯ PHÁT TRIỂN DỊCH VỤ CỘNG ĐỒNG VIỆT",
  sellerAddress: "Số 1137 Huỳnh Tấn Phát, Phú Thuận, TP.HCM",
  sellerTaxId: "0314243469",
  sellerRepresentative: "Trần Ngọc Châu",
  sellerPosition: "Giám đốc",
};
