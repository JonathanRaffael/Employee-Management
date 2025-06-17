import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const getAllForms = searchParams.get("getAllForms");
  const status = searchParams.get("status");

  if (getAllForms === "true") {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const forms = await prisma.form.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: forms });
  }

  return NextResponse.json({ error: "Missing query getAllForms=true" }, { status: 400 });
}
