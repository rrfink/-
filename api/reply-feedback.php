<?php
// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 包含数据库连接文件
include '../includes/db.php';

// 检查请求方法
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 获取请求数据
    $data = json_decode(file_get_contents('php://input'), true);
    
    // 验证数据
    if (!isset($data['id']) || !isset($data['reply'])) {
        http_response_code(400);
        echo json_encode(array("error" => "缺少必要参数"));
        exit;
    }
    
    // 提取数据
    $id = intval($data['id']);
    $reply = $data['reply'];
    
    try {
        // 连接数据库
        $db = db_connect();
        
        // 检查反馈表是否存在，如果不存在则创建
        $checkTableSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'";
        $result = $db->query($checkTableSql);
        
        if (!$result->fetch()) {
            // 表不存在，创建新表
            $createTableSql = "CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                contact TEXT,
                status TEXT DEFAULT 'pending',
                reply TEXT,
                reply_at TIMESTAMP,
                is_notified INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )";
            $db->exec($createTableSql);
        } else {
            // 表存在，检查是否有回复相关字段
            try {
                // 尝试添加回复字段
                $db->exec("ALTER TABLE feedback ADD COLUMN reply TEXT");
                $db->exec("ALTER TABLE feedback ADD COLUMN reply_at TIMESTAMP");
                $db->exec("ALTER TABLE feedback ADD COLUMN is_notified INTEGER DEFAULT 0");
            } catch (PDOException $e) {
                // 字段已存在，忽略错误
            }
        }
        
        // 更新反馈回复
        $updateSql = "UPDATE feedback SET reply = :reply, reply_at = CURRENT_TIMESTAMP, status = 'processed', is_notified = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $db->prepare($updateSql);
        $stmt->bindParam(':reply', $reply);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(array("success" => "回复成功"));
            } else {
                http_response_code(404);
                echo json_encode(array("error" => "反馈记录不存在"));
            }
        } else {
            http_response_code(500);
            echo json_encode(array("error" => "回复失败"));
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array("error" => "数据库错误: " . $e->getMessage()));
    }
} else {
    http_response_code(405);
    echo json_encode(array("error" => "不支持的请求方法"));
}
?>