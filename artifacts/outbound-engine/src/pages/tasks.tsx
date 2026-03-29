import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Plus, Clock, AlertTriangle, Calendar, Tag, Building2, User } from "lucide-react";
import { formatDistanceToNow, isPast, isToday, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  high: { label: "High", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  low: { label: "Low", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

const TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-up", call: "Call", email: "Email", linkedin: "LinkedIn",
  proposal: "Proposal", research: "Research", other: "Other",
};

const VIEWS = [
  { id: "open", label: "Open" },
  { id: "today", label: "Due Today" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
];

const EMPTY_FORM = { title: "", description: "", type: "follow_up", priority: "medium", dueAt: "", accountId: "", contactId: "" };

export default function TasksPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState("open");
  const [editTask, setEditTask] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", view],
    queryFn: () => {
      const params = new URLSearchParams();
      if (view === "open" || view === "today" || view === "overdue") params.set("status", "open");
      if (view === "completed") params.set("status", "completed");
      if (view === "today" || view === "overdue") params.set("view", view);
      return apiFetch(`/api/tasks?${params}`);
    },
    refetchInterval: 15000,
  });

  const tasks: any[] = data?.data || [];

  const saveMutation = useMutation({
    mutationFn: (body: any) => editTask?.id
      ? apiFetch(`/api/tasks/${editTask.id}`, { method: "PUT", body: JSON.stringify(body) })
      : apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setEditTask(null); setCreateOpen(false); toast({ title: "Task saved" }); },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify({ status: "completed" }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast({ title: "Task completed" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setEditTask(null); toast({ title: "Deleted" }); },
  });

  const openEdit = (task: any) => {
    setForm({ title: task.title, description: task.description || "", type: task.type, priority: task.priority, dueAt: task.dueAt ? task.dueAt.slice(0, 16) : "", accountId: task.accountId || "", contactId: task.contactId || "" });
    setEditTask(task);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    saveMutation.mutate({ ...form, dueAt: form.dueAt || null });
  };

  const getDueLabel = (task: any) => {
    if (!task.dueAt) return null;
    const dt = parseISO(task.dueAt);
    if (isPast(dt) && task.status !== "completed") return { label: "Overdue", cls: "text-red-600" };
    if (isToday(dt)) return { label: "Due today", cls: "text-orange-600" };
    return { label: formatDistanceToNow(dt, { addSuffix: true }), cls: "text-muted-foreground" };
  };

  return (
    <AppLayout title="Tasks">
      <div className="p-6 h-full overflow-auto">
        {/* Views */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === v.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v.label}
                {v.id !== "completed" && (
                  <span className={`ml-1.5 text-xs ${view === v.id ? "text-primary" : "text-muted-foreground"}`}>{tasks.length}</span>
                )}
              </button>
            ))}
          </div>
          <Button className="rounded-xl" onClick={() => { setForm(EMPTY_FORM); setEditTask(null); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Task
          </Button>
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No tasks here</p>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(true)}>Create a task</Button>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {tasks.map((task) => {
              const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
              const dueLabel = getDueLabel(task);
              const isCompleted = task.status === "completed";

              return (
                <Card key={task.id} className={`rounded-2xl border shadow-sm hover:shadow-md transition-all ${isCompleted ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => !isCompleted && completeMutation.mutate(task.id)}
                          className="rounded-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(task)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pCfg.color}`}>{pCfg.label}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_LABELS[task.type] || task.type}</span>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {task.companyName && <span className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3" />{task.companyName}</span>}
                          {task.contactName && <span className="flex items-center gap-1 text-muted-foreground"><User className="w-3 h-3" />{task.contactName}</span>}
                          {dueLabel && (
                            <span className={`flex items-center gap-1 ${dueLabel.cls}`}>
                              <Clock className="w-3 h-3" />{dueLabel.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={!!(createOpen || editTask)} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTask(null); } }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input className="rounded-xl mt-1" placeholder="What needs to be done?" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Due Date & Time</Label>
              <Input type="datetime-local" className="rounded-xl mt-1" value={form.dueAt} onChange={(e) => setForm(f => ({ ...f, dueAt: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Account ID</Label>
                <Input className="rounded-xl mt-1" placeholder="optional" value={form.accountId} onChange={(e) => setForm(f => ({ ...f, accountId: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Contact ID</Label>
                <Input className="rounded-xl mt-1" placeholder="optional" value={form.contactId} onChange={(e) => setForm(f => ({ ...f, contactId: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea className="rounded-xl mt-1" rows={3} placeholder="Optional details..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editTask && (
              <Button variant="destructive" className="rounded-xl mr-auto" onClick={() => deleteMutation.mutate(editTask.id)} disabled={deleteMutation.isPending}>Delete</Button>
            )}
            <Button variant="outline" className="rounded-xl" onClick={() => { setCreateOpen(false); setEditTask(null); }}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
