<?php
// 获取用户列表

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 包含数据库连接文件
include '../includes/db.php';

// 连接数据库
try {
    $db = db_connect();
    
    // 查询所有用户，同时获取personalInfo中的名字和用户角色
    try {
        // 使用GROUP BY确保每个用户只返回一条记录
        $stmt = $db->query("SELECT u.id, u.name as user_name, MAX(p.name) as personal_name, u.phone, u.role, u.created_at FROM users u LEFT JOIN personalInfo p ON u.id = p.user_id GROUP BY u.id ORDER BY u.created_at DESC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 处理用户姓名
        foreach ($users as &$user) {
            // 优先使用personalInfo中的姓名，其次使用users表中的姓名，最后使用手机号
            // 确保空值处理正确
            $personalName = isset($user['personal_name']) && !empty($user['personal_name']) ? $user['personal_name'] : null;
            $userName = isset($user['user_name']) && !empty($user['user_name']) ? $user['user_name'] : null;
            $phone = $user['phone'];
            
            // 确定最终姓名
            if ($personalName) {
                $user['name'] = $personalName;
            } elseif ($userName) {
                $user['name'] = $userName;
            } else {
                $user['name'] = $phone;
            }
            
            // 为没有personalInfo记录的用户创建记录
            if (empty($personalName)) {
                try {
                    // 尝试为用户创建personalInfo记录
                    $personalInfoId = 'personal_' . $user['id'];
                    $stmt = $db->prepare("INSERT OR IGNORE INTO personalInfo (id, user_id, name) VALUES (:id, :user_id, :name)");
                    $stmt->bindParam(':id', $personalInfoId);
                    $stmt->bindParam(':user_id', $user['id']);
                    $stmt->bindParam(':name', $user['name']); // 使用最终确定的姓名
                    $stmt->execute();
                } catch (PDOException $e) {
                    // 忽略错误
                }
            }
        }
    } catch (PDOException $e) {
        // 如果查询失败（可能是因为name字段不存在或personalInfo表不存在），尝试不包含name字段的查询
        try {
            $stmt = $db->query("SELECT id, name, phone, role, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // 为每个用户添加name字段，设置默认值
            foreach ($users as &$user) {
                $user['name'] = isset($user['name']) && !empty($user['name']) ? $user['name'] : $user['phone'];
                $user['role'] = isset($user['role']) ? $user['role'] : 'worker'; // 设置默认角色为普通工人
            }
        } catch (PDOException $e2) {
            // 如果还是失败，尝试最基本的查询
            $stmt = $db->query("SELECT id, phone, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // 为每个用户添加name和role字段，设置默认值
            foreach ($users as &$user) {
                $user['name'] = $user['phone']; // 使用手机号作为默认姓名
                $user['role'] = 'worker'; // 设置默认角色为普通工人
            }
        }
    }
    
    // 返回用户列表
    echo json_encode([
        'success' => true,
        'users' => $users,
        'count' => count($users)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>