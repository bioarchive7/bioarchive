/**
 * NextAuth.js Authentication Configuration
 * Enables OAuth 2.0 with Google for BioArchive
 * 
 * Users login with their Google account, allowing the app to upload files
 * to their personal Google Drive using OAuth delegation.
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: 'openid profile email https://www.googleapis.com/auth/drive',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Store OAuth token in session so we can use it for Drive API calls
     */
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    /**
     * Pass token to session so client can use it if needed
     */
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.email = token.email as string;
      return session;
    },
  },
  pages: {
    signIn: '/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
