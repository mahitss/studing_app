import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
          const avatarUrl = profile.image || (profile as any).picture || (profile as any).avatar_url || "";
          
          const res = await fetch(`${apiBaseUrl}/auth/oauth`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-oauth-internal-secret": process.env.OAUTH_INTERNAL_SECRET || "",
            },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name || (profile as any).name || (profile as any).login || "Focused Student",
              avatar: avatarUrl,
              provider: account.provider,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            token.backendUser = {
              id: data.user._id,
              token: data.token,
              refreshToken: data.refreshToken,
              name: data.user.name,
              email: data.user.email,
              avatar: data.user.avatar || data.user.profilePicture || "",
            };
          } else {
            console.error("OAuth backend validation failed:", await res.text());
          }
        } catch (err) {
          console.error("Error calling backend oauth endpoint in NextAuth callback:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.backendUser) {
        (session as any).backendUser = token.backendUser;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
