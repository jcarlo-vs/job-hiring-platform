import { redirect } from "next/navigation";

import { getProfile, getUser } from "@/lib/auth";

import { CompleteForm } from "./complete-form";

export const metadata = { title: "Finish setting up - TalentScreen" };

/**
 * Only reachable straight after a first social sign-in: the session exists but
 * no profile row does. Anyone who already has one is sent on, so this cannot be
 * used to change a role later.
 */
export default async function CompleteSignupPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (profile) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Finish setting up
      </h1>
      <p className="text-muted mt-1 text-sm">
        One more step and you are in. We just need to know how you will be using
        TalentScreen.
      </p>
      <div className="mt-8">
        <CompleteForm defaultName={user.email?.split("@")[0] ?? ""} />
      </div>
    </div>
  );
}
