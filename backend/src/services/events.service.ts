import { EventEmitter } from 'events';

class MatchEventHub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }

  emitMatchUpdate(matchId: string, eventType: string, payload: any) {
    this.emit(`match:${matchId}`, { eventType, payload, timestamp: new Date().toISOString() });
    this.emit('global:match_event', { matchId, eventType, payload, timestamp: new Date().toISOString() });
  }

  subscribeMatch(matchId: string, listener: (data: any) => void) {
    this.on(`match:${matchId}`, listener);
    return () => this.off(`match:${matchId}`, listener);
  }
}

export const matchEventHub = new MatchEventHub();
