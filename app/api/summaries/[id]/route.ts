import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
  })

  if (!summary) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
  }

  return NextResponse.json(summary)
}
