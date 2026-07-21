import { redirect } from "next/navigation";

// July 2026: the report methodology page retired with the report line.
export default function MethodologyPage() {
  redirect("/about");
}
