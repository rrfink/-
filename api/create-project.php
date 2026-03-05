<?php
// 创建项目API

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// 包含数据库连接文件
include dirname(__DIR__) . '/includes/db.php';

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
if (!$data || !isset($data['name'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少必要的项目信息'
    ]);
    exit;
}

$name = trim($data['name']);
$address = isset($data['address']) ? trim($data['address']) : '';
$description = isset($data['description']) ? trim($data['description']) : '';

// 验证输入
if (empty($name)) {
    echo json_encode([
        'success' => false,
        'error' => '项目名称不能为空'
    ]);
    exit;
}

// 连接数据库
try {
    $db = db_connect();
    
    // 生成项目ID
    $projectId = 'project_' . time() . rand(1000, 9999);
    
    // 插入项目数据
    $stmt = $db->prepare("INSERT INTO projects (id, name, address, description, created_at, isEnded) VALUES (:id, :name, :address, :description, :created_at, :isEnded)");
    $created_at = date('Y-m-d H:i:s');
    $isEnded = 0;
    
    $stmt->bindParam(':id', $projectId);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':address', $address);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':created_at', $created_at);
    $stmt->bindParam(':isEnded', $isEnded);
    
    if ($stmt->execute()) {
        // 返回成功信息
        echo json_encode([
            'success' => true,
            'message' => '项目创建成功',
            'projectId' => $projectId,
            'project' => [
                'id' => $projectId,
                'name' => $name,
                'address' => $address,
                'description' => $description,
                'created_at' => $created_at,
                'isEnded' => $isEnded
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => '创建项目失败'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>