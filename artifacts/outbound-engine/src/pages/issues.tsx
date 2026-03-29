import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, BarChart2, Building2 } from "lucide-react";

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

const SEVERITY_LEVELS = ["high", "medium", "low"] as const;
const CATEGORIES = ["messaging", "design", "ux", "trust", "conversion"] as const;

export default function Issues() {
  const [, navigate] = useLocation();
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/issues"],
    queryFn: async () => {
      const r = await fetch("/api/issues");
      return r.json();
    },
  });

  const clusters: any[] = data?.data || [];

  const filtered = clusters.filter(c => {
    if (selectedSeverities.length && !selectedSeverities.includes(c.severity)) return false;
    if (selectedCategories.length && !selectedCategories.includes(c.category)) return false;
    return true;
  });

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  return (
    <AppLayout title="Issue Cluster Explorer">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Issue Cluster Explorer</h1>
          <p className="text-muted-foreground mt-1">Homepage messaging and design issues driving engagement and conversions</p>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className="w-52 flex-shrink-0 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Severity</h3>
              <div className="space-y-2">
                {SEVERITY_LEVELS.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSeverities.includes(s)}
                      onChange={() => toggle(selectedSeverities, s, setSelectedSeverities)}
                      className="rounded"
                    />
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${SEVERITY_COLORS[s]}`}>{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Category</h3>
              <div className="space-y-2">
                {CATEGORIES.map(c => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(c)}
                      onChange={() => toggle(selectedCategories, c, setSelectedCategories)}
                      className="rounded"
                    />
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${CATEGORY_COLORS[c]}`}>{c}</span>
                  </label>
                ))}
              </div>
            </div>
            {(selectedSeverities.length > 0 || selectedCategories.length > 0) && (
              <button
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => { setSelectedSeverities([]); setSelectedCategories([]); }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Card Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <Card className="rounded-2xl border-none shadow-md">
                <CardContent className="p-16 text-center text-muted-foreground">
                  <AlertTriangle className="w-14 h-14 opacity-20 mx-auto mb-4" />
                  <p className="font-medium">No issue clusters match filters.</p>
                  <p className="text-sm mt-1">Try adjusting filters.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(cluster => (
                  <Card
                    key={cluster.code}
                    className="rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/40 group"
                    onClick={() => navigate(`/issues/${cluster.code}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <p className="text-xs font-mono text-muted-foreground mb-1">{cluster.code}</p>
                          <h3 className="font-bold text-sm group-hover:text-primary transition-colors">{cluster.name}</h3>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium flex-shrink-0 ${SEVERITY_COLORS[cluster.severity]}`}>
                          {cluster.severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{cluster.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${CATEGORY_COLORS[cluster.category] || "bg-muted text-muted-foreground"}`}>
                            {cluster.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          <span>{cluster.accountCount || 0} accounts</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
