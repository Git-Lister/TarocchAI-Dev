(function (window) {
  'use strict';

  const TIMING = {
    intakeGhostDelay: 4000,
    intakeGhostDuration: 2000,
    intakeRemoveDelay: 2000,
  };

  const VALID_TRANSITIONS = {
    'threshold': ['arrival'],
    'arrival': ['naming'],
    'naming': ['intake'],
    'intake': ['candle-ritual'],
    'candle-ritual': ['shuffle'],
    'shuffle': ['deal'],
    'deal': ['per-card'],
    'per-card': ['per-card', 'prompt-line'],
    'prompt-line': ['thread'],
    'thread': ['closing'],
    'closing': ['threshold'],
  };

  class StateMachine {
    constructor(initialState = 'threshold') {
      this._state = initialState;
      this._listeners = [];
    }

    getState() {
      return this._state;
    }

    setState(newState) {
      const from = this._state;
      const to = newState;
      if (!StateMachine.canTransition(from, to)) {
        console.warn('[StateMachine] Illegal transition: ' + from + ' \u2192 ' + to);
        return false;
      }
      this._state = to;
      const payload = { from, to, timestamp: Date.now() };
      this._listeners.forEach(cb => cb(payload));
      return true;
    }

    onTransition(callback) {
      this._listeners.push(callback);
    }

    offTransition(callback) {
      const idx = this._listeners.indexOf(callback);
      if (idx !== -1) this._listeners.splice(idx, 1);
    }

    static canTransition(from, to) {
      const allowed = VALID_TRANSITIONS[from];
      return Array.isArray(allowed) && allowed.includes(to);
    }
  }

  class TextBand {
    constructor() {
      this.mode = 'intake';
      this.lines = [];
      this._listeners = {
        onAdd: [],
        onStateChange: [],
        onRemove: [],
        onMaterialize: [],
        onReset: [],
      };
      this._lineCounter = 0;
      this._ghostTimers = new Map();
    }

    setMode(mode) {
      if (mode !== this.mode) {
        this.mode = mode;
        this._clearGhostTimers();
      }
    }

    append(text) {
      const id = String(++this._lineCounter);
      const line = {
        id,
        text,
        state: 'active',
        timestamp: Date.now(),
      };
      this.lines.push(line);

      if (this.mode === 'intake') {
        this._scheduleGhosting(line.id);
      } else if (this.mode === 'card-line') {
        this._updateCardLineStates();
      }

      this._emit('onAdd', { id: line.id, text: line.text, state: line.state });
      this._emit('onMaterialize', { id: line.id, text: line.text, mode: this.mode });
      return line.id;
    }

    reset() {
      this._clearGhostTimers();
      this.lines = [];
      this._emit('onReset', {});
    }

    getLines() {
      return this.lines.map(l => ({ ...l }));
    }

    onAdd(cb) { this._listeners.onAdd.push(cb); }
    onStateChange(cb) { this._listeners.onStateChange.push(cb); }
    onRemove(cb) { this._listeners.onRemove.push(cb); }
    onMaterialize(cb) { this._listeners.onMaterialize.push(cb); }
    onReset(cb) { this._listeners.onReset.push(cb); }

    _emit(event, payload) {
      this._listeners[event]?.forEach(cb => cb(payload));
    }

    _clearGhostTimers() {
      this._ghostTimers.forEach(timer => clearTimeout(timer));
      this._ghostTimers.clear();
    }

    _scheduleGhosting(lineId) {
      const line = this.lines.find(l => l.id === lineId);
      if (!line) return;

      const ghostTimer = setTimeout(() => {
        this._transitionLineState(lineId, 'ghosted');
        const removeTimer = setTimeout(() => {
          this._transitionLineState(lineId, 'removed');
          this.lines = this.lines.filter(l => l.id !== lineId);
          this._emit('onRemove', { id: lineId });
        }, TIMING.intakeRemoveDelay);
        this._ghostTimers.set(lineId + '_remove', removeTimer);
      }, TIMING.intakeGhostDelay);

      this._ghostTimers.set(lineId + '_ghost', ghostTimer);
    }

    _transitionLineState(lineId, newState) {
      const line = this.lines.find(l => l.id === lineId);
      if (!line || line.state === newState) return;
      line.state = newState;
      this._emit('onStateChange', { id: lineId, state: newState });
    }

    _updateCardLineStates() {
      const count = this.lines.length;
      this.lines.forEach((line, idx) => {
        let newState;
        if (count === 1) {
          newState = 'active';
        } else if (count === 2) {
          newState = idx === 0 ? 'dimmed-1' : 'active';
        } else if (count === 3) {
          newState = idx < 2 ? 'dimmed-2' : 'active';
        } else {
          newState = idx < count - 1 ? 'dimmed-2' : 'active';
        }
        this._transitionLineState(line.id, newState);
      });
    }
  }

  window.TarocchAI = {
    StateMachine,
    TextBand,
  };
})(window);