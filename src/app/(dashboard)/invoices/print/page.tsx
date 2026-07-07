import { createClient } from "@/lib/supabase/server";
import { Tenant, Settings } from "@/types/database";
import { PrintTrigger } from "./print-trigger";
import Link from "next/link";
import { InvoiceWithRoom, sortInvoices } from "../_utils";

type FullInvoice = InvoiceWithRoom & {
  tenant: Pick<Tenant, "full_name" | "phone"> | null;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    result.push(arr.slice(i, i + size));
  return result;
}

export default async function PrintInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; ids?: string }>;
}) {
  const { month: m, year: y, ids: idsParam } = await searchParams;
  const now = new Date();
  const month = parseInt(m ?? "") || now.getMonth() + 1;
  const year = parseInt(y ?? "") || now.getFullYear();

  const supabase = await createClient();
  const [invoicesResult, { data: settingsData }] = await Promise.all([
    idsParam
      ? supabase
          .from("invoices")
          .select("*, room:rooms(floor, name), tenant:tenants(full_name, phone)")
          .in("id", idsParam.split(",").filter(Boolean))
      : supabase
          .from("invoices")
          .select("*, room:rooms(floor, name), tenant:tenants(full_name, phone)")
          .eq("month", month)
          .eq("year", year)
          .order("created_at"),
    supabase.from("settings").select("*").single(),
  ]);

  const invoices = sortInvoices(invoicesResult.data ?? []) as FullInvoice[];
  const settings = settingsData as Settings | null;
  const pairs = chunkArray(invoices, 2);

  if (invoices.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-medium">
          {idsParam ? "Không tìm thấy hóa đơn đã chọn" : `Không có hóa đơn tháng ${month}/${year}`}
        </p>
        <Link
          href="/invoices"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @page { margin: 0; }
        @media print {
          body { padding: 0 !important; }
          main { padding: 0 !important; }
          main > div { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          .invoice-slip { height: 148mm; padding: 8mm 12mm; box-sizing: border-box; overflow: hidden; }
          .invoice-cut { display: block; height: 0; border-top: 1px dashed #bbb; margin: 0; }
          .invoice-pair { page-break-after: always; break-after: page; }
          .invoice-pair:last-child { page-break-after: auto; break-after: auto; }
          .qr-col { width: 62mm !important; }
          .qr-img { width: 58mm !important; height: 58mm !important; }
        }
      `}</style>

      <PrintTrigger count={invoices.length} />
      <div className="print:hidden h-16" />

      <div>
        {pairs.map((pair, pairIdx) => (
          <div
            key={pairIdx}
            className={pairIdx < pairs.length - 1 ? "invoice-pair" : ""}
          >
            {pair.map((invoice, slipIdx) => {
              const electricUsage =
                Number(invoice.electric_end) - Number(invoice.electric_start);
              const waterUsage =
                Number(invoice.water_end) - Number(invoice.water_start);
              const showCutLine = slipIdx === 0 && pair.length === 2;
              const roomLabel = invoice?.room
                ? invoice.room.floor
                  ? `Khu ${invoice.room.floor} · ${invoice.room.name}`
                  : invoice.room.name
                : "Phòng không xác định";

              return (
                <div key={invoice.id} className="relative">
                  <div className="invoice-slip border rounded-lg p-4 mx-auto mb-3 max-w-2xl print:max-w-none print:rounded-none print:border-0 print:mx-0 print:mb-0">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "bold",
                            lineHeight: 1.2,
                          }}
                        >
                          HÓA ĐƠN TIỀN NHÀ {roomLabel ? `- ${roomLabel}` : ""}
                        </div>
                        <div style={{ fontSize: "14px", color: "#666" }}>
                          Tháng {invoice.month}/{invoice.year}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px" }}>
                          {invoice.tenant?.full_name}
                        </div>
                        <div style={{ fontSize: "14px", color: "#666" }}>
                          {invoice.tenant?.phone}
                        </div>
                      </div>
                    </div>

                    <hr className="my-2 border-gray-300" />

                    {/* Body: fee table (left) + QR column (right) */}
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "stretch",
                      }}
                    >
                      {/* Fee table */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "18px",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: "2px 0" }}>Tiền phòng</td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: "2px 0",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {invoice.room_price.toLocaleString("vi-VN")}đ
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: "2px 0", color: "#555" }}>
                                <div>⚡ Điện:</div>
                                <div style={{ paddingLeft: "30px" }}>{invoice.electric_start}→
                                {invoice.electric_end} ({electricUsage}kWh ×{" "}
                                {Number(invoice.electric_price).toLocaleString(
                                  "vi-VN",
                                )}
                                đ)</div>
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: "2px 0",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {invoice.electric_total.toLocaleString("vi-VN")}
                                đ
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: "2px 0", color: "#555" }}>
                                <div>💧 Nước:</div>
                                <div style={{ paddingLeft: "30px" }}>{invoice.water_start}→
                                {invoice.water_end} ({waterUsage}m³ ×{" "}
                                {Number(invoice.water_price).toLocaleString(
                                  "vi-VN",
                                )}
                                đ)</div>
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: "2px 0",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {invoice.water_total.toLocaleString("vi-VN")}đ
                              </td>
                            </tr>
                            {invoice.garbage_fee > 0 && (
                              <tr>
                                <td style={{ padding: "2px 0", color: "#555" }}>
                                  🗑️ Tiền rác
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    padding: "2px 0",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {invoice.garbage_fee.toLocaleString("vi-VN")}đ
                                </td>
                              </tr>
                            )}
                            {invoice.internet_fee > 0 && (
                              <tr>
                                <td style={{ padding: "2px 0", color: "#555" }}>
                                  🌐 Cáp mạng
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    padding: "2px 0",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {invoice.internet_fee.toLocaleString("vi-VN")}
                                  đ
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: "2px solid #111" }}>
                              <td
                                style={{
                                  paddingTop: "5px",
                                  fontWeight: "bold",
                                  fontSize: "18px",
                                }}
                              >
                                TỔNG CỘNG
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  paddingTop: "5px",
                                  fontWeight: "bold",
                                  fontSize: "20px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {invoice.total_amount.toLocaleString("vi-VN")}đ
                              </td>
                            </tr>
                          </tfoot>
                        </table>

                        {/* Bank info (text only, shown when no QR) */}
                        {!settings?.qr_image_url && settings?.bank_name && (
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "10px",
                              color: "#666",
                              borderTop: "1px solid #e5e7eb",
                              paddingTop: "5px",
                            }}
                          >
                            CK: {settings.bank_name} · {settings.bank_account} ·{" "}
                            {settings.bank_owner}
                          </div>
                        )}
                      </div>

                      {/* QR column — full height, border on left */}
                      {settings?.qr_image_url && (
                        <div
                          className="qr-col"
                          style={{
                            width: "115px",
                            flexShrink: 0,
                            borderLeft: "1px dashed #ccc",
                            paddingLeft: "10px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={settings.qr_image_url}
                            alt="QR"
                            className="qr-img"
                            style={{
                              width: "105px",
                              height: "105px",
                              objectFit: "contain",
                              display: "block",
                            }}
                          />
                          {settings.bank_name && (
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#444",
                                textAlign: "center",
                                lineHeight: 1.4,
                              }}
                            >
                              <div style={{ fontWeight: "bold" }}>
                                {settings.bank_name}
                              </div>
                              {settings.bank_account && (
                                <div>{settings.bank_account}</div>
                              )}
                              {settings.bank_owner && (
                                <div>{settings.bank_owner}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {invoice.note && (
                      <div
                        style={{
                          marginTop: "3px",
                          fontSize: "14px",
                          color: "#888",
                          fontStyle: "italic",
                        }}
                      >
                        * {invoice.note}
                      </div>
                    )}
                  </div>

                  {/* Cut line between the two slips */}
                  {showCutLine && (
                    <div className="invoice-cut flex items-center gap-2 px-4 my-1 max-w-2xl mx-auto print:px-0 print:max-w-none print:mx-0 print:my-0">
                      <div className="flex-1 border-t border-dashed border-gray-300 print:hidden" />
                      <span className="text-xs text-gray-400 select-none print:hidden">
                        ✂
                      </span>
                      <div className="flex-1 border-t border-dashed border-gray-300 print:hidden" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
