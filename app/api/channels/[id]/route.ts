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

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      videos: {
        orderBy: { publishedAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  return NextResponse.json(channel)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { autoRefresh, autoSyncNotion } = await request.json()

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  if (autoSyncNotion === true) {
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'notion',
      },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notionParentPageId: true },
    })

    if (!account || !user?.notionParentPageId) {
      return NextResponse.json(
        { error: 'Notion not connected or Parent Page not set' },
        { status: 400 }
      )
    }
  }

  const data: { autoRefresh?: boolean; autoSyncNotion?: boolean } = {}
  if (autoRefresh !== undefined) data.autoRefresh = autoRefresh
  if (autoSyncNotion !== undefined) data.autoSyncNotion = autoSyncNotion

  const updatedChannel = await prisma.channel.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updatedChannel)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  await prisma.channel.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
