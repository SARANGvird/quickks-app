// backend/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles, checkPermission } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validateBookingInput, validateStatusUpdate, validateBookingId } = require('../middleware/validation');
const { sendBookingNotification } = require('../services/notificationService');
const { logActivity } = require('../services/auditService');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validateMongoId } = require('../utils/validation');
const logger = require('../utils/logger');

// ==========================================================
// CONSTANTS
// ==========================================================
const VALID_STATUSES = {
  CUSTOMER: ['PENDING', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED_BY_PROVIDER'],
  PROVIDER: ['PENDING', 'REQUESTED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'COMPLETED_BY_PROVIDER'],
  ADMIN: ['PENDING', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'REJECTED', 'COMPLETED_BY_PROVIDER']
};

const STATUS_TRANSITIONS = {
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED', 'ASSIGNED'],
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED', 'ASSIGNED'],
  ASSIGNED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED', 'PROVIDER_STARTED'],
  PROVIDER_STARTED: ['IN_PROGRESS', 'CANCELLED', 'COMPLETED_BY_PROVIDER'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'COMPLETED_BY_PROVIDER'],
  COMPLETED_BY_PROVIDER: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  RESCHEDULED: ['PENDING', 'ACCEPTED', 'CANCELLED']
};

const STATUS_PRIORITY = {
  REQUESTED: 1,
  PENDING: 1,
  ASSIGNED: 2,
  ACCEPTED: 3,
  PROVIDER_STARTED: 4,
  IN_PROGRESS: 4,
  COMPLETED_BY_PROVIDER: 5,
  COMPLETED: 6,
  CANCELLED: 0,
  REJECTED: 0,
  EXPIRED: 0
};

const CACHE_TTL = {
  BOOKINGS_LIST: 60, // 1 minute
  BOOKING_DETAILS: 300, // 5 minutes
  BOOKING_STATS: 600 // 10 minutes
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const isValidStatusTransition = (currentStatus, newStatus, role) => {
  if (role === 'ADMIN') return true;
  if (!STATUS_TRANSITIONS[currentStatus]) return false;
  return STATUS_TRANSITIONS[currentStatus].includes(newStatus);
};

const canUserModifyBooking = (booking, userId, userRole, providerId = null) => {
  const isCustomer = booking.customerId?.toString() === userId || booking.customerId?._id?.toString() === userId;
  const isProvider = providerId && booking.providerId?.toString() === providerId.toString();
  const isAdmin = userRole === 'ADMIN';
  
  return { isCustomer, isProvider, isAdmin, authorized: isCustomer || isProvider || isAdmin };
};

const formatBookingResponse = (booking, includeDetails = true) => {
  if (!booking) return null;
  
  const response = {
    bookingId: booking._id,
    serviceType: booking.serviceType,
    description: booking.description,
    address: booking.address,
    area: booking.area,
    latitude: booking.latitude,
    longitude: booking.longitude,
    status: booking.status,
    scheduledAt: booking.scheduledAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    totalAmount: booking.totalAmount,
    serviceCharge: booking.serviceCharge || 0,
    paid: booking.paid || false,
    paymentStatus: booking.paymentStatus || 'PENDING',
    paymentMethod: booking.paymentMethod,
    razorpayOrderId: booking.razorpayOrderId,
    razorpayPaymentId: booking.razorpayPaymentId
  };

  if (includeDetails) {
    response.notes = booking.notes;
    response.customerNotes = booking.customerNotes;
    response.providerNotes = booking.providerNotes;
    response.cancellationReason = booking.cancellationReason;
    response.rejectionReason = booking.rejectionReason;
    response.idempotencyKey = booking.idempotencyKey;
    response.correlationId = booking.correlationId;
    
    // Timestamps
    response.acceptedAt = booking.acceptedAt;
    response.startedAt = booking.startedAt;
    response.completedAt = booking.completedAt;
    response.cancelledAt = booking.cancelledAt;
    
    // Customer details
    if (booking.customerId) {
      response.customer = {
        id: booking.customerId._id || booking.customerId,
        name: booking.customerId.name || booking.customerName,
        email: booking.customerId.email,
        phone: booking.customerId.phone || booking.customerPhone,
        avatar: booking.customerId.avatar
      };
    } else if (booking.customerName) {
      response.customer = {
        name: booking.customerName,
        phone: booking.customerPhone,
        email: booking.customerEmail
      };
    }
    
    // Provider details
    if (booking.providerId) {
      response.provider = {
        id: booking.providerId._id || booking.providerId,
        name: booking.providerId.name || booking.providerName,
        email: booking.providerId.email,
        phone: booking.providerId.phone,
        rating: booking.providerId.rating,
        serviceType: booking.providerId.serviceType
      };
    } else if (booking.providerName) {
      response.provider = {
        name: booking.providerName,
        phone: booking.providerPhone
      };
    }
  }

  return response;
};

const validateBookingOwnership = async (bookingId, userId, userRole) => {
  const booking = await Booking.findById(bookingId)
    .populate('customerId', 'name email phone')
    .populate('providerId', 'name email phone rating');
  
  if (!booking) {
    throw new Error('BOOKING_NOT_FOUND');
  }
  
  let provider = null;
  if (userRole === 'PROVIDER') {
    provider = await Provider.findOne({ userId });
  }
  
  const { authorized, isCustomer, isProvider, isAdmin } = canUserModifyBooking(
    booking, userId, userRole, provider?._id
  );
  
  if (!authorized) {
    throw new Error('UNAUTHORIZED');
  }
  
  return { booking, isCustomer, isProvider, isAdmin, provider };
};

// ==========================================================
// CACHE INVALIDATION HELPERS
// ==========================================================
const invalidateBookingCaches = async (bookingId, userId, providerId) => {
  const cacheKeys = [
    `bookings:customer:${userId}`,
    `bookings:provider:${providerId}`,
    `booking:${bookingId}`,
    'bookings:stats'
  ];
  
  for (const key of cacheKeys) {
    await invalidateCache(key);
  }
};

// ==========================================================
// ROUTES
// ==========================================================

/**
 * @route   GET /api/bookings/my-bookings
 * @desc    Get all bookings for logged-in CUSTOMER with pagination and filters
 * @access  Private (Customer)
 */
router.get(
  '/my-bookings',
  authMiddleware,
  authorizeRoles('CUSTOMER'),
  rateLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  cacheMiddleware(CACHE_TTL.BOOKINGS_LIST),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        page = 0,
        size = 10,
        status,
        serviceType,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        sortBy = 'createdAt',
        sortDir = 'desc'
      } = req.query;
      
      logger.info(`👤 Fetching bookings for customer ID: ${userId}`);
      
      // Build query
      const query = { customerId: userId };
      
      if (status && VALID_STATUSES.CUSTOMER.includes(status)) {
        query.status = status;
      }
      
      if (serviceType) {
        query.serviceType = serviceType;
      }
      
      if (startDate || endDate) {
        query.scheduledAt = {};
        if (startDate) query.scheduledAt.$gte = new Date(startDate);
        if (endDate) query.scheduledAt.$lte = new Date(endDate);
      }
      
      if (minAmount || maxAmount) {
        query.totalAmount = {};
        if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
        if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
      }
      
      if (search) {
        query.$or = [
          { serviceType: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Calculate pagination
      const pageNum = Math.max(0, parseInt(page));
      const pageSize = Math.min(100, Math.max(1, parseInt(size)));
      const skip = pageNum * pageSize;
      
      // Build sort object
      const sort = {};
      sort[sortBy] = sortDir === 'desc' ? -1 : 1;
      
      // Execute queries with timeout
      const [bookings, total] = await Promise.all([
        Booking.find(query)
          .populate('providerId', 'name email phone rating serviceType avatar')
          .populate('customerId', 'name email phone avatar')
          .sort(sort)
          .skip(skip)
          .limit(pageSize)
          .maxTimeMS(10000) // 10 second timeout
          .lean(),
        Booking.countDocuments(query).maxTimeMS(5000)
      ]);
      
      logger.info(`✅ Found ${bookings.length} bookings for customer ${userId}`);
      
      // Format response
      const formattedBookings = bookings.map(booking => formatBookingResponse(booking, false));
      
      // Set cache key for future requests
      const cacheKey = `bookings:customer:${userId}:${page}:${size}:${JSON.stringify(req.query)}`;
      req.cacheKey = cacheKey;
      
      res.json({
        success: true,
        data: formattedBookings,
        pagination: {
          page: pageNum,
          size: pageSize,
          totalElements: total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: skip + pageSize < total,
          hasPrevious: pageNum > 0
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error fetching customer bookings:', error);
      
      if (error.name === 'MongoTimeoutError') {
        return res.status(504).json({
          success: false,
          error: 'Database timeout',
          message: 'Request took too long to process'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   GET /api/bookings/provider/my-bookings
 * @desc    Get all bookings assigned to logged-in PROVIDER
 * @access  Private (Provider)
 */
router.get(
  '/provider/my-bookings',
  authMiddleware,
  authorizeRoles('PROVIDER'),
  rateLimiter({ windowMs: 60 * 1000, max: 30 }),
  cacheMiddleware(CACHE_TTL.BOOKINGS_LIST),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 0, size = 10, status, date, search } = req.query;
      
      logger.info(`👨‍🔧 Fetching bookings for provider user ID: ${userId}`);
      
      // Find provider profile
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider profile not found',
          message: 'Please complete your provider profile first'
        });
      }
      
      // Build query
      const query = { providerId: provider._id };
      
      if (status && VALID_STATUSES.PROVIDER.includes(status)) {
        query.status = status;
      }
      
      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.scheduledAt = { $gte: startDate, $lte: endDate };
      }
      
      if (search) {
        query.$or = [
          { serviceType: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Calculate pagination
      const pageNum = Math.max(0, parseInt(page));
      const pageSize = Math.min(100, Math.max(1, parseInt(size)));
      const skip = pageNum * pageSize;
      
      // Execute queries
      const [bookings, total] = await Promise.all([
        Booking.find(query)
          .populate('customerId', 'name email phone avatar')
          .sort({ scheduledAt: 1, createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        Booking.countDocuments(query)
      ]);
      
      logger.info(`✅ Found ${bookings.length} bookings for provider ${provider._id}`);
      
      const formattedBookings = bookings.map(booking => formatBookingResponse(booking, true));
      
      const cacheKey = `bookings:provider:${provider._id}:${page}:${size}:${JSON.stringify(req.query)}`;
      req.cacheKey = cacheKey;
      
      res.json({
        success: true,
        data: formattedBookings,
        pagination: {
          page: pageNum,
          size: pageSize,
          totalElements: total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: skip + pageSize < total,
          hasPrevious: pageNum > 0
        },
        provider: {
          id: provider._id,
          name: provider.name,
          serviceType: provider.serviceType
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error fetching provider bookings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   POST /api/bookings/create
 * @desc    Create a new booking
 * @access  Private (Customer)
 */
router.post(
  '/create',
  authMiddleware,
  authorizeRoles('CUSTOMER'),
  rateLimiter({ windowMs: 60 * 1000, max: 10 }), // 10 bookings per minute
  validateBookingInput,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        serviceType,
        description,
        address,
        area,
        latitude,
        longitude,
        scheduledAt,
        totalAmount,
        serviceCharge = 0,
        paymentMethod = 'CASH',
        idempotencyKey
      } = req.body;
      
      logger.info(`📝 Creating booking for user: ${userId}`);
      
      // Check for duplicate submission using idempotency key
      if (idempotencyKey) {
        const existingBooking = await Booking.findOne({ idempotencyKey });
        if (existingBooking) {
          return res.status(409).json({
            success: false,
            error: 'Duplicate request',
            message: 'This booking has already been submitted',
            data: formatBookingResponse(existingBooking)
          });
        }
      }
      
      // Validate scheduled date
      const scheduledDate = new Date(scheduledAt);
      const now = new Date();
      
      if (scheduledDate <= now) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date',
          message: 'Scheduled date must be in the future'
        });
      }
      
      // Check if scheduling too far in advance (max 90 days)
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      if (scheduledDate > maxDate) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date',
          message: 'Bookings can only be scheduled up to 90 days in advance'
        });
      }
      
      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found'
        });
      }
      
      // Create booking
      const newBooking = new Booking({
        bookingId: `BKG${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        customerId: userId,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        serviceType,
        description: description || '',
        address,
        area: area || '',
        latitude: latitude || null,
        longitude: longitude || null,
        scheduledAt: scheduledDate,
        totalAmount: totalAmount || 0,
        serviceCharge: serviceCharge,
        paymentMethod,
        paymentStatus: paymentMethod === 'CASH' ? 'PENDING' : 'PENDING',
        paid: false,
        status: 'REQUESTED',
        idempotencyKey,
        correlationId: req.headers['x-correlation-id'] || `corr_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newBooking.save();
      
      logger.info(`✅ Booking created: ${newBooking._id}`);
      
      // Send notifications
      await sendBookingNotification(newBooking._id, 'CREATED');
      
      // Log activity
      await logActivity({
        userId,
        action: 'BOOKING_CREATED',
        targetId: newBooking._id,
        targetType: 'Booking',
        details: {
          serviceType,
          scheduledAt,
          totalAmount,
          bookingId: newBooking.bookingId
        },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Invalidate relevant caches
      await invalidateBookingCaches(newBooking._id, userId, null);
      
      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: formatBookingResponse(newBooking, true),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error creating booking:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message,
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create booking',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   PUT /api/bookings/:id/status
 * @desc    Update booking status
 * @access  Private (Customer/Provider/Admin)
 */
router.put(
  '/:id/status',
  authMiddleware,
  validateMongoId('id'),
  validateStatusUpdate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason, notes } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      logger.info(`🔄 Updating booking ${id} to status: ${status}`);
      
      // Validate booking and get ownership info
      const { booking, isCustomer, isProvider, isAdmin, provider } = await validateBookingOwnership(id, userId, userRole);
      
      // Determine role for transition validation
      let role = 'CUSTOMER';
      if (isProvider) role = 'PROVIDER';
      if (isAdmin) role = 'ADMIN';
      
      // Validate status transition
      if (!isValidStatusTransition(booking.status, status, role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status transition',
          message: `Cannot change status from ${booking.status} to ${status}`
        });
      }
      
      // Check if status priority is valid (cannot go backwards unless admin)
      if (!isAdmin && STATUS_PRIORITY[status] < STATUS_PRIORITY[booking.status]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status transition',
          message: 'Cannot move to a previous status'
        });
      }
      
      const oldStatus = booking.status;
      
      // Update booking
      booking.status = status;
      booking.updatedAt = new Date();
      
      if (reason) {
        if (status === 'CANCELLED') booking.cancellationReason = reason;
        if (status === 'REJECTED') booking.rejectionReason = reason;
      }
      
      if (notes) {
        if (isProvider) booking.providerNotes = notes;
        if (isCustomer) booking.customerNotes = notes;
      }
      
      // Add timestamps for specific statuses
      const statusTimestampMap = {
        'ACCEPTED': 'acceptedAt',
        'ASSIGNED': 'assignedAt',
        'PROVIDER_STARTED': 'providerStartedAt',
        'STARTED': 'startedAt',
        'IN_PROGRESS': 'startedAt',
        'COMPLETED_BY_PROVIDER': 'completedByProviderAt',
        'COMPLETED': 'completedAt',
        'CANCELLED': 'cancelledAt',
        'REJECTED': 'rejectedAt'
      };
      
      if (statusTimestampMap[status] && !booking[statusTimestampMap[status]]) {
        booking[statusTimestampMap[status]] = new Date();
      }
      
      await booking.save();
      
      logger.info(`✅ Booking ${id} updated from ${oldStatus} to ${status}`);
      
      // Send notification
      await sendBookingNotification(booking._id, 'STATUS_UPDATED', {
        oldStatus,
        newStatus: status,
        reason,
        updatedBy: isAdmin ? 'ADMIN' : (isProvider ? 'PROVIDER' : 'CUSTOMER')
      });
      
      // Log activity
      await logActivity({
        userId,
        action: 'BOOKING_STATUS_UPDATED',
        targetId: booking._id,
        targetType: 'Booking',
        details: {
          oldStatus,
          newStatus: status,
          reason,
          notes
        },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Invalidate caches
      await invalidateBookingCaches(booking._id, booking.customerId, booking.providerId);
      
      res.json({
        success: true,
        message: 'Booking status updated successfully',
        data: {
          bookingId: booking._id,
          status: booking.status,
          oldStatus,
          updatedAt: booking.updatedAt
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error updating booking status:', error);
      
      if (error.message === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
          message: 'The requested booking does not exist'
        });
      }
      
      if (error.message === 'UNAUTHORIZED') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
          message: 'You are not authorized to update this booking'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update booking status',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Cancel a booking (Customer only)
 * @access  Private (Customer)
 */
router.put(
  '/:id/cancel',
  authMiddleware,
  authorizeRoles('CUSTOMER'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;
      
      logger.info(`❌ Cancelling booking ${id} by customer ${userId}`);
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }
      
      // Verify ownership
      if (booking.customerId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized',
          message: 'You can only cancel your own bookings'
        });
      }
      
      // Check if booking can be cancelled
      const cancellableStatuses = ['REQUESTED', 'PENDING', 'ACCEPTED', 'ASSIGNED'];
      if (!cancellableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel',
          message: `Bookings with status '${booking.status}' cannot be cancelled`
        });
      }
      
      // Check cancellation deadline (24 hours before scheduled time)
      const hoursBeforeScheduled = (booking.scheduledAt - new Date()) / (1000 * 60 * 60);
      if (hoursBeforeScheduled < 24 && booking.status === 'ACCEPTED') {
        return res.status(400).json({
          success: false,
          error: 'Cancellation deadline passed',
          message: 'Bookings can only be cancelled at least 24 hours before the scheduled time'
        });
      }
      
      const oldStatus = booking.status;
      
      // Update booking
      booking.status = 'CANCELLED';
      booking.cancellationReason = reason || 'Cancelled by customer';
      booking.cancelledAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();
      
      logger.info(`✅ Booking ${id} cancelled successfully`);
      
      // Send notification
      await sendBookingNotification(booking._id, 'CANCELLED', {
        reason: booking.cancellationReason,
        cancelledBy: 'CUSTOMER'
      });
      
      // Log activity
      await logActivity({
        userId,
        action: 'BOOKING_CANCELLED',
        targetId: booking._id,
        targetType: 'Booking',
        details: {
          reason: booking.cancellationReason,
          oldStatus,
          scheduledAt: booking.scheduledAt
        },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Invalidate caches
      await invalidateBookingCaches(booking._id, userId, booking.providerId);
      
      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          bookingId: booking._id,
          status: booking.status,
          cancelledAt: booking.cancelledAt,
          refundEligible: hoursBeforeScheduled >= 24
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error cancelling booking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel booking',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   POST /api/bookings/:id/accept
 * @desc    Accept a booking (Provider only)
 * @access  Private (Provider)
 */
router.post(
  '/:id/accept',
  authMiddleware,
  authorizeRoles('PROVIDER'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider profile not found'
        });
      }
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      const acceptableStatuses = ['REQUESTED', 'PENDING'];
      if (!acceptableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: `Cannot accept booking with status: ${booking.status}`
        });
      }
      
      // Check if provider is available at that time
      const existingBookings = await Booking.find({
        providerId: provider._id,
        status: { $in: ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'] },
        scheduledAt: {
          $gte: new Date(booking.scheduledAt.getTime() - 2 * 60 * 60 * 1000),
          $lte: new Date(booking.scheduledAt.getTime() + 2 * 60 * 60 * 1000)
        }
      });
      
      if (existingBookings.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Provider unavailable',
          message: 'You have another booking scheduled around this time'
        });
      }
      
      booking.providerId = provider._id;
      booking.providerName = provider.name;
      booking.providerPhone = provider.phone;
      booking.status = 'ACCEPTED';
      booking.acceptedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();
      
      await sendBookingNotification(booking._id, 'ACCEPTED', {
        providerName: provider.name,
        providerPhone: provider.phone
      });
      
      await invalidateBookingCaches(booking._id, booking.customerId, provider._id);
      
      res.json({
        success: true,
        message: 'Booking accepted successfully',
        data: formatBookingResponse(booking),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error accepting booking:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/bookings/:id/reject
 * @desc    Reject a booking (Provider only)
 * @access  Private (Provider)
 */
router.post(
  '/:id/reject',
  authMiddleware,
  authorizeRoles('PROVIDER'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;
      
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return res.status(404).json({ success: false, error: 'Provider profile not found' });
      }
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      const rejectableStatuses = ['REQUESTED', 'PENDING'];
      if (!rejectableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: `Cannot reject booking with status: ${booking.status}`
        });
      }
      
      booking.status = 'REJECTED';
      booking.rejectionReason = reason || 'Provider unavailable';
      booking.rejectedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();
      
      await sendBookingNotification(booking._id, 'REJECTED', {
        reason: booking.rejectionReason,
        providerName: provider.name
      });
      
      await invalidateBookingCaches(booking._id, booking.customerId, provider._id);
      
      res.json({
        success: true,
        message: 'Booking rejected successfully',
        data: formatBookingResponse(booking),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error rejecting booking:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/bookings/:id/start
 * @desc    Start a booking (Provider only)
 * @access  Private (Provider)
 */
router.post(
  '/:id/start',
  authMiddleware,
  authorizeRoles('PROVIDER'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return res.status(404).json({ success: false, error: 'Provider profile not found' });
      }
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      const startableStatuses = ['ACCEPTED', 'ASSIGNED'];
      if (!startableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: `Cannot start booking with status: ${booking.status}`
        });
      }
      
      booking.status = 'PROVIDER_STARTED';
      booking.providerStartedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();
      
      await sendBookingNotification(booking._id, 'STARTED', {
        providerName: provider.name,
        scheduledAt: booking.scheduledAt
      });
      
      await invalidateBookingCaches(booking._id, booking.customerId, provider._id);
      
      res.json({
        success: true,
        message: 'Service started successfully',
        data: formatBookingResponse(booking),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error starting booking:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/bookings/:id/complete-by-provider
 * @desc    Mark booking as completed by provider
 * @access  Private (Provider)
 */
router.post(
  '/:id/complete-by-provider',
  authMiddleware,
  authorizeRoles('PROVIDER'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { finalAmount, notes } = req.body;
      const userId = req.user.userId;
      
      const provider = await Provider.findOne({ userId });
      if (!provider) {
        return res.status(404).json({ success: false, error: 'Provider profile not found' });
      }
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      const completableStatuses = ['PROVIDER_STARTED', 'STARTED', 'IN_PROGRESS'];
      if (!completableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: `Cannot complete booking with status: ${booking.status}`
        });
      }
      
      booking.status = 'COMPLETED_BY_PROVIDER';
      booking.completedByProviderAt = new Date();
      if (finalAmount) booking.totalAmount = finalAmount;
      if (notes) booking.providerNotes = notes;
      booking.updatedAt = new Date();
      await booking.save();
      
      await sendBookingNotification(booking._id, 'COMPLETED_BY_PROVIDER', {
        finalAmount,
        providerName: provider.name
      });
      
      await invalidateBookingCaches(booking._id, booking.customerId, provider._id);
      
      res.json({
        success: true,
        message: 'Service marked as completed. Waiting for customer confirmation.',
        data: formatBookingResponse(booking),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error completing booking by provider:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/bookings/:id/confirm-completion
 * @desc    Customer confirms booking completion
 * @access  Private (Customer)
 */
router.post(
  '/:id/confirm-completion',
  authMiddleware,
  authorizeRoles('CUSTOMER'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      if (booking.customerId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized',
          message: 'You can only confirm your own bookings'
        });
      }
      
      if (booking.status !== 'COMPLETED_BY_PROVIDER') {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: `Cannot confirm completion for booking with status: ${booking.status}`
        });
      }
      
      booking.status = 'COMPLETED';
      booking.completedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();
      
      await sendBookingNotification(booking._id, 'COMPLETED', {
        finalAmount: booking.totalAmount,
        completedAt: booking.completedAt
      });
      
      // Update provider stats
      if (booking.providerId) {
        await Provider.findByIdAndUpdate(booking.providerId, {
          $inc: { completedJobs: 1, totalEarnings: booking.totalAmount }
        });
      }
      
      await invalidateBookingCaches(booking._id, userId, booking.providerId);
      
      res.json({
        success: true,
        message: 'Service confirmed successfully! Thank you for your feedback.',
        data: formatBookingResponse(booking),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error confirming booking completion:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get single booking by ID
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  validateMongoId('id'),
  cacheMiddleware(CACHE_TTL.BOOKING_DETAILS),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      const { booking } = await validateBookingOwnership(id, userId, userRole);
      
      const cacheKey = `booking:${id}`;
      req.cacheKey = cacheKey;
      
      res.json({
        success: true,
        data: formatBookingResponse(booking, true),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error fetching booking:', error);
      
      if (error.message === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
          message: 'The requested booking does not exist'
        });
      }
      
      if (error.message === 'UNAUTHORIZED') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
          message: 'You are not authorized to view this booking'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Delete a booking (Admin only)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('ADMIN'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }
      
      const deletedBooking = { ...booking.toObject() };
      await booking.deleteOne();
      
      logger.info(`🗑️ Booking ${id} deleted by admin ${req.user.userId}`);
      
      await logActivity({
        userId: req.user.userId,
        action: 'BOOKING_DELETED',
        targetId: id,
        targetType: 'Booking',
        details: {
          bookingDetails: {
            id: deletedBooking._id,
            serviceType: deletedBooking.serviceType,
            customerId: deletedBooking.customerId,
            status: deletedBooking.status,
            amount: deletedBooking.totalAmount
          }
        },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      await invalidateBookingCaches(id, booking.customerId, booking.providerId);
      
      res.json({
        success: true,
        message: 'Booking deleted successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error deleting booking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete booking',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   GET /api/bookings/stats/summary
 * @desc    Get booking statistics for user
 * @access  Private
 */
router.get(
  '/stats/summary',
  authMiddleware,
  cacheMiddleware(CACHE_TTL.BOOKING_STATS),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      let matchQuery = {};
      
      if (userRole === 'CUSTOMER') {
        matchQuery = { customerId: userId };
      } else if (userRole === 'PROVIDER') {
        const provider = await Provider.findOne({ userId });
        if (provider) {
          matchQuery = { providerId: provider._id };
        }
      }
      
      const stats = await Booking.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }}
      ]);
      
      const summary = {
        total: 0,
        requested: 0,
        pending: 0,
        assigned: 0,
        accepted: 0,
        inProgress: 0,
        completedByProvider: 0,
        completed: 0,
        cancelled: 0,
        rejected: 0,
        totalAmount: 0,
        averageAmount: 0,
        completionRate: 0
      };
      
      stats.forEach(stat => {
        summary.total += stat.count;
        summary.totalAmount += stat.totalAmount;
        
        switch (stat._id) {
          case 'REQUESTED': summary.requested = stat.count; break;
          case 'PENDING': summary.pending = stat.count; break;
          case 'ASSIGNED': summary.assigned = stat.count; break;
          case 'ACCEPTED': summary.accepted = stat.count; break;
          case 'IN_PROGRESS': summary.inProgress = stat.count; break;
          case 'PROVIDER_STARTED': summary.inProgress += stat.count; break;
          case 'COMPLETED_BY_PROVIDER': summary.completedByProvider = stat.count; break;
          case 'COMPLETED': summary.completed = stat.count; break;
          case 'CANCELLED': summary.cancelled += stat.count; break;
          case 'REJECTED': summary.rejected += stat.count; break;
        }
      });
      
      // Calculate derived metrics
      const completedTotal = summary.completed + summary.completedByProvider;
      summary.completionRate = summary.total > 0 ? (completedTotal / summary.total) * 100 : 0;
      summary.averageAmount = summary.completed > 0 ? summary.totalAmount / summary.completed : 0;
      
      const cacheKey = `bookings:stats:${userId}`;
      req.cacheKey = cacheKey;
      
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error fetching booking stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking statistics',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   GET /api/bookings/upcoming
 * @desc    Get upcoming bookings for user
 * @access  Private
 */
router.get(
  '/upcoming',
  authMiddleware,
  cacheMiddleware(CACHE_TTL.BOOKINGS_LIST),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { limit = 5 } = req.query;
      
      let query = {
        scheduledAt: { $gte: new Date() },
        status: { $nin: ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'] }
      };
      
      if (userRole === 'CUSTOMER') {
        query.customerId = userId;
      } else if (userRole === 'PROVIDER') {
        const provider = await Provider.findOne({ userId });
        if (provider) {
          query.providerId = provider._id;
        } else {
          return res.json({ success: true, data: [] });
        }
      } else {
        return res.json({ success: true, data: [] });
      }
      
      const bookings = await Booking.find(query)
        .populate('providerId', 'name email phone rating')
        .populate('customerId', 'name email phone')
        .sort({ scheduledAt: 1 })
        .limit(parseInt(limit))
        .lean();
      
      res.json({
        success: true,
        data: bookings.map(b => formatBookingResponse(b, false)),
        count: bookings.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error fetching upcoming bookings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch upcoming bookings',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   POST /api/bookings/:id/review
 * @desc    Add review for completed booking
 * @access  Private (Customer)
 */
router.post(
  '/:id/review',
  authMiddleware,
  authorizeRoles('CUSTOMER'),
  validateMongoId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.userId;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rating',
          message: 'Rating must be between 1 and 5'
        });
      }
      
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      if (booking.customerId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized',
          message: 'You can only review your own bookings'
        });
      }
      
      if (booking.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: 'Only completed bookings can be reviewed'
        });
      }
      
      if (booking.reviewed) {
        return res.status(400).json({
          success: false,
          error: 'Already reviewed',
          message: 'This booking has already been reviewed'
        });
      }
      
      booking.rating = rating;
      booking.reviewComment = comment;
      booking.reviewed = true;
      booking.reviewedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();
      
      // Update provider rating
      if (booking.providerId) {
        const providerBookings = await Booking.find({
          providerId: booking.providerId,
          reviewed: true,
          rating: { $exists: true }
        });
        
        const avgRating = providerBookings.reduce((sum, b) => sum + b.rating, 0) / providerBookings.length;
        await Provider.findByIdAndUpdate(booking.providerId, { rating: avgRating });
      }
      
      await invalidateBookingCaches(booking._id, userId, booking.providerId);
      
      res.json({
        success: true,
        message: 'Review submitted successfully',
        data: {
          bookingId: booking._id,
          rating: booking.rating,
          comment: booking.reviewComment,
          reviewedAt: booking.reviewedAt
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Error submitting review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit review',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    }
  }
);

/**
 * @route   GET /api/bookings/test/debug
 * @desc    Debug endpoint to check bookings (Development only)
 * @access  Private (Admin)
 */
if (process.env.NODE_ENV !== 'production') {
  router.get('/test/debug', authMiddleware, authorizeRoles('ADMIN'), async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const [allBookings, userBookings, provider] = await Promise.all([
        Booking.find({}).limit(50).lean(),
        Booking.find({ customerId: userId }).limit(20).lean(),
        Provider.findOne({ userId }).lean()
      ]);
      
      res.json({
        success: true,
        message: 'Debug information',
        environment: process.env.NODE_ENV,
        data: {
          user: {
            userId,
            userIdType: typeof userId,
            role: req.user.role
          },
          provider: provider ? {
            providerId: provider._id,
            name: provider.name,
            serviceType: provider.serviceType
          } : null,
          stats: {
            totalBookingsInDB: await Booking.countDocuments(),
            userBookingsFound: userBookings.length
          },
          sampleBookings: allBookings.slice(0, 5).map(b => ({
            bookingId: b._id,
            customerId: b.customerId,
            serviceType: b.serviceType,
            status: b.status,
            createdAt: b.createdAt
          })),
          userBookings: userBookings.map(b => ({
            bookingId: b._id,
            serviceType: b.serviceType,
            status: b.status,
            createdAt: b.createdAt
          }))
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Debug error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

module.exports = router;