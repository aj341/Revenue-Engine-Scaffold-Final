import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Calendar, Building2, User, Zap, FileText, ChevronRight, Clock, RefreshCw, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface PrepBrief {
  contact_summary: string;
  company_context: string;
  pain_points: string[];
  discovery_questions: string[];
  value_prop_angle: string;
  possible_objections: { objection: string; response: string }[];
  deal_value_rationale: string;
  recommended_next_step: string;
}

export default function CallsPage() {
  const { toast } = useToast();
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [brief, setBrief] = useState<PrepBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["opportunities-booked"],
    queryFn: () => apiFetch("/api/opportunities"),
  });

  const opps: any[] = (data?.data || []).filter((o: any) => ["booked", "held"].includes(o.stage));

  const generateBrief = async (opp: any) => {
    setBriefLoading(true);
    setSelectedOpp(opp);
    setBriefOpen(true);
    setBrief(null);

    try {
      const accountData = opp.account;
      const contactData = opp.contact;

      const mockBrief: PrepBrief = {
        contact_summary: `${contactData?.fullName || contactData?.firstName || "Contact"} is the ${contactData?.jobTitle || "decision maker"} at ${accountData?.companyName || "this company"}. They've expressed interest in Design Bees' subscription services.`,
        company_context: `${accountData?.companyName || "The company"} is a ${accountData?.icpType || "target ICP"} business. They booked a call ${opp.bookedAt ? formatDistanceToNow(new Date(opp.bookedAt), { addSuffix: true }) : "recently"}.`,
        pain_points: [
          "Inconsistent design quality slowing down marketing output",
          "High cost of full-time design resource or agency retainer",
          "Slow turnaround times on design requests",
          "Difficulty communicating design needs to freelancers",
        ],
        discovery_questions: [
          "What does your current design process look like — who handles design work today?",
          "What's your biggest bottleneck when it comes to getting design work done?",
          "How many design requests do you typically have in a given month?",
          "What's been your experience with agencies or freelancers in the past?",
          "What would success look like for you over the next 90 days?",
        ],
        value_prop_angle: `Focus on predictability and speed — Design Bees gives ${accountData?.companyName || "them"} a dedicated design team on tap, with unlimited requests, fast turnaround, and a flat monthly fee. No briefing overhead, no project management pain.`,
        possible_objections: [
          { objection: "We already have a designer", response: "That's great — many of our best clients use us to overflow their existing designer so they can focus on strategic work instead of execution." },
          { objection: "We don't have consistent enough work", response: "That's exactly why a subscription works better than an agency — you pay one flat fee regardless of volume, and you're never scrambling to find someone when a big push comes up." },
          { objection: "The price is too high", response: "Let's put it in context — a full-time junior designer costs £40k+ before benefits. Our subscription is a fraction of that, with senior-level output and no hiring risk." },
        ],
        deal_value_rationale: opp.valueEstimate ? `Estimated deal value: $${Number(opp.valueEstimate).toLocaleString()}/year. Focus on demonstrating ROI within first 30 days.` : "Focus on value delivered vs. cost saved compared to alternatives.",
        recommended_next_step: "Send a short proposal after the call within 24 hours while momentum is high. Offer a 2-week pilot if they're hesitant.",
      };

      await new Promise((r) => setTimeout(r, 1200));
      setBrief(mockBrief);
    } catch (e) {
      toast({ title: "Failed to generate brief", variant: "destructive" });
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <AppLayout title="Call Prep">
      <div className="p-6 h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Upcoming calls from booked and held opportunities</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : opps.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <p className="text-muted-foreground font-medium">No upcoming calls</p>
            <p className="text-sm text-muted-foreground">Booked and held opportunities will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {opps.map((opp) => (
              <Card key={opp.id} className="rounded-2xl border-none shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-5 space-y-4">
                  {/* Company */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-base">{opp.account?.companyName || "—"}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                        {opp.contact?.fullName || `${opp.contact?.firstName || ""} ${opp.contact?.lastName || ""}`.trim() || "—"}
                        {opp.contact?.jobTitle && ` · ${opp.contact.jobTitle}`}
                      </div>
                    </div>
                    <Badge variant={opp.stage === "booked" ? "default" : "secondary"} className="rounded-full text-xs">
                      {opp.stage === "booked" ? "Call Booked" : "Call Held"}
                    </Badge>
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5 text-sm">
                    {opp.bookedAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 shrink-0" />
                        Booked {formatDistanceToNow(new Date(opp.bookedAt), { addSuffix: true })}
                      </div>
                    )}
                    {opp.valueEstimate && (
                      <div className="flex items-center gap-2 text-green-700 font-medium">
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        ${Number(opp.valueEstimate).toLocaleString()} est. value
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {opp.notes && <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 line-clamp-2">{opp.notes}</p>}

                  {/* Action */}
                  <Button className="w-full rounded-xl" onClick={() => generateBrief(opp)}>
                    <Zap className="w-4 h-4 mr-2" /> Generate Prep Brief
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Prep Brief Dialog */}
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Call Prep Brief — {selectedOpp?.account?.companyName}
            </DialogTitle>
          </DialogHeader>

          {briefLoading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Generating your call prep brief...</p>
            </div>
          ) : brief ? (
            <div className="space-y-5">
              {/* Contact & Company */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-xl border-none shadow-sm bg-muted/40">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact</p>
                    <p className="text-sm leading-relaxed">{brief.contact_summary}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-none shadow-sm bg-muted/40">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Company</p>
                    <p className="text-sm leading-relaxed">{brief.company_context}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pain Points */}
              <Card className="rounded-xl border-none shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Likely Pain Points</p>
                  <ul className="space-y-1.5">
                    {brief.pain_points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 mt-0.5 shrink-0">•</span>{p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Discovery Questions */}
              <Card className="rounded-xl border-none shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3">Discovery Questions</p>
                  <ol className="space-y-2">
                    {brief.discovery_questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>{q}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Value Prop */}
              <Card className="rounded-xl border-none shadow-sm bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Value Prop Angle</p>
                  <p className="text-sm leading-relaxed">{brief.value_prop_angle}</p>
                </CardContent>
              </Card>

              {/* Objections */}
              <Card className="rounded-xl border-none shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Common Objections & Responses</p>
                  <div className="space-y-3">
                    {brief.possible_objections.map((o, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-sm font-medium text-orange-700">"{o.objection}"</p>
                        <p className="text-sm text-foreground pl-3 border-l-2 border-green-400">{o.response}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Step */}
              <Card className="rounded-xl border-none shadow-sm bg-green-50">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">Recommended Next Step</p>
                  <p className="text-sm leading-relaxed text-green-900">{brief.recommended_next_step}</p>
                </CardContent>
              </Card>

              <Button variant="outline" className="w-full rounded-xl" onClick={() => {
                const text = [
                  `CALL PREP BRIEF — ${selectedOpp?.account?.companyName}`,
                  "", brief.contact_summary, "", brief.company_context, "",
                  "PAIN POINTS:", ...brief.pain_points.map(p => `• ${p}`),
                  "", "DISCOVERY QUESTIONS:", ...brief.discovery_questions.map((q, i) => `${i+1}. ${q}`),
                  "", "VALUE PROP:", brief.value_prop_angle,
                  "", "NEXT STEP:", brief.recommended_next_step,
                ].join("\n");
                navigator.clipboard.writeText(text);
                toast({ title: "Copied to clipboard" });
              }}>Copy Brief</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
