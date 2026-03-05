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
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(array("error" => "缺少必要参数"));
        exit;
    }
    
    // 提取数据
    $id = intval($data['id']);
    $user_id = $data['user_id'] ?? null;
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(array("error" => "用户ID不能为空"));
        exit;
    }
    
    try {
        // 连接数据库
        $db = db_connect();
        
        // 检查反馈是否存在且属于该用户
        $checkSql = "SELECT * FROM feedback WHERE id = :id AND user_id = :user_id";
        $checkStmt = $db->prepare($checkSql);
        $checkStmt->bindParam(':id', $id);
        $checkStmt->bindParam(':user_id', $user_id);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(array("error" => "反馈记录不存在或不属于该用户"));
            exit;
        }
        
        // 更新反馈为已读
        $updateSql = "UPDATE feedback SET is_notified = 1 WHERE id = :id";
        $stmt = $db->prepare($updateSql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(array("success" => "标记为已读成功"));
            } else {
                http_response_code(404);
                echo json_encode(array("error" => "反馈记录不存在"));
            }
        } else {
            http_response_code(500);
            echo json_encode(array("error" => "操作失败"));
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