import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Mail, Linkedin, Phone, Send, SkipForward, Pause,
  AlertCircle, Calendar, Building2, User, Layers,
  RefreshCw, ChevronRight,
} from "lucide-react";

type QueueFilter = "all" | "today" | "overdue" | "week";

function ChannelIcon({ ch }: { ch: string }) {
  const l = (ch || "").toLowerCase();
  if (l === "email") return <Mail className="w-4 h-4" />;
  if (l === "linkedin") return <Linkedin className="w-4 h-4" />;
  return <Phone className="w-4 h-4" />;
}

function ChannelBadge({ ch }: { ch: string }) {
  const l = (ch || "").toLowerCase();
  const colors: Record<string, string> = {
    email: "bg-blue-100 text-blue-700 border-blue-200",
    linkedin: "bg-indigo-100 text-indigo-700 border-indigo-200",
    phone: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${colors[l] || "bg-muted text-muted-foreground"}`}>
      <ChannelIcon ch={ch} />{ch}
    </span>
  );
}

function formatDueDate(dt: string) {
  const d = new Date(dt);
  const now = new Date();
  const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 0) return { label: "Due today", overdue: false };
  if (diff === 1) return { label: "Due tomorrow", overdue: false };
  return { label: `Due in ${diff}d`, overdue: false };
}

type ActionType = "send" | "skip" | "pause";

export default function Queue() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const BASE = import.meta.env.BASE_URL;

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [channelFilter, setChannelFilter] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState<any | null>(null);
  const [sendNotes, setSendNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (channelFilter) params.set("channel", channelFilter);
      const r = await fetch(`/api/execution-queue?${params}`, { credentials: "include" });
      const d = await r.json();
      setItems(d.data || []);
      setTotal(d.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, channelFilter]);

  const doAction = async (id: string, action: ActionType, notes?: string) => {
    setActioning(id);
    try {
      const r = await fetch(`/api/execution-queue/${id}/${action}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error("Action failed");

      const messages: Record<ActionType, string> = {
        send: d.completed ? "Step sent — sequence completed!" : `Step sent. Moving to step ${d.nextStep}.`,
        skip: "Step skipped.",
        pause: "Sequence paused.",
      };
      toast({ title: messages[action] });
      setSendModal(null);
      setSendNotes("");
      load();
    } catch {
      toast({ variant: "destructive", title: "Action failed. Please try again." });
    } finally {
      setActioning(null);
    }
  };

  const filters: { key: QueueFilter; label: string }[] = [
    { key: "all", label: "All Due" },
    { key: "today", label: "Today" },
    { key: "overdue", label: "Overdue" },
    { key: "week", label: "This Week" },
  ];

  const overdueCount = items.filter(i => new Date(i.dueDate) < new Date()).length;
  const todayCount = items.filter(i => {
    const d = new Date(i.dueDate);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    return d >= new Date() && d <= todayEnd;
  }).length;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-background">
          <h1 className="text-lg font-semibold">Execution Queue</h1>

          {/* Summary badges */}
          <div className="flex items-center gap-2 ml-4">
            {overdueCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                <AlertCircle className="w-3 h-3" />{overdueCount} overdue
              </Badge>
            )}
            {todayCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                <Calendar className="w-3 h-3" />{todayCount} due today
              </Badge>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-4">
            {["","email","linkedin","phone"].map(ch => (
              <button key={ch} onClick={() => setChannelFilter(ch)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm border transition-colors ${channelFilter === ch ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}>
                {ch === "" ? "All" : <><ChannelIcon ch={ch} />{ch.charAt(0).toUpperCase() + ch.slice(1)}</>}
              </button>
            ))}
          </div>

          <span className="text-sm text-muted-foreground ml-auto">
            {loading ? "Loading…" : `${total} tasks`}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {!loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Queue is clear!</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {filter === "today" ? "No messages due today." : filter === "overdue" ? "No overdue messages." : "No active sequences in the queue."}
              </p>
              <Button className="mt-4" variant="outline" onClick={() => navigate(`${BASE}sequences`)}>
                View Sequences
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => {
                const due = formatDueDate(item.dueDate);
                const busy = actioning === item.id;
                return (
                  <div key={item.id} className={`px-6 py-4 hover:bg-muted/20 transition-colors ${due.overdue ? "border-l-4 border-l-red-400" : ""}`}>
                    <div className="flex items-start gap-4">
                      {/* Channel indicator */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        (item.channel || "").toLowerCase() === "email" ? "bg-blue-100 text-blue-600" :
                        (item.channel || "").toLowerCase() === "linkedin" ? "bg-indigo-100 text-indigo-600" :
                        "bg-green-100 text-green-600"
                      }`}>
                        <ChannelIcon ch={item.channel} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-sm truncate">{item.companyName || "Unknown Company"}</span>
                              <ChannelBadge ch={item.channel} />
                              <span className={`text-xs font-medium ${due.overdue ? "text-red-600" : "text-amber-600"}`}>
                                {due.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mb-2">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />{item.contactName || "All Contacts"}
                              </span>
                              {item.contactEmail && (
                                <span className="truncate max-w-xs">{item.contactEmail}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />Step {item.currentStep}/{item.totalSteps}
                              </span>
                            </div>

                            {/* Sequence + objective */}
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{item.sequenceName}</span>
                              {item.objective && <> · <span>{item.objective}</span></>}
                            </div>
                            {item.angle && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{item.angle}"</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" className="gap-1.5" disabled={busy}
                              onClick={() => navigate(`${BASE}accounts/${item.accountId}`)}>
                              <Building2 className="w-3 h-3" />View
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" disabled={busy}
                              onClick={() => doAction(item.id, "skip")}>
                              <SkipForward className="w-3 h-3" />Skip
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50" disabled={busy}
                              onClick={() => doAction(item.id, "pause")}>
                              <Pause className="w-3 h-3" />Pause
                            </Button>
                            <Button size="sm" className="gap-1.5" disabled={busy}
                              onClick={() => setSendModal(item)}>
                              {busy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              Send
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Send Confirmation Modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-1">Mark Step as Sent</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Confirming you have sent the <strong>{sendModal.channel}</strong> outreach to{" "}
              <strong>{sendModal.contactName}</strong> at <strong>{sendModal.companyName}</strong>.
            </p>

            <div className="rounded-xl bg-muted/40 border p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sequence:</span>
                <span className="font-medium">{sendModal.sequenceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Step:</span>
                <span>{sendModal.currentStep} of {sendModal.totalSteps}</span>
              </div>
              {sendModal.objective && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Objective:</span>
                  <span className="text-right max-w-[60%]">{sendModal.objective}</span>
                </div>
              )}
            </div>

            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <textarea
              className="w-full h-20 rounded-xl border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring mb-4"
              placeholder="Add any notes about this outreach…"
              value={sendNotes} onChange={e => setSendNotes(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setSendModal(null); setSendNotes(""); }}>Cancel</Button>
              <Button onClick={() => doAction(sendModal.id, "send", sendNotes)}
                disabled={actioning === sendModal.id}>
                <Send className="w-3 h-3 mr-1.5" />
                {actioning === sendModal.id ? "Confirming…" : "Confirm Sent"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
