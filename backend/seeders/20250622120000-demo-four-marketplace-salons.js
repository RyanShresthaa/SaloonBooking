import { v4 as uuidv4 } from 'uuid';

/**
 * Four demo marketplace salons (approved, with slugs, resources, and live services).
 * Nepal-focused addresses, long “About” copy, structured hours, gallery, team highlights, and amenities.
 * Re-run updates listing copy on existing demo UUIDs (does not re-insert services). New installs still INSERT full rows.
 *
 * Run: npm run db:seed:demo-salons
 * Undo: npm run db:seed:undo:demo-salons
 */

const NEPAL_HOURS_STANDARD = {
  mon: { open: '10:00', close: '19:00', closed: false },
  tue: { open: '10:00', close: '19:00', closed: false },
  wed: { open: '10:00', close: '19:00', closed: false },
  thu: { open: '10:00', close: '19:00', closed: false },
  fri: { open: '10:00', close: '19:30', closed: false },
  sat: { open: '09:00', close: '18:00', closed: false },
  sun: { closed: true },
};

const NEPAL_HOURS_BARBER = {
  ...NEPAL_HOURS_STANDARD,
  sun: { open: '09:00', close: '14:00', closed: false },
};

function galleryFor(prefix) {
  return [1, 2, 3, 4].map((i) => `https://picsum.photos/seed/${encodeURIComponent(`${prefix}-g${i}`)}/960/640`);
}

