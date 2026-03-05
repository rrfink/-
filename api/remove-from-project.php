<?php
// 从项目中移除员工API

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
if (!$data || !isset($data['user_id']) || !isset($data['project_id'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少必要的参数'
    ]);
    exit;
}

$user_id = trim($data['user_id']);
$project_id = trim($data['project_id']);

// 验证输入
if (empty($user_id)) {
    echo json_encode([
        'success' => false,
        'error' => '用户ID不能为空'
    ]);
    exit;
}

if (empty($project_id)) {
    echo json_encode([
        'success' => false,
        'error' => '项目ID不能为空'
    ]);
    exit;
}

// 连接数据库
try {
    $db = db_connect();
    
    // 检查用户是否存在
    $stmt = $db->prepare("SELECT id FROM users WHERE id = :user_id");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'error' => '用户不存在'
        ]);
        exit;
    }
    
    // 检查项目是否存在
    $stmt = $db->prepare("SELECT id FROM projects WHERE id = :project_id");
    $stmt->bindParam(':project_id', $project_id);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'error' => '项目不存在'
        ]);
        exit;
    }
    
    // 检查用户是否已经分配到该项目
    $stmt = $db->prepare("SELECT id FROM user_projects WHERE user_id = :user_id AND project_id = :project_id");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':project_id', $project_id);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'error' => '用户未分配到该项目'
        ]);
        exit;
    }
    
    // 从项目中移除员工
    $stmt = $db->prepare("DELETE FROM user_projects WHERE user_id = :user_id AND project_id = :project_id");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':project_id', $project_id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => '员工移除成功'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => '移除员工失败'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>