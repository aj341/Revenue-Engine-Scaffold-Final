import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Users, Search, CheckCircle2, Zap, ArrowRight, Activity, TrendingUp, Target, Calendar, Inbox, ListChecks, Clock } from "lucide-react";
import { useGetDashboardMetrics, useGetPipelineSnapshot, useGetActivityToday } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatDistanceToNow, isPast } from "date-fns";

const STAGE_COLORS = [
  "bg-slate-400", "bg-blue-400", "bg-purple-400", "bg-orange-400", "bg-yellow-400",
  "bg-green-500", "bg-red-400", "bg-pink-400", "bg-teal-400", "bg-indigo-400",
];

export default function Dashboard() {
  const { data: metricsRes, isLoading: metricsLoading } = useGetDashboardMetrics();
  const { data: pipelineRes, isLoading: pipelineLoading } = useGetPipelineSnapshot();
  const { data: todayRes, isLoading: todayLoading } = useGetActivityToday();

  const metrics = (metricsRes as any) || {
    callsBookedThisWeek: 0, positiveRepliesThisWeek: 0, activeProspects: 0,
    accountsAnalyzed: 0, tasksDueToday: 0, openPipelineCount: 0
  };

  const today = todayRes as any;

  const kpis = [
    { title: "Calls Booked This Week", value: metrics.callsBookedThisWeek, icon: Phone, color: "text-blue-500", bg: "bg-blue-500/10", href: "/calls" },
    { title: "Positive Replies This Week", value: metrics.positiveRepliesThisWeek, icon: MessageSquare, color: "text-green-500", bg: "bg-green-500/10", href: "/inbox" },
    { title: "Active Prospects", value: metrics.activeProspects, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", href: "/contacts" },
    { title: "Accounts Analyzed", value: metrics.accountsAnalyzed, icon: Search, color: "text-orange-500", bg: "bg-orange-500/10", href: "/analyses" },
    { title: "Tasks Due Today", value: metrics.tasksDueToday, icon: CheckCircle2, color: "text-red-500", bg: "bg-red-500/10", href: "/tasks" },
    { title: "Open Pipeline", value: metrics.openPipelineCount, icon: Target, color: "text-yellow-500", bg: "bg-yellow-500/10", href: "/opportunities" },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  return (
    <AppLayout title="Dashboard">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Quick Actions */}
        <motion.div variants={item} className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border shadow-sm">
          <span className="text-sm font-semibold text-muted-foreground">Quick Actions:</span>
          <Link href="/accounts/import">
            <Button variant="default" size="sm" className="rounded-xl shadow-md">Import Accounts</Button>
          </Link>
          <Link href="/inbox">
            <Button variant="outline" size="sm" className="rounded-xl">
              <Inbox className="w-4 h-4 mr-1" /> Reply Inbox
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline" size="sm" className="rounded-xl">
              <CheckCircle2 className="w-4 h-4 mr-1" /> My Tasks
            </Button>
          </Link>
          <Link href="/opportunities">
            <Button variant="outline" size="sm" className="rounded-xl">
              <Target className="w-4 h-4 mr-1" /> Pipeline
            </Button>
          </Link>
          <Link href="/calls">
            <Button variant="outline" size="sm" className="rounded-xl">
              <Phone className="w-4 h-4 mr-1" /> Call Prep
            </Button>
          </Link>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div variants={item} key={i}>
                <Link href={kpi.href}>
                  <Card className="rounded-2xl border-none shadow-md overflow-hidden relative group hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                      <Icon className="w-16 h-16" />
                    </div>
                    <CardContent className="p-4">
                      <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                        <Icon className={`w-4 h-4 ${kpi.color}`} />
                      </div>
                      <div className="text-3xl font-display font-bold text-foreground mb-1">
                        {metricsLoading ? <span className="animate-pulse bg-muted rounded w-10 h-8 block" /> : kpi.value}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">{kpi.title}</div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pipeline Snapshot */}
          <motion.div variants={item}>
            <Card className="rounded-2xl border-none shadow-md h-full flex flex-col">
              <CardHeader className="border-b bg-muted/20 pb-3 pt-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Prospect Pipeline
                  </div>
                  <Link href="/contacts">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full"><ArrowRight className="w-3.5 h-3.5" /></Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                {pipelineLoading ? (
                  <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {((pipelineRes as any)?.stages?.length ? (pipelineRes as any).stages : []).map((stage: any, idx: number) => {
                      const maxCount = Math.max(...((pipelineRes as any)?.stages || []).map((s: any) => s.count));
                      const pct = maxCount ? (stage.count / maxCount) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{(stage.stage || "unknown").replace(/_/g, " ")}</span>
                            <span className="font-bold">{stage.count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${STAGE_COLORS[idx % STAGE_COLORS.length]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {!(pipelineRes as any)?.stages?.length && <div className="text-center text-muted-foreground text-sm py-8">No pipeline data</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tasks Due Today */}
          <motion.div variants={item}>
            <Card className="rounded-2xl border-none shadow-md h-full flex flex-col">
              <CardHeader className="border-b bg-muted/20 pb-3 pt-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-red-500" />
                    Tasks Due Today
                    <Badge variant="destructive" className="rounded-full text-xs">{today?.tasksDue?.length || 0}</Badge>
                  </div>
                  <Link href="/tasks">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full"><ArrowRight className="w-3.5 h-3.5" /></Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                {todayLoading ? (
                  <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}</div>
                ) : today?.tasksDue?.length ? (
                  <div className="divide-y overflow-y-auto max-h-[220px]">
                    {today.tasksDue.map((task: any) => {
                      const isOverdue = task.dueAt && isPast(new Date(task.dueAt));
                      return (
                        <div key={task.id} className="p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-yellow-500" : "bg-gray-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {task.companyName && <span>{task.companyName}</span>}
                                {task.dueAt && <span className={`flex items-center gap-0.5 ${isOverdue ? "text-red-600" : ""}`}><Clock className="w-3 h-3" />{isOverdue ? "Overdue" : "Today"}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-sm">No tasks due today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Hot Prospects / Upcoming Calls */}
          <motion.div variants={item}>
            <Card className="rounded-2xl border-none shadow-md h-full flex flex-col">
              <CardHeader className="border-b bg-muted/20 pb-3 pt-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Hot Prospects
                    <Badge className="rounded-full text-xs bg-primary/10 text-primary border-0">{today?.hotProspects?.length || 0}</Badge>
                  </div>
                  <Link href="/inbox">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full"><ArrowRight className="w-3.5 h-3.5" /></Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                {todayLoading ? (
                  <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}</div>
                ) : today?.hotProspects?.length ? (
                  <div className="divide-y overflow-y-auto max-h-[220px]">
                    {today.hotProspects.map((hp: any) => (
                      <div key={hp.id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{hp.companyName}</div>
                            <div className="text-xs text-muted-foreground truncate">{hp.urgencyReason}</div>
                          </div>
                          {hp.urgency && <Badge variant="outline" className="text-[10px] shrink-0">{hp.urgency}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                    <Zap className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-sm">No hot prospects</p>
                    <p className="text-xs text-center mt-1">Positive replies will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* Upcoming Calls */}
        {today?.upcomingCalls?.length > 0 && (
          <motion.div variants={item}>
            <Card className="rounded-2xl border-none shadow-md">
              <CardHeader className="border-b bg-muted/20 pb-3 pt-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    Upcoming Calls
                  </div>
                  <Link href="/calls">
                    <Button size="sm" variant="ghost" className="h-6 rounded-xl text-xs">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {today.upcomingCalls.map((call: any) => (
                    <div key={call.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{call.companyName}</p>
                        <p className="text-xs text-muted-foreground truncate">{call.contactName}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white shrink-0">
                        {call.stage === "booked" ? "Booked" : "Held"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </motion.div>
    </AppLayout>
  );
}
