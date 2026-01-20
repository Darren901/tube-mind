import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { notionParentPageId } = body

    if (typeof notionParentPageId !== 'string') {
      return NextResponse.json({ error: 'Invalid notionParentPageId' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { notionParentPageId },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        notionParentPageId: updatedUser.notionParentPageId,
      },
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
