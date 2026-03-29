import { AppLayout } from "@/components/layout";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Building2, ChevronRight, AlertTriangle, BarChart2, MessageSquare } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};
const CATEGORY_COLORS: Record<string, string> = {
  messaging: "bg-blue-100 text-blue-700",
  design: "bg-purple-100 text-purple-700",
  ux: "bg-indigo-100 text-indigo-700",
  trust: "bg-teal-100 text-teal-700",
  conversion: "bg-orange-100 text-orange-700",
};

export default function IssueDetail() {
  const [, params] = useRoute("/issues/:code");
  const code = params?.code || "";
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/issues", code],
    queryFn: async () => {
      const r = await fetch(`/api/issues/${code}`);
      return r.json();
    },
    enabled: !!code,
  });

  const cluster = data?.data;
  const analyses: any[] = cluster?.analyses || [];
  const insights: any[] = cluster?.recommendedInsights || [];
  const sequences: any[] = cluster?.recommendedSequences || [];
  const stats = cluster?.stats || {};

  if (isLoading) {
    return (
      <AppLayout title="Loading Issue...">
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!cluster) {
    return (
      <AppLayout title="Issue Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
          <AlertTriangle className="w-16 h-16 opacity-20 mb-4" />
          <h2 className="text-xl font-bold text-foreground">Issue Cluster Not Found</h2>
        </div>
      </AppLayout>
    );
  }

  const uniqueAccountIds = [...new Set(analyses.map((a: any) => a.accountId).filter(Boolean))];

  return (
    <AppLayout title={cluster.name}>
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate("/issues")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Issue Explorer
        </button>

        {/* Cluster Header */}
        <div className="bg-white p-8 rounded-3xl border shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <p className="text-xs font-mono text-muted-foreground mb-2">{cluster.code}</p>
            <h1 className="text-3xl font-bold text-foreground mb-3">{cluster.name}</h1>
            <p className="text-muted-foreground mb-5 max-w-2xl">{cluster.description}</p>
            <div className="flex gap-3 flex-wrap">
              <span className={`text-sm px-3 py-1 rounded-full border capitalize font-medium ${SEVERITY_COLORS[cluster.severity]}`}>
                {cluster.severity} severity
              </span>
              <span className={`text-sm px-3 py-1 rounded-full capitalize font-medium ${CATEGORY_COLORS[cluster.category] || "bg-muted text-muted-foreground"}`}>
                {cluster.category}
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {uniqueAccountIds.length} accounts affected
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-6">
            {/* Engagement Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Accounts", value: uniqueAccountIds.length },
                { label: "Positive Replies", value: stats.positiveReplies ?? 0 },
                { label: "Booked Calls", value: stats.bookedCalls ?? 0 },
              ].map(s => (
                <Card key={s.label} className="rounded-2xl border-none shadow-md text-center">
                  <CardContent className="p-5">
                    <p className="text-3xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Accounts with This Issue */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" /> Accounts with This Issue ({uniqueAccountIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {analyses.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">
                    <Building2 className="w-10 h-10 opacity-20 mx-auto mb-3" />
                    <p className="text-sm">No accounts analysed with this issue yet.</p>
                    <p className="text-xs mt-1">Run analyses from account detail pages.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {analyses.map((a: any) => (
                      <div
                        key={a.id}
                        className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => navigate(`/accounts/${a.accountId}`)}
                      >
                        <div>
                          <p className="font-medium text-sm">{a.domain}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={a.primaryIssueCode === code ? "destructive" : "secondary"} className="text-xs">
                              {a.primaryIssueCode === code ? "Primary issue" : "Secondary issue"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Score: {a.confidenceScore}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{new Date(a.analyzedAt).toLocaleDateString()}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Insight Blocks */}
            {insights.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" /> Recommended Insight Blocks ({insights.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {insights.map((ins: any) => (
                      <div key={ins.id} className="px-6 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm">{ins.insightTitle || "Insight Block"}</p>
                            {ins.icpSegment && <Badge variant="outline" className="text-xs mt-1 capitalize">{ins.icpSegment}</Badge>}
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs flex-shrink-0" onClick={() => navigate(`/messages?insightId=${ins.id}`)}>
                            Use in Message
                          </Button>
                        </div>
                        {ins.painLine && <p className="text-xs text-muted-foreground mt-2 italic">"{ins.painLine}"</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Recommended Sequences */}
            {sequences.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-muted-foreground" /> Sequences
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {sequences.map((seq: any) => (
                      <div key={seq.id} className="p-4">
                        <p className="font-medium text-sm">{seq.sequenceName}</p>
                        {seq.stepCount && <p className="text-xs text-muted-foreground">{seq.stepCount} steps</p>}
                        <Button variant="ghost" size="sm" className="text-xs mt-1 px-0" onClick={() => navigate(`/sequences`)}>
                          View Sequence →
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl border-none shadow-md">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Links</p>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={() => navigate("/analyses")}>
                  <BarChart2 className="w-4 h-4" /> View All Analyses
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={() => navigate("/accounts")}>
                  <Building2 className="w-4 h-4" /> View All Accounts
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
