import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import prisma from '../lib/prisma.js'

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value
    const fullname = profile.displayName
    const avatarUrl = profile.photos[0]?.value || null

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // Update avatar if not set
      if (!user.avatarUrl && avatarUrl) {
        user = await prisma.user.update({
          where: { email },
          data: { avatarUrl }
        })
      }
      return done(null, user)
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        fullname,
        email,
        password: 'GOOGLE_OAUTH',
        avatarUrl
      }
    })

    // Send welcome email
    const { sendWelcomeEmail } = await import('../utils/email.js')
    await sendWelcomeEmail(user)

    return done(null, user)
  } catch (error) {
    return done(error, null)
  }
}))

export default passport