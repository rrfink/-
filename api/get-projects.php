<?php
// 获取项目列表

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 包含数据库连接文件
include dirname(__DIR__) . '/includes/db.php';

// 连接数据库
try {
    $db = db_connect();
    
    // 获取用户ID和角色
    $userId = isset($_GET['user_id']) ? $_GET['user_id'] : '';
    $isAdmin = isset($_GET['admin']) && $_GET['admin'] === '1';
    
    if ($isAdmin) {
        // 管理员可以看到所有项目
        $stmt = $db->query("SELECT id, name, address, personalInfo, workHours, isEnded, user_id, created_at FROM projects ORDER BY created_at DESC");
        $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($userId) {
        // 检查用户是否为工头
        $stmt = $db->prepare("SELECT role FROM users WHERE id = :user_id");
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $isForeman = $user && $user['role'] === 'foreman';
        
        if ($isForeman) {
            // 工头可以看到：
            // 1. 自己创建的项目
            // 2. 自己被分配到的项目
            $stmt = $db->prepare("SELECT p.id, p.name, p.address, p.personalInfo, p.workHours, p.isEnded, p.user_id, p.created_at 
                                  FROM projects p 
                                  WHERE p.user_id = :user_id 
                                  UNION 
                                  SELECT p.id, p.name, p.address, p.personalInfo, p.workHours, p.isEnded, p.user_id, p.created_at 
                                  FROM projects p 
                                  JOIN user_projects pu ON p.id = pu.project_id 
                                  WHERE pu.user_id = :user_id 
                                  ORDER BY created_at DESC");
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // 普通用户可以看到自己创建的项目和被分配到的项目
            $stmt = $db->prepare("SELECT p.id, p.name, p.address, p.personalInfo, p.workHours, p.isEnded, p.user_id, p.created_at 
                                  FROM projects p 
                                  WHERE p.user_id = :user_id 
                                  UNION 
                                  SELECT p.id, p.name, p.address, p.personalInfo, p.workHours, p.isEnded, p.user_id, p.created_at 
                                  FROM projects p 
                                  JOIN user_projects pu ON p.id = pu.project_id 
                                  WHERE pu.user_id = :user_id 
                                  ORDER BY created_at DESC");
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } else {
        // 没有用户ID，返回空列表
        $projects = [];
    }
    
    // 处理JSON字段
    foreach ($projects as &$project) {
        if (isset($project['personalInfo']) && $project['personalInfo']) {
            $decoded = json_decode($project['personalInfo'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $project['personalInfo'] = $decoded;
            }
        }
        if (isset($project['workHours']) && $project['workHours']) {
            $decoded = json_decode($project['workHours'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $project['workHours'] = $decoded;
            }
        }
        // 处理isEnded字段，转换为布尔类型
        if (isset($project['isEnded'])) {
            $project['isEnded'] = (bool)$project['isEnded'];
        }
    }
    
    // 返回项目列表
    echo json_encode([
        'success' => true,
        'projects' => $projects,
        'count' => count($projects)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>