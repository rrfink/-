<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// 配置session cookie参数（必须在session_start之前）
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.cookie_secure', '0');

// 启动会话
session_start();

// 包含数据库连接文件，用于CSRF令牌验证
include '../includes/db.php';
include '../includes/api-utils.php';

function logError($message, $data = []) {
    $logFile = __DIR__ . '/../logs/reimbursement_error.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if (!empty($data)) {
        $logMessage .= " | Data: " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    $logMessage .= "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
}

$databasePath = __DIR__ . '/../database/users.db';

try {
    $db = new SQLite3($databasePath);
    $db->exec("PRAGMA foreign_keys = OFF;");

    $action = $_GET['action'] ?? '';

    // 清理输入数据
    $_GET = sanitizeInput($_GET);
    $_POST = sanitizeInput($_POST);

    // 只对修改数据的操作验证CSRF令牌
    $requireCsrf = in_array($action, ['add', 'update', 'delete']);
    
    if ($requireCsrf) {
        $csrf_token = $_GET['csrf_token'] ?? $_POST['csrf_token'] ?? '';
        
        if (!validate_csrf_token($csrf_token)) {
            sendResponse(false, null, '无效的CSRF令牌');
        }
    }
    
    // 获取用户ID并验证权限
    $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? '';
    if (!validatePermission($userId, 'reimbursement', $action)) {
        sendResponse(false, null, '没有权限执行此操作');
    }

    switch ($action) {
        case 'get':
            if (empty($userId)) {
                sendResponse(false, null, '用户ID不能为空');
            }

            $threeMonthsAgo = date('Y-m-d H:i:s', strtotime('-3 months'));
            
            $stmt = $db->prepare("SELECT * FROM reimbursements WHERE user_id = ? AND created_at < ?");
            $stmt->bindValue(1, $userId, SQLITE3_TEXT);
            $stmt->bindValue(2, $threeMonthsAgo, SQLITE3_TEXT);
            $result = $stmt->execute();

            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                if (!empty($row['image'])) {
                    $oldImagePath = __DIR__ . '/..' . $row['image'];
                    if (file_exists($oldImagePath)) {
                        unlink($oldImagePath);
                    }
                }
                
                $deleteStmt = $db->prepare("DELETE FROM reimbursements WHERE id = ?");
                $deleteStmt->bindValue(1, $row['id'], SQLITE3_INTEGER);
                $deleteStmt->execute();
            }

            $stmt = $db->prepare("SELECT * FROM reimbursements WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC");
            $stmt->bindValue(1, $userId, SQLITE3_TEXT);
            $stmt->bindValue(2, $threeMonthsAgo, SQLITE3_TEXT);
            $result = $stmt->execute();
            $reimbursements = [];

            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $reimbursements[] = [
                    'id' => $row['id'],
                    'title' => $row['title'],
                    'amount' => (float)$row['amount'],
                    'date' => $row['date'],
                    'remark' => $row['remark'],
                    'image' => $row['image'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ];
            }

            sendResponse(true, $reimbursements);
            break;

        case 'add':
            logError('开始添加报销', [
                'user_id' => $_POST['user_id'] ?? '',
                'title' => $_POST['title'] ?? '',
                'amount' => $_POST['amount'] ?? '',
                'date' => $_POST['date'] ?? '',
                'has_image' => isset($_FILES['image'])
            ]);
            
            $title = $_POST['title'] ?? '';
            $amount = $_POST['amount'] ?? 0;
            $date = $_POST['date'] ?? '';
            $remark = $_POST['remark'] ?? '';
            $image = '';

            if (empty($title) || empty($amount) || empty($date)) {
                logError('必填字段为空', compact('title', 'amount', 'date'));
                sendResponse(false, null, '必填字段不能为空');
            }

            if (!validateNumber($amount, ['min' => 0.01])) {
                logError('金额无效', ['amount' => $amount]);
                sendResponse(false, null, '金额必须大于0');
            }
            
            if (!validateDate($date)) {
                sendResponse(false, null, '日期格式无效');
            }

            $sql = "INSERT INTO reimbursements (user_id, title, amount, date, remark, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            logError('准备执行SQL', ['sql' => $sql]);
            
            $stmt = $db->prepare($sql);
            
            if (!$stmt) {
                logError('SQL prepare失败', ['error' => $db->lastErrorMsg()]);
                sendResponse(false, null, '数据库准备失败');
            }
            
            $stmt->bindValue(1, $userId, SQLITE3_TEXT);
            $stmt->bindValue(2, $title, SQLITE3_TEXT);
            $stmt->bindValue(3, floatval($amount), SQLITE3_FLOAT);
            $stmt->bindValue(4, $date, SQLITE3_TEXT);
            $stmt->bindValue(5, '', SQLITE3_TEXT);
            $stmt->bindValue(6, date('Y-m-d H:i:s'), SQLITE3_TEXT);
            $stmt->bindValue(7, date('Y-m-d H:i:s'), SQLITE3_TEXT);
            
            logError('执行SQL语句');
            
            $result = $stmt->execute();
            
            if (!$result) {
                logError('SQL执行失败', ['error' => $db->lastErrorMsg()]);
                sendResponse(false, null, '数据库操作失败');
            }
            
            $insertId = $db->lastInsertRowID();
            logError('数据库插入成功', ['id' => $insertId]);

            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                logError('处理图片上传', [
                    'size' => $_FILES['image']['size'],
                    'type' => $_FILES['image']['type'],
                    'name' => $_FILES['image']['name']
                ]);
                
                $maxSize = 2 * 1024 * 1024;
                if ($_FILES['image']['size'] > $maxSize) {
                    sendResponse(false, null, '图片大小不能超过2MB');
                }

                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                $fileType = $_FILES['image']['type'];
                if (!in_array($fileType, $allowedTypes)) {
                    sendResponse(false, null, '只支持JPG、PNG、GIF、WEBP格式的图片');
                }

                $uploadDir = __DIR__ . '/../uploads/reimbursements/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $fileName = uniqid() . '.' . $extension;
                $filePath = $uploadDir . $fileName;

                logError('移动上传文件', [
                    'from' => $_FILES['image']['tmp_name'],
                    'to' => $filePath
                ]);

                if (move_uploaded_file($_FILES['image']['tmp_name'], $filePath)) {
                    $image = '/jg/uploads/reimbursements/' . $fileName;
                    logError('文件上传成功', ['image' => $image]);
                    
                    $updateStmt = $db->prepare("UPDATE reimbursements SET image = ? WHERE id = ?");
                    $updateStmt->bindValue(1, $image, SQLITE3_TEXT);
                    $updateStmt->bindValue(2, $insertId, SQLITE3_INTEGER);
                    $updateStmt->execute();
                    logError('图片路径更新成功');
                } else {
                    logError('文件上传失败', ['error' => error_get_last()]);
                }
            }
            
            logError('添加成功');

            sendResponse(true, null, '报销添加成功');
            break;

        case 'update':
            logError('开始更新报销', [
                'id' => $_POST['id'] ?? '',
                'user_id' => $_POST['user_id'] ?? '',
                'title' => $_POST['title'] ?? '',
                'amount' => $_POST['amount'] ?? '',
                'date' => $_POST['date'] ?? '',
                'has_image' => isset($_FILES['image'])
            ]);
            
            $id = $_POST['id'] ?? '';
            $title = $_POST['title'] ?? '';
            $amount = $_POST['amount'] ?? 0;
            $date = $_POST['date'] ?? '';
            $remark = $_POST['remark'] ?? '';

            if (empty($id) || empty($title) || empty($amount) || empty($date)) {
                sendResponse(false, null, '必填字段不能为空');
            }

            if (!validateNumber($amount, ['min' => 0.01])) {
                sendResponse(false, null, '金额必须大于0');
            }
            
            if (!validateDate($date)) {
                sendResponse(false, null, '日期格式无效');
            }

            $image = null;
            $deleteImage = isset($_POST['delete_image']) && $_POST['delete_image'] === '1';
            
            logError('检查删除图片标志', [
                'delete_image_post' => $_POST['delete_image'] ?? 'not set',
                'deleteImage' => $deleteImage
            ]);
            
            if ($deleteImage) {
                logError('准备删除旧图片', ['id' => $id, 'user_id' => $userId]);
                
                $stmt = $db->prepare("SELECT image FROM reimbursements WHERE id = ? AND user_id = ?");
                $stmt->bindValue(1, $id, SQLITE3_TEXT);
                $stmt->bindValue(2, $userId, SQLITE3_TEXT);
                $result = $stmt->execute();
                $row = $result->fetchArray(SQLITE3_ASSOC);

                logError('查询到的图片', ['row' => $row]);

                if ($row && !empty($row['image'])) {
                    $imagePath = str_replace('/jg/', '', $row['image']);
                    $oldImagePath = __DIR__ . '/../' . $imagePath;
                    logError('旧图片路径', ['path' => $oldImagePath, 'exists' => file_exists($oldImagePath)]);
                    if (file_exists($oldImagePath)) {
                        unlink($oldImagePath);
                        logError('删除旧图片', ['path' => $oldImagePath]);
                    }
                }
            }
            
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                logError('处理图片上传', [
                    'size' => $_FILES['image']['size'],
                    'type' => $_FILES['image']['type'],
                    'name' => $_FILES['image']['name']
                ]);
                
                $maxSize = 2 * 1024 * 1024;
                if ($_FILES['image']['size'] > $maxSize) {
                    sendResponse(false, null, '图片大小不能超过2MB');
                }

                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                $fileType = $_FILES['image']['type'];
                if (!in_array($fileType, $allowedTypes)) {
                    sendResponse(false, null, '只支持JPG、PNG、GIF、WEBP格式的图片');
                }

                $uploadDir = __DIR__ . '/../uploads/reimbursements/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $fileName = uniqid() . '.' . $extension;
                $filePath = $uploadDir . $fileName;

                logError('移动上传文件', [
                    'from' => $_FILES['image']['tmp_name'],
                    'to' => $filePath
                ]);

                if (move_uploaded_file($_FILES['image']['tmp_name'], $filePath)) {
                    $image = '/jg/uploads/reimbursements/' . $fileName;
                    logError('文件上传成功', ['image' => $image]);
                } else {
                    logError('文件上传失败', ['error' => error_get_last()]);
                    sendResponse(false, null, '文件上传失败');
                }
            }

            logError('准备更新数据库');

            if ($deleteImage) {
                $stmt = $db->prepare("UPDATE reimbursements SET title = ?, amount = ?, date = ?, remark = ?, image = NULL, updated_at = ? WHERE id = ? AND user_id = ?");
                $stmt->bindValue(1, $title, SQLITE3_TEXT);
                $stmt->bindValue(2, floatval($amount), SQLITE3_FLOAT);
                $stmt->bindValue(3, $date, SQLITE3_TEXT);
                $stmt->bindValue(4, $remark, SQLITE3_TEXT);
                $stmt->bindValue(5, date('Y-m-d H:i:s'), SQLITE3_TEXT);
                $stmt->bindValue(6, $id, SQLITE3_TEXT);
                $stmt->bindValue(7, $userId, SQLITE3_TEXT);
            } else {
                $stmt = $db->prepare("UPDATE reimbursements SET title = ?, amount = ?, date = ?, remark = ?, image = COALESCE(?, image), updated_at = ? WHERE id = ? AND user_id = ?");
                $stmt->bindValue(1, $title, SQLITE3_TEXT);
                $stmt->bindValue(2, floatval($amount), SQLITE3_FLOAT);
                $stmt->bindValue(3, $date, SQLITE3_TEXT);
                $stmt->bindValue(4, $remark, SQLITE3_TEXT);
                $stmt->bindValue(5, $image, SQLITE3_TEXT);
                $stmt->bindValue(6, date('Y-m-d H:i:s'), SQLITE3_TEXT);
                $stmt->bindValue(7, $id, SQLITE3_TEXT);
                $stmt->bindValue(8, $userId, SQLITE3_TEXT);
            }
            
            $result = $stmt->execute();
            
            if (!$result) {
                logError('SQL执行失败', ['error' => $db->lastErrorMsg()]);
                if ($image) {
                    unlink($uploadDir . basename($image));
                }
                sendResponse(false, null, '数据库操作失败');
            }
            
            logError('数据库更新成功');

            if ($image && !$deleteImage) {
                $stmt = $db->prepare("SELECT image FROM reimbursements WHERE id = ? AND user_id = ?");
                $stmt->bindValue(1, $id, SQLITE3_TEXT);
                $stmt->bindValue(2, $userId, SQLITE3_TEXT);
                $result = $stmt->execute();
                $row = $result->fetchArray(SQLITE3_ASSOC);

                if ($row && !empty($row['image']) && $row['image'] !== $image) {
                    $imagePath = str_replace('/jg/', '', $row['image']);
                    $oldImagePath = __DIR__ . '/../' . $imagePath;
                    if (file_exists($oldImagePath)) {
                        unlink($oldImagePath);
                        logError('删除旧图片', ['path' => $oldImagePath]);
                    }
                }
            }

            sendResponse(true, null, '报销更新成功');
            break;

        case 'delete':
            $id = $_POST['id'] ?? '';
            $userId = $_POST['user_id'] ?? '';

            if (empty($id) || empty($userId)) {
                sendResponse(false, null, '参数不能为空');
            }

            $stmt = $db->prepare("SELECT image FROM reimbursements WHERE id = ? AND user_id = ?");
            $stmt->bindValue(1, $id, SQLITE3_TEXT);
            $stmt->bindValue(2, $userId, SQLITE3_TEXT);
            $result = $stmt->execute();
            $row = $result->fetchArray(SQLITE3_ASSOC);

            if ($row && !empty($row['image'])) {
                $imagePath = str_replace('/jg/', '', $row['image']);
                $oldImagePath = __DIR__ . '/../' . $imagePath;
                if (file_exists($oldImagePath)) {
                    unlink($oldImagePath);
                }
            }

            $stmt = $db->prepare("DELETE FROM reimbursements WHERE id = ? AND user_id = ?");
            $stmt->bindValue(1, $id, SQLITE3_TEXT);
            $stmt->bindValue(2, $userId, SQLITE3_TEXT);
            $stmt->execute();

            sendResponse(true, null, '报销删除成功');
            break;

        default:
            sendResponse(false, null, '无效的操作');
            break;
    }

    $db->close();
} catch (Exception $e) {
    sendResponse(false, null, '服务器错误: ' . $e->getMessage());
}
?>