// 条件声明，避免重复定义
if (!window.EventBus) {
    class EventBus {
        constructor() {
            this.events = {};
        }

        on(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
            
            return () => {
                this.off(event, callback);
            };
        }

        off(event, callback) {
            if (!this.events[event]) return;
            
            if (callback) {
                this.events[event] = this.events[event].filter(cb => cb !== callback);
            } else {
                delete this.events[event];
            }
        }

        emit(event, data) {
            if (!this.events[event]) return;
            
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event handler for "' + event + '":', error);
                }
            });
        }

        once(event, callback) {
            const onceCallback = (data) => {
                callback(data);
                this.off(event, onceCallback);
            };

            this.on(event, onceCallback);
        }

        clear() {
            this.events = {};
        }
    }

    // 将EventBus暴露为全局对象
    window.EventBus = EventBus;
}