const DEMO_SALONS = [
  {
    id: 'c0ffee01-0000-4000-8000-000000000001',
    resourceId: 'c0ffee01-0000-4000-8000-000000001001',
    slug: 'velvet-shear-studio-kathmandu',
    name: 'Velvet Shear Studio',
    description: `Velvet Shear Studio is an independent hair atelier in the heart of Kathmandu, Nepal, built for clients who want editorial-quality colour and cutting without the noise of a high-street chain.

Our story began when a small team of Nepali stylists trained in Dubai and Mumbai returned home determined to offer the same consultation depth and finish standards they had learned abroad — but priced fairly for families and professionals living in Bagmati Province.

About us
We specialise in lived-in colour, precision cutting for thick South Asian hair textures, and low-damage lightening routines. Every visit starts with a honest scalp and strand assessment, realistic timing, and aftercare you can repeat at home.

The salon is appointment-only so you never feel rushed. We use imported colour lines where they genuinely perform better, and we document your formula so repeat visits stay consistent.

What to expect
Quiet treatment bays, filtered water for rinses, patch tests when needed, and stylists who explain each step in plain language — English or Nepali.`,
    addressLine1: 'Krishna Galli, Thapathali (near Thapathali Hospital main gate), Ward 11',
    addressLine2: '2nd floor, white building above Himalayan Java supply — ring bell for Velvet Shear',
    city: 'Kathmandu',
    region: 'Bagmati Province',
    postalCode: '44600',
    country: 'NP',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    publicPhone: '+977 1-5550101',
    publicEmail: 'hello@velvetshear.demo',
    websiteUrl: 'https://demo.salon/velvet-shear-kathmandu',
    featuredRank: 4,
    coverSeed: 'velvet-shear',
    operatingHours: NEPAL_HOURS_STANDARD,
    socialLinks: { instagram: 'https://instagram.com/velvetshear.demo' },
    amenities: [
      'Appointment-only (no walk-in rush)',
      'Wi-Fi for clients',
      'Card & digital wallet payments',
      'Air-conditioned studio',
      'Patch tests for colour when required',
      'English & Nepali speaking team',
    ],
    staffHighlights: [
      {
        name: 'Mira Thapa',
        title: 'Lead colourist',
        bio: 'Balayage, glossing, and corrective colour.',
        photoUrl: 'https://picsum.photos/seed/velvet-staff-1/320/320',
      },
      {
        name: 'Rohit K.C.',
        title: 'Senior stylist',
        bio: 'Precision cuts, editorial blowouts, extensions consult.',
        photoUrl: 'https://picsum.photos/seed/velvet-staff-2/320/320',
      },
      {
        name: 'Anisha Gurung',
        title: 'Stylist',
        bio: 'Silk presses, bridal trials, men’s grooming.',
        photoUrl: 'https://picsum.photos/seed/velvet-staff-3/320/320',
      },
    ],
    galleryImages: galleryFor('velvet'),
    catalog: [
      { name: 'Signature cut & style', price: 4200 },
      { name: 'Gloss refresh', price: 8900 },
      { name: 'Silk blowout', price: 3100 },
    ],
    services: [
      { name: 'Signature cut & style', description: 'Cut, dry, and finish', duration: 45, price: 4200 },
      { name: 'Gloss refresh', description: 'Demi gloss toner', duration: 60, price: 8900 },
      { name: 'Silk blowout', description: 'Smooth finish', duration: 35, price: 3100 },
    ],
  },
  {
    id: 'c0ffee01-0000-4000-8000-000000000002',
    resourceId: 'c0ffee01-0000-4000-8000-000000001002',
    slug: 'harbor-nail-atelier-pokhara',
    name: 'Harbor Nail Atelier',
    description: `Harbor Nail Atelier sits on the quieter end of Pokhara’s Lakeside strip in Gandaki Province, Nepal — a short walk from Phewa Lake and the main tourist bus park, but far enough from the loudest bars that you can actually relax during a pedicure.

About us
We opened as a small family studio focused on safe, spotless nail work for students, trekkers, and Pokhara locals. Our technicians are trained on hospital-grade hygiene: sealed files where needed, single-use liners for spa bowls, and timed disinfection between every guest.

We believe luxury is consistency — the same shape on both hands, even product application, and honest advice when a nail needs a break.

Why guests choose Harbor
Transparent pricing in Nepalese Rupees, gentle e-file work for gel clients, and builder-gel options for people who type all day. We keep late slots on Fridays for after-work crowds.`,
    addressLine1: 'Lakeside Road, Baidam Chowk (north side), opposite Sacred Valley Inn',
    addressLine2: 'Ground floor, blue shutter unit — look for Harbor sign with anchor logo',
    city: 'Pokhara',
    region: 'Gandaki Province',
    postalCode: '33700',
    country: 'NP',
    province: 'Gandaki Province',
    district: 'Kaski',
    publicPhone: '+977 61-5550202',
    publicEmail: 'book@harbornail.demo',
    websiteUrl: 'https://demo.salon/harbor-nail-pokhara',
    featuredRank: 3,
    coverSeed: 'harbor-nail',
    operatingHours: {
      ...NEPAL_HOURS_STANDARD,
      fri: { open: '10:00', close: '20:00', closed: false },
    },
    socialLinks: { instagram: 'https://instagram.com/harbornail.demo', facebook: 'https://facebook.com/harbornail.demo' },
    amenities: [
      'Single-use liners for spa pedicures',
      'UV/LED curing with extractor fan',
      'Student discount weekdays (ID required)',
      'Wi-Fi',
      'Card payment',
      'Walk-ins welcome when a bay is free',
    ],
    staffHighlights: [
      {
        name: 'Puja Adhikari',
        title: 'Nail lead',
        bio: 'Gel extensions, nail art, builder fills.',
        photoUrl: 'https://picsum.photos/seed/harbor-staff-1/320/320',
      },
      {
        name: 'Sunita Pariyar',
        title: 'Spa pedicure specialist',
        bio: 'Callus care, massage-focused pedicures.',
        photoUrl: 'https://picsum.photos/seed/harbor-staff-2/320/320',
      },
    ],
    galleryImages: galleryFor('harbor'),
    catalog: [
      { name: 'Gel manicure', price: 2200 },
      { name: 'Spa pedicure', price: 2950 },
      { name: 'Builder fill', price: 2600 },
    ],
    services: [
      { name: 'Gel manicure', description: 'Prep, gel color, top coat', duration: 50, price: 2200 },
      { name: 'Spa pedicure', description: 'Soak, scrub, massage', duration: 55, price: 2950 },
      { name: 'Builder fill', description: 'Structured gel maintenance', duration: 60, price: 2600 },
    ],
  },
  {
    id: 'c0ffee01-0000-4000-8000-000000000003',
    resourceId: 'c0ffee01-0000-4000-8000-000000001003',
    slug: 'rosewood-barber-collective',
    name: 'Rosewood Barber Collective',
    description: `Rosewood Barber Collective is a neighbourhood barbershop in Baneshwor, Kathmandu Metropolitan City, Nepal — easy to reach from Koteshwor, New Baneshwor ring road links, and the Maitighar corridor by local bus or taxi.

About us
We built Rosewood for quick, honest fades and beard work at prices that respect everyday budgets. The shop is small on purpose: four chairs, loud enough to feel like community, quiet enough to hear your barber’s instructions.

Our barbers train weekly on clipper control, taper angles, and beard geometry for Nepali hair density. Chai is always on the house, and we publish wait times honestly on busy Saturdays.

Community
We sponsor one free school haircut day each quarter for kids in Ward 31 and keep a standing discount for senior citizens every Tuesday morning.`,
    addressLine1: 'Baneshwor Height Road, near Baneshwor Chowk traffic police booth',
    addressLine2: 'Rosewood corner unit, pink signage, basement step entrance',
    city: 'Kathmandu',
    region: 'Bagmati Province',
    postalCode: '44613',
    country: 'NP',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    publicPhone: '+977 1-5550303',
    publicEmail: 'cuts@rosewoodbarber.demo',
    websiteUrl: 'https://demo.salon/rosewood-barber-kathmandu',
    featuredRank: 2,
    coverSeed: 'rosewood-barber',
    operatingHours: NEPAL_HOURS_BARBER,
    socialLinks: { facebook: 'https://facebook.com/rosewoodbarber.demo' },
    amenities: [
      'Hot towel finish on select cuts',
      'Sanitised capes & neck strips',
      'Cash & QR payments',
      'Queue board at the door',
      'Kid-friendly first cuts',
    ],
    staffHighlights: [
      {
        name: 'Bijay Lama',
        title: 'Master barber',
        bio: 'Skin fades, shear work, razor line-ups.',
        photoUrl: 'https://picsum.photos/seed/rosewood-staff-1/320/320',
      },
      {
        name: 'Aakash Shrestha',
        title: 'Barber',
        bio: 'Classic cuts, beard sculpting.',
        photoUrl: 'https://picsum.photos/seed/rosewood-staff-2/320/320',
      },
    ],
    galleryImages: galleryFor('rosewood'),
    catalog: [
      { name: 'Classic cut', price: 450 },
      { name: 'Skin fade', price: 650 },
      { name: 'Beard sculpt', price: 350 },
    ],
    services: [
      { name: 'Classic cut', description: 'Clipper and shear finish', duration: 35, price: 450 },
      { name: 'Skin fade', description: 'Detailed taper', duration: 45, price: 650 },
      { name: 'Beard sculpt', description: 'Line-up and hot towel', duration: 25, price: 350 },
    ],
  },
  {
    id: 'c0ffee01-0000-4000-8000-000000000004',
    resourceId: 'c0ffee01-0000-4000-8000-000000001004',
    slug: 'lumiere-spa-brow-kathmandu',
    name: 'Lumière Spa & Brow',
    description: `Lumière Spa & Brow is a boutique facial and brow studio on Durbar Marg, Kathmandu, Nepal — within walking distance of Narayanhiti Palace Museum and major hotels, with clear Nepali/English signage for international visitors.

About us
We focus on brows, lashes, and corrective skincare using protocols our therapists learned in India and the Middle East, adapted for Kathmandu’s climate and pollution patterns.

Each facial room is private, with HEPA filtration and fresh linens per guest. We patch-test tint services, photograph brow mapping before waxing, and never rush lamination processing times.

Our promise
Transparent aftercare, realistic maintenance schedules, and therapists who will tell you “no” when a service is not safe for your skin barrier that week.`,
    addressLine1: 'Durbar Marg, Block B, 3rd floor (above electronics showroom)',
    addressLine2: 'Use glass lift at rear; reception desk inside Lumière lobby',
    city: 'Kathmandu',
    region: 'Bagmati Province',
    postalCode: '44600',
    country: 'NP',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    publicPhone: '+977 1-5550404',
    publicEmail: 'spa@lumiere.demo',
    websiteUrl: 'https://demo.salon/lumiere-spa-kathmandu',
    featuredRank: 1,
    coverSeed: 'lumiere-spa',
    operatingHours: {
      mon: { open: '11:00', close: '20:00', closed: false },
      tue: { open: '11:00', close: '20:00', closed: false },
      wed: { open: '11:00', close: '20:00', closed: false },
      thu: { open: '11:00', close: '20:00', closed: false },
      fri: { open: '11:00', close: '20:00', closed: false },
      sat: { open: '10:00', close: '19:00', closed: false },
      sun: { open: '12:00', close: '17:00', closed: false },
    },
    socialLinks: { instagram: 'https://instagram.com/lumiere.demo' },
    amenities: [
      'Private facial suites',
      'HEPA air filtration',
      'Patch tests for tint & lamination',
      'Card payment',
      'Hotel concierge bookings welcome',
      'English & Nepali consultations',
    ],
    staffHighlights: [
      {
        name: 'Elina Maharjan',
        title: 'Head therapist',
        bio: 'Custom facials, acne protocols, bridal prep.',
        photoUrl: 'https://picsum.photos/seed/lumiere-staff-1/320/320',
      },
      {
        name: 'Tenzing Dolma',
        title: 'Brow & lash artist',
        bio: 'Lamination, lash lift, corrective brow mapping.',
        photoUrl: 'https://picsum.photos/seed/lumiere-staff-2/320/320',
      },
    ],
    galleryImages: galleryFor('lumiere'),
    catalog: [
      { name: 'Brow lamination', price: 6500 },
      { name: 'Custom facial', price: 12500 },
      { name: 'Lash lift & tint', price: 9800 },
    ],
    services: [
      { name: 'Brow lamination', description: 'Lift, set, nourish', duration: 55, price: 6500 },
      { name: 'Custom facial', description: 'Cleanse, treat, mask', duration: 60, price: 12500 },
      { name: 'Lash lift & tint', description: 'Curl and define', duration: 50, price: 9800 },
    ],
  },
];

