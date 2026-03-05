<?php
// 处理用户登录请求

// 包含工具文件
include '../includes/api-utils.php';
include '../includes/db.php';

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
if (!validateRequestData($data, ['phone', 'password', 'csrf_token'])) {
    sendResponse(false, null, '缺少必要的登录信息');
}

// 验证CSRF令牌
if (!validate_csrf_token($data['csrf_token'])) {
    sendResponse(false, null, '无效的CSRF令牌');
}

$phone = trim($data['phone']);
$password = $data['password'];

// 验证手机号格式
if (!validatePhone($phone)) {
    sendResponse(false, null, '手机号格式不正确');
}

// 验证密码长度
if (!validatePassword($password)) {
    sendResponse(false, null, '密码长度至少为6位');
}

// 连接数据库
try {
    $db = db_connect();
    
    // 查询用户
    $stmt = $db->prepare("SELECT id, phone, password FROM users WHERE phone = :phone");
    $stmt->bindParam(':phone', $phone);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        // 用户存在，验证密码
        if ($user['password'] === $password) {
            // 密码正确，设置session和cookie
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_phone'] = $user['phone'];
            
            // 设置cookie（7天有效）
            setcookie('user_id', $user['id'], time() + 7 * 24 * 60 * 60, '/');
            setcookie('user_phone', $user['phone'], time() + 7 * 24 * 60 * 60, '/');
            
            // 登录成功
            sendResponse(true, [
                'user' => [
                    'id' => $user['id'],
                    'phone' => $user['phone']
                ]
            ]);
        } else {
            // 密码错误
            sendResponse(false, null, '密码错误');
        }
    } else {
        // 用户不存在，直接返回错误
        sendResponse(false, null, '用户不存在');
    }
    
} catch (PDOException $e) {
    sendResponse(false, null, '数据库错误: ' . $e->getMessage());
}
?>