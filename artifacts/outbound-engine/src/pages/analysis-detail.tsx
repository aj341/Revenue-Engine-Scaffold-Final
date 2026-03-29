import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BarChart2, TrendingUp, Shield, AlertTriangle, CheckCircle2, ExternalLink, Zap, Eye } from "lucide-react";

const ISSUE_NAMES: Record<string, string> = {
  HERO_TOO_GENERIC: "Hero Too Generic",
  UNCLEAR_OFFER: "Unclear Offer",
  FEATURE_FIRST_MESSAGING: "Feature-First Messaging",
  WEAK_ABOVE_FOLD_STRUCTURE: "Weak Above-Fold Structure",
  TOO_MANY_COMPETING_ELEMENTS: "Too Many Competing Elements",
  CTA_TOO_SOFT: "CTA Too Soft",
  CTA_NOT_OUTCOME_TIED: "CTA Not Outcome-Tied",
  MISSING_SOCIAL_PROOF: "Missing Social Proof",
  LOW_TRUST_SIGNAL_VISIBILITY: "Low Trust Signal Visibility",
  SLOW_DECISION_PATH: "Slow Decision Path",
  HIGH_COGNITIVE_LOAD: "High Cognitive Load",
  WEAK_VISUAL_HIERARCHY: "Weak Visual Hierarchy",
  CLUTTERED_LAYOUT: "Cluttered Layout",
  POOR_MOBILE_READABILITY: "Poor Mobile Readability",
  FRICTION_HEAVY_NAVIGATION: "Friction-Heavy Navigation",
  MISSING_SEGMENT_CLARITY: "Missing Segment Clarity",
  unclear_cta: "Unclear CTA",
  weak_hero: "Weak Hero",
  missing_trust_signals: "Missing Trust Signals",
  poor_visual_hierarchy: "Poor Visual Hierarchy",
};

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="text-center z-10">
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}

function CategoryBar({ name, score, description }: { name: string; score: number; description?: string }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  const textColor = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-500";
  return (
    <div className="space-y-1.5" title={description}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{name}</span>
        <span className={`text-sm font-bold ${textColor}`}>{score}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      {description && <p className="text-xs text-muted-foreground leading-snug">{description}</p>}
    </div>
  );
}

function FindingCard({ finding, issueCode }: { finding: any; issueCode?: string }) {
  const isStrength = finding.type === "strength";
  return (
    <div className={`p-4 rounded-xl border text-sm ${isStrength ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <Badge variant="outline" className={`text-xs mb-1 ${isStrength ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}`}>
            {finding.category}
          </Badge>
          <p className="font-semibold leading-snug">{finding.title}</p>
        </div>
        {issueCode && (
          <Badge variant="secondary" className="text-xs shrink-0">{ISSUE_NAMES[issueCode] || issueCode}</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{finding.evidence}</p>
      {!isStrength && finding.suggestion && (
        <div className="flex gap-2 mt-2 p-2 bg-white rounded-lg border border-red-100">
          <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs">{finding.suggestion}</p>
        </div>
      )}
    </div>
  );
}

function ScreenshotWithOverlays({ screenshotUrl, findings }: { screenshotUrl: string; findings: any[] }) {
  const [showOverlays, setShowOverlays] = useState(true);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Full-page screenshot</p>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowOverlays(v => !v)}>
          <Eye className="w-3 h-3" />{showOverlays ? "Hide" : "Show"} overlays
        </Button>
      </div>
      <div className="relative rounded-xl overflow-hidden border">
        <img src={screenshotUrl} alt="Homepage screenshot" className="w-full block" />
        {showOverlays && findings.map((f, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.width}%`,
            height: `${Math.max(f.height, 2)}%`,
            border: `2px solid ${f.type === "strength" ? "#22c55e" : "#ef4444"}`,
            backgroundColor: f.type === "strength" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            borderRadius: "4px",
          }} title={f.title} />
        ))}
      </div>
    </div>
  );
}

