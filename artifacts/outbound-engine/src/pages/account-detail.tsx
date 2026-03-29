import { AppLayout } from "@/components/layout";
import { useGetAccount } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Globe, MapPin, Users, Target } from "lucide-react";

export default function AccountDetail() {
  const [, params] = useRoute("/accounts/:id");
  const id = params?.id || "";
  
  const { data: res, isLoading } = useGetAccount(id, { query: { enabled: !!id } });
  const account = res?.data;

  if (isLoading) {
    return (
      <AppLayout title="Loading Account...">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!account) {
    return (
      <AppLayout title="Account Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
          <Building2 className="w-16 h-16 opacity-20 mb-4" />
          <h2 className="text-xl font-bold text-foreground">Account Not Found</h2>
          <p>The requested account does not exist or was deleted.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={account.companyName}>
      <div className="space-y-8">
        
        {/* Header Hero */}
        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center border shadow-inner">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">{account.companyName}</h1>
                <div className="flex items-center gap-3 text-muted-foreground mt-1">
                  {account.domain && (
                    <a href={`https://${account.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                      <Globe className="w-4 h-4" /> {account.domain}
                    </a>
                  )}
                  {account.geography && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {account.geography}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex gap-3">
            {account.priorityTier && (
              <div className="bg-muted px-4 py-2 rounded-xl text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier</p>
                <p className="text-lg font-bold text-foreground">{account.priorityTier}</p>
              </div>
            )}
            {account.fitScore !== null && account.fitScore !== undefined && (
              <div className="bg-primary/10 px-4 py-2 rounded-xl text-center border border-primary/20">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Fit Score</p>
                <p className="text-lg font-bold text-primary">{account.fitScore}/100</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white p-1 rounded-xl shadow-sm border mb-6 h-auto">
            <TabsTrigger value="overview" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Overview</TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Contacts ({account.contacts?.length || 0})</TabsTrigger>
            <TabsTrigger value="analyses" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">Analyses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" /> Company Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Industry</p>
                      <p className="font-semibold text-foreground">{account.industry || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Sub-Industry</p>
                      <p className="font-semibold text-foreground">{account.subIndustry || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Employees</p>
                      <p className="font-semibold text-foreground">{account.employeeBand || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Revenue</p>
                      <p className="font-semibold text-foreground">{account.revenueBand || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-none shadow-md">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-muted-foreground" /> Outbound Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Primary ICP</p>
                      <Badge variant="secondary" className="capitalize">{account.icpType?.replace('_', ' ') || '—'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Lead Source</p>
                      <p className="font-semibold text-foreground">{account.source || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Source Details</p>
                      <p className="text-sm text-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                        {account.sourceDetail || 'No additional details provided.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <Card className="rounded-2xl border-none shadow-md overflow-hidden">
              <div className="p-6 border-b bg-muted/5 flex justify-between items-center">
                <CardTitle>Associated Contacts</CardTitle>
              </div>
              <div className="p-0">
                {account.contacts?.length ? (
                  <div className="divide-y">
                    {account.contacts.map(c => (
                      <div key={c.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                            {c.firstName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold">{c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{c.jobTitle || 'No Title'} • {c.email || 'No Email'}</p>
                          </div>
                        </div>
                        <Badge className="capitalize">{c.outreachStatus}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 opacity-20 mx-auto mb-3" />
                    <p>No contacts found for this account.</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analyses" className="mt-0">
             <Card className="rounded-2xl border-none shadow-md overflow-hidden">
                <div className="p-12 text-center text-muted-foreground">
                  <Search className="w-12 h-12 opacity-20 mx-auto mb-3" />
                  <p>No homepage analyses run yet.</p>
                </div>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
}
