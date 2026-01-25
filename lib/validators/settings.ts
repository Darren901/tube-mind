import { z } from 'zod'

const BANNED_KEYWORDS = [
  'ignore',
  'system',
  'prompt',
  'instruction',
  'override',
  'bypass',
  'admin',
  'role',
]

export const summaryPreferencesSchema = z.object({
  summaryTone: z.enum(['professional', 'casual', 'concise', 'detailed', 'custom']),
  summaryToneCustom: z
    .string()
    .max(50, '最多 50 字')
    .regex(/^[^<>{}[\]]*$/, '不可包含特殊符號')
    .refine(
      (val) => {
        if (!val) return true
        return !BANNED_KEYWORDS.some((keyword) =>
          val.toLowerCase().includes(keyword)
        )
      },
      { message: '包含不允許的關鍵字' }
    )
    .optional()
    .nullable(),
  summaryDetail: z.enum(['brief', 'standard', 'comprehensive']),
  ttsVoice: z.enum(['male', 'female']),
})

export type SummaryPreferences = z.infer<typeof summaryPreferencesSchema>
