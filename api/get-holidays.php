<?php
// 获取节假日列表

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 包含数据库连接文件
include dirname(__DIR__) . '/includes/db.php';

// 系统节日的特殊用户ID
$systemUserId = '__system_holidays__';

// 获取用户ID（可选，用于区分用户自定义节日）
session_start();
$user_id = null;
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
} elseif (isset($_COOKIE['user_id'])) {
    $user_id = $_COOKIE['user_id'];
} elseif (isset($_GET['user_id'])) {
    $user_id = $_GET['user_id'];
}

// 获取项目ID（可选）
$project_id = isset($_GET['project_id']) ? $_GET['project_id'] : null;

// 获取管理员标识（可选）
$is_admin = isset($_GET['admin']) && $_GET['admin'] === '1';

// 连接数据库
try {
    $db = db_connect();

    // 查询节假日
    if ($is_admin) {
        // 管理员查看所有节日
        $stmt = $db->prepare("SELECT id, date, name, user_id, created_at, description, category, projectId FROM holidays ORDER BY date ASC");
        $stmt->execute();
    } elseif ($user_id) {
        // 系统节日（user_id = __system_holidays__）对所有项目可见
        // 用户自定义节日根据 project_id 过滤
        if ($project_id) {
            // 有项目ID：系统节日 + 当前项目的用户节日
            $stmt = $db->prepare("SELECT id, date, name, user_id, created_at, description, category, projectId FROM holidays WHERE user_id = ? OR (user_id = ? AND (projectId = ? OR projectId IS NULL OR projectId = '')) ORDER BY date ASC");
            $stmt->execute([$systemUserId, $user_id, $project_id]);
        } else {
            // 无项目ID：系统节日 + 所有用户节日（无项目或项目为空的）
            $stmt = $db->prepare("SELECT id, date, name, user_id, created_at, description, category, projectId FROM holidays WHERE user_id = ? OR (user_id = ? AND (projectId IS NULL OR projectId = '')) ORDER BY date ASC");
            $stmt->execute([$systemUserId, $user_id]);
        }
    } else {
        // 未登录用户只能看到系统节日
        $stmt = $db->prepare("SELECT id, date, name, user_id, created_at, description, category, projectId FROM holidays WHERE user_id = ? ORDER BY date ASC");
        $stmt->execute([$systemUserId]);
    }
    $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 标记节日类型
    foreach ($holidays as &$holiday) {
        if ($holiday['user_id'] === $systemUserId) {
            $holiday['isSystem'] = true;
        } else {
            $holiday['isSystem'] = false;
        }
    }

    // 返回节假日列表
    echo json_encode([
        'success' => true,
        'holidays' => $holidays,
        'count' => count($holidays)
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>