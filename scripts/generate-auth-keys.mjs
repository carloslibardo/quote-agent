#!/usr/bin/env node
/**
 * Generate JWT Keys for Convex Auth
 *
 * This script generates the required RSA key pair for @convex-dev/auth.
 * Run this script and copy the output to your Convex dashboard environment variables.
 *
 * Usage: node scripts/generate-auth-keys.mjs
 */

import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

async function generateAuthKeys() {
  console.log("🔐 Generating RSA key pair for Convex Auth...\n");

  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

  console.log("═".repeat(80));
  console.log("\n📋 Add these to your Convex dashboard:");
  console.log("   Settings → Environment Variables\n");
  console.log("═".repeat(80));

  console.log("\n1️⃣  JWT_PRIVATE_KEY:\n");
  console.log(`JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"`);

  console.log("\n" + "─".repeat(80));

  console.log("\n2️⃣  JWKS:\n");
  console.log(`JWKS=${jwks}`);

  console.log("\n" + "═".repeat(80));
  console.log("\n✅ Copy each value (including quotes for JWT_PRIVATE_KEY) to Convex dashboard.\n");
  console.log("⚠️  Keep these keys secure and never commit them to version control!\n");
}

generateAuthKeys().catch(console.error);

