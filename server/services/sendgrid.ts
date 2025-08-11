import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || "",
      html: params.html || "",
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendTaskNotification(
  userEmail: string, 
  taskTitle: string, 
  dueDate: Date,
  isOverdue: boolean = false
): Promise<boolean> {
  const subject = isOverdue 
    ? `Forfall: ${taskTitle}` 
    : `Påminnelse: ${taskTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${isOverdue ? '#dc2626' : '#2563EB'};">
        ${isOverdue ? 'Oppgave forfalt!' : 'Oppgavepåminnelse'}
      </h2>
      <p>Du har en oppgave som ${isOverdue ? 'er forfalt' : 'nærmer seg frist'}:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0;">${taskTitle}</h3>
        <p style="margin: 10px 0 0 0; color: #6b7280;">
          Frist: ${dueDate.toLocaleDateString('nb-NO')}
        </p>
      </div>
      <p>Logg inn på RegnskapsAI for å se detaljer og oppdatere status.</p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@regnskapsai.no',
    subject,
    html,
  });
}

export async function sendWelcomeEmail(userEmail: string, userName: string, tenantName: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563EB;">Velkommen til RegnskapsAI!</h2>
      <p>Hei ${userName},</p>
      <p>Velkommen til ${tenantName} sin RegnskapsAI-konto. Du kan nå begynne å bruke systemet for regnskapsføring og klienthåndtering.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0;">Kom i gang:</h3>
        <ul style="margin: 10px 0;">
          <li>Utforsk dashbordet for oversikt over oppgaver og klienter</li>
          <li>Prøv AI-assistenten for automatisk dokumentkategorisering</li>
          <li>Legg til dine første klienter</li>
        </ul>
      </div>
      <p>Vi ønsker deg lykke til med RegnskapsAI!</p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@regnskapsai.no',
    subject: 'Velkommen til RegnskapsAI',
    html,
  });
}

export async function sendSubscriptionNotification(
  userEmail: string, 
  tenantName: string, 
  expiryDate: Date
): Promise<boolean> {
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Abonnement utløper snart</h2>
      <p>Abonnementet for ${tenantName} utløper om ${daysUntilExpiry} dager.</p>
      <p>Forny abonnementet for å fortsette å bruke RegnskapsAI uten avbrudd.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/subscriptions" 
           style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Forny abonnement
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@regnskapsai.no',
    subject: `Abonnement utløper snart - ${tenantName}`,
    html,
  });
}
