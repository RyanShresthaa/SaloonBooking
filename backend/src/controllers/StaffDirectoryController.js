import { Op, UniqueConstraintError } from 'sequelize';
import { User, Appointment, WaitlistEntry } from '../models/Index.js';
import env from '../config/Env.js';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

// ─── Constants ───

/** Default salon desk hours (matches AppointmentService business window + break). */
const DEFAULT_SALON_HOURS = {
  businessStart: '09:00',
  businessEnd: '18:00',
  breakStart: '12:00',
  breakEnd: '14:00',
  timezoneNote: 'Slot grid uses the server local calendar for open hours and the lunch break.',
};

const DEMO_STYLISTS = [
  { name: 'Maya Chen', email: 'maya.chen@salon-desk.demo' },
  { name: 'Jordan Lee', email: 'jordan.lee@salon-desk.demo' },
  { name: 'Riley Morgan', email: 'riley.morgan@salon-desk.demo' },
  { name: 'Casey Avery', email: 'casey.avery@salon-desk.demo' },
];

const STAFF_DIRECTORY_ROLES = ['staff', 'admin'];
const PASSWORD_MIN_LENGTH = 6;
const NAME_MAX_LENGTH = 120;
const SPECIALITY_MAX_LENGTH = 500;
const STAFF_NOTES_MAX_LENGTH = 5000;
const STAFF_ROLE_STAFF = 'staff';
const STAFF_ROLE_ADMIN = 'admin';

// ─── Handlers ───

const listTeam = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const team = await User.findAll({
      where: { role: { [Op.in]: STAFF_DIRECTORY_ROLES }, salonId },
      attributes: ['id', 'name', 'email', 'role', 'speciality', 'staffNotes', 'profilePhotoUrl', 'staffBio', 'skills', 'yearsExperience', 'createdAt'],
      order: [
        ['role', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    return sendSuccess(res, { team, salonHours: DEFAULT_SALON_HOURS }, 'Staff directory');
  } catch (error) {
    next(error);
  }
};

const seedDemoStaff = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const plain = env.staffSeedPassword?.trim();
    if (!plain || plain.length < PASSWORD_MIN_LENGTH) {
      return sendBadRequest(
        res,
        `Set STAFF_SEED_PASSWORD in the server environment (min ${PASSWORD_MIN_LENGTH} characters), restart the API, then try again.`
      );
    }

    const created = [];
    const skipped = [];

    for (const row of DEMO_STYLISTS) {
      const [user, wasNew] = await User.findOrCreate({
        where: { email: row.email },
        defaults: {
          name: row.name,
          email: row.email,
          password: plain,
          role: STAFF_ROLE_STAFF,
          salonId,
          isEmailVerified: true,
          emailVerificationToken: null,
        },
      });

      if (wasNew) {
        created.push({ id: user.id, name: user.name, email: user.email, note: 'new' });
        continue;
      }

      if (user.role !== STAFF_ROLE_STAFF) {
        await user.update({
          role: STAFF_ROLE_STAFF,
          password: plain,
          salonId,
          isEmailVerified: true,
          emailVerificationToken: null,
        });
        created.push({ id: user.id, name: user.name, email: user.email, note: 'promoted_to_staff' });
      } else {
        skipped.push(user.email);
      }
    }

    return sendCreated(
      res,
      { created, skipped, salonHours: DEFAULT_SALON_HOURS },
      skipped.length === DEMO_STYLISTS.length
        ? 'Demo stylists already exist; nothing new was created.'
        : 'Demo stylists are ready to sign in.'
    );
  } catch (error) {
    next(error);
  }
};

const createStaffMember = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const { name, email, password, role, speciality, staffNotes, profilePhotoUrl, staffBio, skills, yearsExperience } = req.body;
    const nameTrim = String(name || '').trim();
    const emailTrim = String(email || '').trim().toLowerCase();
    const pass = String(password || '');

    if (!nameTrim || nameTrim.length > NAME_MAX_LENGTH) {
      return sendBadRequest(res, `Name is required (max ${NAME_MAX_LENGTH} characters).`);
    }
    if (!emailTrim) {
      return sendBadRequest(res, 'Email is required.');
    }
    if (pass.length < PASSWORD_MIN_LENGTH) {
      return sendBadRequest(res, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    }
    const normRole = String(role || '').toLowerCase();
    if (!STAFF_DIRECTORY_ROLES.includes(normRole)) {
      return sendBadRequest(res, 'Role must be staff or admin.');
    }

    const spec =
      speciality === undefined || speciality === null ? null : String(speciality).trim().slice(0, SPECIALITY_MAX_LENGTH) || null;
    const notes =
      staffNotes === undefined || staffNotes === null ? null : String(staffNotes).trim().slice(0, STAFF_NOTES_MAX_LENGTH) || null;

    const user = await User.create({
      name: nameTrim,
      email: emailTrim,
      password: pass,
      role: normRole,
      salonId,
      isEmailVerified: true,
      emailVerificationToken: null,
      speciality: spec,
      staffNotes: notes,
      profilePhotoUrl: profilePhotoUrl ? String(profilePhotoUrl).trim().slice(0, 2048) : null,
      staffBio: staffBio ? String(staffBio).trim().slice(0, 8000) : null,
      skills: Array.isArray(skills) ? skills : [],
      yearsExperience: yearsExperience != null ? Number(yearsExperience) : null,
    });

    return sendCreated(
      res,
      {
        member: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          speciality: user.speciality,
          staffNotes: user.staffNotes,
        },
        salonHours: DEFAULT_SALON_HOURS,
      },
      'Team member created. They can sign in with this email and password.'
    );
  } catch (error) {
    if (error instanceof UniqueConstraintError || error?.name === 'SequelizeUniqueConstraintError') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    if (error?.parent?.code === '23505') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    next(error);
  }
};

