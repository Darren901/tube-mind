# Summary List Thumbnails Design
Date: 2026-01-20

## Overview
Add video thumbnails to the summary list items in the dashboard to improve visual recognition and user experience.

## Implementation Details

### File
`app/(dashboard)/summaries/page.tsx`

### Logic
- **Data Source**: Use `summary.video.thumbnail` from the database.
- **Fallback**: If the database thumbnail is null/empty, derive the URL from the YouTube ID: `https://i.ytimg.com/vi/${summary.video.youtubeId}/mqdefault.jpg`.

### UI/Layout
- **Container**: Transform the inner content of the summary card into a flex container (`flex flex-col md:flex-row`).
- **Left Column (Thumbnail)**:
  - Width: Full width on mobile, fixed width (`w-48`) on desktop.
  - Aspect Ratio: `aspect-video` (16:9).
  - Styling: Rounded corners (`rounded-md`), `object-cover`.
  - Component: `next/image` with `fill` prop for responsive sizing.
- **Right Column (Content)**:
  - Flex grow (`flex-1`) to take remaining space.
  - Contains: Title, Channel Name, Status Badge, External Link.

### Configuration
- `next.config.js` is already configured for `i.ytimg.com`.

### Code Structure Plan
```tsx
{summaries.map((summary) => {
  const thumbnailUrl = summary.video.thumbnail || 
    `https://i.ytimg.com/vi/${summary.video.youtubeId}/mqdefault.jpg`;

  return (
    <div key={summary.id} className="...">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Thumbnail */}
        <div className="relative w-full md:w-48 aspect-video flex-shrink-0">
          <Image ... />
        </div>
        
        {/* Content */}
        <div className="flex-1">
           {/* Existing Content */}
        </div>
      </div>
    </div>
  )
})}
```
