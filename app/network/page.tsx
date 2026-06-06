import { redirect } from "next/navigation";

// Single front door: the landing lives at "/". /network used to render a second,
// parallel landing — it now redirects so there is one homepage, with the app
// sections living under /network/listings, /network/verify, etc.
export default function NetworkIndex() {
  redirect("/");
}
