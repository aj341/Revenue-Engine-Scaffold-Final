import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft, Plus, Trash2, Save, Mail, Linkedin, Phone, GripVertical,
} from "lucide-react";

const CHANNELS = ["email","linkedin","phone"];
const ICP_LIST = ["saas_founder","design_agency","ecommerce_brand","b2b_services","startup_cto","marketing_lead","enterprise_cx","solo_founder"];
const ISSUE_CODES = ["unclear_cta","weak_hero","no_social_proof","poor_value_prop","bad_mobile","slow_load","confusing_nav","weak_copy","missing_trust","no_personalization","poor_seo","weak_design","no_analytics","poor_conversion","unclear_pricing","weak_testimonials"];
const CTA_STYLES = ["Permission","Interest","Soft Close","Direct"];
const ASSET_OPTIONS = ["None","Homepage Analyzer Result","Calculator","Brief Builder","Portfolio Link","Case Study Link","Webinar/Video Link"];

function ChannelIcon({ ch }: { ch: string }) {
  if (ch === "email") return <Mail className="w-4 h-4" />;
  if (ch === "linkedin") return <Linkedin className="w-4 h-4" />;
  return <Phone className="w-4 h-4" />;
}

function newStep(stepNumber: number): any {
  return {
    id: `tmp_${Date.now()}_${stepNumber}`,
    stepNumber,
    dayOffset: (stepNumber - 1) * 3,
    channel: "email",
    objective: "",
    angle: "",
    assetToInclude: null,
    ctaStyle: "Permission",
    templateId: null,
  };
}

