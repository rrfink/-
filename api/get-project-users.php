<?php
// 获取项目已分配员工API

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 包含数据库连接文件
include dirname(__DIR__) . '/includes/db.php';

// 检查请求方法
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode([
        'success' => false,
        'error' => '只支持 GET 请求'
    ]);
    exit;
}

// 获取项目ID和用户ID
$project_id = isset($_GET['project_id']) ? trim($_GET['project_id']) : '';
$user_id = isset($_GET['user_id']) ? trim($_GET['user_id']) : '';

// 验证输入
if (empty($project_id)) {
    echo json_encode([
        'success' => false,
        'error' => '项目ID不能为空'
    ]);
    exit;
}

// 连接数据库
try {
    $db = db_connect();
    
    // 检查项目是否存在
    $stmt = $db->prepare("SELECT id FROM projects WHERE id = :project_id");
    $stmt->bindParam(':project_id', $project_id);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'error' => '项目不存在'
        ]);
        exit;
    }
    
    // 检查用户角色
    $isForeman = false;
    if (!empty($user_id)) {
        $stmt = $db->prepare("SELECT role FROM users WHERE id = :user_id");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $isForeman = $user && $user['role'] === 'foreman';
    }
    
    if ($isForeman) {
        // 工头只能看到项目中自己管理的工人
        $stmt = $db->prepare("SELECT u.id, u.name as user_name, MAX(p.name) as personal_name, u.phone, u.created_at 
                             FROM users u 
                             JOIN user_projects up ON u.id = up.user_id 
                             JOIN foreman_workers fw ON u.id = fw.worker_id 
                             LEFT JOIN personalInfo p ON u.id = p.user_id 
                             WHERE up.project_id = :project_id AND fw.foreman_id = :user_id 
                             GROUP BY u.id");
        $stmt->bindParam(':project_id', $project_id);
        $stmt->bindParam(':user_id', $user_id);
    } else {
        // 普通用户或管理员可以看到项目中所有员工
        $stmt = $db->prepare("SELECT u.id, u.name as user_name, MAX(p.name) as personal_name, u.phone, u.created_at 
                             FROM users u 
                             JOIN user_projects up ON u.id = up.user_id 
                             LEFT JOIN personalInfo p ON u.id = p.user_id 
                             WHERE up.project_id = :project_id 
                             GROUP BY u.id");
        $stmt->bindParam(':project_id', $project_id);
    }
    
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 处理用户姓名
    foreach ($users as &$user) {
        // 优先使用personalInfo中的姓名，其次使用users表中的姓名，最后使用手机号
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
    }
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>