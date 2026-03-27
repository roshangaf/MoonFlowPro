'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating personalized automated follow-up reminders.
 *
 * - generateAutomatedReminders - A function that triggers the reminder generation process.
 * - GenerateReminderInput - The input type for the generateAutomatedReminders function.
 * - GenerateReminderOutput - The return type for the generateAutomatedReminders function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReminderInputSchema = z.object({
  currentDate: z.string().describe('The current date in YYYY-MM-DD format, e.g., "2023-10-27".'),
  customerName: z.string().describe('The full name of the customer.'),
  customerEmail: z.string().email().describe('The email address of the customer.'),
  productName: z.string().describe('The name of the reconditioned product.'),
  productId: z.string().describe('The unique identifier for the product.'),
  purchaseDate: z.string().describe('The date the product was purchased in YYYY-MM-DD format.'),
  warrantyEndDate: z.string().describe('The date the product warranty ends in YYYY-MM-DD format.'),
  lastServiceDate: z.string().optional().describe('The date the product was last serviced in YYYY-MM-DD format. Optional.'),
  nextServiceDate: z.string().optional().describe('The date the product is next due for service in YYYY-MM-DD format. Optional.'),
  paymentDueDate: z.string().optional().describe('The date a payment for the product is due in YYYY-MM-DD format. Optional.'),
});
export type GenerateReminderInput = z.infer<typeof GenerateReminderInputSchema>;

const GenerateReminderOutputSchema = z.object({
  reminderSubject: z.string().describe('The subject line for the reminder message.'),
  reminderText: z.string().describe('The full, personalized reminder message body.'),
  reminderType: z.enum(['warranty', 'service', 'payment', 'general']).describe('The type of reminder generated (e.g., warranty, service, payment, or general if no specific type applies).'),
});
export type GenerateReminderOutput = z.infer<typeof GenerateReminderOutputSchema>;

// Schema for the actual prompt call, including pre-calculated context
const PromptInputSchema = GenerateReminderInputSchema.extend({
  primaryReminderReason: z.string().describe('A concise statement indicating the most pressing reason for this reminder, determined programmatically. Examples: "Payment is due on YYYY-MM-DD", "Warranty expires on YYYY-MM-DD", "Next service is due on YYYY-MM-DD", or "General check-in."'),
});
type PromptInput = z.infer<typeof PromptInputSchema>;

export async function generateAutomatedReminders(
  input: GenerateReminderInput
): Promise<GenerateReminderOutput> {
  return generateAutomatedRemindersFlow(input);
}

