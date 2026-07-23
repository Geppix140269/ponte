// Test double for next/server. NextResponse.json returns a tiny response whose
// status and parsed body the test can read; NextRequest is unused at runtime.
/* eslint-disable @typescript-eslint/no-explicit-any */

export class NextResponse {
  static json(body: any, init?: { status?: number }) {
    return {
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    };
  }
}

export class NextRequest {}
