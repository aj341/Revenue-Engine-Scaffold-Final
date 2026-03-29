import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useGetContact, useUpdateContact, useDeleteContact } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, User, Mail, Phone, Linkedin, Building2, Activity,
  ChevronRight, Edit, Trash2, ExternalLink, Zap, Calendar, MessageSquare, ArrowLeft
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  queued: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  replied: "bg-emerald-100 text-emerald-700",
  booked: "bg-purple-100 text-purple-700",
  held: "bg-indigo-100 text-indigo-700",
  closed_won: "bg-green-600 text-white",
  closed_lost: "bg-red-100 text-red-700",
};

const SENIORITY_LABELS: Record<string, string> = {
  c_level: "C-Level",
  vp: "VP",
  director: "Director",
  manager: "Manager",
  individual_contributor: "Individual Contributor",
  other: "Other",
};

export default function ContactDetail() {
  const [, params] = useRoute("/contacts/:id");
  const id = params?.id || "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: "email", channel: "email", notes: "" });

  const { data: res, isLoading } = useGetContact(id, { query: { enabled: !!id } });
  const contact = res?.data as any;

  const updateMutation = useUpdateContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/contacts/${id}`] });
        setIsEditing(false);
        toast({ title: "Contact updated" });
      }
    }
  });

  const deleteMutation = useDeleteContact({
    mutation: {
      onSuccess: () => {
        toast({ title: "Contact deleted" });
        navigate("/contacts");
      }
    }
  });

  const handleEdit = () => {
    setEditForm({
      firstName: contact?.firstName || "",
      lastName: contact?.lastName || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      linkedinUrl: contact?.linkedinUrl || "",
      jobTitle: contact?.jobTitle || "",
      seniority: contact?.seniority || "other",
      notes: contact?.notes || "",
    });
    setIsEditing(true);
  };

  const handleLogActivity = async () => {
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: id,
          accountId: contact?.accountId,
          activityType: activityForm.type,
          channel: activityForm.channel,
          bodySnippet: activityForm.notes,
          status: "sent",
        }),
      });
      toast({ title: "Activity logged" });
      setLogActivityOpen(false);
    } catch {
      toast({ title: "Failed to log activity", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Loading Contact...">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout title="Contact Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
          <User className="w-16 h-16 opacity-20 mb-4" />
          <h2 className="text-xl font-bold text-foreground">Contact Not Found</h2>
          <p>The requested contact does not exist or was deleted.</p>
        </div>
      </AppLayout>
    );
  }

  const fullName = contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown";
  const status = contact.outreachStatus || "new";

  return (
    <AppLayout title={fullName}>
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate("/contacts")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Contacts
        </button>

        {/* Header */}
        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center">
              {contact.firstName?.charAt(0) || "U"}
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">{fullName}</h1>
              <div className="flex items-center gap-3 text-muted-foreground mt-1 flex-wrap text-sm">
                {contact.jobTitle && <span>{contact.jobTitle}</span>}
                {contact.seniority && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{SENIORITY_LABELS[contact.seniority] || contact.seniority}</span>}
              </div>
            </div>
          </div>
          <div className="relative z-10">
            <Badge className={`text-sm px-4 py-1 capitalize ${STATUS_COLORS[status] || ""}`}>{status.replace("_", " ")}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8">
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" /> Contact Information
                </CardTitle>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={handleEdit}><Edit className="w-4 h-4 mr-1" />Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateMutation.mutate({ id, data: editForm } as any)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { k: "firstName", label: "First Name" },
                      { k: "lastName", label: "Last Name" },
                      { k: "email", label: "Email" },
                      { k: "phone", label: "Phone" },
                      { k: "linkedinUrl", label: "LinkedIn URL" },
                      { k: "jobTitle", label: "Job Title" },
                    ].map(f => (
                      <div key={f.k}>
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        <Input
                          className="mt-1"
                          value={editForm[f.k] || ""}
                          onChange={e => setEditForm(p => ({ ...p, [f.k]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div>
                      <Label className="text-xs text-muted-foreground">Seniority</Label>
                      <select
                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={editForm.seniority || "other"}
                        onChange={e => setEditForm(p => ({ ...p, seniority: e.target.value }))}
                      >
                        {Object.entries(SENIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea className="mt-1" value={editForm.notes || ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contact.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <a href={`mailto:${contact.email}`} className="text-sm font-medium hover:text-primary">{contact.email}</a>
                        </div>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <a href={`tel:${contact.phone}`} className="text-sm font-medium hover:text-primary">{contact.phone}</a>
                        </div>
                      </div>
                    )}
                    {contact.linkedinUrl && (
                      <div className="flex items-center gap-3">
                        <Linkedin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">LinkedIn</p>
                          <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-primary flex items-center gap-1">
                            View Profile <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm bg-muted/30 p-3 rounded-xl border border-border/50">{contact.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Associated Account */}
            {contact.accountId && contact.accountId !== "standalone" && (
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" /> Associated Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:text-primary group transition-colors"
                    onClick={() => navigate(`/accounts/${contact.accountId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary">{contact.accountName || "Unknown Account"}</p>
                        <p className="text-xs text-muted-foreground">Click to view account</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Outreach Status */}
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-lg">Outreach Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                  {["new", "queued", "contacted", "replied", "booked", "held", "closed_won", "closed_lost"].map(s => (
                    <button
                      key={s}
                      onClick={() => updateMutation.mutate({ id, data: { outreachStatus: s } } as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border-2 ${status === s ? `${STATUS_COLORS[s]} border-current scale-105` : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground"}`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Button className="w-full justify-start gap-2" size="sm" onClick={() => navigate(`/messages?contactId=${id}`)}>
                  <MessageSquare className="w-4 h-4" /> Generate Message
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={() => setLogActivityOpen(true)}>
                  <Activity className="w-4 h-4" /> Log Activity
                </Button>
                <Button className="w-full justify-start gap-2" size="sm" variant="outline"
                  onClick={() => updateMutation.mutate({ id, data: { outreachStatus: "booked" } } as any)}>
                  <Calendar className="w-4 h-4" /> Mark as Booked
                </Button>
                {contact.accountId && contact.accountId !== "standalone" && (
                  <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={() => navigate(`/accounts/${contact.accountId}`)}>
                    <Building2 className="w-4 h-4" /> View Account
                  </Button>
                )}
                <Button className="w-full justify-start gap-2" size="sm" variant="outline" onClick={handleEdit}>
                  <Edit className="w-4 h-4" /> Edit Contact
                </Button>
              </CardContent>
            </Card>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 justify-start gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Contact
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {fullName}?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete the contact.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate({ id } as any)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Log Activity Dialog */}
        <Dialog open={logActivityOpen} onOpenChange={setLogActivityOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Activity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Activity Type</Label>
                <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={activityForm.type}
                  onChange={e => setActivityForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="email">Email Sent</option>
                  <option value="linkedin">LinkedIn Message</option>
                  <option value="call">Call</option>
                  <option value="video">Video</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  className="mt-1"
                  placeholder="What happened?"
                  value={activityForm.notes}
                  onChange={e => setActivityForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setLogActivityOpen(false)}>Cancel</Button>
              <Button onClick={handleLogActivity}>Log Activity</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