const generateReminderPrompt = ai.definePrompt({
  name: 'generateReminderPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: GenerateReminderOutputSchema },
  prompt: `You are an automated reminder system for "MoonFlowPro", a business solution for managing reconditioned products. Your task is to generate a single, polite, and professional follow-up reminder based on the provided customer and product data, and the primary reminder reason.\n\nCurrent Date: {{{currentDate}}}\nPrimary Reminder Reason: {{{primaryReminderReason}}}\n\n--- Customer Details ---\nCustomer Name: {{{customerName}}}\nCustomer Email: {{{customerEmail}}}\n\n--- Product Details ---\nProduct Name: {{{productName}}} (ID: {{{productId}}})\nPurchase Date: {{{purchaseDate}}}\nWarranty End Date: {{{warrantyEndDate}}}\nLast Service Date: {{{lastServiceDate}}}\nNext Service Date: {{{nextServiceDate}}}\nPayment Due Date: {{{paymentDueDate}}}\n\n--- Reminder Generation Guidelines ---\n1.  **Focus**: Generate the reminder based on the 'primaryReminderReason' provided.\n2.  **Personalization**: Address the customer by their name. Refer to the specific product by its name.\n3.  **Tone**: Professional, helpful, and polite.\n4.  **Content**: Clearly state the purpose of the reminder, incorporating details from the 'primaryReminderReason'. Provide relevant dates mentioned in the reason. Encourage action where appropriate (e.g., "contact us to schedule service", "please make payment").\n5.  **Output Format**: Provide a 'reminderSubject', 'reminderText' (body), and 'reminderType' as specified in the output schema.\n    The 'reminderType' should be 'payment', 'warranty', 'service', or 'general' reflecting the 'primaryReminderReason'.\n\nExample for Primary Reminder Reason: "Payment is due on YYYY-MM-DD"\nSubject: Reminder: Upcoming Payment for Your {{{productName}}} (ID: {{{productId}}})\nBody:\nDear {{{customerName}}},\n\nThis is a friendly reminder that the payment for your recently acquired {{{productName}}} (ID: {{{productId}}}) is due on {{{paymentDueDate}}}.\n\nPlease ensure the payment is processed by the due date to avoid any interruptions. If you have already made this payment, please disregard this reminder.\n\nThank you for your business!\n\nSincerely,\nThe MoonFlowPro Team\n\nExample for Primary Reminder Reason: "Warranty expires on YYYY-MM-DD"\nSubject: Important: Your {{{productName}}} Warranty is Ending Soon (ID: {{{productId}}})\nBody:\nDear {{{customerName}}},\n\nThis is an important reminder that the warranty for your {{{productName}}} (ID: {{{productId}}}), purchased on {{{purchaseDate}}}, will be expiring soon on {{{warrantyEndDate}}}.\n\nWe recommend reviewing your product's condition before the warranty expires. If you have any questions or require assistance, please do not hesitate to contact us.\n\nThank you for choosing MoonFlowPro.\n\nSincerely,\nThe MoonFlowPro Team\n\nExample for Primary Reminder Reason: "Next service is due on YYYY-MM-DD"\nSubject: Service Reminder: Your {{{productName}}} (ID: {{{productId}}}) is Due for Service\nBody:\nDear {{{customerName}}},\n\nThis is a friendly reminder that your {{{productName}}} (ID: {{{productId}}}) is due for its next service on {{{nextServiceDate}}}. Regular servicing helps maintain the optimal performance and longevity of your product.\n\nPlease contact us at your earliest convenience to schedule your service appointment.\n\nThank you,\nThe MoonFlowPro Team\n\nExample for Primary Reminder Reason: "General check-in"\nSubject: Checking In: Your {{{productName}}} from MoonFlowPro (ID: {{{productId}}})\nBody:\nDear {{{customerName}}},\n\nWe hope you are continuing to enjoy your {{{productName}}} (ID: {{{productId}}}) which you purchased on {{{purchaseDate}}}.\n\nWe are committed to ensuring your satisfaction and are always here to assist if you have any questions or require support.\n\nThank you for choosing MoonFlowPro.\n\nSincerely,\nThe MoonFlowPro Team`,
});

const generateAutomatedRemindersFlow = ai.defineFlow(
  {
    name: 'generateAutomatedRemindersFlow',
    inputSchema: GenerateReminderInputSchema,
    outputSchema: GenerateReminderOutputSchema,
  },
  async (input) => {
    const today = new Date(input.currentDate);
    let primaryReminderReason = 'General check-in';

    const getDaysDifference = (dateString: string | undefined): number | null => {
      if (!dateString) return null;
      // Ensure date is parsed in UTC to avoid timezone issues when calculating days difference
      const targetDate = new Date(dateString + 'T00:00:00Z'); // Assuming input dates are YYYY-MM-DD in local time, convert to UTC start of day
      const todayUtc = new Date(input.currentDate + 'T00:00:00Z');
      const diffTime = targetDate.getTime() - todayUtc.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days difference, positive if future, negative if past
    };

    const paymentDiff = getDaysDifference(input.paymentDueDate);
    const warrantyDiff = getDaysDifference(input.warrantyEndDate);
    const serviceDiff = getDaysDifference(input.nextServiceDate);

    // Prioritization logic: Payment (highest) > Warranty > Service > General
    if (paymentDiff !== null && (paymentDiff <= 7 && paymentDiff >= -30)) { // Payment due within 7 days or up to 30 days past due
        primaryReminderReason = `Payment for ${input.productName} (ID: ${input.productId}) is due on ${input.paymentDueDate}`;
    } else if (warrantyDiff !== null && (warrantyDiff <= 30 && warrantyDiff >= -14)) { // Warranty expiring within 30 days or up to 14 days past due
        primaryReminderReason = `Warranty for ${input.productName} (ID: ${input.productId}) expires on ${input.warrantyEndDate}`;
    } else if (serviceDiff !== null && (serviceDiff <= 14 && serviceDiff >= -30)) { // Service due within 14 days or up to 30 days past due
        primaryReminderReason = `Next service for ${input.productName} (ID: ${input.productId}) is due on ${input.nextServiceDate}`;
    }

    const promptInput: PromptInput = {
      ...input,
      primaryReminderReason,
    };

    const { output } = await generateReminderPrompt(promptInput);
    return output!;
  }
);
