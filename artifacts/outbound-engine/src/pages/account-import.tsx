import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Building2 } from "lucide-react";

const ACCOUNT_FIELDS = [
  { key: "companyName", label: "Company Name", required: true },
  { key: "domain", label: "Domain", required: true },
  { key: "websiteUrl", label: "Website URL", required: false },
  { key: "industry", label: "Industry", required: false },
  { key: "priorityTier", label: "Priority Tier", required: false },
  { key: "fitScore", label: "Fit Score", required: false },
  { key: "icpType", label: "ICP Type", required: false },
  { key: "geography", label: "Geography", required: false },
  { key: "employeeBand", label: "Employee Count", required: false },
];

const AUTO_DETECT: Record<string, string> = {
  "company": "companyName", "company name": "companyName", "organization": "companyName",
  "domain": "domain", "website": "domain",
  "website url": "websiteUrl", "url": "websiteUrl",
  "industry": "industry", "sector": "industry",
  "priority": "priorityTier", "tier": "priorityTier",
  "fit score": "fitScore", "score": "fitScore",
  "icp": "icpType", "icp type": "icpType",
  "location": "geography", "geography": "geography", "country": "geography",
  "employees": "employeeBand", "employee count": "employeeBand", "headcount": "employeeBand",
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] || "" }), {});
  });
  return { headers, rows };
}

type ImportStep = "upload" | "map" | "validate" | "importing" | "done";

