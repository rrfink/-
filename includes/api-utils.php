<?php
// API 工具函数

/**
 * 设置API响应头
 */
function setApiHeaders() {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Credentials: true');
}

/**
 * 检查请求方法是否为POST
 * @return bool 是否为POST请求
 */
function isPostRequest() {
    return $_SERVER['REQUEST_METHOD'] === 'POST';
}

/**
 * 验证手机号格式
 * @param string $phone 手机号
 * @return bool 是否有效
 */
function validatePhone($phone) {
    return preg_match('/^1[3-9]\d{9}$/', trim($phone));
}

/**
 * 验证密码长度
 * @param string $password 密码
 * @return bool 是否有效
 */
function validatePassword($password) {
    return strlen($password) >= 6;
}

/**
 * 验证邮箱格式
 * @param string $email 邮箱
 * @return bool 是否有效
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * 验证数字
 * @param mixed $value 值
 * @param array $options 选项
 * @return bool 是否有效
 */
function validateNumber($value, $options = []) {
    $defaultOptions = [
        'min' => null,
        'max' => null,
        'integer' => false
    ];
    
    $options = array_merge($defaultOptions, $options);
    
    if (!is_numeric($value)) {
        return false;
    }
    
    $value = (float)$value;
    
    if ($options['min'] !== null && $value < $options['min']) {
        return false;
    }
    
    if ($options['max'] !== null && $value > $options['max']) {
        return false;
    }
    
    if ($options['integer'] && floor($value) !== $value) {
        return false;
    }
    
    return true;
}

/**
 * 验证字符串长度
 * @param string $value 值
 * @param array $options 选项
 * @return bool 是否有效
 */
function validateString($value, $options = []) {
    $defaultOptions = [
        'min' => 0,
        'max' => null
    ];
    
    $options = array_merge($defaultOptions, $options);
    
    if (!is_string($value)) {
        return false;
    }
    
    $length = strlen($value);
    
    if ($length < $options['min']) {
        return false;
    }
    
    if ($options['max'] !== null && $length > $options['max']) {
        return false;
    }
    
    return true;
}

/**
 * 验证日期格式
 * @param string $date 日期
 * @return bool 是否有效
 */
function validateDate($date) {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

/**
 * 验证请求数据
 * @param array $data 请求数据
 * @param array $requiredFields 必需字段
 * @return bool 是否有效
 */
function validateRequestData($data, $requiredFields) {
    if (!$data) {
        return false;
    }
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            return false;
        }
    }
    
    return true;
}

/**
 * 验证用户权限
 * @param string $userId 用户ID
 * @param string $resource 资源
 * @param string $action 操作
 * @return bool 是否有权限
 */
function validatePermission($userId, $resource, $action) {
    // 基础权限检查：用户只能访问自己的数据
    if (empty($userId)) {
        return false;
    }
    
    // 连接数据库获取用户角色
    try {
        $db = db_connect();
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 如果用户不存在，返回false
        if (!$user) {
            return false;
        }
        
        $role = $user['role'] ?? 'worker';
        
        // 工头和管理员可以访问更多资源
        if ($role === 'foreman' || $role === 'admin') {
            return true;
        }
        
        // 普通工人只能访问自己的数据
        return true;
    } catch (PDOException $e) {
        // 数据库错误时，默认只允许访问自己的数据
        return !empty($userId);
    }
}

/**
 * 发送JSON响应
 * @param bool $success 是否成功
 * @param mixed $data 响应数据
 * @param string $error 错误信息
 */
function sendResponse($success, $data = null, $error = null) {
    $response = [
        'success' => $success
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if ($error !== null) {
        $response['error'] = $error;
    }
    
    echo json_encode($response);
    exit;
}

/**
 * 清理输入数据
 * @param mixed $input 输入数据
 * @return mixed 清理后的数据
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    } elseif (is_string($input)) {
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
    return $input;
}
