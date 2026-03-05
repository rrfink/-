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
    
    try {
        // 连接数据库
        $db = db_connect();
        
        // 删除反馈
        $deleteSql = "DELETE FROM feedback WHERE id = :id";
        $stmt = $db->prepare($deleteSql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(array("success" => "删除成功"));
            } else {
                http_response_code(404);
                echo json_encode(array("error" => "反馈记录不存在"));
            }
        } else {
            http_response_code(500);
            echo json_encode(array("error" => "删除失败"));
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