import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, User, Settings, LogOut, Palette, Globe, ChevronDown, 
  Building2, LayoutDashboard, Database, Users, Receipt, Landmark,
  FlaskConical, Factory, FileText, Shield
} from 'lucide-react';
import { useAuthStore, useThemeStore, useLanguageStore, useUIStore } from '@/stores';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials } from '@/lib/utils';
import gsap from 'gsap';

const themes = [
  { id: 'default', name: 'Navy Purple', color: 'bg-indigo-600' },
  { id: 'light-professional', name: 'Light Professional', color: 'bg-blue-500' },
  { id: 'dark', name: 'Dark Mode', color: 'bg-slate-800' },
  { id: 'factory-green', name: 'Factory Green', color: 'bg-emerald-600' },
];

const modules = [
  { id: 'dashboard', label: 'navigation.dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'master', label: 'navigation.masterData', path: '/master', icon: Database },
  { id: 'workers', label: 'navigation.workersActivity', path: '/workers', icon: Users },
  { id: 'cash', label: 'navigation.dailyCashRegister', path: '/cash', icon: Receipt },
  { id: 'bank', label: 'navigation.cashBank', path: '/bank', icon: Landmark },
  { id: 'composition', label: 'navigation.compositionManager', path: '/composition', icon: FlaskConical },
  { id: 'production', label: 'navigation.production', path: '/production', icon: Factory },
  { id: 'reports', label: 'navigation.reports', path: '/reports', icon: FileText },
  { id: 'admin', label: 'navigation.userManagement', path: '/admin', icon: Shield },
];

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, company, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { alerts } = useUIStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  
  const unreadAlerts = alerts.filter((a) => !a.isRead);
  
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
  }, []);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };
  
  const headerClass = cn(
    'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
    isScrolled ? 'bg-background/95 backdrop-blur-md shadow-md border-b' : 'bg-background border-b'
  );
  
  return (
    <header ref={headerRef} className={headerClass}>
      {/* Top Row - Logo and User Features */}
      <div className="h-14 px-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">AKS</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg leading-tight">{t('app.name')}</h1>
            <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </Link>
        
        <div className="flex items-center gap-2">
          {company && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate max-w-[120px]">{company.name}</span>
            </div>
          )}
          
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="hidden sm:flex items-center gap-1.5">
            <Globe className="h-4 w-4" />
            <span className="uppercase font-semibold">{language}</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Palette className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('settings')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {themes.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => setTheme(t.id as any)} className="flex items-center gap-2">
                  <div className={cn('w-4 h-4 rounded-full', t.color)} />
                  <span className={theme === t.id ? 'font-semibold' : ''}>{t.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadAlerts.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {unreadAlerts.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadAlerts.length > 0 && <Badge variant="secondary">{unreadAlerts.length} new</Badge>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {alerts.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-sm">No notifications</div>
              ) : (
                alerts.slice(0, 5).map((alert) => (
                  <DropdownMenuItem key={alert._id} className="flex flex-col items-start gap-1 p-3">
                    <div className="flex items-center gap-2 w-full">
                      <span className={cn('w-2 h-2 rounded-full', alert.type === 'error' && 'bg-red-500', alert.type === 'warning' && 'bg-yellow-500', alert.type === 'success' && 'bg-green-500', alert.type === 'info' && 'bg-blue-500')} />
                      <span className="font-medium text-sm flex-1">{alert.title}</span>
                      {!alert.isRead && <Badge variant="outline" className="text-xs">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{user ? getInitials(user.name) : 'U'}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-tight">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom Row - Navigation */}
      <div className="h-14 px-4 flex items-center bg-background/60 backdrop-blur-sm">
        <nav className="flex items-center gap-1 w-full justify-center lg:justify-center">
          {modules.map((module) => {
            const Icon = module.icon;
            const active = isActive(module.path);
            const linkClass = cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105',
              active 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            );
            return (
              <Link key={module.id} to={module.path} className={linkClass}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(module.label)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
