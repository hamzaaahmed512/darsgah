import {
  Activity,
  BarChart3,
  CalendarCheck,
  Bus,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  BookOpen,
  Coins
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/types/database";
import { usesAcademicEvaluationTabs, usesPrincipalAcademicControl } from "@/lib/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
  anyPermissions?: Permission[];
  subItems?: Array<{ href: string; label: string; permission: Permission; anyPermissions?: Permission[] }>;
}

const coreNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/approvals", label: "Action Center", icon: ClipboardCheck, permission: "approvals:view" },
  { href: "/leave", label: "Leave Center", icon: CalendarCheck, permission: "leave:view" },
  { href: "/students", label: "Students", icon: GraduationCap, permission: "students:view" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, permission: "attendance:view" },
  {
    href: "/finance",
    label: "Finance",
    icon: Coins,
    permission: "finance:view",
    subItems: [
      { href: "/finance/dashboard", label: "Dashboard", permission: "finance:view" },
      { href: "/finance/fees", label: "Fee Management", permission: "finance:view" },
      { href: "/finance/payroll", label: "Payroll", permission: "payroll:view" }
    ]
  },
  { href: "/staff", label: "Staff", icon: Users, permission: "staff:view" },
  { href: "/classes", label: "Classes", icon: BookOpen, permission: "classes:manage" },
  { href: "/subjects", label: "Subjects", icon: BookOpen, permission: "classes:manage" },
  { href: "/transport", label: "Transport", icon: Bus, permission: "transport:view" },
  { href: "/reports", label: "Reports", icon: Activity, permission: "reports:view" },
  { href: "/admin", label: "Admin", icon: Shield, permission: "users:manage" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:manage" }
];

function getOverviewHref(role: UserRole) {
  if (role === "administrator") return "/dashboard/admin";
  if (role === "principal") return "/dashboard/principal";
  if (role === "student_staff") return "/dashboard/registrar";
  if (role === "teacher") return "/dashboard/teacher";
  return "/dashboard";
}

function academicEvaluationModule(): NavItem {
  return {
    href: "/academics",
    label: "Academics",
    icon: BarChart3,
    permission: "academics:view",
    anyPermissions: ["results:view", "marks:manage"],
    subItems: [
      {
        href: "/academics/exams-setup",
        label: "Exams & Marks Setup",
        permission: "marks:manage"
      },
      {
        href: "/academics/results",
        label: "Results Portal",
        permission: "results:view"
      }
    ]
  };
}

function principalAcademicControlItem(): NavItem {
  return {
    href: "/admin/academic-control",
    label: "Academic Control",
    icon: BarChart3,
    permission: "marks:approve",
    anyPermissions: ["results:view"]
  };
}

function structureAcademicsItem(): NavItem {
  return {
    href: "/academics",
    label: "Academics",
    icon: BarChart3,
    permission: "academics:view"
  };
}

export function getNavItems(role: UserRole): NavItem[] {
  const items: NavItem[] = [{ ...coreNavItems[0], href: getOverviewHref(role) }];

  for (const item of coreNavItems.slice(1)) {
    if (item.href === "/classes") {
      if (usesPrincipalAcademicControl(role)) {
        items.push(principalAcademicControlItem());
      } else if (usesAcademicEvaluationTabs(role)) {
        items.push(academicEvaluationModule());
      } else {
        items.push(structureAcademicsItem());
      }
    }

    items.push(item);
  }

  return items;
}

export function navItemVisible(
  role: UserRole | undefined,
  permission: Permission,
  userPermissions?: string[] | null,
  anyPermissions?: Permission[]
) {
  if (!role) return false;
  if (hasPermission(role, permission, userPermissions)) return true;
  return (anyPermissions ?? []).some((item) => hasPermission(role, item, userPermissions));
}

/** @deprecated Use getNavItems(role) for role-aware navigation. */
export const navItems = coreNavItems;
