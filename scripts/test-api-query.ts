const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Simulating API Query ---')
  
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

  console.log('API would return:', JSON.stringify(tags, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
