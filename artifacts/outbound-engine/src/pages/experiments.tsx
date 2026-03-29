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
import { FlaskConical, Plus, Zap, Trophy, AlertCircle, Clock, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  draft: { label: "Draft", icon: Clock, color: "text-gray-600", bg: "bg-gray-100" },
  active: { label: "Active", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
  paused: { label: "Paused", icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
};

const EMPTY_FORM = { name: "", hypothesis: "", variableTested: "", controlVariant: "", testVariant: "", status: "draft", startDate: "", endDate: "" };
const EMPTY_METRICS = { controlSampleSize: "", controlReplyRate: "", controlBookedRate: "", testSampleSize: "", testReplyRate: "", testBookedRate: "" };

export default function ExperimentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["experiments", filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      return apiFetch(`/api/experiments?${params}`);
    },
  });

  const experiments: any[] = data?.data || [];

  const saveMutation = useMutation({
    mutationFn: (body: any) => selected?.id
      ? apiFetch(`/api/experiments/${selected.id}`, { method: "PUT", body: JSON.stringify(body) })
      : apiFetch("/api/experiments", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["experiments"] }); setSelected(res.data); setCreateOpen(false); toast({ title: "Experiment saved" }); },
  });

  const analyzeMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => apiFetch(`/api/experiments/${id}/analyze`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["experiments"] }); setSelected(res.data); setAnalyzeOpen(false); toast({ title: "Analysis complete" }); },
    onError: () => toast({ title: "Analysis failed — check AI settings", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/experiments/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["experiments"] }); setSelected(null); toast({ title: "Deleted" }); },
  });

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setCreateOpen(true); };
  const openEdit = (exp: any) => { setForm({ name: exp.name, hypothesis: exp.hypothesis || "", variableTested: exp.variableTested || "", controlVariant: exp.controlVariant || "", testVariant: exp.testVariant || "", status: exp.status, startDate: exp.startDate ? exp.startDate.slice(0, 10) : "", endDate: exp.endDate ? exp.endDate.slice(0, 10) : "" }); setSelected(exp); setCreateOpen(true); };

  const handleSave = () => { if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; } saveMutation.mutate({ ...form, startDate: form.startDate || null, endDate: form.endDate || null }); };

  const handleAnalyze = () => {
    if (!selected) return;
    analyzeMutation.mutate({ id: selected.id, body: {
      controlMetrics: { sampleSize: metrics.controlSampleSize ? Number(metrics.controlSampleSize) : undefined, replyRate: metrics.controlReplyRate ? Number(metrics.controlReplyRate) : undefined, bookedRate: metrics.controlBookedRate ? Number(metrics.controlBookedRate) : undefined },
      testMetrics: { sampleSize: metrics.testSampleSize ? Number(metrics.testSampleSize) : undefined, replyRate: metrics.testReplyRate ? Number(metrics.testReplyRate) : undefined, bookedRate: metrics.testBookedRate ? Number(metrics.testBookedRate) : undefined },
    }});
  };

  return (
    <AppLayout title="Experiments">
      <div className="flex h-full overflow-hidden">
        {/* Sidebar list */}
        <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs rounded-xl flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 rounded-xl" onClick={openCreate}><Plus className="w-3 h-3 mr-1" /> New</Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            : experiments.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No experiments yet</p>
              </div>
            ) : experiments.map((exp) => {
              const cfg = STATUS_CONFIG[exp.status] || STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              return (
                <button key={exp.id} className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${selected?.id === exp.id ? "bg-primary/5 border-l-2 border-primary" : ""}`} onClick={() => setSelected(exp)}>
                  <div className="font-medium text-sm truncate mb-1">{exp.name}</div>
                  {exp.variableTested && <div className="text-xs text-muted-foreground mb-2 truncate">Testing: {exp.variableTested}</div>}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                    {exp.decision && <span className="text-[11px] text-muted-foreground">{exp.decision}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <FlaskConical className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select an experiment or create a new one</p>
              <Button variant="outline" className="rounded-xl" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Experiment</Button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => { const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.draft; const Icon = cfg.icon; return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</span>; })()}
                    {selected.decision && <Badge variant="outline">{selected.decision}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openEdit(selected)}>Edit</Button>
                  <Button size="sm" className="rounded-xl" onClick={() => { setMetrics(EMPTY_METRICS); setAnalyzeOpen(true); }}>
                    <Zap className="w-4 h-4 mr-1" /> AI Analysis
                  </Button>
                </div>
              </div>

              {/* Hypothesis */}
              {selected.hypothesis && (
                <Card className="rounded-2xl border-none shadow-md">
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Hypothesis</CardTitle></CardHeader>
                  <CardContent><p className="text-sm leading-relaxed">{selected.hypothesis}</p></CardContent>
                </Card>
              )}

              {/* Variants */}
              <div className="grid grid-cols-2 gap-4">
                {selected.controlVariant && (
                  <Card className="rounded-2xl border-none shadow-md border-l-4 border-l-gray-400">
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Control</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{selected.controlVariant}</p></CardContent>
                  </Card>
                )}
                {selected.testVariant && (
                  <Card className="rounded-2xl border-none shadow-md border-l-4 border-l-primary">
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Test</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{selected.testVariant}</p></CardContent>
                  </Card>
                )}
              </div>

              {/* Timeline */}
              {(selected.startDate || selected.endDate) && (
                <div className="flex gap-6 text-sm">
                  {selected.startDate && <div><span className="text-muted-foreground">Started:</span> {new Date(selected.startDate).toLocaleDateString()}</div>}
                  {selected.endDate && <div><span className="text-muted-foreground">Ended:</span> {new Date(selected.endDate).toLocaleDateString()}</div>}
                </div>
              )}

              {/* Results */}
              {selected.resultSummary && (
                <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> AI Analysis Results</CardTitle></CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{selected.resultSummary}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => deleteMutation.mutate(selected.id)} disabled={deleteMutation.isPending}>Delete Experiment</Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false); }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader><DialogTitle>{selected?.id ? "Edit Experiment" : "New Experiment"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input className="rounded-xl mt-1" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Variable Tested</Label>
              <Input className="rounded-xl mt-1" placeholder="e.g. Subject line, CTA, opening hook" value={form.variableTested} onChange={(e) => setForm(f => ({ ...f, variableTested: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Hypothesis</Label>
              <Textarea className="rounded-xl mt-1" rows={2} placeholder="If we change X, then Y will happen because Z" value={form.hypothesis} onChange={(e) => setForm(f => ({ ...f, hypothesis: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Control Variant</Label>
                <Textarea className="rounded-xl mt-1" rows={2} value={form.controlVariant} onChange={(e) => setForm(f => ({ ...f, controlVariant: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Test Variant</Label>
                <Textarea className="rounded-xl mt-1" rows={2} value={form.testVariant} onChange={(e) => setForm(f => ({ ...f, testVariant: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" className="rounded-xl mt-1" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analyze Dialog */}
      <Dialog open={analyzeOpen} onOpenChange={setAnalyzeOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader><DialogTitle>AI Experiment Analysis</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Enter your results and let AI interpret what worked and why.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Control</p>
                {[["controlSampleSize", "Sample Size"], ["controlReplyRate", "Positive Reply Rate (%)"], ["controlBookedRate", "Booked Rate (%)"]].map(([k, lbl]) => (
                  <div key={k}>
                    <Label className="text-xs">{lbl}</Label>
                    <Input type="number" className="rounded-xl mt-1" value={metrics[k as keyof typeof metrics]} onChange={(e) => setMetrics(m => ({ ...m, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test</p>
                {[["testSampleSize", "Sample Size"], ["testReplyRate", "Positive Reply Rate (%)"], ["testBookedRate", "Booked Rate (%)"]].map(([k, lbl]) => (
                  <div key={k}>
                    <Label className="text-xs">{lbl}</Label>
                    <Input type="number" className="rounded-xl mt-1" value={metrics[k as keyof typeof metrics]} onChange={(e) => setMetrics(m => ({ ...m, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAnalyzeOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending ? "Analysing..." : <><Zap className="w-4 h-4 mr-1" /> Analyse with AI</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
