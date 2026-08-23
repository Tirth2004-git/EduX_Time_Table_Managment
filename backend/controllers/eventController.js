const Event = require('../models/Event');
const Organization = require('../models/Organization');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const eventAnalyticsService = require('../services/eventAnalyticsService');

// Helper: Check if student matches event targeting
function isStudentEligible(student, event) {
  if (!student || !event) return false;
  if (event.targetAudienceType === 'all') return true;

  const studentDept = student.department_id ? student.department_id.toString() : null;
  const studentSem = student.semester_id ? student.semester_id.toString() : null;
  const studentDiv = student.division_id ? student.division_id.toString() : null;

  if (event.targetDepartment && studentDept !== event.targetDepartment.toString()) {
    return false;
  }

  if (event.targetSemester && studentSem !== event.targetSemester.toString()) {
    return false;
  }

  if (event.targetDivisions && event.targetDivisions.length > 0) {
    const divIds = event.targetDivisions.map((d) => (d._id || d).toString());
    if (!studentDiv || !divIds.includes(studentDiv)) {
      return false;
    }
  }

  return true;
}

// @desc    Get all events for Admin
// @route   GET /api/events/admin
// @access  Private (Admin only)
exports.getAdminEvents = async (req, res, next) => {
  try {
    const { status, category, organization, search, isPaid } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (organization) filter.organization = organization;
    if (isPaid !== undefined) filter.isPaid = isPaid === 'true';

    if (search) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { speakerName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const events = await Event.find(filter)
      .populate('organization', 'name logoUrl website')
      .populate('targetDepartment', 'department_name short_name')
      .populate('targetSemester', 'semester_number academic_year')
      .populate('targetDivisions', 'division_name')
      .sort({ eventDate: -1, createdAt: -1 })
      .lean();

    // Attach verified registration & revenue counts per event from Single Source of Truth
    const eventIds = events.map((e) => e._id);
    const metricsMap = await eventAnalyticsService.getEventMetrics(eventIds);

    const populated = events.map((event) => {
      const metrics = metricsMap[event._id.toString()] || {
        registrationsCount: 0,
        paidRegistrationsCount: 0,
        revenue: 0,
      };
      return {
        ...event,
        registrationsCount: metrics.registrationsCount,
        paidRegistrationsCount: metrics.paidRegistrationsCount,
        revenue: metrics.revenue,
      };
    });

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Admin Events Dashboard Summary Statistics
// @route   GET /api/events/admin/stats
// @access  Private (Admin only)
exports.getAdminEventStats = async (req, res, next) => {
  try {
    const stats = await eventAnalyticsService.getGlobalEventStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Targeted Campus Events for Authenticated Student
// @route   GET /api/events/student/upcoming
// @access  Private (Student)
exports.getStudentEvents = async (req, res, next) => {
  try {
    const student = await User.findById(req.user.userId).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Only Published events
    const publishedEvents = await Event.find({ status: 'Published' })
      .populate('organization', 'name logoUrl website')
      .populate('targetDepartment', 'department_name short_name')
      .populate('targetSemester', 'semester_number academic_year')
      .populate('targetDivisions', 'division_name')
      .sort({ eventDate: 1 })
      .lean();

    // Filter by academic eligibility on backend
    const eligibleEvents = publishedEvents.filter((event) =>
      isStudentEligible(student, event)
    );

    // Get current student's registrations
    const studentRegs = await EventRegistration.find({
      student: student._id,
      registrationStatus: { $ne: 'cancelled' },
    })
      .populate('payment', 'status amount razorpayPaymentId')
      .lean();

    const regMap = {};
    studentRegs.forEach((r) => {
      regMap[r.event.toString()] = r;
    });

    // Also get registration counts for seat availability calculation
    const eligibleIds = eligibleEvents.map((e) => e._id);
    const regCounts = await EventRegistration.aggregate([
      { $match: { event: { $in: eligibleIds }, registrationStatus: { $ne: 'cancelled' } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);

    const regCountMap = {};
    regCounts.forEach((rc) => {
      regCountMap[rc._id.toString()] = rc.count;
    });

    const now = new Date();
    const result = eligibleEvents.map((event) => {
      const userReg = regMap[event._id.toString()] || null;
      const registeredCount = regCountMap[event._id.toString()] || 0;
      const isFull = event.capacity > 0 && registeredCount >= event.capacity;
      const isPastDeadline = new Date(event.registrationDeadline) < now;

      return {
        ...event,
        registeredCount,
        remainingSeats: event.capacity > 0 ? Math.max(0, event.capacity - registeredCount) : null,
        isFull,
        isPastDeadline,
        isRegistered: Boolean(userReg),
        userRegistration: userReg,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Event Details
// @route   GET /api/events/:id
// @access  Private (Admin / Student)
exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organization', 'name logoUrl website description contactPerson contactEmail contactPhone')
      .populate('targetDepartment', 'department_name short_name')
      .populate('targetSemester', 'semester_number academic_year')
      .populate('targetDivisions', 'division_name');

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const isStudent = req.user?.role === 'student';

    // If student, check published status and eligibility
    let isEligible = true;
    let userRegistration = null;

    if (isStudent) {
      if (event.status !== 'Published') {
        return res.status(403).json({ success: false, error: 'This event is not published.' });
      }

      const student = await User.findById(req.user.userId).lean();
      isEligible = isStudentEligible(student, event);

      userRegistration = await EventRegistration.findOne({
        event: event._id,
        student: req.user.userId,
        registrationStatus: { $ne: 'cancelled' },
      }).populate('payment', 'status amount razorpayPaymentId paidAt');

      // Increment view count atomically
      await Event.findByIdAndUpdate(event._id, { $inc: { viewsCount: 1 } });
    }

    // Get current registration count
    const registeredCount = await EventRegistration.countDocuments({
      event: event._id,
      registrationStatus: { $ne: 'cancelled' },
    });

    const isFull = event.capacity > 0 && registeredCount >= event.capacity;
    const isPastDeadline = new Date(event.registrationDeadline) < new Date();

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        registeredCount,
        remainingSeats: event.capacity > 0 ? Math.max(0, event.capacity - registeredCount) : null,
        isFull,
        isPastDeadline,
        isEligible,
        isRegistered: Boolean(userRegistration),
        userRegistration,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Event (Admin)
// @route   POST /api/events
// @access  Private (Admin only)
exports.createEvent = async (req, res, next) => {
  try {
    const {
      organization,
      title,
      description,
      category,
      bannerUrl,
      speakerName,
      speakerDesignation,
      speakerPhotoUrl,
      eventDate,
      startTime,
      endTime,
      venue,
      mode,
      meetingUrl,
      registrationDeadline,
      isPaid,
      registrationFee,
      currency,
      capacity,
      registrationUrl,
      contactEmail,
      contactPhone,
      targetAudienceType,
      targetDepartment,
      targetSemester,
      targetDivisions,
      status,
    } = req.body;

    if (!organization) return res.status(400).json({ success: false, error: 'Organization is required' });
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'Event title is required' });
    if (!description || !description.trim()) return res.status(400).json({ success: false, error: 'Event description is required' });
    if (!eventDate) return res.status(400).json({ success: false, error: 'Event date is required' });
    if (!startTime) return res.status(400).json({ success: false, error: 'Start time is required' });
    if (!endTime) return res.status(400).json({ success: false, error: 'End time is required' });
    if (!venue || !venue.trim()) return res.status(400).json({ success: false, error: 'Venue is required' });
    if (!registrationDeadline) return res.status(400).json({ success: false, error: 'Registration deadline is required' });

    // Validate organization exists
    const orgExists = await Organization.findById(organization);
    if (!orgExists) {
      return res.status(400).json({ success: false, error: 'Selected organization does not exist' });
    }

    const event = new Event({
      organization,
      title: title.trim(),
      description: description.trim(),
      category: category || 'Workshop',
      bannerUrl: req.files?.banner?.[0]?.path || bannerUrl || '',
      speakerName: (speakerName || '').trim(),
      speakerDesignation: (speakerDesignation || '').trim(),
      speakerPhotoUrl: req.files?.speakerPhoto?.[0]?.path || speakerPhotoUrl || '',
      eventDate: new Date(eventDate),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      venue: venue.trim(),
      mode: mode || 'Offline',
      meetingUrl: (meetingUrl || '').trim(),
      registrationDeadline: new Date(registrationDeadline),
      isPaid: isPaid === 'true' || isPaid === true,
      registrationFee: (isPaid === 'true' || isPaid === true) ? Math.max(0, Number(registrationFee) || 0) : 0,
      currency: currency || 'INR',
      capacity: Math.max(0, Number(capacity) || 0),
      registrationUrl: (registrationUrl || '').trim(),
      contactEmail: (contactEmail || '').trim().toLowerCase(),
      contactPhone: (contactPhone || '').trim(),
      targetAudienceType: targetAudienceType === 'targeted' ? 'targeted' : 'all',
      targetDepartment: targetAudienceType === 'targeted' && targetDepartment ? targetDepartment : null,
      targetSemester: targetAudienceType === 'targeted' && targetSemester ? targetSemester : null,
      targetDivisions: targetAudienceType === 'targeted' && Array.isArray(targetDivisions) ? targetDivisions : [],
      status: status === 'Published' ? 'Published' : 'Draft',
      createdBy: req.user?.userId || null,
    });

    await event.save();

    // If immediately created as Published, notify target students
    if (event.status === 'Published') {
      notifyTargetStudents(event, orgExists.name).catch((err) =>
        console.error('Error dispatching event notification:', err)
      );
    }

    const populated = await Event.findById(event._id)
      .populate('organization', 'name logoUrl website')
      .populate('targetDepartment', 'department_name short_name')
      .populate('targetSemester', 'semester_number academic_year')
      .populate('targetDivisions', 'division_name');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Event (Admin)
// @route   PUT /api/events/:id
// @access  Private (Admin only)
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const regCount = await EventRegistration.countDocuments({
      event: event._id,
      registrationStatus: { $ne: 'cancelled' },
    });

    const {
      organization,
      title,
      description,
      category,
      bannerUrl,
      speakerName,
      speakerDesignation,
      speakerPhotoUrl,
      eventDate,
      startTime,
      endTime,
      venue,
      mode,
      meetingUrl,
      registrationDeadline,
      isPaid,
      registrationFee,
      currency,
      capacity,
      registrationUrl,
      contactEmail,
      contactPhone,
      targetAudienceType,
      targetDepartment,
      targetSemester,
      targetDivisions,
      status,
    } = req.body;

    if (organization !== undefined) event.organization = organization;
    if (title !== undefined) event.title = title.trim();
    if (description !== undefined) event.description = description.trim();
    if (category !== undefined) event.category = category;
    if (req.files?.banner?.[0]?.path) {
      event.bannerUrl = req.files.banner[0].path;
    } else if (bannerUrl !== undefined) {
      event.bannerUrl = bannerUrl.trim();
    }
    if (speakerName !== undefined) event.speakerName = speakerName.trim();
    if (speakerDesignation !== undefined) event.speakerDesignation = speakerDesignation.trim();
    if (req.files?.speakerPhoto?.[0]?.path) {
      event.speakerPhotoUrl = req.files.speakerPhoto[0].path;
    } else if (speakerPhotoUrl !== undefined) {
      event.speakerPhotoUrl = speakerPhotoUrl.trim();
    }
    if (eventDate !== undefined) event.eventDate = new Date(eventDate);
    if (startTime !== undefined) event.startTime = startTime.trim();
    if (endTime !== undefined) event.endTime = endTime.trim();
    if (venue !== undefined) event.venue = venue.trim();
    if (mode !== undefined) event.mode = mode;
    if (meetingUrl !== undefined) event.meetingUrl = meetingUrl.trim();
    if (registrationDeadline !== undefined) event.registrationDeadline = new Date(registrationDeadline);

    // If registrations exist, preserve historic price integrity
    if (isPaid !== undefined && regCount === 0) {
      event.isPaid = isPaid === 'true' || isPaid === true;
    }
    if (registrationFee !== undefined && regCount === 0) {
      event.registrationFee = event.isPaid ? Math.max(0, Number(registrationFee) || 0) : 0;
    }
    if (currency !== undefined) event.currency = currency;
    if (capacity !== undefined) event.capacity = Math.max(0, Number(capacity) || 0);
    if (registrationUrl !== undefined) event.registrationUrl = registrationUrl.trim();
    if (contactEmail !== undefined) event.contactEmail = contactEmail.trim().toLowerCase();
    if (contactPhone !== undefined) event.contactPhone = contactPhone.trim();

    if (targetAudienceType !== undefined) {
      event.targetAudienceType = targetAudienceType === 'targeted' ? 'targeted' : 'all';
    }
    if (targetDepartment !== undefined) {
      event.targetDepartment = event.targetAudienceType === 'targeted' && targetDepartment ? targetDepartment : null;
    }
    if (targetSemester !== undefined) {
      event.targetSemester = event.targetAudienceType === 'targeted' && targetSemester ? targetSemester : null;
    }
    if (targetDivisions !== undefined) {
      event.targetDivisions = event.targetAudienceType === 'targeted' && Array.isArray(targetDivisions) ? targetDivisions : [];
    }
    if (status !== undefined) event.status = status;

    await event.save();

    const populated = await Event.findById(event._id)
      .populate('organization', 'name logoUrl website')
      .populate('targetDepartment', 'department_name short_name')
      .populate('targetSemester', 'semester_number academic_year')
      .populate('targetDivisions', 'division_name');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: populated,
      warning: regCount > 0 ? `Note: ${regCount} existing registration(s) preserved.` : null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish Event (Admin)
// @route   POST /api/events/:id/publish
// @access  Private (Admin only)
exports.publishEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('organization', 'name');
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    event.status = 'Published';
    await event.save();

    // Trigger in-app notification to eligible students
    notifyTargetStudents(event, event.organization?.name).catch((err) =>
      console.error('Error dispatching notifications on publish:', err)
    );

    res.json({
      success: true,
      message: 'Event published successfully. Eligible students can now register.',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unpublish Event (Admin)
// @route   POST /api/events/:id/unpublish
// @access  Private (Admin only)
exports.unpublishEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    event.status = 'Unpublished';
    await event.save();

    res.json({
      success: true,
      message: 'Event unpublished. It is no longer visible to students.',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Event (Admin)
// @route   POST /api/events/:id/cancel
// @access  Private (Admin only)
exports.cancelEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const paidRegCount = await EventRegistration.countDocuments({
      event: event._id,
      paymentStatus: 'paid',
      registrationStatus: { $ne: 'cancelled' },
    });

    event.status = 'Cancelled';
    await event.save();

    res.json({
      success: true,
      message: 'Event has been cancelled.',
      paidRegistrationsCount: paidRegCount,
      refundNotice: paidRegCount > 0
        ? `This event has ${paidRegCount} paid registration(s). Please review and process refunds accordingly.`
        : null,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Event (Admin)
// @route   DELETE /api/events/:id
// @access  Private (Admin only)
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const regCount = await EventRegistration.countDocuments({ event: event._id });
    if (regCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete event with ${regCount} existing registration(s). Please cancel the event instead.`,
      });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Registrations List for an Event (Admin)
// @route   GET /api/events/:id/registrations
// @access  Private (Admin only)
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('organization', 'name');
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const registrations = await EventRegistration.find({ event: event._id })
      .populate({
        path: 'student',
        select: 'name email student_id department_id semester_id division_id',
        populate: [
          { path: 'department_id', select: 'department_name short_name' },
          { path: 'semester_id', select: 'semester_number' },
          { path: 'division_id', select: 'division_name' },
        ],
      })
      .populate('payment', 'amount razorpayOrderId razorpayPaymentId status paidAt')
      .sort({ registeredAt: -1 })
      .lean();

    res.json({
      success: true,
      event: {
        id: event._id,
        title: event.title,
        isPaid: event.isPaid,
        registrationFee: event.registrationFee,
        currency: event.currency,
        capacity: event.capacity,
        totalRegistrations: registrations.length,
      },
      data: registrations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Event Registrations as CSV (Admin)
// @route   GET /api/events/:id/export
// @access  Private (Admin only)
exports.exportEventRegistrationsCSV = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const registrations = await EventRegistration.find({ event: event._id })
      .populate({
        path: 'student',
        select: 'name email student_id department_id semester_id division_id',
        populate: [
          { path: 'department_id', select: 'department_name short_name' },
          { path: 'semester_id', select: 'semester_number' },
          { path: 'division_id', select: 'division_name' },
        ],
      })
      .populate('payment', 'amount razorpayPaymentId status paidAt')
      .sort({ registeredAt: 1 })
      .lean();

    const headers = [
      'Registration ID',
      'Student Name',
      'Email',
      'Student ID',
      'Department',
      'Semester',
      'Division',
      'Registration Date',
      'Registration Status',
      'Payment Status',
      'Amount (INR)',
      'Payment ID',
    ];

    const rows = registrations.map((r) => {
      const student = r.student || {};
      const dept = student.department_id?.department_name || student.department_id?.short_name || '—';
      const sem = student.semester_id?.semester_number ? `Semester ${student.semester_id.semester_number}` : '—';
      const div = student.division_id?.division_name || '—';
      const payment = r.payment || {};

      return [
        r._id,
        `"${(student.name || '').replace(/"/g, '""')}"`,
        student.email || '—',
        student.student_id || '—',
        `"${dept.replace(/"/g, '""')}"`,
        sem,
        div,
        new Date(r.registeredAt).toLocaleString('en-IN'),
        r.registrationStatus,
        r.paymentStatus,
        payment.amount !== undefined ? payment.amount : (event.isPaid ? event.registrationFee : 0),
        payment.razorpayPaymentId || '—',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `registrations_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Event Analytics (Admin)
// @route   GET /api/events/:id/analytics
// @access  Private (Admin only)
exports.getEventAnalytics = async (req, res, next) => {
  try {
    const analytics = await eventAnalyticsService.getSingleEventAnalytics(req.params.id);
    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Admin Events Data Health & Integrity Diagnostic
// @route   GET /api/events/admin/health
// @access  Private (Admin only)
exports.getAdminEventHealth = async (req, res, next) => {
  try {
    const diagnostic = await eventAnalyticsService.getDataHealthDiagnostic();
    res.json({
      success: true,
      data: diagnostic,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reconcile & Clean Up Orphan Records (Admin Maintenance)
// @route   POST /api/events/admin/reconcile
// @access  Private (Admin only)
exports.reconcileAdminEvents = async (req, res, next) => {
  try {
    const result = await eventAnalyticsService.reconcileOrphanRecords();
    const updatedHealth = await eventAnalyticsService.getDataHealthDiagnostic();
    res.json({
      success: true,
      message: 'Event database records reconciled successfully.',
      cleaned: result,
      health: updatedHealth,
    });
  } catch (error) {
    next(error);
  }
};

// Internal Helper: Send In-App Notifications to Target Students
async function notifyTargetStudents(event, organizationName) {
  try {
    const studentFilter = { role: 'student', isVerified: true };

    if (event.targetAudienceType === 'targeted') {
      if (event.targetDepartment) studentFilter.department_id = event.targetDepartment;
      if (event.targetSemester) studentFilter.semester_id = event.targetSemester;
      if (event.targetDivisions && event.targetDivisions.length > 0) {
        studentFilter.division_id = { $in: event.targetDivisions };
      }
    }

    const students = await User.find(studentFilter).select('_id name');
    if (!students || students.length === 0) return;

    const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const notifDocs = students.map((s) => ({
      recipientType: 'user',
      recipientId: s._id.toString(),
      userId: s._id.toString(),
      title: `🎓 New ${event.category}: ${event.title}`,
      message: `${organizationName ? organizationName + ' presents ' : ''}${event.title} on ${dateStr} at ${event.venue}. ${event.isPaid ? 'Fee: ₹' + event.registrationFee : 'Free Entry'}.`,
      type: 'announcement',
      entityType: 'Event',
      entityId: event._id,
      channels: { inApp: true, email: false },
    }));

    await Notification.insertMany(notifDocs);
  } catch (err) {
    console.error('Failed to insert target student notifications:', err.message);
  }
}
