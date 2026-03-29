import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useGetSettings, useSaveSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Loader2, Save, KeyRound, Mail, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { data: res, isLoading } = useGetSettings();
  const saveMutation = useSaveSettings();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    anthropicApiKey: "",
    openaiApiKey: "",
    analyserApiKey: "",
    defaultSenderName: "",
    defaultSenderEmail: "",
    homepageAnalyserApiUrl: ""
  });

  const [showKeys, setShowKeys] = useState({ anthropic: false, openai: false, analyser: false });

  // Load initial data
  useEffect(() => {
    if (res?.data) {
      setFormData(prev => ({
        ...prev,
        defaultSenderName: res.data.defaultSenderName || "",
        defaultSenderEmail: res.data.defaultSenderEmail || "",
        homepageAnalyserApiUrl: res.data.homepageAnalyserApiUrl || "",
        // Don't overwrite typed keys with empty strings if user is typing, but for simplicity we reset on initial load
      }));
    }
  }, [res?.data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only send keys if they were actually typed in
    const payload: any = {
      defaultSenderName: formData.defaultSenderName,
      defaultSenderEmail: formData.defaultSenderEmail,
      homepageAnalyserApiUrl: formData.homepageAnalyserApiUrl,
    };
    if (formData.anthropicApiKey) payload.anthropicApiKey = formData.anthropicApiKey;
    if (formData.openaiApiKey) payload.openaiApiKey = formData.openaiApiKey;
    if (formData.analyserApiKey) payload.analyserApiKey = formData.analyserApiKey;

    saveMutation.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully", variant: "default" });
        // Clear key fields so placeholders show up again
        setFormData(prev => ({ ...prev, anthropicApiKey: "", openaiApiKey: "", analyserApiKey: "" }));
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const s = res?.data;

  return (
    <AppLayout title="Workspace Settings">
      <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
        
        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="bg-white p-1 rounded-xl shadow-sm border mb-6 h-auto grid grid-cols-3">
            <TabsTrigger value="api-keys" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> API Keys
            </TabsTrigger>
            <TabsTrigger value="sender" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" /> Sender Info
            </TabsTrigger>
            <TabsTrigger value="analyser" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" /> Analyser Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="mt-0">
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-xl">External API Keys</CardTitle>
                <CardDescription>Configure AI providers for generation tasks. Keys are encrypted at rest.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Anthropic API Key</Label>
                  <div className="relative">
                    <Input 
                      name="anthropicApiKey"
                      type={showKeys.anthropic ? "text" : "password"}
                      value={formData.anthropicApiKey}
                      onChange={handleChange}
                      placeholder={s?.hasAnthropicKey ? "•••••••••••••••• (Saved)" : "sk-ant-..."}
                      className="h-12 rounded-xl pr-12 font-mono"
                    />
                    <button type="button" onClick={() => setShowKeys(p => ({...p, anthropic: !p.anthropic}))} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showKeys.anthropic ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>OpenAI API Key</Label>
                  <div className="relative">
                    <Input 
                      name="openaiApiKey"
                      type={showKeys.openai ? "text" : "password"}
                      value={formData.openaiApiKey}
                      onChange={handleChange}
                      placeholder={s?.hasOpenaiKey ? "•••••••••••••••• (Saved)" : "sk-proj-..."}
                      className="h-12 rounded-xl pr-12 font-mono"
                    />
                    <button type="button" onClick={() => setShowKeys(p => ({...p, openai: !p.openai}))} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showKeys.openai ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sender" className="mt-0">
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-xl">Default Sender Details</CardTitle>
                <CardDescription>Used as the fallback identity when sending outbound sequences.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input 
                    name="defaultSenderName"
                    value={formData.defaultSenderName}
                    onChange={handleChange}
                    placeholder="e.g. Alex at Design Bees"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender Email Address</Label>
                  <Input 
                    name="defaultSenderEmail"
                    type="email"
                    value={formData.defaultSenderEmail}
                    onChange={handleChange}
                    placeholder="alex@designbees.com"
                    className="h-12 rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyser" className="mt-0">
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-xl">Homepage Analyser Configuration</CardTitle>
                <CardDescription>Connection details for the external page analysis service.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Analyser API URL</Label>
                  <Input 
                    name="homepageAnalyserApiUrl"
                    value={formData.homepageAnalyserApiUrl}
                    onChange={handleChange}
                    placeholder="https://analyser.designbees.internal/api/v1"
                    className="h-12 rounded-xl font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Analyser API Key</Label>
                  <div className="relative">
                    <Input 
                      name="analyserApiKey"
                      type={showKeys.analyser ? "text" : "password"}
                      value={formData.analyserApiKey}
                      onChange={handleChange}
                      placeholder={s?.hasAnalyserKey ? "•••••••••••••••• (Saved)" : "Enter new token..."}
                      className="h-12 rounded-xl pr-12 font-mono text-sm"
                    />
                    <button type="button" onClick={() => setShowKeys(p => ({...p, analyser: !p.analyser}))} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showKeys.analyser ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Floating Action Bar */}
        <div className="sticky bottom-8 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border shadow-xl flex justify-between items-center z-10">
          <p className="text-sm text-muted-foreground ml-2">Unsaved changes will be lost if you leave this page.</p>
          <Button type="submit" disabled={saveMutation.isPending} className="h-12 px-8 rounded-xl text-base shadow-lg shadow-primary/25">
            {saveMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Save Configuration
          </Button>
        </div>

      </form>
    </AppLayout>
  );
}
