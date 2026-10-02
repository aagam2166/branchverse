import { prisma } from "./lib/prisma.js";

async function main() {
  await prisma.$connect();
  console.log("Database connected successfully");
  const count = await prisma.repository.count();
  console.log("Repository count:", count);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Database connection failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});