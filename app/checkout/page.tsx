import { redirect } from "next/navigation";

// Legacy shop route retired July 2026.
export default function Page() {
  redirect("/marketplace");
}
