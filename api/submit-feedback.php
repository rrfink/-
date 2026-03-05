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
    if (!isset($data['user_id']) || !isset($data['type']) || !isset($data['content'])) {
        http_response_code(400);
        echo json_encode(array("error" => "缺少必要参数"));
        exit;
    }
    
    // 提取数据
    $user_id = $data['user_id'];
    $type = $data['type'];
    $content = $data['content'];
    $contact = isset($data['contact']) ? $data['contact'] : '';
    
    try {
        // 连接数据库
        $db = db_connect();
        
        // 创建反馈表（如果不存在）
        $createTableSql = "CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            contact TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        $db->exec($createTableSql);
        
        // 插入反馈数据
        $insertSql = "INSERT INTO feedback (user_id, type, content, contact) VALUES (:user_id, :type, :content, :contact)";
        $stmt = $db->prepare($insertSql);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':content', $content);
        $stmt->bindParam(':contact', $contact);
        
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("success" => "反馈提交成功"));
        } else {
            http_response_code(500);
            echo json_encode(array("error" => "提交失败"));
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