// Test double for next/cache: record revalidations, do nothing else.
export const revalidations: string[] = [];

export function revalidatePath(path: string): void {
  revalidations.push(path);
}

export function unstable_noStore(): void {}
