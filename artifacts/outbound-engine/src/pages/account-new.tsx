import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useCreateAccount } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";

export default function AccountNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({
    companyName: "",
    domain: "",
    websiteUrl: "",
    industry: "",
    employeeBand: "",
    priorityTier: "medium",
    description: "",
    knownChallenges: "",
    fitScore: "50",
  });

  const createMutation = useCreateAccount({
    mutation: {
      onSuccess: (res: any) => {
        toast({ title: "Account created!" });
        navigate(`/accounts/${res.data?.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create account", variant: "destructive" });
      }
    }
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.domain) {
      toast({ title: "Company name and domain are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      data: {
        ...form,
        fitScore: parseInt(form.fitScore) || 50,
        domain: form.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0],
      }
    } as any);
  };

  return (
    <AppLayout title="New Account">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/accounts")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Accounts
        </button>
        <Card className="rounded-2xl border-none shadow-md">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Add New Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Company Name <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" placeholder="Acme Inc." value={form.companyName} onChange={set("companyName")} required />
                </div>
                <div>
                  <Label>Domain <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" placeholder="acme.com" value={form.domain} onChange={set("domain")} required />
                  <p className="text-xs text-muted-foreground mt-1">Just the domain, e.g. acme.com</p>
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input className="mt-1" placeholder="https://acme.com" value={form.websiteUrl} onChange={set("websiteUrl")} />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input className="mt-1" placeholder="SaaS, E-commerce..." value={form.industry} onChange={set("industry")} />
                </div>
                <div>
                  <Label>Employee Count</Label>
                  <Input className="mt-1" placeholder="1-10, 11-50..." value={form.employeeBand} onChange={set("employeeBand")} />
                </div>
                <div>
                  <Label>Priority Tier</Label>
                  <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.priorityTier} onChange={set("priorityTier")}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="strategic">Strategic</option>
                  </select>
                </div>
                <div>
                  <Label>Fit Score (0-100)</Label>
                  <Input className="mt-1" type="number" min="0" max="100" placeholder="50" value={form.fitScore} onChange={set("fitScore")} />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea className="mt-1" placeholder="What does this company do?" rows={3} value={form.description} onChange={set("description")} />
                </div>
                <div className="col-span-2">
                  <Label>Known Challenges</Label>
                  <Textarea className="mt-1" placeholder="What challenges are they likely facing?" rows={3} value={form.knownChallenges} onChange={set("knownChallenges")} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => navigate("/accounts")}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : "Create Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
