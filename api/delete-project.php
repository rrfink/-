<?php
// 删除项目

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// 包含数据库连接文件
include dirname(__DIR__) . '/includes/db.php';

// 连接数据库
try {
    $db = db_connect();
    
    // 获取请求数据
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id'])) {
        echo json_encode([
            'success' => false,
            'error' => '缺少项目ID'
        ]);
        exit;
    }
    
    $projectId = $data['id'];
    
    // 删除项目
    $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    
    // 返回结果
    echo json_encode([
        'success' => true,
        'message' => '项目删除成功'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>