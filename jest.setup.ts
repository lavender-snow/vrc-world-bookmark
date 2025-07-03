global.AnimationEvent = class AnimationEvent extends Event {
  animationName: string;
  elapsedTime: number;
  pseudoElement: string;
  constructor(type: string, eventInitDict?: Partial<AnimationEventInit>) {
    super(type, eventInitDict);
    this.animationName = eventInitDict?.animationName || '';
    this.elapsedTime = eventInitDict?.elapsedTime || 0;
    this.pseudoElement = eventInitDict?.pseudoElement || '';
  }
};

beforeAll(() => {
  global.window.dbAPI = {
    updateWorldBookmark: jest.fn().mockResolvedValue(undefined),
    updateWorldGenres: jest.fn().mockResolvedValue(undefined),
    getGenres: jest.fn().mockResolvedValue([]),
    getVisitStatuses: jest.fn().mockResolvedValue([]),
    addOrUpdateWorldInfo: jest.fn().mockResolvedValue({}),
    getWorldInfo: jest.fn().mockResolvedValue({}),
    getBookmarkList: jest.fn().mockResolvedValue({ bookmarkList: [], totalCount: 1 }),
    getWorldIdsToUpdate: jest.fn().mockResolvedValue([]),
    getRandomRecommendedWorld: jest.fn().mockResolvedValue({}),
    getLLMRecommendWorld: jest.fn().mockResolvedValue(undefined),
  };
});
