import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, ChevronRight, ChevronLeft, DollarSign, Calendar, Trophy, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const STAGES = [
  { id: "booked", label: "Call Booked", color: "bg-blue-500", light: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  { id: "held", label: "Call Held", color: "bg-purple-500", light: "bg-purple-50 border-purple-200", text: "text-purple-700" },
  { id: "proposal_sent", label: "Proposal Sent", color: "bg-orange-500", light: "bg-orange-50 border-orange-200", text: "text-orange-700" },
  { id: "negotiating", label: "Negotiating", color: "bg-yellow-500", light: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
  { id: "closed_won", label: "Closed Won", color: "bg-green-500", light: "bg-green-50 border-green-200", text: "text-green-700" },
  { id: "closed_lost", label: "Closed Lost", color: "bg-red-400", light: "bg-red-50 border-red-200", text: "text-red-700" },
];

const STAGE_ORDER = STAGES.map((s) => s.id);

function getStageConfig(id: string) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

function OppCard({ opp, onMove, onEdit }: { opp: any; onMove: (dir: -1 | 1) => void; onEdit: () => void }) {
  const stageIdx = STAGE_ORDER.indexOf(opp.stage);
  const canBack = stageIdx > 0;
  const canFwd = stageIdx < STAGE_ORDER.length - 1;

  return (
    <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={onEdit}>
      <CardContent className="p-4 space-y-2">
        <div className="font-semibold text-sm">{opp.account?.companyName || "—"}</div>
        <div className="text-xs text-muted-foreground">{opp.contact?.fullName || opp.contact ? `${opp.contact?.firstName || ""} ${opp.contact?.lastName || ""}`.trim() : "—"}</div>
        {opp.valueEstimate && (
          <div className="flex items-center gap-1 text-xs font-semibold text-green-700">
            <DollarSign className="w-3 h-3" />{Number(opp.valueEstimate).toLocaleString()}
          </div>
        )}
        {opp.bookedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />{formatDistanceToNow(new Date(opp.bookedAt), { addSuffix: true })}
          </div>
        )}
        {opp.notes && <p className="text-xs text-muted-foreground line-clamp-2">{opp.notes}</p>}
        <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full" disabled={!canBack} onClick={(e) => { e.stopPropagation(); onMove(-1); }}>
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full" disabled={!canFwd} onClick={(e) => { e.stopPropagation(); onMove(1); }}>
            <ChevronRight className="w-3 h-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground ml-1">Move</span>
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_FORM = { accountId: "", contactId: "", stage: "booked", valueEstimate: "", notes: "", bookedAt: "" };

export default function OpportunitiesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editOpp, setEditOpp] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => apiFetch("/api/opportunities"),
  });

  const opps: any[] = data?.data || [];

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => apiFetch(`/api/opportunities/${id}`, { method: "PUT", body: JSON.stringify({ stage }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) => editOpp?.id
      ? apiFetch(`/api/opportunities/${editOpp.id}`, { method: "PUT", body: JSON.stringify(body) })
      : apiFetch("/api/opportunities", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setEditOpp(null); setCreateOpen(false); toast({ title: "Opportunity saved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/opportunities/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opportunities"] }); setEditOpp(null); toast({ title: "Deleted" }); },
  });

  const handleMove = (opp: any, dir: -1 | 1) => {
    const idx = STAGE_ORDER.indexOf(opp.stage);
    const newStage = STAGE_ORDER[idx + dir];
    if (newStage) moveMutation.mutate({ id: opp.id, stage: newStage });
  };

  const openEdit = (opp: any) => {
    setForm({ accountId: opp.accountId, contactId: opp.contactId, stage: opp.stage, valueEstimate: opp.valueEstimate || "", notes: opp.notes || "", bookedAt: opp.bookedAt ? opp.bookedAt.slice(0, 10) : "" });
    setEditOpp(opp);
  };

  const handleSave = () => {
    saveMutation.mutate({ ...form, valueEstimate: form.valueEstimate ? Number(form.valueEstimate) : null, bookedAt: form.bookedAt || null });
  };

  const totalValue = opps.filter((o) => !["closed_lost"].includes(o.stage)).reduce((s, o) => s + Number(o.valueEstimate || 0), 0);
  const wonValue = opps.filter((o) => o.stage === "closed_won").reduce((s, o) => s + Number(o.valueEstimate || 0), 0);

  return (
    <AppLayout title="Opportunities">
      <div className="p-6 h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{opps.filter(o => !["closed_lost"].includes(o.stage)).length}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${wonValue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Won Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Pipeline Value</div>
            </div>
          </div>
          <Button className="rounded-xl" onClick={() => { setForm(EMPTY_FORM); setEditOpp(null); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Opportunity
          </Button>
        </div>

        {/* Kanban */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-4 min-h-[400px]">
            {STAGES.map((stage) => {
              const stageOpps = opps.filter((o) => o.stage === stage.id);
              return (
                <div key={stage.id} className="flex flex-col gap-3">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${stage.light} border`}>
                    <span className={`text-xs font-semibold ${stage.text}`}>{stage.label}</span>
                    <span className={`text-xs font-bold ${stage.text}`}>{stageOpps.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {stageOpps.length === 0 ? (
                      <div className="border-2 border-dashed border-border rounded-2xl h-24 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground opacity-40">Empty</span>
                      </div>
                    ) : (
                      stageOpps.map((opp) => (
                        <OppCard key={opp.id} opp={opp} onMove={(dir) => handleMove(opp, dir)} onEdit={() => openEdit(opp)} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={!!(editOpp || createOpen)} onOpenChange={(o) => { if (!o) { setEditOpp(null); setCreateOpen(false); } }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>{editOpp ? "Edit Opportunity" : "Add Opportunity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Account ID</Label>
                <Input className="rounded-xl mt-1" value={form.accountId} onChange={(e) => setForm(f => ({ ...f, accountId: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Contact ID</Label>
                <Input className="rounded-xl mt-1" value={form.contactId} onChange={(e) => setForm(f => ({ ...f, contactId: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Value Estimate ($)</Label>
                <Input type="number" className="rounded-xl mt-1" value={form.valueEstimate} onChange={(e) => setForm(f => ({ ...f, valueEstimate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Call Booked Date</Label>
              <Input type="date" className="rounded-xl mt-1" value={form.bookedAt} onChange={(e) => setForm(f => ({ ...f, bookedAt: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="rounded-xl mt-1" rows={3} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editOpp && (
              <Button variant="destructive" className="rounded-xl mr-auto" onClick={() => deleteMutation.mutate(editOpp.id)} disabled={deleteMutation.isPending}>
                Delete
              </Button>
            )}
            <Button variant="outline" className="rounded-xl" onClick={() => { setEditOpp(null); setCreateOpen(false); }}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
