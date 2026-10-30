import { NextResponse } from "next/server";
import { getRelatorioData } from "@/lib/data/relatorio-data";
import { comApi } from "@/lib/api";

export const GET = comApi(async () => {
  const data = await getRelatorioData();
  return NextResponse.json(data);
});
