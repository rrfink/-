<?php
// 获取节假日详情

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
        'error' => '缺少节假日ID'
    ]);
    exit;
}

$id = $data['id'];

// 连接数据库
try {
    $db = db_connect();
    
    // 查询节假日详情
    $stmt = $db->prepare("SELECT id, date, name FROM holidays WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $holiday = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($holiday) {
        echo json_encode([
            'success' => true,
            'holiday' => $holiday
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => '节假日不存在'
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>