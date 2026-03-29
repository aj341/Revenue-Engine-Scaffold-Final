import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListAccounts, useCreateAccount } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Loader2, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";

export default function Accounts() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data, isLoading } = useListAccounts({ page: 1, pageSize: 50, search: search || undefined });
  const createMutation = useCreateAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        setIsDialogOpen(false);
        toast({ title: "Account created successfully" });
      }
    }
  });

  const getTierColor = (tier?: string | null) => {
    if (tier === 'A') return 'bg-green-100 text-green-700';
    if (tier === 'B') return 'bg-blue-100 text-blue-700';
    if (tier === 'C') return 'bg-gray-100 text-gray-700';
    return 'bg-muted text-muted-foreground';
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        companyName: formData.get("companyName") as string,
        domain: formData.get("domain") as string,
        industry: formData.get("industry") as string,
        priorityTier: formData.get("priorityTier") as string,
      }
    });
  };

  return (
    <AppLayout title="Accounts">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search accounts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-muted/30 border-transparent focus:bg-background rounded-xl"
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-11 px-6 rounded-xl shadow-md">
                <Plus className="w-5 h-5 mr-2" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Add New Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input name="companyName" required placeholder="Acme Corp" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input name="domain" placeholder="acme.com" className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input name="industry" placeholder="SaaS" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority Tier</Label>
                    <select name="priorityTier" className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="A">Tier A</option>
                      <option value="B">Tier B</option>
                      <option value="C">Tier C</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-xl h-11 px-8">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table Card */}
        <Card className="rounded-2xl border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground py-4">Company Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Domain</TableHead>
                    <TableHead className="font-semibold text-foreground">Industry</TableHead>
                    <TableHead className="font-semibold text-foreground">Priority</TableHead>
                    <TableHead className="font-semibold text-foreground text-right pr-6">Actions</TableHead>
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
                          <Building2 className="w-8 h-8 opacity-20" />
                          <p>No accounts found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((account) => (
                      <TableRow key={account.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium text-foreground py-4">{account.companyName}</TableCell>
                        <TableCell className="text-muted-foreground">{account.domain || '—'}</TableCell>
                        <TableCell>{account.industry || '—'}</TableCell>
                        <TableCell>
                          {account.priorityTier ? (
                            <Badge className={`${getTierColor(account.priorityTier)} hover:${getTierColor(account.priorityTier)} border-none font-bold`}>
                              Tier {account.priorityTier}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Link href={`/accounts/${account.id}`}>
                            <Button variant="ghost" size="sm" className="rounded-lg hover:bg-primary/10 hover:text-primary font-semibold">
                              View Details
                            </Button>
                          </Link>
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
