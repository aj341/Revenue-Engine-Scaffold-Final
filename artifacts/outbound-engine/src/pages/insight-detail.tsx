import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Trash2, Copy, Eye } from "lucide-react";

const ISSUE_CODES = [
  "unclear_cta","weak_hero","no_social_proof","poor_value_prop","bad_mobile",
  "slow_load","confusing_nav","weak_copy","missing_trust","no_personalization",
  "poor_seo","weak_design","no_analytics","poor_conversion","unclear_pricing","weak_testimonials",
];
const ISSUE_LABELS: Record<string, string> = {
  unclear_cta:"Unclear CTA",weak_hero:"Weak Hero",no_social_proof:"No Social Proof",
  poor_value_prop:"Poor Value Prop",bad_mobile:"Bad Mobile",slow_load:"Slow Load",
  confusing_nav:"Confusing Nav",weak_copy:"Weak Copy",missing_trust:"Missing Trust",
  no_personalization:"No Personalization",poor_seo:"Poor SEO",weak_design:"Weak Design",
  no_analytics:"No Analytics",poor_conversion:"Poor Conversion",unclear_pricing:"Unclear Pricing",
  weak_testimonials:"Weak Testimonials",
};
const ICP_LIST = ["saas_founder","design_agency","ecommerce_brand","b2b_services","startup_cto","marketing_lead","enterprise_cx","solo_founder"];
const CHANNELS = ["Email","LinkedIn","Phone"];
const CTA_STYLES = ["Permission","Interest","Soft Close","Direct"];
const ASSETS = ["Homepage Analyzer Result","Calculator","Brief Builder","Portfolio Link","Case Study Link","Webinar/Video Link"];

const DEFAULT_FORM = {
  issueCode: "unclear_cta",
  icp: "saas_founder",
  shortInsightLine: "",
  businessConsequence: "",
  longerExplainer: "",
  suitableChannels: [] as string[],
  ctaPairings: [] as string[],
  assetPairings: [] as string[],
  active: true,
};

