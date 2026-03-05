<?php
// 修改用户密码

// 包含工具文件
include dirname(__DIR__) . '/includes/api-utils.php';
include dirname(__DIR__) . '/includes/db.php';

// 设置响应头
setApiHeaders();

// 启动会话
session_start();

// 检查请求方法
if (!isPostRequest()) {
    sendResponse(false, null, '只支持 POST 请求');
}

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);

// 清理输入数据
$data = sanitizeInput($data);

// 验证请求数据
if (!validateRequestData($data, ['user_id', 'currentPassword', 'newPassword', 'csrf_token'])) {
    sendResponse(false, null, '缺少必要参数');
}

// 验证CSRF令牌
if (!validate_csrf_token($data['csrf_token'])) {
    sendResponse(false, null, '无效的CSRF令牌');
}

$userId = $data['user_id'];
$currentPassword = $data['currentPassword'];
$newPassword = $data['newPassword'];

// 验证用户权限
if (!validatePermission($userId, 'password', 'change')) {
    sendResponse(false, null, '没有权限执行此操作');
}

// 验证新密码长度
if (!validatePassword($newPassword)) {
    sendResponse(false, null, '新密码长度至少为6位');
}

// 连接数据库
try {
    $db = db_connect();
    
    // 验证当前密码
    $stmt = $db->prepare("SELECT password FROM users WHERE id = :id");
    $stmt->bindParam(':id', $userId);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        sendResponse(false, null, '用户不存在');
    }
    
    if ($user['password'] !== $currentPassword) {
        sendResponse(false, null, '当前密码不正确');
    }
    
    // 更新密码
    $stmt = $db->prepare("UPDATE users SET password = :password WHERE id = :id");
    $stmt->bindParam(':password', $newPassword);
    $stmt->bindParam(':id', $userId);
    $result = $stmt->execute();
    
    if ($result) {
        sendResponse(true, null, '密码修改成功');
    } else {
        sendResponse(false, null, '密码修改失败');
    }
} catch (PDOException $e) {
    sendResponse(false, null, '数据库错误: ' . $e->getMessage());
}
?>
