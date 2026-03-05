<?php
// 创建节假日

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 包含数据库连接文件
include '../includes/db.php';

// 系统节日的特殊用户ID
$systemUserId = '__system_holidays__';

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
if (!$data || !isset($data['date']) || !isset($data['name'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少必要的节假日信息'
    ]);
    exit;
}

$date = $data['date'];
$name = $data['name'];
$description = isset($data['description']) ? $data['description'] : '';
$category = isset($data['category']) ? $data['category'] : 'statutory';

// 获取用户ID
session_start();
$user_id = null;
$isAdmin = false;

if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
} elseif (isset($_COOKIE['user_id'])) {
    $user_id = $_COOKIE['user_id'];
} elseif (isset($data['user_id'])) {
    $user_id = $data['user_id'];
}

// 如果有 user_id，就不是管理员
if ($user_id) {
    $isAdmin = false;
} else {
    // 只有没有 user_id 但有 admin 标记时，才是管理员
    if (isset($_SESSION['admin_id']) || isset($_COOKIE['admin_id'])) {
        $isAdmin = true;
    }
}

if (!$user_id && !$isAdmin) {
    echo json_encode([
        'success' => false,
        'error' => '未登录'
    ]);
    exit;
}

// 管理员创建的节日作为系统节日
if ($isAdmin) {
    $user_id = $systemUserId;
}

// 连接数据库
try {
    $db = db_connect();

    // 生成唯一ID - 管理员创建的节日用 admin_holiday_ 前缀，不是法定节日
$id = $isAdmin ? 'admin_holiday_' . uniqid() : 'holiday_' . uniqid();

    // 插入节假日数据（使用当前用户ID）
    $stmt = $db->prepare("INSERT INTO holidays (id, user_id, date, name, description, category) VALUES (:id, :user_id, :date, :name, :description, :category)");
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':date', $date);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':category', $category);

    $result = $stmt->execute();

    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => '节假日创建成功',
            'holiday' => [
                'id' => $id,
                'date' => $date,
                'name' => $name,
                'user_id' => $user_id,
                'isSystem' => $isAdmin
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => '创建节假日失败'
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>