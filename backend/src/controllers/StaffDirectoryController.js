import { Op, UniqueConstraintError } from 'sequelize';
import { User, Appointment, WaitlistEntry } from '../models/Index.js';
import env from '../config/Env.js';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound } from '../utils/apiResponse.js';

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

const listTeam = async (req, res, next) => {
  try {
    const team = await User.findAll({
      where: { role: { [Op.in]: ['staff', 'admin'] } },
      attributes: ['id', 'name', 'email', 'role', 'speciality', 'staffNotes', 'createdAt'],
      order: [
        ['role', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    return sendSuccess(res, { team, salonHours: DEFAULT_SALON_HOURS }, 'Staff directory');
  } catch (e) {
    next(e);
  }
};

const seedDemoStaff = async (req, res, next) => {
  try {
    const plain = env.staffSeedPassword?.trim();
    if (!plain || plain.length < 6) {
      return sendBadRequest(
        res,
        'Set STAFF_SEED_PASSWORD in the server environment (min 6 characters), restart the API, then try again.'
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
          role: 'staff',
          isEmailVerified: true,
          emailVerificationToken: null,
        },
      });

      if (wasNew) {
        created.push({ id: user.id, name: user.name, email: user.email, note: 'new' });
        continue;
      }

      if (user.role !== 'staff') {
        await user.update({
          role: 'staff',
          password: plain,
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
  } catch (e) {
    next(e);
  }
};

const createStaffMember = async (req, res, next) => {
  try {
    const { name, email, password, role, speciality, staffNotes } = req.body;
    const nameTrim = String(name || '').trim();
    const emailTrim = String(email || '').trim().toLowerCase();
    const pass = String(password || '');

    if (!nameTrim || nameTrim.length > 120) {
      return sendBadRequest(res, 'Name is required (max 120 characters).');
    }
    if (!emailTrim) {
      return sendBadRequest(res, 'Email is required.');
    }
    if (pass.length < 6) {
      return sendBadRequest(res, 'Password must be at least 6 characters.');
    }
    const normRole = String(role || '').toLowerCase();
    if (!['staff', 'admin'].includes(normRole)) {
      return sendBadRequest(res, 'Role must be staff or admin.');
    }

    const spec =
      speciality === undefined || speciality === null ? null : String(speciality).trim().slice(0, 500) || null;
    const notes =
      staffNotes === undefined || staffNotes === null ? null : String(staffNotes).trim().slice(0, 5000) || null;

    const user = await User.create({
      name: nameTrim,
      email: emailTrim,
      password: pass,
      role: normRole,
      isEmailVerified: true,
      emailVerificationToken: null,
      speciality: spec,
      staffNotes: notes,
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
  } catch (e) {
    if (e instanceof UniqueConstraintError || e?.name === 'SequelizeUniqueConstraintError') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    if (e?.parent?.code === '23505') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    next(e);
  }
};

const updateStaffMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await User.findByPk(id);
    if (!row || !['staff', 'admin'].includes(row.role)) {
      return sendNotFound(res, 'Team member not found');
    }

    const { name, email, role, speciality, staffNotes, password } = req.body;
    const patch = {};

    if (name !== undefined) {
      const t = String(name).trim();
      if (!t || t.length > 120) {
        return sendBadRequest(res, 'Name must be 1–120 characters.');
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
      if (!['staff', 'admin'].includes(norm)) {
        return sendBadRequest(res, 'Role must be staff or admin.');
      }
      if (norm === 'staff' && row.role === 'admin') {
        const otherAdmins = await User.count({ where: { role: 'admin', id: { [Op.ne]: id } } });
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
          : String(speciality).trim().slice(0, 500) || null;
    }
    if (staffNotes !== undefined) {
      patch.staffNotes =
        staffNotes === null || staffNotes === ''
          ? null
          : String(staffNotes).trim().slice(0, 5000) || null;
    }
    if (password !== undefined && String(password).length > 0) {
      const p = String(password);
      if (p.length < 6) {
        return sendBadRequest(res, 'Password must be at least 6 characters.');
      }
      patch.password = p;
    }

    if (Object.keys(patch).length === 0) {
      return sendBadRequest(res, 'No changes supplied.');
    }

    await row.update(patch);
    await row.reload({
      attributes: ['id', 'name', 'email', 'role', 'speciality', 'staffNotes', 'createdAt'],
    });
    return sendSuccess(res, { member: row }, 'Team member updated.');
  } catch (e) {
    if (e instanceof UniqueConstraintError || e?.name === 'SequelizeUniqueConstraintError') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    if (e?.parent?.code === '23505') {
      return sendBadRequest(res, 'An account with that email already exists.');
    }
    next(e);
  }
};

const deleteStaffMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return sendBadRequest(res, 'You cannot delete your own account.');
    }

    const row = await User.findByPk(id);
    if (!row || !['staff', 'admin'].includes(row.role)) {
      return sendNotFound(res, 'Team member not found');
    }

    if (row.role === 'admin') {
      const otherAdmins = await User.count({ where: { role: 'admin', id: { [Op.ne]: id } } });
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
  } catch (e) {
    next(e);
  }
};

export { listTeam, seedDemoStaff, createStaffMember, updateStaffMember, deleteStaffMember };
