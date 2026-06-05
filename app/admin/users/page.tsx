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
      <h1
        className="serif text-ink"
        style={{ fontSize: 32, fontWeight: 500 }}
      >
        Users
      </h1>
      <p className="mt-2 text-[13px] text-gray-2">
        {(users ?? []).length} registered users.
      </p>

      {(users ?? []).length === 0 ? (
        <div className="mt-7 glass p-6 text-[13px] text-gray-2">
          No users yet. Profiles are created automatically on first sign-in.
        </div>
      ) : (
        <div className="mt-7 glass overflow-x-auto">
          <table className="w-full text-sm">
            <thead
              className="border-b border-rule text-left text-[10px] uppercase text-gray-2"
              style={{ letterSpacing: "0.22em" }}
            >
              <tr>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Company</th>
                <th className="px-4 py-4">Country</th>
                <th className="px-4 py-4">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {(users ?? []).map((u: any) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-ink">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-2">{u.company ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-2">{u.country ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-gold">
                    {u.role ?? "customer"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
