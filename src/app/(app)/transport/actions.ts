"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  assignStaffToVehicle,
  assignStudentToVehicle,
  createTransportDriver,
  createTransportRoute,
  createTransportVehicle,
  removeStudentTransport,
  removeStaffTransport,
  updateTransportVehicle
} from "@/lib/services/transport";

function isMigrationRequiredError(error: unknown) {
  return error instanceof Error && error.message.includes("latest School OS database migration");
}

export async function createRouteAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await createTransportRoute(user, formData);
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
}

export async function createDriverAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await createTransportDriver(user, formData);
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
}

export async function createVehicleAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await createTransportVehicle(user, formData);
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
}

export async function updateVehicleAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await updateTransportVehicle(user, formData);
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
}

export async function assignTransportAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await assignStudentToVehicle(user, formData);
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
  revalidatePath("/finance/student-fees");
}

export async function removeTransportAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await removeStudentTransport(user, String(formData.get("assignment_id") ?? ""));
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
  revalidatePath("/finance/student-fees");
}

export async function assignStaffTransportAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await assignStaffToVehicle(user, formData);
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
}

export async function removeStaffTransportAction(formData: FormData) {
  const user = await requireUser("transport:manage");
  try {
    await removeStaffTransport(user, String(formData.get("assignment_id") ?? ""));
  } catch (error) {
    if (isMigrationRequiredError(error)) redirect("/transport");
    throw error;
  }
  revalidatePath("/transport");
}