export default function InsightDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";

  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const r = await fetch(`/api/insights/${id}`, { credentials: "include" });
      if (!r.ok) { navigate(`${BASE}insights`); return; }
      const d = await r.json();
      const row = d.data;
      setForm({
        issueCode: row.issueCode || "unclear_cta",
        icp: row.icp || "saas_founder",
        shortInsightLine: row.shortInsightLine || "",
        businessConsequence: row.businessConsequence || "",
        longerExplainer: row.longerExplainer || "",
        suitableChannels: (row.suitableChannels as string[]) || [],
        ctaPairings: (row.ctaPairings as string[]) || [],
        assetPairings: (row.assetPairings as string[]) || [],
        active: row.active !== false,
      });
      setLoading(false);
    })();
  }, [id]);

  const toggleArr = (key: keyof typeof form, val: string) => {
    const arr = (form[key] as string[]);
    setForm(p => ({ ...p, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }));
  };

  const handleSave = async () => {
    if (!form.shortInsightLine.trim()) {
      toast({ variant: "destructive", title: "Short Insight Line is required" }); return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/insights" : `/api/insights/${id}`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Save failed");
      toast({ title: "Insight saved!" });
      if (isNew) navigate(`${BASE}insights`);
    } catch {
      toast({ variant: "destructive", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this insight? This cannot be undone.")) return;
    await fetch(`/api/insights/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Deleted" });
    navigate(`${BASE}insights`);
  };

  const handleDuplicate = async () => {
    const r = await fetch("/api/insights", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, shortInsightLine: form.shortInsightLine + " (copy)" }),
    });
    const d = await r.json();
    toast({ title: "Duplicated" });
    navigate(`${BASE}insights/${d.data?.id}`);
  };

  const wordCount = form.longerExplainer.trim().split(/\s+/).filter(Boolean).length;

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`${BASE}insights`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{isNew ? "New Insight Block" : "Edit Insight Block"}</h1>
              <p className="text-xs text-muted-foreground">{isNew ? "Create a new insight block" : form.shortInsightLine || "Insight editor"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <>
                <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="w-3 h-3 mr-1" />Duplicate</Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={handleDelete}>
                  <Trash2 className="w-3 h-3 mr-1" />Delete
                </Button>
              </>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-3 h-3 mr-1" />{saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-0 h-full">
            {/* Form Column */}
            <div className="border-r p-6 space-y-5 overflow-y-auto">
              <div>
                <Label>Short Insight Line <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground mb-1">The hook or attention-grabber. 50–100 chars recommended.</p>
                <Input value={form.shortInsightLine} onChange={e => setForm(p => ({ ...p, shortInsightLine: e.target.value }))}
                  placeholder="Most homepages don't communicate their core value in 3 seconds" />
                <p className="text-xs text-muted-foreground mt-1 text-right">{form.shortInsightLine.length} chars</p>
              </div>

              <div>
                <Label>Business Consequence</Label>
                <p className="text-xs text-muted-foreground mb-1">The pain the prospect is experiencing.</p>
                <textarea
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Visitors leave confused about what you do"
                  value={form.businessConsequence}
                  onChange={e => setForm(p => ({ ...p, businessConsequence: e.target.value }))}
                />
              </div>

              <div>
                <Label>Full Insight Block</Label>
                <p className="text-xs text-muted-foreground mb-1">Complete insight paragraph. 2–3 sentences.</p>
                <textarea
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="I was reviewing your homepage and noticed..."
                  value={form.longerExplainer}
                  onChange={e => setForm(p => ({ ...p, longerExplainer: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">{wordCount} words</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Code</Label>
                  <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    value={form.issueCode} onChange={e => setForm(p => ({ ...p, issueCode: e.target.value }))}>
                    {ISSUE_CODES.map(c => <option key={c} value={c}>{ISSUE_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <Label>ICP</Label>
                  <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    value={form.icp} onChange={e => setForm(p => ({ ...p, icp: e.target.value }))}>
                    {ICP_LIST.map(i => <option key={i} value={i}>{i.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Channels <span className="text-destructive">*</span></Label>
                <div className="flex gap-4">
                  {CHANNELS.map(ch => (
                    <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.suitableChannels.includes(ch)}
                        onChange={() => toggleArr("suitableChannels", ch)} />
                      {ch}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">CTA Style</Label>
                <div className="flex flex-wrap gap-2">
                  {CTA_STYLES.map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.ctaPairings.includes(s)}
                        onChange={() => toggleArr("ctaPairings", s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Related Assets</Label>
                <div className="space-y-1">
                  {ASSETS.map(a => (
                    <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.assetPairings.includes(a)}
                        onChange={() => toggleArr("assetPairings", a)} />
                      {a}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Status</Label>
                <div className="flex gap-6">
                  {[true, false].map(v => (
                    <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={form.active === v} onChange={() => setForm(p => ({ ...p, active: v }))} />
                      {v ? "Active" : "Inactive"}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Column */}
            <div className="p-6 bg-muted/10 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">Live Preview</h3>
              </div>

              <div className="bg-card border rounded-xl p-5 shadow-sm mb-4">
                <div className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Email Preview</div>
                <p className="text-sm leading-relaxed">
                  <span className="text-muted-foreground">Hi [First Name],</span>
                  <br /><br />
                  {form.businessConsequence
                    ? <><span className="text-foreground">I noticed that {form.businessConsequence.toLowerCase()}.</span><br /><br /></>
                    : null}
                  <span className="text-foreground font-medium">{form.shortInsightLine || "[Short insight line will appear here]"}</span>
                  {form.longerExplainer && <><br /><br /><span className="text-foreground">{form.longerExplainer}</span></>}
                  <br /><br />
                  <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {form.ctaPairings.includes("Permission")
                      ? "Would you be open to a quick look at how we could help?"
                      : form.ctaPairings.includes("Interest")
                      ? "Would you find it valuable if I shared a quick analysis?"
                      : form.ctaPairings.includes("Soft Close")
                      ? "Let's find a time this week to discuss."
                      : "Reply with your availability and we can set up a call."}
                  </span>
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Issue:</span>
                  <Badge variant="outline">{ISSUE_LABELS[form.issueCode] || form.issueCode}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">ICP:</span>
                  <span>{form.icp.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Channels:</span>
                  <span>{form.suitableChannels.join(", ") || "None selected"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">CTA Style:</span>
                  <span>{form.ctaPairings.join(", ") || "None selected"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Status:</span>
                  <Badge className={form.active ? "bg-green-100 text-green-700" : ""}>{form.active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