export default function AnalysisDetail() {
  const [, params] = useRoute("/analyses/:id");
  const id = params?.id || "";
  const [, navigate] = useLocation();

  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const r = await fetch(`/api/analyses/${id}`);
        if (!r.ok) { setLoading(false); return; }
        const d = await r.json();
        const a = d.data;
        setAnalysis(a);
        setLoading(false);
        if (a?.status === "pending" || a?.status === "processing") {
          startPolling();
        }
      } catch {
        setLoading(false);
      }
    };
    load();
    return () => stopTimers();
  }, [id]);

  const startPolling = () => {
    setPolling(true);
    let e = 0;
    timerRef.current = setInterval(() => { e += 1; setElapsed(e); }, 1000);
    const doPoll = async () => {
      try {
        const r = await fetch(`/api/analyses/${id}/poll`);
        if (!r.ok) return;
        const d = await r.json();
        const a = d.data;
        setAnalysis(a);
        if (a?.status === "completed" || a?.status === "failed") {
          stopTimers();
          setPolling(false);
        }
      } catch {}
    };
    doPoll();
    pollRef.current = setInterval(doPoll, 5000);
  };

  if (loading) {
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

  const findings: any[] = Array.isArray(analysis.findings) ? analysis.findings : [];
  const categoryScores: any[] = Array.isArray(analysis.categoryScores) ? analysis.categoryScores : [];
  const strengths = findings.filter(f => f.type === "strength");
  const weaknesses = findings.filter(f => f.type === "weakness");
  const legacyStrengths: string[] = Array.isArray(analysis.strengthsDetected)
    ? analysis.strengthsDetected.filter((s: any) => typeof s === "string")
    : [];
  const overallScore = Math.round(analysis.confidenceScore ?? 0);

  const issueCodes = [analysis.primaryIssueCode, analysis.secondaryIssueCode, analysis.tertiaryIssueCode].filter(Boolean);

  return (
    <AppLayout title={`Analysis: ${analysis.domain}`}>
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/analyses")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Analyses
        </button>

        {/* Polling banner */}
        {polling && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />
            <div>
              <p className="font-semibold text-sm text-indigo-800">Analysis in progress… ({elapsed}s)</p>
              <p className="text-xs text-indigo-600">Results will appear automatically when ready (typically 60–90s)</p>
            </div>
            <div className="ml-auto flex-1 max-w-xs bg-indigo-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${Math.min(100, (elapsed / 90) * 100)}%` }} />
            </div>
          </div>
        )}

        {analysis.status === "failed" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-red-700">Analysis failed</p>
              <p className="text-xs text-red-600">{analysis.errorMessage || "The analyser was unable to process this page."}</p>
            </div>
          </div>
        )}

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
            <p className="text-sm text-muted-foreground">
              Analyzed {new Date(analysis.analyzedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {analysis.pageIntent && (
              <Badge variant="secondary" className="mt-2">{analysis.pageIntent}</Badge>
            )}
            {analysis.accountId && analysis.accountId !== "standalone" && (
              <Button variant="link" className="p-0 h-auto text-sm mt-1 block" onClick={() => navigate(`/accounts/${analysis.accountId}`)}>
                ← Back to Account
              </Button>
            )}
          </div>
          <div className="relative z-10 flex items-center gap-6">
            {overallScore > 0 && <ScoreCircle score={overallScore} />}
            {issueCodes.length > 0 && (
              <div className="space-y-2">
                {issueCodes.map((code: string, i: number) => (
                  <Badge key={code} variant={i === 0 ? "destructive" : "secondary"} className="block text-xs cursor-pointer"
                    onClick={() => navigate(`/issues/${code}`)}>
                    {i === 0 ? "Primary: " : i === 1 ? "Secondary: " : "Tertiary: "}
                    {ISSUE_NAMES[code] || code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            {/* Category Scores from real API */}
            {categoryScores.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5 text-muted-foreground" /> Category Scores</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {categoryScores.map((cs: any) => (
                    <CategoryBar key={cs.name} name={cs.name} score={Math.round(cs.score)} description={cs.description} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Findings Panel */}
            {(strengths.length > 0 || weaknesses.length > 0) && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    Findings
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {strengths.length} strength{strengths.length !== 1 ? "s" : ""} · {weaknesses.length} weakness{weaknesses.length !== 1 ? "es" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-x">
                    {/* Strengths */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-semibold text-green-700">Strengths</span>
                      </div>
                      {strengths.length > 0 ? strengths.map((f: any, i: number) => (
                        <FindingCard key={i} finding={f} />
                      )) : (
                        <p className="text-xs text-muted-foreground">No strengths identified</p>
                      )}
                    </div>
                    {/* Weaknesses */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700">Weaknesses</span>
                      </div>
                      {weaknesses.length > 0 ? weaknesses.map((f: any, i: number) => (
                        <FindingCard key={i} finding={f} issueCode={i === 0 ? analysis.primaryIssueCode : i === 1 ? analysis.secondaryIssueCode : undefined} />
                      )) : (
                        <p className="text-xs text-muted-foreground">No weaknesses identified</p>
                      )}
                    </div>
                  </div>
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

            {/* Summary */}
            {analysis.issueSummaryShort && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-base">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm leading-relaxed">{analysis.issueSummaryShort}</p>
                </CardContent>
              </Card>
            )}

            {/* Screenshot with overlays */}
            {analysis.screenshotUrl && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" /> Screenshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScreenshotWithOverlays screenshotUrl={analysis.screenshotUrl} findings={findings} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Button className="w-full justify-start gap-2" size="sm"
                  onClick={() => navigate(`/messages?analysisId=${id}${analysis.accountId && analysis.accountId !== "standalone" ? `&accountId=${analysis.accountId}` : ""}`)}>
                  <ExternalLink className="w-4 h-4" /> Generate Outreach
                </Button>
                {analysis.accountId && analysis.accountId !== "standalone" && (
                  <Button className="w-full justify-start gap-2" size="sm" variant="outline"
                    onClick={() => navigate(`/accounts/${analysis.accountId}`)}>
                    <ArrowLeft className="w-4 h-4" /> Back to Account
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Issue Code Badges */}
            {issueCodes.length > 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-3">
                  <CardTitle className="text-base">Mapped Issues</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-wrap gap-2">
                  {issueCodes.map((code: string) => (
                    <Badge key={code} variant="outline" className="capitalize cursor-pointer hover:bg-muted"
                      onClick={() => navigate(`/issues/${code}`)}>
                      {ISSUE_NAMES[code] || code}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Legacy Strengths (text strings from old mock data) */}
            {legacyStrengths.length > 0 && strengths.length === 0 && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Strengths</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-2">
                  {legacyStrengths.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{s}</p>
                    </div>
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
