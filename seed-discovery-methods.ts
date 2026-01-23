import { seedDiscoveryMethods } from "./server/scoutDb";

async function main() {
  await seedDiscoveryMethods();
  console.log("Discovery methods seeded successfully");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding discovery methods:", err);
  process.exit(1);
});
