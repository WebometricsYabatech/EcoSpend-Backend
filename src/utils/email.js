import { BrevoClient } from '@getbrevo/brevo'

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
})

const sender = {
  name: process.env.BREVO_SENDER_NAME || 'EcoSpend',
  email: process.env.BREVO_SENDER_EMAIL
}

export const sendEmail = async ({ to, subject, htmlContent }) => {
  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent
    })

    console.log(`Email sent to ${to}`, result.messageId)
    return result
  } catch (error) {
    console.error('Email send error:', error.message)
    throw error
  }
}

// ── Welcome email ──
export const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Welcome to EcoSpend 🌱',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A7F64; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to EcoSpend 🌱</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F3864;">Hi ${user.fullname}!</h2>
          <p style="color: #444; line-height: 1.6;">
            Your account has been created successfully. We're excited to have you on board!
          </p>
          <p style="color: #444; line-height: 1.6;">
            With EcoSpend you can:
          </p>
          <ul style="color: #444; line-height: 1.8;">
            <li>📸 Scan receipts with AI and track your spending</li>
            <li>🌱 Monitor your sustainability score</li>
            <li>💰 Set budgets and get alerts</li>
            <li>📊 View detailed spending analytics</li>
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: #1A7F64; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Get Started
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
          © 2026 EcoSpend. Sustainable Finance.
        </div>
      </div>
    `
  })
}

// ── Budget alert email ──
export const sendBudgetAlertEmail = async (user, totalSpent, budget) => {
  const percentage = Math.round((totalSpent / budget) * 100)
  const isExceeded = totalSpent > budget

  await sendEmail({
    to: user.email,
    subject: isExceeded
      ? '⚠️ Budget Exceeded — EcoSpend Alert'
      : '⚠️ Budget Warning — EcoSpend Alert',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${isExceeded ? '#c0392b' : '#e67e22'}; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">
            ${isExceeded ? '⚠️ Budget Exceeded' : '⚠️ Budget Warning'}
          </h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F3864;">Hi ${user.fullname},</h2>
          <p style="color: #444; line-height: 1.6;">
            ${isExceeded
              ? `You have exceeded your monthly budget. Here's a summary:`
              : `You have used ${percentage}% of your monthly budget. Here's a summary:`
            }
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0; color: #444;">
              💰 <strong>Monthly Budget:</strong> ₦${budget.toLocaleString()}
            </p>
            <p style="margin: 8px 0; color: #444;">
              📊 <strong>Total Spent:</strong> ₦${totalSpent.toLocaleString()}
            </p>
            <p style="margin: 8px 0; color: ${isExceeded ? '#c0392b' : '#e67e22'};">
              📈 <strong>Percentage Used:</strong> ${percentage}%
            </p>
          </div>
          <p style="color: #444; line-height: 1.6;">
            ${isExceeded
              ? 'Consider reviewing your spending to stay on track next month.'
              : 'You are close to your limit. Consider slowing down your spending for the rest of the month.'
            }
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #1A7F64; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Dashboard
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
          © 2026 EcoSpend. Sustainable Finance.
        </div>
      </div>
    `
  })
}