import { NextRequest, NextResponse } from "next/server";

type HipolabsUniversity = {
  name?: string;
  "state-province"?: string | null;
  web_pages?: string[];
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") || "";
  const query = rawQuery.trim();

  if (query.length < 2) {
    return NextResponse.json({
      ok: true,
      data: [],
    });
  }

  try {
    const upstream = await fetch(
      `http://universities.hipolabs.com/search?country=India&name=${encodeURIComponent(query)}`,
      { cache: "no-store" },
    );

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "College API unavailable.",
        },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as HipolabsUniversity[];

    const colleges = data
      .map((item) => ({
        name: item.name || "",
        stateProvince: item["state-province"] || undefined,
        website: item.web_pages?.[0],
      }))
      .filter((item) => Boolean(item.name))
      .slice(0, 20);

    return NextResponse.json({
      ok: true,
      data: colleges,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to fetch college list.",
      },
      { status: 500 },
    );
  }
}
