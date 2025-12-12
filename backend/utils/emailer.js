const nodemailer = require('nodemailer');

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this based on your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send booking confirmation email
const sendBookingConfirmation = async (bookingData) => {
  try {
    const {
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
    } = bookingData;

    // Skip if no email provided
    if (!email) {
      console.log('No email provided for booking confirmation');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Booking Confirmation - ${service} on ${date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #00B2FF 0%, #1A1B25 100%); color: white; padding: 20px; text-align: center;">
            <h1>HUNTER AUTOWORKS</h1>
            <p>Premium Automotive Excellence</p>
          </div>
          
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="color: #1A1B25;">Booking Confirmation</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Thank you for booking a service with Hunter Autoworks. Your appointment has been confirmed with the following details:</p>
            
            <div style="background: white; border-radius: 8px; padding: 15px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h3 style="color: #00B2FF; margin-top: 0;">Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Service:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${service}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Vehicle:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${vehicleYear} ${vehicleMake} ${vehicleModel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px;"><strong>Booking ID:</strong></td>
                  <td style="padding: 8px;">${bookingData.bookingId}</td>
                </tr>
              </table>
            </div>
            
            <p>Our team will contact you within 2 hours to confirm the appointment.</p>
            <p>If you need to make any changes, please contact us at:</p>
            <p><strong>Phone:</strong> +255 627 629 345</p>
            <p><strong>Email:</strong> info@hunterautoworks.co.tz</p>
            
            <div style="background: #e9f7fe; border-left: 4px solid #00B2FF; padding: 15px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1A1B25;">What to Expect</h4>
              <ul>
                <li>Arrive 10 minutes before your scheduled time</li>
                <li>Bring your vehicle registration documents</li>
                <li>Our technicians will provide a detailed service estimate</li>
              </ul>
            </div>
          </div>
          
          <div style="background: #1A1B25; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>© 2024 Hunter Autoworks. All rights reserved.</p>
            <p>Dar es Salaam, Tanzania</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
};

// Function to send notification to admin
const sendAdminNotification = async (bookingData) => {
  try {
    const {
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
    } = bookingData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to admin
      subject: `New Booking - ${firstName} ${lastName} for ${service}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #00B2FF 0%, #1A1B25 100%); color: white; padding: 20px; text-align: center;">
            <h1>HUNTER AUTOWORKS</h1>
            <p>New Booking Notification</p>
          </div>
          
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="color: #1A1B25;">New Service Booking</h2>
            
            <div style="background: white; border-radius: 8px; padding: 15px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h3 style="color: #00B2FF; margin-top: 0;">Customer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${firstName} ${lastName}</td>
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
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${vehicleYear} ${vehicleMake} ${vehicleModel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Service:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${service}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date & Time:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${date} at ${time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px;"><strong>Booking ID:</strong></td>
                  <td style="padding: 8px;">${bookingData.bookingId}</td>
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

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    throw error;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendAdminNotification
};