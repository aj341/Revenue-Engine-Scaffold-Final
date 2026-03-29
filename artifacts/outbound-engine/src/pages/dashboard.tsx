import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Users, Search, CheckCircle2, Zap, ArrowRight, Activity, TrendingUp } from "lucide-react";
import { useGetDashboardMetrics, useGetPipelineSnapshot, useGetActivityToday } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: metricsRes, isLoading: metricsLoading } = useGetDashboardMetrics();
  const { data: pipelineRes, isLoading: pipelineLoading } = useGetPipelineSnapshot();
  const { data: todayRes, isLoading: todayLoading } = useGetActivityToday();

  const metrics = metricsRes || {
    callsBookedThisWeek: 0, positiveRepliesThisWeek: 0, activeProspects: 0,
    accountsAnalyzed: 0, tasksDueToday: 0, hotProspectsCount: 0
  };

  const kpis = [
    { title: "Calls Booked", value: metrics.callsBookedThisWeek, icon: Phone, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Positive Replies", value: metrics.positiveRepliesThisWeek, icon: MessageSquare, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Active Prospects", value: metrics.activeProspects, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Accounts Analyzed", value: metrics.accountsAnalyzed, icon: Search, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Tasks Due", value: metrics.tasksDueToday, icon: CheckCircle2, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "Hot Prospects", value: metrics.hotProspectsCount, icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <AppLayout title="Dashboard">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        
        {/* Quick Actions */}
        <motion.div variants={item} className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm">
          <span className="text-sm font-semibold text-muted-foreground mr-2">Quick Actions:</span>
          <Button variant="default" className="rounded-xl shadow-md">Import Accounts</Button>
          <Link href="/accounts">
            <Button variant="outline" className="rounded-xl">Add Account</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="rounded-xl">View Settings</Button>
          </Link>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div variants={item} key={i}>
                <Card className="rounded-2xl border-none shadow-md overflow-hidden relative group hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-24 h-24" />
                  </div>
                  <CardHeader className="pb-2 flex flex-row justify-between items-start">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    <div className={`p-2 rounded-xl ${kpi.bg}`}>
                      <Icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-display font-bold text-foreground">
                      {metricsLoading ? <span className="animate-pulse bg-muted rounded w-16 h-10 block" /> : kpi.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pipeline Snapshot */}
          <motion.div variants={item}>
            <Card className="rounded-2xl border-none shadow-md h-full flex flex-col">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Pipeline Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1">
                {pipelineLoading ? (
                  <div className="space-y-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pipelineRes?.stages?.length ? pipelineRes.stages.map((stage, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-10 rounded-full bg-primary" />
                          <span className="font-semibold text-foreground capitalize">{stage.stage.replace('_', ' ')}</span>
                        </div>
                        <Badge variant="secondary" className="text-base px-3 py-1 rounded-lg font-bold">
                          {stage.count}
                        </Badge>
                      </div>
                    )) : (
                      <div className="text-center text-muted-foreground py-12">No pipeline data</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Hot Prospects */}
          <motion.div variants={item}>
            <Card className="rounded-2xl border-none shadow-md h-full flex flex-col">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-destructive" />
                    Hot Prospects
                  </div>
                  <Badge variant="destructive" className="rounded-full">{todayRes?.hotProspects?.length || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                {todayLoading ? (
                  <div className="p-6 space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
                  </div>
                ) : todayRes?.hotProspects?.length ? (
                  <div className="divide-y">
                    {todayRes.hotProspects.map((hp) => (
                      <div key={hp.id} className="p-5 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-base">{hp.companyName}</h4>
                            {hp.icpType && <Badge variant="outline" className="text-xs">{hp.icpType.replace('_', ' ')}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{hp.urgencyReason}</p>
                        </div>
                        <Link href={`/accounts/${hp.id}`}>
                          <Button size="icon" variant="ghost" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                    <div className="bg-muted p-4 rounded-full mb-4">
                      <Zap className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p>No hot prospects today.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </motion.div>
    </AppLayout>
  );
}
