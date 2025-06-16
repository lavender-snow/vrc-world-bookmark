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
