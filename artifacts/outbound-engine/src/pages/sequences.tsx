import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, Search, Mail, Linkedin, Phone,
  ChevronRight, Trash2, Users, Layers,
  CheckCircle2, XCircle,
} from "lucide-react";

function ChannelIcon({ ch }: { ch: string }) {
  const l = (ch || "").toLowerCase();
  if (l.includes("email")) return <Mail className="w-3 h-3" />;
  if (l.includes("linkedin")) return <Linkedin className="w-3 h-3" />;
  return <Phone className="w-3 h-3" />;
}

const ICP_LIST = ["saas_founder","design_agency","ecommerce_brand","b2b_services","startup_cto","marketing_lead","enterprise_cx","solo_founder"];

export default function Sequences() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL;

  const [sequences, setSequences] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterICP, setFilterICP] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterICP) params.set("icp", filterICP);
      if (filterActive !== "all") params.set("active", filterActive === "active" ? "true" : "false");
      const r = await fetch(`/api/sequences?${params}`, { credentials: "include" });
      const d = await r.json();
      let rows = d.data || [];
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((s: any) => s.sequenceName?.toLowerCase().includes(q) || s.icp?.includes(q));
      }
      setSequences(rows);
      setTotal(rows.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterICP, filterActive]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this sequence? All assignments will be removed.")) return;
    await fetch(`/api/sequences/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Sequence deleted" });
    load();
  };

  const channelMixBadges = (seq: any) => {
    const mix = seq.channelMix as Record<string, number> | null;
    if (!mix) return null;
    return Object.entries(mix).map(([ch, n]) => (
      <span key={ch} className="flex items-center gap-1 text-xs text-muted-foreground">
        <ChannelIcon ch={ch} />{n}
      </span>
    ));
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r bg-muted/10 p-4 space-y-4">
          <Button className="w-full" size="sm" onClick={() => navigate(`${BASE}sequences/new`)}>
            <Plus className="w-4 h-4 mr-2" />New Sequence
          </Button>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Target ICP</div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="icp" checked={filterICP === ""} onChange={() => setFilterICP("")} />
                All ICPs
              </label>
              {ICP_LIST.map(icp => (
                <label key={icp} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" name="icp" checked={filterICP === icp} onChange={() => setFilterICP(icp)} />
                  {icp.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</div>
            {["all","active","inactive"].map(s => (
              <label key={s} className="flex items-center gap-2 text-xs cursor-pointer capitalize">
                <input type="radio" name="active" checked={filterActive === s} onChange={() => setFilterActive(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-background">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search sequences…" className="pl-9" value={search}
                onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} />
            </div>
            <span className="text-sm text-muted-foreground ml-auto">
              {loading ? "Loading…" : `${total} sequences`}
            </span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6">
            {!loading && sequences.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-4">No sequences yet. Build your first outreach cadence.</p>
                <Button onClick={() => navigate(`${BASE}sequences/new`)}>+ New Sequence</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sequences.map(seq => (
                  <div key={seq.id}
                    className="border rounded-xl bg-card hover:shadow-md transition-all cursor-pointer group p-5"
                    onClick={() => navigate(`${BASE}sequences/${seq.id}`)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-base truncate">{seq.sequenceName}</h3>
                          {seq.active
                            ? <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Active</Badge>
                            : <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {seq.icp && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {seq.icp.replace(/_/g, " ")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {seq.stepCount ?? 0} steps
                          </span>
                          {seq.usageCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {seq.usageCount} assigned
                            </span>
                          )}
                          {channelMixBadges(seq)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={e => handleDelete(e, seq.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Step preview */}
                    {seq.stepCount > 0 && (
                      <div className="mt-3 flex items-center gap-1">
                        {Array.from({ length: Math.min(seq.stepCount, 12) }).map((_, i) => (
                          <div key={i} className={`w-6 h-1.5 rounded-full ${i === 0 ? "bg-primary" : i < 4 ? "bg-primary/60" : "bg-muted"}`} />
                        ))}
                        {seq.stepCount > 12 && <span className="text-xs text-muted-foreground ml-1">+{seq.stepCount - 12}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
