import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, company, country, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Users</h1>
      <p className="mt-2 text-sm text-navy/55">{(users ?? []).length} registered users.</p>

      {(users ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-navy/65">
          No users yet. Profiles are created automatically on first sign-in.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-navy/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(users ?? []).map((u: any) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-navy">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{u.company ?? "—"}</td>
                  <td className="px-4 py-3">{u.country ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{u.role ?? "customer"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
