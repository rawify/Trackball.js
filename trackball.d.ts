declare module 'Trackball';

export default class Trackball {
  constructor (options: Object);

  on(s: string, fn: (q: any) => any): void;
}