export default function AccountImport() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dedupStrategy, setDedupStrategy] = useState<"skip" | "update">("skip");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; errors: string[] } | null>(null);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Please upload a CSV file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large (max 10MB)", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const { headers, rows } = parseCSV(e.target?.result as string);
      setHeaders(headers);
      setRows(rows);
      // Auto-detect mapping
      const detected: Record<string, string> = {};
      headers.forEach(h => {
        const match = AUTO_DETECT[h.toLowerCase()];
        if (match) detected[h] = match;
      });
      setMapping(detected);
      setStep("map");
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleValidate = () => {
    const errors: string[] = [];
    const companyCol = Object.keys(mapping).find(h => mapping[h] === "companyName");
    const domainCol = Object.keys(mapping).find(h => mapping[h] === "domain");
    if (!companyCol) errors.push("Required field 'Company Name' is not mapped");
    if (!domainCol) errors.push("Required field 'Domain' is not mapped");

    rows.forEach((row, i) => {
      if (companyCol && !row[companyCol]?.trim()) errors.push(`Row ${i + 1}: Missing company name`);
      if (domainCol && !row[domainCol]?.trim()) errors.push(`Row ${i + 1}: Missing domain`);
    });

    setValidationErrors(errors);
    if (errors.filter(e => !e.includes("Row")).length === 0) {
      setStep("validate");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    setProgress(0);
    const mappedRows = rows.map(row => {
      const mapped: Record<string, string> = {};
      Object.entries(mapping).forEach(([csvCol, dbField]) => {
        mapped[dbField] = row[csvCol] || "";
      });
      return mapped;
    });

    try {
      const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 300);
      const r = await fetch("/api/accounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows, dedupStrategy }),
      });
      clearInterval(interval);
      setProgress(100);
      const data = await r.json();
      setResult({ imported: data.imported, updated: data.updated || 0, skipped: data.skipped, errors: data.errors || [] });
      setStep("done");
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
      setStep("validate");
    }
  };

  const mappedRequired = ACCOUNT_FIELDS.filter(f => f.required).every(f =>
    Object.values(mapping).includes(f.key)
  );

  return (
    <AppLayout title="Import Accounts">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/accounts")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Accounts
        </button>

        {/* Step indicators */}
        <div className="flex items-center gap-3 mb-8">
          {[["1", "Upload"], ["2", "Map Columns"], ["3", "Review"], ["4", "Done"]].map(([n, label], i) => {
            const stepIdx = ["upload", "map", "validate", "importing", "done"].indexOf(step);
            const active = i <= stepIdx;
            return (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {n}
                </div>
                <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                {i < 3 && <span className="text-muted-foreground mx-1">→</span>}
              </div>
            );
          })}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-10">
              <div
                className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-semibold text-lg mb-1">Drop your CSV here</p>
                <p className="text-muted-foreground text-sm mb-4">or click to browse</p>
                <p className="text-xs text-muted-foreground">Max file size: 10MB • CSV only</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Map Columns */}
        {step === "map" && (
          <Card className="rounded-2xl border-none shadow-md">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Map CSV Columns
              </CardTitle>
              <p className="text-sm text-muted-foreground">{fileName} • {rows.length} rows detected</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                {ACCOUNT_FIELDS.map(field => {
                  const currentCol = Object.keys(mapping).find(h => mapping[h] === field.key) || "";
                  const isMapped = !!currentCol;
                  return (
                    <div key={field.key} className="flex items-center gap-4">
                      <div className="w-40 flex-shrink-0">
                        <span className={`text-sm font-medium ${field.required ? "text-foreground" : "text-muted-foreground"}`}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </div>
                      <select
                        className={`flex-1 h-9 rounded-md border px-3 py-1 text-sm bg-background ${!isMapped && field.required ? "border-red-300" : "border-input"}`}
                        value={currentCol}
                        onChange={e => {
                          const newMapping = { ...mapping };
                          Object.keys(newMapping).forEach(k => { if (newMapping[k] === field.key) delete newMapping[k]; });
                          if (e.target.value) newMapping[e.target.value] = field.key;
                          setMapping(newMapping);
                        }}
                      >
                        <option value="">— not mapped —</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {isMapped ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> :
                        field.required ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> :
                        <div className="w-4 h-4" />}
                    </div>
                  );
                })}
              </div>

              {/* Preview table */}
              <div className="mt-6 overflow-x-auto">
                <p className="text-sm font-medium mb-2">Preview (first 5 rows)</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      {headers.map(h => <th key={h} className="px-3 py-2 text-left border border-border font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        {headers.map(h => <td key={h} className="px-3 py-1.5 border border-border truncate max-w-32">{row[h] || "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
                <Button onClick={handleValidate} disabled={!mappedRequired}>
                  Continue to Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Validate / Review */}
        {step === "validate" && (
          <Card className="rounded-2xl border-none shadow-md">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Review Import</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-xl text-center">
                  <p className="text-2xl font-bold text-foreground">{rows.length}</p>
                  <p className="text-xs text-muted-foreground">Total rows</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-700">{rows.length - validationErrors.filter(e => e.startsWith("Row")).length}</p>
                  <p className="text-xs text-muted-foreground">Valid rows</p>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-medium text-amber-800 mb-2"><AlertTriangle className="w-4 h-4 inline mr-1" /> {validationErrors.length} issues found</p>
                  {validationErrors.slice(0, 10).map((e, i) => <p key={i} className="text-xs text-amber-700">{e}</p>)}
                  {validationErrors.length > 10 && <p className="text-xs text-amber-600">...and {validationErrors.length - 10} more</p>}
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Duplicate Strategy</p>
                <div className="flex gap-3">
                  {[["skip", "Skip duplicates"], ["update", "Update existing"]].map(([val, label]) => (
                    <button key={val}
                      onClick={() => setDedupStrategy(val as any)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${dedupStrategy === val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep("map")}>Back</Button>
                <Button onClick={handleImport}>Start Import</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-12 text-center">
              <Building2 className="w-14 h-14 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-semibold mb-2">Importing accounts...</p>
              <p className="text-sm text-muted-foreground mb-6">Please wait while we process your file</p>
              <Progress value={progress} className="max-w-sm mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && result && (
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-10 text-center space-y-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Import Complete!</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Imported", value: result.imported, color: "text-green-600" },
                  { label: "Updated", value: result.updated, color: "text-blue-600" },
                  { label: "Skipped", value: result.skipped, color: "text-yellow-600" },
                  { label: "Errors", value: result.errors.length, color: "text-red-500" },
                ].map(s => (
                  <div key={s.label} className="bg-muted/30 p-4 rounded-xl">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 border border-red-200 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-red-800 mb-2">Import Errors:</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
                </div>
              )}
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => { setStep("upload"); setResult(null); setFileName(""); }}>Import Another File</Button>
                <Button onClick={() => navigate("/accounts")}>View Accounts</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
