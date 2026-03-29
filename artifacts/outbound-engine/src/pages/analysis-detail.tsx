import { AppLayout } from "@/components/layout";
import { useGetAnalysis } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BarChart2, TrendingUp, Shield, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";

const METRIC_KEYS = [
  { key: "heroClarity", label: "Hero Clarity" },
  { key: "ctaClarity", label: "CTA Clarity" },
  { key: "ctaProminence", label: "CTA Prominence" },
  { key: "visualHierarchy", label: "Visual Hierarchy" },
  { key: "messageOrder", label: "Message Order" },
  { key: "outcomeClarity", label: "Outcome Clarity" },
  { key: "trustSignal", label: "Trust Signals" },
  { key: "friction", label: "Friction (lower = better)" },
  { key: "mobileReadability", label: "Mobile Readability" },
];

const ISSUE_NAMES: Record<string, string> = {
  unclear_cta: "Unclear Call-to-Action",
  weak_hero: "Weak Hero Section",
  missing_trust_signals: "Missing Trust Signals",
  poor_visual_hierarchy: "Poor Visual Hierarchy",
  weak_cta: "Weak CTA Copy",
  missing_outcome_clarity: "Missing Outcome Clarity",
  high_friction: "High Friction",
  poor_mobile_readability: "Poor Mobile Readability",
  weak_message_order: "Weak Message Order",
  unclear_value_prop: "Unclear Value Proposition",
  missing_social_proof: "Missing Social Proof",
  poor_cta_prominence: "Poor CTA Prominence",
  generic_messaging: "Generic Messaging",
  no_specific_audience: "No Audience Callout",
  missing_urgency: "Missing Urgency",
  weak_trust: "Weak Trust Indicators",
};

function ScoreGauge({ value, label, inverted = false }: { value: number; label: string; inverted?: boolean }) {
  const display = inverted ? 100 - value : value;
  const color = display >= 70 ? "bg-green-500" : display >= 40 ? "bg-yellow-500" : "bg-red-500";
  const textColor = display >= 70 ? "text-green-600" : display >= 40 ? "text-yellow-600" : "text-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}

export default function AnalysisDetail() {
  const [, params] = useRoute("/analyses/:id");
  const id = params?.id || "";
  const [, navigate] = useLocation();

  const { data: res, isLoading } = useGetAnalysis(id, { query: { enabled: !!id } });
  const analysis = res?.data as any;

  if (isLoading) {
    return (
      <AppLayout title="Loading Analysis...">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!analysis) {
    return (
      <AppLayout title="Analysis Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
          <BarChart2 className="w-16 h-16 opacity-20 mb-4" />
          <h2 className="text-xl font-bold text-foreground">Analysis Not Found</h2>
        </div>
      </AppLayout>
    );
  }

  const rawNotes = analysis.rawNotes as any;
  const issueSummaries = rawNotes?.issue_summaries || {};
  const strengths = Array.isArray(analysis.strengthsDetected) ? analysis.strengthsDetected : [];
  const issueCodes: string[] = rawNotes?.issue_codes || [analysis.primaryIssueCode, analysis.secondaryIssueCode].filter(Boolean);
  const overallScore = Math.round((analysis.confidenceScore ?? 0));

  return (
    <AppLayout title={`Analysis: ${analysis.domain}`}>
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate("/analyses")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Analyses
        </button>

        {/* Domain Header */}
        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{analysis.domain}</h1>
              <a href={analysis.pageUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">Analyzed on {new Date(analysis.analyzedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            {analysis.accountId && analysis.accountId !== "standalone" && (
              <Button variant="link" className="p-0 h-auto text-sm mt-1" onClick={() => navigate(`/accounts/${analysis.accountId}`)}>
                ← Back to Account
              </Button>
            )}
          </div>
          <div className="relative z-10 flex gap-4">
            <ScoreCircle score={overallScore} />
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Confidence</p>
              <p className="text-2xl font-bold">{overallScore}%</p>
              <p className="text-xs text-muted-foreground mt-3 mb-1">Analysis Type</p>
              <Badge variant="secondary">{analysis.pageType || "Homepage"}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            {/* Metric Gauges */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5 text-muted-foreground" /> Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {METRIC_KEYS.map(({ key, label, inverted }) => (
                  <ScoreGauge key={key} value={analysis[key] ?? 0} label={label} inverted={inverted} />
                ))}
              </CardContent>
            </Card>

            {/* Issue Detail Cards */}
            {issueCodes.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Issues Identified</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {issueCodes.map((code: string, i: number) => {
                    const summary = issueSummaries[code];
                    return (
                      <div key={code} className={`p-4 rounded-xl border ${i === 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <Badge variant={i === 0 ? "destructive" : "secondary"} className="mb-1">{i === 0 ? "Primary" : "Secondary"}</Badge>
                            <h3 className="font-bold text-sm">{ISSUE_NAMES[code] || code}</h3>
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/issues/${code}`)}>
                            View Cluster <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                        {summary ? (
                          <>
                            <p className="text-sm font-medium mb-1">{summary.short}</p>
                            <p className="text-xs text-muted-foreground">{summary.detailed}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">{analysis.issueSummaryShort || "No detail available"}</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Recommended Priority Fix */}
            {analysis.recommendedPriorityFix && (
              <Card className="rounded-2xl border-none shadow-md border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm text-primary mb-1">Recommended Priority Fix</h3>
                      <p className="text-sm">{analysis.recommendedPriorityFix}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Strengths */}
            {strengths.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Strengths</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-2">
                  {strengths.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Screenshot */}
            {analysis.screenshotUrl && (
              <Card className="rounded-2xl border-none shadow-md overflow-hidden">
                <CardHeader className="border-b bg-muted/10 pb-3">
                  <CardTitle className="text-base">Screenshot</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <a href={analysis.screenshotUrl} target="_blank" rel="noreferrer">
                    <img src={analysis.screenshotUrl} alt="Homepage screenshot" className="w-full hover:opacity-90 transition-opacity" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardContent className="p-4 space-y-2">
                <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={() => navigate(`/messages?analysisId=${id}`)}>
                  <ExternalLink className="w-4 h-4" /> Generate Message
                </Button>
                {analysis.accountId && analysis.accountId !== "standalone" && (
                  <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={() => navigate(`/accounts/${analysis.accountId}`)}>
                    <ArrowLeft className="w-4 h-4" /> Back to Account
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Issue Code Badges */}
            {issueCodes.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-3">
                  <CardTitle className="text-base">All Issues</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-wrap gap-2">
                  {issueCodes.map((code: string) => (
                    <Badge
                      key={code}
                      variant="outline"
                      className="capitalize cursor-pointer hover:bg-muted"
                      onClick={() => navigate(`/issues/${code}`)}
                    >
                      {ISSUE_NAMES[code] || code}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}
