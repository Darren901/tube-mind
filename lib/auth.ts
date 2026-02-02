import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import type { Adapter } from "next-auth/adapters"
import type { OAuthConfig } from "next-auth/providers/oauth"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/youtube.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    CustomNotionProvider({
      clientId: process.env.NOTION_CLIENT_ID!,
      clientSecret: process.env.NOTION_CLIENT_SECRET!,
      redirectUri: process.env.NOTION_REDIRECT_URI!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 1. 初次登入，設定 token 資訊
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0
        return token
      }

      // 2. 檢查 token 是否存在以及過期時間
      if (!token.accessTokenExpires) {
        return token
      }

      // 3. Token 還沒過期
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // 4. Token 過期，刷新它
      console.log('Token expired, refreshing...')
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.error = token.error as string | undefined
      if (session.user) {
        // @ts-ignore
        session.user.id = token.sub
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth/signin',
  },
}

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

function CustomNotionProvider(options: {
  clientId: string
  clientSecret: string
  redirectUri: string
}): OAuthConfig<any> {
  return {
    id: 'notion',
    name: 'Notion',
    type: 'oauth',
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: 'https://api.notion.com/v1/oauth/authorize',
      params: {
        response_type: 'code',
        owner: 'user',
        redirect_uri: options.redirectUri,
      },
    },
    token: {
      url: 'https://api.notion.com/v1/oauth/token',
    },
    userinfo: {
      url: 'https://api.notion.com/v1/users/me',
      async request({ tokens }: any) {
        const response = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Notion-Version': '2022-06-28',
          },
        })
        if (!response.ok) {
          throw new Error(`Notion user info failed: ${response.statusText}`)
        }
        return await response.json()
      },
    },
    profile(profile: any) {
      return {
        id: profile.id,
        name: profile.name,
        // 如果 email 不存在或為空，使用假的 placeholder email 以避免與其他 provider 衝突，並允許連結
        email: profile.person?.email || `${profile.id}@notion.placeholder`,
        image: profile.avatar_url,
      }
    },
    options,
    allowDangerousEmailAccountLinking: true,
  }
}
