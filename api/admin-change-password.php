<?php
// 处理管理员密码修改请求

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
if (!$data || !isset($data['currentPassword']) || !isset($data['newPassword'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少必要的密码信息'
    ]);
    exit;
}

$currentPassword = $data['currentPassword'];
$newPassword = $data['newPassword'];

// 验证密码长度
if (strlen($newPassword) < 5) {
    echo json_encode([
        'success' => false,
        'error' => '新密码长度至少为5位'
    ]);
    exit;
}

// 验证密码复杂度
if (!preg_match('/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{5,}$/', $newPassword)) {
    echo json_encode([
        'success' => false,
        'error' => '新密码必须包含至少一个字母和一个数字'
    ]);
    exit;
}

// 连接数据库
try {
    $db = db_connect();
    
    // 查询管理员（默认只有一个管理员账号）
    $stmt = $db->prepare("SELECT id, password FROM admins LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        // 验证当前密码
        if (password_verify($currentPassword, $admin['password'])) {
            // 当前密码正确，更新密码
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE admins SET password = :password WHERE id = :id");
            $stmt->bindParam(':password', $hashedPassword);
            $stmt->bindParam(':id', $admin['id']);
            $result = $stmt->execute();
            
            if ($result) {
                // 密码更新成功
                echo json_encode([
                    'success' => true,
                    'message' => '密码修改成功'
                ]);
            } else {
                // 密码更新失败
                echo json_encode([
                    'success' => false,
                    'error' => '密码修改失败'
                ]);
            }
        } else {
            // 当前密码错误
            echo json_encode([
                'success' => false,
                'error' => '当前密码错误'
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