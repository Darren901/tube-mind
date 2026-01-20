---
feature: "Notion Integration"
spec: |
  Implement full-stack Notion integration allowing users to link their Notion account and export video summaries to a specific Notion page.
---

## Task List

### Feature 1: Database
Description: DB Schema Update
- [ ] 1.01 Update prisma/schema.prisma to add notionParentPageId to User model, generate client, and create migration.

### Feature 2: Backend Service
Description: Notion API Client & Service
- [ ] 2.01 Create lib/notion/types.ts, lib/notion/client.ts, and lib/notion/service.ts to handle Notion API interactions.

### Feature 3: Auth
Description: NextAuth Configuration
- [ ] 3.01 Configure NotionProvider in lib/auth.ts and ensure token storage strategy.

### Feature 4: Settings
Description: Settings API & UI
- [ ] 4.01 Create API route for settings and UI components to connect Notion and set parent page ID.

### Feature 5: API
Description: Export Action API
- [ ] 5.01 Implement the export endpoint at app/api/summaries/[id]/export/notion/route.ts.

### Feature 6: Frontend
Description: Frontend Export Button
- [ ] 6.01 Add export button to summary page and integrate with the export API.
