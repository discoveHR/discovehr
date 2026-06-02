import type { CollegeOption } from "./types";

export async function searchIndianColleges(query: string) {
  const response = await fetch(`/api/colleges?q=${encodeURIComponent(query)}`, {
    method: "GET",
    cache: "no-store",
  });

  const rawBody = (await response.json()) as {
    ok?: boolean;
    message?: string;
    data?: CollegeOption[];
  };

  if (!response.ok || !rawBody.ok) {
    throw new Error(rawBody.message || "Unable to search colleges.");
  }

  return rawBody.data || [];
}

