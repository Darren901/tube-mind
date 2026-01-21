import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: {
      summaryTags: {
        some: {
          isConfirmed: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          summaryTags: {
            where: {
              isConfirmed: true,
            },
          },
        },
      },
    },
  })

  // Prisma doesn't support ordering by filtered relation count directly, so we sort in memory
  tags.sort((a, b) => b._count.summaryTags - a._count.summaryTags)

  return NextResponse.json(tags)
}
