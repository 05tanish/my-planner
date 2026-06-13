"use strict";
/**
 * prisma/seed.ts
 * Seeds the database with the initial admin user.
 * Run: npm run db:seed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    const email = 'tanishjain626@gmail.com';
    const plainPassword = 'Tanish0510@jain';
    const name = 'Tanish Jain';
    // Hash the password
    const hashedPassword = await bcryptjs_1.default.hash(plainPassword, 12);
    // Upsert user (safe to run multiple times)
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            // If the user already exists, make sure email is verified
            emailVerified: true,
            emailVerifyToken: null,
            emailVerifyExpiry: null,
        },
        create: {
            email,
            password: hashedPassword,
            emailVerified: true, // Pre-verify so no email step needed
            profile: {
                create: {
                    name,
                    bio: 'Developer & placement aspirant',
                },
            },
        },
        include: { profile: true },
    });
    console.log(`✅ Seeded user: ${user.email} (ID: ${user.id})`);
    console.log(`   Profile: ${user.profile?.name}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    console.log('\n🎉 Seed complete! You can now log in with:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${plainPassword}`);
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map