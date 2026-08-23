const Organization = require('../models/Organization');
const Event = require('../models/Event');

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Private (Admin / Protected)
exports.getOrganizations = async (req, res, next) => {
  try {
    const { search, activeOnly } = req.query;
    const filter = {};

    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    if (search) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const organizations = await Organization.find(filter)
      .sort({ name: 1 })
      .lean();

    // Attach event count for each organization
    const orgIds = organizations.map((org) => org._id);
    const eventCounts = await Event.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    eventCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    const populated = organizations.map((org) => ({
      ...org,
      eventsCount: countMap[org._id.toString()] || 0,
    }));

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single organization by ID
// @route   GET /api/organizations/:id
// @access  Private (Admin / Protected)
exports.getOrganizationById = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const events = await Event.find({ organization: organization._id })
      .select('title category eventDate status isPaid registrationFee')
      .sort({ eventDate: -1 });

    res.json({ success: true, data: { ...organization.toObject(), events } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private (Admin only)
exports.createOrganization = async (req, res, next) => {
  try {
    const {
      name,
      logoUrl,
      website,
      description,
      contactPerson,
      contactEmail,
      contactPhone,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Organization name is required' });
    }

    const org = new Organization({
      name: name.trim(),
      logoUrl: (req.file && req.file.path) ? req.file.path : (logoUrl || '').trim(),
      website: (website || '').trim(),
      description: (description || '').trim(),
      contactPerson: (contactPerson || '').trim(),
      contactEmail: (contactEmail || '').trim().toLowerCase(),
      contactPhone: (contactPhone || '').trim(),
      createdBy: req.user?.userId || null,
    });

    await org.save();

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: org,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organization
// @route   PUT /api/organizations/:id
// @access  Private (Admin only)
exports.updateOrganization = async (req, res, next) => {
  try {
    const {
      name,
      logoUrl,
      website,
      description,
      contactPerson,
      contactEmail,
      contactPhone,
      isActive,
    } = req.body;

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    if (name !== undefined) org.name = name.trim();
    if (req.file && req.file.path) {
      org.logoUrl = req.file.path;
    } else if (logoUrl !== undefined) {
      org.logoUrl = logoUrl.trim();
    }
    if (website !== undefined) org.website = website.trim();
    if (description !== undefined) org.description = description.trim();
    if (contactPerson !== undefined) org.contactPerson = contactPerson.trim();
    if (contactEmail !== undefined) org.contactEmail = contactEmail.trim().toLowerCase();
    if (contactPhone !== undefined) org.contactPhone = contactPhone.trim();
    if (isActive !== undefined) org.isActive = Boolean(isActive);

    await org.save();

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: org,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete organization (soft delete if events exist, hard delete if none)
// @route   DELETE /api/organizations/:id
// @access  Private (Admin only)
exports.deleteOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const eventCount = await Event.countDocuments({ organization: org._id });
    if (eventCount > 0) {
      // Soft-delete to preserve foreign key integrity
      org.isActive = false;
      await org.save();
      return res.json({
        success: true,
        message: `Organization archived (it has ${eventCount} linked event${eventCount > 1 ? 's' : ''}).`,
        data: org,
      });
    }

    await Organization.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    next(error);
  }
};
