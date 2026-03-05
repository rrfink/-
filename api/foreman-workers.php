<?php
// 工头-工人关系管理API
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
    $data = json_decode(file_get_contents('php://input'), true);
    
    // 清理输入数据
    $data = sanitizeInput($data);
    
    if (!$data || !isset($data['action']) || !isset($data['user_id'])) {
        sendResponse(false, null, '请求数据无效');
    }
    
    // 验证CSRF令牌
    if (!isset($data['csrf_token']) || !validate_csrf_token($data['csrf_token'])) {
        sendResponse(false, null, '无效的CSRF令牌');
    }
    
    $action = $data['action'];
    $userId = $data['user_id'];
    
    // 验证当前用户权限
    if (!validatePermission($userId, 'foreman_workers', $action)) {
        sendResponse(false, null, '没有权限执行此操作');
    }
    
    // 检查当前用户是否为工头或管理员
    try {
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$currentUser || ($currentUser['role'] !== 'foreman' && $currentUser['role'] !== 'admin')) {
            sendResponse(false, null, '只有工头或管理员可以管理工人');
        }
    } catch (PDOException $e) {
        sendResponse(false, null, '获取用户角色失败');
    }
    
    switch ($action) {
        case 'addWorker':
            // 添加工人到工头管理
            if (!isset($data['worker_id'])) {
                sendResponse(false, null, '缺少必要参数');
            }
            
            $workerId = $data['worker_id'];
            
            // 检查工人是否存在
            try {
                $stmt = $db->prepare("SELECT id, role FROM users WHERE id = ?");
                $stmt->execute([$workerId]);
                $worker = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$worker) {
                    sendResponse(false, null, '工人不存在');
                }
                
                if ($worker['role'] !== 'worker') {
                    sendResponse(false, null, '只能添加普通工人');
                }
                
                // 检查关系是否已存在
                $stmt = $db->prepare("SELECT id FROM foreman_workers WHERE foreman_id = ? AND worker_id = ?");
                $stmt->execute([$userId, $workerId]);
                if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                    sendResponse(false, null, '工人已在工头管理下');
                }
                
                // 检查工人是否已被其他工头管理
                $stmt = $db->prepare("SELECT id FROM foreman_workers WHERE worker_id = ?");
                $stmt->execute([$workerId]);
                if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                    sendResponse(false, null, '工人已被其他工头管理');
                }
                
                // 添加关系
                $stmt = $db->prepare("INSERT INTO foreman_workers (foreman_id, worker_id) VALUES (?, ?)");
                $stmt->execute([$userId, $workerId]);
                
                sendResponse(true, null, '工人添加成功');
            } catch (PDOException $e) {
                sendResponse(false, null, '添加工人失败');
            }
            break;
            
        case 'removeWorker':
            // 从工头管理中移除工人
            if (!isset($data['worker_id'])) {
                sendResponse(false, null, '缺少必要参数');
            }
            
            $workerId = $data['worker_id'];
            
            try {
                $stmt = $db->prepare("DELETE FROM foreman_workers WHERE foreman_id = ? AND worker_id = ?");
                $stmt->execute([$userId, $workerId]);
                if ($stmt->rowCount() > 0) {
                    sendResponse(true, null, '工人移除成功');
                } else {
                    sendResponse(false, null, '工人不在工头管理下');
                }
            } catch (PDOException $e) {
                sendResponse(false, null, '移除工人失败');
            }
            break;
            
        case 'getWorkers':
            // 获取工头管理的所有工人
            try {
                $stmt = $db->prepare("SELECT u.id, u.phone, u.created_at FROM users u 
                    JOIN foreman_workers fw ON u.id = fw.worker_id 
                    WHERE fw.foreman_id = ?");
                $stmt->execute([$userId]);
                $workers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendResponse(true, $workers);
            } catch (PDOException $e) {
                sendResponse(false, null, '获取工人列表失败');
            }
            break;
            
        case 'getForeman':
            // 获取工人的工头
            if (!isset($data['worker_id'])) {
                sendResponse(false, null, '缺少必要参数');
            }
            
            $workerId = $data['worker_id'];
            
            try {
                $stmt = $db->prepare("SELECT u.id, u.phone, u.created_at FROM users u 
                    JOIN foreman_workers fw ON u.id = fw.foreman_id 
                    WHERE fw.worker_id = ?");
                $stmt->execute([$workerId]);
                $foreman = $stmt->fetch(PDO::FETCH_ASSOC);
                sendResponse(true, $foreman);
            } catch (PDOException $e) {
                sendResponse(false, null, '获取工头信息失败');
            }
            break;
            
        default:
            sendResponse(false, null, '无效的操作');
    }
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage());
}
?>