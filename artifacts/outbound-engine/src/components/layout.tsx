import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, Building2, Users, Search, Layers, Lightbulb, 
  MessageSquare, GitBranch, ListChecks, Inbox, Phone, Target, 
  Package, FlaskConical, BookOpen, Settings, LogOut, Hexagon, CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: Building2 },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Analyses", href: "/analyses", icon: Search },
  { label: "Issue Clusters", href: "/issues", icon: Layers },
  { label: "Insight Library", href: "/insights", icon: Lightbulb },
  { label: "Message Generator", href: "/messages", icon: MessageSquare },
  { label: "Sequences", href: "/sequences", icon: GitBranch },
  { label: "Execution Queue", href: "/queue", icon: ListChecks },
  { label: "Reply Inbox", href: "/inbox", icon: Inbox },
  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Call Prep", href: "/calls", icon: Phone },
  { label: "Experiments", href: "/experiments", icon: FlaskConical },
  { label: "Playbook & Assets", href: "/playbook", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppLayout({ children, title }: { children: ReactNode, title: string }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col shadow-2xl z-50">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-lg shadow-primary/20">
              <Hexagon className="w-5 h-5 fill-current" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide text-white">Design Bees</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.href);
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="flex-1 text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-40 px-8 flex items-center justify-between">
          <h1 className="text-xl font-display text-foreground">{title}</h1>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1.5 rounded-full hover:bg-muted transition-colors outline-none focus-visible:ring-2 ring-primary">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold text-foreground leading-none">{user?.email || 'Demo User'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Administrator</p>
                  </div>
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">Profile Settings</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Layout for full-height pages (Insight Library, Sequences, Queue, Messages, etc.)
 * Children fill the area below the topbar without padding.
 */
export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col shadow-2xl z-50">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-lg shadow-primary/20">
              <Hexagon className="w-5 h-5 fill-current" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide text-white">Design Bees</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                }`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="flex-1 text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border shrink-0 px-8 flex items-center justify-end z-40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-1.5 rounded-full hover:bg-muted transition-colors outline-none focus-visible:ring-2 ring-primary">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>{user?.email || "Admin"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Full-height content area */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
