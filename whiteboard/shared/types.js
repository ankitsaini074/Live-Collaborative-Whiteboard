// Socket.io event types — shared between client and server
// Socket event names
export const SOCKET_EVENTS = {
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    DRAW_STROKE: 'draw-stroke',
    DRAW_SHAPE: 'draw-shape',
    CURSOR_MOVE: 'cursor-move',
    ADD_NOTE: 'add-note',
    UPDATE_NOTE: 'update-note',
    MOVE_NOTE: 'move-note',
    DELETE_NOTE: 'delete-note',
    ADD_TEXT: 'add-text',
    DELETE_TEXT: 'delete-text',
    CLEAR_BOARD: 'clear-board',
    ROOM_STATE: 'room-state',
    USER_JOINED: 'user-joined',
    USER_LEFT: 'user-left',
    REQUEST_EVENTS: 'request-events',
    MISSING_EVENTS: 'missing-events',
};
