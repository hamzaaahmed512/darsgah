"use server";
import { publicActionError } from "@/lib/public-error";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { updateSchoolSettings } from "@/lib/services/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPakistaniPhoneForStorage } from "@/lib/pakistan-format";
import { normalizeEmail } from "@/lib/email";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";

const SCHOOL_BRANDING_BUCKET = "school-branding";
const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ASSET_TYPES = ["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validatedImageType(bytes: Buffer): { contentType: string; extension: string } | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { contentType: "image/png", extension: ".png" };
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { contentType: "image/jpeg", extension: ".jpg" };
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return { contentType: "image/webp", extension: ".webp" };
  if (bytes.length >= 6 && bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])) && bytes.readUInt16LE(4) > 0) return { contentType: "image/x-icon", extension: ".ico" };
  return null;
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
      throw new Error(publicActionError(error));
    }
    return;
  }

  const { error } = await adminClient.storage.updateBucket(SCHOOL_BRANDING_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_ASSET_SIZE_BYTES}`,
    allowedMimeTypes: ALLOWED_ASSET_TYPES
  });
  if (error) throw new Error(publicActionError(error));
}

async function uploadBrandAsset(schoolId: string, kind: "logo" | "favicon", file: File, version: string) {
  if (!ALLOWED_ASSET_TYPES.includes(file.type)) {
    throw new Error(`${kind === "logo" ? "Logo" : "Favicon"} must be a PNG, JPG, WEBP, or ICO image.`);
  }

  if (file.size > MAX_ASSET_SIZE_BYTES) {
    throw new Error(`${kind === "logo" ? "Logo" : "Favicon"} must be smaller than 5 MB.`);
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const detected = validatedImageType(fileBuffer);
  if (!detected || (file.type !== detected.contentType && !(detected.extension === ".ico" && file.type === "image/vnd.microsoft.icon"))) {
    throw new Error("Image content does not match an allowed file type.");
  }

  await ensureBrandingBucket();

  const adminClient = createAdminClient();
  const filePath = `${schoolId}/${kind}-${randomUUID()}${detected.extension}`;

  const { error: uploadError } = await adminClient.storage
    .from(SCHOOL_BRANDING_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: detected.contentType,
      upsert: false
    });

  if (uploadError) throw new Error(publicActionError(uploadError));

  const { data } = adminClient.storage.from(SCHOOL_BRANDING_BUCKET).getPublicUrl(filePath);
  return `${data.publicUrl}?v=${version}`;
}

export async function saveSchoolProfileAction(formData: FormData) {
  try {
    const user = await requireUser("settings:manage");
    const name = readString(formData, "name").slice(0, 120);
    const shortName = readString(formData, "shortName").toUpperCase().slice(0, 20);
    const timezone = readString(formData, "timezone");
    const email = normalizeEmail(readString(formData, "email"));
    const phone = formatPakistaniPhoneForStorage(readString(formData, "phone"));
    const website = readString(formData, "website");
    const currentLogoUrl = user.schoolLogoUrl ?? "";
    const currentFaviconUrl = user.schoolFaviconUrl ?? "";
    const logoFile = formData.get("logoFile");
    const faviconFile = formData.get("faviconFile");
    if ((logoFile instanceof File && logoFile.size > 0) || (faviconFile instanceof File && faviconFile.size > 0)) {
      if (!await consumeAuthRateLimit("branding_upload", 10, 3600)) throw new Error("Too many image uploads. Try again later.");
    }
    const version = Date.now().toString();

    if (!name) {
      throw new Error("School name is required.");
    }

    const settings: Record<string, any> = {
      schoolShortName: shortName,
      schoolEmail: email,
      schoolPhone: phone,
      schoolWebsite: website
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
    return { error: publicActionError() };
  }
}


