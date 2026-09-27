"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { asAdmin } from "@/lib/db";

export type CompleteState = { error?: string } | undefined;

const schema = z
  .object({
    role: z.enum(["APPLICANT", "EMPLOYER"]),
    fullName: z.string().trim().min(1, "Full name is required").max(120),
    companyName: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(40).optional(),
  })
  .refine((d) => d.role !== "EMPLOYER" || !!d.companyName, {
    message: "Company or project name is required",
    path: ["companyName"],
  })
  .refine((d) => d.role !== "APPLICANT" || !!d.phone, {
    message: "Phone number is required",
    path: ["phone"],
  });

/**
 * Finish a social sign-up by creating the profile row.
 *
 * Google tells us who someone is but not whether they are hiring or looking for
 * work, and `profiles.role` is NOT NULL. Defaulting it would silently trap an
 * employer in an applicant account with no way out, so it is asked once here.
 *
 * Written over the admin connection for the same reason the email signup path
 * is: there is no profile yet for an RLS policy to match against.
 */
export async function completeSocialSignup(
  _prev: CompleteState,
  formData: FormData,
): Promise<CompleteState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const parsed = schema.safeParse({
    role: formData.get("role"),
    fullName: formData.get("fullName"),
    companyName: formData.get("companyName") ?? undefined,
    phone: formData.get("phone") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await asAdmin((db) =>
      db.query(
        `insert into public.profiles (id, role, full_name, company_name, phone)
         values ($1, $2, $3, nullif($4,''), nullif($5,''))
         on conflict (id) do nothing`,
        [
          user.sub,
          parsed.data.role,
          parsed.data.fullName,
          parsed.data.companyName ?? "",
          parsed.data.phone ?? "",
        ],
      ),
    );
  } catch (err) {
    console.error("[auth/complete]", err);
    return { error: "Could not finish setting up your account." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
