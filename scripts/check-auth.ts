import assert from "node:assert/strict";

import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";

import { awsCredentials } from "../lib/aws-credentials";
import { getEmailBySub, refresh, signIn, signUp } from "../lib/cognito";

/**
 * Exercises the real Cognito pool: sign up, sign in, verify, refresh, look up.
 *
 * The `sub` assertion matters most: it becomes profiles.id and the RLS context,
 * so anything other than a uuid would break authorization silently rather than
 * loudly.
 *
 * Creates a throwaway user and deletes it again. Run with: npm run check:auth
 */

const EMAIL = `check-auth-probe+${Date.now()}@talentscreen.dev`;
const PASSWORD = "ProbeOnly!2026xyz";

let failures = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}: ${err instanceof Error ? err.message : err}`);
    failures++;
  }
}

function claims(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

async function main() {
  const poolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!poolId || !clientId) {
    console.error("FAIL  COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set.");
    process.exit(1);
  }

  const idp = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? "us-east-1",
    credentials: awsCredentials(),
  });
  let sub: string | null = null;

  try {
    // ---- sign up ------------------------------------------------------
    const created = await signUp(EMAIL, PASSWORD);
    const idClaims = claims(created.idToken);
    sub = String(idClaims.sub);

    check("signUp returns an id token", () =>
      assert.ok(created.idToken.length > 0),
    );
    check("signUp returns a refresh token", () =>
      assert.ok(created.refreshToken && created.refreshToken.length > 0),
    );


    check("id token email matches", () =>
      assert.equal(idClaims.email, EMAIL),
    );
    check("sub is a uuid (usable as profiles.id)", () =>
      assert.match(
        sub!,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    );

    // ---- signature verification, as lib/session.ts does it ------------
    const verifier = CognitoJwtVerifier.create({
      userPoolId: poolId,
      tokenUse: "id",
      clientId,
    });
    const verified = await verifier.verify(created.idToken);
    check("id token passes JWKS signature verification", () =>
      assert.equal(verified.sub, sub),
    );

    check("a tampered token is rejected", () => {
      const bad = created.idToken.slice(0, -4) + "AAAA";
      return verifier
        .verify(bad)
        .then(
          () => {
            throw new Error("tampered token was accepted");
          },
          () => undefined,
        ) as unknown as void;
    });

    // ---- sign in ------------------------------------------------------
    const signedIn = await signIn(EMAIL, PASSWORD);
    check("signIn works with the same credentials", () =>
      assert.equal(claims(signedIn.idToken).sub, sub),
    );

    check("wrong password is rejected", () => {
      return signIn(EMAIL, "Wrong!Password9999").then(
        () => {
          throw new Error("wrong password was accepted");
        },
        () => undefined,
      ) as unknown as void;
    });

    // ---- refresh ------------------------------------------------------
    const refreshed = await refresh(created.refreshToken!, sub);
    check("refresh mints a new id token for the same sub", () =>
      assert.equal(claims(refreshed.idToken).sub, sub),
    );

    // ---- lookup by sub (what the email worker needs) ------------------
    const email = await getEmailBySub(sub);
    check("getEmailBySub resolves the address", () =>
      assert.equal(email, EMAIL),
    );
  } finally {
    if (sub) {
      await idp
        .send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: sub }))
        .then(
          () => console.log(`\ncleaned up probe user ${EMAIL}`),
          (e) => console.error(`\ncleanup failed: ${e}`),
        );
    }
  }

  if (failures > 0) {
    console.error(`\nAuth check FAILED (${failures} failing)`);
    process.exit(1);
  }
  console.log("\nAuth OK: Cognito sign-up, sign-in, refresh and claims all good.");
}

main();
