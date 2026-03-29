import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, Upload, Search, LayoutGrid, LayoutList,
  Mail, Linkedin, Phone, CheckCircle2, XCircle,
  Edit2, Trash2, Copy, ChevronRight,
} from "lucide-react";

const ISSUE_CODES = [
  "unclear_cta","weak_hero","no_social_proof","poor_value_prop","bad_mobile",
  "slow_load","confusing_nav","weak_copy","missing_trust","no_personalization",
  "poor_seo","weak_design","no_analytics","poor_conversion","unclear_pricing","weak_testimonials",
];
const ISSUE_LABELS: Record<string, string> = {
  unclear_cta: "Unclear CTA", weak_hero: "Weak Hero", no_social_proof: "No Social Proof",
  poor_value_prop: "Poor Value Prop", bad_mobile: "Bad Mobile", slow_load: "Slow Load",
  confusing_nav: "Confusing Nav", weak_copy: "Weak Copy", missing_trust: "Missing Trust",
  no_personalization: "No Personalization", poor_seo: "Poor SEO", weak_design: "Weak Design",
  no_analytics: "No Analytics", poor_conversion: "Poor Conversion", unclear_pricing: "Unclear Pricing",
  weak_testimonials: "Weak Testimonials",
};
const ICP_LIST = ["saas_founder","design_agency","ecommerce_brand","b2b_services","startup_cto","marketing_lead","enterprise_cx","solo_founder"];
const CHANNELS = ["Email","LinkedIn","Phone"];

function ChannelIcon({ ch }: { ch: string }) {
  const l = ch.toLowerCase();
  if (l.includes("email")) return <Mail className="w-3 h-3" />;
  if (l.includes("linkedin")) return <Linkedin className="w-3 h-3" />;
  return <Phone className="w-3 h-3" />;
}

