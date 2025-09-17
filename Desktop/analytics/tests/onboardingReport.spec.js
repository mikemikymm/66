const { mapTrackEvents } = require('../helpers');
const MockDate = require('mockdate');


// Freeze time at a specific point
const fixedDate = new Date('2024-01-01T12:00:00Z');
MockDate.set(fixedDate); // Set the mock date

describe('mapTrackEvents', () => {
    beforeEach(() => {
        // Reset any global data that could affect the tests
        jest.clearAllMocks();
    });

    afterAll(() => {
        MockDate.reset(); // Reset mock date after tests
    });

    it('should generate the correct reportConfig snapshot', () => {
        const input = {
            user_id: '12345',
            created_at: '2023-01-01T12:00:00Z',
            updated_at: '2023-01-08T12:00:00Z',
            track_events: [
                {
                    event_type: 'LOGIN_HOMEMADE',
                    timestamp: '2023-01-02T12:00:00Z',
                },
            ],
            activities: [
                {
                    event_type: 'MORNING',
                    activity: 'Morning routine completed',
                },
            ],
            focusModeDatas: [
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 3,
                },
            ],
            devices: [{ operating_system: 'iOS' }],
        };

        const result = mapTrackEvents(input);

        // Snapshot the entire output
        expect(result).toMatchSnapshot();
    });

    it('should handle multiple events correctly', () => {
        const input = {
            user_id: '67890',
            created_at: '2023-02-01T12:00:00Z',
            updated_at: '2023-02-10T12:00:00Z',
            track_events: [
                {
                    event_type: 'APP_QUIT',
                    timestamp: '2023-02-05T12:00:00Z',
                },
                {
                    event_type: 'COMPLETE_MORNING_ROUTINE_ACTIVITY',
                    timestamp: '2023-02-03T07:00:00Z',
                },
            ],
            activities: [
                {
                    event_type: 'EVENING',
                    activity: 'Evening routine completed',
                },
            ],
            focusModeDatas: [
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 4,
                },
            ],
            devices: [{ operating_system: 'Android' }],
        };

        const result = mapTrackEvents(input);

        // Snapshot for complex input
        expect(result).toMatchSnapshot();
    });

    it('should handle empty track events and activities gracefully', () => {
        const input = {
            user_id: '99999',
            created_at: '2023-03-01T12:00:00Z',
            updated_at: '2023-03-10T12:00:00Z',
            track_events: [],
            activities: [],
            focusModeDatas: [],
            devices: [{ operating_system: 'Windows' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle cases where no devices are present', () => {
        const input = {
            user_id: '88888',
            created_at: '2023-04-01T12:00:00Z',
            updated_at: '2023-04-10T12:00:00Z',
            track_events: [
                {
                    event_type: 'COMPLETE_EVENING_ROUTINE_ACTIVITY',
                    timestamp: '2023-04-05T20:00:00Z',
                },
            ],
            activities: [
                {
                    event_type: 'EVENING',
                    activity: 'Evening yoga session',
                },
            ],
            focusModeDatas: [],
            devices: [],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle different focus mode configurations', () => {
        const input = {
            user_id: '77777',
            created_at: '2023-05-01T12:00:00Z',
            updated_at: '2023-05-10T12:00:00Z',
            track_events: [],
            activities: [],
            focusModeDatas: [
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 6,
                },
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 2,
                },
            ],
            devices: [{ operating_system: 'MacOS' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle cases where track events contain multiple event types', () => {
        const input = {
            user_id: '66666',
            created_at: '2023-06-01T12:00:00Z',
            updated_at: '2023-06-10T12:00:00Z',
            track_events: [
                {
                    event_type: 'APP_QUIT',
                    timestamp: '2023-06-05T18:00:00Z',
                },
                {
                    event_type: 'COMPLETE_BREAK_ACTIVITY',
                    timestamp: '2023-06-06T15:00:00Z',
                },
                {
                    event_type: 'COMPLETE_MORNING_ROUTINE_ACTIVITY',
                    timestamp: '2023-06-06T08:00:00Z',
                },
            ],
            activities: [],
            focusModeDatas: [],
            devices: [{ operating_system: 'Linux' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle cases where events are missing expected properties', () => {
        const input = {
            user_id: '55555',
            created_at: '2023-07-01T12:00:00Z',
            updated_at: '2023-07-10T12:00:00Z',
            track_events: [
                {
                    event_type: 'COMPLETE_MORNING_ROUTINE_ACTIVITY',
                    // Missing timestamp
                },
            ],
            activities: [],
            focusModeDatas: [],
            devices: [{ operating_system: 'iOS' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle different event_type constants for routines', () => {
        const input = {
            user_id: '44444',
            created_at: '2023-08-01T12:00:00Z',
            updated_at: '2023-08-10T12:00:00Z',
            track_events: [
                {
                    event_type: 'COMPLETE_BREAK_ACTIVITY',
                    timestamp: '2023-08-05T10:00:00Z',
                },
                {
                    event_type: 'COMPLETE_EVENING_ROUTINE_ACTIVITY',
                    timestamp: '2023-08-06T21:00:00Z',
                },
            ],
            activities: [
                {
                    event_type: 'BREAK',
                    activity: 'Short break',
                },
            ],
            focusModeDatas: [],
            devices: [{ operating_system: 'Android' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle cases with a large number of track events', () => {
        const input = {
            user_id: '33333',
            created_at: '2023-09-01T12:00:00Z',
            updated_at: '2023-09-10T12:00:00Z',
            track_events: Array(100).fill({
                event_type: 'COMPLETE_MORNING_ROUTINE_ACTIVITY',
                timestamp: '2023-09-02T07:00:00Z',
            }),
            activities: [],
            focusModeDatas: [],
            devices: [{ operating_system: 'iOS' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle a mix of event types with different activities and focusModeDatas', () => {
        const input = {
            user_id: '22222',
            created_at: '2023-09-01T12:00:00Z',
            updated_at: '2023-09-07T12:00:00Z',
            track_events: [
                {
                    event_type: 'APP_QUIT',
                    timestamp: '2023-09-02T12:00:00Z',
                },
                {
                    event_type: 'COMPLETE_BREAK_ACTIVITY',
                    timestamp: '2023-09-04T14:00:00Z',
                },
            ],
            activities: [
                {
                    event_type: 'MORNING',
                    activity: 'Morning meditation',
                },
            ],
            focusModeDatas: [
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 2,
                },
            ],
            devices: [{ operating_system: 'Windows' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle no focusModeDatas but multiple activities', () => {
        const input = {
            user_id: '33333',
            created_at: '2023-10-01T12:00:00Z',
            updated_at: '2023-10-05T12:00:00Z',
            track_events: [
                {
                    event_type: 'COMPLETE_EVENING_ROUTINE_ACTIVITY',
                    timestamp: '2023-10-04T21:00:00Z',
                },
            ],
            activities: [
                {
                    event_type: 'EVENING',
                    activity: 'Evening stretching',
                },
                {
                    event_type: 'BREAK',
                    activity: 'Afternoon tea break',
                },
            ],
            focusModeDatas: [],
            devices: [{ operating_system: 'Android' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle activities but no track_events or focusModeDatas', () => {
        const input = {
            user_id: '44444',
            created_at: '2023-11-01T12:00:00Z',
            updated_at: '2023-11-08T12:00:00Z',
            track_events: [],
            activities: [
                {
                    event_type: 'MORNING',
                    activity: 'Morning workout',
                },
            ],
            focusModeDatas: [],
            devices: [{ operating_system: 'iOS' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle no track_events or activities but with focusModeDatas', () => {
        const input = {
            user_id: '55555',
            created_at: '2023-12-01T12:00:00Z',
            updated_at: '2023-12-07T12:00:00Z',
            track_events: [],
            activities: [],
            focusModeDatas: [
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 5,
                },
            ],
            devices: [{ operating_system: 'Linux' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle when devices array is empty', () => {
        const input = {
            user_id: '66666',
            created_at: '2023-01-01T12:00:00Z',
            updated_at: '2023-01-08T12:00:00Z',
            track_events: [
                {
                    event_type: 'APP_QUIT',
                    timestamp: '2023-01-03T12:00:00Z',
                },
            ],
            activities: [],
            focusModeDatas: [],
            devices: [],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle multiple focusModeDatas with varying focus hours', () => {
        const input = {
            user_id: '77777',
            created_at: '2023-02-01T12:00:00Z',
            updated_at: '2023-02-07T12:00:00Z',
            track_events: [],
            activities: [],
            focusModeDatas: [
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 3,
                },
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 4,
                },
                {
                    event_type: 'FOCUS_MODE',
                    focusHours: 5,
                },
            ],
            devices: [{ operating_system: 'MacOS' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle cases with missing activity or track event details', () => {
        const input = {
            user_id: '88888',
            created_at: '2023-03-01T12:00:00Z',
            updated_at: '2023-03-05T12:00:00Z',
            track_events: [
                {
                    event_type: 'COMPLETE_MORNING_ROUTINE_ACTIVITY',
                    timestamp: null, // Missing timestamp
                },
            ],
            activities: [
                {
                    event_type: 'EVENING',
                    activity: null, // Missing activity
                },
            ],
            focusModeDatas: [],
            devices: [{ operating_system: 'Windows' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle cases with no created_at or updated_at values', () => {
        const input = {
            user_id: '99999',
            created_at: null, // Missing created_at
            updated_at: null, // Missing updated_at
            track_events: [
                {
                    event_type: 'COMPLETE_BREAK_ACTIVITY',
                    timestamp: '2023-03-05T15:00:00Z',
                },
            ],
            activities: [],
            focusModeDatas: [],
            devices: [{ operating_system: 'iOS' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle a mix of valid and invalid track events', () => {
        const input = {
            user_id: '101010',
            created_at: '2023-04-01T12:00:00Z',
            updated_at: '2023-04-07T12:00:00Z',
            track_events: [
                {
                    event_type: 'APP_QUIT',
                    timestamp: '2023-04-03T12:00:00Z',
                },
                {
                    event_type: 'INVALID_EVENT_TYPE', // Invalid event type
                    timestamp: '2023-04-04T12:00:00Z',
                },
            ],
            activities: [],
            focusModeDatas: [],
            devices: [{ operating_system: 'Linux' }],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });

    it('should handle cases with track events having multiple event types and devices with different OS', () => {
        const input = {
            user_id: '11111',
            created_at: '2023-05-01T12:00:00Z',
            updated_at: '2023-05-07T12:00:00Z',
            track_events: [
                {
                    event_type: 'APP_QUIT',
                    timestamp: '2023-05-03T12:00:00Z',
                },
                {
                    event_type: 'COMPLETE_BREAK_ACTIVITY',
                    timestamp: '2023-05-05T15:00:00Z',
                },
            ],
            activities: [],
            focusModeDatas: [],
            devices: [
                { operating_system: 'iOS' },
                { operating_system: 'Android' },
            ],
        };

        const result = mapTrackEvents(input);

        expect(result).toMatchSnapshot();
    });
});
