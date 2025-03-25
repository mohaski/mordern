// utils/email.js
const generateEmailBody = (customerName, orderDetails) => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  
    const { tracking_number, created_at, estimated_delivery, total_cost } = orderDetails;
  
    const formattedCreatedAt = new Date(created_at).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    const formattedEstimatedDelivery = new Date(estimated_delivery).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  
    const body = `
  ${greeting} ${customerName},
  
  We are pleased to inform you that your order has been confirmed.
  
  Order Details:
  - Tracking Number: ${tracking_number}
  - Order Date: ${formattedCreatedAt}
  - Estimated Delivery: ${formattedEstimatedDelivery}
  - Total Cost: $${total_cost || 'TBD'}
  
  You can track your order here:
  http://localhost:3000/track-order?tracking=${tracking_number}
  
  Thank you for choosing Modern Cargo.
  
  Best regards,
  Modern Cargo Team
    `.trim();
  
    return encodeURIComponent(body); // Encode for URL use
  };
  
  // Function to generate Gmail URL
  const openGmail = (customerEmail, subject, body) => {
    const senderEmail = "your-email@gmail.com"; // Replace with your sender email
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customerEmail)}&su=${encodeURIComponent(subject)}&body=${body}&bcc=${encodeURIComponent(senderEmail)}`;
    return gmailUrl;
  };
  
  module.exports = { generateEmailBody, openGmail };