const SALON_IDS = DEMO_SALONS.map((s) => s.id);

async function salonExists(queryInterface, id) {
  const [rows] = await queryInterface.sequelize.query(`SELECT 1 FROM marketplace_salons WHERE id = $1 LIMIT 1`, {
    bind: [id],
  });
  return rows.length > 0;
}

function insertBind(s, now, coverUrl) {
  const catalogJson = JSON.stringify(s.catalog);
  return [
    s.id,
    s.slug,
    s.name,
    s.description,
    s.addressLine1,
    s.addressLine2 || null,
    s.city,
    s.region,
    s.postalCode,
    s.country,
    s.publicPhone,
    s.publicEmail,
    s.websiteUrl || null,
    JSON.stringify(s.operatingHours),
    catalogJson,
    JSON.stringify(s.staffHighlights),
    JSON.stringify(s.socialLinks || {}),
    JSON.stringify(s.amenities),
    now,
    now,
    now,
    now,
    s.featuredRank,
    JSON.stringify(s.galleryImages),
    s.province || null,
    s.district || null,
    coverUrl,
  ];
}

export default {
  up: async (queryInterface) => {
    const now = new Date();
    const qi = queryInterface.sequelize;

    for (const s of DEMO_SALONS) {
      const coverUrl = `https://picsum.photos/seed/${encodeURIComponent(s.coverSeed)}/1200/675`;
      const bind = insertBind(s, now, coverUrl);
      // eslint-disable-next-line no-await-in-loop
      const exists = await salonExists(queryInterface, s.id);

      if (exists) {
        // eslint-disable-next-line no-await-in-loop
        await qi.query(
          `
          UPDATE marketplace_salons SET
            slug = $2,
            name = $3,
            description = $4,
            "addressLine1" = $5,
            "addressLine2" = $6,
            city = $7,
            region = $8,
            "postalCode" = $9,
            country = $10,
            "publicPhone" = $11,
            "publicEmail" = $12,
            "websiteUrl" = $13,
            "operatingHours" = $14::jsonb,
            "servicesCatalog" = $15::jsonb,
            "staffHighlights" = $16::jsonb,
            "socialLinks" = $17::jsonb,
            amenities = $18::jsonb,
            "updatedAt" = $19::timestamptz,
            "verifiedAt" = $20::timestamptz,
            "featuredRank" = $21::int,
            "galleryImages" = $22::jsonb,
            province = $23,
            district = $24,
            "coverImageUrl" = $25,
            "listingStatus" = 'approved',
            "suspendedAt" = NULL
          WHERE id = $1::uuid
          `,
          {
            bind: [
              s.id,
              s.slug,
              s.name,
              s.description,
              s.addressLine1,
              s.addressLine2 || null,
              s.city,
              s.region,
              s.postalCode,
              s.country,
              s.publicPhone,
              s.publicEmail,
              s.websiteUrl || null,
              JSON.stringify(s.operatingHours),
              JSON.stringify(s.catalog),
              JSON.stringify(s.staffHighlights),
              JSON.stringify(s.socialLinks || {}),
              JSON.stringify(s.amenities),
              now,
              now,
              s.featuredRank,
              JSON.stringify(s.galleryImages),
              s.province || null,
              s.district || null,
              coverUrl,
            ],
          }
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await qi.query(
        `
        INSERT INTO marketplace_salons (
          id, slug, name, description, "addressLine1", "addressLine2", city, region, "postalCode", country,
          "publicPhone", "publicEmail", "websiteUrl",
          "operatingHours", "servicesCatalog", "staffHighlights", "socialLinks", amenities,
          "submittedByUserId", "listingStatus", "adminReviewNotes", "reviewedByUserId", "reviewedAt",
          "createdAt", "updatedAt",
          "suspendedAt", "verifiedAt", "featuredRank", "sponsoredRank",
          "galleryImages", "videoUrls",
          "registrationNumber", "taxId", province, district,
          "logoUrl", "coverImageUrl"
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13,
          $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
          NULL, 'approved', NULL, NULL, $19::timestamptz,
          $20::timestamptz, $21::timestamptz,
          NULL, $22::timestamptz, $23::int, NULL,
          $24::jsonb, '[]'::jsonb,
          NULL, NULL, $25, $26,
          NULL, $27
        )
        `,
        { bind }
      );

      // eslint-disable-next-line no-await-in-loop
      await qi.query(
        `
        INSERT INTO salon_resources (id, name, "isActive", "salonId", "createdAt", "updatedAt")
        VALUES ($1::uuid, $2, true, $3::uuid, $4::timestamptz, $5::timestamptz)
        `,
        {
          bind: [s.resourceId, 'Station 1', s.id, now, now],
        }
      );

      for (const svc of s.services) {
        const sid = uuidv4();
        // eslint-disable-next-line no-await-in-loop
        await qi.query(
          `
          INSERT INTO services (
            id, name, description, duration, price, "isActive",
            "bufferBeforeMinutes", "bufferAfterMinutes", "resourceId", "salonId",
            "platformCategoryId", "discountPrice", "imageUrls", "genderTag",
            "createdAt", "updatedAt"
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, true,
            0, 0, $6::uuid, $7::uuid,
            NULL, NULL, '[]'::jsonb, NULL,
            $8::timestamptz, $9::timestamptz
          )
          `,
          {
            bind: [sid, svc.name, svc.description, svc.duration, svc.price, s.resourceId, s.id, now, now],
          }
        );
      }
    }
  },

  down: async (queryInterface) => {
    const qi = queryInterface.sequelize;
    const ids = SALON_IDS;

    await qi.query(`DELETE FROM salon_reviews WHERE "marketplaceSalonId" = ANY($1::uuid[])`, { bind: [ids] });
    await qi.query(`DELETE FROM customer_favorites WHERE "marketplaceSalonId" = ANY($1::uuid[])`, { bind: [ids] });
    await qi.query(`DELETE FROM promo_codes WHERE "salonId" = ANY($1::uuid[])`, { bind: [ids] });
    await qi.query(`DELETE FROM waitlist_entries WHERE "salonId" = ANY($1::uuid[])`, { bind: [ids] });
    await qi.query(`DELETE FROM appointments WHERE "salonId" = ANY($1::uuid[])`, { bind: [ids] });
    await qi.query(`DELETE FROM services WHERE "salonId" = ANY($1::uuid[])`, { bind: [ids] });
    await qi.query(`DELETE FROM salon_resources WHERE "salonId" = ANY($1::uuid[])`, { bind: [ids] });
    await qi.query(`DELETE FROM marketplace_salons WHERE id = ANY($1::uuid[])`, { bind: [ids] });
  },
};
