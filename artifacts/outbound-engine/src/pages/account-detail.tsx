import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useGetAccount, useUpdateAccount, useDeleteAccount, useListContacts, useCreateOpportunity } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Building2, Globe, MapPin, Users, Target, BarChart2, Activity, TrendingUp,
  ChevronRight, Plus, RefreshCw, Mail, Phone, Edit, Trash2, ExternalLink, Zap, FileText, Calendar
} from "lucide-react";

const SCORE_COLOR = (s: number) => s >= 75 ? "text-green-600" : s >= 50 ? "text-yellow-600" : "text-red-500";
const FIT_BG = (s: number) => s >= 75 ? "bg-green-50 border-green-200" : s >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
const TIER_COLORS: Record<string, string> = {
  strategic: "bg-purple-100 text-purple-800",
  high: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-600",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  queued: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  replied: "bg-emerald-100 text-emerald-700",
  booked: "bg-purple-100 text-purple-700",
  held: "bg-indigo-100 text-indigo-700",
  closed_won: "bg-green-600 text-white",
  closed_lost: "bg-red-100 text-red-700",
};

const ISSUE_NAMES: Record<string, string> = {
  unclear_cta: "Unclear CTA",
  weak_hero: "Weak Hero",
  missing_trust_signals: "Missing Trust Signals",
  poor_visual_hierarchy: "Poor Visual Hierarchy",
  weak_cta: "Weak CTA Copy",
  missing_outcome_clarity: "Missing Outcome Clarity",
  high_friction: "High Friction",
  poor_mobile_readability: "Poor Mobile Readability",
  weak_message_order: "Weak Message Order",
  unclear_value_prop: "Unclear Value Prop",
  missing_social_proof: "Missing Social Proof",
  poor_cta_prominence: "Poor CTA Prominence",
  generic_messaging: "Generic Messaging",
  no_specific_audience: "No Audience Callout",
  missing_urgency: "Missing Urgency",
  weak_trust: "Weak Trust",
};

