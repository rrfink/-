<?php
// 分享链接管理API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

session_start();

include '../includes/db.php';
include '../includes/api-utils.php';

// 初始化数据库连接
$db = db_connect();

// 获取当前用户ID
$currentUserId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : (isset($_COOKIE['user_id']) ? $_COOKIE['user_id'] : null);

if (!$currentUserId) {
    sendResponse(false, null, '请先登录');
}

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        // 创建分享链接
        handleCreateShareLink($db, $currentUserId);
        break;
    case 'GET':
        // 获取分享链接列表或验证分享链接
        if (isset($_GET['token'])) {
            handleVerifyShareLink($db);
        } else {
            handleGetShareLinks($db, $currentUserId);
        }
        break;
    case 'DELETE':
        // 删除分享链接
        handleDeleteShareLink($db, $currentUserId);
        break;
    default:
        sendResponse(false, null, '不支持的请求方法');
}

// 创建分享链接
function handleCreateShareLink($db, $currentUserId) {
    $data = json_decode(file_get_contents('php://input'), true);
    $data = sanitizeInput($data);
    
    if (!$data || !isset($data['worker_id'])) {
        sendResponse(false, null, '缺少必要参数');
    }
    
    $workerId = $data['worker_id'];
    $password = isset($data['password']) ? $data['password'] : null;
    $expireDays = isset($data['expire_days']) ? intval($data['expire_days']) : 7;
    $maxViews = null;
    if (isset($data['max_views']) && !empty($data['max_views']) && intval($data['max_views']) > 0) {
        $maxViews = intval($data['max_views']);
    }
    
    // 验证CSRF令牌
    if (!isset($data['csrf_token']) || !validate_csrf_token($data['csrf_token'])) {
        sendResponse(false, null, '无效的CSRF令牌');
    }
    
    // 验证当前用户是否有权限分享此工人
    if (!canShareWorker($db, $currentUserId, $workerId)) {
        sendResponse(false, null, '您没有权限分享此工人的工资信息');
    }
    
    try {
        // 生成唯一分享令牌
        $shareToken = bin2hex(random_bytes(16));
        
        // 计算过期时间
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expireDays} days"));
        
        // 密码哈希
        $passwordHash = $password ? password_hash($password, PASSWORD_DEFAULT) : null;
        
        // 插入数据库
        $stmt = $db->prepare("
            INSERT INTO share_links (share_token, worker_id, created_by, password_hash, expires_at, max_views)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$shareToken, $workerId, $currentUserId, $passwordHash, $expiresAt, $maxViews]);
        
        $shareId = $db->lastInsertId();
        
        // 构建分享链接
        $shareUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/jg/html-new/worker-wage.php?token=' . $shareToken;
        
        sendResponse(true, [
            'share_id' => $shareId,
            'share_token' => $shareToken,
            'share_url' => $shareUrl,
            'expires_at' => $expiresAt,
            'has_password' => !empty($password)
        ], '分享链接创建成功');
        
    } catch (PDOException $e) {
        sendResponse(false, null, '创建分享链接失败: ' . $e->getMessage());
    }
}

// 验证分享链接
function handleVerifyShareLink($db) {
    $token = $_GET['token'];
    $password = isset($_GET['password']) ? $_GET['password'] : null;
    
    try {
        $stmt = $db->prepare("
            SELECT * FROM share_links 
            WHERE share_token = ? AND is_active = 1
        ");
        $stmt->execute([$token]);
        $shareLink = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$shareLink) {
            sendResponse(false, null, '分享链接不存在或已失效');
        }
        
        // 检查是否过期
        if (strtotime($shareLink['expires_at']) < time()) {
            // 标记为过期
            $stmt = $db->prepare("UPDATE share_links SET is_active = 0 WHERE id = ?");
            $stmt->execute([$shareLink['id']]);
            sendResponse(false, null, '分享链接已过期');
        }
        
        // 检查最大查看次数
        if ($shareLink['max_views'] && $shareLink['view_count'] >= $shareLink['max_views']) {
            sendResponse(false, null, '分享链接已达到最大查看次数');
        }
        
        // 验证密码
        if ($shareLink['password_hash'] && !password_verify($password, $shareLink['password_hash'])) {
            sendResponse(false, ['require_password' => true], '密码错误');
        }
        
        // 增加查看次数
        $stmt = $db->prepare("UPDATE share_links SET view_count = view_count + 1 WHERE id = ?");
        $stmt->execute([$shareLink['id']]);
        
        // 获取工人信息
        $stmt = $db->prepare("
            SELECT id, name, phone, email, id_number, job, employee_type, rest_system,
                   wage, monthly_wage, overtime_rate, wage_calculation_method
            FROM users WHERE id = ?
        ");
        $stmt->execute([$shareLink['worker_id']]);
        $worker = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$worker) {
            sendResponse(false, null, '工人信息不存在');
        }
        
        sendResponse(true, [
            'worker' => $worker,
            'expires_at' => $shareLink['expires_at'],
            'view_count' => $shareLink['view_count'] + 1,
            'max_views' => $shareLink['max_views']
        ]);
        
    } catch (PDOException $e) {
        sendResponse(false, null, '验证分享链接失败: ' . $e->getMessage());
    }
}

// 获取分享链接列表
function handleGetShareLinks($db, $currentUserId) {
    try {
        $stmt = $db->prepare("
            SELECT sl.*, u.name as worker_name, u.phone as worker_phone
            FROM share_links sl
            JOIN users u ON sl.worker_id = u.id
            WHERE sl.created_by = ?
            ORDER BY sl.created_at DESC
        ");
        $stmt->execute([$currentUserId]);
        $shareLinks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, $shareLinks);
    } catch (PDOException $e) {
        sendResponse(false, null, '获取分享链接列表失败: ' . $e->getMessage());
    }
}

// 删除分享链接
function handleDeleteShareLink($db, $currentUserId) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['share_id'])) {
        sendResponse(false, null, '缺少分享链接ID');
    }
    
    $shareId = $data['share_id'];
    
    try {
        // 验证所有权
        $stmt = $db->prepare("SELECT created_by FROM share_links WHERE id = ?");
        $stmt->execute([$shareId]);
        $shareLink = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$shareLink) {
            sendResponse(false, null, '分享链接不存在');
        }
        
        if ($shareLink['created_by'] !== $currentUserId) {
            sendResponse(false, null, '您没有权限删除此分享链接');
        }
        
        $stmt = $db->prepare("DELETE FROM share_links WHERE id = ?");
        $stmt->execute([$shareId]);
        
        sendResponse(true, null, '分享链接已删除');
    } catch (PDOException $e) {
        sendResponse(false, null, '删除分享链接失败: ' . $e->getMessage());
    }
}

// 验证用户是否有权限分享工人
function canShareWorker($db, $userId, $workerId) {
    try {
        // 获取用户角色
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return false;
        }
        
        // 管理员可以分享所有人
        if ($user['role'] === 'admin') {
            return true;
        }
        
        // 工头只能分享自己管理的工人
        if ($user['role'] === 'foreman') {
            $stmt = $db->prepare("
                SELECT COUNT(*) as count FROM foreman_workers
                WHERE foreman_id = ? AND worker_id = ?
            ");
            $stmt->execute([$userId, $workerId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        }
        
        return false;
    } catch (PDOException $e) {
        return false;
    }
}
