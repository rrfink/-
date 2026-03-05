/**
 * 防抖和节流函数库
 * 用于优化频繁的localStorage操作，提高性能
 */

// 防抖函数：在指定时间后执行函数，如果在等待期间再次调用，则重新计时
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}

// 节流函数：在指定时间内只执行一次函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle
    };
} else {
    window.DebounceThrottle = {
        debounce,
        throttle
    };
}
