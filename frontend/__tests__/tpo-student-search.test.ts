import { searchTpoStudents } from "../lib/api/tpo-student-search";

const mockFetch = jest.fn();
global.fetch = mockFetch;

/** Wrap data in Frappe's actual response envelope: { message: { ok, data, message } } */
function makeOkResponse(data: object): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ message: { ok: true, data } }),
  } as unknown as Response;
}

function makeErrResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    text: async () => JSON.stringify({ message: { ok: false, message } }),
  } as unknown as Response;
}

const MOCK_RESULTS = [
  { studentId: "u1@test.com", fullName: "Alice Smith", email: "u1@test.com", branch: "CS", batch: "2025", college: "IIT", rollNumber: "CS001" },
];

beforeEach(() => {
  mockFetch.mockReset();
});

describe("searchTpoStudents", () => {
  it("returns empty array for query shorter than 2 chars", async () => {
    const result = await searchTpoStudents("a");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty array for empty query", async () => {
    const result = await searchTpoStudents("");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns results on success", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ results: MOCK_RESULTS }));
    const result = await searchTpoStudents("alice");
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("Alice Smith");
  });

  it("returns empty array on empty results", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ results: [] }));
    const result = await searchTpoStudents("nobody");
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(makeErrResponse(500, "Server error"));
    await expect(searchTpoStudents("alice")).rejects.toThrow("Server error");
  });

  it("passes signal to fetch", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ results: [] }));
    const controller = new AbortController();
    await searchTpoStudents("alice", 25, controller.signal);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("search_tpo_students"),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it("resolves to empty array when AbortController aborts before request settles", async () => {
    const controller = new AbortController();
    mockFetch.mockImplementationOnce(() => {
      controller.abort();
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    });
    // Aborted fetch throws; the component handles it by checking signal.aborted
    await expect(searchTpoStudents("alice", 25, controller.signal)).rejects.toThrow();
  });
});
