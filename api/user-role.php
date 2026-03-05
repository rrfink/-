<?php
// 用户角色管理API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

// 启动会话
session_start();

// 包含数据库连接文件
include '../includes/db.php';
include '../includes/api-utils.php';

// 主逻辑
try {
    $db = db_connect();
    
    // 获取请求数据
    $rawData = file_get_contents('php://input');
    $data = json_decode($rawData, true);
    
    // 清理输入数据
    $data = sanitizeInput($data);
    
    if (!$data || !isset($data['action']) || !isset($data['user_id'])) {
        sendResponse(false, null, '请求数据无效: ' . $rawData);
    }
    
    // 验证CSRF令牌（管理员操作使用固定token）
    if (!isset($data['csrf_token']) || ($data['user_id'] !== 'admin' && !validate_csrf_token($data['csrf_token'])) || ($data['user_id'] === 'admin' && $data['csrf_token'] !== 'admin_token')) {
        sendResponse(false, null, '无效的CSRF令牌');
    }
    
    $action = $data['action'];
    $userId = $data['user_id'];
    
    // 管理员使用固定ID，直接通过权限验证
    if ($userId === 'admin') {
        // 管理员操作，直接通过
    } else {
        // 验证当前用户权限
        if (!validatePermission($userId, 'user_role', $action)) {
            sendResponse(false, null, '没有权限执行此操作');
        }
        
        // 检查当前用户是否为工头或管理员
        try {
            $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$currentUser || ($currentUser['role'] !== 'foreman' && $currentUser['role'] !== 'admin')) {
                sendResponse(false, null, '只有工头或管理员可以管理用户角色');
            }
        } catch (PDOException $e) {
            sendResponse(false, null, '获取用户角色失败');
        }
    }
    
    switch ($action) {
        case 'getAllUsers':
            // 获取所有用户
            try {
                $stmt = $db->prepare("SELECT id, phone, role, created_at FROM users");
                $stmt->execute();
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendResponse(true, $users);
            } catch (PDOException $e) {
                sendResponse(false, null, '获取用户列表失败');
            }
            break;
            
        case 'updateRole':
            // 更新用户角色
            if (!isset($data['target_user_id']) || !isset($data['role'])) {
                sendResponse(false, null, '缺少必要参数');
            }
            
            $targetUserId = $data['target_user_id'];
            $role = $data['role'];
            
            // 验证角色值
            if (!in_array($role, ['worker', 'foreman'])) {
                sendResponse(false, null, '无效的角色值');
            }
            
            try {
                $stmt = $db->prepare("UPDATE users SET role = ? WHERE id = ?");
                $stmt->execute([$role, $targetUserId]);
                sendResponse(true, null, '角色更新成功');
            } catch (PDOException $e) {
                sendResponse(false, null, '更新角色失败: ' . $e->getMessage());
            }
            break;
            
        case 'addForeman':
            // 添加工头
            if (!isset($data['phone']) || !isset($data['password'])) {
                sendResponse(false, null, '缺少必要参数');
            }
            
            $phone = $data['phone'];
            $password = $data['password'];
            
            // 验证手机号格式
            if (!validatePhone($phone)) {
                sendResponse(false, null, '手机号格式不正确');
            }
            
            // 验证密码长度
            if (!validatePassword($password)) {
                sendResponse(false, null, '密码长度至少为6位');
            }
            
            // 检查用户是否已存在
            try {
                $stmt = $db->prepare("SELECT id FROM users WHERE phone = ?");
                $stmt->execute([$phone]);
                if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                    sendResponse(false, null, '用户已存在');
                }
                
                // 创建工头账号
                $foremanId = $phone; // 使用手机号作为ID
                $stmt = $db->prepare("INSERT INTO users (id, phone, password, role) VALUES (?, ?, ?, ?)");
                $stmt->execute([$foremanId, $phone, $password, 'foreman']);
                
                sendResponse(true, null, '工头添加成功');
            } catch (PDOException $e) {
                sendResponse(false, null, '添加工头失败');
            }
            break;
            
        case 'removeForeman':
            // 移除工头（降级为普通工人）
            if (!isset($data['target_user_id'])) {
                sendResponse(false, null, '缺少必要参数');
            }
            
            $targetUserId = $data['target_user_id'];
            
            try {
                $stmt = $db->prepare("UPDATE users SET role = 'worker' WHERE id = ? AND role = 'foreman'");
                $stmt->execute([$targetUserId]);
                if ($stmt->rowCount() > 0) {
                    sendResponse(true, null, '工头移除成功');
                } else {
                    sendResponse(false, null, '用户不是工头');
                }
            } catch (PDOException $e) {
                sendResponse(false, null, '移除工头失败');
            }
            break;
            
        default:
            sendResponse(false, null, '无效的操作');
    }
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage());
}
?>