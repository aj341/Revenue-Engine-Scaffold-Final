import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useCreateContact, useListAccounts } from "@workspace/api-client-react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, User } from "lucide-react";

const SENIORITY_FROM_TITLE = (title: string): string => {
  const t = title.toLowerCase();
  if (/ceo|cto|cfo|coo|founder|co-founder|chief|president/.test(t)) return "c_level";
  if (/\bvp\b|vice president/.test(t)) return "vp";
  if (/director|head of/.test(t)) return "director";
  if (/manager|coordinator|supervisor/.test(t)) return "manager";
  if (/engineer|designer|developer|analyst|specialist/.test(t)) return "individual_contributor";
  return "other";
};

export default function ContactNew() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefilledAccountId = params.get("accountId") || "";
  const { toast } = useToast();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    jobTitle: "",
    seniority: "individual_contributor",
    accountId: prefilledAccountId,
    notes: "",
  });

  const { data: accountsData } = useListAccounts({ pageSize: 200 });
  const accounts = (accountsData as any)?.data || [];

  const createMutation = useCreateContact({
    mutation: {
      onSuccess: (res: any) => {
        toast({ title: "Contact created!" });
        navigate(`/contacts/${res.data?.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create contact", variant: "destructive" });
      }
    }
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm(p => {
      const updated = { ...p, [k]: val };
      if (k === "jobTitle") updated.seniority = SENIORITY_FROM_TITLE(val);
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) {
      toast({ title: "First name and email are required", variant: "destructive" });
      return;
    }
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ");
    createMutation.mutate({ data: { ...form, fullName } } as any);
  };

  return (
    <AppLayout title="New Contact">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/contacts")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Contacts
        </button>
        <Card className="rounded-2xl border-none shadow-md">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Add New Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" placeholder="Jane" value={form.firstName} onChange={set("firstName")} required />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input className="mt-1" placeholder="Smith" value={form.lastName} onChange={set("lastName")} />
                </div>
                <div>
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" type="email" placeholder="jane@example.com" value={form.email} onChange={set("email")} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input className="mt-1" placeholder="+44 7700 900000" value={form.phone} onChange={set("phone")} />
                </div>
                <div className="col-span-2">
                  <Label>LinkedIn URL</Label>
                  <Input className="mt-1" placeholder="https://linkedin.com/in/janesmith" value={form.linkedinUrl} onChange={set("linkedinUrl")} />
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input className="mt-1" placeholder="Head of Marketing" value={form.jobTitle} onChange={set("jobTitle")} />
                </div>
                <div>
                  <Label>Seniority Level</Label>
                  <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.seniority} onChange={set("seniority")}>
                    <option value="c_level">C-Level</option>
                    <option value="vp">VP</option>
                    <option value="director">Director</option>
                    <option value="manager">Manager</option>
                    <option value="individual_contributor">Individual Contributor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>Account <span className="text-red-500">*</span></Label>
                  <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.accountId} onChange={set("accountId")} required>
                    <option value="">Select an account...</option>
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.companyName}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea className="mt-1" placeholder="Any context about this contact..." rows={3} value={form.notes} onChange={set("notes")} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => navigate("/contacts")}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : "Create Contact"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
