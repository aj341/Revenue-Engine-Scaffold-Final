import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart2, Search, SlidersHorizontal, ChevronRight } from "lucide-react";

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

const SCORE_COLOR = (s: number) => s >= 70 ? "text-green-600" : s >= 40 ? "text-yellow-600" : "text-red-500";
const SCORE_BG = (s: number) => s >= 70 ? "bg-green-50 text-green-700" : s >= 40 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700";

export default function Analyses() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<string>("");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [minConfidence, setMinConfidence] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/analyses", { search, selectedIssue, dateRange, sortBy, minConfidence }],
    queryFn: async () => {
      const r = await fetch("/api/analyses?limit=200");
      return r.json();
    },
  });

  const rows: any[] = data?.data || [];

  const filtered = rows.filter(a => {
    if (search && !a.domain?.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedIssue && a.primaryIssueCode !== selectedIssue && a.secondaryIssueCode !== selectedIssue) return false;
    if (minConfidence && (a.confidenceScore ?? 0) < minConfidence) return false;
    if (dateRange !== "all") {
      const days = dateRange === "7" ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 86400000);
      if (new Date(a.analyzedAt) < cutoff) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "score") return (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
    if (sortBy === "domain") return (a.domain || "").localeCompare(b.domain || "");
    return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
  });

  return (
    <AppLayout title="Analyses">
      <div className="flex gap-8">
        {/* Left Filters Sidebar */}
        <div className="w-56 flex-shrink-0 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Issue Code</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedIssue("")}
                className={`w-full text-left text-sm px-2 py-1 rounded-lg transition-colors ${!selectedIssue ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                All Issues
              </button>
              {Object.entries(ISSUE_NAMES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setSelectedIssue(selectedIssue === code ? "" : code)}
                  className={`w-full text-left text-sm px-2 py-1 rounded-lg transition-colors ${selectedIssue === code ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Date Range</h3>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
            </select>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Min Confidence</h3>
            <div className="space-y-2">
              <input type="range" min="0" max="100" step="5" value={minConfidence} onChange={e => setMinConfidence(Number(e.target.value))} className="w-full" />
              <p className="text-sm text-muted-foreground">{minConfidence}%+</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by domain..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="date">Sort: Newest</option>
                <option value="score">Sort: Score</option>
                <option value="domain">Sort: Domain</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-2xl border-none shadow-md">
              <CardContent className="p-16 text-center text-muted-foreground">
                <BarChart2 className="w-14 h-14 opacity-20 mx-auto mb-4" />
                <p className="font-medium">No analyses yet.</p>
                <p className="text-sm mt-1">Run an analysis from an account detail page.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">Showing {filtered.length} of {rows.length} analyses</p>
              <Card className="rounded-2xl border-none shadow-md overflow-hidden">
                <div className="divide-y">
                  {filtered.map(a => (
                    <div
                      key={a.id}
                      className="px-6 py-4 hover:bg-muted/20 transition-colors cursor-pointer flex items-center justify-between gap-4"
                      onClick={() => navigate(`/analyses/${a.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold truncate">{a.domain}</p>
                          {a.primaryIssueCode && (
                            <Badge variant="destructive" className="text-xs capitalize flex-shrink-0">
                              {ISSUE_NAMES[a.primaryIssueCode] || a.primaryIssueCode}
                            </Badge>
                          )}
                          {a.secondaryIssueCode && (
                            <Badge variant="secondary" className="text-xs capitalize flex-shrink-0 hidden md:inline-flex">
                              {ISSUE_NAMES[a.secondaryIssueCode] || a.secondaryIssueCode}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(a.analyzedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${SCORE_BG(a.confidenceScore ?? 0)}`}>
                          {a.confidenceScore ?? 0}%
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
