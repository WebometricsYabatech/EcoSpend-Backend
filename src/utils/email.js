import { BrevoClient } from '@getbrevo/brevo'

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
})

// ======================================================
// BREVO CONFIG
// ======================================================

const sender = {
  name: process.env.BREVO_SENDER_NAME || 'EcoSpend',
  email: process.env.BREVO_SENDER_EMAIL
}

// ======================================================
// GENERIC SEND EMAIL FUNCTION
// ======================================================

export const sendEmail = async ({
  to,
  subject,
  htmlContent
}) => {
  console.log('EMAIL TO:', to)
  console.log('EMAIL TO TYPE:', typeof to)

  // Prevent confusing Brevo errors
  if (!to || typeof to !== 'string') {
    throw new Error(`Invalid recipient email: ${to}`)
  }

  if (!sender.email) {
    throw new Error('BREVO_SENDER_EMAIL is not configured')
  }

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: sender.name,
        email: sender.email
      },

      // IMPORTANT:
      // Do NOT hardcode the email here.
      // Use the recipient passed into sendEmail().
      to: [
        {
          email: to
        }
      ],

      subject,
      htmlContent
    })

    console.log('EMAIL SENT:', result)

    return result
  } catch (error) {
    console.error('BREVO ERROR:', error)

    throw error
  }
}

// ======================================================
// GET USER DISPLAY NAME
// ======================================================

const getUserName = (user) => {
  return (
    user?.fullname ||
    user?.fullName ||
    user?.name ||
    user?.firstName ||
    'there'
  )
}

// ======================================================
// WELCOME EMAIL
// ======================================================

export const sendWelcomeEmail = async (user) => {
  console.log('WELCOME USER:', user)
  console.log('WELCOME EMAIL:', user?.email)
  console.log('WELCOME NAME:', getUserName(user))

  const name = getUserName(user)

  await sendEmail({
    to: user.email,

    subject: 'Welcome to EcoSpend 🌱',

    htmlContent: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
      ">

        <!-- Header -->
        <div style="
          background: #1A7F64;
          padding: 30px;
          text-align: center;
        ">
          <h1 style="
            color: white;
            margin: 0;
          ">
            Welcome to EcoSpend 🌱
          </h1>
        </div>

        <!-- Body -->
        <div style="
          padding: 30px;
          background: #f9f9f9;
        ">

          <h2 style="color: #1F3864;">
            Hi ${name}!
          </h2>

          <p style="
            color: #444;
            line-height: 1.6;
          ">
            Your account has been created successfully.
            We're excited to have you on board!
          </p>

          <p style="
            color: #444;
            line-height: 1.6;
          ">
            With EcoSpend you can:
          </p>

          <ul style="
            color: #444;
            line-height: 1.8;
          ">
            <li>📸 Scan receipts with AI and track your spending</li>
            <li>🌱 Monitor your sustainability score</li>
            <li>💰 Set budgets and get alerts</li>
            <li>📊 View detailed spending analytics</li>
          </ul>

          <!-- Button -->
          <div style="
            text-align: center;
            margin-top: 30px;
          ">
            <a
              href="${process.env.FRONTEND_URL || '#'}"
              style="
                background: #1A7F64;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                display: inline-block;
              "
            >
              Get Started
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="
          padding: 20px;
          text-align: center;
          color: #999;
          font-size: 12px;
        ">
          © 2026 EcoSpend. Sustainable Finance.
        </div>

      </div>
    `
  })
}

// ======================================================
// BUDGET ALERT EMAIL
// ======================================================

export const sendBudgetAlertEmail = async (
  user,
  totalSpent,
  budget
) => {

  console.log('BUDGET ALERT USER:', user)
  console.log('BUDGET ALERT EMAIL:', user?.email)
  console.log('BUDGET ALERT NAME:', getUserName(user))

  if (!user?.email) {
    throw new Error('User email is missing')
  }

  if (!budget || budget <= 0) {
    console.log('No valid budget found. Skipping budget email.')
    return
  }

  const name = getUserName(user)

  const percentage = Math.round(
    (totalSpent / budget) * 100
  )

  const isExceeded = totalSpent > budget

  await sendEmail({

    to: user.email,

    subject: isExceeded
      ? '⚠️ Budget Exceeded — EcoSpend Alert'
      : '⚠️ Budget Warning — EcoSpend Alert',

    htmlContent: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
      ">

        <!-- Header -->
        <div style="
          background: ${isExceeded ? '#c0392b' : '#e67e22'};
          padding: 30px;
          text-align: center;
        ">

          <h1 style="
            color: white;
            margin: 0;
          ">
            ${
              isExceeded
                ? '⚠️ Budget Exceeded'
                : '⚠️ Budget Warning'
            }
          </h1>

        </div>

        <!-- Body -->
        <div style="
          padding: 30px;
          background: #f9f9f9;
        ">

          <h2 style="color: #1F3864;">
            Hi ${name},
          </h2>

          <p style="
            color: #444;
            line-height: 1.6;
          ">
            ${
              isExceeded
                ? `You have exceeded your monthly budget. Here's a summary:`
                : `You have used ${percentage}% of your monthly budget. Here's a summary:`
            }
          </p>

          <!-- Summary -->
          <div style="
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          ">

            <p style="
              margin: 8px 0;
              color: #444;
            ">
              💰 <strong>Monthly Budget:</strong>
              ₦${Number(budget).toLocaleString()}
            </p>

            <p style="
              margin: 8px 0;
              color: #444;
            ">
              📊 <strong>Total Spent:</strong>
              ₦${Number(totalSpent).toLocaleString()}
            </p>

            <p style="
              margin: 8px 0;
              color: ${isExceeded ? '#c0392b' : '#e67e22'};
            ">
              📈 <strong>Percentage Used:</strong>
              ${percentage}%
            </p>

          </div>

          <p style="
            color: #444;
            line-height: 1.6;
          ">
            ${
              isExceeded
                ? 'Consider reviewing your spending to stay on track next month.'
                : 'You are close to your limit. Consider slowing down your spending for the rest of the month.'
            }
          </p>

          <!-- Button -->
          <div style="
            text-align: center;
            margin-top: 30px;
          ">

            <a
              href="${process.env.FRONTEND_URL || '#'}/dashboard"
              style="
                background: #1A7F64;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                display: inline-block;
              "
            >
              View Dashboard
            </a>

          </div>

        </div>

        <!-- Footer -->
        <div style="
          padding: 20px;
          text-align: center;
          color: #999;
          font-size: 12px;
        ">
          © 2026 EcoSpend. Sustainable Finance.
        </div>

      </div>
    `
  })
}