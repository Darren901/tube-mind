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

  // Verify ownership
  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!summary) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
  }

  const tags = await prisma.summaryTag.findMany({
    where: {
      summaryId: params.id,
    },
    include: {
      tag: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return NextResponse.json(tags)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
  }

  // Verify ownership
  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!summary) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
  }

  // Upsert Tag
  const tag = await prisma.tag.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  })

  // Create or Update SummaryTag association
  const summaryTag = await prisma.summaryTag.upsert({
    where: {
      summaryId_tagId: {
        summaryId: params.id,
        tagId: tag.id,
      },
    },
    update: {
      isConfirmed: true,
      createdBy: 'USER',
    },
    create: {
      summaryId: params.id,
      tagId: tag.id,
      isConfirmed: true,
      createdBy: 'USER',
    },
    include: {
      tag: true,
    },
  })

  return NextResponse.json(summaryTag)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tagId = searchParams.get('tagId')

  if (!tagId) {
    return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  
  const { isConfirmed } = body

  if (typeof isConfirmed !== 'boolean') {
    return NextResponse.json({ error: 'isConfirmed must be a boolean' }, { status: 400 })
  }

  // Verify ownership
  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!summary) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
  }

  try {
    const summaryTag = await prisma.summaryTag.update({
      where: {
        summaryId_tagId: {
          summaryId: params.id,
          tagId: tagId,
        },
      },
      data: {
        isConfirmed,
      },
      include: {
        tag: true,
      },
    })
    return NextResponse.json(summaryTag)
  } catch (error) {
    return NextResponse.json({ error: 'Tag not found on this summary' }, { status: 404 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tagId = searchParams.get('tagId')

  if (!tagId) {
    return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
  }

  // Verify ownership
  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!summary) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
  }

  try {
    await prisma.summaryTag.delete({
      where: {
        summaryId_tagId: {
          summaryId: params.id,
          tagId: tagId,
        },
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Tag not found on this summary' }, { status: 404 })
  }
}
