const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { body, validationResult } = require('express-validator');
const { sendBookingConfirmation, sendAdminNotification } = require('../utils/emailer');

// Get all bookings (admin only)
router.get('/', require('../utils/auth'), async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create booking
router.post('/', [
  body('firstName').notEmpty(),
  body('phone').notEmpty(),
  body('service').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { 
      bookingId, firstName, lastName, phone, email, 
      vehicleMake, vehicleModel, vehicleYear, licensePlate,
      service, message, date, time, status 
    } = req.body;
    
    const query = `
      INSERT INTO bookings (
        booking_id, first_name, last_name, phone, email,
        vehicle_make, vehicle_model, vehicle_year, license_plate,
        service, message, booking_date, time_slot, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      bookingId, firstName, lastName, phone, email,
      vehicleMake, vehicleModel, vehicleYear, licensePlate,
      service, message, date, time, status || 'pending'
    ];
    
    const result = await client.query(query, values);
    const booking = result.rows[0];
    
    // Send email notifications
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        // Send confirmation to customer
        await sendBookingConfirmation({
          bookingId,
          firstName,
          lastName,
          email,
          phone,
          vehicleMake,
          vehicleModel,
          vehicleYear,
          service,
          date,
          time
        });
        
        // Send notification to admin
        await sendAdminNotification({
          bookingId,
          firstName,
          lastName,
          email,
          phone,
          vehicleMake,
          vehicleModel,
          vehicleYear,
          service,
          date,
          time
        });
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
        // Don't fail the booking if email fails
      }
    }
    
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status (admin only)
router.put('/:id', require('../utils/auth'), async (req, res) => {
  try {
    const { status } = req.body;
    const query = 'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *';
    const result = await client.query(query, [status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete booking (admin only)
router.delete('/:id', require('../utils/auth'), async (req, res) => {
  try {
    await client.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;