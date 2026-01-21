import { describe, it, expect, vi, beforeEach } from 'vitest'
import { YouTubeClient, getVideoTranscript } from '@/lib/youtube/client'

// Mock googleapis with factory function
vi.mock('googleapis', () => {
  const mockOAuth2Instance = {
    setCredentials: vi.fn(),
  }
  
  // 使用 class 作為構造函數的 Mock
  class MockOAuth2 {
    setCredentials = mockOAuth2Instance.setCredentials
  }
  
  const mockYoutubeApiFn = vi.fn()
  
  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
      youtube: mockYoutubeApiFn,
    },
    __mockOAuth2Instance: mockOAuth2Instance,
    __MockOAuth2: MockOAuth2,
    __mockYoutubeApiFn: mockYoutubeApiFn,
  }
})

// Mock youtube-transcript-plus
vi.mock('youtube-transcript-plus')

describe('YouTubeClient', () => {
  let mockYoutubeApi: any
  let client: YouTubeClient
  let mockHelpers: any

  beforeEach(async () => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 取得 mock helpers
    const googleapis = await import('googleapis')
    mockHelpers = googleapis as any

    // 建立 mock YouTube API
    mockYoutubeApi = {
      subscriptions: {
        list: vi.fn(),
      },
      channels: {
        list: vi.fn(),
      },
      search: {
        list: vi.fn(),
      },
      videos: {
        list: vi.fn(),
      },
    }

    // 設定 Mock 返回值
    mockHelpers.__mockYoutubeApiFn.mockReturnValue(mockYoutubeApi)

    // 建立測試客戶端
    client = new YouTubeClient('test_access_token')
  })

  describe('Constructor', () => {
    it('應該正確初始化 YouTube API 客戶端', () => {
      expect(mockHelpers.__mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({
        access_token: 'test_access_token',
      })
      expect(mockHelpers.__mockYoutubeApiFn).toHaveBeenCalledWith({
        version: 'v3',
        auth: expect.any(mockHelpers.__MockOAuth2),
      })
    })
  })

  describe('getSubscriptions()', () => {
    it('應該成功取得單頁訂閱列表', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                resourceId: { channelId: 'channel1' },
                title: 'Channel 1',
                description: 'Description 1',
                thumbnails: { high: { url: 'http://thumbnail1.jpg' } },
              },
            },
          ],
          nextPageToken: undefined,
        },
      }

      mockYoutubeApi.subscriptions.list.mockResolvedValue(mockResponse)

      const result = await client.getSubscriptions()

      expect(result).toEqual([
        {
          id: 'channel1',
          title: 'Channel 1',
          description: 'Description 1',
          thumbnail: 'http://thumbnail1.jpg',
        },
      ])
      expect(mockYoutubeApi.subscriptions.list).toHaveBeenCalledTimes(1)
    })

    it('應該成功處理多頁訂閱列表 (分頁)', async () => {
      const page1 = {
        data: {
          items: [
            {
              snippet: {
                resourceId: { channelId: 'channel1' },
                title: 'Channel 1',
                description: 'Desc 1',
                thumbnails: { high: { url: 'http://thumb1.jpg' } },
              },
            },
            {
              snippet: {
                resourceId: { channelId: 'channel2' },
                title: 'Channel 2',
                description: 'Desc 2',
                thumbnails: { high: { url: 'http://thumb2.jpg' } },
              },
            },
          ],
          nextPageToken: 'token123',
        },
      }

      const page2 = {
        data: {
          items: [
            {
              snippet: {
                resourceId: { channelId: 'channel3' },
                title: 'Channel 3',
                description: 'Desc 3',
                thumbnails: { high: { url: 'http://thumb3.jpg' } },
              },
            },
            {
              snippet: {
                resourceId: { channelId: 'channel4' },
                title: 'Channel 4',
                description: 'Desc 4',
                thumbnails: { high: { url: 'http://thumb4.jpg' } },
              },
            },
          ],
          nextPageToken: undefined,
        },
      }

      mockYoutubeApi.subscriptions.list
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2)

      const result = await client.getSubscriptions()

      expect(result).toHaveLength(4)
      expect(result[0].id).toBe('channel1')
      expect(result[3].id).toBe('channel4')
      expect(mockYoutubeApi.subscriptions.list).toHaveBeenCalledTimes(2)
      expect(mockYoutubeApi.subscriptions.list).toHaveBeenNthCalledWith(2, {
        part: ['snippet'],
        mine: true,
        maxResults: 50,
        pageToken: 'token123',
      })
    })

    it('應該處理訂閱列表為空的情況', async () => {
      mockYoutubeApi.subscriptions.list.mockResolvedValue({
        data: {
          items: [],
          nextPageToken: undefined,
        },
      })

      const result = await client.getSubscriptions()

      expect(result).toEqual([])
    })

    it('應該處理缺少 snippet 資料的項目', async () => {
      mockYoutubeApi.subscriptions.list.mockResolvedValue({
        data: {
          items: [
            { snippet: null },
            { snippet: { resourceId: null, title: null } },
          ],
          nextPageToken: undefined,
        },
      })

      const result = await client.getSubscriptions()

      expect(result).toEqual([
        { id: '', title: '', description: undefined, thumbnail: undefined },
        { id: '', title: '', description: undefined, thumbnail: undefined },
      ])
    })

    it('應該在 YouTube API 呼叫失敗時拋出錯誤', async () => {
      mockYoutubeApi.subscriptions.list.mockRejectedValue(
        new Error('Quota exceeded')
      )

      await expect(client.getSubscriptions()).rejects.toThrow('Quota exceeded')
    })
  })

  describe('getChannelDetails()', () => {
    it('應該成功取得頻道詳細資訊', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: 'UCxxxxxx',
              snippet: {
                title: 'Test Channel',
                description: 'A test channel',
                thumbnails: { high: { url: 'http://thumbnail.jpg' } },
              },
            },
          ],
        },
      }

      mockYoutubeApi.channels.list.mockResolvedValue(mockResponse)

      const result = await client.getChannelDetails('UCxxxxxx')

      expect(result).toEqual({
        id: 'UCxxxxxx',
        title: 'Test Channel',
        description: 'A test channel',
        thumbnail: 'http://thumbnail.jpg',
      })
    })

    it('應該在頻道不存在時返回 null', async () => {
      mockYoutubeApi.channels.list.mockResolvedValue({
        data: { items: [] },
      })

      const result = await client.getChannelDetails('invalid_id')

      expect(result).toBeNull()
    })

    it('應該處理頻道資料不完整的情況', async () => {
      mockYoutubeApi.channels.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'UCxxxxxx',
              snippet: {
                title: '',
                description: undefined,
                thumbnails: {},
              },
            },
          ],
        },
      })

      const result = await client.getChannelDetails('UCxxxxxx')

      expect(result).toEqual({
        id: 'UCxxxxxx',
        title: '',
        description: undefined,
        thumbnail: undefined,
      })
    })
  })

  describe('getChannelVideos()', () => {
    it('應該成功取得頻道影片列表', async () => {
      const searchResponse = {
        data: {
          items: [
            { id: { videoId: 'video1' } },
            { id: { videoId: 'video2' } },
          ],
        },
      }

      const videosResponse = {
        data: {
          items: [
            {
              id: 'video1',
              snippet: {
                title: 'Video 1',
                description: 'Description 1',
                publishedAt: '2024-01-01T00:00:00Z',
                thumbnails: { high: { url: 'http://thumb1.jpg' } },
              },
              contentDetails: { duration: 'PT10M30S' },
            },
            {
              id: 'video2',
              snippet: {
                title: 'Video 2',
                description: 'Description 2',
                publishedAt: '2024-01-02T00:00:00Z',
                thumbnails: { high: { url: 'http://thumb2.jpg' } },
              },
              contentDetails: { duration: 'PT1H15M45S' },
            },
          ],
        },
      }

      mockYoutubeApi.search.list.mockResolvedValue(searchResponse)
      mockYoutubeApi.videos.list.mockResolvedValue(videosResponse)

      const result = await client.getChannelVideos('UCxxxxxx', 10)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'video1',
        title: 'Video 1',
        description: 'Description 1',
        thumbnail: 'http://thumb1.jpg',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
        duration: 630, // 10m30s = 630 秒
      })
      expect(result[1].duration).toBe(4545) // 1h15m45s = 4545 秒
    })

    it('應該在頻道無影片時返回空陣列', async () => {
      mockYoutubeApi.search.list.mockResolvedValue({
        data: { items: [] },
      })

      const result = await client.getChannelVideos('UCxxxxxx')

      expect(result).toEqual([])
      expect(mockYoutubeApi.videos.list).not.toHaveBeenCalled()
    })

    it('應該正確過濾掉非影片項目', async () => {
      const searchResponse = {
        data: {
          items: [
            { id: { videoId: 'video1' } },
            { id: { videoId: null } },
            { id: {} },
          ],
        },
      }

      const videosResponse = {
        data: {
          items: [
            {
              id: 'video1',
              snippet: {
                title: 'Video 1',
                publishedAt: '2024-01-01T00:00:00Z',
              },
              contentDetails: { duration: 'PT5M' },
            },
          ],
        },
      }

      mockYoutubeApi.search.list.mockResolvedValue(searchResponse)
      mockYoutubeApi.videos.list.mockResolvedValue(videosResponse)

      const result = await client.getChannelVideos('UCxxxxxx')

      expect(result).toHaveLength(1)
      expect(mockYoutubeApi.videos.list).toHaveBeenCalledWith({
        part: ['snippet', 'contentDetails'],
        id: ['video1'],
      })
    })

    it('應該在 YouTube Search API 失敗時拋出錯誤', async () => {
      mockYoutubeApi.search.list.mockRejectedValue(
        new Error('Service unavailable')
      )

      await expect(client.getChannelVideos('UCxxxxxx')).rejects.toThrow(
        'Service unavailable'
      )
    })

    it('應該在 YouTube Videos API 失敗時拋出錯誤', async () => {
      mockYoutubeApi.search.list.mockResolvedValue({
        data: {
          items: [{ id: { videoId: 'video1' } }],
        },
      })
      mockYoutubeApi.videos.list.mockRejectedValue(
        new Error('Internal server error')
      )

      await expect(client.getChannelVideos('UCxxxxxx')).rejects.toThrow(
        'Internal server error'
      )
    })
  })

  describe('getVideoDetails()', () => {
    it('應該成功取得影片詳細資訊', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: 'video123',
              snippet: {
                title: 'Test Video',
                description: 'A test video',
                publishedAt: '2024-01-01T00:00:00Z',
                channelId: 'UCxxxxxx',
                thumbnails: { high: { url: 'http://thumb.jpg' } },
              },
              contentDetails: { duration: 'PT1H30M45S' },
            },
          ],
        },
      }

      mockYoutubeApi.videos.list.mockResolvedValue(mockResponse)

      const result = await client.getVideoDetails('video123')

      expect(result).toEqual({
        id: 'video123',
        title: 'Test Video',
        description: 'A test video',
        thumbnail: 'http://thumb.jpg',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
        duration: 5445, // 1h30m45s = 5445 秒
        channelId: 'UCxxxxxx',
      })
    })

    it('應該在影片不存在時返回 null', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: { items: [] },
      })

      const result = await client.getVideoDetails('invalid_video')

      expect(result).toBeNull()
    })

    it('應該處理影片資料不完整的情況', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: {},
              contentDetails: {},
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')

      expect(result).toMatchObject({
        id: 'video123',
        title: '',
        description: undefined,
        thumbnail: undefined,
        duration: 0,
        channelId: undefined,
      })
      // publishedAt 會是 Invalid Date，但仍是 Date 物件
      expect(result?.publishedAt).toBeInstanceOf(Date)
    })
  })

  describe('parseDuration() (透過 getVideoDetails 測試)', () => {
    it('應該解析標準時長 (小時+分鐘+秒)', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: { publishedAt: '2024-01-01T00:00:00Z' },
              contentDetails: { duration: 'PT1H30M45S' },
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')
      expect(result?.duration).toBe(5445)
    })

    it('應該解析只有秒數的時長', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: { publishedAt: '2024-01-01T00:00:00Z' },
              contentDetails: { duration: 'PT45S' },
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')
      expect(result?.duration).toBe(45)
    })

    it('應該解析只有分鐘的時長', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: { publishedAt: '2024-01-01T00:00:00Z' },
              contentDetails: { duration: 'PT15M' },
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')
      expect(result?.duration).toBe(900)
    })

    it('應該解析只有小時的時長', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: { publishedAt: '2024-01-01T00:00:00Z' },
              contentDetails: { duration: 'PT2H' },
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')
      expect(result?.duration).toBe(7200)
    })

    it('應該處理 0 秒時長', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: { publishedAt: '2024-01-01T00:00:00Z' },
              contentDetails: { duration: 'PT0S' },
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')
      expect(result?.duration).toBe(0)
    })

    it('應該處理無效格式並返回 0', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: { publishedAt: '2024-01-01T00:00:00Z' },
              contentDetails: { duration: 'INVALID' },
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')
      expect(result?.duration).toBe(0)
    })

    it('應該處理空字串時長', async () => {
      mockYoutubeApi.videos.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'video123',
              snippet: { publishedAt: '2024-01-01T00:00:00Z' },
              contentDetails: { duration: '' },
            },
          ],
        },
      })

      const result = await client.getVideoDetails('video123')
      expect(result?.duration).toBe(0)
    })
  })
})

