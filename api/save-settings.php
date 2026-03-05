<?php
// 保存系统设置到数据库

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
    // 获取POST数据
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['settings'])) {
        die(json_encode(['success' => false, 'message' => '缺少设置数据']));
    }
    
    $settings = $data['settings'];
    
    // 开始事务
    $db->beginTransaction();
    
    foreach ($settings as $key => $value) {
        // 检查设置是否存在
        $sql = "SELECT id FROM settings WHERE key = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$key]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            // 更新设置
            $sql = "UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$value, $key]);
        } else {
            // 插入设置
            $sql = "INSERT INTO settings (key, value) VALUES (?, ?)";
            $stmt = $db->prepare($sql);
            $stmt->execute([$key, $value]);
        }
    }
    
    // 提交事务
    $db->commit();
    
    echo json_encode(['success' => true, 'message' => '设置保存成功']);
} catch (PDOException $e) {
    // 回滚事务
    $db->rollBack();
    die(json_encode(['success' => false, 'message' => '保存设置失败: ' . $e->getMessage()]));
}
?>