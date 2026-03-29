import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Zap, Copy, Save, Send, ChevronDown, ChevronUp,
  Mail, Linkedin, Phone, Loader2, ThumbsUp, ThumbsDown, X,
} from "lucide-react";

const CHANNELS = ["Email","LinkedIn","Phone"];
const TONES = ["Concise","Consultative","Direct"];
const STAGES = ["First Touch","Follow-up 1","Follow-up 2","Follow-up 3","Follow-up 4","Breakup"];
const CTA_STYLES = ["Permission","Interest","Soft Close","Direct"];
const ASSETS = ["None","Homepage Analyzer Result","Calculator","Brief Builder","Portfolio Link","Case Study Link","Webinar/Video Link"];
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

function ChannelIcon({ ch }: { ch: string }) {
  if (ch === "Email") return <Mail className="w-4 h-4" />;
  if (ch === "LinkedIn") return <Linkedin className="w-4 h-4" />;
  return <Phone className="w-4 h-4" />;
}

export default function Messages() {
  const { toast } = useToast();
  const [prospectMode, setProspectMode] = useState<"existing" | "manual">("manual");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const [manualContext, setManualContext] = useState({
    company_name: "", industry: "", contact_name: "", issue_codes: [] as string[],
  });

  const [channel, setChannel] = useState("Email");
  const [tone, setTone] = useState("Consultative");
  const [stage, setStage] = useState("First Touch");
  const [ctaStyle, setCtaStyle] = useState("Permission");
  const [asset, setAsset] = useState("None");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wordCountTarget, setWordCountTarget] = useState(70);
  const [personalizationLevel, setPersonalizationLevel] = useState(75);
  const [urgencyLevel, setUrgencyLevel] = useState("Medium");

  const [variants, setVariants] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState<any | null>(null);
  const [saveModal, setSaveModal] = useState<any | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    fetch("/api/accounts?pageSize=200", { credentials: "include" })
      .then(r => r.json()).then(d => setAccounts(d.data || []));
  }, []);

  useEffect(() => {
    if (!selectedAccountId) { setContacts([]); return; }
    const acc = accounts.find(a => a.id === selectedAccountId);
    setSelectedAccount(acc || null);
    fetch(`/api/contacts?accountId=${selectedAccountId}&pageSize=100`, { credentials: "include" })
      .then(r => r.json()).then(d => setContacts(d.data || []));
  }, [selectedAccountId, accounts]);

  useEffect(() => {
    if (!selectedContactId) { setSelectedContact(null); return; }
    const c = contacts.find(c => c.id === selectedContactId);
    setSelectedContact(c || null);
  }, [selectedContactId, contacts]);

  const buildContext = () => {
    if (prospectMode === "existing") {
      return {
        company_name: selectedAccount?.companyName || "",
        industry: selectedAccount?.industry || "",
        contact_name: selectedContact ? `${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim() : "",
        contact_email: selectedContact?.email || "",
        contact_title: selectedContact?.jobTitle || "",
        seniority_level: selectedContact?.seniority || "",
        icp: selectedAccount?.icp || "",
        issue_codes: selectedAccount?.likelyPrimaryProblem
          ? [selectedAccount.likelyPrimaryProblem, selectedAccount.likelySecondaryProblem].filter(Boolean)
          : [],
      };
    }
    return {
      company_name: manualContext.company_name,
      industry: manualContext.industry,
      contact_name: manualContext.contact_name,
      issue_codes: manualContext.issue_codes,
    };
  };

  const handleGenerate = async () => {
    const ctx = buildContext();
    if (!ctx.company_name && !ctx.contact_name) {
      toast({ variant: "destructive", title: "Please provide a company name or select a contact." });
      return;
    }
    setGenerating(true);
    setVariants([]);
    try {
      const r = await fetch("/api/generate-message", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_context: ctx,
          generation_params: {
            channel, tone, stage, cta_style: ctaStyle,
            asset_to_reference: asset === "None" ? null : asset,
            word_count_target: wordCountTarget,
            personalization_level: personalizationLevel,
            urgency_level: urgencyLevel,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Generation failed");
      setVariants(d.data?.variants || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Generation failed", description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const saveAsTemplate = async () => {
    if (!saveModal || !templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await fetch("/api/message-templates", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          channel,
          tone,
          stage,
          ctaStyle,
          subject_line: saveModal.subject_line,
          body_text: saveModal.body_text,
          icp: selectedAccount?.icp || null,
        }),
      });
      toast({ title: "Template saved!" });
      setSaveModal(null);
      setTemplateName("");
    } finally {
      setSavingTemplate(false);
    }
  };

  const toggleIssue = (code: string) => {
    setManualContext(p => ({
      ...p,
      issue_codes: p.issue_codes.includes(code) ? p.issue_codes.filter(x => x !== code) : [...p.issue_codes, code],
    }));
  };

  return (
    <Layout>
      <div className="flex h-full overflow-hidden">
        {/* LEFT: Prospect Context */}
        <div className="w-72 shrink-0 border-r bg-muted/10 overflow-y-auto p-4 space-y-4">
          <h2 className="font-semibold text-sm">Prospect Context</h2>

          <div className="flex rounded-lg border overflow-hidden">
            {(["existing","manual"] as const).map(m => (
              <button key={m} onClick={() => setProspectMode(m)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${prospectMode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}>
                {m === "existing" ? "Existing Contact" : "Manual Entry"}
              </button>
            ))}
          </div>

          {prospectMode === "existing" ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Account</Label>
                <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                  value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                  <option value="">Select account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.companyName}</option>)}
                </select>
              </div>
              {contacts.length > 0 && (
                <div>
                  <Label className="text-xs">Contact</Label>
                  <select className="w-full mt-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)}>
                    <option value="">All contacts</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.jobTitle}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedAccount && (
                <div className="rounded-lg border bg-card p-3 text-xs space-y-1.5">
                  <div className="font-semibold">{selectedAccount.companyName}</div>
                  {selectedAccount.industry && <div className="text-muted-foreground">{selectedAccount.industry}</div>}
                  {selectedAccount.icp && <Badge variant="outline" className="text-xs">{selectedAccount.icp.replace(/_/g, " ")}</Badge>}
                  {selectedAccount.fitScore && <div>Fit score: <span className="font-medium">{selectedAccount.fitScore}</span></div>}
                  {selectedAccount.likelyPrimaryProblem && (
                    <div className="text-muted-foreground">Primary issue: <span className="font-medium text-foreground">{ISSUE_LABELS[selectedAccount.likelyPrimaryProblem] || selectedAccount.likelyPrimaryProblem}</span></div>
                  )}
                </div>
              )}
              {selectedContact && (
                <div className="rounded-lg border bg-card p-3 text-xs space-y-1">
                  <div className="font-semibold">{selectedContact.firstName} {selectedContact.lastName}</div>
                  <div className="text-muted-foreground">{selectedContact.jobTitle}</div>
                  <div className="text-muted-foreground">{selectedContact.email}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Company Name *</Label>
                <Input className="mt-1 h-8 text-sm" placeholder="Acme Corp"
                  value={manualContext.company_name} onChange={e => setManualContext(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Industry</Label>
                <Input className="mt-1 h-8 text-sm" placeholder="SaaS"
                  value={manualContext.industry} onChange={e => setManualContext(p => ({ ...p, industry: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Contact Name</Label>
                <Input className="mt-1 h-8 text-sm" placeholder="John Doe"
                  value={manualContext.contact_name} onChange={e => setManualContext(p => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Issue Codes</Label>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {ISSUE_CODES.map(code => (
                    <label key={code} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={manualContext.issue_codes.includes(code)} onChange={() => toggleIssue(code)} />
                      {ISSUE_LABELS[code]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Output */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {variants.length === 0 && !generating ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Message Generator</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Set your prospect context on the left and configure your message parameters on the right, then click Generate.
                </p>
              </div>
            ) : generating ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating 3 variants…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Generated Variants</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{channel}</Badge>
                    <Badge variant="outline">{tone}</Badge>
                    <Badge variant="outline">{stage}</Badge>
                  </div>
                </div>

                {variants.map((v: any) => (
                  <div key={v.variant} className="border rounded-xl bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
                      <span className="text-sm font-medium">Variant {v.variant}</span>
                      <div className="flex items-center gap-1.5">
                        {v.word_count && <span className="text-xs text-muted-foreground">{v.word_count} words</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => copyToClipboard((v.subject_line ? `Subject: ${v.subject_line}\n\n` : "") + v.body_text)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSaveModal(v)}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedVariant(v)}>
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {v.subject_line && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">SUBJECT</div>
                          <div className="font-semibold text-sm">{v.subject_line}</div>
                        </div>
                      )}
                      <div>
                        {channel !== "Phone" ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{v.body_text}</p>
                        ) : (
                          <div className="text-sm space-y-1">
                            {v.body_text?.split("\n").filter(Boolean).map((line: string, i: number) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-muted-foreground mt-0.5">•</span>
                                <span>{line.replace(/^[-•]\s*/, "")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {v.cta && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                          <div className="text-xs font-medium text-blue-600 mb-1">CTA</div>
                          <p className="text-sm text-blue-800 dark:text-blue-200">{v.cta}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Feedback */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
                  <span>How was this output?</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: "Thanks for your feedback!" })}>
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: "Thanks for your feedback!" })}>
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="w-64 shrink-0 border-l bg-muted/10 overflow-y-auto p-4 space-y-5">
          <h2 className="font-semibold text-sm">Generation Settings</h2>

          <div>
            <Label className="text-xs mb-1.5 block">Channel</Label>
            <div className="grid grid-cols-3 gap-1">
              {CHANNELS.map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors border ${channel === ch ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}>
                  <ChannelIcon ch={ch} />
                  <span>{ch === "LinkedIn" ? "LI" : ch}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Tone</Label>
            <div className="space-y-1">
              {TONES.map(t => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Stage</Label>
            <select className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={stage} onChange={e => setStage(e.target.value)}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">CTA Style</Label>
            <select className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={ctaStyle} onChange={e => setCtaStyle(e.target.value)}>
              {CTA_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Asset to Reference</Label>
            <select className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={asset} onChange={e => setAsset(e.target.value)}>
              {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <button className="flex items-center gap-2 text-xs font-medium text-muted-foreground w-full"
              onClick={() => setShowAdvanced(p => !p)}>
              Advanced Options
              {showAdvanced ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label className="text-xs">Word count: {wordCountTarget}</Label>
                  <input type="range" min={40} max={150} value={wordCountTarget}
                    onChange={e => setWordCountTarget(Number(e.target.value))}
                    className="w-full mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Personalization: {personalizationLevel}%</Label>
                  <input type="range" min={0} max={100} value={personalizationLevel}
                    onChange={e => setPersonalizationLevel(Number(e.target.value))}
                    className="w-full mt-1" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Urgency Level</Label>
                  {["Low","Medium","High"].map(u => (
                    <label key={u} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="radio" name="urgency" checked={urgencyLevel === u} onChange={() => setUrgencyLevel(u)} />
                      {u}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Zap className="w-4 h-4 mr-2" />Generate</>}
          </Button>
        </div>
      </div>

      {/* Expanded variant modal */}
      {expandedVariant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold">Variant {expandedVariant.variant}</h3>
              <Button variant="ghost" size="icon" onClick={() => setExpandedVariant(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {expandedVariant.subject_line && (
                <div><div className="text-xs font-medium text-muted-foreground mb-1">SUBJECT</div>
                  <div className="font-semibold">{expandedVariant.subject_line}</div></div>
              )}
              <textarea className="w-full h-48 rounded-xl border border-input bg-background p-3 text-sm resize-none"
                defaultValue={expandedVariant.body_text} />
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <Button variant="outline" onClick={() => copyToClipboard(expandedVariant.body_text)}>
                <Copy className="w-3 h-3 mr-1" />Copy
              </Button>
              <Button onClick={() => { setSaveModal(expandedVariant); setExpandedVariant(null); }}>
                <Save className="w-3 h-3 mr-1" />Save as Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save template modal */}
      {saveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Save as Template</h3>
            <Label className="text-sm">Template Name</Label>
            <Input className="mt-1 mb-4" placeholder="e.g. SaaS Founder — First Touch Email"
              value={templateName} onChange={e => setTemplateName(e.target.value)} />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setSaveModal(null); setTemplateName(""); }}>Cancel</Button>
              <Button onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
                {savingTemplate ? "Saving…" : "Save Template"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
