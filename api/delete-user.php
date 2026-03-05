<?php
// 删除用户

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 包含数据库连接文件
include '../includes/db.php';

// 检查请求方法
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'error' => '只支持 POST 请求'
    ]);
    exit;
}

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['id'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少必要的用户ID'
    ]);
    exit;
}

$userId = $data['id'];

// 连接数据库
try {
    $db = db_connect();
    
    // 开始事务
    $db->beginTransaction();
    
    // 删除用户的所有关联数据
    $validStores = ['projects', 'attendance', 'contacts', 'personalInfo', 'wageHistory', 'holidays', 'userSettings'];
    
    foreach ($validStores as $storeName) {
        $stmt = $db->prepare("DELETE FROM $storeName WHERE user_id = :id");
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
    }
    
    // 删除用户
    $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
    $stmt->bindParam(':id', $userId);
    $stmt->execute();
    
    $affectedRows = $stmt->rowCount();
    
    // 提交事务
    $db->commit();
    
    if ($affectedRows > 0) {
        // 删除成功
        echo json_encode([
            'success' => true,
            'message' => '用户删除成功，所有关联数据已清理'
        ]);
    } else {
        // 用户不存在
        echo json_encode([
            'success' => false,
            'error' => '用户不存在'
        ]);
    }
} catch (PDOException $e) {
    // 回滚事务
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>