const updateStaffMember = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const { id } = req.params;
    const row = await User.findByPk(id);
    if (!row || !STAFF_DIRECTORY_ROLES.includes(row.role) || String(row.salonId) !== String(salonId)) {
      return sendNotFound(res, 'Team member not found');
    }

    const { name, email, role, speciality, staffNotes, password, profilePhotoUrl, staffBio, skills, yearsExperience } = req.body;
    const patch = {};

    if (name !== undefined) {
      const t = String(name).trim();
      if (!t || t.length > NAME_MAX_LENGTH) {
        return sendBadRequest(res, `Name must be 1–${NAME_MAX_LENGTH} characters.`);
      }
      patch.name = t;
    }
    if (email !== undefined) {
      const t = String(email).trim().toLowerCase();
      const taken = await User.findOne({ where: { email: t, id: { [Op.ne]: id } } });
      if (taken) {
        return sendBadRequest(res, 'That email is already in use.');
      }
      patch.email = t;
    }
    if (role !== undefined) {
      const norm = String(role).toLowerCase();
      if (!STAFF_DIRECTORY_ROLES.includes(norm)) {
        return sendBadRequest(res, 'Role must be staff or admin.');
      }
      if (norm === STAFF_ROLE_STAFF && row.role === STAFF_ROLE_ADMIN) {
        const otherAdmins = await User.count({
          where: { role: STAFF_ROLE_ADMIN, salonId, id: { [Op.ne]: id } },
        });
        if (otherAdmins === 0) {
          return sendBadRequest(res, 'Cannot demote the last admin.');
        }
      }
      patch.role = norm;
    }
    if (speciality !== undefined) {
      patch.speciality =
        speciality === null || speciality === ''
          ? null
          : String(speciality).trim().slice(0, SPECIALITY_MAX_LENGTH) || null;
    }
    if (staffNotes !== undefined) {
      patch.staffNotes =
        staffNotes === null || staffNotes === ''
          ? null
          : String(staffNotes).trim().slice(0, STAFF_NOTES_MAX_LENGTH) || null;
    }
    if (password !== undefined && String(password).length > 0) {
      const p = String(password);
      if (p.length < PASSWORD_MIN_LENGTH) {
        return sendBadRequest(res, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      }
      patch.password = p;
    }
    if (profilePhotoUrl !== undefined) {
      patch.profilePhotoUrl =
        profilePhotoUrl === null || profilePhotoUrl === ''
          ? null
          : String(profilePhotoUrl).trim().slice(0, 2048) || null;
    }
    if (staffBio !== undefined) {
      patch.staffBio =
        staffBio === null || staffBio === '' ? null : String(staffBio).trim().slice(0, 8000) || null;
    }
    if (skills !== undefined) {
      patch.skills = Array.isArray(skills) ? skills : [];
    }
    if (yearsExperience !== undefined) {
      patch.yearsExperience = yearsExperience === null || yearsExperience === '' ? null : Number(yearsExperience);
    }

    if (Object.keys(patch).length === 0) {
      return sendBadRequest(res, 'No changes supplied.');
    }

    await row.update(patch);
    await row.reload({
      attributes: ['id', 'name', 'email', 'role', 'speciality', 'staffNotes', 'profilePhotoUrl', 'staffBio', 'skills', 'yearsExperience', 'createdAt'],
    });
    return sendSuccess(res, { member: row }, 'Team member updated.');
  } catch (error) {
    if (error instanceof UniqueConstraintError || error?.name === 'SequelizeUniqueConstraintError') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    if (error?.parent?.code === '23505') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    next(error);
  }
};

const deleteStaffMember = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const { id } = req.params;
    if (id === req.user.id) {
      return sendBadRequest(res, 'You cannot delete your own account.');
    }

    const row = await User.findByPk(id);
    if (!row || !STAFF_DIRECTORY_ROLES.includes(row.role) || String(row.salonId) !== String(salonId)) {
      return sendNotFound(res, 'Team member not found');
    }

    if (row.role === STAFF_ROLE_ADMIN) {
      const otherAdmins = await User.count({
        where: { role: STAFF_ROLE_ADMIN, salonId, id: { [Op.ne]: id } },
      });
      if (otherAdmins === 0) {
        return sendBadRequest(res, 'Cannot delete the last admin.');
      }
    }

    const [apptCount, waitlistCount] = await Promise.all([
      Appointment.count({ where: { userId: id } }),
      WaitlistEntry.count({ where: { userId: id } }),
    ]);
    if (apptCount > 0 || waitlistCount > 0) {
      return sendBadRequest(
        res,
        'This user still has appointments or waitlist entries as the account holder. Resolve those before deleting.'
      );
    }

    await row.destroy();
    return sendSuccess(res, null, 'Team member removed.');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listTeam, seedDemoStaff, createStaffMember, updateStaffMember, deleteStaffMember };
