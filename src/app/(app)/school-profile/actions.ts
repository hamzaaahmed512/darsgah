"use server";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { updateSchoolSettings } from "@/lib/services/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPakistaniPhone } from "@/lib/pakistan-format";

const SCHOOL_BRANDING_BUCKET = "school-branding";
const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ASSET_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFileExtension(file: File) {
  const parsed = path.extname(file.name).trim().toLowerCase();
  if (parsed) return parsed;
  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/svg+xml") return ".svg";
  if (file.type === "image/x-icon" || file.type === "image/vnd.microsoft.icon") return ".ico";
  return "";
}

async function ensureBrandingBucket() {
  const adminClient = createAdminClient();
  const { data: existingBucket } = await adminClient.storage.getBucket(SCHOOL_BRANDING_BUCKET);

  if (!existingBucket) {
    const { error } = await adminClient.storage.createBucket(SCHOOL_BRANDING_BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_ASSET_SIZE_BYTES}`,
      allowedMimeTypes: ALLOWED_ASSET_TYPES
    });

    if (error && !/already exists/i.test(error.message)) {
      throw new Error(error.message);
    }
    return;
  }

  if (!existingBucket.public) {
    const { error } = await adminClient.storage.updateBucket(SCHOOL_BRANDING_BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_ASSET_SIZE_BYTES}`,
      allowedMimeTypes: ALLOWED_ASSET_TYPES
    });
    if (error) throw new Error(error.message);
  }
}

async function uploadBrandAsset(schoolId: string, kind: "logo" | "favicon", file: File, version: string) {
  if (!ALLOWED_ASSET_TYPES.includes(file.type)) {
    throw new Error(`${kind === "logo" ? "Logo" : "Favicon"} must be a PNG, JPG, WEBP, SVG, or ICO image.`);
  }

  if (file.size > MAX_ASSET_SIZE_BYTES) {
    throw new Error(`${kind === "logo" ? "Logo" : "Favicon"} must be smaller than 5 MB.`);
  }

  await ensureBrandingBucket();

  const adminClient = createAdminClient();
  const fileExtension = getFileExtension(file);
  const filePath = `${schoolId}/${kind}-${randomUUID()}${fileExtension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminClient.storage
    .from(SCHOOL_BRANDING_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = adminClient.storage.from(SCHOOL_BRANDING_BUCKET).getPublicUrl(filePath);
  return `${data.publicUrl}?v=${version}`;
}

export async function saveSchoolProfileAction(formData: FormData) {
  try {
    const user = await requireUser("settings:manage");
    const name = readString(formData, "name").slice(0, 120);
    const shortName = readString(formData, "shortName").toUpperCase().slice(0, 20);
    const timezone = readString(formData, "timezone");
    const email = readString(formData, "email");
    const phone = formatPakistaniPhone(readString(formData, "phone"));
    const website = readString(formData, "website");
    const currentLogoUrl = readString(formData, "currentLogoUrl");
    const currentFaviconUrl = readString(formData, "currentFaviconUrl");
    const logoFile = formData.get("logoFile");
    const faviconFile = formData.get("faviconFile");
    const version = Date.now().toString();

    if (!name) {
      throw new Error("School name is required.");
    }

    const accentColor = readString(formData, "resultCardAccentColor");
    const settings: Record<string, any> = {
      schoolShortName: shortName,
      schoolEmail: email,
      schoolPhone: phone,
      schoolWebsite: website,
      resultCardTemplate: {
        title: readString(formData, "resultCardTitle").slice(0, 80) || "Result Card",
        accentColor: /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : "#2563eb",
        layout: readString(formData, "resultCardLayout") === "compact" ? "compact" : "standard",
        showAcademicYear: readString(formData, "resultCardShowAcademicYear") === "true",
        showAdmissionNumber: readString(formData, "resultCardShowAdmissionNumber") === "true",
        showTeacherComments: readString(formData, "resultCardShowTeacherComments") === "true",
        signatureLabels: readString(formData, "resultCardSignatureLabels").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3)
      }
    };

    let uploadedAnyAsset = false;

    if (logoFile instanceof File && logoFile.size > 0) {
      settings.schoolLogoUrl = await uploadBrandAsset(user.schoolId, "logo", logoFile, version);
      uploadedAnyAsset = true;
    } else if (currentLogoUrl) {
      settings.schoolLogoUrl = currentLogoUrl;
    }

    if (faviconFile instanceof File && faviconFile.size > 0) {
      settings.schoolFaviconUrl = await uploadBrandAsset(user.schoolId, "favicon", faviconFile, version);
      uploadedAnyAsset = true;
    } else if (currentFaviconUrl) {
      settings.schoolFaviconUrl = currentFaviconUrl;
    }

    if (uploadedAnyAsset) {
      settings.schoolBrandVersion = version;
    }

    await updateSchoolSettings(user, name, timezone || "UTC", settings);

    revalidatePath("/school-profile");
    revalidatePath("/settings");
    revalidatePath("/profile");
    revalidatePath("/change-password");
    revalidatePath("/", "layout");
    return {
      ok: true,
      schoolLogoUrl: settings.schoolLogoUrl ?? "",
      schoolFaviconUrl: settings.schoolFaviconUrl ?? "",
      schoolBrandVersion: settings.schoolBrandVersion ?? ""
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
