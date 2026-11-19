"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CHANNELS, EXPENSE_CATEGORIES, PROPERTIES, TEAM } from "@/lib/mock-data";
import { fmtLKR } from "@/lib/utils";
import { Avatar, Badge, Button, Card, PageHeader, Segmented } from "@/components/ui";

type Tab = "apartments" | "platforms" | "team" | "categories";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("apartments");

  return (
    <div className="max-w-4xl">
      <PageHeader title="Settings" subtitle="Apartments, booking platforms, team and categories." />
      <div className="mb-10">
        <Segmented
          id="settings"
          value={tab}
          onChange={setTab}
          options={[
            { value: "apartments", label: "Apartments" },
            { value: "platforms", label: "Platforms" },
            { value: "team", label: "Team" },
            { value: "categories", label: "Categories" },
          ]}
        />
      </div>

      {tab === "apartments" && (
        <List action="Add apartment">
          {PROPERTIES.map((p) => (
            <Row key={p.id} title={p.name} sub={`${p.location} · ${p.region} · up to ${p.maxGuests} guests`}>
              <span className="text-sm font-semibold text-neutral-500 hidden sm:block">{fmtLKR(p.baseRate)}<span className="text-neutral-400 font-medium"> / night</span></span>
              {p.status === "operating" ? <Badge tone="green" dot>Operating</Badge> : <Badge>Setting up</Badge>}
            </Row>
          ))}
        </List>
      )}

      {tab === "platforms" && (
        <List action="Add platform">
          {CHANNELS.map((c) => (
            <Row key={c.id} title={c.name} sub={c.payoutDays ? `Pays out about ${c.payoutDays} day${c.payoutDays > 1 ? "s" : ""} after check-in` : "Paid directly by the guest"} dot={c.color}>
              <span className="text-sm font-semibold">{c.commission}%<span className="text-neutral-400 font-medium"> commission</span></span>
            </Row>
          ))}
        </List>
      )}

      {tab === "team" && (
        <List action="Invite member">
          {TEAM.map((m) => (
            <Row key={m.email} title={m.name} sub={`${m.email} · ${m.scope}`} avatar={m.name}>
              <Badge tone={m.role === "Owner" ? "indigo" : "neutral"}>{m.role}</Badge>
            </Row>
          ))}
        </List>
      )}

      {tab === "categories" && (
        <List action="Add category">
          {EXPENSE_CATEGORIES.map((c) => (
            <Row key={c} title={c} />
          ))}
        </List>
      )}
    </div>
  );
}

function List({ action, children }: { action: string; children: React.ReactNode }) {
  return (
    <div>
      <Card className="divide-y divide-neutral-100">{children}</Card>
      <Button variant="secondary" className="mt-4">
        <Plus className="w-4 h-4" /> {action}
      </Button>
    </div>
  );
}

function Row({ title, sub, children, dot, avatar }: { title: string; sub?: string; children?: React.ReactNode; dot?: string; avatar?: string }) {
  return (
    <div className="flex items-center gap-4 px-6 py-5">
      {avatar && <Avatar name={avatar} />}
      {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        {sub && <p className="text-xs text-neutral-400 font-medium truncate mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-4 shrink-0">{children}</div>
    </div>
  );
}
