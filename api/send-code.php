<?php
// 发送验证码API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 模拟验证码发送
// 实际项目中应该使用真实的短信服务

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);
$phone = $data['phone'] ?? '';

// 验证手机号
if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
    echo json_encode(['success' => false, 'error' => '无效的手机号']);
    exit;
}

// 检查用户是否存在（实际项目中应该查询数据库）
// 这里模拟用户存在

// 生成6位验证码
$code = rand(100000, 999999);

// 存储验证码（实际项目中应该存储到数据库或缓存中，带过期时间）
// 这里使用session模拟
session_start();
$_SESSION['verify_code'] = [
    'phone' => $phone,
    'code' => $code,
    'expire' => time() + 300 // 5分钟过期
];

// 模拟发送验证码
// 实际项目中应该调用短信API

// 记录日志
file_put_contents(__DIR__ . '/send-code.log', "[" . date('Y-m-d H:i:s') . "] 手机号: $phone, 验证码: $code\n", FILE_APPEND);

// 返回成功响应
echo json_encode(['success' => true, 'message' => '验证码已发送']);
?>