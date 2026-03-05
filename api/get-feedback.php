<?php
// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 包含数据库连接文件
include '../includes/db.php';

try {
    // 连接数据库
    $db = db_connect();
    
    // 检查反馈表是否存在
    $checkTableSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'";
    $result = $db->query($checkTableSql);
    
    if (!$result->fetch()) {
        // 表不存在，返回空数组
        http_response_code(200);
        echo json_encode(array("feedback" => array(), "unread_count" => 0));
        exit;
    }
    
    // 检查是否有user_id参数
    $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
    
    if ($user_id) {
        // 获取用户的反馈列表
        $sql = "SELECT f.*, u.name as user_name, u.phone as user_phone 
                FROM feedback f
                LEFT JOIN users u ON f.user_id = u.id
                WHERE f.user_id = :user_id
                ORDER BY f.created_at DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $feedbackList = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 计算未读通知数量
        $unreadSql = "SELECT COUNT(*) as unread_count 
                    FROM feedback 
                    WHERE user_id = :user_id 
                    AND reply IS NOT NULL 
                    AND is_notified = 0";
        $unreadStmt = $db->prepare($unreadSql);
        $unreadStmt->bindParam(':user_id', $user_id);
        $unreadStmt->execute();
        $unreadCount = $unreadStmt->fetch(PDO::FETCH_ASSOC)['unread_count'];
        
        http_response_code(200);
        echo json_encode(array("feedback" => $feedbackList, "unread_count" => $unreadCount));
    } else {
        // 获取所有反馈列表
        $sql = "SELECT f.*, u.name as user_name, u.phone as user_phone 
                FROM feedback f
                LEFT JOIN users u ON f.user_id = u.id
                ORDER BY f.created_at DESC";
        
        $result = $db->query($sql);
        $feedbackList = $result->fetchAll(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode(array("feedback" => $feedbackList));
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "数据库错误: " . $e->getMessage()));
}
?>