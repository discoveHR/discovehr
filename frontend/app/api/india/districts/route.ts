import { NextResponse } from "next/server";

/** Open dataset (Gov. of India via igod.gov.in), mirrored on GitHub. */
const DISTRICTS_SOURCE =
  "https://raw.githubusercontent.com/KTBsomen/Indian-state-district-json/main/india-states-districts-latest.json";

type StateDistrictRow = {
  state: string;
  districts: string[];
};

let cachedRows: StateDistrictRow[] | null = null;
let cachedAt = 0;
const CACHE_MS = 24 * 60 * 60 * 1000;

async function loadRows(): Promise<StateDistrictRow[]> {
  if (cachedRows && Date.now() - cachedAt < CACHE_MS) {
    return cachedRows;
  }

  const res = await fetch(DISTRICTS_SOURCE, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`District data unavailable (${res.status})`);
  }

  const data = (await res.json()) as StateDistrictRow[];
  if (!Array.isArray(data)) {
    throw new Error("Invalid district data format");
  }

  cachedRows = data;
  cachedAt = Date.now();
  return data;
}

export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state")?.trim() ?? "";

  if (!state) {
    return NextResponse.json({ districts: [] });
  }

  try {
    const rows = await loadRows();
    const match = rows.find((row) => row.state.toLowerCase() === state.toLowerCase());
    const districts = [...(match?.districts ?? [])].sort((a, b) => a.localeCompare(b));

    return NextResponse.json(
      { state: match?.state ?? state, districts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load districts";
    return NextResponse.json({ error: message, districts: [] }, { status: 502 });
  }
}
