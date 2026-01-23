// FRIDAY CRM - Test-User erstellen
import bcrypt from "bcrypt";
import * as db from "./server/db";

async function createTestUser() {
  console.log("========================================");
  console.log("FRIDAY CRM - Test-User erstellen");
  console.log("========================================\n");

  // Test-User Daten
  const email = "test@friday-crm.de";
  const password = "Test123!";
  const name = "Test User";
  const role = "user";

  console.log("Test-User Daten:");
  console.log(`  E-Mail: ${email}`);
  console.log(`  Passwort: ${password}`);
  console.log(`  Name: ${name}`);
  console.log(`  Rolle: ${role}\n`);

  try {
    // Prüfe ob User bereits existiert
    console.log("[1/3] Prüfe ob User existiert...");
    const existingUser = await db.getUserByEmail(email);
    
    if (existingUser && existingUser.length > 0) {
      console.log("  ⚠️  User existiert bereits!");
      console.log(`  User-ID: ${existingUser[0].id}`);
      console.log("\n  Verwende bestehenden User oder lösche ihn zuerst.");
      return;
    }
    
    console.log("  ✅ User existiert noch nicht\n");

    // Passwort hashen
    console.log("[2/3] Passwort hashen...");
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`  ✅ Passwort gehasht (${passwordHash.substring(0, 20)}...)\n`);

    // User erstellen
    console.log("[3/3] User erstellen...");
    const userId = `user_test_${Date.now()}`;
    
    await db.createUserWithPassword({
      id: userId,
      email: email,
      name: name,
      passwordHash: passwordHash,
      role: role,
      lastSignedIn: new Date(),
    });

    console.log("  ✅ User erstellt!\n");

    console.log("========================================");
    console.log("Test-User erfolgreich erstellt! ✅");
    console.log("========================================\n");

    console.log("Login-Credentials:");
    console.log(`  E-Mail: ${email}`);
    console.log(`  Passwort: ${password}`);
    console.log(`  User-ID: ${userId}\n`);

    console.log("Testen:");
    console.log("  1. Outlook Add-In öffnen");
    console.log("  2. Login-Dialog: E-Mail + Passwort eingeben");
    console.log("  3. 'Anmelden' klicken\n");

  } catch (error) {
    console.error("\n❌ Fehler beim Erstellen des Test-Users:");
    console.error(error);
    process.exit(1);
  }
}

// Ausführen
createTestUser()
  .then(() => {
    console.log("Script beendet.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unerwarteter Fehler:", error);
    process.exit(1);
  });
