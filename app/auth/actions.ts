"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import * as cognito from "@/lib/cognito";
import { asAdmin } from "@/lib/db";
import { clearSessionCookies, setSessionCookies } from "@/lib/session";

export type AuthState = { error?: string; message?: string } | undefined;

const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(120),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["APPLICANT", "EMPLOYER"]),
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

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/** The `sub` claim, read without verifying: Cognito just issued this token. */
function subOf(idToken: string): string {
  const body = idToken.split(".")[1];
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")).sub;
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    companyName: formData.get("companyName") ?? undefined,
    phone: formData.get("phone") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let tokens;
  try {
    tokens = await cognito.signUp(parsed.data.email, parsed.data.password);
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "UsernameExistsException") {
      return { error: "An account with that email already exists." };
    }
    if (name === "InvalidPasswordException") {
      return {
        error:
          "Password must be at least 12 characters with upper and lower case, a number and a symbol.",
      };
    }
    console.error("[signup]", err);
    return { error: "Could not create your account. Please try again." };
  }

  const sub = subOf(tokens.idToken);

  // The profile row used to be created by the handle_new_user trigger on
  // auth.users, which was SECURITY DEFINER. auth.users no longer exists, so it
  // happens here instead - and over the admin connection for the same reason
  // the trigger bypassed RLS: there is no session yet to satisfy a policy.
  try {
    await asAdmin((db) =>
      db.query(
        `insert into public.profiles (id, role, full_name, company_name, phone)
         values ($1, $2, $3, nullif($4,''), nullif($5,''))
         on conflict (id) do nothing`,
        [
          sub,
          parsed.data.role,
          parsed.data.fullName,
          parsed.data.companyName ?? "",
          parsed.data.phone ?? "",
        ],
      ),
    );
  } catch (err) {
    console.error("[signup] profile insert failed", err);
    return { error: "Could not finish setting up your account." };
  }

  await setSessionCookies(tokens, sub);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let tokens;
  try {
    tokens = await cognito.signIn(parsed.data.email, parsed.data.password);
  } catch {
    // Deliberately one message for both "no such user" and "wrong password".
    // The pool also has prevent_user_existence_errors enabled, so Cognito does
    // not leak which it was either.
    return { error: "Invalid email or password" };
  }

  await setSessionCookies(tokens, subOf(tokens.idToken));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signout() {
  await clearSessionCookies();
  revalidatePath("/", "layout");
  redirect("/login");
}
