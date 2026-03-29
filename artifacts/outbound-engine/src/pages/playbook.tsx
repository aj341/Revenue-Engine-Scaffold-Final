import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus, Package, ExternalLink, Search, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PLAYBOOK_CATEGORIES = ["Prospecting", "Outreach", "Discovery", "Proposal", "Objection Handling", "Closing", "Onboarding", "Process", "Other"];
const ASSET_TYPES = ["Case Study", "Template", "Deck", "Video", "One-Pager", "Blog Post", "Guide", "Email", "Script", "Other"];
const FUNNEL_STAGES = ["Awareness", "Consideration", "Decision", "Retention"];

const EMPTY_PB = { category: "Prospecting", title: "", bodyMarkdown: "" };
const EMPTY_ASSET = { assetName: "", assetType: "Case Study", description: "", funnelStageBest: "", existingUrl: "", active: true };

export default function PlaybookPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState("playbook");
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [pbForm, setPbForm] = useState(EMPTY_PB);
  const [pbOpen, setPbOpen] = useState(false);
  const [assetForm, setAssetForm] = useState(EMPTY_ASSET);
  const [assetOpen, setAssetOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Playbook queries
  const { data: pbData, isLoading: pbLoading } = useQuery({
    queryKey: ["playbook-entries"],
    queryFn: () => apiFetch("/api/playbook-entries"),
  });
  const entries: any[] = pbData?.data || [];

  // Asset queries
  const { data: assetData, isLoading: assetLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => apiFetch("/api/assets"),
  });
  const assets: any[] = assetData?.data || [];

  // Playbook mutations
  const savePbMutation = useMutation({
    mutationFn: (body: any) => selectedEntry?.id
      ? apiFetch(`/api/playbook-entries/${selectedEntry.id}`, { method: "PUT", body: JSON.stringify(body) })
      : apiFetch("/api/playbook-entries", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["playbook-entries"] }); setSelectedEntry(res.data); setPbOpen(false); toast({ title: "Entry saved" }); },
  });

  const deletePbMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/playbook-entries/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["playbook-entries"] }); setSelectedEntry(null); toast({ title: "Deleted" }); },
  });

  // Asset mutations
  const saveAssetMutation = useMutation({
    mutationFn: (body: any) => editAsset?.id
      ? apiFetch(`/api/assets/${editAsset.id}`, { method: "PUT", body: JSON.stringify(body) })
      : apiFetch("/api/assets", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); setAssetOpen(false); setEditAsset(null); toast({ title: "Asset saved" }); },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); setEditAsset(null); toast({ title: "Deleted" }); },
  });

  const openEditEntry = (entry: any) => { setPbForm({ category: entry.category, title: entry.title, bodyMarkdown: entry.bodyMarkdown }); setSelectedEntry(entry); setPbOpen(true); };
  const openEditAsset = (asset: any) => { setAssetForm({ assetName: asset.assetName, assetType: asset.assetType, description: asset.description || "", funnelStageBest: asset.funnelStageBest || "", existingUrl: asset.existingUrl || "", active: asset.active }); setEditAsset(asset); setAssetOpen(true); };

  const filteredEntries = entries.filter((e) => {
    if (catFilter !== "all" && e.category !== catFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredAssets = assets.filter((a) => {
    if (typeFilter !== "all" && a.assetType !== typeFilter) return false;
    if (search && !a.assetName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group entries by category
  const grouped = filteredEntries.reduce((acc: Record<string, any[]>, e) => { (acc[e.category] = acc[e.category] || []).push(e); return acc; }, {});

  return (
    <AppLayout title="Playbook & Assets">
      <div className="flex h-full overflow-hidden">
        {/* List Panel */}
        <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
            <div className="p-3 border-b border-border">
              <TabsList className="w-full rounded-xl">
                <TabsTrigger value="playbook" className="flex-1 rounded-xl text-xs">
                  <BookOpen className="w-3.5 h-3.5 mr-1" /> Playbook
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex-1 rounded-xl text-xs">
                  <Package className="w-3.5 h-3.5 mr-1" /> Assets
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="playbook" className="flex flex-col flex-1 overflow-hidden mt-0">
              <div className="p-3 border-b border-border space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8 h-8 rounded-xl text-xs" placeholder="Search entries..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Select value={catFilter} onValueChange={setCatFilter}>
                    <SelectTrigger className="h-7 text-xs rounded-xl flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {PLAYBOOK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-xs rounded-xl" onClick={() => { setPbForm(EMPTY_PB); setSelectedEntry(null); setPbOpen(true); }}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {pbLoading ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
                : Object.entries(grouped).length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <BookOpen className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">No entries yet</p>
                  </div>
                ) : Object.entries(grouped).map(([cat, catEntries]) => (
                  <div key={cat}>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 sticky top-0">{cat}</div>
                    {catEntries.map((e) => (
                      <button key={e.id} className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 ${selectedEntry?.id === e.id ? "bg-primary/5 border-l-2 border-primary" : ""}`} onClick={() => setSelectedEntry(e)}>
                        <div className="text-sm font-medium truncate">{e.title}</div>
                        {!e.active && <Badge variant="outline" className="text-[10px] mt-0.5">Inactive</Badge>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="assets" className="flex flex-col flex-1 overflow-hidden mt-0">
              <div className="p-3 border-b border-border space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8 h-8 rounded-xl text-xs" placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-7 text-xs rounded-xl flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-xs rounded-xl" onClick={() => { setAssetForm(EMPTY_ASSET); setEditAsset(null); setAssetOpen(true); }}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {assetLoading ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
                : filteredAssets.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">No assets yet</p>
                  </div>
                ) : filteredAssets.map((asset) => (
                  <div key={asset.id} className="px-4 py-3 hover:bg-muted/50 cursor-pointer flex items-start justify-between gap-2" onClick={() => openEditAsset(asset)}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{asset.assetName}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{asset.assetType}</Badge>
                        {asset.funnelStageBest && <Badge variant="outline" className="text-[10px] bg-blue-50">{asset.funnelStageBest}</Badge>}
                        {!asset.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      </div>
                    </div>
                    {asset.existingUrl && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" onClick={(e) => { e.stopPropagation(); window.open(asset.existingUrl, "_blank"); }} />}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Playbook Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "playbook" && !selectedEntry && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <BookOpen className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select a playbook entry to read</p>
              <Button variant="outline" className="rounded-xl" onClick={() => { setPbForm(EMPTY_PB); setSelectedEntry(null); setPbOpen(true); }}><Plus className="w-4 h-4 mr-1" /> New Entry</Button>
            </div>
          )}
          {tab === "playbook" && selectedEntry && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">{selectedEntry.category}</Badge>
                  <h2 className="text-2xl font-bold">{selectedEntry.title}</h2>
                  {!selectedEntry.active && <Badge variant="secondary" className="mt-1">Inactive</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openEditEntry(selectedEntry)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl text-destructive" onClick={() => { if (confirm("Delete this entry?")) deletePbMutation.mutate(selectedEntry.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Card className="rounded-2xl border-none shadow-md">
                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{selectedEntry.bodyMarkdown}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {tab === "assets" && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select an asset from the list to edit it</p>
              <Button variant="outline" className="rounded-xl" onClick={() => { setAssetForm(EMPTY_ASSET); setEditAsset(null); setAssetOpen(true); }}><Plus className="w-4 h-4 mr-1" /> New Asset</Button>
            </div>
          )}
        </div>
      </div>

      {/* Playbook entry dialog */}
      <Dialog open={pbOpen} onOpenChange={setPbOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedEntry?.id ? "Edit Entry" : "New Playbook Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={pbForm.category} onValueChange={(v) => setPbForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLAYBOOK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Title *</Label>
                <Input className="rounded-xl mt-1" value={pbForm.title} onChange={(e) => setPbForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Content (Markdown supported)</Label>
              <Textarea className="rounded-xl mt-1 font-mono text-sm min-h-[300px]" value={pbForm.bodyMarkdown} onChange={(e) => setPbForm(f => ({ ...f, bodyMarkdown: e.target.value }))} placeholder="# Your heading&#10;&#10;Write your playbook content here. **Bold**, *italic*, lists, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPbOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={() => { if (!pbForm.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; } savePbMutation.mutate(pbForm); }} disabled={savePbMutation.isPending}>{savePbMutation.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset dialog */}
      <Dialog open={assetOpen} onOpenChange={(o) => { if (!o) { setAssetOpen(false); setEditAsset(null); } }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader><DialogTitle>{editAsset ? "Edit Asset" : "New Asset"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Asset Name *</Label>
              <Input className="rounded-xl mt-1" value={assetForm.assetName} onChange={(e) => setAssetForm(f => ({ ...f, assetName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={assetForm.assetType} onValueChange={(v) => setAssetForm(f => ({ ...f, assetType: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Best Funnel Stage</Label>
                <Select value={assetForm.funnelStageBest} onValueChange={(v) => setAssetForm(f => ({ ...f, funnelStageBest: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
                    {FUNNEL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea className="rounded-xl mt-1" rows={2} value={assetForm.description} onChange={(e) => setAssetForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input className="rounded-xl mt-1" type="url" placeholder="https://..." value={assetForm.existingUrl} onChange={(e) => setAssetForm(f => ({ ...f, existingUrl: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={assetForm.active} onCheckedChange={(v) => setAssetForm(f => ({ ...f, active: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editAsset && (
              <Button variant="destructive" className="rounded-xl mr-auto" onClick={() => { deleteAssetMutation.mutate(editAsset.id); setAssetOpen(false); }} disabled={deleteAssetMutation.isPending}>Delete</Button>
            )}
            <Button variant="outline" className="rounded-xl" onClick={() => { setAssetOpen(false); setEditAsset(null); }}>Cancel</Button>
            <Button className="rounded-xl" onClick={() => { if (!assetForm.assetName.trim()) { toast({ title: "Name required", variant: "destructive" }); return; } saveAssetMutation.mutate(assetForm); }} disabled={saveAssetMutation.isPending}>{saveAssetMutation.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