describe('getVideoTranscript()', () => {
  let mockFetchTranscript: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { YoutubeTranscript } = await import('youtube-transcript-plus')
    mockFetchTranscript = vi.mocked(YoutubeTranscript.fetchTranscript)
  })

  it('應該成功抓取英文字幕', async () => {
    mockFetchTranscript.mockResolvedValue([
      { offset: 0, text: 'Hello world' },
      { offset: 5000, text: 'Test video' },
    ])

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      { timestamp: 0, text: 'Hello world' },
      { timestamp: 5000, text: 'Test video' },
    ])
    expect(mockFetchTranscript).toHaveBeenCalledWith('video123', { lang: 'en' })
    expect(mockFetchTranscript).toHaveBeenCalledTimes(1)
  })

  it('應該在英文失敗後 fallback 到繁體中文', async () => {
    mockFetchTranscript
      .mockRejectedValueOnce(new Error('No en transcript'))
      .mockResolvedValueOnce([
        { offset: 0, text: '哈囉世界' },
        { offset: 5000, text: '測試影片' },
      ])

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      { timestamp: 0, text: '哈囉世界' },
      { timestamp: 5000, text: '測試影片' },
    ])
    expect(mockFetchTranscript).toHaveBeenCalledTimes(2)
    expect(mockFetchTranscript).toHaveBeenNthCalledWith(1, 'video123', { lang: 'en' })
    expect(mockFetchTranscript).toHaveBeenNthCalledWith(2, 'video123', { lang: 'zh-TW' })
  })

  it('應該在英文、繁中失敗後 fallback 到簡體中文', async () => {
    mockFetchTranscript
      .mockRejectedValueOnce(new Error('No en'))
      .mockRejectedValueOnce(new Error('No zh-TW'))
      .mockResolvedValueOnce([
        { offset: 0, text: '你好世界' },
      ])

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      { timestamp: 0, text: '你好世界' },
    ])
    expect(mockFetchTranscript).toHaveBeenCalledTimes(3)
    expect(mockFetchTranscript).toHaveBeenNthCalledWith(3, 'video123', { lang: 'zh' })
  })

  it('應該在前三個失敗後使用預設語言', async () => {
    mockFetchTranscript
      .mockRejectedValueOnce(new Error('No en'))
      .mockRejectedValueOnce(new Error('No zh-TW'))
      .mockRejectedValueOnce(new Error('No zh'))
      .mockResolvedValueOnce([
        { offset: 0, text: 'Default language' },
      ])

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      { timestamp: 0, text: 'Default language' },
    ])
    expect(mockFetchTranscript).toHaveBeenCalledTimes(4)
    expect(mockFetchTranscript).toHaveBeenNthCalledWith(4, 'video123', undefined)
  })

  it('應該正確解碼 HTML 實體', async () => {
    mockFetchTranscript.mockResolvedValue([
      { offset: 0, text: '&amp;#39;Hello&amp;quot;' },
      { offset: 1000, text: '&amp;lt;test&amp;gt; &amp;amp;' },
    ])

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      { timestamp: 0, text: "'Hello\"" },
      { timestamp: 1000, text: '<test> &' },
    ])
  })

  it('應該在所有語言都失敗時返回 Fallback 字幕', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    mockFetchTranscript.mockRejectedValue(new Error('No transcript'))

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      {
        timestamp: 0,
        text: 'This video does not have available captions or transcripts. Please summarize the video based on its title and description only, noting that detailed content is unavailable.',
      },
    ])
    expect(mockFetchTranscript).toHaveBeenCalledTimes(4)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Video video123] No transcript found after retries. Using fallback.'
    )

    consoleWarnSpy.mockRestore()
  })

  it('應該在字幕為空陣列時繼續嘗試下一個語言', async () => {
    mockFetchTranscript
      .mockResolvedValueOnce([]) // 空陣列
      .mockResolvedValueOnce([
        { offset: 0, text: '有效字幕' },
      ])

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      { timestamp: 0, text: '有效字幕' },
    ])
    expect(mockFetchTranscript).toHaveBeenCalledTimes(2)
  })

  it('應該在字幕為 null 時繼續嘗試下一個語言', async () => {
    mockFetchTranscript
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([
        { offset: 0, text: '有效字幕' },
      ])

    const result = await getVideoTranscript('video123')

    expect(result).toEqual([
      { timestamp: 0, text: '有效字幕' },
    ])
  })
})
