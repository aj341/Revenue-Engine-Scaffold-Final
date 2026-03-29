import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, MessageSquare, AlertCircle, CheckCircle2, SkipForward, Archive, RefreshCw, Plus, Filter, Clock, Zap, ThumbsDown, Ban, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const CLASSIFICATION_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  Positive: { label: "Positive", icon: Star, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  Neutral: { label: "Neutral", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  Negative: { label: "Negative", icon: ThumbsDown, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  "Do Not Contact": { label: "Do Not Contact", icon: Ban, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
  "Special Request": { label: "Special Request", icon: Zap, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
};

const URGENCY_CONFIG: Record<string, string> = {
  Immediate: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-gray-100 text-gray-600",
};

export default function InboxPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("unreviewed");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ replyText: "", channel: "Email", contactId: "", accountId: "", sequenceName: "", lastMessage: "" });
  const [classifying, setClassifying] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["replies", filterClass, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterClass !== "all") params.set("classification", filterClass);
      if (filterStatus !== "all") params.set("status", filterStatus);
      return apiFetch(`/api/replies?${params}`);
    },
    refetchInterval: 30000,
  });

  const replies: any[] = data?.data || [];

  const selected = replies.find((r) => r.id === selectedId) || null;

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => apiFetch(`/api/replies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["replies"] }); toast({ title: "Reply updated" }); },
  });

  const classifyMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/api/classify-reply", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["replies"] }); setAddOpen(false); setAddForm({ replyText: "", channel: "Email", contactId: "", accountId: "", sequenceName: "", lastMessage: "" }); toast({ title: "Reply classified and added to inbox" }); },
    onError: () => toast({ title: "Classification failed", variant: "destructive" }),
  });

  const markReviewed = (id: string) => updateMutation.mutate({ id, body: { reviewedAt: new Date().toISOString() } });
  const markActioned = (id: string) => updateMutation.mutate({ id, body: { actionedAt: new Date().toISOString(), reviewedAt: new Date().toISOString() } });
  const archiveReply = (id: string) => { updateMutation.mutate({ id, body: { archivedAt: new Date().toISOString() } }); setSelectedId(null); };

  const handleClassify = async () => {
    if (!addForm.replyText.trim() || !addForm.contactId || !addForm.accountId) {
      toast({ title: "Fill in all required fields", variant: "destructive" }); return;
    }
    classifyMutation.mutate({
      reply_text: addForm.replyText,
      contact_id: addForm.contactId,
      account_id: addForm.accountId,
      channel: addForm.channel,
      context: { sequence_name: addForm.sequenceName, last_message_sent: addForm.lastMessage },
    });
  };

  const counts = {
    all: replies.length,
    Positive: replies.filter((r) => r.classification === "Positive").length,
    Neutral: replies.filter((r) => r.classification === "Neutral").length,
    Negative: replies.filter((r) => r.classification === "Negative").length,
    "Do Not Contact": replies.filter((r) => r.classification === "Do Not Contact").length,
    "Special Request": replies.filter((r) => r.classification === "Special Request").length,
  };

  return (
    <AppLayout title="Reply Inbox">
      <div className="flex h-full overflow-hidden">
        {/* List Panel */}
        <div className="w-[420px] shrink-0 flex flex-col border-r border-border bg-background overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs rounded-xl flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All replies</SelectItem>
                  <SelectItem value="unreviewed">Unreviewed</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 rounded-xl" onClick={() => refetch()}>
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button size="sm" className="h-8 rounded-xl" onClick={() => setAddOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {/* Classification tabs */}
            <div className="flex gap-1 flex-wrap">
              {[["all", "All"], ["Positive", "✓ Pos"], ["Neutral", "~ Neut"], ["Negative", "✗ Neg"], ["Do Not Contact", "🚫 DNC"], ["Special Request", "⚡ Spec"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterClass(val)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${filterClass === val ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {label} {val === "all" ? `(${counts.all})` : `(${counts[val as keyof typeof counts] || 0})`}
                </button>
              ))}
            </div>
          </div>

          {/* Reply list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading replies...</div>
            ) : replies.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Inbox className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm text-muted-foreground">No replies found</p>
              </div>
            ) : (
              replies.map((reply) => {
                const cfg = CLASSIFICATION_CONFIG[reply.classification || "Neutral"] || CLASSIFICATION_CONFIG["Neutral"];
                const Icon = cfg.icon;
                const isSelected = selectedId === reply.id;
                return (
                  <button
                    key={reply.id}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-primary" : ""} ${reply.archivedAt ? "opacity-50" : ""}`}
                    onClick={() => setSelectedId(reply.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm truncate">{reply.contactName || "Unknown"}</div>
                      <div className="flex items-center gap-1 shrink-0">
                        {reply.urgency && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${URGENCY_CONFIG[reply.urgency] || ""}`}>{reply.urgency}</span>}
                        {!reply.reviewedAt && !reply.archivedAt && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1 truncate">{reply.companyName}</div>
                    <div className="text-xs text-foreground line-clamp-2 mb-2">{reply.replyText}</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(reply.receivedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select a reply to review</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{selected.contactName}</h2>
                  <p className="text-sm text-muted-foreground">{selected.contactTitle} · {selected.companyName}</p>
                </div>
                <div className="flex gap-2">
                  {!selected.reviewedAt && !selected.archivedAt && (
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => markReviewed(selected.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Reviewed
                    </Button>
                  )}
                  {!selected.actionedAt && (
                    <Button size="sm" className="rounded-xl" onClick={() => markActioned(selected.id)}>
                      <SkipForward className="w-4 h-4 mr-1" /> Mark Actioned
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => archiveReply(selected.id)}>
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Classification */}
              {selected.classification && (
                <Card className="rounded-2xl border-none shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">AI Classification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={`${CLASSIFICATION_CONFIG[selected.classification]?.bg} ${CLASSIFICATION_CONFIG[selected.classification]?.color} border`}>
                        {selected.classification}
                      </Badge>
                      {selected.urgency && <Badge variant="outline" className={URGENCY_CONFIG[selected.urgency]}>{selected.urgency} urgency</Badge>}
                      {selected.confidenceScore && <Badge variant="outline" className="bg-gray-50">{Math.round(selected.confidenceScore * 100)}% confidence</Badge>}
                    </div>
                    {selected.reasoning && <p className="text-sm text-muted-foreground">{selected.reasoning}</p>}
                    {selected.suggestedNextAction && (
                      <div className="bg-primary/5 rounded-xl p-3">
                        <p className="text-xs font-semibold text-primary mb-1">Suggested Next Action</p>
                        <p className="text-sm">{selected.suggestedNextAction}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Reply text */}
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Reply — {selected.channel}</CardTitle>
                    <span className="text-xs text-muted-foreground">{new Date(selected.receivedAt).toLocaleString()}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-xl p-4">{selected.replyText}</p>
                </CardContent>
              </Card>

              {/* Draft response */}
              {selected.draftResponse && (
                <Card className="rounded-2xl border-none shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Suggested Draft Response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed bg-green-50 rounded-xl p-4 text-green-900">{selected.draftResponse}</p>
                    <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => { navigator.clipboard.writeText(selected.draftResponse); toast({ title: "Copied to clipboard" }); }}>
                      Copy Draft
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Status */}
              <div className="text-xs text-muted-foreground flex gap-4">
                {selected.reviewedAt && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Reviewed {formatDistanceToNow(new Date(selected.reviewedAt), { addSuffix: true })}</span>}
                {selected.actionedAt && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-blue-500" /> Actioned {formatDistanceToNow(new Date(selected.actionedAt), { addSuffix: true })}</span>}
                {selected.archivedAt && <span className="flex items-center gap-1"><Archive className="w-3 h-3" /> Archived</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Reply Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Add & Classify Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact ID *</Label>
                <Input placeholder="contact id" className="rounded-xl mt-1" value={addForm.contactId} onChange={(e) => setAddForm(f => ({ ...f, contactId: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Account ID *</Label>
                <Input placeholder="account id" className="rounded-xl mt-1" value={addForm.accountId} onChange={(e) => setAddForm(f => ({ ...f, accountId: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={addForm.channel} onValueChange={(v) => setAddForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Email", "LinkedIn", "Phone", "SMS", "Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Last Message Sent (context)</Label>
              <Input placeholder="What you sent to them..." className="rounded-xl mt-1" value={addForm.lastMessage} onChange={(e) => setAddForm(f => ({ ...f, lastMessage: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Reply Text *</Label>
              <Textarea placeholder="Paste their reply here..." className="rounded-xl mt-1 min-h-[120px]" value={addForm.replyText} onChange={(e) => setAddForm(f => ({ ...f, replyText: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleClassify} disabled={classifyMutation.isPending}>
              {classifyMutation.isPending ? "Classifying..." : "Classify & Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
