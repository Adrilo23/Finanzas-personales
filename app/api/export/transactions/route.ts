import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server"; // ajusta al nombre real de tu helper

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const account = sp.get("account");
  const category = sp.get("category");
  const from = sp.get("from");
  const to = sp.get("to");

  let q = supabase
    .from("transactions")
    .select("transaction_date, description, amount_cents, currency, accounts(name), categories(name, type)")
    .is("deleted_at", null)
    .order("transaction_date", { ascending: true });

  if (account) q = q.eq("account_id", account);
  if (category) q = q.eq("category_id", category);
  if (from) q = q.gte("transaction_date", from);
  if (to) q = q.lte("transaction_date", to);

  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Movimientos");
  ws.columns = [
    { header: "Fecha", key: "date", width: 12 },
    { header: "Descripción", key: "desc", width: 36 },
    { header: "Cuenta", key: "account", width: 20 },
    { header: "Categoría", key: "category", width: 20 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "Importe", key: "amount", width: 14, style: { numFmt: '#,##0.00 "€"' } },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const t of data ?? []) {
    ws.addRow({
      date: new Date(t.transaction_date),
      desc: t.description,
      account: (t.accounts as any)?.name,
      category: (t.categories as any)?.name,
      type: (t.categories as any)?.type,
      amount: t.amount_cents / 100, // solo en el borde de exportación
    });
  }

  const last = (data?.length ?? 0) + 1;
  ws.addRow({ desc: "Total", amount: { formula: `SUM(F2:F${last})` } }).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimientos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}