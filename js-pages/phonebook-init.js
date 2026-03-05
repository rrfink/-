// 动态获取syncDataToCloud和restoreDataFromCloud函数，确保使用最新的函数
function getSyncDataToCloud() {
    return window.syncDataToCloud || (async (storageManager) => {
        return { success: false, error: 'syncDataToCloud not loaded' };
    });
}

function getRestoreDataFromCloud() {
    return window.restoreDataFromCloud || (async (storageManager) => {
        return { success: false, error: 'restoreDataFromCloud not loaded' };
    });
}

(async () => {
    const container = document.getElementById('app');
    const storage = new IntelligentStorageManager();
    const logger = new Logger();
    const eventBus = new EventBus();
    const dialog = new Dialog(eventBus);
    const toast = new Toast(eventBus);

    await storage.init();
    
    const theme = new ThemeManager(storage, eventBus);
    theme.init();

    const page = new PhoneBookPage({
        container,
        eventBus,
        storage,
        theme,
        toast,
        dialog,
        logger,
        cloudSync: {
            syncDataToCloud: () => getSyncDataToCloud()(storage),
            restoreDataFromCloud: () => getRestoreDataFromCloud()(storage)
        }
    });

    // 先初始化页面，确保用户能快速看到内容
    await page.init();
    
    // 后台异步同步本地数据到服务器，不阻塞页面加载
    if (localStorage.getItem('user_id')) {
        storage.syncLocalToServer().then(success => {
            if (!success) {
                console.warn('本地数据同步到服务器失败');
            }
        }).catch(error => {
            console.error('同步本地数据到服务器时发生错误:', error);
        });
    }
    
    // 初始化登录图标管理器
    if (window.loginIconManager) {
        window.loginIconManager.init();
    }
})();
