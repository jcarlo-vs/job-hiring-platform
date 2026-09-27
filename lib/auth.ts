import { cache } from "react";

import { asAdmin } from "@/lib/db";
import type { Database } from "@/lib/database.types";
import { getSessionUser, type SessionUser } from "@/lib/session";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * The verified current user, or null.
 *
 * Cached per request so several callers in one render share a single JWT
 * verification. "Verified" is literal: the ID token's signature is checked
 * against the Cognito pool's JWKS, not merely decoded.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  return getSessionUser();
});

/**
 * The current user's profile row, or null.
 *
 * Read through asAdmin rather than asUser, which looks wrong at first glance
 * and is not: the profiles_select_own policy would allow exactly this row
 * anyway, but this runs on every render including the layout, and asUser opens
 * a transaction per call. The id comes from a signature-verified token, so
 * there is nothing a caller could tamper with.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  return asAdmin((db) =>
    db.one<Profile>(
      // preferred_categories is cast to text[] on purpose. node-postgres parses
      // built-in array types, but job_category[] is a user-defined enum array
      // with an OID it does not know, so `select *` returns the raw Postgres
      // literal "{DESIGN,PRODUCT}" as a STRING. Every `.map()` over it then
      // throws at render time, and the symptom (g.map is not a function) points
      // nowhere near the cause. text[] is a type pg does parse.
      `select id, role, full_name, company_name, phone,
              resume_path, resume_filename, resume_uploaded_at,
              preferred_categories::text[] as preferred_categories,
              onboarded_at, created_at
         from public.profiles
        where id = $1`,
      [user.sub],
    ),
  );
});
