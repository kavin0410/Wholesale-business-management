import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("supplynest")

# Read from environment variables, fallback for testing
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.sendgrid.net")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "apikey")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@supplynest.com")

def send_dispatch_email(customer_name: str, customer_email: str, order_id: int, product_name: str, total: float):
    """Sends an email notification via SMTP when an order is dispatched."""
    if not customer_email:
        logger.info(f"Skipping email for Order #{order_id}: No email address provided for {customer_name}")
        return False
        
    subject = f"Your SupplyNest Order #{order_id} has been Dispatched!"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #4CAF50;">Good News, {customer_name}!</h2>
        <p>Your order <strong>#{order_id}</strong> is on its way.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; border: 1px solid #dee2e6;">Product</th>
            <th style="padding: 10px; border: 1px solid #dee2e6;">Total Amount</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">{product_name}</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">&#8377;{total:.2f}</td>
          </tr>
        </table>
        <p>You can track the live delivery progress on your dashboard.</p>
        <p>Thank you for doing business with SupplyNest.</p>
      </body>
    </html>
    """
    
    # If no SMTP password is set, we simulate sending the email (useful for dev/test)
    if not SMTP_PASSWORD:
        logger.info(f"SIMULATED EMAIL sent to {customer_email} for Order #{order_id} [Subject: {subject}]")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL
    msg["To"] = customer_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, customer_email, msg.as_string())
        logger.info(f"Email successfully sent to {customer_email} for Order #{order_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {customer_email}: {e}")
        return False
