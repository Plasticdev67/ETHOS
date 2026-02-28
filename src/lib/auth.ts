import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    // Microsoft Entra ID (Azure AD) — for SSO with Microsoft Authenticator
    // To enable: register an app in Azure portal and set env vars
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          MicrosoftEntraID({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID!}/v2.0`,
          }),
        ]
      : []),

    // Email/password fallback — works immediately with existing users
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("[AUTH] authorize called, email:", credentials?.email)
          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] Missing email or password")
            return null
          }

          console.log("[AUTH] Looking up user in database...")
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          })
          console.log("[AUTH] User found:", !!user)

          if (!user || !user.passwordHash) return null

          const isValid = await compare(
            credentials.password as string,
            user.passwordHash
          )
          console.log("[AUTH] Password valid:", isValid)

          if (!isValid) return null

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
          }
        } catch (err) {
          console.error("[AUTH] authorize error:", err)
          throw err
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On first sign-in, add user info to token
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role || "STAFF"
        token.department = (user as { department?: string | null }).department || null
      }

      // For Microsoft SSO — match or create user in our database
      if (account?.provider === "microsoft-entra-id" && user?.email) {
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!dbUser) {
          // Auto-create user from Microsoft account
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email.split("@")[0],
              passwordHash: "", // No password needed for SSO
              role: "STAFF", // Default role — admin can upgrade
            },
          })
        }

        token.id = dbUser.id
        token.role = dbUser.role
        token.department = dbUser.department
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { department?: string | null }).department = (token.department as string | null) || null
      }
      return session
    },
  },
})
