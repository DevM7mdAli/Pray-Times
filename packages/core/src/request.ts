/**
 * A response that arrived intact but disagreed with the place it was requested
 * for. Separated from a transport failure so a surface can explain which of the
 * four checks failed, rather than blaming the network for a time zone that does
 * not match the coordinates.
 */
export type VerificationField = "date" | "coordinates" | "timeZone" | "method";

export class VerificationError extends Error {
  readonly field: VerificationField;

  constructor(field: VerificationField, message: string) {
    super(message);
    this.name = "VerificationError";
    this.field = field;
  }
}

export type FetchLike = typeof fetch;

const REQUEST_TIMEOUT_MS = 7000;

export class ProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}

export async function requestJson(url: URL, fetchImpl: FetchLike, retry = true): Promise<unknown> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const retryable = response.status >= 500;
      if (retry && retryable) return requestJson(url, fetchImpl, false);
      throw new ProviderError(`Provider request failed (${response.status})`, retryable);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (retry) return requestJson(url, fetchImpl, false);
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "The provider did not respond in time"
        : "Could not reach the provider";
    throw new ProviderError(message, true);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
