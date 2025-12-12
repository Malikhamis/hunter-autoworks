const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { body, validationResult } = require('express-validator');
const { sendBookingConfirmation, sendAdminNotification } = require('../utils/emailer'); // Reuse emailer functions

// Get all quotes (admin only)
router.get('/', require('../utils/auth'), async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create quote
router.post('/', [
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('vehicle').notEmpty(),
  body('service').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { name, phone, email, vehicle, service, message } = req.body;
    const query = `
      INSERT INTO quotes (name, phone, email, vehicle, service, message)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;
    
    const result = await client.query(query, [name, phone, email, vehicle, service, message]);
    const quote = result.rows[0];
    
    // Send email notifications for quotes
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        // For quotes, we'll send a simplified notification to admin
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER,
          subject: `New Quote Request - ${name} for ${service}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #00B2FF 0%, #1A1B25 100%); color: white; padding: 20px; text-align: center;">
                <h1>HUNTER AUTOWORKS</h1>
                <p>New Quote Request</p>
              </div>
              
              <div style="padding: 20px; background: #f8f9fa;">
                <h2 style="color: #1A1B25;">Quote Request Details</h2>
                
                <div style="background: white; border-radius: 8px; padding: 15px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Vehicle:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${vehicle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Service:</strong></td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${service}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px;"><strong>Message:</strong></td>
                      <td style="padding: 8px;">${message || 'No additional message'}</td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <div style="background: #1A1B25; color: white; padding: 15px; text-align: center; font-size: 12px;">
                <p>© 2024 Hunter Autoworks. All rights reserved.</p>
              </div>
            </div>
          `
        };
        
        // Send notification to admin
        const info = await require('nodemailer').createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        }).sendMail(mailOptions);
        
        console.log('Quote notification email sent: ' + info.response);
      } catch (emailError) {
        console.error('Error sending quote notification email:', emailError);
        // Don't fail the quote if email fails
      }
    }
    
    res.status(201).json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update quote status (admin only)
router.put('/:id', require('../utils/auth'), async (req, res) => {
  try {
    const { status } = req.body;
    const query = 'UPDATE quotes SET status = $1 WHERE id = $2 RETURNING *';
    const result = await client.query(query, [status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete quote (admin only)
router.delete('/:id', require('../utils/auth'), async (req, res) => {
  try {
    await client.query('DELETE FROM quotes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;