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

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: {
      channel: true,
      summaries: {
        where: { userId: session.user.id },
      },
    },
  })

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  return NextResponse.json(video)
}
