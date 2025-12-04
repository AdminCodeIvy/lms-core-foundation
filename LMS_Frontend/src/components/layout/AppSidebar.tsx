import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  ClipboardCheck,
  Settings,
  Building,
  Upload,
  Map,
  Cloud,
  Bell,
  History,
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
    roles: ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'],
  },
  {
    title: 'Customers',
    url: '/customers',
    icon: Users,
    roles: ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'],
  },
  {
    title: 'Properties',
    url: '/properties',
    icon: Building,
    roles: ['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR'],
  },
  {
    title: 'Tax',
    url: '/tax',
    icon: Receipt,
    roles: ['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR'],
  },
  {
    title: 'Review Queue',
    url: '/review-queue',
    icon: ClipboardCheck,
    roles: ['APPROVER', 'ADMINISTRATOR'],
  },
  {
    title: 'Bulk Upload',
    url: '/bulk-upload',
    icon: Upload,
    roles: ['INPUTTER', 'ADMINISTRATOR'],
  },
  {
    title: 'Map View',
    url: '/map',
    icon: Map,
    roles: ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'],
  },
  {
    title: 'Notifications',
    url: '/notifications',
    icon: Bell,
    roles: ['INPUTTER', 'APPROVER', 'ADMINISTRATOR'],
  },
];

const adminItems = [
  {
    title: 'User Management',
    url: '/admin/users',
    icon: Settings,
  },
  {
    title: 'Lookup Management',
    url: '/admin/lookups',
    icon: Settings,
  },
  {
    title: 'AGO Settings',
    url: '/admin/ago-settings',
    icon: Cloud,
  },
  {
    title: 'Audit Logs',
    url: '/admin/audit-logs',
    icon: History,
  },
];

export const AppSidebar = () => {
  const { profile } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();

  const hasAccess = (roles: string[]) => {
    return profile && roles.includes(profile.role);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const collapsed = state === 'collapsed';

  return (
    <Sidebar className={collapsed ? 'w-16' : 'w-64'} collapsible="icon">
      <div className={`flex h-16 items-center border-b ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
        {!collapsed ? (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">LMS</span>
              <span className="text-xs text-muted-foreground">Jigjiga City</span>
            </div>
          </>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => hasAccess(item.roles))
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end={item.url === '/'}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {profile?.role === 'ADMINISTRATOR' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};
