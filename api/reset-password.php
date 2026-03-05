<?php
// 重置用户密码

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

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

// 验证请求数据
if (!isset($data['id'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少用户ID'
    ]);
    exit;
}

$userId = $data['id'];
$defaultPassword = '123456'; // 默认密码

// 连接数据库
try {
    $db = db_connect();
    
    // 重置用户密码
    $stmt = $db->prepare("UPDATE users SET password = :password WHERE id = :id");
    $stmt->bindParam(':password', $defaultPassword);
    $stmt->bindParam(':id', $userId);
    $result = $stmt->execute();
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => '密码重置成功'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => '密码重置失败'
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>