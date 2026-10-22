import { db } from "./index";
import {
  adminUsers,
  merchants,
  posts,
  reportInvites,
} from "./schema";
import { hashPassword, hashToken } from "../security/crypto";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting database seed with real merchant logos...");

  // 1. Seed Admin & Moderator
  const adminPasswordHash = await hashPassword("Password123!");
  const moderatorPasswordHash = await hashPassword("Password123!");

  const existingAdmin = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, "admin@lawandoxing.id"))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(adminUsers).values([
      {
        email: "admin@lawandoxing.id",
        passwordHash: adminPasswordHash,
        displayName: "Super Administrator",
        role: "admin",
        isActive: true,
      },
      {
        email: "moderator@lawandoxing.id",
        passwordHash: moderatorPasswordHash,
        displayName: "Staff Moderator",
        role: "moderator",
        isActive: true,
      },
    ]);
    console.log("✅ Seeded admin and moderator users.");
  } else {
    console.log("ℹ️ Admin users already exist. Skipping.");
  }

  // 2. Seed Real Merchants from logo-merchant folder
  const realMerchants = [
    {
      name: "AdaKami",
      slug: "adakami",
      description: "Platform pinjaman online P2P lending berizin dengan laporan penagihan masif.",
      logoUrl: "/merchants/adakami.png",
      isFeatured: true,
      featuredOrder: 1,
    },
    {
      name: "AdaPundi",
      slug: "adapundi",
      description: "Layanan pinjaman dana tunai online dengan indikasi pesan teror WhatsApp.",
      logoUrl: "/merchants/adapundi.jpg",
      isFeatured: true,
      featuredOrder: 2,
    },
    {
      name: "BantuSaku",
      slug: "bantu-saku",
      description: "Aplikasi pinjaman online dana kilat dengan laporan kontak darurat diteror.",
      logoUrl: "/merchants/bantu-saku.jpg",
      isFeatured: true,
      featuredOrder: 3,
    },
    {
      name: "DanaYuk",
      slug: "danayuk",
      description: "Penyedia kredit mikro konsumen dengan pengaduan doxing data pribadi.",
      logoUrl: "/merchants/danayuk.jpg",
      isFeatured: true,
      featuredOrder: 4,
    },
    {
      name: "FinPlus",
      slug: "finplus",
      description: "Layanan pendanaan digital dengan laporan intimidasi penagih lapangan.",
      logoUrl: "/merchants/finplus.png",
      isFeatured: true,
      featuredOrder: 5,
    },
    {
      name: "Indodana",
      slug: "indodana",
      description: "Layanan paylater dan kredit cepat dengan pengaduan DC mendatangi kantor.",
      logoUrl: "/merchants/indodana.jpg",
      isFeatured: true,
      featuredOrder: 6,
    },
    {
      name: "IndoSaku",
      slug: "indosaku",
      description: "Fintech peer-to-peer dengan laporan ancaman penyebaran KTP.",
      logoUrl: "/merchants/indosaku.jpeg",
      isFeatured: true,
      featuredOrder: 7,
    },
    {
      name: "KlikKami",
      slug: "klik-kami",
      description: "Platform pinjaman kilat tanpa agunan.",
      logoUrl: "/merchants/klik-kami.png",
      isFeatured: true,
      featuredOrder: 8,
    },
    {
      name: "Kredit Pintar",
      slug: "kredit-pintar",
      description: "Penyedia pinjaman tunai berizin OJK dengan pengaduan perilaku DC pihak ketiga.",
      logoUrl: "/merchants/kredit-pintar.jpg",
      isFeatured: true,
      featuredOrder: 9,
    },
    {
      name: "Kredivo",
      slug: "kredivo",
      description: "Layanan kredit digital dan paylater ritel dengan laporan penagihan intensif.",
      logoUrl: "/merchants/kredivo.png",
      isFeatured: true,
      featuredOrder: 10,
    },
    {
      name: "PinjamDuit",
      slug: "pinjam-duit",
      description: "Layanan pinjaman online dana cepat.",
      logoUrl: "/merchants/pinjam-duit.png",
      isFeatured: false,
      featuredOrder: null,
    },
    {
      name: "PinjamYuk",
      slug: "pinjam-yuk",
      description: "Aplikasi kredit tanpa jaminan dengan keluhan pesan spam ke keluarga.",
      logoUrl: "/merchants/pinjam-yuk.png",
      isFeatured: false,
      featuredOrder: null,
    },
    {
      name: "Samir",
      slug: "samir",
      description: "Platform pendanaan online terdaftar.",
      logoUrl: "/merchants/samir.png",
      isFeatured: false,
      featuredOrder: null,
    },
    {
      name: "Singa",
      slug: "singa",
      description: "P2P lending dengan laporan intimidasi kontak.",
      logoUrl: "/merchants/singa.jpg",
      isFeatured: false,
      featuredOrder: null,
    },
    {
      name: "Solusiku",
      slug: "solusiku",
      description: "Aplikasi pinjaman mikro digital.",
      logoUrl: "/merchants/solusiku.png",
      isFeatured: false,
      featuredOrder: null,
    },
    {
      name: "Uatas",
      slug: "uatas",
      description: "Platform pinjaman tunai cepat dengan pengaduan penagihan tidak beretika.",
      logoUrl: "/merchants/uatas.jpg",
      isFeatured: false,
      featuredOrder: null,
    },
  ];

  const merchantMap = new Map<string, string>();

  for (const m of realMerchants) {
    const existing = await db
      .select()
      .from(merchants)
      .where(eq(merchants.slug, m.slug))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db.insert(merchants).values(m).returning();
      merchantMap.set(m.slug, inserted.id);
    } else {
      // Update logo and info if already exists
      await db
        .update(merchants)
        .set({
          logoUrl: m.logoUrl,
          isFeatured: m.isFeatured,
          featuredOrder: m.featuredOrder,
          description: m.description,
        })
        .where(eq(merchants.id, existing[0].id));
      merchantMap.set(m.slug, existing[0].id);
    }
  }
  console.log("✅ Seeded 16 real merchants with local logos.");

  // 3. Seed Sample Public Posts for Timeline
  const adakamiId = merchantMap.get("adakami");
  const kreditPintarId = merchantMap.get("kredit-pintar");
  const kredivoId = merchantMap.get("kredivo");

  if (adakamiId) {
    const postUrl = "https://x.com/korbanpinjol/status/1789012345678901";
    const postExist = await db
      .select()
      .from(posts)
      .where(eq(posts.canonicalUrl, postUrl))
      .limit(1);

    if (postExist.length === 0) {
      await db.insert(posts).values({
        merchantId: adakamiId,
        platform: "x",
        sourceUrl: "https://x.com/korbanpinjol/status/1789012345678901?s=20",
        canonicalUrl: postUrl,
        title: "Penagihan menghubungi seluruh kontak darurat di luar persetujuan",
        summary: "Korban mengunggah tangkapan layar pesan WhatsApp dari debt collector yang mengancam akan menyebarkan foto KTP ke seluruh nomor telepon yang ada di kontak.",
        publishedAt: new Date(Date.now() - 3600000 * 24),
        status: "published",
      });
    }
  }

  if (kreditPintarId) {
    const postUrl = "https://www.threads.net/@suarakonsumen/post/C7xyz9876543";
    const postExist = await db
      .select()
      .from(posts)
      .where(eq(posts.canonicalUrl, postUrl))
      .limit(1);

    if (postExist.length === 0) {
      await db.insert(posts).values({
        merchantId: kreditPintarId,
        platform: "threads",
        sourceUrl: "https://www.threads.net/@suarakonsumen/post/C7xyz9876543",
        canonicalUrl: postUrl,
        title: "Debt collector lapangan mendatangi kantor dan membuat kegaduhan",
        summary: "Penagih lapangan datang ke lobi kantor tanpa surat tugas resmi dan membentak resepsionis, mempermalukan korban di hadapan rekan kerja.",
        publishedAt: new Date(Date.now() - 3600000 * 48),
        status: "published",
      });
    }
  }

  if (kredivoId) {
    const postUrl = "https://x.com/lapor_dc/status/1798123456789012";
    const postExist = await db
      .select()
      .from(posts)
      .where(eq(posts.canonicalUrl, postUrl))
      .limit(1);

    if (postExist.length === 0) {
      await db.insert(posts).values({
        merchantId: kredivoId,
        platform: "x",
        sourceUrl: "https://x.com/lapor_dc/status/1798123456789012",
        canonicalUrl: postUrl,
        title: "Peneroran nomor asing hingga puluhan kali per jam",
        summary: "Panggilan otomatis (robocall) dan pesan spam terus menerus meski tagihan sudah dalam proses mediasi restrukturisasi resmi.",
        publishedAt: new Date(Date.now() - 3600000 * 12),
        status: "published",
      });
    }
  }
  console.log("✅ Seeded sample published timeline posts.");

  // 4. Seed Demo Invite Codes
  const demoCodes = [
    { code: "INVITE-DEMO-2026", label: "Demo Single Use", maxUses: 1 },
    { code: "INVITE-COMMUNITY-100", label: "Community Batch", maxUses: 100 },
  ];

  for (const item of demoCodes) {
    const codeHash = hashToken(item.code);
    const exists = await db
      .select()
      .from(reportInvites)
      .where(eq(reportInvites.codeHash, codeHash))
      .limit(1);

    if (exists.length === 0) {
      await db.insert(reportInvites).values({
        codeHash,
        code: item.code,
        label: item.label,
        maxUses: item.maxUses,
        usedCount: 0,
        isActive: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });
      console.log(`✅ Seeded invite code: ${item.code}`);
    } else {
      await db
        .update(reportInvites)
        .set({ code: item.code })
        .where(eq(reportInvites.id, exists[0].id));
      console.log(`✅ Updated existing invite code: ${item.code}`);
    }
  }

  console.log("🎉 Seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
