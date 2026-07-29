// Optional Sumsub KYB sandbox adapter.
//
// This module provides signed API transport, a safe credential probe and the
// minimal company-applicant creation needed for a controlled sandbox trial. It
// is not called by Ponte's live verification route. Production activation must
// follow contract, privacy/DPA and workflow approval.

import { createHmac } from "node:crypto";

const DEFAULT_BASE = "https://api.sumsub.com";
const TIMEOUT_MS = 20_000;

export type SumsubCompanyApplicantInput = {
  externalUserId: string;
  companyName: string;
  registrationNumber: string;
  country: string; // ISO alpha-3, as required by Sumsub companyInfo
  levelName?: string;
};

export type SumsubResponse<T = unknown> = {
  available: boolean;
  authenticated: boolean;
  status: number;
  reason?: string;
  data?: T;
  checkedAt: string;
};

export function isSumsubConfigured(): boolean {
  return Boolean(process.env.SUMSUB_APP_TOKEN && process.env.SUMSUB_SECRET_KEY);
}

export function signSumsubRequest(input: {
  secret: string;
  timestamp: string;
  method: string;
  path: string;
  body?: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(
      input.timestamp +
        input.method.toUpperCase() +
        input.path +
        (input.body ?? ""),
    )
    .digest("hex");
}

/**
 * Safe, read-only credential check. A 404 is a successful authentication: the
 * deliberately improbable external user id is expected not to exist.
 */
export async function checkSumsubCredentials(): Promise<SumsubResponse> {
  const externalUserId = `ponte-provider-check-${new Date().toISOString().slice(0, 10)}`;
  const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`;
  return sumsubRequest("GET", path, undefined, [200, 404]);
}

export async function createSumsubCompanyApplicant(
  input: SumsubCompanyApplicantInput,
): Promise<SumsubResponse> {
  const levelName = input.levelName?.trim() || process.env.SUMSUB_KYB_LEVEL?.trim();
  if (!levelName) {
    return {
      available: false,
      authenticated: false,
      status: 0,
      reason: "Sumsub company applicant not created, SUMSUB_KYB_LEVEL is not configured",
      checkedAt: new Date().toISOString(),
    };
  }

  const path = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
  return sumsubRequest("POST", path, {
    externalUserId: input.externalUserId,
    type: "company",
    fixedInfo: {
      companyInfo: {
        companyName: input.companyName,
        registrationNumber: input.registrationNumber,
        country: input.country.toUpperCase(),
      },
    },
  });
}

async function sumsubRequest(
  method: "GET" | "POST",
  path: string,
  payload?: unknown,
  acceptedStatuses: number[] = [200, 201],
): Promise<SumsubResponse> {
  const checkedAt = new Date().toISOString();
  const token = process.env.SUMSUB_APP_TOKEN;
  const secret = process.env.SUMSUB_SECRET_KEY;
  if (!token || !secret) {
    return {
      available: false,
      authenticated: false,
      status: 0,
      reason: "Sumsub not checked, app token or secret key is missing",
      checkedAt,
    };
  }

  const body = payload === undefined ? "" : JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signSumsubRequest({ secret, timestamp, method, path, body });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${process.env.SUMSUB_BASE_URL?.trim() || DEFAULT_BASE}${path}`, {
      method,
      headers: {
        "X-App-Token": token,
        "X-App-Access-Ts": timestamp,
        "X-App-Access-Sig": signature,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body || undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    const data = await readBody(res);
    const authenticated = res.status !== 401 && res.status !== 403;
    if (!acceptedStatuses.includes(res.status)) {
      return {
        available: false,
        authenticated,
        status: res.status,
        reason:
          res.status === 401 || res.status === 403
            ? `Sumsub rejected the app token or signature (HTTP ${res.status})`
            : `Sumsub returned HTTP ${res.status} ${res.statusText}`.trim(),
        data,
        checkedAt,
      };
    }

    return {
      available: true,
      authenticated,
      status: res.status,
      data,
      checkedAt,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      available: false,
      authenticated: false,
      status: 0,
      reason: timedOut
        ? `Sumsub timed out after ${TIMEOUT_MS / 1000} seconds`
        : `Sumsub request failed: ${err instanceof Error ? err.message : "unknown error"}`,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text.slice(0, 1_000);
  }
}
