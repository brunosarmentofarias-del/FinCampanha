import { NextResponse } from "next/server";
import { getRelatorioData } from "@/lib/data/relatorio-data";

export async function GET() {
  const data = await getRelatorioData();
  return NextResponse.json(data);
}
