import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListContacts, useCreateContact, useListAccounts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Loader2, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListContacts({ page: 1, pageSize: 50, search: search || undefined });
  const { data: accountsData } = useListAccounts({ pageSize: 100 });
  
  const createMutation = useCreateContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        setIsDialogOpen(false);
        toast({ title: "Contact added successfully" });
      }
    }
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'new': return 'bg-gray-100 text-gray-700';
      case 'queued': return 'bg-blue-100 text-blue-700';
      case 'contacted': return 'bg-yellow-100 text-yellow-700';
      case 'replied': return 'bg-emerald-100 text-emerald-700';
      case 'booked': return 'bg-purple-100 text-purple-700';
      case 'closed_won': return 'bg-green-600 text-white';
      case 'closed_lost': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        accountId: formData.get("accountId") as string,
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: formData.get("email") as string,
        jobTitle: formData.get("jobTitle") as string,
        seniority: formData.get("seniority") as string,
      }
    });
  };

  return (
    <AppLayout title="Contacts">
      <div className="space-y-6">
        
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search contacts by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-muted/30 border-transparent focus:bg-background rounded-xl"
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-11 px-6 rounded-xl shadow-md">
                <Plus className="w-5 h-5 mr-2" />
                New Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Add New Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Account *</Label>
                  <select name="accountId" required className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select Account...</option>
                    {accountsData?.data?.map(a => (
                      <option key={a.id} value={a.id}>{a.companyName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input name="firstName" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input name="lastName" className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input name="email" type="email" className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input name="jobTitle" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Seniority</Label>
                    <select name="seniority" className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="c_level">C-Level</option>
                      <option value="vp">VP</option>
                      <option value="director">Director</option>
                      <option value="manager">Manager</option>
                      <option value="individual_contributor">Individual</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-xl h-11 px-8">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Contact"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="rounded-2xl border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground py-4">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Company</TableHead>
                    <TableHead className="font-semibold text-foreground">Job Title</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-8 h-8 opacity-20" />
                          <p>No contacts found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((contact) => (
                      <TableRow key={contact.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium text-foreground py-4">
                          {contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '—'}
                        </TableCell>
                        <TableCell>{contact.accountName || '—'}</TableCell>
                        <TableCell>{contact.jobTitle || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{contact.email || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(contact.outreachStatus)} hover:${getStatusColor(contact.outreachStatus)} border-none capitalize font-semibold shadow-none`}>
                            {contact.outreachStatus.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
