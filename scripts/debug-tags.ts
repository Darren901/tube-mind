const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Debugging Tags ---')
  
  // 1. Check all tags
  const tags = await prisma.tag.findMany({
    include: {
      summaryTags: true
    }
  })

  console.log(`Total Tags: ${tags.length}`)
  
  for (const tag of tags) {
    console.log(`Tag: [${tag.name}]`)
    const confirmedCount = tag.summaryTags.filter((st: any) => st.isConfirmed).length
    const unconfirmedCount = tag.summaryTags.filter((st: any) => !st.isConfirmed).length
    console.log(`  - Confirmed Links: ${confirmedCount}`)
    console.log(`  - Unconfirmed Links: ${unconfirmedCount}`)
    
    // Check if API would return it
    if (confirmedCount > 0) {
      console.log(`  => SHOULD appear in Filter Bar`)
    } else {
      console.log(`  => SHOULD NOT appear in Filter Bar`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
