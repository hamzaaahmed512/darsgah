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
  Coins,
  Receipt,
  Wallet
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
  section?: string;
  subItems?: Array<{ href: string; label: string; permission: Permission; anyPermissions?: Permission[] }>;
}

const coreNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, permission: "dashboard:view", section: "MAIN" },
  { href: "/approvals", label: "Action Center", icon: ClipboardCheck, permission: "approvals:view", section: "MANAGE" },
  { href: "/leave", label: "Leave Center", icon: CalendarCheck, permission: "leave:view", section: "MANAGE" },
  { href: "/students", label: "Students", icon: GraduationCap, permission: "students:view", section: "PEOPLE" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, permission: "attendance:view", section: "PEOPLE" },
  { href: "/finance/dashboard", label: "Finance", icon: Coins, permission: "finance:view", section: "OPERATIONS" },
  { href: "/finance/fees", label: "Fee Management", icon: Receipt, permission: "finance:view", section: "OPERATIONS" },
  { href: "/finance/payroll", label: "Payroll", icon: Wallet, permission: "payroll:view", section: "OPERATIONS" },
  { href: "/staff", label: "Staff", icon: Users, permission: "staff:view", section: "PEOPLE" },
  { href: "/classes", label: "Classes", icon: BookOpen, permission: "classes:manage", section: "ACADEMICS" },
  { href: "/subjects", label: "Subjects", icon: BookOpen, permission: "classes:manage", section: "ACADEMICS" },
  { href: "/transport", label: "Transport", icon: Bus, permission: "transport:view", section: "OPERATIONS" },
  { href: "/reports", label: "Reports", icon: Activity, permission: "reports:view", section: "OPERATIONS" },
  { href: "/admin", label: "Admin", icon: Shield, permission: "users:manage", section: "SYSTEM" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:manage", section: "SYSTEM" }
];

function getOverviewHref(role: UserRole) {
  if (role === "administrator") return "/dashboard/admin";
  if (role === "principal") return "/dashboard/principal";
  if (role === "student_staff") return "/dashboard/registrar";
  if (role === "teacher" || role === "head_teacher") return "/dashboard/teacher";
  return "/dashboard";
}

function academicEvaluationModule(): NavItem {
  return {
    href: "/academics",
    label: "Academics",
    icon: BarChart3,
    permission: "academics:view",
    section: "ACADEMICS",
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
    section: "ACADEMICS",
    anyPermissions: ["results:view"]
  };
}

function structureAcademicsItem(): NavItem {
  return {
    href: "/academics",
    label: "Academics",
    icon: BarChart3,
    permission: "academics:view",
    section: "ACADEMICS"
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
