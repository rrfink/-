<?php
// 从数据库加载系统设置

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// 数据库文件路径
$dbPath = __DIR__ . '/../database.db';

// 创建数据库连接
$db = new PDO('sqlite:' . $dbPath);
if (!$db) {
    die(json_encode(['success' => false, 'message' => '数据库连接失败']));
}

// 设置错误模式
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

try {
    // 获取所有设置
    $sql = "SELECT key, value FROM settings";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // 转换布尔值
    if (isset($settings['allowRememberPassword'])) {
        $settings['allowRememberPassword'] = (bool)$settings['allowRememberPassword'];
    }
    if (isset($settings['enableNotifications'])) {
        $settings['enableNotifications'] = (bool)$settings['enableNotifications'];
    }
    if (isset($settings['lateThreshold'])) {
        $settings['lateThreshold'] = (int)$settings['lateThreshold'];
    }
    
    echo json_encode(['success' => true, 'settings' => $settings]);
} catch (PDOException $e) {
    die(json_encode(['success' => false, 'message' => '加载设置失败: ' . $e->getMessage()]));
}
?>