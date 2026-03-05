<?php
// 处理管理员登录请求

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 包含数据库连接文件
include '../includes/db.php';

session_start();

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
if (!$data || !isset($data['username']) || !isset($data['password'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少必要的登录信息'
    ]);
    exit;
}

$username = trim($data['username']);
$password = $data['password'];

// 验证用户名和密码长度
if (strlen($username) < 3) {
    echo json_encode([
        'success' => false,
        'error' => '用户名长度至少为3位'
    ]);
    exit;
}

if (strlen($password) < 5) {
    echo json_encode([
        'success' => false,
        'error' => '密码长度至少为5位'
    ]);
    exit;
}

// 连接数据库
try {
    $db = db_connect();
    
    // 查询管理员
    $stmt = $db->prepare("SELECT id, username, password FROM admins WHERE username = :username");
    $stmt->bindParam(':username', $username);
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        // 管理员存在，验证密码
        if (password_verify($password, $admin['password'])) {
            // 密码正确，登录成功 - 设置 session
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            
            // 同时设置 cookie，方便其他页面识别
            setcookie('admin_id', $admin['id'], time() + 86400 * 30, '/');
            setcookie('admin_username', $admin['username'], time() + 86400 * 30, '/');
            
            echo json_encode([
                'success' => true,
                'admin' => [
                    'id' => $admin['id'],
                    'username' => $admin['username']
                ]
            ]);
        } else {
            // 密码错误
            echo json_encode([
                'success' => false,
                'error' => '密码错误'
            ]);
        }
    } else {
        // 管理员不存在
        echo json_encode([
            'success' => false,
            'error' => '管理员不存在'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>