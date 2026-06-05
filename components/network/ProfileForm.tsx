"use client";
import { useState, useTransition } from "react";
import { updateOwnProfile, type ProfileEdit } from "@/lib/network/profile-actions";
import type { NetworkProfile } from "@/lib/types/network";

const csv = (a?: string[] | null) => (a ?? []).join(", ");
const toArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function ProfileForm({ profile }: { profile: NetworkProfile }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const edit: ProfileEdit = {
      full_name: String(f.get("full_name") || ""),
      title: String(f.get("title") || ""),
      company: String(f.get("company") || ""),
      country: String(f.get("country") || ""),
      account_type: (String(f.get("account_type") || "") || undefined) as ProfileEdit["account_type"],
      commodities: toArr(String(f.get("commodities") || "")),
      regions_served: toArr(String(f.get("regions_served") || "")),
      languages: toArr(String(f.get("languages") || "")),
      years_active: f.get("years_active") ? Number(f.get("years_active")) : null,
      typical_deal_size: String(f.get("typical_deal_size") || "") || null,
      bio: String(f.get("bio") || "") || null,
    };
    setMsg(null); setErr(null);
    start(async () => {
      const res = await updateOwnProfile(edit);
      if (res.error) setErr(res.error);
      else setMsg("Profile saved.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="glass p-8 space-y-5">
      <h2 className="serif text-ink" style={{ fontSize: 22, fontWeight: 500 }}>Your profile</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="full_name" label="Full name" def={profile.full_name ?? ""} />
        <Input name="title" label="Title" def={profile.title ?? ""} />
        <Input name="company" label="Company" def={profile.company ?? ""} />
        <Input name="country" label="Country" def={profile.country ?? ""} />
        <div>
          <Label>Account type</Label>
          <select name="account_type" defaultValue={profile.account_type ?? ""} className="field">
            <option value="">Select…</option>
            {["buyer", "seller", "trader", "enterprise"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Input name="years_active" label="Years active" def={profile.years_active?.toString() ?? ""} type="number" />
        <Input name="commodities" label="Commodities (comma separated)" def={csv(profile.commodities)} />
        <Input name="regions_served" label="Regions served (comma separated)" def={csv(profile.regions_served)} />
        <Input name="languages" label="Languages (comma separated)" def={csv(profile.languages)} />
        <Input name="typical_deal_size" label="Typical deal size" def={profile.typical_deal_size ?? ""} />
      </div>
      <div>
        <Label>Bio</Label>
        <textarea name="bio" defaultValue={profile.bio ?? ""} rows={4} className="field" />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn-gold">{pending ? "Saving…" : "Save profile"}</button>
        {msg && <span className="text-positive text-sm">{msg}</span>}
        {err && <span className="text-negative text-sm">{err}</span>}
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mono text-[10px] text-gray-2 uppercase block mb-1.5" style={{ letterSpacing: "0.18em" }}>{children}</label>;
}
function Input({ name, label, def, type = "text" }: { name: string; label: string; def: string; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input name={name} type={type} defaultValue={def} className="field" />
    </div>
  );
}