export default function Insights() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [view, setView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [filterIssues, setFilterIssues] = useState<string[]>([]);
  const [filterICPs, setFilterICPs] = useState<string[]>([]);
  const [filterChannels, setFilterChannels] = useState<string[]>([]);
  const [filterActive, setFilterActive] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [insights, setInsights] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const pageSize = 20;

  const BASE = import.meta.env.BASE_URL;

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (filterIssues.length) params.set("issueCode", filterIssues.join(","));
    if (filterICPs.length) params.set("icp", filterICPs.join(","));
    if (filterChannels.length) params.set("channel", filterChannels.join(","));
    if (filterActive !== "all") params.set("active", filterActive === "active" ? "true" : "false");
    try {
      const r = await fetch(`/api/insights?${params}`, { credentials: "include" });
      const d = await r.json();
      setInsights(d.data || []);
      setTotal(d.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(); });

  const toggle = (list: string[], setList: (v: string[]) => void, val: string) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const parsed = JSON.parse(importText);
      const blocks = parsed.insight_blocks || (Array.isArray(parsed) ? parsed : [parsed]);
      const r = await fetch("/api/insights/bulk-import", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insight_blocks: blocks }),
      });
      const d = await r.json();
      toast({ title: "Import complete", description: `Imported ${d.data?.imported}, skipped ${d.data?.skipped} duplicates` });
      setShowImport(false);
      setImportText("");
      load();
    } catch {
      toast({ variant: "destructive", title: "Import failed", description: "Invalid JSON format" });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this insight? This cannot be undone.")) return;
    await fetch(`/api/insights/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Insight deleted" });
    load();
  };

  const handleDuplicate = async (insight: any) => {
    const { id, createdAt, updatedAt, ...data } = insight;
    await fetch("/api/insights", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, shortInsightLine: data.shortInsightLine + " (copy)" }),
    });
    toast({ title: "Duplicated" });
    load();
  };

  const channels = (row: any): string[] => {
    const sc = row.suitableChannels;
    if (Array.isArray(sc)) return sc;
    if (typeof sc === "string") return [sc];
    return [];
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r bg-muted/20 p-4 flex flex-col gap-4 overflow-y-auto">
          <Button className="w-full" size="sm" onClick={() => navigate(`${BASE}insights/new`)}>
            <Plus className="w-4 h-4 mr-2" /> New Insight
          </Button>
          <Button variant="outline" className="w-full" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" /> Bulk Import JSON
          </Button>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Issue Code</div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {ISSUE_CODES.map(code => (
                <label key={code} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={filterIssues.includes(code)} onChange={() => toggle(filterIssues, setFilterIssues, code)} />
                  {ISSUE_LABELS[code]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">ICP</div>
            <div className="space-y-1">
              {ICP_LIST.map(icp => (
                <label key={icp} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={filterICPs.includes(icp)} onChange={() => toggle(filterICPs, setFilterICPs, icp)} />
                  {icp.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Channel</div>
            <div className="space-y-1">
              {CHANNELS.map(ch => (
                <label key={ch} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={filterChannels.includes(ch)} onChange={() => toggle(filterChannels, setFilterChannels, ch)} />
                  {ch}
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

          <Button size="sm" onClick={() => { setPage(1); load(); }}>Apply Filters</Button>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-background">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search insights..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && load()} />
            </div>
            <span className="text-sm text-muted-foreground ml-auto">
              {loading ? "Loading…" : `${total} insight blocks`}
            </span>
            <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" onClick={() => setView("table")}>
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button variant={view === "card" ? "secondary" : "ghost"} size="icon" onClick={() => setView("card")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {insights.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-muted-foreground mb-4">No insight blocks yet. Create one or import seed data.</p>
                <div className="flex gap-3">
                  <Button onClick={() => navigate(`${BASE}insights/new`)}>+ New Insight</Button>
                  <Button variant="outline" onClick={() => setShowImport(true)}>Import JSON</Button>
                </div>
              </div>
            ) : view === "table" ? (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Short Insight Line</th>
                      <th className="px-4 py-3 text-left font-medium">Issue</th>
                      <th className="px-4 py-3 text-left font-medium">ICP</th>
                      <th className="px-4 py-3 text-left font-medium">Channels</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {insights.map(row => (
                      <tr key={row.id} className="hover:bg-muted/30 cursor-pointer group"
                        onClick={() => navigate(`${BASE}insights/${row.id}`)}>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate font-medium">{row.shortInsightLine}</p>
                          {row.businessConsequence && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{row.businessConsequence}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{ISSUE_LABELS[row.issueCode] || row.issueCode}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.icp?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {channels(row).map((ch: string) => (
                              <span key={ch} className="text-muted-foreground"><ChannelIcon ch={ch} /></span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.active
                            ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 className="w-3 h-3" />Active</span>
                            : <span className="flex items-center gap-1 text-muted-foreground text-xs"><XCircle className="w-3 h-3" />Inactive</span>}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${BASE}insights/${row.id}`)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(row)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(row.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map(row => (
                  <div key={row.id} className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => navigate(`${BASE}insights/${row.id}`)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-sm line-clamp-2">{row.shortInsightLine}</p>
                      {row.active
                        ? <Badge className="text-xs bg-green-100 text-green-700 border-green-200 shrink-0">Active</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Inactive</Badge>}
                    </div>
                    {row.businessConsequence && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{row.businessConsequence}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs">{ISSUE_LABELS[row.issueCode] || row.issueCode}</Badge>
                      {row.icp && <Badge variant="outline" className="text-xs">{row.icp.replace(/_/g, " ")}</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 text-muted-foreground">
                        {channels(row).map((ch: string) => <ChannelIcon key={ch} ch={ch} />)}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
                <span>Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); load(); }}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => { setPage(p => p + 1); load(); }}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Import Insight Blocks</h2>
            <p className="text-sm text-muted-foreground mb-4">Paste JSON with an <code>insight_blocks</code> array. Duplicates are skipped.</p>
            <textarea
              className="w-full h-48 rounded-xl border border-input bg-background p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={'{\n  "insight_blocks": [\n    { "short_insight_line": "...", ... }\n  ]\n}'}
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => { setShowImport(false); setImportText(""); }}>Cancel</Button>
              <Button onClick={doImport} disabled={importing || !importText.trim()}>
                {importing ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
