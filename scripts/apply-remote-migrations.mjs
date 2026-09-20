import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  const { error } = await supabase.from(tableName).select("id").limit(1);
  if (!error) return true;
  if (error.code === "PGRST204" || error.code === "PGRST116") return true; // table exists but empty or no rows match
  if (error.message?.includes(`"public.${tableName}"`) || error.code === "42P01") return false;
  // If we get a permission error, the table exists
  if (error.code === "42501") return true;
  console.log(`  Table check ${tableName}: failed`);
  return false;
}

async function main() {
  console.log("Checking remote Supabase for missing tables...\n");

  // Migration 1: 202607140001_pakistan_erp_enhancements.sql
  const hasTeacherEmployment = await checkTable("teacher_employment_details");
  const hasAnnouncements = await checkTable("announcements");
  console.log(`teacher_employment_details: ${hasTeacherEmployment ? "EXISTS" : "MISSING"}`);
  console.log(`announcements: ${hasAnnouncements ? "EXISTS" : "MISSING"}`);

  // Migration 2: 202607150002_custom_roles_and_profile_improvements.sql
  const hasCustomRoles = await checkTable("custom_roles");
  const hasRolePermissions = await checkTable("role_permissions");
  console.log(`custom_roles: ${hasCustomRoles ? "EXISTS" : "MISSING"}`);
  console.log(`role_permissions: ${hasRolePermissions ? "EXISTS" : "MISSING"}`);

  // Migration 3: 202607160001_school_os_workflows.sql
  const hasStaffLeaves = await checkTable("staff_leaves");
  const hasTransportRoutes = await checkTable("transport_routes");
  const hasTransportDrivers = await checkTable("transport_drivers");
  const hasTransportVehicles = await checkTable("transport_vehicles");
  const hasTransportAssignments = await checkTable("student_transport_assignments");
  console.log(`staff_leaves: ${hasStaffLeaves ? "EXISTS" : "MISSING"}`);
  console.log(`transport_routes: ${hasTransportRoutes ? "EXISTS" : "MISSING"}`);
  console.log(`transport_drivers: ${hasTransportDrivers ? "EXISTS" : "MISSING"}`);
  console.log(`transport_vehicles: ${hasTransportVehicles ? "EXISTS" : "MISSING"}`);
  console.log(`student_transport_assignments: ${hasTransportAssignments ? "EXISTS" : "MISSING"}`);

  console.log("\n--- Summary ---");
  const migration1needed = !hasTeacherEmployment || !hasAnnouncements;
  const migration2needed = !hasCustomRoles || !hasRolePermissions;
  const migration3needed = !hasStaffLeaves || !hasTransportRoutes || !hasTransportDrivers || !hasTransportVehicles || !hasTransportAssignments;

  if (!migration1needed && !migration2needed && !migration3needed) {
    console.log("All migrations are already applied!");
  } else {
    console.log("The following migrations need to be applied via Supabase Dashboard SQL Editor:");
    if (migration1needed) console.log("  1. supabase/migrations/202607140001_pakistan_erp_enhancements.sql");
    if (migration2needed) console.log("  2. supabase/migrations/202607150002_custom_roles_and_profile_improvements.sql");
    if (migration3needed) console.log("  3. supabase/migrations/202607160001_school_os_workflows.sql");
    console.log("\nOpen your Supabase Dashboard -> SQL Editor, then paste and run each file IN ORDER.");
  }
}

main().catch(() => console.error("Remote migration check failed."));
