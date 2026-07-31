import { createClient } from "@/lib/supabase/server";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";

export const dynamic = "force-dynamic";

const th: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontFamily: "var(--f-mono)",
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  fontWeight: 600,
  borderBottom: "1px solid var(--rule-strong)",
  background: "var(--sunken)",
};

const td: React.CSSProperties = {
  padding: "11px 14px",
  fontFamily: "var(--f-mono)",
  fontSize: 12.5,
  color: "var(--ink)",
  borderTop: "1px solid var(--rule)",
  verticalAlign: "top",
};

export default async function AdminUsers() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, company, country, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = users ?? [];

  return (
    <section className="sec">
      <div className="sech">
        <div>
          <h2>
            <PonteIcon name="profile.account" size={18} />
            Users
          </h2>
          <p className="d">{rows.length} registered users.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <PonteIcon name="profile.account" size={24} />
          <div>
            <b>No users yet</b>
            <p>Profiles are created automatically on first sign-in.</p>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Company</th>
                  <th style={th}>Country</th>
                  <th style={th}>Role</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: any) => (
                  <tr key={u.id}>
                    <td style={td}>{u.full_name ?? "not given"}</td>
                    <td style={{ ...td, color: "var(--ink-2)" }}>
                      {u.company ?? "not given"}
                    </td>
                    <td style={{ ...td, color: "var(--ink-2)" }}>
                      {u.country ?? "not given"}
                    </td>
                    <td
                      style={{
                        ...td,
                        textTransform: "capitalize",
                        fontWeight: 600,
                      }}
                    >
                      {u.role ?? "customer"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
