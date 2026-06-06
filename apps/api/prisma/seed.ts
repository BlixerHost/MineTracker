import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_SERVERS = [
  {
    name: 'Hypixel',
    slug: 'hypixel',
    host: 'mc.hypixel.net',
    port: 25565,
    type: 'JAVA',
    country: 'US',
    websiteUrl: 'https://hypixel.net',
    discordUrl: 'https://discord.gg/hypixel',
  },
  {
    name: 'Mineplex',
    slug: 'mineplex',
    host: 'us.mineplex.com',
    port: 25565,
    type: 'JAVA',
    country: 'US',
    websiteUrl: 'https://www.mineplex.com',
    discordUrl: null,
  },
  {
    name: 'CubeCraft Games',
    slug: 'cubecraft',
    host: 'play.cubecraft.net',
    port: 25565,
    type: 'JAVA',
    country: 'NL',
    websiteUrl: 'https://www.cubecraft.net',
    discordUrl: 'https://discord.gg/cubecraft',
  },
  {
    name: 'The Hive',
    slug: 'the-hive',
    host: 'geo.hivebedrock.network',
    port: 19132,
    type: 'BEDROCK',
    country: 'GB',
    websiteUrl: 'https://playhive.com',
    discordUrl: 'https://discord.gg/hive',
  },
  {
    name: 'Wynncraft',
    slug: 'wynncraft',
    host: 'play.wynncraft.com',
    port: 25565,
    type: 'JAVA',
    country: 'CA',
    websiteUrl: 'https://wynncraft.com',
    discordUrl: 'https://discord.gg/wynncraft',
  },
];

async function main() {
  // ─── Admin ───────────────────────────────────────────────────────────────────
  const email = process.env.ADMIN_EMAIL ?? 'admin@minetracker.local';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.create({ data: { email, passwordHash } });
    console.log(`✓ Admin created: ${email} / ${password}`);
  } else {
    console.log(`· Admin already exists: ${email}`);
  }

  // ─── Servers (sin datos inventados — el worker los llenará con pings reales) ─
  const now = new Date();

  for (const s of DEMO_SERVERS) {
    const existing = await prisma.server.findUnique({ where: { slug: s.slug } });
    if (existing) {
      console.log(`· Server already exists: ${s.name}`);
      continue;
    }

    await prisma.server.create({
      data: {
        name: s.name,
        slug: s.slug,
        host: s.host,
        port: s.port,
        type: s.type,
        status: 'UNKNOWN',      // el primer ping actualizará esto
        playersOnline: 0,        // real desde el primer ping
        playersMax: 0,
        peakPlayers: 0,          // se calcula solo a partir de pings reales
        uptimePercentage: 0,
        country: s.country,
        websiteUrl: s.websiteUrl,
        discordUrl: s.discordUrl,
        approvedAt: now,         // ya aprobado para que el worker lo pingue
      },
    });

    console.log(`✓ Server added: ${s.name} — esperando primer ping del worker`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