export default function AccountDetail() {
  const [, params] = useRoute("/accounts/:id");
  const id = params?.id || "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [analyseUrl, setAnalyseUrl] = useState("");
  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [opportunityOpen, setOpportunityOpen] = useState(false);

  const { data: res, isLoading } = useGetAccount(id, { query: { enabled: !!id } });
  const account = res?.data as any;

  const updateMutation = useUpdateAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${id}`] });
        setIsEditing(false);
        toast({ title: "Account updated" });
      }
    }
  });

  const deleteMutation = useDeleteAccount({
    mutation: {
      onSuccess: () => {
        toast({ title: "Account deleted" });
        navigate("/accounts");
      }
    }
  });

  const createOppMutation = useCreateOpportunity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${id}`] });
        setOpportunityOpen(false);
        toast({ title: "Opportunity created" });
      }
    }
  });

  const handleEdit = () => {
    setEditForm({
      companyName: account?.companyName || "",
      domain: account?.domain || "",
      websiteUrl: account?.websiteUrl || "",
      industry: account?.industry || "",
      employeeBand: account?.employeeBand || "",
      priorityTier: account?.priorityTier || "",
      description: account?.description || "",
      knownChallenges: account?.knownChallenges || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({ id, data: editForm } as any);
  };

  const handleRunAnalysis = async () => {
    if (!analyseUrl) return;
    setAnalyseLoading(true);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyseUrl, account_id: id }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message || "Analysis failed");
      }
      const result = await r.json();
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${id}`] });
      toast({ title: "Analysis complete!", description: `Score: ${result.data?.confidenceScore}%` });
      setAnalyseOpen(false);
      navigate(`/analyses/${result.data?.id}`);
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyseLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Loading Account...">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!account) {
    return (
      <AppLayout title="Account Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
          <Building2 className="w-16 h-16 opacity-20 mb-4" />
          <h2 className="text-xl font-bold text-foreground">Account Not Found</h2>
          <p>The requested account does not exist or was deleted.</p>
        </div>
      </AppLayout>
    );
  }

  const contacts = account.contacts || [];
  const analyses = account.analyses || [];
  const latestAnalysis = analyses.length ? analyses[analyses.length - 1] : null;
  const activities = account.recentActivities || [];
  const fitScore = account.fitScore ?? 0;

  return (
    <AppLayout title={account.companyName}>
      <div className="max-w-7xl mx-auto">
        {/* Header Hero */}
        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center border shadow-inner">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">{account.companyName}</h1>
                <div className="flex items-center gap-3 text-muted-foreground mt-1 flex-wrap">
                  {account.domain && (
                    <a href={`https://${account.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors text-sm">
                      <Globe className="w-4 h-4" /> {account.domain}
                    </a>
                  )}
                  {account.industry && <span className="text-sm">{account.industry}</span>}
                  {account.geography && <span className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3" />{account.geography}</span>}
                </div>
              </div>
            </div>
            {account.description && <p className="text-sm text-muted-foreground max-w-xl">{account.description}</p>}
          </div>
          <div className="relative z-10 flex gap-3 flex-wrap">
            {account.priorityTier && (
              <div className={`px-4 py-2 rounded-xl text-center border ${TIER_COLORS[account.priorityTier] || "bg-muted"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Tier</p>
                <p className="text-sm font-bold capitalize">{account.priorityTier}</p>
              </div>
            )}
            <div className={`px-4 py-2 rounded-xl text-center border ${FIT_BG(fitScore)}`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Fit Score</p>
              <p className={`text-lg font-bold ${SCORE_COLOR(fitScore)}`}>{fitScore}/100</p>
            </div>
            {account.personalizationLevel && (
              <div className="bg-indigo-50 border-indigo-200 px-4 py-2 rounded-xl text-center border">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 opacity-70">Personalization</p>
                <p className="text-sm font-bold text-indigo-800 capitalize">{account.personalizationLevel.replace("_", " ")}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Company Info Card */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" /> Company Details
                </CardTitle>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={handleEdit}><Edit className="w-4 h-4 mr-1" />Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "companyName", label: "Company Name" },
                      { key: "domain", label: "Domain" },
                      { key: "websiteUrl", label: "Website URL" },
                      { key: "industry", label: "Industry" },
                      { key: "employeeBand", label: "Employee Band" },
                      { key: "priorityTier", label: "Priority Tier" },
                    ].map(f => (
                      <div key={f.key}>
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        <Input
                          className="mt-1"
                          value={editForm[f.key] || ""}
                          onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Known Challenges</Label>
                      <Textarea
                        className="mt-1"
                        value={editForm.knownChallenges || ""}
                        onChange={e => setEditForm(prev => ({ ...prev, knownChallenges: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      ["Industry", account.industry],
                      ["Employees", account.employeeBand],
                      ["Revenue", account.revenueBand],
                      ["ICP Type", account.icpType?.replace("_", " ")],
                      ["Source", account.source],
                      ["Geography", account.geography],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                        <p className="font-semibold text-foreground capitalize">{value || "—"}</p>
                      </div>
                    ))}
                    {account.knownChallenges && (
                      <div className="col-span-2 md:col-span-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Known Challenges</p>
                        <p className="text-sm text-foreground bg-muted/30 p-3 rounded-xl border border-border/50">{account.knownChallenges}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {latestAnalysis && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-muted-foreground" /> Latest Analysis
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/analyses/${latestAnalysis.id}`)}>
                      <ExternalLink className="w-4 h-4 mr-1" /> View Full
                    </Button>
                    <Button size="sm" onClick={() => { setAnalyseUrl(account.websiteUrl || (account.domain ? `https://${account.domain}` : "")); setAnalyseOpen(true); }}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Re-run
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6 mb-4">
                    <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${SCORE_COLOR(latestAnalysis.confidenceScore ?? 0)}`} style={{ borderColor: "currentColor" }}>
                      <span className="text-2xl font-bold">{latestAnalysis.confidenceScore ?? 0}</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence Score</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {latestAnalysis.primaryIssueCode && (
                          <Badge variant="destructive" className="capitalize cursor-pointer" onClick={() => navigate(`/issues/${latestAnalysis.primaryIssueCode}`)}>
                            {ISSUE_NAMES[latestAnalysis.primaryIssueCode] || latestAnalysis.primaryIssueCode}
                          </Badge>
                        )}
                        {latestAnalysis.secondaryIssueCode && (
                          <Badge variant="secondary" className="capitalize cursor-pointer" onClick={() => navigate(`/issues/${latestAnalysis.secondaryIssueCode}`)}>
                            {ISSUE_NAMES[latestAnalysis.secondaryIssueCode] || latestAnalysis.secondaryIssueCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {account.suggestedSequenceFamily && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm">
                      <span className="font-medium text-indigo-800">Suggested Sequence:</span>
                      <span className="ml-2 text-indigo-600 capitalize">{account.suggestedSequenceFamily.replace(/_/g, " ")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Associated Contacts */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" /> Contacts ({contacts.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate(`/contacts/new?accountId=${id}`)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {contacts.length ? (
                  <div className="divide-y">
                    {contacts.map((c: any) => (
                      <div
                        key={c.id}
                        className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between cursor-pointer"
                        onClick={() => navigate(`/contacts/${c.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                            {c.firstName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()}</p>
                            <p className="text-xs text-muted-foreground">{c.jobTitle || "No title"} • {c.email || "No email"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs capitalize ${STATUS_COLORS[c.outreachStatus] || ""}`}>{c.outreachStatus}</Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-muted-foreground">
                    <Users className="w-10 h-10 opacity-20 mx-auto mb-2" />
                    <p className="text-sm">No contacts yet.</p>
                    <Button variant="link" size="sm" className="mt-1" onClick={() => navigate(`/contacts/new?accountId=${id}`)}>Add a contact</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-muted-foreground" /> Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {activities.length ? (
                  <div className="space-y-4">
                    {activities.map((a: any) => (
                      <div key={a.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">{a.activityType?.replace("_", " ") || "Activity"}</p>
                          <p className="text-xs text-muted-foreground">{a.channel && `via ${a.channel} • `}{new Date(a.sentAt).toLocaleDateString()}</p>
                          {a.bodySnippet && <p className="text-xs text-muted-foreground mt-1 truncate">{a.bodySnippet}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="w-10 h-10 opacity-20 mx-auto mb-2" />
                    <p className="text-sm">No activity recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Analyses */}
            {analyses.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-muted-foreground" /> Analysis History ({analyses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {analyses.map((a: any) => (
                      <div
                        key={a.id}
                        className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between cursor-pointer"
                        onClick={() => navigate(`/analyses/${a.id}`)}
                      >
                        <div>
                          <p className="font-medium text-sm">{a.domain}</p>
                          <p className="text-xs text-muted-foreground">{new Date(a.analyzedAt).toLocaleDateString()} • Score: {a.confidenceScore}%</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.primaryIssueCode && <Badge variant="outline" className="text-xs capitalize">{ISSUE_NAMES[a.primaryIssueCode] || a.primaryIssueCode}</Badge>}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Button className="w-full justify-start gap-2" size="sm"
                  onClick={() => { setAnalyseUrl(account.websiteUrl || (account.domain ? `https://${account.domain}` : "")); setAnalyseOpen(true); }}>
                  <BarChart2 className="w-4 h-4" /> Run Analysis
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline"
                  onClick={() => navigate(`/messages?accountId=${id}`)}>
                  <Mail className="w-4 h-4" /> Generate Message
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline"
                  onClick={() => navigate(`/sequences?accountId=${id}`)}>
                  <TrendingUp className="w-4 h-4" /> Assign Sequence
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline"
                  onClick={() => setOpportunityOpen(true)}>
                  <Calendar className="w-4 h-4" /> Create Opportunity
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline"
                  onClick={() => { setNotes(""); setNotesOpen(true); }}>
                  <FileText className="w-4 h-4" /> Quick Notes
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={handleEdit}>
                  <Edit className="w-4 h-4" /> Edit Account
                </Button>
              </CardContent>
            </Card>

            {/* ICP & Fit Score */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-muted-foreground" />ICP Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ICP Type</p>
                  <Badge variant="secondary" className="capitalize">{account.icpType?.replace("_", " ") || "Not classified"}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fit Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${fitScore >= 75 ? "bg-green-500" : fitScore >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${fitScore}%` }} />
                    </div>
                    <span className={`text-sm font-bold ${SCORE_COLOR(fitScore)}`}>{fitScore}</span>
                  </div>
                </div>
                {account.likelyPrimaryProblem && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Likely Primary Issue</p>
                    <Badge variant="destructive" className="text-xs cursor-pointer" onClick={() => navigate(`/issues/${account.likelyPrimaryProblem}`)}>
                      {ISSUE_NAMES[account.likelyPrimaryProblem] || account.likelyPrimaryProblem}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 justify-start gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {account.companyName}?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete the account and cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate({ id } as any)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Run Analysis Modal */}
        <Dialog open={analyseOpen} onOpenChange={setAnalyseOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Run Homepage Analysis</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">This will analyze the homepage and identify key messaging clarity and design effectiveness issues.</p>
            <div className="space-y-3 mt-2">
              <Label>Homepage URL</Label>
              <Input
                placeholder="https://example.com"
                value={analyseUrl}
                onChange={e => setAnalyseUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setAnalyseOpen(false)}>Cancel</Button>
              <Button onClick={handleRunAnalysis} disabled={!analyseUrl || analyseLoading}>
                {analyseLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing...</> : "Analyze"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Notes Modal */}
        <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Quick Notes — {account.companyName}</DialogTitle>
            </DialogHeader>
            <Textarea placeholder="Add notes about this account..." value={notes} onChange={e => setNotes(e.target.value)} rows={5} />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setNotesOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                updateMutation.mutate({ id, data: { description: notes } } as any);
                setNotesOpen(false);
              }}>Save Notes</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Opportunity Modal */}
        <Dialog open={opportunityOpen} onOpenChange={setOpportunityOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Opportunity</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createOppMutation.mutate({
                data: {
                  accountId: id,
                  name: fd.get("name") as string,
                  stage: (fd.get("stage") as string) || "prospecting",
                  value: parseInt(fd.get("value") as string) || 0,
                }
              } as any);
            }} className="space-y-4">
              <div>
                <Label>Opportunity Name</Label>
                <Input name="name" placeholder="Design subscription deal" className="mt-1" required />
              </div>
              <div>
                <Label>Stage</Label>
                <select name="stage" className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="prospecting">Prospecting</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="booked">Booked</option>
                </select>
              </div>
              <div>
                <Label>Value (£)</Label>
                <Input name="value" type="number" placeholder="0" className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpportunityOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createOppMutation.isPending}>Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
