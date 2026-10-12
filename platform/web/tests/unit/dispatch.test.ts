import { afterEach, describe, expect, it, vi } from "vitest";
import { startPipeline } from "@/lib/builds/dispatch";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("starting the build workflow", () => {
  it("does nothing without a token, so only the schedule runs", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "");
    expect(await startPipeline()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dispatches build-apps.yml on main", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "github_pat_test");
    expect(await startPipeline()).toBe(true);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/WEBEK-LTD/app-lms/actions/workflows/build-apps.yml/dispatches");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer github_pat_test");
    expect(JSON.parse(init.body)).toEqual({ ref: "main" });
  });

  it("never fails the request when GitHub refuses or can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "github_pat_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    expect(await startPipeline()).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await startPipeline()).toBe(false);
  });

  it("logs a malformed repository name instead of calling GitHub", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "github_pat_test");
    vi.stubEnv("GITHUB_REPOSITORY", "not a repo");
    expect(await startPipeline()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(String(error.mock.calls[0]?.[1])).toContain("GITHUB_REPOSITORY");
  });
});