export default function SequenceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";
  const BASE = import.meta.env.BASE_URL;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);

  const [seqName, setSeqName] = useState("");
  const [icp, setIcp] = useState("");
  const [issueCluster, setIssueCluster] = useState("");
  const [ctaStrategy, setCtaStrategy] = useState("soft");
  const [assetStrategy, setAssetStrategy] = useState("none");
  const [active, setActive] = useState(true);
  const [steps, setSteps] = useState<any[]>([newStep(1)]);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const r = await fetch(`/api/sequences/${id}`, { credentials: "include" });
      if (!r.ok) { navigate(`${BASE}sequences`); return; }
      const d = await r.json();
      const seq = d.data;
      setSeqName(seq.sequenceName || "");
      setIcp(seq.icp || "");
      setIssueCluster(seq.issueCluster || "");
      setCtaStrategy(seq.ctaStrategy || "soft");
      setAssetStrategy(seq.assetStrategy || "none");
      setActive(seq.active !== false);
      setSteps(seq.steps?.length > 0 ? seq.steps : [newStep(1)]);
      setLoading(false);
    })();
  }, [id]);

  const updateStep = (idx: number, patch: Partial<any>) => {
    setSteps(s => s.map((step, i) => i === idx ? { ...step, ...patch } : step));
  };

  const addStep = () => {
    const newStepNum = steps.length + 1;
    setSteps(s => [...s, newStep(newStepNum)]);
    setSelectedStepIdx(steps.length);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) { toast({ variant: "destructive", title: "A sequence must have at least 1 step" }); return; }
    if (!confirm("Remove this step?")) return;
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
    setSelectedStepIdx(Math.min(idx, updated.length - 1));
  };

  const handleSave = async () => {
    if (!seqName.trim()) { toast({ variant: "destructive", title: "Sequence name is required" }); return; }
    setSaving(true);
    try {
      const body = {
        sequenceName: seqName, icp: icp || null, issueCluster: issueCluster || null,
        ctaStrategy, assetStrategy, active,
        steps: steps.map(s => ({
          stepNumber: s.stepNumber,
          dayOffset: Number(s.dayOffset) || 0,
          channel: s.channel,
          objective: s.objective || null,
          angle: s.angle || null,
          assetToInclude: s.assetToInclude || null,
          ctaStyle: s.ctaStyle || null,
          templateId: s.templateId || null,
        })),
      };
      const url = isNew ? "/api/sequences" : `/api/sequences/${id}`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Save failed");
      toast({ title: "Sequence saved!" });
      if (isNew) navigate(`${BASE}sequences`);
    } catch {
      toast({ variant: "destructive", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this sequence? This cannot be undone.")) return;
    await fetch(`/api/sequences/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Deleted" });
    navigate(`${BASE}sequences`);
  };

  const channelMix = steps.reduce((acc, s) => {
    acc[s.channel] = (acc[s.channel] || 0) + 1; return acc;
  }, {} as Record<string, number>);

  const selectedStep = steps[selectedStepIdx];

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`${BASE}sequences`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{isNew ? "New Sequence" : seqName || "Edit Sequence"}</h1>
              <p className="text-xs text-muted-foreground">{steps.length} steps · {Object.entries(channelMix).map(([k, v]) => `${v} ${k}`).join(", ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={handleDelete}>
                <Trash2 className="w-3 h-3 mr-1" />Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-3 h-3 mr-1" />{saving ? "Saving…" : "Save Sequence"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Step Timeline */}
          <div className="w-60 shrink-0 border-r bg-muted/10 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id || idx}
                  className={`relative rounded-xl border p-3 cursor-pointer transition-all group ${selectedStepIdx === idx ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
                  onClick={() => setSelectedStepIdx(idx)}>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {step.stepNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ChannelIcon ch={step.channel} />
                        <span className="text-xs text-muted-foreground">Day {step.dayOffset}</span>
                      </div>
                      <p className="text-xs font-medium truncate">{step.objective || "No objective set"}</p>
                    </div>
                  </div>
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); removeStep(idx); }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 border-t">
              <Button variant="outline" size="sm" className="w-full" onClick={addStep}>
                <Plus className="w-3 h-3 mr-1" />Add Step
              </Button>
            </div>
          </div>

          {/* Center: Step Editor */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 border-r">
            {selectedStep && (
              <>
                <div className="text-sm font-semibold text-muted-foreground">
                  Step {selectedStep.stepNumber} of {steps.length}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Day Offset</Label>
                    <Input type="number" min={0} className="mt-1 h-8 text-sm"
                      value={selectedStep.dayOffset}
                      onChange={e => updateStep(selectedStepIdx, { dayOffset: Number(e.target.value) })} />
                    <p className="text-xs text-muted-foreground mt-1">Days after sequence start</p>
                  </div>
                  <div>
                    <Label className="text-xs">Channel</Label>
                    <div className="flex gap-2 mt-1">
                      {CHANNELS.map(ch => (
                        <button key={ch} onClick={() => updateStep(selectedStepIdx, { channel: ch })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedStep.channel === ch ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}>
                          <ChannelIcon ch={ch} />
                          {ch.charAt(0).toUpperCase() + ch.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Objective</Label>
                  <Input className="mt-1 text-sm" placeholder="Introduce yourself and homepage insight"
                    value={selectedStep.objective || ""}
                    onChange={e => updateStep(selectedStepIdx, { objective: e.target.value })} />
                </div>

                <div>
                  <Label className="text-xs">Angle / Hook</Label>
                  <textarea className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Most homepages don't articulate the core value prop clearly..."
                    value={selectedStep.angle || ""}
                    onChange={e => updateStep(selectedStepIdx, { angle: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">CTA Type</Label>
                    <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      value={selectedStep.ctaStyle || "Permission"}
                      onChange={e => updateStep(selectedStepIdx, { ctaStyle: e.target.value })}>
                      {CTA_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Asset to Use</Label>
                    <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      value={selectedStep.assetToInclude || "None"}
                      onChange={e => updateStep(selectedStepIdx, { assetToInclude: e.target.value === "None" ? null : e.target.value })}>
                      {ASSET_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Sequence Settings */}
          <div className="w-64 shrink-0 overflow-y-auto p-5 space-y-4 bg-muted/10">
            <h3 className="text-sm font-semibold">Sequence Settings</h3>

            <div>
              <Label className="text-xs">Sequence Name *</Label>
              <Input className="mt-1 text-sm" placeholder="SaaS Founder — First Response"
                value={seqName} onChange={e => setSeqName(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs">Target ICP</Label>
              <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={icp} onChange={e => setIcp(e.target.value)}>
                <option value="">Any ICP</option>
                {ICP_LIST.map(i => <option key={i} value={i}>{i.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-xs">Issue Cluster</Label>
              <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={issueCluster} onChange={e => setIssueCluster(e.target.value)}>
                <option value="">Any Issue</option>
                {ISSUE_CODES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Channel Mix</Label>
              <div className="rounded-lg border bg-card p-3 text-xs space-y-1">
                {Object.entries(channelMix).map(([ch, n]) => (
                  <div key={ch} className="flex items-center gap-2">
                    <ChannelIcon ch={ch} />
                    <span className="capitalize">{ch}:</span>
                    <span className="font-medium">{n as number}</span>
                  </div>
                ))}
                {Object.keys(channelMix).length === 0 && <span className="text-muted-foreground">No steps yet</span>}
              </div>
            </div>

            <div>
              <Label className="text-xs">CTA Strategy</Label>
              <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={ctaStrategy} onChange={e => setCtaStrategy(e.target.value)}>
                <option value="soft">Soft → Moderate → Assertive</option>
                <option value="moderate">Moderate Throughout</option>
                <option value="assertive">Assertive Throughout</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Asset Strategy</Label>
              <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={assetStrategy} onChange={e => setAssetStrategy(e.target.value)}>
                <option value="none">No Assets</option>
                <option value="lead">Lead with Asset</option>
                <option value="mid">Use Asset Mid-Sequence</option>
              </select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              {[true, false].map(v => (
                <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={active === v} onChange={() => setActive(v)} />
                  {v ? "Active" : "Inactive"}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
