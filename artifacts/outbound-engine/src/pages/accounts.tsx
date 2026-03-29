import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListAccounts, useCreateAccount } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Loader2, Building2, BarChart2, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";

export default function Accounts() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; status: string; errors: string[] }>({
    current: 0, total: 0, status: "idle", errors: []
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListAccounts({ page: 1, pageSize: 50, search: search || undefined });
  const accounts = data?.data || [];

  const createMutation = useCreateAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        setIsDialogOpen(false);
        toast({ title: "Account created successfully" });
      }
    }
  });

  const getTierColor = (tier?: string | null) => {
    if (tier === 'A') return 'bg-green-100 text-green-700';
    if (tier === 'B') return 'bg-blue-100 text-blue-700';
    if (tier === 'C') return 'bg-gray-100 text-gray-700';
    return 'bg-muted text-muted-foreground';
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        companyName: formData.get("companyName") as string,
        domain: formData.get("domain") as string,
        industry: formData.get("industry") as string,
        priorityTier: formData.get("priorityTier") as string,
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === accounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map(a => a.id)));
    }
  };

  const pollUntilComplete = async (analysisId: string, timeoutMs = 180000): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const r = await fetch(`/api/analyses/${analysisId}/poll`);
        if (!r.ok) continue;
        const d = await r.json();
        const status = d.data?.status;
        if (status === "completed") return true;
        if (status === "failed") return false;
      } catch {}
    }
    return false;
  };

  const handleBulkAnalyze = async () => {
    const selected = accounts.filter(a => selectedIds.has(a.id));
    const total = selected.length;
    if (!total) return;

    setBulkProgress({ current: 0, total, status: "running", errors: [] });
    setBulkOpen(true);

    const errors: string[] = [];

    for (let i = 0; i < selected.length; i++) {
      const account = selected[i];
      const websiteUrl = (account as any).websiteUrl || (account.domain ? `https://${account.domain}` : null);

      setBulkProgress(p => ({ ...p, current: i + 1, status: `Analyzing ${account.companyName}…` }));

      if (!websiteUrl) {
        errors.push(`${account.companyName}: no website URL`);
        continue;
      }

      try {
        const r = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: websiteUrl, account_id: account.id }),
        });

        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          errors.push(`${account.companyName}: ${err.message || "Submission failed"}`);
          continue;
        }

        const result = await r.json();
        const analysisId = result.data?.id;
        if (!analysisId) { errors.push(`${account.companyName}: no analysis ID returned`); continue; }

        setBulkProgress(p => ({ ...p, status: `Waiting for ${account.companyName}… (this may take 60–90s)` }));
        const ok = await pollUntilComplete(analysisId);
        if (!ok) errors.push(`${account.companyName}: analysis timed out or failed`);
      } catch (e: any) {
        errors.push(`${account.companyName}: ${e.message}`);
      }

      if (i < selected.length - 1) {
        setBulkProgress(p => ({ ...p, status: `Pausing 10s before next analysis…` }));
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    setBulkProgress(p => ({ ...p, status: "done", errors }));
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    setSelectedIds(new Set());
  };

  const allSelected = accounts.length > 0 && selectedIds.size === accounts.length;
  const someSelected = selectedIds.size > 0;

  return (
    <AppLayout title="Accounts">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-muted/30 border-transparent focus:bg-background rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {someSelected && (
              <Button variant="outline" className="h-11 px-4 rounded-xl gap-2"
                onClick={() => { setBulkProgress({ current: 0, total: selectedIds.size, status: "idle", errors: [] }); setBulkOpen(true); handleBulkAnalyze(); }}>
                <BarChart2 className="w-4 h-4" />
                Analyze {selectedIds.size} selected
              </Button>
            )}
            {someSelected && (
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setSelectedIds(new Set())} title="Clear selection">
                <X className="w-4 h-4" />
              </Button>
            )}
            <Link href="/accounts/import">
              <Button variant="outline" className="h-11 px-4 rounded-xl">Import CSV</Button>
            </Link>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 px-6 rounded-xl shadow-md">
                  <Plus className="w-5 h-5 mr-2" />
                  New Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display">Add New Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input name="companyName" required placeholder="Acme Corp" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Domain</Label>
                    <Input name="domain" placeholder="acme.com" className="h-11 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input name="industry" placeholder="SaaS" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority Tier</Label>
                      <select name="priorityTier" className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm">
                        <option value="A">Tier A</option>
                        <option value="B">Tier B</option>
                        <option value="C">Tier C</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending} className="rounded-xl h-11 px-8">
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Table Card */}
        <Card className="rounded-2xl border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 py-4">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground py-4">Company Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Domain</TableHead>
                    <TableHead className="font-semibold text-foreground">Industry</TableHead>
                    <TableHead className="font-semibold text-foreground">Priority</TableHead>
                    <TableHead className="font-semibold text-foreground text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="w-8 h-8 opacity-20" />
                          <p>No accounts found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id} className={`hover:bg-muted/20 transition-colors ${selectedIds.has(account.id) ? "bg-primary/5" : ""}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(account.id)}
                            onCheckedChange={() => toggleSelect(account.id)}
                            aria-label={`Select ${account.companyName}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-foreground py-4">{account.companyName}</TableCell>
                        <TableCell className="text-muted-foreground">{account.domain || '—'}</TableCell>
                        <TableCell>{account.industry || '—'}</TableCell>
                        <TableCell>
                          {account.priorityTier ? (
                            <Badge className={`${getTierColor(account.priorityTier)} hover:${getTierColor(account.priorityTier)} border-none font-bold`}>
                              Tier {account.priorityTier}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Link href={`/accounts/${account.id}`}>
                            <Button variant="ghost" size="sm" className="rounded-lg hover:bg-primary/10 hover:text-primary font-semibold">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Analyze Dialog */}
        <Dialog open={bulkOpen} onOpenChange={(open) => {
          if (!open && bulkProgress.status === "running") return;
          setBulkOpen(open);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Analyze</DialogTitle>
            </DialogHeader>

            {bulkProgress.status === "idle" && (
              <p className="text-sm text-muted-foreground">Starting analysis for {bulkProgress.total} account{bulkProgress.total !== 1 ? "s" : ""}…</p>
            )}

            {bulkProgress.status === "running" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{bulkProgress.status}</p>
                    <p className="text-xs text-muted-foreground">{bulkProgress.current} of {bulkProgress.total} accounts</p>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${bulkProgress.total > 0 ? ((bulkProgress.current - 1) / bulkProgress.total) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Each analysis takes 60–90 seconds. Please don't close this window.</p>
              </div>
            )}

            {bulkProgress.status === "done" && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="font-semibold text-sm text-green-800">
                    Completed {bulkProgress.total - bulkProgress.errors.length} of {bulkProgress.total} analyses
                  </p>
                  {bulkProgress.errors.length > 0 && (
                    <p className="text-xs text-green-700 mt-1">{bulkProgress.errors.length} failed</p>
                  )}
                </div>
                {bulkProgress.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Errors:</p>
                    {bulkProgress.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{e}</p>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setBulkOpen(false)}>Done</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
