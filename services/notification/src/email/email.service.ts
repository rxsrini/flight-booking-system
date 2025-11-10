import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export enum EmailTemplate {
  BOOKING_CONFIRMATION = 'booking-confirmation',
  BOOKING_CANCELLED = 'booking-cancelled',
  PAYMENT_RECEIPT = 'payment-receipt',
  PAYMENT_FAILED = 'payment-failed',
  PASSWORD_RESET = 'password-reset',
  WELCOME = 'welcome',
  BOOKING_REMINDER = 'booking-reminder',
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<EmailTemplate, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    this.logger.log('Email transporter initialized');
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, 'templates');

    Object.values(EmailTemplate).forEach((template) => {
      try {
        const templatePath = path.join(templatesDir, `${template}.hbs`);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.templates.set(template, handlebars.compile(templateContent));
          this.logger.log(`Loaded template: ${template}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to load template ${template}: ${error.message}`);
      }
    });
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    template: EmailTemplate,
    context: any,
  ): Promise<boolean> {
    try {
      const compiledTemplate = this.templates.get(template);

      if (!compiledTemplate) {
        this.logger.error(`Template ${template} not found`);
        return false;
      }

      const html = compiledTemplate(context);

      const mailOptions = {
        from: `"Flight Booking System" <${process.env.SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent: ${info.messageId} to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  async sendBookingConfirmation(
    email: string,
    bookingDetails: {
      pnr: string;
      customerName: string;
      flightNumber: string;
      airline: string;
      origin: string;
      destination: string;
      departureDate: string;
      departureTime: string;
      arrivalDate: string;
      arrivalTime: string;
      passengers: number;
      cabinClass: string;
      totalAmount: number;
      currency: string;
    },
  ) {
    return this.sendEmail(
      email,
      `Booking Confirmation - ${bookingDetails.pnr}`,
      EmailTemplate.BOOKING_CONFIRMATION,
      bookingDetails,
    );
  }

  async sendBookingCancellation(
    email: string,
    cancellationDetails: {
      pnr: string;
      customerName: string;
      flightNumber: string;
      refundAmount?: number;
      currency?: string;
      reason?: string;
    },
  ) {
    return this.sendEmail(
      email,
      `Booking Cancelled - ${cancellationDetails.pnr}`,
      EmailTemplate.BOOKING_CANCELLED,
      cancellationDetails,
    );
  }

  async sendPaymentReceipt(
    email: string,
    paymentDetails: {
      receiptNumber: string;
      customerName: string;
      pnr: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      paymentDate: string;
      transactionId: string;
    },
  ) {
    return this.sendEmail(
      email,
      `Payment Receipt - ${paymentDetails.receiptNumber}`,
      EmailTemplate.PAYMENT_RECEIPT,
      paymentDetails,
    );
  }

  async sendPaymentFailed(
    email: string,
    failureDetails: {
      customerName: string;
      pnr: string;
      amount: number;
      currency: string;
      reason: string;
      retryUrl?: string;
    },
  ) {
    return this.sendEmail(
      email,
      `Payment Failed - ${failureDetails.pnr}`,
      EmailTemplate.PAYMENT_FAILED,
      failureDetails,
    );
  }

  async sendPasswordReset(
    email: string,
    resetDetails: {
      name: string;
      resetLink: string;
      expiresIn: string;
    },
  ) {
    return this.sendEmail(
      email,
      'Password Reset Request',
      EmailTemplate.PASSWORD_RESET,
      resetDetails,
    );
  }

  async sendWelcomeEmail(
    email: string,
    userDetails: {
      name: string;
      role: string;
      loginUrl: string;
    },
  ) {
    return this.sendEmail(
      email,
      'Welcome to Flight Booking System',
      EmailTemplate.WELCOME,
      userDetails,
    );
  }

  async sendBookingReminder(
    email: string,
    reminderDetails: {
      customerName: string;
      pnr: string;
      flightNumber: string;
      departureDate: string;
      departureTime: string;
      origin: string;
      destination: string;
      hoursUntilDeparture: number;
    },
  ) {
    return this.sendEmail(
      email,
      `Flight Reminder - ${reminderDetails.pnr}`,
      EmailTemplate.BOOKING_REMINDER,
      reminderDetails,
    );
  }
}
