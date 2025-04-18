/**
 * Simple Event Bus (Publish/Subscribe Pattern)
 */
const EventBus = {
    events: {},

    /**
     * Subscribe to an event type.
     * @param {string} eventType - The type of event (e.g., 'elementSelected').
     * @param {function} listener - The callback function to execute when the event occurs.
     */
    subscribe(eventType, listener) {
        if (!this.events[eventType]) {
            this.events[eventType] = [];
        }
        if (!this.events[eventType].includes(listener)) {
             this.events[eventType].push(listener);
        }
        console.log(`Listener subscribed to [${eventType}]`);
    },

    /**
     * Unsubscribe from an event type.
     * @param {string} eventType - The type of event.
     * @param {function} listener - The specific listener to remove.
     */
    unsubscribe(eventType, listener) {
        if (!this.events[eventType]) {
            return;
        }
        this.events[eventType] = this.events[eventType].filter(l => l !== listener);
        console.log(`Listener unsubscribed from [${eventType}]`);
    },

    /**
     * Publish an event.
     * @param {string} eventType - The type of event to publish.
     * @param {*} [data] - Optional data payload to pass to listeners.
     */
    publish(eventType, data) {
        if (!this.events[eventType]) {
            console.log(`No listeners for event [${eventType}]`);
            return;
        }
        console.log(`Publishing event [${eventType}] with data:`, data);
        this.events[eventType].forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in listener for event [${eventType}]:`, error);
            }
        });
    }
}; 