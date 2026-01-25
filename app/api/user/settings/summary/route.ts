import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { summaryPreferencesSchema } from '@/lib/validators/settings'

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    // 使用 Zod schema 驗證輸入
    const validated = summaryPreferencesSchema.parse(body)

    // 更新使用者資料
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        summaryTone: validated.summaryTone,
        summaryToneCustom: validated.summaryToneCustom,
        summaryDetail: validated.summaryDetail,
        ttsVoice: validated.ttsVoice,
      },
      select: {
        summaryTone: true,
        summaryToneCustom: true,
        summaryDetail: true,
        ttsVoice: true,
      },
    })

    return NextResponse.json({
      success: true,
      preferences: updatedUser,
    })
  } catch (error: any) {
    console.error('Error updating summary preferences:', error)
    // console.log('Error name:', error.name)
    // console.log('Error details:', JSON.stringify(error.errors, null, 2))
    
    // 處理 Zod 驗證錯誤
    if (error.name === 'ZodError') {
      // console.log('ZodError errors:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors || error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
